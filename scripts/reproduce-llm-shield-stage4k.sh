#!/usr/bin/env bash
# Stage 4K one-command reproduce (spec §0.3). Final exit ALWAYS routed through
# stage4CodeForRawCode — never a bare exit 1.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4k"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'

exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"; shift
  if ! "$@"; then RAW="$raw"; echo "reproduce: step failed -> raw $RAW" >&2; exit_via_wrapper "$RAW"; fi
}

echo "[1/9] env + node major"
run_step 28 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[2/9] regenerate fixtures into temp (never committed paths)"
T1="$(mktemp -d)"; T2="$(mktemp -d)"; trap 'rm -rf "$T1" "$T2"' EXIT
run_step 29 env STAGE4K_FIXTURE_OUT="$T1" node tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs

echo "[3/9] unit suite (ledger, gate, manifest, wrapper, verifier, closeout)"
# node --test needs explicit files/globs, not a bare directory (bash expands the glob here).
run_step 29 node --test tests/unit/llmShield/stage4k/*.test.js

echo "[4/9] committed deterministic artifacts match temp regeneration byte-for-byte"
for f in bundles/under-budget/extraction-ledger.json bundles/under-budget/extraction-attestation.json \
         bundles/over-budget/extraction-ledger.json bundles/over-budget/extraction-attestation.json \
         expected-results/exposure-matrix.json; do
  run_step 29 cmp "$FIX/$f" "$T1/$f"
done

echo "[5/9] Q8 verdicts on committed bundles"
# Raw 30 means ONLY extraction_budget_exceeded — never blanket-map a verifier failure
# to 30. Read the verifier's own --out report and route through ITS raw code
# (default 29 fail-closed if the report is missing or unreadable).
report_raw() { # report_raw <report-path> -> prints rawCode or 29
  node -e 'const fs=require("fs"); try { console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).rawCode ?? 29) } catch { console.log(29) }' "$1"
}

UNDER_REPORT="$T1/under-report.json"
set +e
node tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs \
  --bundle "$FIX/bundles/under-budget" \
  --pinned-pubkey "$FIX/eba-signer.pub" \
  --out "$UNDER_REPORT"
UNDER_EXIT=$?
set -e
if [ "$UNDER_EXIT" -ne 0 ]; then
  RAW="$(report_raw "$UNDER_REPORT")"
  echo "reproduce: under-budget bundle failed -> raw $RAW" >&2
  exit_via_wrapper "$RAW"
fi

OVER_REPORT="$T1/over-report.json"
set +e
node tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs \
  --bundle "$FIX/bundles/over-budget" \
  --pinned-pubkey "$FIX/eba-signer.pub" \
  --out "$OVER_REPORT" >/dev/null 2>&1
OVER_EXIT=$?
set -e
OVER_RAW="$(report_raw "$OVER_REPORT")"
# Anti-theatre: the over-budget bundle must fail AND fail for exactly the Q8 reason
# (raw 30) — a pass, or a failure with any other raw code, means Q8 is theatre.
if [ "$OVER_EXIT" -eq 0 ] || [ "$OVER_RAW" -ne 30 ]; then
  echo "reproduce: over-budget bundle did not fail with raw 30 (exit=$OVER_EXIT raw=$OVER_RAW) — Q8 is theatre" >&2
  RAW=29; exit_via_wrapper "$RAW"
fi

echo "[6/9] Q0-Q7 containment record still verifies (via E2E smoke, incl. substrate re-verify)"
run_step 29 node --test tests/e2e/llmShield/stage4kFullSmoke.test.js

echo "[7/9] byte-stable golden: second temp build must equal the first"
run_step 29 env STAGE4K_FIXTURE_OUT="$T2" node tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs
for f in bundles/under-budget/extraction-ledger.json bundles/over-budget/extraction-attestation.json \
         expected-results/exposure-matrix.json; do
  run_step 29 cmp "$T1/$f" "$T2/$f"
done

echo "[8/9] anti-theatre: deletion falsifier"
DELDIR="$(mktemp -d)"; cp -R "$FIX/bundles/under-budget/." "$DELDIR/"; rm "$DELDIR/extraction-ledger.json"
set +e
node tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs \
  --bundle "$DELDIR" --pinned-pubkey "$FIX/eba-signer.pub" >/dev/null 2>&1
DEL_EXIT=$?
set -e
rm -rf "$DELDIR"
if [ "$DEL_EXIT" -eq 0 ]; then
  echo "reproduce: deleted ledger still verified — fail-open" >&2
  RAW=29; exit_via_wrapper "$RAW"
fi

echo "[9/9] evidence emission (refuses divergence) is byte-idempotent"
# Evidence is JSON.stringify canonical (prettier-ignored, same reason as the fixtures):
# a clean re-emit MUST reproduce the committed bytes exactly. git-clean is the real check.
run_step 29 node tools/simurgh-attestation/stage4k/emit-stage4k-evidence.mjs
run_step 29 git diff --exit-code -- docs/research/llm-shield/evidence/stage-4k

echo "stage4k reproduce: ALL GREEN"
exit_via_wrapper 0
