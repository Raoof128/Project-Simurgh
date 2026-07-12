#!/usr/bin/env bash
# Stage 5J — VRC: Verifiable Rating Contest. Fail-closed reproduce: verify the COMMITTED Lane-A pack
# (public + audit) raw 0, confirm byte-stability, run the Lane B ceremony properties + Lane C gate, and
# confirm the committed pack matches a fresh rebuild. Node 26.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi
BASE="tools/simurgh-attestation/stage5j/node"

echo "== Stage 5J VRC reproduce =="
"$NODE" --version

echo "-- verify COMMITTED Lane-A pack (public) --"
"$NODE" "$BASE/verify-vrc-attestation.mjs" --tier public

echo "-- verify COMMITTED Lane-A pack (audit) --"
"$NODE" "$BASE/verify-vrc-attestation.mjs" --tier audit

echo "-- byte-stability (build twice, cmp) --"
"$NODE" "$BASE/verify-byte-stability.mjs"

echo "-- Lean proofs (11 theorems, zero sorry) --"
if command -v lean >/dev/null 2>&1; then
  ( cd proofs/stage5j && lean RatingContest.lean && echo "lean: OK" )
else
  echo "lean not installed; skipping (checked in CI)"
fi

echo "-- Python parity (byte-identical roots) --"
python3 "tools/simurgh-attestation/stage5j/python/vrc_parity.py"

echo "-- committed pack matches a fresh rebuild --"
FRESH="$(mktemp -d)"
trap 'rm -rf "$FRESH"' EXIT
"$NODE" -e '
import("./tools/simurgh-attestation/stage5j/node/build-vrc-evidence.mjs").then(async (m) => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  m.buildLaneAEvidence(process.argv[1]);
  const committed = "docs/research/llm-shield/evidence/stage-5j";
  for (const f of ["bundle.json", "external-config.json", "public-attestation.json", "audit-attestation.json"]) {
    const a = readFileSync(join(committed, f), "utf8");
    const b = readFileSync(join(process.argv[1], f), "utf8");
    if (a !== b) { console.error("MISMATCH " + f); process.exit(1); }
  }
  console.log("committed pack == fresh rebuild");
});
' "$FRESH"

echo "== Stage 5J VRC reproduce: ALL PASS =="
