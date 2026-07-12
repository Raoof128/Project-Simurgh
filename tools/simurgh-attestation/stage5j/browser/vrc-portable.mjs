// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — portable browser verifier of the deterministic surface (WebCrypto/SubtleCrypto async).
// Zero external imports beyond the local canonical-json (CSP no-egress). Predicate view of signatures
// (same contract as the Python parity verifier): reproduces canonicalJson byte-equality, the derived
// obligation / ledger / contest-layer / projection roots, and the historical contest-event census → a
// raw code. Runs under Node WebCrypto too. This is browser PACKAGING/EXECUTION parity over the same
// decision logic — not a third crypto implementation.
import { canonicalJson } from "./canonical-json.mjs";

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return "sha256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const artifactDigest = (obj) => sha256Hex(canonicalJson(obj));

function coverage(vpc) {
  const S = vpc.partition.content.sections.map((s) => (typeof s === "string" ? s : s.section_id));
  const cov = {};
  for (const c of vpc.coverage_receipts) {
    cov[c.content.reviewer_principal.key_fingerprint] = [...c.content.evaluated_sections];
  }
  return { S, cov };
}

const comparable = (e, dims) =>
  e.content.value_kind === "ordinal" && dims.has(e.content.dimension_id);

function recomputeEvents(bundle) {
  const ranks = bundle.rating_scale.content.ordinal_ranks;
  const dims = new Set(bundle.rating_scale.content.comparable_dimensions);
  const bySection = new Map();
  const slot = (s) => {
    if (!bySection.has(s)) bySection.set(s, { prod: [], rev: [] });
    return bySection.get(s);
  };
  for (const p of bundle.producer_ratings) slot(p.content.section_id).prod.push(p);
  for (const r of bundle.reviewer_ratings) slot(r.content.section_id).rev.push(r);
  const ev = new Set();
  for (const [s, g] of bySection) {
    for (const p of g.prod)
      for (const r of g.rev) {
        if (!comparable(p, dims) || !comparable(r, dims)) continue;
        if (ranks[p.content.value] < ranks[r.content.value]) {
          ev.add(`${s} ${r.content.reviewer_id} ${p.entry_digest} ${r.entry_digest}`);
        }
      }
  }
  return ev;
}

function projections(bundle) {
  const ranks = bundle.rating_scale.content.ordinal_ranks;
  const dims = new Set(bundle.rating_scale.content.comparable_dimensions);
  const prodBy = new Map(bundle.producer_ratings.map((e) => [e.content.section_id, e]));
  const revBy = (s, r) =>
    bundle.reviewer_ratings.find((e) => e.content.section_id === s && e.content.reviewer_id === r);
  const divergence_census = bundle.contest_history.map((ce) => ({
    section_id: ce.content.section_id,
    reviewer_id: ce.content.reviewer_id,
    producer_rating: prodBy.get(ce.content.section_id).content.value,
    reviewer_ratings: [revBy(ce.content.section_id, ce.content.reviewer_id).content.value],
  }));
  let comparable_pair_count = 0;
  for (const rev of bundle.reviewer_ratings) {
    if (comparable(rev, dims) && comparable(prodBy.get(rev.content.section_id), dims)) {
      comparable_pair_count += 1;
    }
  }
  let total_rank_delta = 0;
  for (const ce of bundle.contest_history) {
    total_rank_delta +=
      ranks[revBy(ce.content.section_id, ce.content.reviewer_id).content.value] -
      ranks[prodBy.get(ce.content.section_id).content.value];
  }
  return {
    divergence_census,
    favourable_skew: { favourable_count: recomputeEvents(bundle).size, comparable_pair_count },
    concurrence_backing: {
      backed_claim_count: bundle.concurrences.length,
      total_concurrence_claim_count: bundle.concurrences.length,
    },
    downgrade_depth: { total_rank_delta, contested_pair_count: bundle.contest_history.length },
  };
}

export async function verifyPortable(bundle, cfg) {
  const { S, cov } = coverage(cfg.vpc_bundle);
  const pairs = [];
  for (const [rid, secs] of Object.entries(cov)) for (const s of secs) pairs.push(`${s}:${rid}`);
  const rating_obligation_root = await artifactDigest({
    required_reviewer_pairs: pairs.sort(),
    required_producer_sections: [...S].sort(),
  });
  if (bundle.rating_obligation_root !== rating_obligation_root) return { raw: 334 };

  const stored = new Set(
    bundle.contest_history.map(
      (c) =>
        `${c.content.section_id} ${c.content.reviewer_id} ${c.content.producer_rating_digest} ${c.content.reviewer_rating_digest}`
    )
  );
  const recomputed = recomputeEvents(bundle);
  if (stored.size !== recomputed.size || [...recomputed].some((k) => !stored.has(k))) {
    return { raw: 342 };
  }

  const rating_ledger_root = await artifactDigest({
    reviewer: bundle.reviewer_ratings.map((e) => e.entry_digest).sort(),
    producer: bundle.producer_ratings.map((e) => e.entry_digest).sort(),
  });
  const contest_layer_root = await artifactDigest({
    epoch_tickets: bundle.epoch_tickets.map((t) => t.epoch_ticket_digest),
    contest_history: bundle.contest_history.map((c) => c.contest_event_digest).sort(),
    producer_responses: bundle.producer_responses.map((r) => r.response_digest).sort(),
    concurrences: bundle.concurrences.map((c) => c.concurrence_digest).sort(),
    reviewer_rebuttals: bundle.reviewer_rebuttals.map((r) => r.rebuttal_digest).sort(),
  });
  const projection_root = await artifactDigest(projections(bundle));
  if (bundle.projections.projection_root !== projection_root) return { raw: 345 };

  return {
    raw: 0,
    rating_obligation_root,
    rating_ledger_root,
    contest_layer_root,
    projection_root,
  };
}
