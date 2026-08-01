// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 28 — the portable mirror: WHATWG APIs only, no Node built-ins.
//
// THE CLAIM THIS MODULE SUPPORTS, AND THE ONE IT DOES NOT. Run under Node 26 it exercises the
// identical WebCrypto API a browser exposes, which establishes **API equivalence**. That is not
// browser execution, and this file does not let anyone say it is — the captured lane in
// `runHeadless.mjs` is where a real browser run lives, present or typed absent, never implied.
//
// Following 5O's precedent, which states the same distinction in its own header.
//
// Everything here is async because `crypto.subtle.digest` is. That is the API a browser has, so it
// is the API the mirror uses; a synchronous shortcut would be mirroring Node rather than the web.

const PARITY_IDS = [
  "canonical_json",
  "checkpoint_body_digest",
  "checkpoint_envelope_digest",
  "compatibility_relation",
  "ancestry",
  "quorum_arithmetic",
  "typed_status_rendering",
];

// Signature-bearing fields excluded from the BODY digest (§2.2), and the two domain separators.
// All three were WRONG in the first draft of this mirror — the field list was short by two and the
// domains were missing entirely, so every digest disagreed with the core. Nothing single-runtime
// could have shown it: the mirror was perfectly self-consistent.
const SIGNATURE_FIELDS = [
  "producer_signature",
  "producer_signature_profile",
  "witness_statements",
  "receipts",
];
const BODY_DOMAIN = "simurgh.vwq.checkpoint-body.v1";
const ENVELOPE_DOMAIN = "simurgh.vwq.checkpoint-envelope.v1";

/** Canonical JSON: sorted keys, no whitespace. The same bytes on every runtime or nothing works. */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort();
  const parts = [];
  for (const key of keys) {
    if (value[key] === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${canonicalJson(value[key])}`);
  }
  return `{${parts.join(",")}}`;
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkpointBodyDigest(checkpoint) {
  const body = {};
  for (const [k, v] of Object.entries(checkpoint ?? {})) {
    if (!SIGNATURE_FIELDS.includes(k)) body[k] = v;
  }
  return sha256Hex(`${BODY_DOMAIN}\n${canonicalJson(body)}`);
}

export async function checkpointEnvelopeDigest(checkpoint) {
  return sha256Hex(`${ENVELOPE_DOMAIN}\n${canonicalJson(checkpoint ?? {})}`);
}

/** The §2.4 relation, frozen. The ancestry oracle is injected exactly as in the Node core. */
/** A view is malformed when the fields the relation reads are absent. The core refuses these at
 * SCHEMA_UNSUPPORTED; the mirror did not, and accepted two empty objects as `same_checkpoint`. The
 * K7-A adapter found it — the parity vectors had no malformed view to disagree about. */
function malformedView(v) {
  if (v === null || typeof v !== "object") return "not an object";
  for (const field of ["producer_identity", "scope_id", "checkpoint_body_digest"]) {
    if (typeof v[field] !== "string" || v[field].length === 0) return `${field} absent`;
  }
  if (!Number.isInteger(v.epoch)) return "epoch is not an integer";
  return null;
}

export async function compare(a, b, opts = {}) {
  for (const [label, v] of [
    ["a", a],
    ["b", b],
  ]) {
    const why = malformedView(v);
    if (why)
      return {
        ok: false,
        refusal: { reason: "SCHEMA_UNSUPPORTED", detail: `view ${label}: ${why}` },
      };
  }

  // The oracle returns an OBJECT carrying `verdict`, exactly as the Node core requires. The first
  // version of this mirror took a bare string; the core read `answer?.verdict`, saw undefined, and
  // correctly fell through to `indeterminate` — a genuine contract mismatch that the parity vectors
  // surfaced on their first run and that no single-runtime test could have shown.
  const oracle = opts.ancestry ?? (() => ({ verdict: "unprovable" }));
  if (a?.producer_identity !== b?.producer_identity || a?.scope_id !== b?.scope_id) {
    return { ok: false, refusal: { reason: "COMPARISON_SET_INSUFFICIENT" } };
  }
  if (a.checkpoint_body_digest === b.checkpoint_body_digest) {
    return { ok: true, relation: "same_checkpoint" };
  }
  if (a.epoch === b.epoch) return { ok: true, relation: "incompatible" };

  const [earlier, later] = a.epoch < b.epoch ? [a, b] : [b, a];
  let answer;
  try {
    answer = oracle(earlier, later);
  } catch {
    return { ok: true, relation: "indeterminate" };
  }
  switch (answer?.verdict) {
    case "proven":
      return { ok: true, relation: "compatible" };
    case "not_ancestor":
      return { ok: true, relation: "incompatible" };
    case "invalid":
      return { ok: false, refusal: { reason: "ANCESTRY_PROOF_INVALID" } };
    default:
      return { ok: true, relation: "indeterminate" };
  }
}

/** Transitive ancestry with cycle rejection — the same invalid/unprovable line as the Node core. */
/** Returns `{verdict}` — the same shape the Node core's oracle contract requires. */
export function proveAncestry(earlier, later, committed = {}) {
  const chain = Array.isArray(committed.chain) ? committed.chain : [];
  const index = new Map(chain.map((r) => [r.body_digest, r]));
  const target = earlier?.checkpoint_body_digest;
  let current = index.get(later?.checkpoint_body_digest);
  if (typeof target !== "string") return { verdict: "unprovable" };
  if (later?.checkpoint_body_digest === target) return { verdict: "proven" };
  if (!current) return { verdict: "unprovable" };

  const seen = new Set();
  for (;;) {
    if (seen.has(current.body_digest)) return { verdict: "invalid", detail: "cycle" };
    seen.add(current.body_digest);
    const predecessor = current.predecessor;
    if (predecessor === null || predecessor === undefined) return { verdict: "not_ancestor" };
    if (seen.has(predecessor)) return { verdict: "invalid", detail: "cycle" };
    const next = index.get(predecessor);
    if (!next) return { verdict: "unprovable" };
    if (!(next.epoch < current.epoch))
      return { verdict: "invalid", detail: "epoch does not decrease" };
    if (predecessor === target) return { verdict: "proven" };
    current = next;
  }
}

/** Quorum arithmetic: exclusion, then collapse, then the threshold. Order is load-bearing (§2.8). */
export function tally(input) {
  const { checkpoint, policy, statements, producer_key_digest } = input ?? {};
  const roster = Array.isArray(policy?.witness_roster) ? policy.witness_roster : [];
  const list = Array.isArray(statements) ? statements : [];
  const seatOf = new Map(roster.map((e) => [e.witness_identity, e]));
  const ownerOfKey = new Map(roster.map((e) => [e.key_digest, e.witness_identity]));

  const refusals = [];
  const eligible = [];
  for (const s of list) {
    if (!s?.witness_identity || !s?.key_digest) {
      refusals.push({ reason: "WITNESS_IDENTITY_MALFORMED" });
      continue;
    }
    if (s.signature_verified !== true) {
      refusals.push({ reason: "WITNESS_SIGNATURE_INVALID" });
      continue;
    }
    const seat = seatOf.get(s.witness_identity);
    if (!seat) {
      refusals.push({ reason: "WITNESS_NOT_IN_ROSTER" });
      continue;
    }
    if (seat.key_digest !== s.key_digest) {
      // 5S-F010: an authorised key worn by the wrong authorised identity is an alias, not a stranger.
      refusals.push({
        reason: ownerOfKey.has(s.key_digest) ? "WITNESS_KEY_ALIASED" : "WITNESS_NOT_IN_ROSTER",
      });
      continue;
    }
    if (
      s.witness_identity === checkpoint?.producer_identity ||
      (producer_key_digest && s.key_digest === producer_key_digest)
    ) {
      refusals.push({ reason: "PRODUCER_SELF_WITNESS" });
      continue;
    }
    eligible.push(s);
  }

  const identities = [...new Set(eligible.map((s) => s.witness_identity))];
  const threshold = policy?.threshold_q;
  // A shortfall is a refusal AT THE TALLY (496). Ruling 8 governs whether the ordered evaluator
  // reports it, not whether the arithmetic records it — and the mirror must match the arithmetic.
  if (!Number.isInteger(threshold) || identities.length < threshold) {
    refusals.push({ reason: "QUORUM_BELOW_POLICY" });
  }
  return {
    ok: refusals.length === 0,
    refusals,
    tally: {
      distinct_eligible_witnesses: identities.length,
      threshold_q: threshold,
      met: Number.isInteger(threshold) && identities.length >= threshold,
    },
  };
}

/** Typed status rendering — the four comparison statuses and the five absence variants (§3.6). */
export function comparisonStatusOf(context) {
  const relations = Array.isArray(context?.relations) ? context.relations : [];
  if (relations.length === 0) return "comparison_unavailable";
  if (context?.intake?.sufficient_for_comparison !== true) return "comparison_unavailable";
  if (relations.includes("incompatible")) return "equivocation_detected";
  if (relations.some((r) => r !== "same_checkpoint" && r !== "compatible")) {
    return "comparison_indeterminate";
  }
  return "no_conflict_in_committed_comparison_set";
}

export function equivocationArtifactStatusOf(context) {
  const relations = Array.isArray(context?.relations) ? context.relations : [];
  switch (context?.comparison_status) {
    case "equivocation_detected":
      return "present";
    case "comparison_indeterminate":
      return "absent_comparison_indeterminate";
    case "comparison_unavailable":
      return "absent_comparison_unavailable";
    case "no_conflict_in_committed_comparison_set":
      if (relations.length === 0) return "absent_comparison_unavailable";
      return relations.every((r) => r === "same_checkpoint")
        ? "absent_same_checkpoint"
        : "absent_compatible";
    default:
      return "absent_comparison_unavailable";
  }
}

/** What this mirror covers, reported so the manifest can check it rather than a reader. */
export const COVERED_SURFACES = Object.freeze([...PARITY_IDS]);

/** Run the shared vector set and return one result object per surface. */
export async function runVectors(vectors) {
  return {
    runtime: "portable",
    covered: [...COVERED_SURFACES],
    canonical_json: vectors.canonical.map((v) => canonicalJson(v)),
    checkpoint_body_digest: await Promise.all(
      vectors.checkpoints.map((c) => checkpointBodyDigest(c))
    ),
    checkpoint_envelope_digest: await Promise.all(
      vectors.checkpoints.map((c) => checkpointEnvelopeDigest(c))
    ),
    compatibility_relation: await Promise.all(
      vectors.comparisons.map(async (pair) => {
        const r = await compare(pair.a, pair.b, {
          ancestry: (e, l) => proveAncestry(e, l, pair.committed ?? {}),
        });
        return r.ok ? r.relation : `refused:${r.refusal.reason}`;
      })
    ),
    ancestry: vectors.ancestries.map((v) => proveAncestry(v.earlier, v.later, v.committed).verdict),
    quorum_arithmetic: vectors.tallies.map((v) => {
      const r = tally(v);
      return { met: r.tally.met, distinct: r.tally.distinct_eligible_witnesses, ok: r.ok };
    }),
    typed_status_rendering: vectors.statuses.map((v) => ({
      comparison: comparisonStatusOf(v),
      artifact: equivocationArtifactStatusOf({ ...v, comparison_status: comparisonStatusOf(v) }),
    })),
  };
}
