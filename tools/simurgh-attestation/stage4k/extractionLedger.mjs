// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Canonical, sha256HexRaw } from "../stage4d/stage4dCrypto.mjs";
import {
  EBA_LEDGER_SCHEMA,
  EVENT_FIELDS,
  FIXTURE_SALT,
  FROZEN_SIGNAL_CLASSES,
  SIGNAL_CLASS_WEIGHTS,
} from "./constants.mjs";

export class EbaSchemaError extends Error {
  constructor(reason, detail) {
    super(`eba schema violation: ${reason}${detail ? ` (${detail})` : ""}`);
    this.reason = reason;
  }
}

export const consumerIdDigest = (id) => `sha256:${sha256HexRaw(`${FIXTURE_SALT}\0${id}`)}`;
export const sessionIdDigest = (id) => `sha256:${sha256HexRaw(`${FIXTURE_SALT}\0${id}`)}`;

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new EbaSchemaError("schema_invalid_event");
  }
  const keys = Object.keys(event).sort();
  for (const k of keys) {
    if (!EVENT_FIELDS.includes(k)) throw new EbaSchemaError("schema_unknown_field", k);
  }
  for (const k of EVENT_FIELDS) {
    if (typeof event[k] !== "string" || event[k].length === 0) {
      throw new EbaSchemaError("schema_missing_field", k);
    }
  }
  if (!FROZEN_SIGNAL_CLASSES.includes(event.signal_class)) {
    throw new EbaSchemaError("unknown_signal_class", event.signal_class);
  }
  // Metadata-only lock: the response reference must already BE a digest — a plaintext
  // value here would smuggle content into an otherwise content-free stream.
  if (!/^sha256:[a-f0-9]{64}$/.test(event.response_id_digest)) {
    throw new EbaSchemaError("schema_invalid_digest", "response_id_digest");
  }
}

// Frozen deterministic order (spec §0.1A): byte-wise lexicographic on the digested consumer,
// then window, session, event, response digest, class. Never locale-dependent.
function sortEvents(events) {
  const keyed = events.map((e) => ({ e, cd: consumerIdDigest(e.consumer_id) }));
  keyed.sort((a, b) => {
    for (const [x, y] of [
      [a.cd, b.cd],
      [a.e.window, b.e.window],
      [a.e.session_id, b.e.session_id],
      [a.e.event_id, b.e.event_id],
      [a.e.response_id_digest, b.e.response_id_digest],
      [a.e.signal_class, b.e.signal_class],
    ]) {
      if (x < y) return -1;
      if (x > y) return 1;
    }
    return 0;
  });
  return keyed;
}

export function buildLedger(events) {
  if (!Array.isArray(events)) throw new EbaSchemaError("schema_invalid_event");
  for (const e of events) validateEvent(e);
  const keyed = sortEvents(events);
  const seen = new Set();
  const groups = new Map(); // `${cd}|${window}` -> entry accumulator
  for (const { e, cd } of keyed) {
    const dupKey = `${cd}|${e.window}|${e.session_id}|${e.event_id}`;
    if (seen.has(dupKey)) throw new EbaSchemaError("duplicate_event_id", e.event_id);
    seen.add(dupKey);
    const gKey = `${cd}|${e.window}`;
    if (!groups.has(gKey)) {
      groups.set(gKey, {
        consumer_id_digest: cd,
        window: e.window,
        sessions: new Set(),
        class_counts: Object.fromEntries(FROZEN_SIGNAL_CLASSES.map((c) => [c, 0])),
      });
    }
    const g = groups.get(gKey);
    g.sessions.add(sessionIdDigest(e.session_id));
    g.class_counts[e.signal_class] += 1;
  }
  const entries = [...groups.values()].map((g) => ({
    consumer_id_digest: g.consumer_id_digest,
    window: g.window,
    session_ids: [...g.sessions].sort(),
    class_counts: g.class_counts,
    weighted_total: FROZEN_SIGNAL_CLASSES.reduce(
      (sum, c) => sum + g.class_counts[c] * SIGNAL_CLASS_WEIGHTS[c],
      0
    ),
  }));
  // Group insertion order already follows the event sort (consumer digest, then window).
  return { schema: EBA_LEDGER_SCHEMA, entries };
}

export const ledgerDigest = (ledger) => `sha256:${sha256Canonical(ledger)}`;
