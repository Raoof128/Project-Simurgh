// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — canonicalisation and the two checkpoint digests.
//
// TWO DIGESTS, DOMAIN-SEPARATED:
//
//   checkpoint_body_digest      excludes every signature-bearing field  → the COMPATIBILITY relation
//   checkpoint_envelope_digest  includes them                           → witnesses and receipts
//
// Compare on envelopes and two valid signatures over one history read as a fork — a false
// equivocation, the §5.3 win the stage is obliged to deny. Witness the body and a signature can be
// swapped with no witness noticing. Each digest exists because the other cannot do its job.

import { createHash } from "node:crypto";

/** Signature-bearing fields, excluded from the body. Non-empty by contract; a test asserts it. */
export const SIGNATURE_FIELDS = Object.freeze([
  "producer_signature",
  "producer_signature_profile",
  "witness_statements",
  "receipts",
]);

const BODY_DOMAIN = "simurgh.vwq.checkpoint-body.v1";
const ENVELOPE_DOMAIN = "simurgh.vwq.checkpoint-envelope.v1";

/**
 * Deterministic JSON: keys sorted at every depth, no whitespace.
 *
 * Throws on BigInt rather than coercing. A silent coercion is a parity bug factory across four
 * runtimes, and 4Z paid for that lesson — decimal values travel as strings.
 */
export function canonicalJson(value) {
  if (typeof value === "bigint") {
    throw new TypeError("canonicalJson: BigInt is not representable — pass decimals as strings");
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
}

const digest = (domain, obj) =>
  createHash("sha256")
    .update(`${domain}\n${canonicalJson(obj)}`, "utf8")
    .digest("hex");

/** The body: every field EXCEPT signature material. What compatibility compares. */
export function checkpointBodyDigest(checkpoint) {
  const body = {};
  for (const [k, v] of Object.entries(checkpoint ?? {})) {
    if (!SIGNATURE_FIELDS.includes(k)) body[k] = v;
  }
  return digest(BODY_DOMAIN, body);
}

/** The envelope: the whole object, signature material included. What witnesses and receipts bind. */
export function checkpointEnvelopeDigest(checkpoint) {
  return digest(ENVELOPE_DOMAIN, checkpoint ?? {});
}
