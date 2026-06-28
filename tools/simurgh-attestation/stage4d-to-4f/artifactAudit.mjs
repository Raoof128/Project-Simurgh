// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const VOLATILE_KEYS = new Set([
  "timestamp",
  "duration",
  "duration_ms",
  "wall_clock_ms",
  "machine_id",
]);
const RAW_LOG_KEYS = new Set(["stdout", "stderr", "raw_stdout", "raw_stderr"]);
const ABSOLUTE_PATH = /(^|")\/(?:Users|home|tmp|var|private)\//;

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function auditValue(value, path = "$", failures = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => auditValue(entry, `${path}[${index}]`, failures));
    return failures;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (VOLATILE_KEYS.has(key)) {
        failures.push({ reason: "volatile_artifact_field", path: `${path}.${key}` });
      }
      if (RAW_LOG_KEYS.has(key)) {
        failures.push({ reason: "raw_log_in_stable_artifact", path: `${path}.${key}` });
      }
      auditValue(nested, `${path}.${key}`, failures);
    }
    return failures;
  }
  if (typeof value === "string" && ABSOLUTE_PATH.test(JSON.stringify(value))) {
    failures.push({ reason: "volatile_artifact_field", path });
  }
  return failures;
}

export async function auditStableArtifacts({ root = ".", files }) {
  const failures = [];
  for (const file of files) {
    const text = await readFile(join(root, file), "utf8");
    const parsed = JSON.parse(text);
    for (const failure of auditValue(parsed)) failures.push({ file, ...failure });
  }
  return { ok: failures.length === 0, failures };
}

export async function snapshotFiles({ root = ".", files }) {
  const entries = [];
  for (const file of files.sort()) {
    const text = await readFile(join(root, file), "utf8");
    entries.push({ file, sha256: hashText(text) });
  }
  return entries;
}

export function compareSnapshots(before, after) {
  const afterByFile = new Map(after.map((entry) => [entry.file, entry.sha256]));
  const failures = [];
  for (const entry of before) {
    if (afterByFile.get(entry.file) !== entry.sha256) {
      failures.push({ file: entry.file, reason: "stage_artifact_mutation_attempted" });
    }
  }
  return { ok: failures.length === 0, failures };
}
