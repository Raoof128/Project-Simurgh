// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EVENT_FIELDS,
  FROZEN_SIGNAL_CLASSES,
  SIGNAL_CLASS_WEIGHTS,
} from "../../../../tools/simurgh-attestation/stage4k/constants.mjs";
import {
  EbaSchemaError,
  buildLedger,
  consumerIdDigest,
  ledgerDigest,
  sessionIdDigest,
} from "../../../../tools/simurgh-attestation/stage4k/extractionLedger.mjs";

const ev = (over = {}) => ({
  event_id: "ev_001",
  consumer_id: "consumer_alpha",
  session_id: "session_a",
  window: "2026-07",
  signal_class: "final_answer",
  response_id_digest: `sha256:${"a".repeat(64)}`,
  ...over,
});

test("frozen constants: classes, weights, event fields", () => {
  assert.deepEqual(FROZEN_SIGNAL_CLASSES, [
    "final_answer",
    "reasoning_trace",
    "reward_like_judgment",
    "tool_use_trajectory",
  ]);
  assert.deepEqual(SIGNAL_CLASS_WEIGHTS, {
    final_answer: 1,
    tool_use_trajectory: 2,
    reasoning_trace: 3,
    reward_like_judgment: 4,
  });
  assert.deepEqual(EVENT_FIELDS, [
    "consumer_id",
    "event_id",
    "response_id_digest",
    "session_id",
    "signal_class",
    "window",
  ]);
  assert.equal(Object.isFrozen(SIGNAL_CLASS_WEIGHTS), true);
});

test("buildLedger aggregates multiple sessions into ONE cumulative entry per consumer/window", () => {
  const events = [
    ev({ event_id: "ev_1", session_id: "session_a", signal_class: "final_answer" }),
    ev({ event_id: "ev_2", session_id: "session_b", signal_class: "reasoning_trace" }),
    ev({ event_id: "ev_3", session_id: "session_b", signal_class: "tool_use_trajectory" }),
  ];
  const ledger = buildLedger(events);
  assert.equal(ledger.schema, "simurgh.eba.ledger.v1");
  assert.equal(ledger.entries.length, 1);
  const e = ledger.entries[0];
  assert.equal(e.consumer_id_digest, consumerIdDigest("consumer_alpha"));
  assert.equal(e.window, "2026-07");
  assert.deepEqual(
    e.session_ids,
    [sessionIdDigest("session_a"), sessionIdDigest("session_b")].sort()
  );
  assert.deepEqual(e.class_counts, {
    final_answer: 1,
    reasoning_trace: 1,
    reward_like_judgment: 0,
    tool_use_trajectory: 1,
  });
  assert.equal(e.weighted_total, 1 + 3 + 2);
});

test("byte-stable: same events in any input order produce identical canonical ledgers", () => {
  const a = [
    ev({ event_id: "ev_1" }),
    ev({ event_id: "ev_2", consumer_id: "consumer_beta", session_id: "session_c" }),
  ];
  const b = [...a].reverse();
  assert.equal(JSON.stringify(buildLedger(a)), JSON.stringify(buildLedger(b)));
  assert.equal(ledgerDigest(buildLedger(a)), ledgerDigest(buildLedger(b)));
});

test("schema lock: unknown field fails closed", () => {
  assert.throws(
    () => buildLedger([ev({ prompt: "leak me" })]),
    (err) => err instanceof EbaSchemaError && err.reason === "schema_unknown_field"
  );
});

test("schema lock: missing field fails closed", () => {
  const bad = ev();
  delete bad.response_id_digest;
  assert.throws(
    () => buildLedger([bad]),
    (err) => err instanceof EbaSchemaError && err.reason === "schema_missing_field"
  );
});

test("schema lock: unknown signal class fails closed (never skipped or zero-weighted)", () => {
  assert.throws(
    () => buildLedger([ev({ signal_class: "raw_logits" })]),
    (err) => err instanceof EbaSchemaError && err.reason === "unknown_signal_class"
  );
});

test("schema lock: malformed response_id_digest fails closed (plaintext can never smuggle in)", () => {
  assert.throws(
    () => buildLedger([ev({ response_id_digest: "the raw response text" })]),
    (err) => err instanceof EbaSchemaError && err.reason === "schema_invalid_digest"
  );
});

test("schema lock: duplicate event_id within consumer/window/session fails closed", () => {
  assert.throws(
    () => buildLedger([ev(), ev()]),
    (err) => err instanceof EbaSchemaError && err.reason === "duplicate_event_id"
  );
  // Same event_id in a DIFFERENT session is legal.
  const ok = buildLedger([ev(), ev({ session_id: "session_b" })]);
  assert.equal(ok.entries[0].class_counts.final_answer, 2);
});

test("ledger is content-free: no plaintext ids, no raw-content keys", () => {
  const s = JSON.stringify(buildLedger([ev()]));
  for (const leak of ["consumer_alpha", "session_a", "prompt", "output", "transcript"]) {
    assert.equal(s.includes(leak), false, leak);
  }
});
