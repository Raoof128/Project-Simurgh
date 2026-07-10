// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the spine: check-major walk, 16-code tamper matrix, fail-closed 315, result shape.
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle, resign, resignAttestationOnly } from "./_validBundle.mjs";
import {
  evaluateDisclosure,
  evaluateDisclosureSafe,
} from "../../../../tools/simurgh-attestation/stage5h/core/vsdCore.mjs";

const clone = (fx) => ({ ...fx, bundle: structuredClone(fx.bundle) });
// evaluate takes (bundle, ctx-without-bundle)
function run(fx, over = {}) {
  const ctx = {
    pin: fx.pin,
    hostRegistry: fx.hostRegistry,
    recipes: fx.recipes,
    artefactBytes: fx.artefacts,
    recomputeResult: fx.recomputeResult,
    tier: "public",
    ...over,
  };
  return evaluateDisclosure(fx.bundle, ctx);
}

test("valid bundle → raw 0 both tiers, honest result shape", () => {
  const fx = validBundle();
  const pub = run(fx);
  assert.equal(pub.raw, 0);
  assert.equal(pub.record_authentic, true);
  assert.equal(pub.attestation_valid, true);
  assert.equal(pub.verdict_table.length, 3);
  assert.equal(pub.inventory_census_verified, null); // public tier
  assert.equal(pub.policy_evaluated, true);
  assert.equal(pub.policy_accepted, true);
  assert.equal(pub.trust_reason, "ok");

  const aud = run(fx, { tier: "audit" });
  assert.equal(aud.raw, 0);
  assert.equal(aud.inventory_census_verified, true);
});

test("record_authentic false ⇒ verdict_table [] (301 tamper)", () => {
  const fx = clone(validBundle());
  fx.bundle.attestation_signature = Buffer.from("no").toString("base64");
  const r = run(fx);
  assert.equal(r.raw, 301);
  assert.equal(r.record_authentic, false);
  assert.deepEqual(r.verdict_table, []);
  assert.equal(r.policy_evaluated, false);
  assert.equal(r.policy_accepted, null);
});

test("full 16-code tamper matrix through the pure core", () => {
  const base = validBundle();
  // 300
  {
    const f = clone(base);
    f.bundle.claim_inventory.content.claims = [];
    assert.equal(run(f).raw, 300);
  }
  // 301
  {
    const f = clone(base);
    f.pin = null;
    assert.equal(run(f).raw, 301);
  }
  // 302 — resign so the attestation stays valid (301 passes) and 302 catches the identity binding
  {
    const f = clone(base);
    f.bundle.claim_inventory.content.producer_identity_digest = "sha256:00";
    resign(f.bundle, base.keys);
    assert.equal(run(f).raw, 302);
  }
  // 303 — verdict_table is inside the attestation; resign so 301 passes and 303 catches membership
  {
    const f = clone(base);
    f.bundle.verdict_table[0].claim_id = "ghost";
    resignAttestationOnly(f.bundle, base.keys);
    assert.equal(run(f).raw, 303);
  }
  // 304
  {
    const f = clone(base);
    delete f.bundle.claim_inventory.content.claims[2].scope_statement;
    resign(f.bundle, base.keys);
    assert.equal(run(f).raw, 304);
  }
  // 305
  {
    const f = clone(base);
    f.bundle.claim_inventory.content.claims[1].artefact_manifest.present = [];
    resign(f.bundle, base.keys);
    assert.equal(run(f).raw, 305);
  }
  // 306 — add an untyped redaction to the receipt-less PUBLIC claim (tampering claims[0] would
  // change its digest and trip 303 via the stale receipt instead)
  {
    const f = clone(base);
    f.bundle.claim_inventory.content.claims[1].artefact_manifest.withheld.push({
      artefact_id: "extra",
      available_at_tier: "controlled",
    });
    resign(f.bundle, base.keys);
    assert.equal(run(f).raw, 306);
  }
  // 307
  {
    const f = clone(base);
    const arte = structuredClone(base.artefacts);
    arte["eval-results"].rows[0].value = "0.11";
    assert.equal(run(f, { artefactBytes: arte }).raw, 307);
  }
  // 308
  {
    const f = clone(base);
    assert.equal(run(f, { hostRegistry: [] }).raw, 308);
  }
  // 309 — bad host sig, but resign the OUTER attestation only (leave the broken receipt) → 309
  {
    const f = clone(base);
    f.bundle.review_receipts[0].host_signature = Buffer.from("x").toString("base64");
    resignAttestationOnly(f.bundle, base.keys);
    assert.equal(run(f).raw, 309);
  }
  // 310
  {
    const f = clone(base);
    f.bundle.claim_inventory.content.claims[1].recompute.recipe_digest = "sha256:00";
    resign(f.bundle, base.keys);
    assert.equal(run(f).raw, 310);
  }
  // 311
  {
    const f = clone(base);
    f.bundle.review_receipts[0].content.verdict = "not_reproduced";
    resign(f.bundle, base.keys);
    assert.equal(run(f).raw, 311);
  }
  // 312
  {
    const f = clone(base);
    f.bundle.claim_inventory.content.claims[2].declared_consequence = "threshold_crossing";
    resign(f.bundle, base.keys);
    assert.equal(run(f).raw, 312);
  }
  // 313 (audit only): committed-table drift — resign the attestation so 301 passes
  {
    const f = clone(base);
    f.bundle.verdict_table[0].proven_tier = "public";
    resignAttestationOnly(f.bundle, base.keys);
    assert.equal(run(f, { tier: "audit" }).raw, 313);
  }
  // 314 policy
  {
    const strict = {
      min_tier_for: {
        contextual: "restricted",
        supporting: "controlled",
        threshold_crossing: "public",
      },
    };
    assert.equal(run(base, { policy: strict }).raw, 314);
  }
  // 315 env: public claim, no recompute result
  {
    assert.equal(run(base, { recomputeResult: null }).raw, 315);
  }
});

test("315 registry undefined (never supplied) vs 308 supplied-empty", () => {
  const fx = validBundle();
  assert.equal(run(fx, { hostRegistry: undefined }).raw, 315);
  assert.equal(run(fx, { hostRegistry: [] }).raw, 308);
});

test("check-major order: claim-2 fails 304 AND claim-0 fails 312 → 304 wins", () => {
  const fx = clone(validBundle());
  delete fx.bundle.claim_inventory.content.claims[2].scope_statement; // 304
  fx.bundle.claim_inventory.content.claims[0].declared_consequence = "threshold_crossing"; // harmless here
  resign(fx.bundle, validBundle().keys);
  assert.equal(run(fx).raw, 304);
});

test("truthful restricted-only bundle → raw 0; strict policy → 314", () => {
  // reduce to just the restricted claim
  const fx = clone(validBundle());
  const claims = fx.bundle.claim_inventory.content.claims;
  fx.bundle.claim_inventory.content.claims = [claims[2]];
  fx.bundle.review_receipts = [];
  fx.bundle.verdict_table = fx.bundle.verdict_table.filter(
    (r) => r.claim_id === "frontier7b-monitoring-context"
  );
  fx.bundle.artefacts_ref = [];
  resign(fx.bundle, validBundle().keys);
  const r = run(fx, { recomputeResult: null, hostRegistry: undefined });
  assert.equal(r.raw, 0);
  // strict policy requiring supporting≥controlled does not touch a contextual claim → still 0
  const strict = {
    min_tier_for: {
      contextual: "controlled",
      supporting: "controlled",
      threshold_crossing: "public",
    },
  };
  assert.equal(
    run(fx, { recomputeResult: null, hostRegistry: undefined, policy: strict }).raw,
    314
  );
});

test("Safe wrapper never throws → 315 on internal error", () => {
  // a null bundle is a clean 300 (bundle_missing), not a throw
  assert.equal(evaluateDisclosureSafe(null, {}).raw, 300);
  // force a genuine internal throw: recomputeResult whose property access throws
  const fx = validBundle();
  const throwing = new Proxy(
    {},
    {
      get() {
        throw new Error("boom");
      },
    }
  );
  const r = evaluateDisclosureSafe(fx.bundle, {
    pin: fx.pin,
    hostRegistry: fx.hostRegistry,
    recipes: fx.recipes,
    artefactBytes: fx.artefacts,
    recomputeResult: throwing,
  });
  assert.equal(r.raw, 315);
  assert.equal(r.attestation_valid, false);
  assert.equal(r.trust_reason.reason, "internal_error_fail_closed");
});
