// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 22 — Lane B roles, and the keys they are given.
//
// DETERMINISTIC KEYS, OR THE CEREMONY IS NOT A CEREMONY. Revision 1 called this lane deterministic
// while generating random keys, so no two runs could ever match and the byte-identical claim was
// unfalsifiable (§13, B7). Keys here are derived from committed seeds, domain-separated by ROLE and
// CASE ID, so a run is reproducible on any machine and two runs of the same case are the same bytes.
//
// THE NARROWED CLAIM. What this lane demonstrates is multi-PROCESS, not multi-PARTY. Each role runs
// in its own process and is passed only its own declared key path. That is worth stating precisely
// because the tempting overstatement is right next to it: separate directories do not prove a
// process could not read another's, and nothing here attempts to prove that. §3.8 keeps
// covert-channel freedom out of scope, and §5.1 already says every Lane B witness is one operator
// holding several keys — which is why `witness_independence_status` is `unproven` by construction
// and not by measurement.
//
// FIXTURE-ONLY, AND MECHANICALLY SO. Every ceremony key path carries the INSECURE_FIXTURE_ONLY
// marker, and Task 30's signer policy must refuse anything matching it. A ceremony key that could
// sign a release attestation would make the whole lane a liability rather than evidence.

import { createHash, createPrivateKey, createPublicKey } from "node:crypto";

/** The four roles, in the order the ceremony runs them. */
export const ROLES = Object.freeze(["producer", "witness", "receiver", "comparator"]);

/** Marker every ceremony key path must carry, so a policy can refuse the whole class by name. */
export const FIXTURE_ONLY_MARKER = "INSECURE_FIXTURE_ONLY";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SEED_DOMAIN = "simurgh.vwq.lane-b.key-seed.v1";

/** The one committed root secret. Public on purpose: a ceremony nobody else can rebuild is a claim. */
export const CEREMONY_ROOT_SEED =
  "5300000000000000000000000000000000000000000000000000000000005b00";

/**
 * Derive a role's key for a case. Domain-separated on both axes: two roles in one case, and one role
 * across two cases, must never share a key — either collision would let a run prove something about
 * separation that it had not actually arranged.
 */
export function ceremonyKey(role, caseId, index = 0) {
  if (!ROLES.includes(role)) throw new Error(`unknown ceremony role: ${role}`);
  const seed = createHash("sha256")
    .update(`${SEED_DOMAIN}\n${CEREMONY_ROOT_SEED}\n${role}\n${caseId}\n${index}`, "utf8")
    .digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = createPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    pem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

/** The path a role's key is written to. The marker is part of the path, not a comment beside it. */
export function ceremonyKeyPath(dir, role, caseId, index = 0) {
  return `${dir}/${FIXTURE_ONLY_MARKER}_${role}_${caseId}_${index}.key`;
}

/**
 * What each role is DECLARED to consume. The parent asserts the manifest a role emits against this,
 * so a role that quietly read something it never declared is a refusal rather than a footnote.
 */
export const DECLARED_INPUTS = Object.freeze({
  producer: Object.freeze(["scope_id", "epoch", "history_root", "predecessor", "c1_commitment"]),
  witness: Object.freeze(["checkpoint_envelope_digest", "scope_id", "epoch", "policy_digest"]),
  receiver: Object.freeze(["checkpoint_envelope_digest", "comparison_policy_digest"]),
  comparator: Object.freeze(["view_envelope_digests", "comparison_policy_digest"]),
});
