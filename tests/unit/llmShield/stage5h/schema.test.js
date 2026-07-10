// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { checkSchema } from "../../../../tools/simurgh-attestation/stage5h/core/schema.mjs";

const clone = (fx) => ({ ...fx, bundle: structuredClone(fx.bundle) });

test("valid bundle passes schema", () => {
  assert.deepEqual(checkSchema(ctxFor(validBundle())), { ok: true });
});

test("missing claims fails 300", () => {
  const fx = clone(validBundle());
  fx.bundle.claim_inventory.content.claims = [];
  const r = checkSchema(ctxFor(fx));
  assert.equal(r.raw, 300);
  assert.equal(r.reason, "empty_claims");
});

test("duplicate claim_id fails 300", () => {
  const fx = clone(validBundle());
  fx.bundle.claim_inventory.content.claims[1].claim_id =
    fx.bundle.claim_inventory.content.claims[0].claim_id;
  assert.equal(checkSchema(ctxFor(fx)).reason, "duplicate_claim_id");
});

test("embedded trust material fails 300", () => {
  const fx = clone(validBundle());
  fx.bundle.embedded_trust_material = { pin: "sneaky" };
  assert.equal(checkSchema(ctxFor(fx)).reason, "embedded_trust_material");
});

test("missing restriction on restricted claim fails 300", () => {
  const fx = clone(validBundle());
  delete fx.bundle.claim_inventory.content.claims[2].restriction;
  assert.equal(checkSchema(ctxFor(fx)).reason, "missing_restriction");
});

test("missing recompute on public claim fails 300", () => {
  const fx = clone(validBundle());
  delete fx.bundle.claim_inventory.content.claims[1].recompute;
  assert.equal(checkSchema(ctxFor(fx)).reason, "missing_recompute");
});

test("missing method_summary_digest on controlled claim fails 300", () => {
  const fx = clone(validBundle());
  delete fx.bundle.claim_inventory.content.claims[0].method_summary_digest;
  assert.equal(checkSchema(ctxFor(fx)).reason, "missing_method_summary_digest");
});

test("non-member enum value fails 300", () => {
  const fx = clone(validBundle());
  fx.bundle.claim_inventory.content.claims[0].declared_tier = "ultra";
  assert.equal(checkSchema(ctxFor(fx)).reason, "bad_declared_tier");
});

test("schema EXEMPTS scope presence — a scope-less claim still passes 300", () => {
  const fx = clone(validBundle());
  delete fx.bundle.claim_inventory.content.claims[2].scope_statement;
  assert.deepEqual(checkSchema(ctxFor(fx)), { ok: true });
});
