#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# VFC foreign-capture pack — the ONE command an external actor runs. Verifies the challenge, captures
# PG2 offline, signs the transcript with the actor key, and emits ONLY the capture package.
set -euo pipefail
cd "$(dirname "$0")"
RECEIPT=${1:?challenge-receipt.json}; VID=${2:?verifier-identity.json}; PIN=${3:?verifier-pin.json}
CORPUS=${4:?shared-corpus.json}; SNAP=${5:?detector-snapshot-manifest.json}; KEY=${6:?actor-key.pem}
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
python3 verify-challenge.py "$RECEIPT" "$VID" "$PIN"
echo "challenge verified"
python3 capture_pg2.py "$CORPUS" /tmp/vfc-cells.json
SNAP_D=$(python3 -c "import json;from _vfc_common import artifact_digest;print(artifact_digest(json.load(open('$SNAP'))))")
CORPUS_D=$(python3 -c "import json;from _vfc_common import artifact_digest;print(artifact_digest(json.load(open('$CORPUS'))))")
python3 sign-transcript.py /tmp/vfc-cells.json "$RECEIPT" "$KEY" "$SNAP_D" "$CORPUS_D" ./capture-package.json
echo "capture package ready: ./capture-package.json — return ONLY this file"
