// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — portable browser verifier of the deterministic surface (WebCrypto/SubtleCrypto async).
// Zero external imports (CSP no-egress). Predicate view of signatures (the same contract as the Python
// parity verifier): reproduces canonicalJson byte-equality, the digest surface, grant-bounded coverage
// equality, both roots, projections, and the adequacy scan → a raw code. Runs under Node WebCrypto too.
import { canonicalJson } from "./canonical-json.mjs";

const DOMAIN = {
  partition: "simurgh.vpc.partition.v1",
  grant: "simurgh.vpc.grant.v1",
  affiliation: "simurgh.vpc.affiliation.v1",
};
const FORBIDDEN = new Set([
  "adequate",
  "sufficient",
  "thorough",
  "review_quality",
  "approved",
  "endorsed",
  "certified_safe",
]);

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return "sha256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const domainDigest = (dom, obj) => sha256Hex(dom + canonicalJson(obj));
const artifactDigest = (obj) => sha256Hex(canonicalJson(obj));
const sortedRoot = async (parts) => artifactDigest([...parts].sort());

export async function verifyPortable(bundle, cfg) {
  // 328 adequacy scan
  for (const obj of [
    bundle.attestation,
    bundle.partition,
    ...bundle.access_grants,
    ...bundle.coverage_receipts,
  ]) {
    const ann = obj?.content?.annotations;
    if (ann && typeof ann === "object") {
      for (const k of Object.keys(ann))
        if (FORBIDDEN.has(k.trim().toLowerCase())) return { raw: 328 };
    }
  }

  const pc = bundle.partition.content;
  const partition_digest = await domainDigest(DOMAIN.partition, pc);
  const S = pc.sections.map((s) => s.section_id);
  const eligible = bundle.coverage_receipts.map((c) => ({
    fp: c.content.reviewer_principal.key_fingerprint,
    receipt: c,
  }));

  const union = new Set();
  for (const e of eligible) for (const s of e.receipt.content.evaluated_sections) union.add(s);
  const coverage_union = [...union].sort();
  const coverage_gap = S.filter((s) => !union.has(s)).sort();
  if (coverage_gap.length) return { raw: 327 };

  const subj = [`partition:${partition_digest}`];
  for (const g of bundle.access_grants)
    subj.push(`grant:${await domainDigest(DOMAIN.grant, g.content)}`);
  for (const a of cfg.affiliation_assertions)
    subj.push(`aff:${await domainDigest(DOMAIN.affiliation, a.content)}`);
  for (const e of eligible) subj.push(`rev:${e.fp}`);
  const panel_subject_root = await sortedRoot(subj);

  const ev = [`subject:${panel_subject_root}`];
  for (const c of bundle.coverage_receipts) ev.push(`receipt:${await artifactDigest(c.content)}`);
  for (const s of bundle.reviewer_separation_evidence) ev.push(`sep:${await artifactDigest(s)}`);
  for (const h of bundle.host_separation_evidence) ev.push(`hostsep:${await artifactDigest(h)}`);
  const panel_evidence_root = await sortedRoot(ev);

  const declared = bundle.attestation.content;
  for (const [k, v] of [
    ["partition_digest", partition_digest],
    ["panel_subject_root", panel_subject_root],
    ["panel_evidence_root", panel_evidence_root],
    ["coverage_union", coverage_union],
    ["coverage_gap", coverage_gap],
  ]) {
    if (canonicalJson(declared[k]) !== canonicalJson(v)) return { raw: 329, field: k };
  }
  return { raw: 0, partition_digest, panel_subject_root, panel_evidence_root };
}
