// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-B privacy audit. Committed evidence (including the frozen-capture replay artifact) must
// be metadata-only: no raw prompts, no secrets/tokens/emails, and no LG4 output that echoes a
// real user_task. Fail-closed.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { buildStage3lCorpus } from "../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3v-b";
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
const userTasks = new Set(buildStage3lCorpus().map((fx) => fx.user_task));
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
  for (const ut of userTasks) {
    if (text.includes(ut)) {
      console.error(`privacy violation in ${f}: echoes a real user_task prompt`);
      bad += 1;
      break;
    }
  }
}
if (bad) {
  console.error(`stage3vb privacy audit: ${bad} violation(s)`);
  process.exit(1);
}
console.log(`stage3vb privacy audit: PASS (${files.length} file(s), metadata-only)`);
