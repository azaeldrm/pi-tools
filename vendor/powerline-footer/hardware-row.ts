import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

/** Compose overflow/context rows with hardware. Every bottom row keeps the
 * same one-column left and right padding as the rest of the toolbar. */
export function composeHardwareRows(overflow: string[], hardware: string[], width: number): string[] {
  if (!hardware.length) return overflow;
  const inner = Math.max(0, width - 2);
  const pad = (s: string) => ` ${s}${" ".repeat(Math.max(0, inner - visibleWidth(s)))} `;
  const bottom = [...overflow];
  const contextText = (bottom[bottom.length - 1] ?? "").trim();
  const [first, ...rest] = hardware;
  const gap = inner - visibleWidth(contextText) - visibleWidth(first);
  if (contextText && gap >= 3) bottom[bottom.length - 1] = ` ${contextText}${" ".repeat(gap)}${first} `;
  else bottom.push(pad(first));
  bottom.push(...rest.map(pad));
  return bottom;
}

export function renderHardwareRow(raw: string | undefined, width: number, theme: Theme): string[] {
  if (!raw) return [];
  let data: { cpu?: number; temperature?: number; gpuAvailable?: boolean; gpus?: {index: string; load?: number; temperature?: number}[] };
  try { data = JSON.parse(raw); } catch { return []; }
  if (!data || !Array.isArray(data.gpus)) return [];
  const item = (label: string, load?: number, temp?: number) => {
    const length = Math.max(1, Math.min(10, width - 13));
    const known = typeof load === "number" && Number.isFinite(load);
    const units = known ? Math.round(Math.max(0, Math.min(100, load!)) / 100 * length * 2) : 0;
    const filled = "━".repeat(Math.floor(units / 2)) + (units % 2 ? "╸" : "");
    const bar = theme.fg("accent", filled) + theme.fg("dim", "─".repeat(length - filled.length));
    const thermal = typeof temp === "number" && Number.isFinite(temp) ? `${Math.round(temp)}°C` : "?°C";
    return theme.fg("muted", label + "  ") + bar + theme.fg("dim", known ? " " : " ? ") + theme.fg(temp !== undefined && temp >= 85 ? "warning" : "muted", thermal);
  };
  const parts = [item("\uf2db", data.cpu, data.temperature), ...data.gpus.map(g => item(`\u{f08ae} ${g.index}`, g.load, g.temperature))];
  if (!data.gpuAvailable) parts.push(theme.fg("dim", "GPU unavailable"));
  const lines: string[] = []; let line = "";
  for (const part of parts) {
    const joined = line ? line + theme.fg("dim", "  •  ") + part : part;
    if (line && visibleWidth(joined) > width) { lines.push(truncateToWidth(line, width)); line = part; }
    else line = joined;
  }
  if (line) lines.push(truncateToWidth(line, width));
  return lines;
}
