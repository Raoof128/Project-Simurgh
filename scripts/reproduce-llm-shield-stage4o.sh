#!/usr/bin/env bash
# Stage 4O / VTSA one-command reproduce (4O spec §13). Final exit ALWAYS routed through
# stage4CodeForRawCode — never a bare non-zero exit. No network, no wall clock: the manifest
# is modelled (Lane A) and the 4N feed is a frozen fixture input.
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
# Prepend Node 26 only (local convenience); do NOT shadow the system python3, which is the
# interpreter that carries pytest. In CI, Node 26 and pytest are provisioned on PATH.
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4o"
EVID="docs/research/llm-shield/evidence/stage-4o"
ADAPTER="tools/agentdojo-simurgh-adapter"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4o] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4o] [1/8] env + node major >= 26"
run_step 28 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4o] [2/8] regenerate fixtures into temp (never committed paths)"
T1="$(mktemp -d)"
trap 'rm -rf "$T1"' EXIT
run_step 29 env STAGE4O_FIXTURE_OUT="$T1" node tools/simurgh-attestation/stage4o/node/build-stage4o-fixtures.mjs

echo "[stage4o] [3/8] unit suites (node stage4o + python mirror/kernel/parity)"
run_step 29 node --test tests/unit/llmShield/stage4o/*.test.js
run_step 29 python3 -m pytest "$ADAPTER/tests/test_manifest_surface.py" \
  "$ADAPTER/tests/test_capability_kernel_manifest.py" "$ADAPTER/tests/test_stage4o_parity.py" -q

echo "[stage4o] [4/8] committed builder fixtures match temp regeneration byte-for-byte"
while IFS= read -r f; do
  run_step 29 cmp "$FIX/$f" "$T1/$f"
done < <(cd "$FIX" && find . -type f -name "*.json" | grep -v "test-keys" | grep -v "laneb" | sort)

echo "[stage4o] [5/8] egress check: evidence carries digests + enums only, no raw tool text"
run_step 29 bash -c '! grep -rEn "\"(description|inputSchema|hostname|url)\"" docs/research/llm-shield/evidence/stage-4o/'

echo "[stage4o] [6/8] all-functions e2e net (tamper matrix + parity + cross-stage invariants)"
run_step 29 node --test tests/e2e/llmShield/stage4o/*.test.js

echo "[stage4o] [7/8] clean verdict on the committed evidence bundle"
run_step 29 node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --evidence "$EVID"

echo "[stage4o] [8/8] byte idempotency: fixtures + evidence are read-only under reproduce"
run_step 29 git diff --quiet -- "$FIX" "$EVID"

echo "[stage4o] reproduce complete -> raw 0"
exit_via_wrapper 0
