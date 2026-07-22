// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §12.7/§12.8 — the assembled-package verifier.
//
// Two layers, deliberately separated:
//   verifySection12Package  -> Section 12's seven symbolic reasons
//   verifySection12View     -> requires an ACCEPTED package, then delegates consistency and
//                              redaction semantics to the SHIPPED Stage 4T view verifier, whose
//                              codes 148 and 149 propagate UNCHANGED (no alias, no renumbering)
//
// Section 12 defines symbolic reasons only; Section 10 remains the sole numeric allocator (A24) and
// the mapping is imported, never restated here.
//
// The package carries NO producer-declared capsule root: the verifier computes it with Stage 4T's
// own `capsuleRoot` under A17's pinned `stage4t_package_adapter_profile`. A value a producer cannot
// declare is a value a producer cannot forge.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { RAW_VERIFIER_CODES } from "../../stage4h/exitCodes.mjs";
import {
  capsuleRoot,
  deriveCommitments,
  verifyViewAgainstCommitments,
} from "../../stage4t/core/viewCore.mjs";
import {
  MANDATORY_SECTION_KEYS,
  projectSectionSubject,
  registryVerdict,
} from "./packageSubject.mjs";
import { LANES, laneVerdict } from "./laneProfile.mjs";

export const PACKAGE_SCHEMA_ID = "simurgh.vsc.presented_evidence_package.v1";

/** Symbolic check identifiers — prose names checks by identity, never by ordinal. */
export const SECTION12_CHECK_IDS = Object.freeze([
  "s12_check.transport_ceiling",
  "s12_check.canonical_encoding",
  "s12_check.canonical_ceiling",
  "s12_check.package_shape",
  "s12_check.section_registry",
  "s12_check.challenge_binding",
  "s12_check.lane_declaration",
]);

/** The frozen first-failure order. Section 10 assigns the numbers; this file owns only the symbols. */
export const SECTION12_FIRST_FAILURE_ORDER = Object.freeze([
  "s12_package_transport_oversize",
  "s12_noncanonical",
  "s12_package_canonical_oversize",
  "s12_package_shape",
  "s12_section_registry_mismatch",
  "s12_challenge_binding_mismatch",
  "s12_lane_declaration_invalid",
]);

const PACKAGE_KEYS = ["schema_id", "lane", "sections", "salts"];
const reject = (n) => ({
  accept: false,
  reason: SECTION12_FIRST_FAILURE_ORDER[n - 1],
  check: n,
});

/**
 * The §12 package relation. Returns { accept, capsule_root, commitments, package_subject } on
 * success, or the FIRST failure with its symbolic reason and one-based check index.
 */
export function verifySection12Package(section12AuthorityContext, packageRaw) {
  const ctx = section12AuthorityContext;
  if (ctx === null || typeof ctx !== "object" || typeof ctx.package_subject_digest !== "string") {
    throw new TypeError("verifySection12Package_requires_authority_context");
  }
  if (typeof packageRaw !== "string") throw new TypeError("section12_package_raw_string");

  // --- 1. raw transport ceiling: the only pre-parse ceiling, resolved from the trusted context.
  if (Buffer.byteLength(packageRaw, "utf8") > ctx.max_package_transport_bytes) return reject(1);

  // --- 2. canonical encoding.
  let pkg;
  try {
    pkg = JSON.parse(packageRaw);
  } catch {
    return reject(2);
  }
  if (pkg === null || typeof pkg !== "object" || Array.isArray(pkg)) return reject(2);
  let canonical;
  try {
    canonical = canonicalJson(pkg);
  } catch {
    return reject(2);
  }
  if (canonical !== packageRaw) return reject(2);

  // --- 3. canonical ceiling.
  if (Buffer.byteLength(canonical, "utf8") > ctx.max_package_canonical_bytes) return reject(3);

  // --- 4. exact-key shape.
  const keys = Object.keys(pkg).sort();
  if (
    keys.length !== PACKAGE_KEYS.length ||
    keys.some((k, i) => k !== [...PACKAGE_KEYS].sort()[i])
  ) {
    return reject(4);
  }
  if (pkg.schema_id !== PACKAGE_SCHEMA_ID) return reject(4);
  if (typeof pkg.lane !== "string") return reject(4);
  if (!Array.isArray(pkg.sections)) return reject(4);
  for (const s of pkg.sections) {
    if (s === null || typeof s !== "object" || Array.isArray(s)) return reject(4);
    const sk = Object.keys(s).sort();
    if (sk.length !== 2 || sk[0] !== "key" || sk[1] !== "payload") return reject(4);
    if (typeof s.key !== "string") return reject(4);
    if (s.payload === null || typeof s.payload !== "object") return reject(4);
  }
  if (pkg.salts === null || typeof pkg.salts !== "object" || Array.isArray(pkg.salts)) {
    return reject(4);
  }
  // the receipts section must be an exact three-key object over the three verifiers
  const receipts = pkg.sections.find((s) => s.key === "stage5o/verifier_receipts");
  if (receipts) {
    const rk = Object.keys(receipts.payload.receipts ?? {}).sort();
    if (rk.length !== 3 || rk[0] !== "section7" || rk[1] !== "section8" || rk[2] !== "section9") {
      return reject(4);
    }
    for (const r of Object.values(receipts.payload.receipts)) {
      if (r === null || typeof r !== "object") return reject(4);
      for (const f of [
        "verifier_id",
        "verifier_contract_digest",
        "input_artifact_digest",
        "accepted_subject_digest",
        "verdict",
        "symbolic_reason",
        "raw_code",
        "accepted_projection_digest",
      ]) {
        if (!(f in r)) return reject(4);
      }
      // an assembled package exists only over ACCEPTs; a rejection receipt never assembles.
      if (r.verdict !== "ACCEPT" || r.symbolic_reason !== "accept" || r.raw_code !== 0) {
        return reject(4);
      }
    }
  }

  // --- 5. exact-set registry membership.
  if (!registryVerdict(pkg.sections).ok) return reject(5);

  // --- 6. "No Assembled Stranger": every section RECOMPUTES the authoritative subject.
  for (const s of pkg.sections) {
    if (projectSectionSubject(s) !== ctx.package_subject_digest) return reject(6);
  }

  // --- 7. the declared lane must match the salt class actually in use.
  if (!laneVerdict(pkg.lane, pkg.salts, MANDATORY_SECTION_KEYS).ok) return reject(7);

  // The capsule root is COMPUTED with Stage 4T's own adapter, never declared by the producer.
  const capsule = { projected_sections: pkg.sections.map(toProjectedSection) };
  const salts = saltsByProjectedKey(pkg.salts);
  return {
    accept: true,
    package_subject: ctx.package_subject_digest,
    capsule_root: capsuleRoot(capsule, salts),
    commitments: deriveCommitments(capsule, salts),
  };
}

/** Stage 4T keys sections as `regime/section_id`; ours arrive already in that form. */
function toProjectedSection(s) {
  const [regime, section_id] = s.key.split("/");
  return { regime, section_id, ...s.payload };
}
function saltsByProjectedKey(salts) {
  return { ...salts };
}

/**
 * The view layer. Requires an ACCEPTED package, then delegates to the shipped Stage 4T verifier and
 * propagates 148/149 unchanged.
 */
export function verifySection12View(section12AuthorityContext, packageRaw, view) {
  const pkgResult = verifySection12Package(section12AuthorityContext, packageRaw);
  if (pkgResult.accept !== true) return pkgResult; // a view over an unaccepted package is not a view
  const outcome = verifyViewAgainstCommitments(view, pkgResult.commitments);
  return outcome ?? { accept: true, capsule_root: pkgResult.capsule_root };
}

/** Fail-closed wrapper: raw 29 ONLY for an unexpected throw, never for hostile-but-invalid evidence. */
export function evaluateSection12Safe(section12AuthorityContext, packageRaw) {
  try {
    return verifySection12Package(section12AuthorityContext, packageRaw);
  } catch {
    return { accept: false, raw: RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED };
  }
}

export { LANES };
