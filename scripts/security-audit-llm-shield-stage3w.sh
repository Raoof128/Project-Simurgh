#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="docs/research/llm-shield/evidence/stage-3w"
echo "Stage 3W security audit"

# (1) machine artifacts must not name third-party labs or use accusatory wording
if grep -RniE "deepseek|moonshot|minimax|attacker|stolen|fraudulent|guilty" "$EV"/*.json "$EV"/keys/*.json; then
  echo "named-lab / accusatory wording in machine artifact" >&2
  exit 1
fi

# (2) the sacred non-claim and the offline-primary invariant must be present and intact
node -e '
const b = require("./'"$EV"'/attestation.bundle.json");
if (b.predicate.witnessed_stage !== "3V-B") throw new Error("witnessed_stage must be 3V-B");
if (b.predicate.model_reexecuted_in_ci !== false) throw new Error("model_reexecuted_in_ci must be false");
if (!b.predicate.non_claims.includes("does_not_reduce_live_capture_origin_self_reported")) throw new Error("missing sacred non-claim");
if (b.predicate.online_witness.required_for_offline_verification !== false) throw new Error("online witness must not be required offline");
'

# (3) offline evidence must contain NO Sigstore/Rekor attestation OBJECT (online layer stays out).
# Match real Sigstore-bundle structure markers, not our own honest field names that mention sigstore.
if grep -RniE "tlogEntries|dsseEnvelope|verificationMaterial|rekorBundle|application/vnd\.dev\.sigstore|\"_type\"[[:space:]]*:[[:space:]]*\"https://in-toto.io/attestation" "$EV"/*.json; then
  echo "online Sigstore/Rekor attestation object leaked into offline evidence" >&2
  exit 1
fi
echo "Stage 3W security audit: pass"
