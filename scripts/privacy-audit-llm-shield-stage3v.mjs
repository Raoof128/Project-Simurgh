// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-A privacy audit. Generated/exported/signed evidence must be metadata-only: no raw
// prompts, no raw external model output, no secrets/emails. Raw outputs may exist ONLY in the
// committed fixture (tests/fixtures/stage-3v/), never under the evidence folder (Fix 2).
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3v";
const FORBIDDEN = [
  /\bsk-[a-z0-9]/i,
  /api[_-]?key/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /rationale=/, // raw recorded-output template marker — must never leak into evidence
  /<malformed-output>/,
];
async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) out.push(p);
  }
  return out;
}
const files = await walk(EV);
let bad = 0;
for (const f of files) {
  const text = await readFile(f, "utf8");
  for (const rx of FORBIDDEN) {
    if (rx.test(text)) {
      console.error(`privacy violation in ${f}: ${rx}`);
      bad += 1;
    }
  }
}
if (bad) {
  console.error(`stage3v privacy audit: ${bad} violation(s)`);
  process.exit(1);
}
console.log(`stage3v privacy audit: PASS (${files.length} file(s), metadata-only)`);
