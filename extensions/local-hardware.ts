import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const KEY = "local-hardware";
type CpuSample = { total: number; idle: number };
type Gpu = { index: string; load?: number; temperature?: number };

export function parseCpu(text: string): CpuSample {
  const values = text.split("\n")[0].trim().split(/\s+/).slice(1).map(Number);
  // guest counters are already included in user/nice; do not double-count.
  return { total: values.slice(0, 8).reduce((a, b) => a + b, 0), idle: values[3] + values[4] };
}
export function cpuPercent(previous: CpuSample, current: CpuSample): number | undefined {
  const elapsed = current.total - previous.total;
  return elapsed > 0 ? Math.max(0, Math.min(100, 100 * (1 - (current.idle - previous.idle) / elapsed))) : undefined;
}
export function parseGpus(text: string): Gpu[] {
  return text.trim().split("\n").filter(Boolean).map(line => {
    const [index, load, temperature] = line.split(",").map(s => s.trim());
    const number = (s: string) => s !== "" && Number.isFinite(Number(s)) ? Number(s) : undefined;
    return { index, load: number(load), temperature: number(temperature) };
  });
}
async function findCpuSensor(): Promise<string | undefined> {
  for (const dir of await readdir("/sys/class/hwmon")) {
    const base = `/sys/class/hwmon/${dir}`;
    const name = (await readFile(`${base}/name`, "utf8")).trim();
    if (!["k10temp", "coretemp", "zenpower"].includes(name)) continue;
    const files = (await readdir(base)).filter(s => /^temp\d+_input$/.test(s)).sort();
    for (const file of files) {
      const label = await readFile(`${base}/${file.replace("_input", "_label")}`, "utf8").catch(() => "");
      if (/Tctl|Package|Tdie/i.test(label)) return `${base}/${file}`;
    }
    if (files[0]) return `${base}/${files[0]}`;
  }
}

export default function (pi: ExtensionAPI) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let generation = 0;
  let previous: CpuSample | undefined;
  let sensor: string | undefined;
  let busy = false;
  let displayed = false;
  let cpu: number | undefined, temperature: number | undefined;
  let gpus: Gpu[] = [];
  let gpuAvailable = false;
  let sampleCtx: ExtensionContext | undefined;
  function stop() {
    generation++;
    if (timer) clearInterval(timer);
    timer = undefined;
    previous = undefined;
    displayed = false;
  }
  function display(ctx: ExtensionContext) {
    displayed = true;
    // Raw readings are rendered by the local Powerline footer using its live theme.
    ctx.ui.setStatus(KEY, JSON.stringify({ cpu, temperature, gpus, gpuAvailable }));
  }
  async function sample(ctx: ExtensionContext) {
    if (ctx.mode !== "tui") return;
    if (ctx.model?.provider !== "llama.cpp") {
      if (displayed) ctx.ui.setStatus(KEY, undefined);
      displayed = false; previous = undefined; return;
    }
    if (busy) return;
    busy = true;
    const ownGeneration = generation;
    try {
      const [stat, thermal, gpu] = await Promise.all([
        readFile("/proc/stat", "utf8").catch(() => undefined),
        sensor ? readFile(sensor, "utf8").catch(() => undefined) : Promise.resolve(undefined),
        exec("nvidia-smi", ["--query-gpu=index,utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits"], { timeout: 900, maxBuffer: 64 * 1024 }).catch(() => undefined),
      ]);
      if (generation !== ownGeneration || ctx.model?.provider !== "llama.cpp") return;
      if (stat) { const current = parseCpu(stat); cpu = previous ? cpuPercent(previous, current) : undefined; previous = current; }
      else { cpu = undefined; previous = undefined; }
      const rawTemp = thermal === undefined ? NaN : Number(thermal.trim()) / 1000;
      temperature = Number.isFinite(rawTemp) ? rawTemp : undefined;
      gpuAvailable = gpu !== undefined;
      gpus = gpu ? parseGpus(gpu.stdout) : [];
      display(ctx);
    } finally { busy = false; }
  }
  pi.on("session_start", async (_event, ctx) => {
    stop(); sampleCtx = ctx;
    if (ctx.mode !== "tui") return;
    sensor = await findCpuSensor().catch(() => undefined);
    await sample(ctx);
    timer = setInterval(() => { if (sampleCtx) void sample(sampleCtx); }, 1000);
    timer.unref();
  });
  pi.on("model_select", (_event, ctx) => { sampleCtx = ctx; void sample(ctx); });
  pi.on("session_shutdown", (_event, ctx) => {
    stop(); sampleCtx = undefined;
    if (ctx.mode === "tui") {
      ctx.ui.setStatus(KEY, undefined);
    }
  });
}
