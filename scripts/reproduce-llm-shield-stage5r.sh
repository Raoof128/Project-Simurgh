#!/usr/bin/env bash
#
# Stage 5R — VPF: reproduce every deterministic artefact from the tree.
#
# WHAT A REVIEWER CAN AND CANNOT DO HERE. Everything below is reproducible by anyone with the
# repository and Node 26 — no key, no network, no account. What a reviewer CANNOT do is produce the
# signature, and that is the point: `--sign` needs a private half that is not in this repository and
# never will be. Someone who can rebuild every byte and verify the signature without being able to
# create one is exactly the reader this stage is built for.
#
# NODE 26 IS ASSERTED, NOT ASSUMED. The 4H digest builder is byte-stable only under Node 26, and a
# reproduce script that silently ran under another major would report a difference that is the
# runtime's rather than the evidence's.

set -euo pipefail

REQUIRED_NODE_MAJOR=26
ACTUAL_NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$ACTUAL_NODE_MAJOR" != "$REQUIRED_NODE_MAJOR" ]; then
  echo "FAIL: Node $REQUIRED_NODE_MAJOR is required; this is Node $ACTUAL_NODE_MAJOR"
  echo "      (Homebrew: /opt/homebrew/opt/node@26/bin)"
  exit 1
fi

step() { echo; echo "== $* =="; }

step "inheritance — the seven 5Q digests, roots first, signature last"
node tools/simurgh-attestation/stage5r/node/verifyInheritance.mjs

step "prior-stage non-disturbance"
node tools/simurgh-attestation/stage5r/node/verifyTransition.mjs --baseline 20fc323c

step "the control corpus, and its premise receipts rebuilt"
node tools/simurgh-attestation/stage5r/node/verifyFamilyCorpus.mjs

step "the instrument lock"
node tools/simurgh-attestation/stage5r/node/lockInstrument.mjs --verify

step "campaign commitment C1, and its ancestry over C2"
node tools/simurgh-attestation/stage5r/node/verifyCampaignCommitment.mjs
node tools/simurgh-attestation/stage5r/node/verifyCampaignAncestry.mjs

step "the Lean core"
bash scripts/check-stage5r-proofs.sh

step "cross-runtime parity"
node tools/simurgh-attestation/stage5r/node/checkManifestCoverage.mjs --runtime all
node tools/simurgh-attestation/stage5r/node/runCrossRuntimeParity.mjs

step "deterministic artefacts, built twice and compared"
for pair in \
  "buildPremiseReceipts:docs/research/llm-shield/evidence/stage-5r/families/premise-receipts.json" \
  "buildDeltaLedger:docs/research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json" \
  "buildFindingLedger:docs/research/llm-shield/evidence/stage-5r/ledgers/finding-ledger.json" \
  "auditPriorFamilies:docs/research/llm-shield/evidence/stage-5r/audit/prior-families.json"; do
  driver="${pair%%:*}"
  committed="${pair#*:}"
  a="$(mktemp)"
  b="$(mktemp)"
  node "tools/simurgh-attestation/stage5r/node/${driver}.mjs" --output "$a" >/dev/null
  node "tools/simurgh-attestation/stage5r/node/${driver}.mjs" --output "$b" >/dev/null
  cmp "$a" "$b"
  cmp "$a" "$committed"
  rm -f "$a" "$b"
  echo "  ${driver}: built twice, byte-identical, matches the committed copy"
done

step "the campaign attestation — built twice, then verified with NO private key"
a="$(mktemp)"
b="$(mktemp)"
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --build-only --output "$a" >/dev/null
node tools/simurgh-attestation/stage5r/node/attestStage5r.mjs --build-only --output "$b" >/dev/null
cmp "$a" "$b"
rm -f "$a" "$b"
node tools/simurgh-attestation/stage5r/node/verifyAttestation.mjs

step "unit tests"
node --test tests/unit/llmShield/stage5r/*.test.js >/dev/null && echo "  green"

step "the inherited 5Q tree is untouched"
if [ -n "$(git status --porcelain docs/research/llm-shield/evidence/stage-5q/)" ]; then
  echo "FAIL: the inherited 5Q evidence tree was modified"
  exit 1
fi
echo "  clean"

echo
echo "OK: Stage 5R reproduced."
