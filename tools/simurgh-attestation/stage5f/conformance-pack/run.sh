#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5F VMP — independent-party conformance kit. Run from a fresh checkout root.
# FAIL-CLOSED: every gate is its own line (never `cmd && echo OK` under set -e — the 5E independent-
# party lesson). Verifies the committed panel attestation is authentic, complete, byte-stable, and that
# Lane B + Python parity corroborate it — WITHOUT re-running any detector.
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"
S=tools/simurgh-attestation/stage5f

echo "== Stage 5F VMP conformance kit =="
node -v

echo "-- unit + e2e verifier suites"
node --test tests/unit/llmShield/stage5f/*.test.js >/dev/null
echo "   unit OK"
node --test tests/e2e/llmShield/stage5f/*.test.js >/dev/null
echo "   e2e OK"

echo "-- public verify (strict) -> raw 0"
node "$S/node/verify-vmp-attestation.mjs" --tier public >/dev/null
echo "   public OK"

echo "-- audit verify (census bijection) -> raw 0"
node "$S/node/verify-vmp-attestation.mjs" --tier audit >/dev/null
echo "   audit OK"

echo "-- Lane B blind-recompute ceremony"
node "$S/laneb/run-laneb-recompute-ceremony.mjs" >/dev/null
echo "   Lane B corroborated"

echo "-- JS<->Python parity (if python3 present)"
if command -v python3 >/dev/null 2>&1; then
  python3 "$S/python/vmp_parity.py" >/dev/null
  echo "   Python parity corroborated"
else
  echo "   python3 absent — skipped (Node authoritative)"
fi

echo "-- byte-stability: rebuild + git diff"
node "$S/node/build-vmp-evidence.mjs" >/dev/null
git diff --quiet -- docs/research/llm-shield/evidence/stage-5f "$S/pin.json"
echo "   byte-stable"

echo "== Stage 5F VMP conformance: ALL PASS =="
