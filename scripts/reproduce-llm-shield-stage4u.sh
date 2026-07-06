#!/usr/bin/env bash
# Stage 4U / VRTA one-command reproduce (4U spec §10). Verify-only for Lane B:
# the committed ceremony capture (if any) is re-verified, never regenerated
# (Lane B uses ephemeral live-model output, not byte-stable). The Lane A corpus +
# attestation are deterministic pure functions of the committed fixture keys,
# rebuilt and byte-compared. No network, no wall clock. Motto: AnthropicSafe First,
# then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

EVID="docs/research/llm-shield/evidence/stage-4u"
S4U="tools/simurgh-attestation/stage4u"
KD="tests/fixtures/llmShield/stage4u/test-keys"
fail() {
  echo "[stage4u] FAIL: $1" >&2
  exit 1
}

echo "[stage4u] [1/9] rebuild Lane A corpus to a temp dir and byte-compare"
TMP="$(mktemp -d)"
node -e "import('./$S4U/node/build-stage4u-corpus.mjs').then(async m => {
  const { canonicalJson } = await import('./tools/simurgh-attestation/stage4m/core/canonical.mjs');
  const fs = await import('node:fs');
  const { bundle } = m.buildCorpus({ write: false });
  fs.writeFileSync('$TMP/bundle.json', canonicalJson(bundle) + '\n');
})" || fail "corpus rebuild"
cmp "$TMP/bundle.json" "$EVID/fixtures/bundle.json" || fail "corpus not byte-stable"

echo "[stage4u] [2/9] verify attestation — PUBLIC tier"
node "$S4U/node/verify-stage4u-attestation.mjs" --tier public \
  --pubkey "$KD/INSECURE_FIXTURE_ONLY_vrta.pub.pem" \
  --charter-pubkey "$KD/INSECURE_FIXTURE_ONLY_vrta-charter.pub.pem" \
  --finding-pubkey "$KD/INSECURE_FIXTURE_ONLY_vrta.pub.pem" || fail "public verify"

echo "[stage4u] [3/9] verify attestation — AUDIT tier (engine re-run)"
node "$S4U/node/verify-stage4u-attestation.mjs" --tier audit \
  --pubkey "$KD/INSECURE_FIXTURE_ONLY_vrta.pub.pem" \
  --charter-pubkey "$KD/INSECURE_FIXTURE_ONLY_vrta-charter.pub.pem" \
  --finding-pubkey "$KD/INSECURE_FIXTURE_ONLY_vrta.pub.pem" || fail "audit verify"

echo "[stage4u] [4/9] recompute ASR ledger and compare to the committed corpus index"
node -e "import('./$S4U/node/build-stage4u-corpus.mjs').then(async m => {
  const fs = await import('node:fs');
  const { bundle } = m.buildCorpus({ write: false });
  const idx = JSON.parse(fs.readFileSync('$EVID/fixtures/corpus-index.json','utf8'));
  const a = JSON.stringify(bundle.asr), b = JSON.stringify(idx.attack_success_rate);
  if (a !== b) { console.error('ASR mismatch', a, b); process.exit(1); }
})" || fail "asr ledger recompute"

echo "[stage4u] [5/9] JS<->Python parity"
python3 "$S4U/python/vrta_parity.py" > "$TMP/py.json" || fail "python parity run"
node -e "import('./$S4U/node/build-stage4u-corpus.mjs').then(async m => {
  const fs = await import('node:fs');
  const { recomputeAsr } = await import('./$S4U/core/findingLedger.mjs');
  const { bundle } = m.buildCorpus({ write: false });
  const js = recomputeAsr(bundle.finding_records).attack_success_rate;
  const py = JSON.parse(fs.readFileSync('$TMP/py.json','utf8'));
  if (JSON.stringify(py.attack_success_rate) !== JSON.stringify(js)) process.exit(1);
})" || fail "python parity mismatch"

echo "[stage4u] [6/9] Lane B verify-only replay (no live model call)"
node -e "import('./$S4U/laneb/run-laneb-vrta.mjs').then(m => {
  const r = m.runVrtaLaneB({ live: false });
  process.exit(r.raw === 0 ? 0 : 1);
})" || fail "lane b replay"

echo "[stage4u] [7/9] epoch-tamper the attestation MUST fail closed (non-zero)"
node -e "import('./$S4U/node/verify-stage4u-attestation.mjs').then(async m => {
  const fs = await import('node:fs');
  const att = JSON.parse(fs.readFileSync('$EVID/attestation/vrta-attestation.json','utf8'));
  att.epoch = 'TAMPERED';
  const pub = fs.readFileSync('$KD/INSECURE_FIXTURE_ONLY_vrta.pub.pem','utf8');
  const cpub = fs.readFileSync('$KD/INSECURE_FIXTURE_ONLY_vrta-charter.pub.pem','utf8');
  const r = m.verifyAttestation(att, { tier: 'public', attestationPubKeyPem: pub, charterPubKeyPem: cpub, findingPubKeyPem: pub });
  process.exit(r.raw !== 0 ? 0 : 1);
})" || fail "epoch tamper not caught"

echo "[stage4u] [8/9] Lean proof (guarded — skipped if 'lean' absent)"
if command -v lean >/dev/null 2>&1; then
  lean proofs/stage4u/NoSilentBypass.lean || fail "lean proof"
else
  echo "[stage4u] lean not installed — skipping proof step"
fi

echo "[stage4u] [9/9] REPRODUCE OK"
rm -rf "$TMP"
