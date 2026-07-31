// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Tasks 24-25 — Lane C: acquisition, and offline verification of what was acquired.
//
// REVISION 1 VERIFIED A CAPTURE NOTHING PRODUCED (§13, B8). The capture is now real, and the two
// rules that govern it are frozen:
//
//   capture_required                     = false   an absent capture is `not_captured`, never green
//   frozen_capture_verification_required = true    once a capture is present
//
// An unverifiable capture is a REFUSAL, never a skip.
//
// THE LIVE RUN FOUND TWO FAIL-OPENS IN THE CAPTURE DRIVER ITSELF, and both are pinned below because
// the instrument that records honesty is the last place that should be trusted on its own word:
//
//   REKOR ANSWERED 200 WITH AN EMPTY BODY. The digest is not in the log — and the first version read
//   the status code and wrote "captured". A successful answer is not a positive answer.
//
//   OPENTIMESTAMPS ANCHORED sha256(FILE), NOT THE DIGEST. Bitcoin will commit to the hash of the
//   file that CONTAINS the digest, a gap exactly one hash wide. The record now carries both values
//   and the binding between them, and the verifier recomputes it rather than reading it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CAPTURE_OUTCOMES,
  captureRecord,
  parseArgs,
} from "../../../../tools/simurgh-attestation/stage5s/node/captureLaneC.mjs";
import {
  CAPTURE_REFUSALS,
  verifyCapture,
} from "../../../../tools/simurgh-attestation/stage5s/node/verifyCapture.mjs";

const DIR = "docs/research/llm-shield/evidence/stage-5s/lane-c";
const RECORD = JSON.parse(readFileSync(`${DIR}/lane-c-capture.json`, "utf8"));

// ------------------------------------------------------------------ the committed capture

test("[5s-t24] the committed capture verifies OFFLINE", () => {
  const result = verifyCapture(DIR);
  assert.equal(result.ok, true, JSON.stringify(result.refusals));
  assert.ok(result.verified.length > 0, "nothing verified, so the capture asserts nothing");
});

test("[5s-t24] the capture is REAL — a live RFC-3161 token and a live OTS commitment", () => {
  assert.equal(RECORD.lane_c_state, "captured");
  assert.deepEqual(RECORD.distinct_mechanisms_captured, ["bitcoin_ots", "rfc3161"]);
  // The token is a DER SEQUENCE of real size, not an error page renamed.
  const token = readFileSync(`${DIR}/vwq.tsr`);
  assert.equal(token[0], 0x30);
  assert.ok(token.length > 1000, `the token is only ${token.length} bytes`);
});

test("[5s-t24] rekor is recorded as ABSENT FROM THE LOG, not as a capture", () => {
  // The fail-open the live run exposed. HTTP 200 with `[]` means the log answered and holds
  // nothing; reading the status code alone called that a capture.
  const rekor = RECORD.mechanisms.find((m) => m.external_anchor_class === "rekor");
  assert.equal(rekor.outcome, "not_captured_absent_from_log");
  assert.match(rekor.detail, /holds no entry/);
  assert.equal(JSON.parse(readFileSync(`${DIR}/vwq-rekor-query.json`, "utf8")).length, 0);
  assert.ok(!RECORD.distinct_mechanisms_captured.includes("rekor"));
});

test("[5s-t24] the OTS binding is stated and RECOMPUTABLE, not assumed", () => {
  // Bitcoin commits to sha256(file), not to the envelope digest. The record says so, carries the
  // exact file content, and the verifier recomputes the relation.
  const ots = RECORD.mechanisms.find((m) => m.external_anchor_class === "bitcoin_ots");
  assert.equal(ots.outcome, "captured");
  assert.match(ots.binding, /anchored_value = sha256\(anchored_file_content\)/);
  assert.notEqual(
    ots.anchored_value,
    RECORD.submitted_digest,
    "if these were equal the distinction this record exists to make would be imaginary"
  );
  assert.equal(ots.anchored_file_content.trim(), RECORD.submitted_digest.replace(/^sha256:/, ""));
  assert.equal(readFileSync(`${DIR}/${ots.anchored_file}`, "utf8"), ots.anchored_file_content);
});

// ------------------------------------------------------------------ refusals

test("[5s-t24] a FALSIFIED anchored value is refused", () => {
  const tampered = JSON.parse(JSON.stringify(RECORD));
  const ots = tampered.mechanisms.find((m) => m.external_anchor_class === "bitcoin_ots");
  ots.anchored_value = `sha256:${"0".repeat(64)}`;
  const result = verifyCapture(DIR, {
    readFile: (p) =>
      p.endsWith("lane-c-capture.json") ? JSON.stringify(tampered) : readFileSync(p, "utf8"),
  });
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.reason === CAPTURE_REFUSALS.BINDING_MISMATCH));
});

test("[5s-t24] a capture CLAIMED over a missing artifact is refused, never skipped", () => {
  const tampered = JSON.parse(JSON.stringify(RECORD));
  tampered.mechanisms = [
    { external_anchor_class: "rfc3161", outcome: "captured", artifact: "not-here.tsr" },
  ];
  const result = verifyCapture(DIR, {
    readFile: (p) =>
      p.endsWith("lane-c-capture.json") ? JSON.stringify(tampered) : readFileSync(p, "utf8"),
  });
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.reason === CAPTURE_REFUSALS.ARTIFACT_ABSENT));
});

test("[5s-t24] a record CLAIMING a capture with nothing verifiable is refused", () => {
  const tampered = JSON.parse(JSON.stringify(RECORD));
  tampered.mechanisms = [
    { external_anchor_class: "rekor", outcome: "not_captured_absent_from_log", detail: "none" },
  ];
  const result = verifyCapture(DIR, {
    readFile: (p) =>
      p.endsWith("lane-c-capture.json") ? JSON.stringify(tampered) : readFileSync(p, "utf8"),
  });
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.reason === CAPTURE_REFUSALS.BINDING_UNRECOMPUTABLE));
});

test("[5s-t24] a record claiming an anchor carries WITNESS WEIGHT is refused", () => {
  // §3.1, machine-checked at the one place a future edit would be tempted to soften it.
  for (const over of [
    { anchor_witness_weight: 1 },
    { witness_independence_status_effect: "proven" },
  ]) {
    const tampered = { ...JSON.parse(JSON.stringify(RECORD)), ...over };
    const result = verifyCapture(DIR, {
      readFile: (p) =>
        p.endsWith("lane-c-capture.json") ? JSON.stringify(tampered) : readFileSync(p, "utf8"),
    });
    assert.equal(result.ok, false, JSON.stringify(over));
    assert.ok(result.refusals.some((r) => r.reason === CAPTURE_REFUSALS.WITNESS_WEIGHT_CLAIMED));
  }
});

test("[5s-t24] an absent capture is `not_captured`, and that is not an error", () => {
  const result = verifyCapture("/nonexistent-capture-dir");
  assert.equal(result.ok, false);
  assert.equal(result.state, "not_captured");
  assert.ok(result.refusals.some((r) => r.reason === CAPTURE_REFUSALS.RECORD_MALFORMED));
});

// ------------------------------------------------------------------ the driver's own discipline

test("[5s-t24] the capture driver refuses --key — Lane C submits a digest and signs nothing", () => {
  assert.match(parseArgs(["--key", "/tmp/k.pem"]).error, /signs nothing/);
  assert.ok(parseArgs(["--digest", "not-hex", "--emit", "/tmp/x"]).error);
  assert.ok(parseArgs(["--emit", "/tmp/x"]).error, "a capture with no digest was accepted");
});

test("[5s-t24] every recorded outcome is one of the declared ones", () => {
  for (const m of RECORD.mechanisms) {
    assert.ok(CAPTURE_OUTCOMES.includes(m.outcome), `${m.outcome} is not a declared outcome`);
  }
  assert.ok(CAPTURE_OUTCOMES.includes("not_captured_absent_from_log"));
});

test("[5s-t24] the release semantics are IN the artifact, not only in the plan", () => {
  assert.equal(RECORD.capture_required, false);
  assert.equal(RECORD.frozen_capture_verification_required, true);
  assert.match(RECORD.non_claim, /zero witness weight/);
  // And an empty capture would set the second flag false rather than claiming a verification duty
  // it cannot discharge.
  const empty = captureRecord("a".repeat(64), [
    { external_anchor_class: "rekor", outcome: "not_captured_network_unavailable" },
  ]);
  assert.equal(empty.lane_c_state, "not_captured");
  assert.equal(empty.frozen_capture_verification_required, false);
});
