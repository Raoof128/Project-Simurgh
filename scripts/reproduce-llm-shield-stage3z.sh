#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Z reproduction: run the producer-independent witness self-proof and
# regenerate evidence. Pure offline, key-free, deterministic.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EVID="docs/research/llm-shield/evidence/stage-3z"
mkdir -p "$EVID"

echo "[1/2] Running witness self-proof"
node tests/e2e/llm_shield_stage3z_witness_runner.mjs "$EVID"

echo "[2/2] Asserting falsification holds (signature valid AND witness catches the lie)"
node -e '
const m = require("./'"$EVID"'/metrics.json");
if (!(m.falsification.plain_vca_signature_valid === true && m.falsification.witness_caught_lie === true && m.falsification.holds === true)) { console.error("falsification does not hold"); process.exit(1); }
if (m.false_accusations !== 0 || m.missed_lies !== 0) { console.error("false accusation or missed lie"); process.exit(1); }
'
echo "stage 3z reproduction: PASS"
