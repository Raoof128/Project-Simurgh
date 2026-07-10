import test from "node:test";
import assert from "node:assert/strict";
import { validBundle, validCensus, resign } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { sigstoreKernelRunner } from "../../../../tools/simurgh-attestation/stage5g/node/sigstoreKernelRunner.mjs";
import {
  evaluateForeignCapture,
  evaluateForeignCaptureSafe,
} from "../../../../tools/simurgh-attestation/stage5g/core/vfcCore.mjs";

test("valid rung-1, default policy → raw 0 with the full honest result shape", () => {
  const r = evaluateForeignCapture(validBundle({ rung: "challenge_bound" }), ctxFor());
  assert.equal(r.raw, 0);
  assert.equal(r.proven_rung, "challenge_bound");
  assert.equal(r.record_authentic, true);
  assert.equal(r.attestation_valid, true);
  assert.equal(r.policy_accepted, true);
  assert.equal(r.audit_census_verified, false); // public tier cannot masquerade as audit
});

test("valid rung-2 under audit tier → externally_anchored + census + anchor verified", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = ctxFor({ tier: "audit", auditCensus: validCensus({ rung: "externally_anchored" }) });
  ctx.kernelResult = sigstoreKernelRunner(b.anchor_evidence);
  const r = evaluateForeignCapture(b, ctx);
  assert.equal(r.raw, 0);
  assert.equal(r.proven_rung, "externally_anchored");
  assert.equal(r.audit_census_verified, true);
  assert.equal(r.rung2_anchor_verified, true);
});

test("honest rung-0 + default policy → 298, valid record, policy rejected, anchor checks NEVER run", () => {
  const b = validBundle({ rung: "distinct_key_only" });
  const ctx = ctxFor();
  let touched = 0;
  Object.defineProperty(ctx, "trustRootAllowlist", {
    get() {
      touched++;
      return [];
    },
  });
  const r = evaluateForeignCapture(b, ctx);
  assert.equal(r.raw, 298);
  assert.equal(r.attestation_valid, true);
  assert.equal(r.policy_accepted, false);
  assert.equal(r.proven_rung, "distinct_key_only");
  assert.equal(touched, 0, "rung-2 trust config must not be touched for a rung-1/0 bundle");
});

test("overclaim: rung-1 evidence claiming externally_anchored → 296", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.separation_claim.claimed_rung = "externally_anchored";
  const r = evaluateForeignCapture(resign(b), ctxFor());
  assert.equal(r.raw, 296);
  assert.equal(r.claimed_rung, "externally_anchored");
  assert.equal(r.proven_rung, "challenge_bound");
});

test("tampered attestation (no resign) → 284, record not authentic", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.separation_claim.claimed_rung = "distinct_key_only"; // mutate, do NOT resign
  const r = evaluateForeignCapture(b, ctxFor());
  assert.equal(r.raw, 284);
  assert.equal(r.record_authentic, false);
});

test("schema failure wins the frozen order over a later fault", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.surprise = 1; // schema (283)
  b.separation_claim.claimed_rung = "externally_anchored"; // would be 296 later
  assert.equal(evaluateForeignCapture(b, ctxFor()).raw, 283);
});

test("anchor present but kernel result missing → 299 (fail closed, never open)", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = ctxFor(); // ctx.kernelResult stays null
  assert.equal(evaluateForeignCapture(b, ctx).raw, 299);
});

test("Safe wrapper turns a thrown error into 299, never open", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = ctxFor();
  ctx.kernelResult = sigstoreKernelRunner(b.anchor_evidence);
  Object.defineProperty(ctx, "trustRootAllowlist", {
    get() {
      throw new Error("boom");
    },
  });
  const r = evaluateForeignCaptureSafe(b, ctx);
  assert.equal(r.raw, 299);
  assert.equal(r.attestation_valid, false);
  assert.equal(r.policy_accepted, null);
});
