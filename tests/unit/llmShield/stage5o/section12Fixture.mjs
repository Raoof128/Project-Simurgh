// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §12 — a valid assembled-package builder (NOT a test file).
//
// Every mandatory section genuinely CARRIES the four subject identifiers, so each projects the
// authoritative subject by recomputation. A test mutates one identifier to drive check 6, which is
// what makes "No Assembled Stranger" testable at all.
import { randomBytes } from "node:crypto";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  MANDATORY_SECTION_KEYS,
  packageSubjectDigest,
} from "../../../../tools/simurgh-attestation/stage5o/core/packageSubject.mjs";
import {
  PACKAGE_SCHEMA_ID,
  LANES,
} from "../../../../tools/simurgh-attestation/stage5o/core/section12Verifier.mjs";
import { deterministicSalt } from "../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs";

export const SUBJECT_FIELDS = Object.freeze({
  stage5o_precommitment_digest: "1".repeat(64),
  closure_slot_id: "slot-0001",
  challenge_subject_digest: "2".repeat(64),
  challenge_record_digest: "3".repeat(64),
});

/** Fresh independent CSPRNG salts — never beacon-derived, never a public function of the key. */
export function laneBSalts() {
  const out = {};
  for (const k of MANDATORY_SECTION_KEYS) out[k] = randomBytes(32).toString("hex");
  return out;
}

const bodyFor = (key) => {
  switch (key) {
    case "stage5o/census_closure":
      return { census_closure_digest: "c".repeat(64) };
    case "stage5o/challenge":
      return { beacon_height: "2", ordered_selected_index_count: 8 };
    case "stage5o/openings":
      return { opening_count: 8 };
    case "stage5o/disclosure_ledger":
      return { presented_history_entries: 1, cumulative_unique_indices: 8 };
    case "stage5o/probability_claim":
      return { claim_type: "exact", probability_policy_digest: "d".repeat(64) };
    case "stage5o/verifier_receipts":
      return {
        receipts: Object.fromEntries(
          ["section7", "section8", "section9"].map((v, i) => [
            v,
            {
              verifier_id: `simurgh.vsc.${v}_verifier.v1`,
              verifier_contract_digest: String(i).repeat(64),
              input_artifact_digest: String(i + 4).repeat(64),
              accepted_subject_digest: SUBJECT_FIELDS.challenge_subject_digest,
              verdict: "ACCEPT",
              symbolic_reason: "accept",
              raw_code: 0,
              accepted_projection_digest: String(i + 6).repeat(64),
            },
          ])
        ),
      };
    default:
      return {};
  }
};

export function makeSection12Fixture({ lane = LANES.A, salts, ceilings } = {}) {
  const subjectFields = { ...SUBJECT_FIELDS };
  const sections = MANDATORY_SECTION_KEYS.map((key) => ({
    key,
    payload: { ...subjectFields, ...bodyFor(key) },
  }));
  const useSalts =
    salts ?? Object.fromEntries(MANDATORY_SECTION_KEYS.map((k) => [k, deterministicSalt(k)]));

  const pkg = { schema_id: PACKAGE_SCHEMA_ID, lane, sections, salts: useSalts };
  const raw = canonicalJson(pkg);
  const ctx = Object.freeze({
    package_subject_digest: packageSubjectDigest(subjectFields),
    max_package_transport_bytes: ceilings?.transport ?? 1 << 20,
    max_package_canonical_bytes: ceilings?.canonical ?? 1 << 19,
  });
  const projectedSections = sections.map((s) => {
    const [regime, section_id] = s.key.split("/");
    return { regime, section_id, ...s.payload };
  });
  return { pkg, raw, ctx, salts: useSalts, sections, projectedSections, subjectFields, lane };
}
