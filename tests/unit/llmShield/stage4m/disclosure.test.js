// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildChain,
  chainDigest,
  verifyDisclosure,
} from "../../../../tools/simurgh-attestation/stage4m/core/disclosureCore.mjs";

const D = (n) => `sha256:${String(n).repeat(64)}`;
const w1 = {
  schema: "simurgh.vxd.window_commitment.v1",
  window: "2026-05",
  source_attestation_digest: D("1"),
  graph_version_digest: D("e"),
  clusters: [
    { cluster_commitment: D("a"), cluster_weighted_total: 3, budget: 5, cluster_size: 1 },
    { cluster_commitment: D("b"), cluster_weighted_total: 4, budget: 5, cluster_size: 2 },
  ],
};
const rescore = {
  schema: "simurgh.vxd.retro_rescore.v1",
  window: "2026-05",
  merge_event_digest: D("9"),
  breached_before: [],
  breached_after: [D("d")],
  newly_revealed: [D("d")],
  monotonicity_ok: true,
  findings: [],
};
const wd = recordDigest(w1);
const rd = recordDigest(rescore);
const recordsByDigest = new Map([
  [wd, w1],
  [rd, rescore],
]);

const disclosure = (over = {}) => ({
  schema: "simurgh.vxd.disclosure_claim.v1",
  chain_position: 2,
  claims: [
    { kind: "consumer_count", value: 3, bound_commitments: [{ digest: wd, chain_position: 0 }] },
    { kind: "exposure_total", value: 7, bound_commitments: [{ digest: wd, chain_position: 0 }] },
    { kind: "breach_count", value: 1, bound_commitments: [{ digest: rd, chain_position: 1 }] },
    { kind: "cluster_count", value: 2, bound_commitments: [{ digest: wd, chain_position: 0 }] },
    {
      kind: "window_range",
      value: ["2026-05", "2026-05"],
      bound_commitments: [{ digest: wd, chain_position: 0 }],
    },
  ],
  demand_side_evidence_digest: null,
  prose_history_digest: D("7"),
  ...over,
});
const chainFor = (d) =>
  buildChain([
    { kind: "window_commitment", digest: wd },
    { kind: "rescore_record", digest: rd },
    { kind: "disclosure_claim", digest: recordDigest(d) },
  ]);

test("V6: all five claim kinds recompute from pre-disclosure chain positions", () => {
  const d = disclosure();
  const chain = chainFor(d);
  assert.equal(chain.entries[2].position, 2);
  assert.equal(verifyDisclosure({ disclosure: d, chain, recordsByDigest }).ok, true);
  assert.match(chainDigest(chain), /^sha256:[a-f0-9]{64}$/);
});

test("V7: value drift -> 45 claim_recompute_mismatch", () => {
  const d = disclosure();
  d.claims[1].value = 8; // exposure says 8, recompute says 7
  const r = verifyDisclosure({ disclosure: d, chain: chainFor(d), recordsByDigest });
  assert.deepEqual([r.ok, r.rawCode, r.reason], [false, 45, "claim_recompute_mismatch"]);
});

test("V8: binding at/after the disclosure position -> 45 backdating", () => {
  const d = disclosure();
  d.claims[0].bound_commitments = [{ digest: wd, chain_position: 2 }];
  const r = verifyDisclosure({ disclosure: d, chain: chainFor(d), recordsByDigest });
  assert.deepEqual(
    [r.ok, r.rawCode, r.reason],
    [false, 45, "commitment_sequenced_after_disclosure"]
  );
  // and a LYING position (digest not at that slot) is the same conflict class
  const d2 = disclosure();
  d2.claims[0].bound_commitments = [{ digest: wd, chain_position: 1 }];
  assert.equal(
    verifyDisclosure({ disclosure: d2, chain: chainFor(d2), recordsByDigest }).reason,
    "commitment_sequenced_after_disclosure"
  );
});

test("V9: non-null pincer slot -> 45 pincer_slot_not_null; unknown kind -> 45", () => {
  const d = disclosure({ demand_side_evidence_digest: D("5") });
  assert.equal(
    verifyDisclosure({ disclosure: d, chain: chainFor(d), recordsByDigest }).reason,
    "pincer_slot_not_null"
  );
  const d2 = disclosure();
  d2.claims[0].kind = "vibes_count";
  assert.equal(
    verifyDisclosure({ disclosure: d2, chain: chainFor(d2), recordsByDigest }).reason,
    "unknown_claim_kind"
  );
});

test("schema police: unknown field / disclosure off-chain -> 45", () => {
  const d = disclosure({ extra: 1 });
  assert.equal(
    verifyDisclosure({ disclosure: d, chain: chainFor(d), recordsByDigest }).reason,
    "schema_invalid"
  );
  const d2 = disclosure();
  const chainWrong = buildChain([
    { kind: "window_commitment", digest: wd },
    { kind: "rescore_record", digest: rd },
    { kind: "disclosure_claim", digest: D("6") }, // not this disclosure's digest
  ]);
  assert.equal(
    verifyDisclosure({ disclosure: d2, chain: chainWrong, recordsByDigest }).reason,
    "commitment_sequenced_after_disclosure"
  );
});
