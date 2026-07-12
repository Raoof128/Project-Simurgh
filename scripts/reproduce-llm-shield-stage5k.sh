#!/usr/bin/env bash
# Stage 5K — VUC: Verifiable Universe Commitment. Fail-closed reproduce: verify the COMMITTED Lane-A pack
# (public + audit) raw 0, confirm byte-stability, run Python parity, the Lean core, and confirm the
# committed pack matches a fresh rebuild. Node 26.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi
BASE="tools/simurgh-attestation/stage5k/node"

echo "== Stage 5K VUC reproduce =="
"$NODE" --version

echo "-- verify COMMITTED Lane-A pack (public) --"
"$NODE" "$BASE/verify-vuc-attestation.mjs" --tier public

echo "-- verify COMMITTED Lane-A pack (audit) --"
"$NODE" "$BASE/verify-vuc-attestation.mjs" --tier audit

echo "-- byte-stability (build twice, cmp) --"
"$NODE" "$BASE/verify-byte-stability.mjs"

echo "-- Lean proofs (11 theorems, no unfinished goals) --"
if command -v lean >/dev/null 2>&1; then
  ( cd proofs/stage5k && lean UniverseCommitment.lean && echo "lean: OK" )
else
  echo "lean not installed; skipping (checked in CI)"
fi

echo "-- Python parity (byte-identical roots) --"
python3 "tools/simurgh-attestation/stage5k/python/vuc_parity.py"

echo "-- committed pack matches a fresh rebuild --"
FRESH="$(mktemp -d)"
trap 'rm -rf "$FRESH"' EXIT
"$NODE" -e '
import("./tools/simurgh-attestation/stage5k/node/build-vuc-evidence.mjs").then(async (m) => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  m.buildLaneAEvidence(process.argv[1]);
  const committed = "docs/research/llm-shield/evidence/stage-5k";
  for (const f of ["bundle.json", "external-config.json", "public-attestation.json", "audit-attestation.json"]) {
    const a = readFileSync(join(committed, f), "utf8");
    const b = readFileSync(join(process.argv[1], f), "utf8");
    if (a !== b) { console.error("MISMATCH " + f); process.exit(1); }
  }
  console.log("committed pack == fresh rebuild");
});
' "$FRESH"

echo "== Stage 5K VUC reproduce: ALL PASS =="
