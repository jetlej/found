#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readEnvFileValue(key) {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return undefined;

  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    if (k !== key) continue;
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

const [, , functionName, rawArgs = "{}", ...rest] = process.argv;

if (!functionName) {
  console.error(
    'Usage: node scripts/convex-admin-run.mjs <functionName> [jsonArgs] [--flags]',
  );
  process.exit(1);
}

let parsedArgs = {};
try {
  parsedArgs = rawArgs ? JSON.parse(rawArgs) : {};
} catch (err) {
  console.error("Invalid JSON args:", rawArgs);
  process.exit(1);
}

const adminSecret =
  process.env.ADMIN_SECRET ??
  readEnvFileValue("ADMIN_SECRET") ??
  "squirtle";

const argsWithSecret = {
  ...parsedArgs,
  adminSecret,
};

const cmdArgs = [
  "convex",
  "run",
  functionName,
  JSON.stringify(argsWithSecret),
  ...rest,
];

const res = spawnSync("bunx", cmdArgs, {
  stdio: "inherit",
  shell: false,
});

process.exit(res.status ?? 1);

