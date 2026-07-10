// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — browser PORTABLE verifier (plan Task 20). Pure, DOM-free (importable in Node for the
// parity net). Covers ONLY the portable surface: schema id, structural shape, lexical verdict compare.
// It CANNOT run adapter replay (276), historical verifiers (278), or the audit census (280), so it
// returns raw:null with an explicit capability set — a browser result must NEVER read as a full raw:0.
const SCORE_RE = /^(0\.\d{4}|1\.0{4})$/;
const scoreGte = (a, b) => {
  if (!SCORE_RE.test(a) || !SCORE_RE.test(b)) throw new Error("invalid score");
  return a >= b; // lexical, exact for equal-width [0,1] decimals
};

export function portableVerify(bundle) {
  const result = {
    verification_scope: "portable",
    portable_valid: false,
    full_attestation_status: "not_evaluated",
    historical_verifier_execution: false,
    audit_census_verified: false,
    raw: null,
  };
  try {
    if (bundle?.schema !== "simurgh.vmp.panel_attestation.v1") return result;
    if (!Array.isArray(bundle.roster) || bundle.roster.length === 0) return result;
    if (!Array.isArray(bundle.cells)) return result;
    const sem = new Map(bundle.roster.map((m) => [m.member_id, m]));
    for (const cell of bundle.cells) {
      if (cell.status !== "evaluated") continue;
      const m = sem.get(cell.member_id);
      if (m?.decision_semantics !== "binary_malicious_softmax") continue;
      const de = cell.decision_evidence;
      const expected = scoreGte(de.positive_score, de.threshold)
        ? m.positive_label
        : m.label_map[String(1 - m.positive_class_index)];
      if (de.label !== expected) return result;
    }
    result.portable_valid = true;
    return result;
  } catch {
    return result;
  }
}
