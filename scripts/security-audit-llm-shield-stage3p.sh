#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3P security audit: no affirmative ranking/leaderboard wording leaks into
# committed evidence outside allow-listed non-claim phrases, and no replica carries
# a real product brand. Delegates the nuanced check to the negation-aware gate.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node - <<'NODE'
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { checkRankingOverclaim } from "./tools/simurgh-benchmark/crossDefenceLib.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3p";
async function walk(dir){const out=[];for(const d of await readdir(dir,{withFileTypes:true})){const p=join(dir,d.name);if(d.isDirectory())out.push(...(await walk(p)));else if((await stat(p)).isFile()&&p.endsWith(".json"))out.push(p);}return out;}
let bad=0;
for(const f of await walk(EV)){
  // The self-proof pack is adversarial-detector metadata BY DESIGN: it names the
  // very violations it provokes (e.g. fixture "ranking-overclaimer"). The published
  // artifacts — catalogue + target attestations — are still scanned strictly.
  if(f.includes("/self-proof/")) continue;
  const obj=JSON.parse(await readFile(f,"utf8"));
  if(checkRankingOverclaim(obj)){console.error("overclaim wording in",f);bad++;}
}
if(bad>0){console.error("stage3p security: FAIL");process.exit(1);}
console.log("stage3p security: PASS");
NODE
