// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 14: the parity manifest.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildManifest,
  checkRuntime,
  PARITY_ENTRIES,
  OUT_OF_SCOPE,
} from "../../../../tools/simurgh-attestation/stage5r/core/parityManifest.mjs";

test("the manifest names entries, and every entry carries vectors", () => {
  const m = buildManifest();
  assert.ok(m.entry_count >= 5);
  assert.ok(m.vector_count >= 15);
  for (const e of m.entries) {
    assert.ok(e.vectors.length > 0, `${e.id} has no vectors — a name without inputs is a promise`);
    for (const v of e.vectors) assert.notEqual(v.expected, undefined, e.id);
  }
});

test("the manifest is deterministic — two builds agree exactly", () => {
  assert.deepEqual(buildManifest(), buildManifest());
});

test("the arithmetic vectors pin both figures already in print", () => {
  const t = buildManifest().entries.find((e) => e.id === "measurements.tenths");
  const byInput = (n, d) =>
    t.vectors.find((v) => v.input.numerator === n && v.input.denominator === d).expected;
  assert.equal(byInput(1438, 23332), 62, "6.2%");
  assert.equal(byInput(2118, 20213), 105, "10.5%");
});

test("the span-digest vectors include a multi-byte case", () => {
  const e = buildManifest().entries.find((x) => x.id === "controls.spanDigest");
  const multi = e.vectors.find((v) => /[^\x00-\x7f]/.test(v.input.source));
  assert.ok(multi, "span geometry is where byte-offset bugs die in daylight");
  assert.match(multi.expected, /^[0-9a-f]{64}$/);
});

test("the file-pin vectors pin CRLF/LF equivalence across runtimes", () => {
  const e = buildManifest().entries.find((x) => x.id === "inherit.filePin");
  const crlf = e.vectors.find((v) => v.input.text === "a\r\nb").expected;
  const lf = e.vectors.find((v) => v.input.text === "a\nb").expected;
  assert.equal(
    crlf,
    lf,
    "a runtime that disagrees here would produce a different pin for one file"
  );
});

test("out-of-scope surfaces are NAMED with reasons, not silently absent", () => {
  assert.ok(OUT_OF_SCOPE.length >= 4);
  for (const o of OUT_OF_SCOPE) {
    assert.ok(o.id && o.reason, JSON.stringify(o));
  }
  const ids = new Set(PARITY_ENTRIES.map((e) => e.id));
  for (const o of OUT_OF_SCOPE)
    assert.ok(!ids.has(o.id), `${o.id} cannot be both in and out of scope`);
});

// ---- the runtime check ---------------------------------------------------------------------------

const answersFrom = (m) =>
  Object.fromEntries(m.entries.map((e) => [e.id, e.vectors.map((v) => v.expected)]));

test("a runtime reproducing every vector passes", () => {
  const m = buildManifest();
  assert.deepEqual(checkRuntime({ manifest: m, answers: answersFrom(m) }), {
    ok: true,
    mismatches: [],
    missing: [],
  });
});

test("a runtime MISSING an entry fails — this is selective mirroring, caught", () => {
  const m = buildManifest();
  const answers = answersFrom(m);
  delete answers["laneB.permute"];
  const r = checkRuntime({ manifest: m, answers });
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["laneB.permute"]);
});

test("a runtime disagreeing on ONE vector fails, naming the vector", () => {
  const m = buildManifest();
  const answers = answersFrom(m);
  answers["measurements.tenths"] = [...answers["measurements.tenths"]];
  answers["measurements.tenths"][0] = 61; // the classic: floor instead of round-half-up
  const r = checkRuntime({ manifest: m, answers });
  assert.equal(r.ok, false);
  assert.equal(r.mismatches[0].id, "measurements.tenths");
  assert.equal(r.mismatches[0].vector, 0);
  assert.equal(r.mismatches[0].expected, 62);
  assert.equal(r.mismatches[0].got, 61);
});

test("a runtime answering the wrong NUMBER of vectors fails", () => {
  const m = buildManifest();
  const answers = answersFrom(m);
  answers["measurements.tenths"] = answers["measurements.tenths"].slice(0, 2);
  const r = checkRuntime({ manifest: m, answers });
  assert.equal(r.ok, false);
  assert.match(r.mismatches[0].reason, /expected \d+ answers/);
});
