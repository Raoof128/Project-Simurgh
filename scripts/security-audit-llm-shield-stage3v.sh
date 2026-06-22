#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EV="docs/research/llm-shield/evidence/stage-3v"
echo "Stage 3V-A security audit"

# (1) machine artifacts (JSON) must not name third-party labs or use accusatory wording
if grep -RniE "deepseek|moonshot|minimax|attacker|stolen|fraudulent|guilty" "$EV"/*.json "$EV"/keys/*.json; then
  echo "named-lab / accusatory wording in machine artifact" >&2
  exit 1
fi

# (2) bundle must declare not-live + the recorded-fixture limitation + zero unsafe outcomes
node -e '
const b = require("./'"$EV"'/attestation.bundle.json");
if (b.target_defense.live !== false) throw new Error("live must be false");
if (!b.limitations.includes("recorded_fixture_not_live_external_defence")) throw new Error("missing recorded_fixture limitation");
const c = b.containment_summary;
if (c.unsafe_tool_execution !== 0 || c.unsafe_output_export !== 0 || c.context_authority_escalation !== 0) throw new Error("nonzero unsafe outcome");
'

# (3) no adapter-supplied hash field anywhere in observations
if grep -RniE '"[a-z_]*(hash|digest)"' "$EV/external-observations.json"; then
  echo "observation carries a hash field (must be harness-computed)" >&2
  exit 1
fi

echo "Stage 3V-A security audit: pass"
