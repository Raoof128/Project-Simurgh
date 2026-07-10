#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5E VDA — independent-ENVIRONMENT reproduction on a second host (plan Task 16, lane D).
# Scope A: clone the public branch/commit on a fresh x86_64 host and run the verify-only reproduce
# (deterministic verifier + byte-stability + unit + Python parity + K7). NO model, NO capture — this
# proves the deterministic surface reproduces off the author's machine, across architecture.
#
# HONESTY: this is an independent ENVIRONMENT, not an independent PARTY (same principal, driven by us,
# from the public repo). It banks Frontier ~9.6; 10 stays reserved for a real external party running
# the BYO adapter. Scope C (re-running the Prompt Guard capture on the droplet) is a separate,
# higher-effort experiment; a cross-arch score mismatch is a REPORTED finding, never a knob to turn.
#
# Reads the target from an UNTRACKED env file (never the repo). Recommended: a short-lived SSH key and
# a non-root account with minimal sudo — NOT a root password.
#   DROPLET_SSH="user@host"   REPO_REF="<full 40-char commit sha or branch>"
set -euo pipefail
: "${DROPLET_SSH:?set DROPLET_SSH=user@host}"
: "${REPO_REF:?set REPO_REF=<full commit sha or branch>}"
REPO_URL="https://github.com/Raoof128/Project-Simurgh.git"

ssh -o StrictHostKeyChecking=accept-new "$DROPLET_SSH" "bash -lc '
  set -euo pipefail
  export NVM_DIR=\$HOME/.nvm; [ -s \$NVM_DIR/nvm.sh ] && . \$NVM_DIR/nvm.sh && nvm use 26 >/dev/null 2>&1 || true
  echo \"host: \$(uname -srm)\"; echo \"node: \$(node -v)\"; echo \"python: \$(python3 -V)\"
  rm -rf ~/simurgh-vda-repro && git clone --quiet \"$REPO_URL\" ~/simurgh-vda-repro
  cd ~/simurgh-vda-repro && git checkout --quiet \"$REPO_REF\"
  echo \"commit: \$(git rev-parse HEAD)\"
  npm ci --silent >/dev/null 2>&1 || npm install --silent >/dev/null 2>&1
  bash scripts/reproduce-llm-shield-stage5e.sh
'"
