// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 10: premises recomputed, restoration proven over the whole tree.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as cryptoNS from "node:crypto";
import {
  makePremiseReceipt,
  recomputePremise,
  proveRestoration,
  runControls,
  spanDigest,
} from "../../../../tools/simurgh-attestation/stage5r/core/controls.mjs";

const family = { attack_class: "R2", target_security_role: "evidence_emission" };

function controlSet(over = {}) {
  const mk = (kind, source, holds = true) => ({
    control_id: `c-${kind}`,
    function_id: `5p:a.mjs:${kind}`,
    security_role: "evidence_emission",
    premise_receipt: makePremiseReceipt({
      function_id: `5p:a.mjs:${kind}`,
      source,
      predicate: "the target emits a field set",
      holds: true,
    }),
    current: { source, holds },
  });
  return {
    vulnerable: mk("vulnerable", "function v(){ emit(extra) }"),
    safe: mk("safe", "function s(){ emit(declared) }"),
    orthogonal: mk("orthogonal", "function o(){ throw new SyntaxError() }"),
    ...over,
  };
}

const detectorFor = (verdicts) => (call) =>
  verdicts[call.control_id] ?? { verdict: "not_detected", signal: "none" };
const cleanSnapshot = () => () => ({ "a.mjs": "digest-1" });

test("a premise receipt binds the span digest and the predicate", () => {
  const r = makePremiseReceipt({ function_id: "x", source: "abc", predicate: "p", holds: true });
  assert.equal(r.source_digest, spanDigest("abc"));
  assert.equal(r.span_bytes, 3);
  assert.equal(r.predicate, "p");
  assert.throws(() => makePremiseReceipt({ source: "a", predicate: "p" }), TypeError);
});

test("the span digest is domain-separated, not a bare sha of the source", () => {
  const { createHash } = cryptoNS;
  const bare = createHash("sha256").update(Buffer.from("abc", "utf8")).digest("hex");
  assert.notEqual(spanDigest("abc"), bare);
});

test("a premise recomputes when the target is unchanged and still holds", () => {
  const r = makePremiseReceipt({ function_id: "x", source: "abc", predicate: "p", holds: true });
  assert.equal(recomputePremise(r, { source: "abc", holds: true }).ok, true);
});

test("a MOVED target fails the premise — remembered is not recomputed", () => {
  const r = makePremiseReceipt({ function_id: "x", source: "abc", predicate: "p", holds: true });
  const out = recomputePremise(r, { source: "abcd", holds: true });
  assert.equal(out.ok, false);
  assert.match(out.reason, /target moved/);
});

test("a premise that no longer holds makes the control BROKEN, not passing", () => {
  const r = makePremiseReceipt({
    function_id: "x",
    source: "abc",
    predicate: "emits",
    holds: true,
  });
  const out = recomputePremise(r, { source: "abc", holds: false });
  assert.equal(out.ok, false);
  assert.match(out.reason, /broken, not passing/);
});

test("restoration is proven over the WHOLE tree, so a stray artefact elsewhere still fails", () => {
  const before = { "target.mjs": "d1", "other.json": "d2" };
  assert.equal(proveRestoration(before, { ...before }).proven, true);
  // The target is repaired, but the run left something behind.
  const after = { "target.mjs": "d1", "other.json": "d2", "stray.tmp": "d3" };
  const r = proveRestoration(before, after);
  assert.equal(r.proven, false);
  assert.deepEqual(r.differences, ["stray.tmp"]);
});

test("a run with clean restoration and the expected verdicts produces admissible observations", () => {
  const { observations, receipts } = runControls({
    family,
    controls: controlSet(),
    detector: detectorFor({ "c-vulnerable": { verdict: "detected", signal: "field-set differs" } }),
    snapshot: cleanSnapshot(),
  });
  assert.equal(observations.vulnerable.verdict, "detected");
  assert.equal(observations.safe.verdict, "not_detected");
  assert.equal(observations.orthogonal.verdict, "not_detected");
  for (const k of ["vulnerable", "safe", "orthogonal"]) {
    assert.equal(observations[k].premise_recomputed, true, k);
    assert.equal(observations[k].restoration_proven, true, k);
  }
  assert.equal(receipts.length, 3, "a receipt PER CONTROL, not per family");
});

test("an unrestored mutation surfaces per control, naming what changed", () => {
  let calls = 0;
  const snapshot = () => (++calls === 2 ? { "a.mjs": "digest-2" } : { "a.mjs": "digest-1" });
  const { observations, receipts } = runControls({
    family,
    controls: controlSet(),
    detector: detectorFor({ "c-vulnerable": { verdict: "detected", signal: "s" } }),
    snapshot,
  });
  assert.equal(observations.vulnerable.restoration_proven, false);
  assert.match(observations.vulnerable.restoration_detail, /a\.mjs/);
  assert.deepEqual(receipts[0].restoration_differences, ["a.mjs"]);
});

test("a stale premise surfaces as premise_recomputed false, without inventing a verdict", () => {
  const controls = controlSet();
  controls.safe.current.holds = false;
  const { observations } = runControls({
    family,
    controls,
    detector: detectorFor({ "c-vulnerable": { verdict: "detected", signal: "s" } }),
    snapshot: cleanSnapshot(),
  });
  assert.equal(observations.safe.premise_recomputed, false);
  assert.match(observations.safe.premise_detail, /no longer holds/);
});

test("a missing control throws — there is no optional control", () => {
  const controls = controlSet();
  delete controls.orthogonal;
  assert.throws(
    () => runControls({ family, controls, detector: detectorFor({}), snapshot: cleanSnapshot() }),
    /no optional control/
  );
});
