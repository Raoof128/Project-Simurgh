#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5A VNC — verify-only reproduce (offline, byte-stable).
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Stage 5A VNC reproduce (verify-only) =="
node --version

echo "-- 1/6 public-tier verify (every fixture reaches its target code)"
node tools/simurgh-attestation/stage5a/node/verify-stage5a-attestation.mjs --all --tier public

echo "-- 2/6 audit-tier verify (embedded 4Z audit re-verify + pilot raw reopen)"
node tools/simurgh-attestation/stage5a/node/verify-stage5a-attestation.mjs --all --tier audit

echo "-- 3/6 byte-stability: rebuild fixtures in place and diff"
EVID="docs/research/llm-shield/evidence/stage-5a"
node tools/simurgh-attestation/stage5a/node/build-stage5a-fixtures.mjs >/dev/null
git diff --quiet -- "$EVID" && echo "   byte-stable (no diff)" || { echo "   DRIFT in $EVID"; exit 1; }

echo "-- 4/6 Lane B blind two-process recompute"
node tools/simurgh-attestation/stage5a/laneb/run-laneb-recompute-ceremony.mjs

echo "-- 5/6 JS<->Python parity (digest preflight + full ledger-content equality)"
if command -v python3 >/dev/null 2>&1; then
  node --test tests/e2e/llmShield/stage5a/parity.test.js >/dev/null
  echo "   parity OK"
else
  echo "   python3 absent — skipping parity (Node authoritative)"
fi

echo "-- 6/6 browser-parity (CSP + no-egress + WebCrypto Ed25519) + K7 all-functions net"
node --test tests/e2e/llmShield/stage5a/browserParity.test.js tests/e2e/llmShield/stage5a/k7AllFunctions.test.js >/dev/null
echo "   browser + K7 OK"

echo "== Stage 5A VNC reproduce: ALL PASS =="
