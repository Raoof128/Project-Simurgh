// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — K7 all-functions e2e net (plan Task 18). Verifies the REAL committed evidence at both
// tiers, exercises every export, and runs the tamper matrix over the committed bundle (re-signed with
// the fixture key so each downstream code fires in frozen first-failure order).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { verifyEvidence } from "../../../../tools/simurgh-attestation/stage5e/node/verify-vda-attestation.mjs";
import {
  evaluateVda,
  evaluateVdaSafe,
  signBundle,
  contentOf,
  keyFingerprint,
  BUNDLE_KEYS,
} from "../../../../tools/simurgh-attestation/stage5e/core/vdaCore.mjs";
import * as recipes from "../../../../tools/simurgh-attestation/stage5e/core/recipes.mjs";
import * as detector from "../../../../tools/simurgh-attestation/stage5e/core/detector.mjs";
import * as slip from "../../../../tools/simurgh-attestation/stage5e/core/slip.mjs";
import * as curve from "../../../../tools/simurgh-attestation/stage5e/core/curve.mjs";
import * as claim from "../../../../tools/simurgh-attestation/stage5e/core/claim.mjs";
import * as corpus from "../../../../tools/simurgh-attestation/stage5e/core/corpus.mjs";
import * as byo from "../../../../tools/simurgh-attestation/stage5e/lanec/byoAdapter.mjs";
import { scoreTableDigest } from "../../../../tools/simurgh-attestation/stage5e/core/detector.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const EVID = join(REPO, "docs/research/llm-shield/evidence/stage-5e");
const KEY = join(
  REPO,
  "tests/fixtures/llmShield/stage5e/test-keys/INSECURE_FIXTURE_ONLY_stage-vda.pem"
);
const load = (f) => JSON.parse(readFileSync(join(EVID, f), "utf8"));

test("committed evidence verifies raw 0 at both tiers", () => {
  const { audit, pub } = verifyEvidence();
  assert.equal(audit.raw, 0);
  assert.equal(pub.raw, 0);
});

test("the executed grounding is real: 4 baseline-flagged bases, all slip at reference θ", () => {
  const bundle = load("vda-attestation.json");
  assert.equal(bundle.baseline_census.baseline_flagged, 4);
  assert.equal(bundle.baseline_census.baseline_missed, 4);
  assert.equal(bundle.evasions.length, 4);
  assert.equal(bundle.evasions.filter((e) => e.threshold_crossing).length, 4);
  // every slip also inverts (obfuscation lowered the real score)
  assert.ok(bundle.evasions.every((e) => e.score_inversion));
  assert.equal(bundle.detector.model_id, "meta-llama/Llama-Prompt-Guard-2-86M");
  assert.equal(bundle.detector.positive_class_index, 1);
});

test("every export is present and callable (all-functions coverage)", () => {
  for (const f of ["applyRecipe", "generatedTextDigest", "recipeDigest", "textDigest"])
    assert.equal(typeof recipes[f], "function", f);
  for (const f of [
    "isFixedWidthDec",
    "decStr",
    "decLt",
    "normalizeDeobfuscated",
    "scoreTableDigest",
    "runtimeDigest",
    "checkDetectorPinned",
    "checkScoreTableBinding",
    "resolveScore",
  ])
    assert.equal(typeof detector[f], "function", f);
  for (const f of ["thresholdCrossing", "scoreInversion", "checkSlips"])
    assert.equal(typeof slip[f], "function", f);
  for (const f of ["curveAt", "benignFpAt", "checkCurve", "checkFp"])
    assert.equal(typeof curve[f], "function", f);
  for (const f of ["overclaimScreen", "reviewRecordValid", "checkClaims", "checkProvenance"])
    assert.equal(typeof claim[f], "function", f);
  for (const f of ["checkVariantSafety", "baseTextSafe", "buildBaselineCensus"])
    assert.equal(typeof corpus[f], "function", f);
  for (const f of ["wrapScorer", "validateCaptureResult", "byoTargetBinding", "checkByoBinding"])
    assert.equal(typeof byo[f], "function", f);
  assert.ok(BUNDLE_KEYS.has("score_table"));
});

// tamper matrix over the REAL committed bundle (re-signed with the fixture key)
const priv = readFileSync(KEY, "utf8");
const base = {
  bundle: load("vda-attestation.json"),
  auditPrivate: load("vda-audit-private.json"),
  pinned: load("vda-pinned-key.json"),
};
const opts = { pinnedKeyFingerprint: base.pinned.key_fingerprint, auditPrivate: base.auditPrivate };
function tamper(mutate) {
  const b = structuredClone(base.bundle);
  mutate(b);
  b.signature = signBundle(contentOf(b), priv);
  return b;
}

test("tamper matrix on real evidence: representative codes fire in order", () => {
  assert.equal(
    evaluateVda(
      tamper((x) => (x.extra = 1)),
      opts
    ).raw,
    255
  );
  // mutate-without-resign -> 256
  const b256 = structuredClone(base.bundle);
  b256.detector.hf_revision = "x";
  assert.equal(evaluateVda(b256, opts).raw, 256);
  assert.equal(
    evaluateVda(
      tamper((x) => (x.capture_provenance.detector_revision = "x")),
      opts
    ).raw,
    257
  );
  assert.equal(
    evaluateVda(
      tamper((x) => (x.score_table.digest = "sha256:0")),
      opts
    ).raw,
    259
  );
  assert.equal(
    evaluateVda(
      tamper((x) => (x.evasions[0].threshold_crossing = !x.evasions[0].threshold_crossing)),
      opts
    ).raw,
    260
  );
  assert.equal(
    evaluateVda(
      tamper((x) => (x.evasion_threshold_curve[0].variants_flagged += 1)),
      opts
    ).raw,
    262
  );
  assert.equal(
    evaluateVda(
      tamper((x) => (x.analyst_note = "the detector is unsafe")),
      { ...opts, tier: "public" }
    ).raw,
    264
  );
  assert.equal(
    evaluateVda(
      tamper((x) => (x.capture_provenance.score_table_digest = "sha256:x")),
      opts
    ).raw,
    265
  );
  // drop a real slip from evasions -> 266 audit only, 0 public
  const dropped = tamper((x) => (x.evasions = x.evasions.slice(1)));
  assert.equal(evaluateVda(dropped, { ...opts, tier: "audit" }).raw, 266);
  assert.equal(evaluateVda(dropped, { ...opts, tier: "public" }).raw, 0);
  // fail-closed wrapper
  assert.equal(
    evaluateVdaSafe(base.bundle, { ...opts, tier: "audit", auditPrivate: { entries: [{ x: 1n }] } })
      .raw,
    267
  );
});

test("score-table digest is self-consistent (canonicalJson binding)", () => {
  const b = load("vda-attestation.json");
  assert.equal(b.score_table.digest, scoreTableDigest(b.score_table.entries));
});
