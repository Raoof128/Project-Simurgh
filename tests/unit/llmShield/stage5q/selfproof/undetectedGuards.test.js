// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — SELF-PROOF DETECTOR PACKS for R2, R5, R6, R7 and R15.
// Pack ids: 5q-sp-r2-01 · 5q-sp-r5-01 · 5q-sp-r6-01 · 5q-sp-r7-01 · 5q-sp-r15-01
//
// EVERY TEST HERE EXISTS BECAUSE A SEEDED FAULT SURVIVED THE TARGET STAGE'S OWN UNIT SUITE.
//
// The first full 16-mutant run discharged 11 classes and left five mutants undetected — five real
// guards, in five separately shipped stages, that no test was watching:
//
//   M2  (R2)   5O digestTokenCodec · decodeDigestToken   the lexical grammar gate
//   M5  (R5)   5G anchorBinding · checkAnchorBinding     the empty-allowlist guard
//   M6  (R6)   5M crossSeat · checkCrossSeat             the ORDER of two adjacent checks
//   M7  (R7)   5F census · checkCensus                   the dropped-cell rejection
//   M15 (R15)  5E detector · checkDetectorPinned         the pinned-provenance guard
//
// Each was deleted or reordered and every one of those stages stayed green.
//
// The plan's rule is followed exactly: STRENGTHEN THE PACK, NEVER WEAKEN THE MUTANT. Not one mutant
// was touched. These detectors were written to see faults that were already invisible, and they are
// 5Q-owned rather than added to the target stages, because the mutation lane must not inherit the
// coverage gaps of the suites it is measuring.
//
// Each pack asserts BOTH directions. A detector that only ever refuses cannot distinguish a working
// guard from a broken function, and would discharge its class while proving nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeDigestToken } from "../../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import { checkAnchorBinding } from "../../../../../tools/simurgh-attestation/stage5g/core/anchorBinding.mjs";
import { checkCrossSeat } from "../../../../../tools/simurgh-attestation/stage5m/core/crossSeat.mjs";
import { checkCensus } from "../../../../../tools/simurgh-attestation/stage5f/core/census.mjs";
import { sha256Canon } from "../../../../../tools/simurgh-attestation/stage5f/core/digests.mjs";
import { checkDetectorPinned } from "../../../../../tools/simurgh-attestation/stage5e/core/detector.mjs";
import { VDA_DETECTOR } from "../../../../../tools/simurgh-attestation/stage5e/constants.mjs";

// ---------------------------------------------------------------------------------------------
// 5q-sp-r2-01 — lexical laundering (M2)
// ---------------------------------------------------------------------------------------------

test("R2: a token violating the digest-token grammar is refused BY NAME", () => {
  // M2 deletes the grammar gate. Without it, a malformed token falls through to `m[1]` and dies
  // with a TypeError about indexing null — which is still an error, but it is not a REFUSAL, and a
  // caller distinguishing "rejected" from "crashed" would be told the wrong thing.
  assert.throws(
    () => decodeDigestToken("not-a-digest-token"),
    (error) => {
      assert.match(
        String(error.message),
        /digest_token_grammar_violation/,
        "the lexical gate must name itself; a TypeError from downstream indexing is a crash, not a gate"
      );
      return true;
    }
  );
});

test("R2: a WELL-FORMED token still decodes — the gate is not a blanket refusal", () => {
  // The grammar is BARE 64-hex, not a `sha256:`-prefixed token. The first draft of this fixture
  // assumed the prefixed form and went red against clean source — which is the non-blanket
  // assertion doing its job on its author.
  assert.doesNotThrow(() => decodeDigestToken("a".repeat(64)));
});

// ---------------------------------------------------------------------------------------------
// 5q-sp-r5-01 — unconfigured trust root (M5)
// ---------------------------------------------------------------------------------------------

test("R5: anchor evidence with an EMPTY trust-root allowlist is refused", () => {
  // M5 weakens `length === 0` to `length < 0`, which is never true, so the guard becomes
  // unreachable and an anchor is accepted with no configured trust root at all.
  const result = checkAnchorBinding(
    { anchor_evidence: { present: true } },
    { trustRootAllowlist: [], kernelResult: {} }
  );
  assert.notEqual(
    result,
    null,
    "an empty allowlist means nothing is trusted; accepting the anchor would be trusting by default"
  );
});

test("R5: absent anchor evidence is still presence-driven and returns null", () => {
  // The guard must not become a blanket refusal: 5G's contract is that no anchor evidence means no
  // anchor check, and a detector that ignored that would fire on every ordinary bundle.
  assert.equal(checkAnchorBinding({}, { trustRootAllowlist: [], kernelResult: {} }), null);
});

// ---------------------------------------------------------------------------------------------
// 5q-sp-r6-01 — first-failure shadowing (M6)
// ---------------------------------------------------------------------------------------------

test("R6: when TWO checks would fail, the EARLIER one reports", () => {
  // M6 swaps two adjacent checks. Both orderings return a failure, so any test asserting only
  // "this fails" stays green while the reported reason silently changes — and a raw code paired
  // with the wrong reason is a misreport that reads as a correct rejection.
  const bothWrong = {
    anchor_decoded: "WRONG-ANCHOR",
    tsa_imprint: "WRONG-IMPRINT",
    ots_leaf: "commitment",
    commitment: "commitment",
    seat_present: false,
  };
  const result = checkCrossSeat(bothWrong);
  assert.equal(
    result?.reason ?? result?.detail ?? JSON.stringify(result),
    "anchor_not_commitment",
    "the anchor check precedes the TSA imprint check; first failure wins, and which one reported " +
      "is the whole content of R6"
  );
});

test("R6: agreeing facts pass, so the ordering test is not asserting blanket failure", () => {
  const allAgree = {
    anchor_decoded: "commitment",
    tsa_imprint: "commitment",
    ots_leaf: "commitment",
    commitment: "commitment",
    seat_present: false,
  };
  assert.equal(checkCrossSeat(allAgree), null);
});

// ---------------------------------------------------------------------------------------------
// 5q-sp-r7-01 — dropped census cell (M7)
// ---------------------------------------------------------------------------------------------

/** A census where every public cell has a terminal record. */
function census({ cellIds, recordIds }) {
  const auditPrivate = {
    records: recordIds.map((record_id) => ({
      record_id,
      status: "captured",
      attempt_id: `attempt-${record_id}`,
    })),
  };
  return {
    auditPrivate,
    bundle: {
      cells: cellIds.map((record_id) => ({ record_id, status: "captured" })),
      capture_provenance: { capture_log_digest: sha256Canon(auditPrivate) },
    },
  };
}

test("R7: a cell with NO terminal record is refused — the dropped-cell rejection", () => {
  // M7 deletes exactly this loop. Without it a census reports complete while one public cell
  // resolves to nothing: a completeness claim over N that only covers N-1, which is the precise
  // shape of R7 and the precise shape this whole stage exists to catch.
  const { bundle, auditPrivate } = census({
    cellIds: ["r1", "r2"],
    recordIds: ["r1", "r2"],
  });
  // Swap one cell id for one nothing records — same cardinality, so the length check cannot catch it.
  const dropped = {
    ...bundle,
    cells: [
      { record_id: "r1", status: "captured" },
      { record_id: "GHOST", status: "captured" },
    ],
  };
  assert.equal(
    checkCensus(dropped, auditPrivate),
    280,
    "equal counts are not a bijection; a cell pointing at no record must be refused"
  );
});

test("R7: a genuine bijection passes — the check is not refusing everything", () => {
  const { bundle, auditPrivate } = census({ cellIds: ["r1", "r2"], recordIds: ["r1", "r2"] });
  assert.notEqual(
    checkCensus(bundle, auditPrivate),
    280,
    "a well-formed census must survive, or the detector proves nothing about the dropped-cell rule"
  );
});

// ---------------------------------------------------------------------------------------------
// 5q-sp-r15-01 — evidence without execution (M15)
// ---------------------------------------------------------------------------------------------

test("R15: a bundle with NO detector record is refused", () => {
  // M15 deletes the guard. Without it, a bundle carrying no detector provenance walks into the
  // pinned-field loop and is judged on fields that do not exist — honest-looking evidence over an
  // execution reality that was never recorded.
  assert.equal(checkDetectorPinned({}), 257);
  assert.equal(checkDetectorPinned({ detector: null }), 257);
  assert.equal(checkDetectorPinned({ detector: "a string pretending to be provenance" }), 257);
});

test("R15: a FULLY PINNED detector passes — the guard is not a blanket refusal", () => {
  // Every later check inside checkDetectorPinned also returns 257, so a partially-populated bundle
  // cannot distinguish "stopped by the presence guard" from "stopped by a missing field". The only
  // honest non-blanket assertion is a bundle that passes ALL of them.
  const revision = "c".repeat(40);
  const pinned = {
    detector: {
      hf_revision: "main",
      resolved_commit_sha: revision,
      snapshot_manifest_digest: "d".repeat(64),
      tokenizer_manifest_digest: "e".repeat(64),
      runtime: "cpu",
      label_map: { 0: "BENIGN", 1: VDA_DETECTOR.POSITIVE_LABEL },
      positive_class_index: 1,
    },
    capture_provenance: { detector_revision: revision },
  };
  assert.equal(
    checkDetectorPinned(pinned),
    null,
    "a completely pinned detector must pass, or this pack proves nothing about the presence guard"
  );
});
