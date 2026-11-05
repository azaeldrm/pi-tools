/**
 * Procession Banner
 *
 * The persistent top banner is enabled automatically on session start.
 */

import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { VERSION, type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANNER_JPG_PATH = path.join(__dirname, "banner.jpg");
const BANNER_WIDGET_ROWS = 10;

function rgbToAnsiLines(rgb: Buffer, width: number, rows: number): string[] {
	const pixelHeight = rows * 2;
	const bgFallback: [number, number, number] = [13, 16, 19];
	const lines: string[] = [];

	for (let y = 0; y < pixelHeight; y += 2) {
		let line = "";
		for (let x = 0; x < width; x++) {
			const topOffset = (y * width + x) * 3;
			const bottomOffset = ((y + 1) * width + x) * 3;
			const tr = rgb[topOffset] ?? bgFallback[0];
			const tg = rgb[topOffset + 1] ?? bgFallback[1];
			const tb = rgb[topOffset + 2] ?? bgFallback[2];
			const br = rgb[bottomOffset] ?? bgFallback[0];
			const bg = rgb[bottomOffset + 1] ?? bgFallback[1];
			const bb = rgb[bottomOffset + 2] ?? bgFallback[2];
			line += `\x1b[38;2;${tr};${tg};${tb}m\x1b[48;2;${br};${bg};${bb}m▀`;
		}
		lines.push(`${line}\x1b[0m`);
	}

	return lines;
}

function renderAnsiBanner(width: number, rows: number): string[] {
	const safeWidth = Math.max(20, Math.floor(width));
	const pixelHeight = rows * 2;
	const raw = execFileSync("ffmpeg", [
		"-loglevel",
		"error",
		"-i",
		BANNER_JPG_PATH,
		"-vf",
		// Fill the available banner area, then crop with an upward-biased focal point.
		// y=(ih-oh)*0.05 strongly biases the crop upward to keep more of the figure/upper area visible.
		`scale=${safeWidth}:${pixelHeight}:force_original_aspect_ratio=increase,crop=${safeWidth}:${pixelHeight}:(iw-ow)/2:(ih-oh)*0.05`,
		"-f",
		"rawvideo",
		"-pix_fmt",
		"rgb24",
		"-",
	]) as Buffer;
	return rgbToAnsiLines(raw, safeWidth, rows);
}

class Banner implements Component {
	private width: number | undefined;
	private lines: string[] | undefined;

	constructor(private readonly build: (width: number) => string[]) {}

	render(width: number): string[] {
		if (this.width !== width || this.lines === undefined) {
			this.width = width;
			this.lines = this.build(width);
		}
		return this.lines;
	}

	invalidate(): void {
		this.lines = undefined;
	}
}

function buildStartPanel(width: number, theme: Theme, ctx: any): string[] {
	const panelWidth = Math.max(20, Math.min(width, 82));
	const innerWidth = Math.max(16, panelWidth - 4);
	const leftPad = Math.max(0, Math.floor((width - panelWidth) / 2));
	const pad = " ".repeat(leftPad);
	const border = theme.fg("borderMuted", "─".repeat(panelWidth - 2));
	const cwd = ctx.cwd ?? process.cwd();
	const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "model pending";
	const thinking = ctx.thinkingLevel ? `thinking: ${ctx.thinkingLevel}` : "thinking: default";
	const logo = [
		"         ",
		" ███████ ",
		"  ██ ██  ",
		" ██  ██ ",
		"         ",
	];
	const info = [
		`${theme.fg("accent", theme.bold("Pi Coding Agent"))} ${theme.fg("dim", `v${VERSION}`)}`,
		theme.fg("muted", "Ready when you are."),
		`${theme.fg("dim", "cwd")} ${theme.fg("text", cwd)}`,
		`${theme.fg("dim", "model")} ${theme.fg("text", model)} ${theme.fg("dim", `· ${thinking}`)}`,
		`${theme.fg("accent", "/")} commands  ${theme.fg("accent", "@")} files  ${theme.fg("accent", "!")} bash  ${theme.fg("accent", "ctrl+l")} model  ${theme.fg("accent", "shift+tab")} thinking`,
	];
	const rows = Math.max(logo.length, info.length);
	const logoWidth = Math.max(...logo.map((line) => visibleWidth(line)));
	const lines = [`${pad}${theme.fg("borderMuted", "╭")}${border}${theme.fg("borderMuted", "╮")}`];
	for (let i = 0; i < rows; i++) {
		const logoText = logo[i] ?? "";
		const logoPart = theme.fg("accent", logoText + " ".repeat(Math.max(0, logoWidth - visibleWidth(logoText))));
		const infoPart = info[i] ?? "";
		const raw = `${logoPart}  ${infoPart}`;
		const cell = truncateToWidth(raw, innerWidth, "");
		lines.push(`${pad}${theme.fg("borderMuted", "│")} ${cell}${" ".repeat(Math.max(0, innerWidth - visibleWidth(cell)))} ${theme.fg("borderMuted", "│")}`);
	}
	lines.push(`${pad}${theme.fg("borderMuted", "╰")}${border}${theme.fg("borderMuted", "╯")}`);
	return lines;
}

function setProcessionWidget(ctx: any) {
	ctx.ui.setHeader((_tui: any, theme: Theme) => {
		const build = (width: number): string[] => {
			try {
				return [
					...renderAnsiBanner(width, BANNER_WIDGET_ROWS),
					"",
					...buildStartPanel(width, theme, ctx),
					"",
				];
			} catch (error) {
				return [
					theme.fg("warning", "procession banner failed to render"),
					theme.fg("dim", String(error)),
					"",
					...buildStartPanel(width, theme, ctx),
					"",
				];
			}
		};
		return new Banner(width => build(width));
	});
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode === "tui") {
			setProcessionWidget(ctx);
		}
	});


}
