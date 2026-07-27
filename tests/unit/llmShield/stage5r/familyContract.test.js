// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 8: frozen §3, the probe-family record.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateFamily,
  forbiddenSurrogates,
  FORBIDDEN_SURROGATE_SIGNALS,
  FAMILY_KEYS,
} from "../../../../tools/simurgh-attestation/stage5r/core/familyContract.mjs";

const good = () => ({
  probe_family_id: "F1",
  attack_class: "R2",
  target_security_role: "evidence_emission",
  role_archetype: "A5",
  inherited_5q_obligation_cells: 376,
  vulnerable_control: {
    premise_receipt: "sha256:aa",
    expected_detection: true,
    expected_outcome: "emits an unrecorded field",
    source_span_bytes: 300,
  },
  safe_control: {
    expected_detection: false,
    source_span_bytes: 290,
    exercises_detector_signal_path: true,
  },
  orthogonal_failure_control: {
    failure_mode: "parse_error",
    expected_detection: false,
    source_span_bytes: 280,
  },
  detector_signal: "emitted-field-set differs from the declared schema",
  forbidden_surrogate_signals: [...FORBIDDEN_SURROGATE_SIGNALS],
  coverage_delta: [],
});

test("a well-formed family validates", () => {
  assert.deepEqual(validateFamily(good()), { ok: true });
});

test("the frozen surrogate list is exactly six entries and cannot be mutated through the accessor", () => {
  assert.equal(FORBIDDEN_SURROGATE_SIGNALS.length, 6);
  const copy = forbiddenSurrogates();
  copy.push("something convenient");
  assert.equal(forbiddenSurrogates().length, 6);
  assert.throws(() => {
    "use strict";
    FORBIDDEN_SURROGATE_SIGNALS.push("x");
  });
});

test("EVERY control is mandatory — there is no optional control", () => {
  for (const c of ["vulnerable_control", "safe_control", "orthogonal_failure_control"]) {
    const f = good();
    delete f[c];
    const r = validateFamily(f);
    assert.equal(r.ok, false);
    assert.match(r.reason, new RegExp(c));
  }
});

test("an UNKNOWN key is refused, not ignored", () => {
  const f = { ...good(), convenient_extra_signal: "shhh" };
  const r = validateFamily(f);
  assert.equal(r.ok, false);
  assert.match(r.reason, /unknown key\(s\) convenient_extra_signal/);
});

test("an unknown key inside a control is refused too", () => {
  const f = good();
  f.safe_control.second_signal = "also shhh";
  const r = validateFamily(f);
  assert.equal(r.ok, false);
  assert.match(r.reason, /safe_control: unknown key/);
});

test("the record's key set is exactly §3.1's eleven fields", () => {
  assert.equal(FAMILY_KEYS.length, 11);
  assert.deepEqual([...FAMILY_KEYS].sort(), Object.keys(good()).sort());
});

test("a DISJUNCTION as detector_signal is refused — §3.3 requires one signal", () => {
  for (const s of ["exit code or stderr", "a || b", "a, b"]) {
    const f = { ...good(), detector_signal: s };
    const r = validateFamily(f);
    assert.equal(r.ok, false, s);
    assert.match(r.reason, /disjunction|one signal/);
  }
});

test("declaring a forbidden surrogate AS the detector signal is refused", () => {
  const f = { ...good(), detector_signal: "process exit code alone" };
  const r = validateFamily(f);
  assert.equal(r.ok, false);
  assert.match(r.reason, /forbidden surrogate/);
});

test("the forbidden list must be the frozen one, verbatim and in order", () => {
  const shortened = {
    ...good(),
    forbidden_surrogate_signals: FORBIDDEN_SURROGATE_SIGNALS.slice(0, 5),
  };
  assert.equal(validateFamily(shortened).ok, false);
  const reordered = {
    ...good(),
    forbidden_surrogate_signals: [...FORBIDDEN_SURROGATE_SIGNALS].reverse(),
  };
  assert.equal(validateFamily(reordered).ok, false);
});

test("the three expected detections are fixed by §4.1 and cannot be inverted", () => {
  const v = good();
  v.vulnerable_control.expected_detection = false;
  assert.match(validateFamily(v).reason, /vulnerable_control/);
  const s = good();
  s.safe_control.expected_detection = true;
  assert.match(validateFamily(s).reason, /safe_control/);
  const o = good();
  o.orthogonal_failure_control.expected_detection = true;
  assert.match(validateFamily(o).reason, /orthogonal_failure_control/);
});

test("a NO-OP orthogonal control fails the family — §3.2 requires a real failure", () => {
  const f = good();
  f.orthogonal_failure_control.failure_mode = "returns_quietly";
  const r = validateFamily(f);
  assert.equal(r.ok, false);
  assert.match(r.reason, /REAL failure|no-op/);
});

test("a safe control that never reaches the signal path is refused despite being not-detected", () => {
  const f = good();
  f.safe_control.exercises_detector_signal_path = false;
  const r = validateFamily(f);
  assert.equal(r.ok, false);
  assert.match(r.reason, /stub|signal path/);
});

test("an attack class or role outside the inherited sets is refused", () => {
  assert.match(validateFamily({ ...good(), attack_class: "R17" }).reason, /R1\.\.R16/);
  assert.match(
    validateFamily({ ...good(), target_security_role: "vibes" }).reason,
    /inherited 5Q role/
  );
});

test("a non-object fails closed", () => {
  assert.equal(validateFamily(null).ok, false);
  assert.equal(validateFamily("family").ok, false);
});
