// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const BLOCKED_KEY =
  /(api[_-]?key|secret|private[_-]?key|transcript|raw[_-]?prompt|raw[_-]?model|authorization|token)/i;
const BLOCKED_VALUE =
  /(sk-[a-zA-Z0-9_-]{8,}|BEGIN (?:OPENSSH |RSA |EC |)PRIVATE KEY|raw model transcript|raw prompt|anthropic[_-]?api|openai[_-]?api)/i;

function walk(value, path = "$", failures = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, `${path}[${index}]`, failures));
    return failures;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (BLOCKED_KEY.test(key)) {
        failures.push({ reason: "privacy_leak_detected", path: `${path}.${key}`, match: "key" });
      }
      walk(nested, `${path}.${key}`, failures);
    }
    return failures;
  }
  if (typeof value === "string" && BLOCKED_VALUE.test(value)) {
    failures.push({ reason: "privacy_leak_detected", path, match: "value" });
  }
  return failures;
}

export async function scanJsonPrivacy({ root = ".", files, maxBytes = 1_000_000 }) {
  const failures = [];
  for (const file of files) {
    const text = await readFile(join(root, file), "utf8");
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      failures.push({
        file,
        reason: "privacy_leak_detected",
        path: "$",
        match: "oversized_file",
      });
      continue;
    }
    const parsed = JSON.parse(text);
    for (const failure of walk(parsed)) failures.push({ file, ...failure });
  }
  return { ok: failures.length === 0, failures };
}
