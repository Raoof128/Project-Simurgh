// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — dispatch + frozen spine. projectToFiveL WHITELISTS the known 5L bundle keys (G-I) so no v2 or
// future field can reach the frozen core. The core (vtcqVerify, injected as run5L) runs first over the
// projection; any nonzero code (incl. 383) propagates unchanged (frozenCorePreserved). Then the extension
// 384→385→386→387→388→389→390→391→392→394→393. 395 is the OUTER boundary around the whole thing.
import { checkV2Schema } from "./schema.mjs";
import { checkRekorSeat } from "./rekorSeat.mjs";
import { checkCrossSeat, checkDistinctEcologies } from "./crossSeat.mjs";
import { checkState, stateFields } from "./state.mjs";
import { R, OK } from "./result.mjs";
import { ENVELOPE_SCHEMA } from "../constants.mjs";

const FIVE_L_KEYS = [
  "schema_version",
  "campaign_id",
  "commitment_session_id",
  "ceremony_id",
  "vuc",
  "ceremony_contract",
  "review_window",
  "anchor_policy",
  "quorum_policy",
  "trust_domain_registry",
  "declared_release_surface",
  "anchors",
  "review_access_authorisation_receipt",
  "declared_releases",
  "projections",
  "reserved_slots",
  "signatures",
];

export function projectToFiveL(bundle) {
  const out = {};
  for (const k of FIVE_L_KEYS) if (k in bundle) out[k] = bundle[k];
  return out;
}

function runExtension(bundle, facts5M) {
  const steps = [
    () => checkV2Schema(bundle),
    () => checkRekorSeat(facts5M),
    () => checkCrossSeat(facts5M),
    () => checkDistinctEcologies(facts5M),
    () => checkState(facts5M),
  ];
  for (const s of steps) {
    const r = s();
    if (r) return r;
  }
  return OK(stateFields(facts5M));
}

export function dispatchVtcQuorum(bundle, { facts5L, facts5M, cfg5L, tier = "public", run5L }) {
  try {
    const marker = bundle?.envelope_schema;
    if (marker === undefined || marker === null) {
      return run5L(bundle, cfg5L, facts5L, { tier }); // v1 route, unchanged (v1Unreinterpreted)
    }
    const c = run5L(projectToFiveL(bundle), cfg5L, facts5L, { tier });
    if (c.raw !== 0) return c; // frozenCorePreserved; 383 propagates
    if (marker !== ENVELOPE_SCHEMA) return R(384, "unknown_envelope_schema"); // ran core, then 384
    return runExtension(bundle, facts5M);
  } catch (e) {
    return R(395, "internal_or_env_unavailable", { error: String(e) });
  }
}
