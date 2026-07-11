// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC schema (raw 316). Closed-allowlist validation of the frozen object collections (B6),
// NFC+path canonical form with reject-not-rewrite (S3), and the flat adequacy-annotation surface (B9a).
import { R } from "./result.mjs";
import { REDACTION_ENUM } from "../constants.mjs";

const isObj = (x) => x != null && typeof x === "object" && !Array.isArray(x);
const isStr = (x) => typeof x === "string" && x.length > 0;
const isArr = (x) => Array.isArray(x);

// S3: canonical section key = NFC. A signed section list must ALREADY be canonical; reject otherwise.
export function canonicalSectionId(s) {
  return typeof s === "string" ? s.normalize("NFC") : s;
}

// B9a: annotations is a FLAT map string→primitive; nested objects/arrays and proto keys are illegal.
const PROTO_KEYS = new Set(["__proto__", "prototype", "constructor"]);
function annotationsValid(ann) {
  if (ann === undefined) return true;
  if (!isObj(ann)) return false;
  for (const [k, v] of Object.entries(ann)) {
    if (PROTO_KEYS.has(k)) return false;
    if (v !== null && typeof v === "object") return false; // no nesting
  }
  return true;
}

function requiredSigned(o) {
  return isObj(o) && isObj(o.content) && isStr(o.signature);
}

export function checkSchema(bundle) {
  if (!isObj(bundle)) return R(316, "bundle_not_object");
  const { partition, access_grants, coverage_receipts, attestation } = bundle;

  // partition
  if (!requiredSigned(partition)) return R(316, "partition_malformed");
  const pc = partition.content;
  if (!isObj(pc.source_report) || !isArr(pc.source_report.redaction_taxonomy))
    return R(316, "source_report_malformed");
  for (const t of pc.source_report.redaction_taxonomy)
    if (!REDACTION_ENUM.has(t)) return R(316, "unknown_redaction_taxonomy");
  if (!isObj(pc.partition_procedure) || !isStr(pc.partition_procedure.id))
    return R(316, "partition_procedure_malformed");
  if (!isObj(pc.producer_principal) || !isStr(pc.producer_principal.key_fingerprint))
    return R(316, "producer_principal_malformed");
  if (!isArr(pc.sections) || pc.sections.length === 0) return R(316, "sections_empty");
  const ids = new Set();
  const paths = new Set();
  for (const s of pc.sections) {
    if (!isObj(s) || !isStr(s.section_id) || !isStr(s.canonical_path))
      return R(316, "section_malformed");
    if (s.section_id !== canonicalSectionId(s.section_id)) return R(316, "section_id_not_nfc"); // S3 reject
    if (ids.has(s.section_id)) return R(316, "duplicate_section_id");
    if (paths.has(s.canonical_path)) return R(316, "duplicate_canonical_path");
    ids.add(s.section_id);
    paths.add(s.canonical_path);
    if (!isArr(s.redaction_types)) return R(316, "section_redaction_types_malformed");
    for (const t of s.redaction_types)
      if (!REDACTION_ENUM.has(t)) return R(316, "unknown_section_redaction_enum");
  }

  // grants / receipts
  if (!isArr(access_grants)) return R(316, "access_grants_not_array");
  for (const g of access_grants) {
    if (!requiredSigned(g)) return R(316, "grant_malformed");
    const gc = g.content;
    if (!isObj(gc.reviewer_principal) || !isArr(gc.granted_sections))
      return R(316, "grant_content_malformed");
    if (!isObj(gc.review_host_identity_ref) || !isStr(gc.partition_digest))
      return R(316, "grant_refs_malformed");
  }
  if (!isArr(coverage_receipts)) return R(316, "coverage_receipts_not_array");
  for (const c of coverage_receipts) {
    if (!requiredSigned(c)) return R(316, "receipt_malformed");
    const cc = c.content;
    if (!isObj(cc.reviewer_principal) || !isArr(cc.evaluated_sections))
      return R(316, "receipt_content_malformed");
    if (typeof cc.reviewer_attests_evaluated !== "boolean")
      return R(316, "reviewer_attests_evaluated_not_boolean");
    if (!isObj(cc.independence_evidence) || !isStr(cc.grant_digest))
      return R(316, "receipt_refs_malformed");
  }

  // attestation
  if (!requiredSigned(attestation)) return R(316, "attestation_malformed");
  if (!annotationsValid(attestation.content.annotations)) return R(316, "annotations_not_flat"); // B9a

  return null;
}
