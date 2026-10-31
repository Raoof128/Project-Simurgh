#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3m"

# CI verifies only; it never signs and never needs the private key.
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle "$EV/attestation.bundle.json" \
  --signature "$EV/attestation.signature.json" \
  --public-key "$EV/attestation.public-key.json" \
  --expected-key-fingerprint sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798 \
  --reproduce

bash scripts/policy-drift-guard-llm-shield-stage3m.sh
node scripts/privacy-audit-llm-shield-stage3m.mjs
bash scripts/security-audit-llm-shield-stage3m.sh
echo "stage3m smoke: passed"
