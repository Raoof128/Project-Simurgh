// SPDX-License-Identifier: AGPL-3.0-or-later
// Frozen signal-family map. Distinct-FAMILY counting prevents one phenomenon from
// masquerading as corroboration. FAMILY_ORDER fixes emission order for byte-identity.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}

export const FAMILY_MAP = deepFreeze({
  structural: ["repetition_cluster", "template_prefix_cluster"],
  behavioural: ["cot_elicitation"],
  targeting: ["capability_targeting", "task_taxonomy_repeat"],
  coordination: ["hydra_cluster"],
  volume: ["volume_burst", "high_request_count"],
});

export const FAMILY_ORDER = Object.freeze([
  "structural",
  "behavioural",
  "targeting",
  "coordination",
  "volume",
]);

export function signalToFamily(signalId) {
  for (const fam of FAMILY_ORDER) {
    if (FAMILY_MAP[fam].includes(signalId)) return fam;
  }
  return null;
}

export function distinctFamilies(firedSignalIds) {
  const fams = new Set();
  for (const s of firedSignalIds) {
    const f = signalToFamily(s);
    if (f) fams.add(f);
  }
  return FAMILY_ORDER.filter((f) => fams.has(f));
}

export function familyMapDigest() {
  return sha256Hex(canonicalJson(FAMILY_MAP)); // sha256Hex already prefixes; never double-prefix
}
