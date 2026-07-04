// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 4N fixture builder (spec §8). Clean feed + tamper arms + the frozen
// one-legal-answer matrix. Honours STAGE4N_FIXTURE_OUT for temp regeneration (byte-compare
// in the reproduce script). No randomness, no clock, no network.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_GENESIS_SCHEMA,
  SEISMOGRAPH_INCLUSION_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../constants.mjs";
import { buildChain } from "../core/chainCore.mjs";
import { merklePathSorted } from "../core/merklePath.mjs";
import { commitBandVector } from "../core/recordCore.mjs";
import { computeSourceRoots } from "./sourceRoots.mjs";

const OUT = process.env.STAGE4N_FIXTURE_OUT ?? "tests/fixtures/llmShield/stage4n";

const RAW_COUNTS = [
  { breach_count: 0, consumer_count: 0 },
  { breach_count: 2, consumer_count: 4 },
  { breach_count: 5, consumer_count: 10 },
  { breach_count: 3, consumer_count: 7 },
  { breach_count: 6, consumer_count: 11 },
  { breach_count: 1, consumer_count: 1 },
  { breach_count: 0, consumer_count: 2 },
];

const policy = {
  schema: SEISMOGRAPH_GENESIS_SCHEMA,
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
  scope: { lane: "extraction", source_stages: ["4K", "4L", "4M"], reserved_exit_families: [] },
  publication: {
    surface: "in_repo_jsonl",
    feed_path: "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl",
    append_only: true,
  },
  window_policy: {
    clock: "synthetic",
    cadence: "P1D",
    genesis_window: "synthetic-0000",
    max_overdue_heartbeats: 0,
  },
  reveal_policy: { aggregate_reveal_delay_windows: 2, freshest_oracle_non_claim: true },
  band_policy: {
    dimensions: BAND_DIMENSIONS,
    band_vector_space_size: 9,
    leakage_bits_per_reveal_max: LEAKAGE_BITS_MAX,
  },
  non_claims: [...SEISMOGRAPH_NON_CLAIMS],
  crypto: { canonicalization: "RFC8785_JCS", digest: "SHA-256", signature: "Ed25519" },
};

const toJsonl = (records) => `${records.map((r) => JSON.stringify(r)).join("\n")}\n`;
async function write(path, content) {
  await mkdir(dirname(join(OUT, path)), { recursive: true });
  await writeFile(join(OUT, path), content);
}
const writeJson = (path, value) => write(path, `${JSON.stringify(value, null, 2)}\n`);

// Re-link a mutated record list so ONLY the intended violation remains visible (used by
// arms that must reach gates past Q10).
function relink(records) {
  let prev = recordDigest(policy);
  return records.map((r, i) => {
    const linked = { ...r, position: i, prev_record_digest: prev };
    prev = recordDigest(linked);
    return linked;
  });
}

const { disclosure_leaves, ...roots } = await computeSourceRoots(process.cwd());
const perWindow = new Map(RAW_COUNTS.map((rawCounts, k) => [k, { roots, rawCounts }]));
const clean = buildChain({ policy, asOfIndex: 6, perWindow });

const hb = (feed, id) => feed.find((r) => r.record_type === "heartbeat" && r.window_id === id);
const isRv = (r, id) => r.record_type === "aggregate_reveal" && r.window_id === id;

// T1: drop heartbeat 0002 AND re-forge links — pure silence, Q11 raw 47.
const t1 = relink(
  clean.filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
);
// T3: swap two records THEN re-forge links — the surviving violation is pure interleave
// order (Q10 raw 49). Without the relink, position_discontinuity would fire instead and
// the arm would have two plausible answers.
const t3Swapped = [...clean];
[t3Swapped[1], t3Swapped[2]] = [t3Swapped[2], t3Swapped[1]];
const t3 = relink(t3Swapped);
// T4: mutate the 4K root in heartbeat 0003, re-forge links — Q15 raw 50.
const t4 = relink(
  clean.map((r) =>
    r.record_type === "heartbeat" && r.window_id === "synthetic-0003"
      ? {
          ...r,
          commitments: { ...r.commitments, stage4k_exposure_root: recordDigest({ evil: 1 }) },
        }
      : r
  )
);
// T6: reveal 0000 claims it was revealed at its own window — Q13 reveal_early.
const t6 = relink(
  clean.map((r) => (isRv(r, "synthetic-0000") ? { ...r, revealed_at_window: "synthetic-0000" } : r))
);
// T7: drop the due reveal for 0001 — Q13 reveal_overdue.
const t7 = relink(clean.filter((r) => !isRv(r, "synthetic-0001")));
// T8: reveal bands contradict the committed vector — raw 50 reveal_commitment_mismatch.
const t8 = relink(
  clean.map((r) =>
    isRv(r, "synthetic-0000") ? { ...r, bands: { ...r.bands, breach_count: ">5" } } : r
  )
);
// T9: a producer who CONSISTENTLY discloses an undeclared cluster_count dimension — the
// reveal carries the third band AND its heartbeat's committed vector is re-forged to match,
// so Q10 (structural) and Q13 (commitment recompute) both pass and the violation surfaces
// exactly at Q14 undeclared_band_dimension. A sloppy variant (band added, commitment stale)
// would stop at Q13 raw 50 — that is arm T8's territory.
const t9Reveal = clean.find((r) => isRv(r, "synthetic-0000"));
const t9Bands = { ...t9Reveal.bands, cluster_count: "1-10" };
const t9 = relink(
  clean.map((r) => {
    if (isRv(r, "synthetic-0000")) return { ...r, bands: t9Bands };
    if (r.record_type === "heartbeat" && r.window_id === "synthetic-0000") {
      return {
        ...r,
        reveal_commitment: {
          ...r.reveal_commitment,
          committed_band_vector_digest: commitBandVector({
            window_id: "synthetic-0000",
            bands: t9Bands,
            salt: t9Reveal.reveal_salt,
          }),
        },
      };
    }
    return r;
  })
);
// T10: a public summary artifact discloses a raw count — Q16 raw_count_public.
const t10Extra = { name: "public-extra.json", value: { breach_count: 7 } };
// T11: inclusion-proof material in a public artifact — Q16 inclusion_proof_material_public.
const t11Extra = { name: "public-extra.json", value: { nested: { proof_path: [] } } };
// T2: a second artifact telling a different story for window 0003 — Q17 raw 48.
const t2Second = {
  record_type: "heartbeat",
  window_id: "synthetic-0003",
  digest: recordDigest({ other_story: true }),
};
// T5: bilateral proof referencing a heartbeat absent from the feed — Q12 raw 51.
const bundleLeaf = disclosure_leaves[0];
const validProof = {
  schema: SEISMOGRAPH_INCLUSION_SCHEMA,
  stage: "4N",
  distribution: "bilateral_only",
  window_id: "synthetic-0003",
  heartbeat_digest: recordDigest(hb(clean, "synthetic-0003")),
  bundle_digest: bundleLeaf,
  bundle_tier: "Tier-A",
  included_under: "stage4m_disclosure_root",
  proof_path: merklePathSorted(disclosure_leaves, bundleLeaf),
  root: roots.stage4m_disclosure_root,
};
const t5Proof = { ...validProof, heartbeat_digest: recordDigest({ ghost: 1 }) };

const matrix = {
  "t0-clean": { raw: 0, reason: null, gate: null },
  "t1-drop-heartbeat": { raw: 47, reason: "heartbeat_absent_for_expected_window", gate: "Q11" },
  "t2-fork": { raw: 48, reason: "cross_artifact_digest_mismatch", gate: "Q17" },
  "t3-reorder": { raw: 49, reason: "interleave_order_violation", gate: "Q10" },
  "t4-mutate-4k-root": { raw: 50, reason: "source_root_mismatch", gate: "Q15" },
  "t5-absent-heartbeat": { raw: 51, reason: "referenced_heartbeat_absent", gate: "Q12" },
  "t6-early-reveal": { raw: 52, reason: "reveal_early", gate: "Q13" },
  "t7-drop-due-reveal": { raw: 52, reason: "reveal_overdue", gate: "Q13" },
  "t8-reveal-band-mismatch": { raw: 50, reason: "reveal_commitment_mismatch", gate: "Q13" },
  "t9-undeclared-dimension": { raw: 53, reason: "undeclared_band_dimension", gate: "Q14" },
  "t10-raw-count": { raw: 54, reason: "raw_count_public", gate: "Q16" },
  "t11-proof-material-public": { raw: 54, reason: "inclusion_proof_material_public", gate: "Q16" },
};

await writeJson("genesis-policy.json", policy);
await write("feed/heartbeat-feed.jsonl", toJsonl(clean));
await write("tamper/t1-drop-heartbeat/heartbeat-feed.jsonl", toJsonl(t1));
await writeJson("tamper/t2-fork/second-artifact.json", t2Second);
await write("tamper/t3-reorder/heartbeat-feed.jsonl", toJsonl(t3));
await write("tamper/t4-mutate-4k-root/heartbeat-feed.jsonl", toJsonl(t4));
await writeJson("tamper/t5-absent-heartbeat/inclusion-proof.json", t5Proof);
await write("tamper/t6-early-reveal/heartbeat-feed.jsonl", toJsonl(t6));
await write("tamper/t7-drop-due-reveal/heartbeat-feed.jsonl", toJsonl(t7));
await write("tamper/t8-reveal-band-mismatch/heartbeat-feed.jsonl", toJsonl(t8));
await write("tamper/t9-undeclared-dimension/heartbeat-feed.jsonl", toJsonl(t9));
await writeJson("tamper/t10-raw-count/public-extra.json", t10Extra.value);
await writeJson("tamper/t11-proof-material-public/public-extra.json", t11Extra.value);
await writeJson("bilateral/inclusion-proof-valid.json", validProof);
await writeJson("expected-results/seismograph-matrix.json", matrix);
console.log(`stage4n fixtures written to ${OUT}`);
