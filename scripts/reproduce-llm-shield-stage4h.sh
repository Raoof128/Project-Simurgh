#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stage 4H.3 reproduce: rebuilding Q0/Q1/Q2/Q4/Q5 plus Q6/Q7 evidence"

node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs
scripts/security-audit-llm-shield-stage4h.sh
node scripts/privacy-audit-llm-shield-stage4h.mjs
node --test \
  tests/unit/llmShield/stage4h/schema.test.js \
  tests/unit/llmShield/stage4h/premiseBinding.test.js \
  tests/unit/llmShield/stage4h/packBinding.test.js \
  tests/unit/llmShield/stage4h/derivation.test.js \
  tests/unit/llmShield/stage4h/diagnosticSoundness.test.js \
  tests/unit/llmShield/stage4h/discrimination.test.js \
  tests/unit/llmShield/stage4h/privacyGate.test.js \
  tests/unit/llmShield/stage4h/tamperClosure.test.js \
  tests/unit/llmShield/stage4h/reproduce.test.js
node --test tests/e2e/llmShield/stage4hFullSmoke.test.js

npx prettier --write \
  docs/research/llm-shield/evidence/stage-4h/*.json \
  tests/fixtures/llmShield/stage4h/*.json \
  tests/fixtures/llmShield/stage4h/privacy/*.json \
  tests/fixtures/llmShield/stage4h/tamper/*.json \
  tests/fixtures/llmShield/stage4h/expected-results/*.json >/dev/null

node tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  --base-pack tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.json \
  --base-pack-sig tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.sig \
  --base-pack-pubkey tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-signer.pub \
  --certificate tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-dfi-certificate.json \
  --manifest tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-signed-pack-manifest.json \
  --manifest-pubkey tests/fixtures/llmShield/stage4h/manifest-verifier.pub \
  --out docs/research/llm-shield/evidence/stage-4h/verifier-results.json
npx prettier --write docs/research/llm-shield/evidence/stage-4h/verifier-results.json >/dev/null

echo "Stage 4H.3 Q6/Q7 tamper closure and privacy: PASS"
