// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U verifier core (4U spec §8). Motto: AnthropicSafe First, then
// ReviewerSafe. Runs the FROZEN check order 119→132 and returns the first
// non-zero code. Public tier omits `engine`; audit tier supplies it to re-run
// each attack and catch 129. Verification layers (no helper returns a later-layer
// code early): L1 schema/sig 119,120 · L2 charter/scope/caps/manifest 121-124 ·
// L3 completeness 125,126 · L4 finding truth + ledger 127-131 · L5 fail-closed 132.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { verifyCharterShapeAndSignature, verifyManifestRoot, charterDigest } from "./charter.mjs";
import { validateFixture, bindsCharter, nonMaliceViolation } from "./attackModel.mjs";
import {
  validateFindingRecord,
  verifyFindingSignature,
  verifyLedger,
  verifyBypassSeverity,
  recomputeAsr,
} from "./findingLedger.mjs";
import { verifyFindingReport, verifyFindingReproduction } from "./dualSignal.mjs";

const GREEN = { raw: 0, reason: "green" };
const isRefusalClass = (c) => c === "model_refused" || c === "lane_disabled";

export function evaluateVrta(bundle, { pubKeyPem, findingPubKeyPem, engine, capBreaches } = {}) {
  const findingPub = findingPubKeyPem || pubKeyPem;
  // ---- L1: schema (119) + signatures (120) ----
  if (
    !bundle ||
    typeof bundle !== "object" ||
    !Array.isArray(bundle.attack_fixtures) ||
    !Array.isArray(bundle.finding_records) ||
    !Array.isArray(bundle.lane_b_capture) ||
    !bundle.charter
  ) {
    return { raw: 119, reason: "vrta_bundle_schema_invalid" };
  }
  for (const fx of bundle.attack_fixtures) {
    const v = validateFixture(fx);
    if (v.raw) return v;
  }
  for (const f of bundle.finding_records) {
    const v = validateFindingRecord(f);
    if (v.raw) return v;
  }
  const cres = verifyCharterShapeAndSignature(bundle.charter, { pubKeyPem }); // 119/120
  if (cres.raw) return cres;
  for (const f of bundle.finding_records) {
    const s = verifyFindingSignature(f, findingPub); // 120
    if (s.raw) return s;
  }
  // ---- L2: charter/scope/caps/manifest (121, 122, 123, 124) ----
  const cd = charterDigest(bundle.charter);
  for (const fx of bundle.attack_fixtures)
    if (!bindsCharter(fx, bundle.charter, cd))
      return { raw: 121, reason: "charter_unbound_attack", detail: { attack_id: fx.attack_id } };
  for (const fx of bundle.attack_fixtures) {
    const nm = nonMaliceViolation(fx);
    if (nm) return { raw: 122, reason: "non_malice_invariant_violated", detail: { attack_id: fx.attack_id, why: nm } };
  }
  if (Array.isArray(capBreaches) && capBreaches.length)
    return { raw: 123, reason: "live_lane_cap_exceeded", detail: { breaches: capBreaches } };
  const mres = verifyManifestRoot(bundle.charter); // 124 — AFTER 121/122/123
  if (mres.raw) return mres;
  // ---- L3: corpus/finding completeness (125, 126) ----
  const lres = verifyLedger(bundle.charter, bundle.attack_fixtures, bundle.finding_records);
  if (lres.raw) return lres;
  // ---- L4: finding truth (127/128 public; 129 audit) → 130 → 131 ----
  const fxById = new Map(bundle.attack_fixtures.map((f) => [f.attack_id, f]));
  for (const f of bundle.finding_records) {
    const rep = verifyFindingReport(f); // 127/128, no engine
    if (rep.raw) return { ...rep, detail: { ...(rep.detail || {}), attack_id: f.attack_id } };
  }
  if (typeof engine === "function") {
    for (const f of bundle.finding_records) {
      const fresh = isRefusalClass(f.outcome_class) ? null : engine(fxById.get(f.attack_id));
      const rep = verifyFindingReproduction(f, fresh); // 129
      if (rep.raw) return { ...rep, detail: { ...(rep.detail || {}), attack_id: f.attack_id } };
    }
  }
  // 130 — exact-rational ASR ledger must recompute.
  const { attack_success_rate } = recomputeAsr(bundle.finding_records);
  if (bundle.asr && canonicalJson(bundle.asr) !== canonicalJson(attack_success_rate))
    return { raw: 130, reason: "asr_ledger_mismatch", detail: { signed: bundle.asr, recomputed: attack_success_rate } };
  // 131 — bypass severity (L4 tail).
  const sev = verifyBypassSeverity(bundle.finding_records);
  if (sev.raw) return sev;
  return GREEN;
}

export function evaluateVrtaSafe(bundle, opts) {
  try {
    return evaluateVrta(bundle, opts);
  } catch (e) {
    return { raw: 132, reason: "internal_fail_closed", detail: { error: String(e && e.message) } };
  }
}
