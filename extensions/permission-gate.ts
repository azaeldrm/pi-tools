/**
 * Permission Gate Extension (homelab-adapted)
 *
 * Prompts for confirmation before running potentially dangerous operations:
 *  - Dangerous bash commands (recursive rm, sudo, permissive chmod/chown)
 *  - Homelab Docker operations (mc <svc> d, manage-container.sh <svc> d,
 *    docker compose down, docker volume rm/prune, docker system prune, docker rmi)
 *  - Force git operations (git push --force / -f, git reset --hard)
 *  - The global `homelab` tool's `down` action (M2 cross-extension contract)
 *
 * Behavior:
 *  - With UI: Yes/No dialog with a 60-second countdown; timeout auto-deny (No).
 *  - Without UI (print/JSON mode): dangerous operations are blocked by default.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ─── Configuration ─────────────────────────────────────────────

/** Dialog timeout in ms; timeout behaves as No (auto-deny). */
export const AUTO_DENY_TIMEOUT_MS = 60_000;

// ─── Dangerous operation rules ─────────────────────────────────

export interface DangerousRule {
	/** Group name shown in the dialog. */
	group: string;
	/** Human description shown in the dialog and block reason. */
	description: string;
	/** Pattern tested against the bash command string. */
	pattern: RegExp;
}

// Official patterns (from the pi examples) plus homelab Docker and force-git rules.
// Order matters only for which description is shown; first match wins.
export const DANGEROUS_RULES: DangerousRule[] = [
	// ── Official ─────────────────────────────────────────────
	{
		group: "official",
		description: "recursive remove (rm -r/-rf/--recursive)",
		pattern: /\brm\s+-{1,2}[\w-]*r/i,
	},
	{
		group: "official",
		description: "sudo",
		pattern: /\bsudo\b/i,
	},
	{
		group: "official",
		description: "permissive chmod/chown (777)",
		pattern: /\b(chmod|chown)\b.*777/i,
	},
	// ── Homelab Docker ───────────────────────────────────────
	{
		group: "homelab",
		description: "stop/remove service via mc alias",
		pattern: /\bmc\s+\S+\s+d\b/,
	},
	{
		group: "homelab",
		description: "stop/remove service via manage-container.sh",
		pattern: /\bmanage-container\.sh\s+\S+\s+d\b/,
	},
	{
		group: "homelab",
		description: "docker compose down",
		pattern: /\bdocker\s+compose\s.*\bdown\b/,
	},
	{
		group: "homelab",
		description: "docker-compose (v1) down",
		pattern: /\bdocker-compose\s.*\bdown\b/,
	},
	{
		group: "homelab",
		description: "docker volume rm/prune",
		pattern: /\bdocker\s+volume\s+(rm|prune)\b/,
	},
	{
		group: "homelab",
		description: "docker system prune",
		pattern: /\bdocker\s+system\s+prune\b/,
	},
	{
		group: "homelab",
		description: "remove image (docker rmi)",
		pattern: /\bdocker\s+rmi\b/,
	},
	{
		group: "homelab",
		description: "force-remove container (docker rm -f/--force)",
		pattern: /\bdocker\s+rm\b.*(-[a-z]*f[a-z]*|--force)\b/,
	},
	{
		group: "homelab",
		description: "kill container (docker kill)",
		pattern: /\bdocker\s+kill\b/,
	},
	{
		group: "homelab",
		description: "remove compose containers (docker compose rm)",
		pattern: /\bdocker\s+compose\s.*\brm\b/,
	},
	// ── Force git ────────────────────────────────────────────
	{
		group: "force-git",
		description: "force push (git push --force)",
		pattern: /\bgit\s+push\b.*--force\b/,
	},
	{
		group: "force-git",
		description: "force push (git push -f)",
		pattern: /\bgit\s+push\b.*\s-f\b/,
	},
	{
		group: "force-git",
		description: "hard reset (git reset --hard)",
		pattern: /\bgit\s+reset\b.*--hard\b/,
	},
	{
		group: "force-git",
		description: "force clean untracked files (git clean -f/--force)",
		pattern: /\bgit\s+clean\b.*(-[a-z]*f[a-z]*|--force)\b/,
	},
];

/**
 * Pure classifier: returns the first dangerous rule matching the command,
 * or undefined if the command is not classified as dangerous.
 */
export function matchDangerousCommand(command: string): DangerousRule | undefined {
	return DANGEROUS_RULES.find((rule) => rule.pattern.test(command));
}

/**
 * Pure classifier: true if the command matches any dangerous rule.
 */
export function isDangerousCommand(command: string): boolean {
	return matchDangerousCommand(command) !== undefined;
}

// ─── Extension ─────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		let rule: DangerousRule | undefined;
		let target: string | undefined;

		if (event.toolName === "bash") {
			const command = typeof event.input.command === "string" ? event.input.command : "";
			rule = matchDangerousCommand(command);
			if (!rule) return undefined;
			target = command;
		} else if (event.toolName === "homelab" && event.input.action === "down") {
			// M2 contract: the homelab tool's down action is gated the same way
			// as dangerous bash. The tool is global (~/.pi/agent/extensions), so
			// this gate applies in every project.
			const service = typeof event.input.service === "string" ? event.input.service : "";
			rule = {
				group: "homelab",
				description: "homelab tool: down action (stop/remove service)",
				pattern: /homelab down/,
			};
			target = `homelab down ${service}`.trim();
		} else {
			return undefined;
		}

		// Fail closed: non-interactive mode cannot confirm, so block.
		if (!ctx.hasUI) {
			return {
				block: true,
				reason: `Blocked (no UI for confirmation): ${rule.description} — ${target}`,
			};
		}

		const choice = await ctx.ui.select(
			`⚠️ Dangerous operation\n\n  ${target}\n\n${rule.description} — Allow? (auto-No in ${AUTO_DENY_TIMEOUT_MS / 1000}s)`,
			["Yes", "No"],
			{ timeout: AUTO_DENY_TIMEOUT_MS },
		);

		if (choice !== "Yes") {
			const why = choice === undefined ? "timed out (auto-No)" : "denied by user";
			return {
				block: true,
				reason: `Blocked (${why}): ${rule.description} — ${target}`,
			};
		}

		return undefined;
	});
}
