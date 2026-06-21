#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q security: no cross-target ranking fields in the published registry/diffs.
# The self-proof pack is exempt (it names the violations it provokes by design).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node - <<'NODE'
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { detectCrossTargetRankingExport } from "./tools/simurgh-temporal/temporalLib.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3q";
async function walk(d){const o=[];for(const e of await readdir(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())o.push(...(await walk(p)));else if((await stat(p)).isFile()&&p.endsWith(".json"))o.push(p);}return o;}
let bad=0;
for(const f of await walk(EV)){
  if(f.includes("/self-proof/")) continue;
  if(detectCrossTargetRankingExport(JSON.parse(await readFile(f,"utf8")))){console.error("ranking export in",f);bad++;}
}
if(bad>0){console.error("stage3q security: FAIL");process.exit(1);}
console.log("stage3q security: PASS");
NODE
