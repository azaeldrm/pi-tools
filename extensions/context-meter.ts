import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS = "context-meter";
const WIDTH = 18;
const PROVIDER_LABELS: Record<string, string> = { "openai-codex": "codex", anthropic: "claude" };

export function meter(percent: number | undefined): string {
  if (percent === undefined || !Number.isFinite(percent)) return "─".repeat(WIDTH);
  const units = Math.round(Math.max(0, Math.min(100, percent)) / 100 * WIDTH * 2);
  const full = Math.floor(units / 2);
  const fraction = units % 2;
  return "━".repeat(full) + (fraction ? "╸" : "") + "─".repeat(WIDTH - full - fraction);
}

function formatTokens(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) {
    const thousands = Number((count / 1000).toFixed(1));
    return thousands >= 1000 ? `${(thousands / 1000).toFixed(1)}M` : `${thousands}k`;
  }
  return `${Number((count / 1_000_000).toFixed(1))}M`;
}

export default function (pi: ExtensionAPI) {
  let timer: ReturnType<typeof setInterval> | undefined;
  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined;
  }
  function update(ctx: ExtensionContext) {
    if (ctx.mode !== "tui") return;
    const usage = ctx.getContextUsage();
    const raw = usage?.percent;
    const percent = raw == null || !Number.isFinite(raw) ? undefined : Math.max(0, Math.min(100, raw));
    const color = percent !== undefined && percent > 90 ? "error" : percent !== undefined && percent > 70 ? "warning" : "accent";
    const theme = ctx.ui.theme;
    const model = ctx.model;
    const authLabel = model?.provider === "llama.cpp" ? "local"
      : model && ctx.modelRegistry.isUsingOAuth(model) ? PROVIDER_LABELS[model.provider] || model.provider : "key";
    ctx.ui.setStatus("model-auth", model
      ? theme.fg("accent", `π ${model.name || model.id}`) + theme.fg("muted", ` (${authLabel})`)
      : theme.fg("muted", "π no-model"));
    const level = pi.getThinkingLevel();
    const thinkingColor = level === "off" ? "thinkingOff" : level === "minimal" ? "thinkingMinimal" : level === "low" ? "thinkingLow" : level === "medium" ? "thinkingMedium" : level === "high" ? "thinkingHigh" : level === "xhigh" ? "thinkingXhigh" : "thinkingMax";
    // Keep explicit "off" visible; the model reasoning flag can be false in this state.
    ctx.ui.setStatus("thinking-icon", ctx.model ? theme.fg(thinkingColor, `\uf0e7 ${level}`) : undefined);
    const bar = meter(percent);
    const filledLength = bar.indexOf("─") < 0 ? WIDTH : bar.indexOf("─");
    const smooth = theme.fg(color, bar.slice(0, filledLength)) + theme.fg("dim", bar.slice(filledLength));
    const tokens = usage?.tokens;
    const window = usage?.contextWindow ?? model?.contextWindow;
    const label = `${tokens == null ? "?" : formatTokens(tokens)}/${window == null ? "?" : formatTokens(window)} (${percent === undefined ? "?" : percent.toFixed(1)}%)`;
    ctx.ui.setStatus(STATUS,
      theme.fg("muted", "\uf0e4  ") + theme.fg(color, label) +
      " " + smooth);
  }
  pi.on("session_start", (_event, ctx) => {
    stop();
    if (ctx.mode !== "tui") return;
    update(ctx);
    // Refresh context usage and theme without decorative animation.
    timer = setInterval(() => update(ctx), 1000);
    timer.unref();
  });
  pi.on("agent_start", (_event, ctx) => update(ctx));
  pi.on("agent_end", (_event, ctx) => update(ctx));
  pi.on("session_shutdown", (_event, ctx) => {
    stop();
    if (ctx.mode === "tui") {
      ctx.ui.setStatus(STATUS, undefined);
      ctx.ui.setStatus("thinking-icon", undefined);
      ctx.ui.setStatus("model-auth", undefined);
    }
  });
}
