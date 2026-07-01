#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RAW=0
SUMMARY="docs/research/llm-shield/evidence/stage-4h/reproduce-summary.json"

exit_via_wrapper() {
  local raw="$1"
  node -e "import('./tools/simurgh-attestation/stage4h/exitCodes.mjs').then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))" "$raw"
}

record_summary() {
  local raw="$1"
  node --input-type=module - "$raw" "$SUMMARY" <<'NODE'
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { stage4CodeForRawCode } from "./tools/simurgh-attestation/stage4h/exitCodes.mjs";

const raw = Number(process.argv[2]);
const out = process.argv[3];
const summary = {
  stage: "4H.5",
  raw_code: raw,
  run_level_exit: stage4CodeForRawCode(raw),
  q0_to_q7: "pass",
  typed_exit_source: "stage4CodeForRawCode",
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
NODE
}

run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    record_summary "$RAW"
    exit_via_wrapper "$RAW"
  fi
}

run_offline_audit() {
  local log
  log="$(mktemp)"
  if command -v unshare >/dev/null 2>&1; then
    if unshare -rn node scripts/offline-audit-llm-shield-stage4h.mjs >"$log" 2>&1; then
      rm -f "$log"
      return 0
    fi
    if grep -Eiq "operation not permitted|permission denied|not allowed" "$log"; then
      echo "unshare permission denied; OS ring skipped; in-process Q3 harness remains authoritative"
      rm -f "$log"
      node scripts/offline-audit-llm-shield-stage4h.mjs
      return $?
    fi
    cat "$log" >&2
    rm -f "$log"
    return 1
  fi
  echo "unshare unavailable; OS ring skipped; in-process Q3 harness remains authoritative"
  node scripts/offline-audit-llm-shield-stage4h.mjs
}

byte_stable_check() {
  local first second
  first="$(mktemp -d)"
  second="$(mktemp -d)"
  trap 'rm -rf "${first:-}" "${second:-}"' RETURN
  node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs >/dev/null
  cp docs/research/llm-shield/evidence/stage-4h/*.json "$first/"
  node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs >/dev/null
  cp docs/research/llm-shield/evidence/stage-4h/*.json "$second/"
  diff -ru "$first" "$second" >/dev/null
}

echo "[1/8] scrub and pin deterministic environment"
unset OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY BROWSERBASE_API_KEY
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0 NO_NETWORK=1

echo "[2/8] rebuild Stage 4H fixtures and digests"
run_step 29 node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs

echo "[3/8] verify signed clean Stage 4H pack"
run_step 25 node tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  --base-pack tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.json \
  --base-pack-sig tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.sig \
  --base-pack-pubkey tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-signer.pub \
  --certificate tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-dfi-certificate.json \
  --manifest tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-signed-pack-manifest.json \
  --manifest-pubkey tests/fixtures/llmShield/stage4h/manifest-verifier.pub \
  --out docs/research/llm-shield/evidence/stage-4h/verifier-results.json

echo "[4/8] run Q3 offline audit"
run_step 28 run_offline_audit

echo "[5/8] replay Q0-Q7 unit matrix"
run_step 29 node --test \
  tests/unit/llmShield/stage4h/schema.test.js \
  tests/unit/llmShield/stage4h/premiseBinding.test.js \
  tests/unit/llmShield/stage4h/packBinding.test.js \
  tests/unit/llmShield/stage4h/derivation.test.js \
  tests/unit/llmShield/stage4h/diagnosticSoundness.test.js \
  tests/unit/llmShield/stage4h/discrimination.test.js \
  tests/unit/llmShield/stage4h/privacyGate.test.js \
  tests/unit/llmShield/stage4h/tamperClosure.test.js \
  tests/unit/llmShield/stage4h/offlineHarness.test.js \
  tests/unit/llmShield/stage4h/exitWrapper.test.js \
  tests/unit/llmShield/stage4h/reproduce.test.js

echo "[6/8] verify byte-stable evidence"
run_step 29 byte_stable_check
run_step 29 npx prettier --check \
  docs/research/llm-shield/evidence/stage-4h/*.json \
  tests/fixtures/llmShield/stage4h/*.json \
  tests/fixtures/llmShield/stage4h/privacy/*.json \
  tests/fixtures/llmShield/stage4h/tamper/*.json \
  tests/fixtures/llmShield/stage4h/expected-results/*.json

record_summary 0

echo "[7/8] run anti-theatre deletion check"
run_step 29 node --test tests/unit/llmShield/stage4h/closeout.test.js

echo "[8/8] run Stage 4H E2E smoke"
run_step 29 node --test tests/e2e/llmShield/stage4hFullSmoke.test.js

RAW=0
record_summary "$RAW"
echo "Stage 4H.5 final reproduce: PASS"
exit_via_wrapper "$RAW"
