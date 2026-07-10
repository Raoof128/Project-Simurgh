// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — check modules 301–310 (Tasks 6–12). Each case tampers ONE thing from the valid fixture.
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle, resign, claimDigest } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { checkAttestationTrust } from "../../../../tools/simurgh-attestation/stage5h/core/attestationTrust.mjs";
import { checkInventorySignature } from "../../../../tools/simurgh-attestation/stage5h/core/inventorySignature.mjs";
import { checkInventoryMembership } from "../../../../tools/simurgh-attestation/stage5h/core/inventoryMembership.mjs";
import { checkScopeBinding } from "../../../../tools/simurgh-attestation/stage5h/core/scopeBinding.mjs";
import {
  checkArtefactAccounting,
  checkRedactionTyping,
  checkArtefactDigests,
} from "../../../../tools/simurgh-attestation/stage5h/core/artefactLedger.mjs";
import {
  checkReviewHostPinned,
  checkReviewReceipt,
} from "../../../../tools/simurgh-attestation/stage5h/core/reviewReceipt.mjs";
import { checkRecipeIntegrity } from "../../../../tools/simurgh-attestation/stage5h/core/recompute.mjs";

const clone = (fx) => ({ ...fx, bundle: structuredClone(fx.bundle) });

// ---- Task 6: 301 ----
test("301 valid passes; pin missing / mismatch / bad sig fail", () => {
  const fx = validBundle();
  assert.deepEqual(checkAttestationTrust(ctxFor(fx)), { ok: true });
  assert.equal(checkAttestationTrust(ctxFor(fx, { pin: null })).reason, "external_pin_missing");
  const badPin = { ...fx.pin, key_fingerprint: "sha256:00" };
  assert.equal(checkAttestationTrust(ctxFor(fx, { pin: badPin })).reason, "external_pin_mismatch");
  const f2 = clone(fx);
  f2.bundle.attestation_signature = Buffer.from("nope").toString("base64");
  assert.equal(checkAttestationTrust(ctxFor(f2)).reason, "attestation_signature_invalid");
});

// ---- Task 7: 302 ----
test("302 producer sig, identity binding, digest", () => {
  const fx = validBundle();
  assert.deepEqual(checkInventorySignature(ctxFor(fx)), { ok: true });
  const f1 = clone(fx);
  f1.bundle.claim_inventory.producer_signature = Buffer.from("x").toString("base64");
  assert.equal(checkInventorySignature(ctxFor(f1)).reason, "inventory_signature_invalid");
  const f2 = clone(fx);
  f2.bundle.claim_inventory.content.producer_identity_digest = "sha256:00";
  assert.equal(checkInventorySignature(ctxFor(f2)).reason, "producer_identity_binding");
});

// ---- Task 8: 303 (incl. the Maverick fixture) ----
test("303 membership + Maverick scope-swap lands here", () => {
  const fx = validBundle();
  assert.deepEqual(checkInventoryMembership(ctxFor(fx)), { ok: true });
  const f1 = clone(fx);
  f1.bundle.verdict_table[0].claim_id = "ghost";
  assert.equal(checkInventoryMembership(ctxFor(f1)).reason, "verdict_row_outside_inventory");
  // The Maverick fixture: swap the CBRN claim's checkpoint_kind and resign everything. resign()
  // re-signs the receipt but keeps its claim_digest, which now matches NO claim (scope changed the
  // claim digest) → 303. The evaluated checkpoint is not the released checkpoint.
  const mav = clone(fx);
  mav.bundle.claim_inventory.content.claims[0].scope_statement.checkpoint_kind =
    "production_configuration";
  const beforeDigest = mav.bundle.review_receipts[0].content.claim_digest;
  resign(mav.bundle, fx.keys);
  assert.equal(mav.bundle.review_receipts[0].content.claim_digest, beforeDigest); // stale by design
  assert.equal(checkInventoryMembership(ctxFor(mav)).reason, "receipt_claim_not_in_inventory");
});

// ---- Task 9: 304 ----
test("304 scope presence (schema exempts it)", () => {
  const fx = validBundle();
  assert.deepEqual(checkScopeBinding(ctxFor(fx)), { ok: true });
  const f1 = clone(fx);
  delete f1.bundle.claim_inventory.content.claims[2].scope_statement;
  assert.equal(checkScopeBinding(ctxFor(f1)).raw, 304);
  const f2 = clone(fx);
  delete f2.bundle.claim_inventory.content.claims[0].scope_statement.environment;
  assert.equal(checkScopeBinding(ctxFor(f2)).reason, "scope_incomplete");
});

// ---- Task 10: 305/306/307 ----
test("305 accounting, 306 typing, 307 digests", () => {
  const fx = validBundle();
  assert.deepEqual(checkArtefactAccounting(ctxFor(fx)), { ok: true });
  assert.deepEqual(checkRedactionTyping(ctxFor(fx)), { ok: true });
  assert.deepEqual(checkArtefactDigests(ctxFor(fx)), { ok: true });

  // 305: recipe input dropped from both ledgers
  const f1 = clone(fx);
  f1.bundle.claim_inventory.content.claims[1].artefact_manifest.present = [];
  assert.equal(checkArtefactAccounting(ctxFor(f1)).reason, "artefact_unaccounted");
  // 305: overlap
  const f1b = clone(fx);
  f1b.bundle.claim_inventory.content.claims[0].artefact_manifest.withheld.push({
    artefact_id: "redteam-summary",
    justification_type: "safety_hazard",
    available_at_tier: "controlled",
    reason: "x",
  });
  assert.equal(checkArtefactAccounting(ctxFor(f1b)).reason, "artefact_in_both_ledgers");
  // 306: untyped redaction
  const f2 = clone(fx);
  delete f2.bundle.claim_inventory.content.claims[0].artefact_manifest.withheld[0]
    .justification_type;
  assert.equal(checkRedactionTyping(ctxFor(f2)).raw, 306);
  // 307: perturbed present bytes
  const f3 = clone(fx);
  const arte = structuredClone(fx.artefacts);
  arte["eval-results"].rows[0].value = "0.99";
  assert.equal(
    checkArtefactDigests(ctxFor(f3, { artefactBytes: arte })).reason,
    "artefact_digest_mismatch"
  );
});

// ---- Task 11: 308/309 ----
test("308 host pin, 309 receipt authenticity, not_reproduced is valid", () => {
  const fx = validBundle();
  assert.deepEqual(checkReviewHostPinned(ctxFor(fx)), { ok: true });
  assert.deepEqual(checkReviewReceipt(ctxFor(fx)), { ok: true });
  // 308: supplied-but-empty registry
  assert.equal(
    checkReviewHostPinned(ctxFor(fx, { hostRegistry: [] })).reason,
    "review_host_unpinned"
  );
  // 309: host sig bit-flip
  const f1 = clone(fx);
  f1.bundle.review_receipts[0].host_signature = Buffer.from("x").toString("base64");
  assert.equal(checkReviewReceipt(ctxFor(f1)).reason, "receipt_signature_invalid");
  // 309: inventory_digest mismatch
  const f2 = clone(fx);
  f2.bundle.review_receipts[0].content.inventory_digest = "sha256:00";
  assert.equal(checkReviewReceipt(ctxFor(f2)).reason, "receipt_inventory_mismatch");
  // not_reproduced is a VALID receipt (re-sign it) — never 309
  const f3 = clone(fx);
  f3.bundle.review_receipts[0].content.verdict = "not_reproduced";
  resign(f3.bundle, fx.keys);
  assert.deepEqual(checkReviewReceipt(ctxFor(f3)), { ok: true });
});

// ---- Task 12: 310 ----
test("310 recipe integrity only", () => {
  const fx = validBundle();
  assert.deepEqual(checkRecipeIntegrity(ctxFor(fx)), { ok: true });
  // recipe digest mismatch (tamper the committed digest)
  const f1 = clone(fx);
  f1.bundle.claim_inventory.content.claims[1].recompute.recipe_digest = "sha256:00";
  assert.equal(checkRecipeIntegrity(ctxFor(f1)).reason, "recipe_digest_mismatch");
  // constant-output form: empty inputs
  const f2 = clone(fx);
  const recipes = structuredClone(fx.recipes);
  recipes["frontier7b-harmbench-public"].input_artefact_ids = [];
  // must re-commit the digest so we reach the constant check, not digest_mismatch
  f2.bundle.claim_inventory.content.claims[1].recompute.recipe_digest = digestOf(
    recipes["frontier7b-harmbench-public"]
  );
  assert.equal(checkRecipeIntegrity(ctxFor(f2, { recipes })).reason, "constant_output_recipe");
  // input not in present[]
  const f3 = clone(fx);
  const recipes3 = structuredClone(fx.recipes);
  recipes3["frontier7b-harmbench-public"].input_artefact_ids = ["ghost"];
  f3.bundle.claim_inventory.content.claims[1].recompute.recipe_digest = digestOf(
    recipes3["frontier7b-harmbench-public"]
  );
  assert.equal(
    checkRecipeIntegrity(ctxFor(f3, { recipes: recipes3 })).reason,
    "recipe_input_not_present"
  );
});

import { domainDigest } from "../../../../tools/simurgh-attestation/stage5h/core/digests.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5h/constants.mjs";
function digestOf(recipe) {
  return domainDigest(DOMAIN.recompute_recipe, recipe);
}
