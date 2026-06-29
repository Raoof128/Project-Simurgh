#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Stage 4H.0 Proof-Carrying DFI digest foundation: start"
echo "Stage 4H.0 scope: schema, canonical premises, Q2 premise digest, Q5 pack binding"

node --test \
  tests/unit/llmShield/stage4h/schema.test.js \
  tests/unit/llmShield/stage4h/premiseBinding.test.js \
  tests/unit/llmShield/stage4h/packBinding.test.js \
  tests/unit/llmShield/stage4h/reproduce.test.js

node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs

node tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  --base-pack tests/fixtures/llmShield/stage4h/clean-base-pack.json \
  --base-pack-sig tests/fixtures/llmShield/stage4h/clean-base-pack.sig \
  --base-pack-pubkey tests/fixtures/llmShield/stage4h/clean-signer.pub \
  --certificate tests/fixtures/llmShield/stage4h/clean-dfi-certificate.json \
  --manifest tests/fixtures/llmShield/stage4h/clean-signed-pack-manifest.json \
  --manifest-pubkey tests/fixtures/llmShield/stage4h/manifest-verifier.pub \
  --out docs/research/llm-shield/evidence/stage-4h/verifier-results.json

echo "Stage 4H.0 Q2/Q5 digest foundation: PASS"
