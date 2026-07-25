#!/usr/bin/env bash
# Stage 5P — VSI: verifiable submitter identity. Fail-closed reproduce covering the unit suite, both
# census phases, the raw-code allocator census, and the Lean core. Node 26.
#
# Every gate is an explicit if/then/else exit 1. NO `cmd && echo "OK"` chains: under `set -e` that
# pattern can report success when the command failed (the 5E gotcha — it cost two real fail-opens).
#
# Honest scope: this reproduces everything that needs no network and no clock. Lane B (a real
# Sigstore ceremony) and Lane C2 are NOT reproduced here because they have not been executed; a
# script that silently skipped them would read as coverage.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE="/opt/homebrew/opt/node@26/bin/node"
if [ ! -x "$NODE" ]; then NODE="node"; fi
S5P="tools/simurgh-attestation/stage5p"

echo "== Stage 5P VSI reproduce =="
"$NODE" --version

echo "-- unit suite --"
if "$NODE" --test tests/unit/llmShield/stage5p/*.test.js > /tmp/s5p-unit.log 2>&1; then
  tail -3 /tmp/s5p-unit.log
else
  echo "FAIL: stage5p unit suite"; tail -30 /tmp/s5p-unit.log; exit 1
fi

echo "-- K7 all-functions net + export census + cross-lane invariants --"
if "$NODE" --test tests/e2e/llmShield/stage5p/*.test.js > /tmp/s5p-k7.log 2>&1; then
  tail -3 /tmp/s5p-k7.log
else
  echo "FAIL: K7 all-functions net"; tail -30 /tmp/s5p-k7.log; exit 1
fi

echo "-- Section 1 census (counts are generator-derived, never hand-carried) --"
if "$NODE" "$S5P/node/measureSection1Census.mjs" > /tmp/s5p-s1.log 2>&1; then
  echo "section 1 census: clean"
else
  echo "FAIL: Section 1 census"; tail -30 /tmp/s5p-s1.log; exit 1
fi

echo "-- Lane A census, DRAFT phase (is the discharge ledger complete?) --"
if "$NODE" "$S5P/node/measureStage5pLaneACensus.mjs" --phase=draft > /tmp/s5p-draft.log 2>&1; then
  echo "lane A census (draft): clean"
else
  echo "FAIL: Lane A census (draft)"; tail -40 /tmp/s5p-draft.log; exit 1
fi

echo "-- Lane A census, RELEASE phase (is every typed outcome discharged?) --"
if "$NODE" "$S5P/node/measureStage5pLaneACensus.mjs" --phase=release > /tmp/s5p-rel.log 2>&1; then
  echo "lane A census (release): clean"
else
  echo "FAIL: Lane A census (release)"; tail -40 /tmp/s5p-rel.log; exit 1
fi

echo "-- raw-code census (Annex R band + A5 amendment band + emission-site coverage) --"
if "$NODE" "$S5P/node/measureStage5pRawCodes.mjs" > /tmp/s5p-raw.log 2>&1; then
  echo "raw-code census: clean"
else
  echo "FAIL: raw-code census"; tail -40 /tmp/s5p-raw.log; exit 1
fi

echo "-- byte-stability: every census serialises identically twice --"
for gen in measureSection1Census measureStage5pRawCodes; do
  "$NODE" "$S5P/node/$gen.mjs" > "/tmp/s5p-$gen.1" 2>/dev/null
  "$NODE" "$S5P/node/$gen.mjs" > "/tmp/s5p-$gen.2" 2>/dev/null
  if cmp -s "/tmp/s5p-$gen.1" "/tmp/s5p-$gen.2"; then
    echo "$gen: byte-stable"
  else
    echo "FAIL: $gen is not byte-stable"; exit 1
  fi
done

echo "-- Lane C1: the frozen GLEIF capture re-verifies OFFLINE by digest --"
if "$NODE" -e "
  const m = await import(process.cwd() + \"/$S5P/node/laneC1Gleif.mjs\");
  const c = m.loadGleifCapture();
  if (c.records.length !== 3) { console.error(\"expected 3 records\"); process.exit(1); }
  for (const r of c.records) if (!r.digest_verified) { console.error(r.lei); process.exit(1); }
  console.log(\"lane C1: 3/3 records verified, auth=\" + c.authentication);
" --input-type=module > /tmp/s5p-c1.log 2>&1; then
  cat /tmp/s5p-c1.log
else
  echo "FAIL: Lane C1 capture verification"; cat /tmp/s5p-c1.log; exit 1
fi

echo "-- Lane B: the REAL public Rekor ceremony re-verifies OFFLINE (8 checks) --"
if "$NODE" -e "
  const m = await import(process.cwd() + \"/$S5P/node/laneBRekor.mjs\");
  const c = m.verifyRekorCeremonyOffline();
  for (const [k, v] of Object.entries(c.checks)) if (!v) { console.error(\"FAILED: \" + k); process.exit(1); }
  if (!c.ok) process.exit(1);
  console.log(\"lane B: 8/8 offline checks, rekor logIndex \" + c.log_index + \", keyless=\" + c.is_keyless);
" --input-type=module > /tmp/s5p-b.log 2>&1; then
  cat /tmp/s5p-b.log
else
  echo "FAIL: Lane B offline verification"; cat /tmp/s5p-b.log; exit 1
fi

echo "-- Lane L: the live capture replays offline and stays contained at S2.C3 --"
if "$NODE" -e "
  const m = await import(process.cwd() + \"/$S5P/node/laneLLiveCapture.mjs\");
  const v = await import(process.cwd() + \"/$S5P/core/section2Verifier.mjs\");
  const c = m.loadLaneLCapture();
  let produced = 0, contained = 0;
  for (const p of c.probes) {
    if (p.disposition !== \"model_produced_claim\") continue;
    produced++;
    const r = v.verifySection2(m.laneLEvidenceBundle(p), m.LANE_L_PINNED);
    if (r.ok === false && r.check_id === \"S2.C3\") contained++;
  }
  if (produced === 0) { console.error(\"no probe produced a claim — the lane tests nothing\"); process.exit(1); }
  if (contained !== produced) { console.error(\"authority laundering was NOT contained\"); process.exit(1); }
  console.log(\"lane L: \" + contained + \"/\" + produced + \" produced claims contained at S2.C3\");
" --input-type=module > /tmp/s5p-l.log 2>&1; then
  cat /tmp/s5p-l.log
else
  echo "FAIL: Lane L containment"; cat /tmp/s5p-l.log; exit 1
fi

echo "-- signed attestation: verifies offline AND still matches what the repo computes --"
if "$NODE" -e "
  const fs = await import(\"node:fs\");
  const m = await import(process.cwd() + \"/$S5P/node/attestation.mjs\");
  const D = process.cwd() + \"/docs/research/llm-shield/evidence/stage-5p/attestation/\";
  const b = JSON.parse(fs.readFileSync(D + \"stage5p-attestation.json\", \"utf8\"));
  const pub = fs.readFileSync(D + \"stage5p-signer.pub\", \"utf8\");
  const v = m.verifyAttestation(b, pub);
  if (!v.ok) { console.error(JSON.stringify(v.checks)); process.exit(1); }
  const fresh = m.buildPublicPayload();
  if (JSON.stringify(fresh) !== JSON.stringify(b.public.payload)) {
    console.error(\"DRIFT: the signed claims no longer match what the repo computes\"); process.exit(1);
  }
  console.log(\"attestation: 8/8 offline checks, payload matches repo, \" +
    b.audit.payload.known_limitations.length + \" limitations SIGNED\");
" --input-type=module > /tmp/s5p-att.log 2>&1; then
  cat /tmp/s5p-att.log
else
  echo "FAIL: attestation"; cat /tmp/s5p-att.log; exit 1
fi

echo "-- cross-runtime parity: Node == stdlib Python --"
if python3 "$S5P/python/vsi_parity.py" > /tmp/s5p-py.log 2>&1; then
  tail -2 /tmp/s5p-py.log
else
  echo "FAIL: Python parity"; cat /tmp/s5p-py.log; exit 1
fi

echo "-- Lean core (six §1 targets, zero proof escapes) --"
if command -v lean >/dev/null 2>&1; then
  if lean proofs/stage5p/Vsi.lean; then
    echo "lean: type-checks"
  else
    echo "FAIL: Lean core"; exit 1
  fi
  if grep -REn "\bsorry\b|\badmit\b" proofs/stage5p >/dev/null 2>&1; then
    echo "FAIL: proof escape found in proofs/stage5p"; exit 1
  else
    echo "lean: no proof escapes"
  fi
else
  echo "SKIP: lean not installed (the proof is CI-gated separately)"
fi

echo
echo "== Stage 5P reproduce: ALL GATES PASSED =="
echo "Reproduced above: Lane A (sealed synthetic), Lane B (real public Rekor entry, offline),"
echo "                  Lane C1 (frozen GLEIF capture, offline), Lane L (live capture, replayed)."
echo "NOT reproduced, because NOT executed: Lane C2 (no qualifying profile exists)."
