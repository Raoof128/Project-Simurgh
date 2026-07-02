#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4J PCTA one-command reproduce. Verifies the COMMITTED fixtures (never rewrites them:
# fixture regeneration draws fresh keys, so rebuild happens only into a temp dir and only the
# deterministic matrix is byte-compared), replays every P-gate, runs the anti-theatre deletion
# falsifier, and re-emits the evidence set.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0 NO_NETWORK=1
env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY -u GOOGLE_API_KEY -u BROWSERBASE_API_KEY true
EV="docs/research/llm-shield/evidence/stage-4j"
mkdir -p "$EV"
exit_via_wrapper() { node -e "import('./tools/simurgh-attestation/stage4h/exitCodes.mjs').then(m=>process.exit(m.stage4CodeForRawCode($1)))"; }
run_step() { local raw="$1"; shift; echo "==> $*"; if ! "$@"; then exit_via_wrapper "$raw"; fi; }

# 1. Full unit + comprehensive E2E replay over the committed fixtures.
run_step 29 node --test tests/unit/llmShield/stage4j/exitWrapper.pcta.test.js tests/unit/llmShield/stage4j/authorizationProof.test.js tests/unit/llmShield/stage4j/authoritySource.test.js tests/unit/llmShield/stage4j/premiseCoupling.test.js tests/unit/llmShield/stage4j/verifier.test.js
run_step 29 node --test tests/e2e/llmShield/stage4jFullSmoke.test.js

# 2. Churn-safe regeneration golden: rebuild into a TEMP dir; the deterministic matrix must be
#    byte-identical to the committed one. Committed fixtures are never touched.
TMPFX="$(mktemp -d)"
trap 'rm -rf "$TMPFX"' EXIT
run_step 29 env STAGE4J_FIXTURE_OUT="$TMPFX" node tools/simurgh-attestation/stage4j/build-stage4j-fixtures.mjs
run_step 29 cmp tests/fixtures/llmShield/stage4j/expected-results/pcta-matrix.json "$TMPFX/expected-results/pcta-matrix.json"

# 3. Anti-theatre falsifier: deleting the proof MUST flip to a rejecting code, never 0.
node -e '
const { runPctaCore } = await import("./tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs");
const fs = await import("node:fs"); const os = await import("node:os"); const path = await import("node:path");
const c = JSON.parse(fs.readFileSync("tests/fixtures/llmShield/stage4j/clean-authorized.json","utf8"));
c.proof = null;
const d = path.join(os.tmpdir(), "pcta-del.json"); fs.writeFileSync(d, JSON.stringify(c));
const r = await runPctaCore({ fixture: d, pinnedPubkeyPath: "tests/fixtures/llmShield/stage4j/pcta-signer.pub" });
fs.rmSync(d, { force: true });
if (r.rawCode === 0) { console.error("ANTI-THEATRE FAIL: deletion still accepted"); process.exit(1); }
console.log("anti-theatre deletion ->", r.rawCode);' || exit_via_wrapper 29

# 4. Evidence emission (fails closed if any observed verdict disagrees with the matrix).
run_step 29 node tools/simurgh-attestation/stage4j/emit-stage4j-evidence.mjs
node -e 'const fs=require("node:fs");fs.writeFileSync("'"$EV"'/reproduce-summary.json",JSON.stringify({stage:"4J",status:"pass",gates:"P0-P8",matrix_rows:10,node_major:process.versions.node.split(".")[0]},null,2)+"\n")'
run_step 29 npx prettier --write "$EV"
run_step 29 npx prettier --check "$EV"
run_step 29 git diff --check

echo "Stage 4J PCTA reproduce: PASS"
