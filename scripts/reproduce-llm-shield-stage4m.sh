#!/usr/bin/env bash
# Stage 4M / VXD one-command reproduce (spec §5 / plan Task 12). Final exit ALWAYS routed
# through stage4CodeForRawCode — never a bare exit 1.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4m"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'

exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "reproduce: step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}
report_raw() { # report_raw <report-path> -> prints rawCode or 29
  node -e 'const fs=require("fs"); try { console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).rawCode ?? 29) } catch { console.log(29) }' "$1"
}
verify_raw() { # verify_raw <bundle-dir> <report-path> [tier] -> prints observed raw (fail-closed 29)
  local tier="${3:-a}"
  set +e
  node tools/simurgh-attestation/stage4m/node/verify-stage4m.mjs \
    --bundle "$1" --pinned-pubkey "$FIX/vxd-signer.pub" --tier "$tier" --out "$2" >/dev/null 2>&1
  set -e
  report_raw "$2"
}

echo "[1/12] env + node major >= 26"
run_step 28 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[2/12] regenerate 4M fixtures into temp (never committed paths)"
T1="$(mktemp -d)"
T2="$(mktemp -d)"
trap 'rm -rf "$T1" "$T2"' EXIT
run_step 29 env STAGE4M_FIXTURE_OUT="$T1" node tools/simurgh-attestation/stage4m/node/build-stage4m-fixtures.mjs

echo "[3/12] unit suite (all stage4m modules)"
run_step 29 node --test tests/unit/llmShield/stage4m/*.test.js

echo "[4/12] committed deterministic artifacts match temp regeneration byte-for-byte"
BUNDLES="$(node -e 'const m=require("./"+process.argv[1]);console.log(Object.keys(m).join(" "))' "$FIX/expected-results/vxd-matrix.json")"
for b in $BUNDLES; do
  for f in windows.json merge-events.json rescore-records.json disclosure.json respondent-clusters.json; do
    if [ -f "$FIX/bundles/$b/$f" ]; then run_step 29 cmp "$FIX/bundles/$b/$f" "$T1/bundles/$b/$f"; fi
  done
done
run_step 29 cmp "$FIX/expected-results/vxd-matrix.json" "$T1/expected-results/vxd-matrix.json"

echo "[5/12] verdict matrix on committed bundles matches vxd-matrix.json"
for b in $BUNDLES; do
  EXPECTED="$(node -e 'const m=require("./"+process.argv[1]);console.log(m[process.argv[2]].raw)' "$FIX/expected-results/vxd-matrix.json" "$b")"
  OBSERVED="$(verify_raw "$FIX/bundles/$b" "$T1/$b-report.json")"
  if [ "$OBSERVED" != "$EXPECTED" ]; then
    echo "reproduce: $b verdict raw=$OBSERVED, expected $EXPECTED" >&2
    RAW="$OBSERVED"
    exit_via_wrapper "$RAW"
  fi
done

echo "[6/12] V13/V14 tamper arms over a clean-chain copy"
TC="$T1/tamper-clean"
mkdir -p "$TC"
cp -R "$FIX/bundles/clean-chain/." "$TC/"
# V13: recompute projection from committed attestation+disclosure; a tampered copy must differ
run_step 29 node -e '
  const fs=require("fs");
  import("./tools/simurgh-attestation/stage4m/node/article73Projection.mjs").then(({buildArticle73Projection})=>{
    const dir=process.argv[1];
    const att=JSON.parse(fs.readFileSync(dir+"/vxd-attestation.json"));
    const disc=JSON.parse(fs.readFileSync(dir+"/disclosure.json"));
    const fresh=buildArticle73Projection({attestation:att,disclosure:disc});
    const committed=JSON.parse(fs.readFileSync(dir+"/article73-projection.json"));
    if(JSON.stringify(fresh)!==JSON.stringify(committed)){process.exit(1)}  // committed must match recompute
    const tampered={...committed, corrective_context:"tampered"};
    if(JSON.stringify(fresh)===JSON.stringify(tampered)){process.exit(1)}   // tamper must differ
    process.exit(0);
  }).catch(()=>process.exit(1));
' "$TC"
# V14: flip one byte of a signed merge event in a copy -> verify must be nonzero
TV="$T1/tamper-merge"
mkdir -p "$TV"
cp -R "$FIX/bundles/clean-chain/." "$TV/"
node -e 'const fs=require("fs");const p=process.argv[1]+"/merge-events.json";const j=JSON.parse(fs.readFileSync(p));j[0].new_budget=999;fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n")' "$TV"
OBS="$(verify_raw "$TV" "$T1/tamper-merge-report.json")"
if [ "$OBS" = "0" ]; then echo "reproduce: V14 tamper still verified clean" >&2; RAW=29; exit_via_wrapper 29; fi

echo "[7/12] V19 tier-P: ledger files absent -> raw 0"
TP="$T1/tier-p"
mkdir -p "$TP"
cp -R "$FIX/bundles/clean-chain/." "$TP/"
rm -f "$TP/windows.json" "$TP/merge-events.json" "$TP/rescore-records.json"
OBS="$(verify_raw "$TP" "$T1/tier-p-report.json" p)"
if [ "$OBS" != "0" ]; then echo "reproduce: V19 tier-P raw=$OBS" >&2; RAW="$OBS"; exit_via_wrapper "$OBS"; fi

echo "[8/12] V20 tier equivocation: tampered attestation root -> raw 22"
TE="$T1/tier-eq"
mkdir -p "$TE"
cp -R "$FIX/bundles/clean-chain/." "$TE/"
node -e 'const fs=require("fs");const p=process.argv[1]+"/vxd-attestation.json";const j=JSON.parse(fs.readFileSync(p));j.windows_root="sha256:"+"0".repeat(64);fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n")' "$TE"
OBS="$(verify_raw "$TE" "$T1/tier-eq-report.json")"
if [ "$OBS" != "22" ]; then echo "reproduce: V20 raw=$OBS expected 22" >&2; RAW="$OBS"; exit_via_wrapper "$OBS"; fi

echo "[9/12] V21 no consumer-level identifiers anywhere under the fixtures"
run_step 29 node -e '
  const fs=require("fs");const path=require("path");
  const root=process.argv[1];
  const banned=["consumer_id_digest","session_id","email","account_id","user_id","device_id","org_name","phone","address","plaintext"];
  const walk=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
    if(e.isDirectory())walk(p);else{const t=fs.readFileSync(p,"utf8");for(const b of banned){if(t.includes("\""+b+"\"")){console.error("leak "+b+" in "+p);process.exit(1)}}}}};
  walk(root);process.exit(0);
' "$FIX"

echo "[10/12] cross-stage invariants: 4L clean-under still raw 0; zero src/llmShield diff"
set +e
node tools/simurgh-attestation/stage4l/verify-stage4l.mjs \
  --bundle tests/fixtures/llmShield/stage4l/bundles/clean-under \
  --pinned-pubkey tests/fixtures/llmShield/stage4l/ccb-signer.pub \
  --out "$T1/l-report.json" >/dev/null 2>&1
set -e
L_RAW="$(report_raw "$T1/l-report.json")"
if [ "$L_RAW" != "0" ]; then echo "reproduce: 4L clean-under raw=$L_RAW" >&2; RAW=29; exit_via_wrapper 29; fi
run_step 29 git diff --quiet HEAD -- src/llmShield

echo "[11/12] byte-stability: second regeneration matches T1 on deterministic files"
run_step 29 env STAGE4M_FIXTURE_OUT="$T2" node tools/simurgh-attestation/stage4m/node/build-stage4m-fixtures.mjs
for b in $BUNDLES; do
  for f in windows.json merge-events.json rescore-records.json disclosure.json respondent-clusters.json; do
    if [ -f "$T1/bundles/$b/$f" ]; then run_step 29 cmp "$T1/bundles/$b/$f" "$T2/bundles/$b/$f"; fi
  done
done

echo "[12/12] clean tree (no committed fixtures drifted)"
run_step 29 git diff --quiet -- "$FIX"

echo "stage4m reproduce: ALL GREEN"
exit_via_wrapper 0
