#!/usr/bin/env node
import fs from "node:fs";

const [, , localPath, profilePath] = process.argv;
if (!localPath || !profilePath) {
  console.error("usage: merge-models.mjs <models.json> <profile.json>");
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

const local = readJson(localPath);
const profile = readJson(profilePath);

local.providers ??= {};
local.providers["llama.cpp"] ??= {};
local.providers["llama.cpp"].modelOverrides ??= {};

const profileOverrides = profile.providers?.["llama.cpp"]?.modelOverrides ?? {};
for (const [modelId, override] of Object.entries(profileOverrides)) {
  const target = local.providers["llama.cpp"].modelOverrides[modelId] ?? {};
  const localMaxTokens = target.maxTokens;
  Object.assign(target, override);
  // Keep a machine-local maxTokens override when the profile does not declare one.
  if (localMaxTokens !== undefined && target.maxTokens === undefined) {
    target.maxTokens = localMaxTokens;
  }
  local.providers["llama.cpp"].modelOverrides[modelId] = target;
}

fs.writeFileSync(localPath, `${JSON.stringify(local, null, 2)}\n`);
