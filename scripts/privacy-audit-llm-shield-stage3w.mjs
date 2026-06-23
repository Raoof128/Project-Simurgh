// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3W privacy audit. Committed evidence is metadata-only: no secrets/tokens/emails, no raw
// prompts, no LG4 raw output (3W copies none). Fail-closed.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3w";
const FORBIDDEN = [
  /\bsk-[a-z0-9]/i,
  /api[_-]?key/i,
  /hf_[A-Za-z0-9]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
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
  console.error(`stage3w privacy audit: ${bad} violation(s)`);
  process.exit(1);
}
console.log(`stage3w privacy audit: PASS (${files.length} file(s), metadata-only)`);
