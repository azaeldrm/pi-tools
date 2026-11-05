#!/usr/bin/env node
import fs from "node:fs";

const [, , settingsPath, profilePath, sourceArg] = process.argv;
if (!settingsPath || !profilePath) {
  console.error("usage: apply-ui.mjs <settings.json> <ui.json> [package-source]");
  process.exit(2);
}

const readJson = (path) => {
  if (!fs.existsSync(path)) return {};
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`${path} is not valid JSON: ${error.message}`);
    process.exit(1);
  }
};

const settings = readJson(settingsPath);
const profile = readJson(profilePath);
if (!profile || typeof profile !== "object") {
  console.error(`${profilePath} is not an object`);
  process.exit(1);
}

if (profile.theme) settings.theme = profile.theme;
if (profile.defaultThinkingLevel) settings.defaultThinkingLevel = profile.defaultThinkingLevel;
if (profile.hideThinkingBlock !== undefined) settings.hideThinkingBlock = profile.hideThinkingBlock;
if (profile.powerline) settings.powerline = profile.powerline;

const source = sourceArg || "git:github.com/azaeldrm/pi-tools";
const packageExtensions = profile.packageExtensions ?? [];
const matchesSource = (itemSource) =>
  typeof itemSource === "string" &&
  (itemSource === source || itemSource.startsWith(`${source}@`));

const packages = Array.isArray(settings.packages) ? settings.packages : [];
let found = false;
settings.packages = packages.map((item) => {
  const itemSource = typeof item === "string" ? item : item?.source;
  if (matchesSource(itemSource)) {
    found = true;
    return { source: itemSource, extensions: packageExtensions };
  }
  return item;
});

if (!found && packageExtensions.length > 0) {
  settings.packages.push({ source, extensions: packageExtensions });
}

fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
