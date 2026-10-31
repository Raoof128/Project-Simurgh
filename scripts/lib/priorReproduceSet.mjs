// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const HISTORICAL_PIN = "docs/research/llm-shield/evidence/stage-5s/prior-reproduce-set.json";
const SELF = "reproduce-llm-shield-stage5s.sh";

export function validatePriorSet(raw, maintenance, discovered) {
  if (maintenance.schema !== "simurgh.prior-reproduce-maintenance.v1") {
    throw new Error("unknown maintenance schema");
  }
  if (createHash("sha256").update(raw).digest("hex") !== maintenance.historical_sha256) {
    throw new Error("historical pin bytes changed");
  }
  const historical = JSON.parse(raw);
  if (!Array.isArray(historical.scripts) || historical.scripts.length === 0) {
    throw new Error("empty historical set");
  }
  if (JSON.stringify(historical.excluded_by_name) !== JSON.stringify([SELF])) {
    throw new Error("historical self exclusion changed");
  }
  if (!Array.isArray(maintenance.additions)) throw new Error("missing additions");
  const additions = maintenance.additions.map((entry) => {
    if (typeof entry.reason !== "string" || !entry.reason.trim()) throw new Error("missing reason");
    return entry.script;
  });
  const expected = [...historical.scripts, ...additions].sort();
  if (new Set(expected).size !== expected.length || expected.includes(SELF)) {
    throw new Error("duplicate or self included in maintained set");
  }
  if (
    expected.some((name) => typeof name !== "string" || !/^reproduce-[a-zA-Z0-9-]+\.sh$/.test(name))
  ) {
    throw new Error("invalid script name");
  }
  const found = discovered.filter((name) => name !== SELF).sort();
  const added = found.filter((name) => !expected.includes(name));
  const removed = expected.filter((name) => !found.includes(name));
  if (
    !discovered.includes(SELF) ||
    added.length ||
    removed.length ||
    new Set(found).size !== found.length
  ) {
    throw new Error(
      `REFUSED — the prior set drifted from its pin and maintenance declaration: added=${JSON.stringify(added)} removed=${JSON.stringify(removed)}`
    );
  }
  return expected;
}

export function loadPriorSet() {
  return validatePriorSet(
    readFileSync(HISTORICAL_PIN),
    JSON.parse(readFileSync("scripts/prior-reproduce-maintenance.json", "utf8")),
    readdirSync("scripts").filter((name) => /^reproduce-.*\.sh$/.test(name))
  );
}

// Main-module guard. `import.meta.url` is the loader's REAL, percent-encoded path; `process.argv[1]`
// is whatever the shell passed. Compared as text, a verifier launched through a symlinked
// directory (`/tmp` on macOS) or a path containing a space never runs and exits 0 printing
// nothing (audit C-1, 31 October 2026). Both sides are resolved to the physical path here.
function isMainModule(moduleUrl) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  try {
    process.stdout.write(loadPriorSet().join("\n") + "\n");
  } catch (error) {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  }
}
