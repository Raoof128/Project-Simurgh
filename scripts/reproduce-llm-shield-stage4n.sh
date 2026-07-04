#!/usr/bin/env bash
# Stage 4N / Extraction Seismograph one-command reproduce (spec §11). Final exit ALWAYS
# routed through stage4CodeForRawCode — never a bare exit 1. No network, no wall clock:
# as_of is the committed synthetic-0006.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4n"
EVID="docs/research/llm-shield/evidence/stage-4n"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'

exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4n] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4n] [1/8] env + node major >= 26"
run_step 28 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4n] [2/8] regenerate fixtures into temp (never committed paths)"
T1="$(mktemp -d)"
trap 'rm -rf "$T1"' EXIT
run_step 29 env STAGE4N_FIXTURE_OUT="$T1" node tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs

echo "[stage4n] [3/8] unit suite (all stage4n modules, explicit globs)"
run_step 29 node --test tests/unit/llmShield/stage4n/*.test.js

echo "[stage4n] [4/8] committed deterministic artifacts match temp regeneration byte-for-byte"
for f in genesis-policy.json feed/heartbeat-feed.jsonl expected-results/seismograph-matrix.json \
  bilateral/inclusion-proof-valid.json \
  tamper/t1-drop-heartbeat/heartbeat-feed.jsonl tamper/t2-fork/second-artifact.json \
  tamper/t3-reorder/heartbeat-feed.jsonl tamper/t4-mutate-4k-root/heartbeat-feed.jsonl \
  tamper/t5-absent-heartbeat/inclusion-proof.json tamper/t6-early-reveal/heartbeat-feed.jsonl \
  tamper/t7-drop-due-reveal/heartbeat-feed.jsonl tamper/t8-reveal-band-mismatch/heartbeat-feed.jsonl \
  tamper/t9-undeclared-dimension/heartbeat-feed.jsonl; do
  run_step 29 cmp "$FIX/$f" "$T1/$f"
done

echo "[stage4n] [5/8] public evidence feed matches the fixture feed byte-for-byte"
run_step 29 cmp "$FIX/feed/heartbeat-feed.jsonl" "$EVID/heartbeat-feed.jsonl"
run_step 29 cmp "$FIX/genesis-policy.json" "$EVID/genesis-policy.json"

echo "[stage4n] [6/8] all-functions e2e net (tamper matrix + anti-theatre + attestation)"
run_step 29 node --test tests/e2e/llmShield/stage4n/*.test.js

echo "[stage4n] [7/8] clean verdict on the committed public feed"
REPORT="$T1/final-report.json"
set +e
node tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs \
  --feed "$EVID/heartbeat-feed.jsonl" --policy "$EVID/genesis-policy.json" \
  --as-of synthetic-0006 --out "$REPORT" >/dev/null 2>&1
VERIFY_EXIT=$?
set -e
if [ "$VERIFY_EXIT" != "0" ]; then
  echo "[stage4n] committed feed did not verify clean (exit $VERIFY_EXIT)" >&2
  exit_via_wrapper 29
fi

echo "[stage4n] [8/8] working tree unchanged by this reproduce"
if [ -n "$(git status --porcelain -- "$FIX" "$EVID")" ]; then
  echo "[stage4n] reproduce dirtied the tree" >&2
  exit_via_wrapper 29
fi

echo "[stage4n] ALL GREEN"
exit_via_wrapper 0
