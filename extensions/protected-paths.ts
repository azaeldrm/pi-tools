/**
 * Protected Paths Extension (homelab-adapted)
 *
 * Guards `write` and `edit` tool calls:
 *  - `.git/` and `node_modules/` path segments → blocked (no confirmation)
 *  - real env files (basename `.env`, `.env.local`, `.env.production`, ...)
 *    → confirmed with a 60-second auto-deny dialog
 *  - `.env.example` (and other `.env.example*` basenames) → allowed
 *  - everything else → allowed
 *
 * Unlike the official example, this version classifies by normalized path
 * segments and basename instead of naive `path.includes()`, so files like
 * `dotenv.json`, `.gitignore`, or `.envrc` are not falsely flagged.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as nodePath from "node:path";

// ─── Configuration ─────────────────────────────────────────────

/** Dialog timeout in ms; timeout behaves as No (auto-deny). */
export const AUTO_DENY_TIMEOUT_MS = 60_000;

/** Path segments that are always blocked for write/edit. */
const BLOCKED_SEGMENTS = [".git", "node_modules"];

// ─── Path classifier ───────────────────────────────────────────

export type PathVerdict = "allow" | "confirm" | "block";

export interface PathClassification {
	verdict: PathVerdict;
	reason: string;
}

/**
 * Pure classifier: decides how a write/edit to `rawPath` should be handled.
 *
 *  - block:   path passes through a `.git/` or `node_modules/` segment
 *  - confirm: basename is a real env file (`.env`, `.env.local`, ...)
 *  - allow:   `.env.example*` basenames and everything else
 */
export function classifyProtectedPath(rawPath: string): PathClassification {
	if (!rawPath) {
		return { verdict: "allow", reason: "empty path" };
	}

	// Normalize: expand a leading ~, resolve to absolute, split on / and \.
	let expanded = rawPath;
	const home = process.env.HOME || "/";
	if (expanded === "~") {
		expanded = home;
	} else if (expanded.startsWith("~/")) {
		expanded = nodePath.join(home, expanded.slice(2));
	}
	const absolute = nodePath.isAbsolute(expanded) ? expanded : nodePath.resolve(expanded);
	const segments = absolute.split(/[\\/]/).filter(Boolean);
	const basename = segments[segments.length - 1] ?? "";

	// Explicit allow: example/template env files must stay editable.
	if (basename === ".env.example" || basename.startsWith(".env.example.")) {
		return { verdict: "allow", reason: "env example file" };
	}

	// Block: writes through version control or dependency directories.
	const blockedSegment = BLOCKED_SEGMENTS.find((seg) => segments.includes(seg));
	if (blockedSegment) {
		return {
			verdict: "block",
			reason: `path is inside ${blockedSegment}/`,
		};
	}

	// Confirm: real env files (basename exactly `.env` or `.env.<anything>`).
	if (basename === ".env" || /^\.env\.[A-Za-z0-9._-]+$/.test(basename)) {
		return {
			verdict: "confirm",
			reason: "real env file (may contain secrets)",
		};
	}

	return { verdict: "allow", reason: "not a protected path" };
}

// ─── Extension ─────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "write" && event.toolName !== "edit") {
			return undefined;
		}

		const rawPath = typeof event.input.path === "string" ? event.input.path : "";
		const { verdict, reason } = classifyProtectedPath(rawPath);

		if (verdict === "allow") {
			return undefined;
		}

		if (verdict === "block") {
			if (ctx.hasUI) {
				ctx.ui.notify(`Blocked write to protected path: ${rawPath}`, "warning");
			}
			return { block: true, reason: `Path "${rawPath}" is protected (${reason})` };
		}

		// confirm: fail closed when there is no UI to ask in.
		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Blocked (no UI for confirmation): ${reason} — ${rawPath}`,
			};
		}

		const choice = await ctx.ui.select(
			`⚠️ Sensitive file\n\n  ${rawPath}\n\n${reason} — Allow edit? (auto-No in ${AUTO_DENY_TIMEOUT_MS / 1000}s)`,
			["Yes", "No"],
			{ timeout: AUTO_DENY_TIMEOUT_MS },
		);

		if (choice !== "Yes") {
			const why = choice === undefined ? "timed out (auto-No)" : "denied by user";
			return {
				block: true,
				reason: `Blocked edit of sensitive file (${why}): ${rawPath}`,
			};
		}

		return undefined;
	});
}
