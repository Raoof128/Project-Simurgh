// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — cross-artifact census (I-A Stephan census + I-D no-silent-re-finalisation). Pure, derived,
// never-filed. Non-claims: concurrency is not inattention; absence is not guilt outside a declared census;
// re-finalisation is legitimate and only made VISIBLE. Operates over verified green-envelope summaries.
import { hdsObject } from "../core/encoding.mjs";
import { DS } from "../constants.mjs";

// I-A: max provable simultaneous in-flight finalisations per signer, via a sweep over the minimal provable
// busy windows [start_upper_ms, end_lower_ms]. Touching windows do NOT overlap (end processed before start).
export function stephanCensus(items) {
  const bySigner = new Map();
  for (const it of items) {
    if (it.start_upper_ms > it.end_lower_ms) continue; // no provable busy window
    if (!bySigner.has(it.signer_fpr)) bySigner.set(it.signer_fpr, []);
    bySigner.get(it.signer_fpr).push(it);
  }
  const out = {};
  for (const [signer, group] of bySigner) {
    const events = [];
    for (const it of group) {
      events.push({ t: it.start_upper_ms, d: +1 });
      events.push({ t: it.end_lower_ms, d: -1 });
    }
    // Tie-break: process ends (-1) before starts (+1) so touching intervals are not counted as overlap.
    events.sort((a, b) => a.t - b.t || a.d - b.d);
    let active = 0,
      max = 0;
    for (const e of events) {
      active += e.d;
      if (active > max) max = active;
    }
    out[signer] = { count: group.length, max_provable_concurrency: max };
  }
  return {
    per_signer: out,
    non_claim:
      "provable concurrency is not inattention; a team may operate behind one signer identity",
  };
}

// I-D: flag two green envelopes over the same (run_id, D_in, delay_policy_digest, decision_slot_id) with
// differing decision_digest. Visible, never criminal.
export function doubleFinalisations(items) {
  const seen = new Map();
  const flags = [];
  for (const it of items) {
    const key = hdsObject(DS.census, {
      run_id: it.run_id,
      D_in: it.D_in,
      delay_policy_digest: it.delay_policy_digest,
      decision_slot_id: it.decision_slot_id,
    });
    if (seen.has(key)) {
      const prev = seen.get(key);
      if (prev.decision_digest !== it.decision_digest)
        flags.push({
          key,
          decision_digests: [prev.decision_digest, it.decision_digest],
          type: "double_finalisation",
        });
    } else {
      seen.set(key, it);
    }
  }
  return {
    flags,
    non_claim: "re-finalisation is legitimate (reopened cases); this only makes it visible",
  };
}
