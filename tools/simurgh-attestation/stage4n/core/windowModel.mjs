// SPDX-License-Identifier: AGPL-3.0-or-later
// Synthetic-window model (spec §5.0/§5.5). IO-free; no Date, no clock — verdicts are pure
// functions of committed inputs.
const WINDOW_RE = /^synthetic-(\d{4})$/;

export function windowIndex(id) {
  const m = typeof id === "string" ? id.match(WINDOW_RE) : null;
  if (!m) throw new Error(`window_id_malformed: ${String(id)}`);
  return Number(m[1]);
}

export function windowIdOf(i) {
  if (!Number.isInteger(i) || i < 0 || i > 9999) {
    throw new Error(`window_index_invalid: ${String(i)}`);
  }
  return `synthetic-${String(i).padStart(4, "0")}`;
}

// Deterministic interleave (spec §5.0): at window k append heartbeat(k), then — if
// k-d >= 0 — append aggregate_reveal(k-d). Pure function of (delay, asOfIndex).
export function expectedSequence(delay, asOfIndex) {
  if (!Number.isInteger(delay) || delay < 1) throw new Error("delay_invalid");
  if (!Number.isInteger(asOfIndex) || asOfIndex < 0) throw new Error("as_of_invalid");
  const seq = [];
  for (let k = 0; k <= asOfIndex; k++) {
    seq.push({ record_type: "heartbeat", window_id: windowIdOf(k) });
    if (k - delay >= 0) {
      seq.push({ record_type: "aggregate_reveal", window_id: windowIdOf(k - delay) });
    }
  }
  return seq;
}
