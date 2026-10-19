// SPDX-License-Identifier: AGPL-3.0-or-later
import { accessSync, constants, existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, delimiter, join, resolve } from "node:path";

function executable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
const pathCandidates = (env, names) =>
  (env.PATH || "")
    .split(delimiter)
    .filter(Boolean)
    .flatMap((dir) => names.map((name) => resolve(dir, name)));

export function discoverBrowser({
  env = process.env,
  platform = process.platform,
  executable: canRun = executable,
} = {}) {
  if (env.SIMURGH_CHROME) {
    const path = resolve(env.SIMURGH_CHROME);
    if (!canRun(path)) throw new Error("SIMURGH_CHROME must name an executable browser");
    return path;
  }
  const candidates =
    platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : [];
  return (
    [
      ...candidates,
      ...pathCandidates(env, [
        "chromium",
        "chromium-browser",
        "google-chrome",
        "google-chrome-stable",
      ]),
    ].find(canRun) || null
  );
}

// This is a prerequisite detector, not a general policy evaluator. Other restrictions
// still surface as actual execution failures; no browser policy is changed.
export function fileNavigationBlocked(policies) {
  const block = policies.flatMap((p) => p.URLBlocklist || []);
  const allow = policies.flatMap((p) => p.URLAllowlist || []);
  return block.includes("*") && !allow.some((p) => ["*", "file://*", "file:///*"].includes(p));
}
export function managedBrowserBlockReason(browser, platform = process.platform) {
  if (!browser || platform !== "linux") return null;
  const roots = basename(browser).includes("chromium")
    ? ["/etc/chromium/policies/managed"]
    : ["/etc/opt/chrome/policies/managed"];
  const policies = roots.filter(existsSync).flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
  );
  return fileNavigationBlocked(policies) ? "managed_browser_file_navigation_blocked" : null;
}

export function discoverAlternateNode({
  env = process.env,
  executable: canRun = executable,
  version = (path) => {
    const r = spawnSync(path, ["--version"], { encoding: "utf8", timeout: 5000 });
    return r.status === 0 ? r.stdout.trim() : "";
  },
} = {}) {
  const valid = (path) =>
    canRun(path) &&
    /^v\d+\./.test(version(path)) &&
    Number(version(path).slice(1).split(".")[0]) < 26;
  if (env.SIMURGH_ALTERNATE_NODE) {
    const path = resolve(env.SIMURGH_ALTERNATE_NODE);
    if (basename(path) !== "node" || !valid(path))
      throw new Error("SIMURGH_ALTERNATE_NODE must name an executable node with major < 26");
    return path;
  }
  return pathCandidates(env, ["node"]).find(valid) || null;
}
