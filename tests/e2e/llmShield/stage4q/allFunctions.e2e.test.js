// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q K7 all-functions E2E net (4Q spec §4.2). Composes every stage4q export, freezes
// the export inventory, replays the full tamper matrix, proves byte-idempotency, and checks
// cross-stage invariants (released 4P evidence still verifies; shared ledger carries 80-89).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REPO = process.cwd();

// 1 — FROZEN EXPORT INVENTORY (catches dead-code theatre + accidental surface growth).
const EXPORT_INVENTORY = {
  "tools/simurgh-attestation/stage4q/constants.mjs": [
    "CHAIN_ENTRY_KEYS",
    "CROSSING_KEYS",
    "DOMAINS",
    "ENUMS",
    "EXEMPTION_KEYS",
    "GENESIS",
    "KERNEL_ENTRYPOINT_V1",
    "MAX_WINDOW_STRADDLE",
    "POLICY_ENVELOPE_KEYS",
    "RECEIPT_KEYS",
    "SCHEMAS",
    "VFR_NON_CLAIMS",
  ],
  "tools/simurgh-attestation/stage4q/core/digest.mjs": [
    "approvalExemptionDigest",
    "approvalReceiptDigest",
    "censusCommitment",
    "chainEntryDigest",
    "chainEntryReplayDigest",
    "chainRootDigest",
    "crossingDigest",
    "displayDigest",
    "domainDigest",
    "publicKeyDigest",
  ],
  "tools/simurgh-attestation/stage4q/core/schemaCore.mjs": [
    "validateChainEntry",
    "validateCrossing",
    "validateEnvelope",
    "validateExemption",
    "validateReceipt",
  ],
  "tools/simurgh-attestation/stage4q/core/chainCore.mjs": [
    "buildChain",
    "positionsOf",
    "verifyChain",
  ],
  "tools/simurgh-attestation/stage4q/core/pincerCore.mjs": ["decide"],
  "tools/simurgh-attestation/stage4q/core/inventionCore.mjs": [
    "constitutionProjectionDigest",
    "reviewerNoteDigest",
    "sourceMapDigest",
    "validateConstitutionProjection",
    "validateReviewerNote",
    "validateSourceMap",
  ],
  "tools/simurgh-attestation/stage4q/node/build-stage4q-fixtures.mjs": [
    "buildCorpus",
    "replayCorpus",
  ],
  "tools/simurgh-attestation/stage4q/node/laneb-approval-capture.mjs": ["replayCapture"],
  "tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs": [
    "recomputeBundleDigest",
    "verifyBundle",
    "verifyByoApprover",
  ],
  "tools/simurgh-attestation/stage4q/node/build-stage4q-attestation.mjs": [
    "buildBody0",
    "bundleDigestOf",
  ],
};

test("frozen export inventory: no unlisted or missing exports across stage4q modules", async () => {
  for (const [path, frozen] of Object.entries(EXPORT_INVENTORY)) {
    const mod = await import(`../../../../${path}`);
    assert.deepEqual(Object.keys(mod).sort(), [...frozen].sort(), path);
  }
});

// 2 — COMPOSED TAMPER MATRIX: the committed Lane A corpus is the frozen tamper matrix
// (GREEN + refusal-GREEN + exempt-GREEN + every raw code 80-89 + both exemption reasons).
test("composed pipeline replays Lane A + Lane B to their committed decisions", async () => {
  const { replayCorpus } =
    await import("../../../../tools/simurgh-attestation/stage4q/node/build-stage4q-fixtures.mjs");
  const { replayCapture } =
    await import("../../../../tools/simurgh-attestation/stage4q/node/laneb-approval-capture.mjs");
  const corpus = JSON.parse(
    readFileSync("tests/fixtures/llmShield/stage4q/lane-a/corpus.json", "utf8")
  );
  const expA = JSON.parse(
    readFileSync("tests/fixtures/llmShield/stage4q/lane-a/expected-decisions.json", "utf8")
  );
  const capture = JSON.parse(
    readFileSync("tests/fixtures/llmShield/stage4q/lane-b/capture.json", "utf8")
  );
  const expB = JSON.parse(
    readFileSync("tests/fixtures/llmShield/stage4q/lane-b/expected-arms.json", "utf8")
  );
  assert.deepEqual(replayCorpus(corpus), expA);
  assert.deepEqual(replayCapture(capture), expB);
  // check-order masking: a mutant with BOTH a missing receipt AND a bad signature surfaces 83.
  const { decide } =
    await import("../../../../tools/simurgh-attestation/stage4q/core/pincerCore.mjs");
  const g = corpus.cases.find((c) => c.case_id === "green_pincer_complete");
  const out = decide({
    envelope: g.envelope,
    receipt: null,
    exemption: null,
    crossing: g.crossing,
    chainEntries: [],
    chainVerdict: { raw: 0 },
    verifySignature: () => false,
    displayExpected: g.display_expected,
  });
  assert.equal(out.raw, 83); // 83 masks 81
});

// 3 — BYTE-IDEMPOTENCY: rebuild fixtures + Lane B capture twice; committed tree unchanged.
test("byte-idempotency: fixture builder and Lane B capture reproduce exactly", () => {
  execFileSync("node", ["tools/simurgh-attestation/stage4q/node/build-stage4q-fixtures.mjs"]);
  execFileSync("node", ["tools/simurgh-attestation/stage4q/node/laneb-approval-capture.mjs"]);
  const out = execFileSync("git", [
    "status",
    "--porcelain",
    "--",
    "tests/fixtures/llmShield/stage4q",
  ]);
  assert.equal(out.toString().trim(), "");
});

// 4 — CROSS-STAGE INVARIANTS.
test("cross-stage invariants: shared ledger carries 80-89; released 4P evidence still verifies", async () => {
  const { VFR_CHECK_ORDER, stage4CodeForRawCode } =
    await import("../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs");
  assert.deepEqual(VFR_CHECK_ORDER, [80, 83, 81, 82, 89, 86, 84, 85, 87, 88]);
  for (let c = 80; c <= 89; c += 1) assert.equal(stage4CodeForRawCode(c), 1);
  assert.equal(stage4CodeForRawCode(100), 3);
  // Released 4P offline verifier still passes against the released 4P evidence (unchanged).
  execFileSync("node", [
    "tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs",
    "--offline",
    "docs/research/llm-shield/evidence/stage-4p/voca-attestation.json",
  ]);
});

// 5 — ATTESTATION full verify (both tiers) over committed evidence.
test("committed 4Q attestation verifies end-to-end (both tiers)", () => {
  execFileSync("node", [
    "tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs",
    "docs/research/llm-shield/evidence/stage-4q/vfr-attestation.json",
  ]);
});
