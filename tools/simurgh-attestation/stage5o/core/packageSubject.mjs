// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §12.2/§12.3 — the mandatory section registry and the cross-section package subject.
//
// Law — "No Assembled Stranger": a package is accepted only when every mandatory section projects to
// the SAME package subject, RECOMPUTED from that section's own payload. Six individually valid
// artifacts belonging to different runs are a rejected package, not a package with a caveat.
//
// The recomputation is the whole point. Copying `package_subject_digest` into each section and
// comparing the copies would bind six producer DECLARATIONS to one another; it would not bind six
// PAYLOADS to one accepted event, and a producer can write the same string six times for free.
import { createHash } from "node:crypto";

const sha256 = (b) => createHash("sha256").update(b).digest();
const utf8 = (s) => Buffer.from(s, "utf8");

export const PACKAGE_SUBJECT_DOMAIN = "simurgh.vsc.presented_evidence_package_subject.v1";

/**
 * The six mandatory keys. `stage5o/census_closure` is the §6/A17 keyed section owned by
 * `package_closure_core_section_schema`: it is carried DIRECTLY, never folded into another section,
 * because §6 froze that projection for exactly this adapter.
 */
export const MANDATORY_SECTION_KEYS = Object.freeze([
  "stage5o/census_closure",
  "stage5o/challenge",
  "stage5o/openings",
  "stage5o/disclosure_ledger",
  "stage5o/probability_claim",
  "stage5o/verifier_receipts",
]);

/** The four identifiers that jointly name one accepted event. */
export const SUBJECT_FIELDS = Object.freeze([
  "stage5o_precommitment_digest",
  "closure_slot_id",
  "challenge_subject_digest",
  "challenge_record_digest",
]);

/**
 * package_subject_digest = SHA256(DOMAIN || precommitment || slot_id || subject || record).
 * Digest fields are absorbed as their raw 32 bytes; the slot id is length-framed so a slot named
 * "a" followed by "bc" cannot collide with "ab" followed by "c".
 */
export function packageSubjectDigest(fields) {
  for (const f of SUBJECT_FIELDS) {
    if (typeof fields?.[f] !== "string" || fields[f].length === 0) {
      throw new Error(`package_subject_${f}`);
    }
  }
  const hex = (h) => {
    if (!/^[0-9a-f]{64}$/.test(h)) throw new Error("package_subject_digest_grammar");
    return Buffer.from(h, "hex");
  };
  const slot = utf8(fields.closure_slot_id);
  const len = Buffer.alloc(2);
  len.writeUInt16BE(slot.length, 0);
  return sha256(
    Buffer.concat([
      utf8(PACKAGE_SUBJECT_DOMAIN),
      hex(fields.stage5o_precommitment_digest),
      len,
      slot,
      hex(fields.challenge_subject_digest),
      hex(fields.challenge_record_digest),
    ])
  ).toString("hex");
}

/**
 * Project a section to its subject by RECOMPUTING from the identifiers its own payload carries.
 * A section that merely asserts a `package_subject_digest` without carrying the identifiers cannot
 * project, and returns a value that will not match — which is the intended rejection.
 */
export function projectSectionSubject(section) {
  const p = section?.payload;
  if (p === null || typeof p !== "object") return "unprojectable";
  for (const f of SUBJECT_FIELDS) if (typeof p[f] !== "string") return "unprojectable";
  try {
    return packageSubjectDigest(p);
  } catch {
    return "unprojectable";
  }
}

/** Exact-set membership over the mandatory registry: missing, spare, duplicate and unknown all fail. */
export function registryVerdict(sections) {
  if (!Array.isArray(sections)) return { ok: false, detail: "shape" };
  const keys = sections.map((s) => s?.key);
  if (keys.some((k) => typeof k !== "string")) return { ok: false, detail: "shape" };

  const seen = new Set();
  for (const k of keys) {
    if (seen.has(k)) return { ok: false, detail: "duplicate", key: k };
    seen.add(k);
  }
  for (const k of keys) {
    if (!MANDATORY_SECTION_KEYS.includes(k)) return { ok: false, detail: "spare", key: k };
  }
  for (const k of MANDATORY_SECTION_KEYS) {
    if (!seen.has(k)) return { ok: false, detail: "missing", key: k };
  }
  return { ok: true };
}
