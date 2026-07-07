// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR corpusCore (plan Task 5).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, appendFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  validateCorpusSchema,
  checkCorpusWellFormed,
  checkFrozenGate,
  checkSourceWitness,
  computeSourceWitness,
  v1RulesetDigest,
  FOUR_W_SOURCE_FILES,
} from "../../../../tools/simurgh-attestation/stage4x/core/corpusCore.mjs";
import { greenCorpus, clone } from "./_corpusHelper.mjs";

test("green corpus passes schema, well-formedness, frozen-gate, source-witness", () => {
  const c = greenCorpus();
  assert.equal(validateCorpusSchema(c), null);
  assert.equal(checkCorpusWellFormed(c), null);
  assert.equal(checkFrozenGate(c), null);
  assert.equal(checkSourceWitness(c), null);
});

test("173 on unknown key / bad schema id / missing item key", () => {
  const a = clone(greenCorpus());
  a.schema = "nope";
  assert.equal(validateCorpusSchema(a).raw, 173);
  const b = clone(greenCorpus());
  b.surprise = 1;
  assert.equal(validateCorpusSchema(b).raw, 173);
  const d = clone(greenCorpus());
  delete d.items[0].seed_form;
  assert.equal(validateCorpusSchema(d).raw, 173);
});

test("175 reasons: count / dup / unsorted / provenance / label / MR-derivation / coverage", () => {
  const count = clone(greenCorpus());
  count.declared_item_count = 99;
  assert.deepEqual(
    [checkCorpusWellFormed(count).raw, checkCorpusWellFormed(count).reason],
    [175, "count_mismatch"]
  );

  const dup = clone(greenCorpus());
  dup.items[1].item_id = dup.items[0].item_id;
  assert.equal(checkCorpusWellFormed(dup).reason, "duplicate_item_id");

  const uns = clone(greenCorpus());
  [uns.items[0], uns.items[1]] = [uns.items[1], uns.items[0]];
  assert.equal(checkCorpusWellFormed(uns).reason, "unsorted_item_id");

  const prov = clone(greenCorpus());
  prov.items[0].provenance = "vibes_sourced";
  assert.equal(checkCorpusWellFormed(prov).reason, "bad_provenance");

  const lbl = clone(greenCorpus());
  lbl.items[0].claim_bearing = false;
  assert.equal(checkCorpusWellFormed(lbl).reason, "missing_label");

  const mr = clone(greenCorpus());
  mr.items[0].residue_form = "hand-authored residue not from the transform";
  assert.equal(checkCorpusWellFormed(mr).reason, "residue_form_not_mr_derived");

  const cov = clone(greenCorpus());
  cov.coverage_witness.number_word = [];
  assert.equal(checkCorpusWellFormed(cov).reason, "coverage_witness_incomplete");
});

test("176 v1_ruleset_digest_mismatch on a swapped ruleset digest", () => {
  const c = clone(greenCorpus());
  c.ruleset_binding.v1_ruleset_digest = "sha256:" + "0".repeat(64);
  assert.deepEqual(
    [checkFrozenGate(c).raw, checkFrozenGate(c).reason],
    [176, "v1_ruleset_digest_mismatch"]
  );
});

test("176 four_w_source_drift when the imported 4W gate file bytes change (DI seam)", () => {
  const c = greenCorpus(); // source_witness sealed from the REAL root
  assert.equal(checkSourceWitness(c), null); // real root matches
  // Build a temp root holding copies of the 4W files, then mutate one → drift.
  const root = mkdtempSync(join(tmpdir(), "vlr-witness-"));
  for (const rel of FOUR_W_SOURCE_FILES) {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    copyFileSync(join(process.cwd(), rel), join(root, rel));
  }
  appendFileSync(join(root, FOUR_W_SOURCE_FILES[0]), "\n// drift\n");
  const r = checkSourceWitness(c, { rootDir: root });
  assert.deepEqual([r.raw, r.reason], [176, "four_w_source_drift"]);
});

test("source witness digest is deterministic + v1RulesetDigest stable", () => {
  assert.deepEqual(computeSourceWitness(), computeSourceWitness());
  assert.match(v1RulesetDigest(), /^sha256:[0-9a-f]{64}$/);
});
