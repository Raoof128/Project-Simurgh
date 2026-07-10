// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC pure evaluator. Presence-driven conditional model; computes the strongest proven rung
// and rejects unsupported upgrades. PURE: it NEVER runs the Sigstore kernel — the Node orchestrator
// populates ctx.kernelResult; a required-but-missing kernel result fails closed to 299. Never fails open.
import { DEFAULT_MIN_RUNG, rungGte } from "../constants.mjs";
import { checkSchema } from "./schema.mjs";
import { checkAttestationTrust } from "./attestationTrust.mjs";
import { checkChallengeReceipt } from "./challengeReceipt.mjs";
import { checkProducerTranscript } from "./producerTranscript.mjs";
import { checkCaptureDigest } from "./captureDigest.mjs";
import { checkKeySeparation } from "./keySeparation.mjs";
import { checkChallengeBinding } from "./challengeBinding.mjs";
import { checkSubjectSeparation } from "./subjectSeparation.mjs";
import { checkAnchorBinding } from "./anchorBinding.mjs";
import { rungLattice } from "./rungLattice.mjs";
import { overclaim } from "./overclaim.mjs";
import { checkCensus } from "./census.mjs";
import { checkPolicy } from "./policy.mjs";

const STRUCTURAL_FAIL = new Set([283, 284, 285, 286, 287]);

export function evaluateForeignCapture(bundle, ctx) {
  ctx = ctx ?? {};
  ctx.diag = ctx.diag ?? {};
  const minRung = ctx.minRung ?? DEFAULT_MIN_RUNG;
  const tier = ctx.tier ?? "public";
  const claimed = bundle?.separation_claim?.claimed_rung ?? null;

  const finish = (raw, proven, extras = {}) => ({
    raw,
    tier,
    record_authentic: !STRUCTURAL_FAIL.has(raw),
    attestation_valid: raw === 0 || raw === 298,
    claimed_rung: claimed,
    proven_rung: proven,
    minimum_required_rung: minRung,
    policy_evaluated: !ctx.attestationOnly,
    policy_accepted: ctx.attestationOnly ? null : raw === 0 ? true : raw === 298 ? false : null,
    audit_census_verified: extras.audit_census_verified ?? false,
    rung2_anchor_verified: extras.rung2_anchor_verified ?? false,
    trust_reason: ctx.diag.trust_reason ?? null,
  });

  // 283–289 (285 only if a receipt is present; the module self-gates).
  for (const chk of [
    () => checkSchema(bundle),
    () => checkAttestationTrust(bundle, ctx),
    () => checkChallengeReceipt(bundle),
    () => checkProducerTranscript(bundle),
    () => checkCaptureDigest(bundle),
    () => checkKeySeparation(bundle),
  ]) {
    const r = chk();
    if (r !== null) return finish(r, null);
  }

  const predicates = { challengeBound: false, anchorValid: false, subjectDistinct: false };

  // Challenge binding: run only when a binding digest is present.
  const bindingPresent = bundle.producer_transcript.content.challenge_record_digest !== undefined;
  if (bindingPresent) {
    const r = checkChallengeBinding(bundle, ctx);
    if (r !== null) return finish(r, null);
    predicates.challengeBound = true;
  }

  // Anchor: run 292–295 only when anchor evidence is present. Never touch the kernel otherwise.
  const anchorPresent = bundle.anchor_evidence !== undefined;
  if (anchorPresent) {
    if (ctx.kernelResult == null) return finish(299, null); // orchestrator must have run the kernel
    for (const chk of [
      () => checkSubjectSeparation(bundle, ctx),
      () => checkAnchorBinding(bundle, ctx),
    ]) {
      const r = chk();
      if (r !== null) return finish(r, null);
    }
    predicates.subjectDistinct = true;
    predicates.anchorValid = true;
  }

  const proven = rungLattice(predicates);

  const oc = overclaim(claimed, proven);
  if (oc !== null) return finish(oc, proven, { rung2_anchor_verified: anchorPresent });

  let audit_census_verified = false;
  if (tier === "audit") {
    const r = checkCensus(bundle, ctx);
    if (r !== null) return finish(r, proven, { rung2_anchor_verified: anchorPresent });
    audit_census_verified = true;
  }

  const pol = checkPolicy(proven, ctx);
  if (pol !== null)
    return finish(pol, proven, { audit_census_verified, rung2_anchor_verified: anchorPresent });

  return finish(0, proven, { audit_census_verified, rung2_anchor_verified: anchorPresent });
}

export function evaluateForeignCaptureSafe(bundle, ctx) {
  try {
    return evaluateForeignCapture(bundle, ctx);
  } catch {
    return {
      raw: 299,
      tier: ctx?.tier ?? "public",
      record_authentic: false,
      attestation_valid: false,
      claimed_rung: bundle?.separation_claim?.claimed_rung ?? null,
      proven_rung: null,
      minimum_required_rung: ctx?.minRung ?? DEFAULT_MIN_RUNG,
      policy_evaluated: !ctx?.attestationOnly,
      policy_accepted: null,
      audit_census_verified: false,
      rung2_anchor_verified: false,
      trust_reason: ctx?.diag?.trust_reason ?? null,
    };
  }
}
