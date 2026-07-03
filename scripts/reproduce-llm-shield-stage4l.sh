#!/usr/bin/env bash
# Stage 4L / CCB one-command reproduce (spec §5 L5). Final exit ALWAYS routed through
# stage4CodeForRawCode — never a bare exit 1.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4l"
K="tests/fixtures/llmShield/stage4k"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'

exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"; shift
  if ! "$@"; then RAW="$raw"; echo "reproduce: step failed -> raw $RAW" >&2; exit_via_wrapper "$RAW"; fi
}
report_raw() { # report_raw <report-path> -> prints rawCode or 29
  node -e 'const fs=require("fs"); try { console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).rawCode ?? 29) } catch { console.log(29) }' "$1"
}
verify_raw() { # verify_raw <bundle-dir> <report-path> -> prints observed raw (fail-closed 29)
  set +e
  node tools/simurgh-attestation/stage4l/verify-stage4l.mjs \
    --bundle "$1" --pinned-pubkey "$FIX/ccb-signer.pub" --out "$2" >/dev/null 2>&1
  set -e
  report_raw "$2"
}

echo "[1/10] env + node major >= 26"
run_step 28 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[2/10] regenerate 4L fixtures into temp (never committed paths)"
T1="$(mktemp -d)"; T2="$(mktemp -d)"; TW="$(mktemp -d)"; trap 'rm -rf "$T1" "$T2" "$TW"' EXIT
run_step 29 env STAGE4L_FIXTURE_OUT="$T1" node tools/simurgh-attestation/stage4l/build-stage4l-fixtures.mjs

echo "[3/10] unit suite (commitment, ledger, gate, attestation, wrapper, verifier)"
run_step 29 node --test tests/unit/llmShield/stage4l/*.test.js

echo "[4/10] committed deterministic artifacts match temp regeneration byte-for-byte"
BUNDLES="clean-under boundary-equal single-fat structuring singleton-evasion missing-assignment duplicate-assignment"
for b in $BUNDLES; do
  for f in events.json cluster-assignments.json cluster-budget-policy.json; do
    run_step 29 cmp "$FIX/bundles/$b/$f" "$T1/bundles/$b/$f"
  done
  for f in cluster-assignment-ledger.json cluster-cardinality.json ccb-attestation.json; do
    [ -f "$FIX/bundles/$b/$f" ] && run_step 29 cmp "$FIX/bundles/$b/$f" "$T1/bundles/$b/$f"
  done
done
run_step 29 cmp "$FIX/expected-results/cluster-matrix.json" "$T1/expected-results/cluster-matrix.json"

echo "[5/10] Q9 verdict matrix on committed bundles matches cluster-matrix.json"
for b in $BUNDLES; do
  EXPECTED="$(node -e 'const m=require("./"+process.argv[1]);console.log(m[process.argv[2]].raw)' "$FIX/expected-results/cluster-matrix.json" "$b")"
  OBSERVED="$(verify_raw "$FIX/bundles/$b" "$T1/$b-report.json")"
  if [ "$OBSERVED" != "$EXPECTED" ]; then
    echo "reproduce: $b verdict raw=$OBSERVED, expected $EXPECTED" >&2
    RAW="$OBSERVED"; exit_via_wrapper "$RAW"
  fi
done

echo "[6/10] F8 control: per-account budget PASSES on structuring, yet Q9 fails it (raw 41)"
run_step 29 node -e '
  const fs=require("fs");
  import("./tools/simurgh-attestation/stage4k/extractionBudgetGate.mjs").then(async (g)=>{
    const {buildLedger}=await import("./tools/simurgh-attestation/stage4k/extractionLedger.mjs");
    const events=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
    const policy=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
    const r=g.checkBudgets(buildLedger(events),policy);
    process.exit(r.ok?0:1);
  });
' "$FIX/bundles/structuring/events.json" "$FIX/bundles/structuring/account-budget-policy.json"
STRUCT_RAW="$(verify_raw "$FIX/bundles/structuring" "$T1/struct-q9.json")"
if [ "$STRUCT_RAW" -ne 41 ]; then
  echo "reproduce: structuring Q9 raw=$STRUCT_RAW, expected 41 (crown negative broken)" >&2
  RAW=29; exit_via_wrapper "$RAW"
fi

echo "[7/10] falsifier mutations (F5 commitment, F6 budget, F7 raw-id, F10 cardinality, sig-flip)"
falsifier() { # falsifier <name> <expected-raw> <file> <node-mutation>
  local name="$1" want="$2" file="$3" mut="$4"
  local d; d="$(mktemp -d)"; cp -R "$FIX/bundles/clean-under/." "$d/"
  run_step 29 node -e "$mut" "$d/$file"
  local got; got="$(verify_raw "$d" "$TW/$name.json")"
  rm -rf "$d"
  if [ "$got" != "$want" ]; then
    echo "reproduce: falsifier $name raw=$got, expected $want" >&2
    RAW=29; exit_via_wrapper "$RAW"
  fi
}
falsifier F5_commitment 42 cluster-assignments.json 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1]));j[0].cluster_commitment="sha256:"+"0".repeat(64);fs.writeFileSync(process.argv[1],JSON.stringify(j,null,2)+"\n")'
falsifier F6_budget 22 cluster-budget-policy.json 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1]));for(const k of Object.keys(j.budgets))j.budgets[k]=1;fs.writeFileSync(process.argv[1],JSON.stringify(j,null,2)+"\n")'
falsifier F7_rawid 42 cluster-assignments.json 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1]));j[0].email="smuggled@example.invalid";fs.writeFileSync(process.argv[1],JSON.stringify(j,null,2)+"\n")'
falsifier F10_cardinality 42 cluster-cardinality.json 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1]));j.histogram["1"]=999;fs.writeFileSync(process.argv[1],JSON.stringify(j,null,2)+"\n")'
falsifier SIG_flip 25 ccb-manifest.json 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1]));j.signature=j.signature.slice(0,-4)+"AAA=";fs.writeFileSync(process.argv[1],JSON.stringify(j,null,2)+"\n")'

echo "[8/10] Q8 replay unchanged (under=raw 0, over=raw 30)"
UNDER_RAW="$(set +e; node tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs --bundle "$K/bundles/under-budget" --pinned-pubkey "$K/eba-signer.pub" --out "$T1/k-under.json" >/dev/null 2>&1; set -e; report_raw "$T1/k-under.json")"
OVER_RAW="$(set +e; node tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs --bundle "$K/bundles/over-budget" --pinned-pubkey "$K/eba-signer.pub" --out "$T1/k-over.json" >/dev/null 2>&1; set -e; report_raw "$T1/k-over.json")"
if [ "$UNDER_RAW" -ne 0 ] || [ "$OVER_RAW" -ne 30 ]; then
  echo "reproduce: Q8 replay drifted (under=$UNDER_RAW over=$OVER_RAW) — 4L touched 4K" >&2
  RAW=29; exit_via_wrapper "$RAW"
fi

echo "[9/10] byte-stable golden: second temp build must equal the first"
run_step 29 env STAGE4L_FIXTURE_OUT="$T2" node tools/simurgh-attestation/stage4l/build-stage4l-fixtures.mjs
for b in $BUNDLES; do
  run_step 29 cmp "$T1/bundles/$b/cluster-assignments.json" "$T2/bundles/$b/cluster-assignments.json"
  [ -f "$T1/bundles/$b/cluster-cardinality.json" ] && run_step 29 cmp "$T1/bundles/$b/cluster-cardinality.json" "$T2/bundles/$b/cluster-cardinality.json"
done
run_step 29 cmp "$T1/expected-results/cluster-matrix.json" "$T2/expected-results/cluster-matrix.json"

echo "[10/10] clean tree (committed fixtures untouched by reproduce)"
run_step 29 git diff --exit-code -- "$FIX"

echo "stage4l reproduce: ALL GREEN"
exit_via_wrapper 0
