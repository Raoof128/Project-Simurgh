#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="docs/research/llm-shield/evidence/stage-3x"
echo "Stage 3X security audit"
if grep -RniE "deepseek|moonshot|minimax|attacker|stolen|fraudulent|guilty" "$EV"/*.json "$EV"/keys/*.json; then
  echo "named-lab / accusatory wording in machine artifact" >&2
  exit 1
fi
node -e '
const i = require("./'"$EV"'/timeline.index.json");
if (i.schema !== "simurgh.vca.public_timeline.v1") throw new Error("schema");
if (i.claim_summary.claims_uniform_full_reproduction !== false) throw new Error("must not claim uniform reproduction");
if (!i.non_claims.includes("does_not_reduce_live_capture_origin_self_reported")) throw new Error("missing sacred non-claim");
if (i.chain_summary.rungs_total !== 12) throw new Error("expected 12 rungs");
if (i.chain_summary.evidence_root_pinned !== 10) throw new Error("expected 10 evidence-root-pinned");
'
echo "Stage 3X security audit: pass"
