#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Simurgh Stage 5E VDA independent conformance runner.
set -euo pipefail
cd "$(dirname "$0")"

echo "=================================================================="
echo " Simurgh — Stage 5E VDA independent conformance run"
echo " Verifiable Deployed-detector Attestation over Meta Prompt Guard 2"
echo "=================================================================="

command -v node >/dev/null 2>&1 || {
  echo "ERROR: Node.js not found. See DROPLET_SETUP.md (Node >= 20 required)." >&2
  exit 2
}
command -v python3 >/dev/null 2>&1 || {
  echo "ERROR: python3 not found. See DROPLET_SETUP.md (Python >= 3.10 required)." >&2
  exit 2
}

echo "node:   $(node -v)"
echo "python: $(python3 -V)"
echo

bash scripts/reproduce-llm-shield-stage5e.sh

echo
echo "=================================================================="
echo " INDEPENDENTLY CONFIRMED ON THIS MACHINE:"
echo "  - committed public and audit attestations verify to raw 0"
echo "  - rebuilding the evidence is byte-identical"
echo "  - the stdlib-Python parity implementation reproduces the facts"
echo "  - the unit, tamper-matrix, K7, and available Lean checks pass"
echo
echo " THIS RUN DOES NOT RE-RUN PROMPT GUARD. It verifies arithmetic over"
echo " committed model scores. See README.md for optional score recapture."
echo "=================================================================="

