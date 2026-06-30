#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stage 4H.1 reproduce: rebuilding Q1/Q2/Q5 explicit-flow integrity evidence"

node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs
node --test \
  tests/unit/llmShield/stage4h/schema.test.js \
  tests/unit/llmShield/stage4h/premiseBinding.test.js \
  tests/unit/llmShield/stage4h/packBinding.test.js \
  tests/unit/llmShield/stage4h/derivation.test.js \
  tests/unit/llmShield/stage4h/reproduce.test.js
node --test tests/e2e/llmShield/stage4hFullSmoke.test.js

npx prettier --write \
  docs/research/llm-shield/evidence/stage-4h/*.json \
  tests/fixtures/llmShield/stage4h/*.json \
  tests/fixtures/llmShield/stage4h/expected-results/*.json >/dev/null

node tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  --base-pack tests/fixtures/llmShield/stage4h/q1-clean-base-pack.json \
  --base-pack-sig tests/fixtures/llmShield/stage4h/q1-clean-base-pack.sig \
  --base-pack-pubkey tests/fixtures/llmShield/stage4h/q1-clean-signer.pub \
  --certificate tests/fixtures/llmShield/stage4h/q1-clean-dfi-certificate.json \
  --manifest tests/fixtures/llmShield/stage4h/q1-clean-signed-pack-manifest.json \
  --manifest-pubkey tests/fixtures/llmShield/stage4h/manifest-verifier.pub \
  --out docs/research/llm-shield/evidence/stage-4h/verifier-results.json
npx prettier --write docs/research/llm-shield/evidence/stage-4h/verifier-results.json >/dev/null

echo "Stage 4H.1 Q1/Q2/Q5 explicit-flow integrity: PASS"
