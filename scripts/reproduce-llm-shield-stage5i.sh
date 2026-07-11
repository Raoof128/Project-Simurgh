#!/usr/bin/env bash
# Stage 5I — VPC: Verifiable Panel Coverage. Fail-closed reproduce: build the byte-stable Lane-A pack,
# verify the COMMITTED pack (public + audit) raw 0, and confirm byte-stability. Node 26.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi
BASE="tools/simurgh-attestation/stage5i/node"

echo "== Stage 5I VPC reproduce =="
"$NODE" --version

echo "-- verify COMMITTED Lane-A pack (public) --"
"$NODE" "$BASE/verify-vpc-attestation.mjs" --tier public
echo "-- verify COMMITTED Lane-A pack (audit) --"
"$NODE" "$BASE/verify-vpc-attestation.mjs" --tier audit

echo "-- byte-stability (build twice, sorted manifest) --"
"$NODE" "$BASE/verify-byte-stability.mjs"

echo "-- Lane B: deterministic multi-process panel ceremony --"
"$NODE" "tools/simurgh-attestation/stage5i/laneb/run-laneb-panel-ceremony.mjs"

echo "-- Lane C: fail-closed campaign gate (real Opus 4.6 public structure, PENDING) --"
"$NODE" "$BASE/lanec-gate.mjs"

echo "-- committed pack matches a fresh rebuild --"
FRESH="$(mktemp -d)"
trap 'rm -rf "$FRESH"' EXIT
"$NODE" -e '
import("./tools/simurgh-attestation/stage5i/node/build-vpc-evidence.mjs").then(async (m) => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  m.buildLaneAEvidence(process.argv[1]);
  const committed = "docs/research/llm-shield/evidence/stage-5i";
  for (const f of ["bundle.json", "external-config.json"]) {
    const a = readFileSync(join(committed, f), "utf8");
    const b = readFileSync(join(process.argv[1], f), "utf8");
    if (a !== b) { console.error("DRIFT: " + f); process.exit(1); }
  }
  console.log("committed == fresh: OK");
});
' "$FRESH"

echo "== Stage 5I reproduce: ALL PASS =="
