// SPDX-License-Identifier: AGPL-3.0-or-later
// Detector-v2 family map. STRONG families can corroborate an extraction decision;
// the CONTEXTUAL family (volume) can raise review context but never corroborates.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}

export const FAMILY_MAP_V2 = deepFreeze({
  structural: ["repetition_cluster", "template_prefix_cluster"],
  behavioural: ["cot_elicitation"],
  targeting: ["capability_targeting", "task_taxonomy_repeat"],
  coordination: ["hydra_cluster"],
  volume: ["volume_burst", "high_request_count"],
});

export const FAMILY_ORDER_V2 = Object.freeze([
  "structural",
  "behavioural",
  "targeting",
  "coordination",
  "volume",
]);
export const STRONG_FAMILIES = Object.freeze(["structural", "behavioural", "targeting", "coordination"]);
export const CONTEXTUAL_FAMILIES = Object.freeze(["volume"]);

export function signalToFamilyV2(signalId) {
  for (const fam of FAMILY_ORDER_V2) {
    if (FAMILY_MAP_V2[fam].includes(signalId)) return fam;
  }
  return null;
}

export function splitFamilies(firedSignalIds) {
  const fams = new Set();
  for (const s of firedSignalIds) {
    const f = signalToFamilyV2(s);
    if (f) fams.add(f);
  }
  const strong = STRONG_FAMILIES.filter((f) => fams.has(f));
  const contextual = CONTEXTUAL_FAMILIES.filter((f) => fams.has(f));
  return { strong, contextual };
}

export function familyMapDigestV2() {
  return sha256Hex(canonicalJson(FAMILY_MAP_V2));
}
