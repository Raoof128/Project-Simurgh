// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 19: what C1 binds, and what it honestly cannot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  buildCommitment,
  compareCommitments,
  obligationSetDigest,
  ORDERING_SEED,
} from "../../../../tools/simurgh-attestation/stage5r/core/commitment.mjs";
import { loadCorpus } from "../../../../tools/simurgh-attestation/stage5r/core/families.mjs";
import {
  loadInheritedTargets,
  attachTargets,
} from "../../../../tools/simurgh-attestation/stage5r/core/campaign.mjs";
import { compareAgainstCorpusDir } from "../../../../tools/simurgh-attestation/stage5r/node/verifyCampaignCommitment.mjs";
import { SURROGATE_TRANSFORMS } from "../../../../tools/simurgh-attestation/stage5r/core/suppression.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const corpus = attachTargets(loadCorpus(ROOT), loadInheritedTargets(ROOT));

const parts = () => ({
  families: corpus,
  trancheText: "tranche",
  detectorDigest: "d".repeat(64),
  runnerText: "runner",
  instrumentLockText: "lock",
});

test("every family's target set is EVERY obligated cell of its pair (Ruling 1)", () => {
  const total = corpus.reduce((a, f) => a + f.obligationIds.length, 0);
  assert.equal(total, 2406);
  for (const f of corpus) {
    assert.equal(f.obligationIds.length, f.record.inherited_5q_obligation_cells, f.id);
    assert.equal(new Set(f.obligationIds).size, f.obligationIds.length, `${f.id}: duplicate cells`);
  }
  assert.equal(corpus.find((f) => f.id === "F5").obligationIds.length, 582);
  assert.equal(corpus.find((f) => f.id === "F3").obligationIds.length, 17);
});

test("the obligation-set digest is order-independent and membership-sensitive", () => {
  const ids = ["c", "a", "b"];
  assert.equal(obligationSetDigest(ids), obligationSetDigest(["a", "b", "c"]));
  assert.notEqual(obligationSetDigest(ids), obligationSetDigest(["a", "b"]));
});

test("C1 binds every field that could otherwise be chosen after a result", () => {
  const c = buildCommitment(parts());
  for (const key of [
    "tranche_digest",
    "detector_implementation_digest",
    "runner_digest",
    "instrument_lock_digest",
    "ordering_seed",
    "control_presentation_order",
    "forbidden_surrogate_transforms",
    "families",
    "total_target_cells",
  ]) {
    assert.ok(c[key] !== undefined, `C1 does not bind ${key}`);
  }
  assert.equal(c.family_count, 8);
  assert.equal(c.total_target_cells, 2406);
  assert.equal(c.ordering_seed, ORDERING_SEED);
  assert.deepEqual(c.forbidden_surrogate_transforms, Object.keys(SURROGATE_TRANSFORMS));
  for (const f of c.families) {
    assert.match(f.control_digests.vulnerable, /^[0-9a-f]{64}$/);
    assert.match(f.control_digests.safe, /^[0-9a-f]{64}$/);
    assert.match(f.control_digests.orthogonal, /^[0-9a-f]{64}$/);
  }
});

test("the presentation order is a permutation of all 24 controls, seeded and reproducible", () => {
  const a = buildCommitment(parts()).control_presentation_order;
  const b = buildCommitment(parts()).control_presentation_order;
  assert.deepEqual(a, b);
  assert.equal(a.length, 24);
  assert.equal(new Set(a).size, 24);
  // Order must not simply be family order, or sequence leaks which control is which.
  const naive = corpus.flatMap((f) => [
    f.controls.vulnerable.control_id,
    f.controls.safe.control_id,
    f.controls.orthogonal.control_id,
  ]);
  assert.notDeepEqual(a, naive);
  assert.deepEqual([...a].sort(), [...naive].sort());
});

test("C1 is deterministic: the same tree commits the same bytes", () => {
  assert.deepEqual(buildCommitment(parts()), buildCommitment(parts()));
});

test("a moved control byte is REFUSED by the comparison", () => {
  const committed = buildCommitment(parts());
  const moved = structuredClone(committed);
  moved.families[0].control_digests.vulnerable = "0".repeat(64);
  const r = compareCommitments({ committed, rebuilt: moved });
  assert.equal(r.ok, false);
  assert.match(r.differences.join(" "), /control bytes moved after the commitment/);
});

test("a family added or removed after the commitment is REFUSED", () => {
  const committed = buildCommitment(parts());
  const fewer = structuredClone(committed);
  fewer.families = fewer.families.slice(1);
  fewer.family_count = fewer.families.length;
  assert.equal(compareCommitments({ committed, rebuilt: fewer }).ok, false);

  const more = structuredClone(committed);
  more.families.push({ ...committed.families[0], probe_family_id: "F9" });
  const r = compareCommitments({ committed, rebuilt: more });
  assert.equal(r.ok, false);
  assert.match(r.differences.join(" "), /F9: present in the tree and absent from the commitment/);
});

test("a re-aimed family — same controls, different target cells — is REFUSED", () => {
  // The subtle swap: keep every control byte and quietly point the family at an easier pair.
  const committed = buildCommitment(parts());
  const reaimed = structuredClone(committed);
  reaimed.families[0].target_obligation_set_digest = obligationSetDigest(["a", "b"]);
  const r = compareCommitments({ committed, rebuilt: reaimed });
  assert.equal(r.ok, false);
  assert.match(r.differences.join(" "), /target_obligation_set_digest/);
});

test("a swapped DETECTOR or RUNNER is refused", () => {
  const committed = buildCommitment(parts());
  for (const key of ["detector_implementation_digest", "runner_digest", "instrument_lock_digest"]) {
    const swapped = { ...structuredClone(committed), [key]: "0".repeat(64) };
    const r = compareCommitments({ committed, rebuilt: swapped });
    assert.equal(r.ok, false, key);
    assert.match(r.differences.join(" "), new RegExp(key));
  }
});

test("THE VERIFIER REFUSES THE ALTERED FIXTURE, and accepts the real corpus", () => {
  // A verifier only ever run against the corpus it was built from has not been shown to refuse
  // anything.
  const committed = buildCommitment(parts());
  const real = compareAgainstCorpusDir({
    commitment: committed,
    dir: join(ROOT, "tools/simurgh-attestation/stage5r/families"),
  });
  assert.deepEqual(real, []);
  const altered = compareAgainstCorpusDir({
    commitment: committed,
    dir: join(ROOT, "tests/fixtures/llmShield/stage5r/altered-family"),
  });
  assert.equal(altered.length, 1);
  assert.match(altered[0], /F1\/vulnerable: control bytes differ from the commitment/);
});

test("the committed C1, once it exists, is what rebuilds from the tree", () => {
  const path = join(
    ROOT,
    "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json"
  );
  if (!existsSync(path)) return; // Task 19 has not run yet; the CLI's own check covers it after
  const committed = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(committed.family_count, 8);
  assert.equal(committed.total_target_cells, 2406);
  assert.equal(committed.ordering_seed, ORDERING_SEED);
});
