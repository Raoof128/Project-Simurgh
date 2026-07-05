// SPDX-License-Identifier: AGPL-3.0-or-later
// Domain-separated digests (4Q spec §2.2, §3.4). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, SCHEMAS, GENESIS } from "../constants.mjs";

const FOUR_Q_DOMAINS = new Set(Object.values(DOMAINS));

export function domainDigest(domain, schema, value) {
  if (!FOUR_Q_DOMAINS.has(domain)) throw new Error(`unknown_digest_domain: ${domain}`);
  return `sha256:${sha256Hex(canonicalJson({ domain, schema, value }))}`;
}

export function approvalReceiptDigest(receipt) {
  const { signature, ...unsigned } = receipt;
  return domainDigest(DOMAINS.APPROVAL_RECEIPT, SCHEMAS.APPROVAL_RECEIPT, unsigned);
}

// Freeze 5 — signed exemption object digest (excludes signature), the "receipt of
// absence" the crossing's approval_binding_digest points to when kind === "exemption".
export function approvalExemptionDigest(exemption) {
  const { signature, ...unsigned } = exemption;
  return domainDigest(DOMAINS.APPROVAL_EXEMPTION, SCHEMAS.APPROVAL_EXEMPTION, unsigned);
}

export function crossingDigest(crossing) {
  const { signature, ...unsigned } = crossing;
  return domainDigest(DOMAINS.BOUNDARY_CROSSING, SCHEMAS.BOUNDARY_CROSSING, unsigned);
}

export function chainEntryDigest(entry) {
  return domainDigest(DOMAINS.CHAIN_ENTRY, SCHEMAS.RUN_CHAIN_ENTRY, entry);
}

// Content-only digest for duplicate detection (patch 2; 4P hopReplayDigest lineage):
// EXCLUDES previous_entry_digest and chain_position so the SAME entry content replayed
// at a different chain position collides here → raw 89 duplicated_entry. chainEntryDigest
// (which folds in position + previous) is kept for link/root integrity only.
export function chainEntryReplayDigest(entry) {
  return domainDigest(DOMAINS.CHAIN_ENTRY_REPLAY, SCHEMAS.RUN_CHAIN_ENTRY, {
    entry_kind: entry.entry_kind,
    entry_digest: entry.entry_digest,
    raw_code: entry.raw_code,
  });
}

// Order-sensitive fold from GENESIS: root = H(H(...H(GENESIS,e1)...), en). The verifier
// recomputes this itself — recorded positions are never trusted (4Q spec §3.4).
export function chainRootDigest(entryDigests) {
  let acc = GENESIS;
  for (const d of entryDigests) {
    acc = domainDigest(DOMAINS.CHAIN_ROOT, SCHEMAS.RUN_CHAIN_ENTRY, { previous: acc, entry: d });
  }
  return acc;
}

// Invention 6.1 — the liar must ledger the lie: count is committed, bound to the run.
export function censusCommitment({ run_id_digest, committed_crossings }) {
  return domainDigest(DOMAINS.CENSUS, SCHEMAS.ATTESTATION, { run_id_digest, committed_crossings });
}

// Invention 6.3 — rendering commitment, not comprehension proof (rail 10).
export function displayDigest(renderedText) {
  return domainDigest(DOMAINS.DISPLAY, SCHEMAS.APPROVAL_RECEIPT, {
    rendered_sha256: `sha256:${sha256Hex(renderedText)}`,
  });
}

// Raw-86 comparisons use public-key DIGESTS, never labels (4Q spec §2.1.4).
export function publicKeyDigest(pem) {
  return `sha256:${sha256Hex(pem.trim())}`;
}
