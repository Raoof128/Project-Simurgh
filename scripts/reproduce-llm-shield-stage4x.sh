#!/usr/bin/env bash
# Stage 4X / VLR one-command reproduce (4X spec §3). Verify-only. The Lane A corpus, ledger, and
# attestation are deterministic pure functions of the committed fixture key (Ed25519 is
# deterministic), rebuilt and byte-compared. Lane B is re-verified, never regenerated with new
# state. No network, no wall clock. Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
EVID="docs/research/llm-shield/evidence/stage-4x"
S4X="tools/simurgh-attestation/stage4x"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() {
  local raw="$1"; shift
  if ! "$@"; then RAW="$raw"; echo "[stage4x] step failed -> raw $RAW" >&2; exit_via_wrapper "$RAW"; fi
}

echo "[stage4x] [1/8] env + node major >= 26"
run_step 173 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4x] [2/8] unit suites (explicit globs)"
run_step 173 node --test \
  tests/unit/llmShield/stage4x/exitCodes.test.js \
  tests/unit/llmShield/stage4x/constants.test.js \
  tests/unit/llmShield/stage4x/gateV2.test.js \
  tests/unit/llmShield/stage4x/metamorphicTable.test.js \
  tests/unit/llmShield/stage4x/corpusCore.test.js \
  tests/unit/llmShield/stage4x/residueLedger.test.js \
  tests/unit/llmShield/stage4x/vlrCore.test.js \
  tests/unit/llmShield/stage4x/fixtures.test.js \
  tests/unit/llmShield/stage4x/parity.test.js

echo "[stage4x] [3/8] rebuild corpus + ledger + attestation -> byte-stable"
run_step 175 node "$S4X/node/build-stage4x-attestation.mjs"
run_step 175 git diff --exit-code -- "$EVID/corpus.json" "$EVID/ledger.json" "$EVID/attestation.json"

echo "[stage4x] [4/8] verify public tier"
run_step 178 node "$S4X/node/verify-stage4x-attestation.mjs" --tier public

echo "[stage4x] [5/8] verify audit tier (live gate re-run)"
run_step 177 node "$S4X/node/verify-stage4x-attestation.mjs" --tier audit

echo "[stage4x] [6/8] Lane B blind recompute -> byte-stable capture"
run_step 178 node "$S4X/laneb/run-laneb-recompute-ceremony.mjs"
run_step 178 git diff --exit-code -- "$EVID/laneb-capture.json"

echo "[stage4x] [7/8] tamper -> expect non-zero (a swapped ruleset digest must fail 176)"
run_step 176 node -e '
import("./'"$S4X"'/core/vlrCore.mjs").then(async (m) => {
  const fs = await import("node:fs");
  const rd = (f) => JSON.parse(fs.readFileSync("'"$EVID"'/" + f, "utf8"));
  const pub = fs.readFileSync("tests/fixtures/llmShield/stage4x/test-keys/INSECURE_FIXTURE_ONLY_vlr.pub.pem", "utf8");
  const b = { corpus: rd("corpus.json"), ledger: rd("ledger.json"), attestation: rd("attestation.json") };
  b.corpus.ruleset_binding.v1_ruleset_digest = "sha256:" + "0".repeat(64);
  process.exit(m.evaluateVlr(b, { tier: "public", publicKeyPem: pub }).raw === 176 ? 0 : 1);
});'

echo "[stage4x] [8/8] Lean proofs (guarded)"
if command -v lean >/dev/null 2>&1; then
  run_step 179 lean proofs/stage4x/LeakageResidue.lean
  run_step 179 bash -c '! grep -Rn "\bsorry\b" proofs/stage4x'
else
  echo "[stage4x] lean not present -> skipping proof step (CI runs it)"
fi

echo "[stage4x] reproduce OK (raw 0): slip v1 6/6 -> v2 1/6, irreducible floor sealed."
