// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 17 — the fixture vocabulary, and RULING 4 in force.
//
// This module builds bundles. It does not know what any of them should produce, and it must never
// learn: Ruling 4 forbids the fixture side from importing `core/verify.mjs`, `core/status.mjs` or
// `core/findings.mjs`, and an import-boundary test walks the real module graph to hold it.
//
// WHY THAT MATTERS MORE THAN IT LOOKS. A builder that computed its own expected answers would make
// every acceptance row a tautology — the matrix would say "the verifier does what the verifier does"
// and pass forever, including on the day the verifier starts doing the wrong thing. Expected columns
// are AUTHORED, by a person, from the spec. The cost is that a wrong author-side answer shows up as
// a red test rather than a silent agreement, which is exactly the trade this stage wants.
//
// It may use the canonicalisation and digest primitives, because those are the format of the
// question rather than any part of the answer.

import { createHash, sign as edSign } from "node:crypto";

import { checkpointBodyDigest, checkpointEnvelopeDigest } from "../core/canonical.mjs";
import { keyFor } from "./keys.mjs";

export const POLICY_DIGEST = "sha256:vwq-witness-policy-1";
export const COMPARISON_POLICY_DIGEST = "sha256:vwq-comparison-policy-1";
export const C1_ROOT = "sha256:vwq-c1-root-1";
export const PROTOCOL_VERSION = "vwq.1";
export const SCOPE = "scope-1";

const producerPem = () => keyFor("producer").pem;

/** A producer-signed checkpoint. Signature is over the BODY digest, never the envelope. */
export function checkpoint(over = {}, role = "producer") {
  const body = {
    scope_id: SCOPE,
    epoch: 7,
    history_root: "root-a",
    predecessor: "body-6",
    c1_commitment: C1_ROOT,
    protocol_version: PROTOCOL_VERSION,
    policy_digest: POLICY_DIGEST,
    producer_identity: "producer-1",
    ...over,
  };
  return {
    ...body,
    producer_signature: edSign(
      null,
      Buffer.from(checkpointBodyDigest(body), "utf8"),
      keyFor(role).privateKey
    ).toString("base64"),
    producer_signature_profile: "ed25519",
  };
}

export const WITNESS_KEYS = Object.freeze({
  "w-a": "sha256:vwq-witness-key-a",
  "w-b": "sha256:vwq-witness-key-b",
  "w-c": "sha256:vwq-witness-key-c",
});

export const RECEIVER_KEYS = Object.freeze({
  "r-a": "sha256:vwq-receiver-key-a",
  "r-b": "sha256:vwq-receiver-key-b",
});

export function witnessPolicy(over = {}) {
  return {
    scope_id: SCOPE,
    policy_id: "vwq-wp-1",
    threshold_q: 2,
    witness_roster: Object.entries(WITNESS_KEYS).map(([witness_identity, key_digest]) => ({
      witness_identity,
      key_digest,
      // Every Lane B witness is one operator holding several keys, and §5.1 says so out loud. The
      // roster records that rather than the flattering alternative.
      witness_operator_class: "same_operator_distinct_key",
    })),
    required_class_mix: {},
    producer_identity: "producer-1",
    producer_key_digest: producerKeyDigest(),
    producer_signature_profile: "ed25519",
    canonicalisation: "simurgh.vwq.canonical-json.v1",
    policy_digest: POLICY_DIGEST,
    ...over,
  };
}

/**
 * The producer key digest, recomputed from the committed seed rather than written down twice — the
 * repository's settled convention, sha256 over the raw PEM string.
 */
export function producerKeyDigest() {
  return `sha256:${createHash("sha256").update(producerPem(), "utf8").digest("hex")}`;
}

export function witnessStatement(id, cp, over = {}) {
  return {
    witness_identity: id,
    key_digest: WITNESS_KEYS[id] ?? `sha256:vwq-witness-key-${id}`,
    checkpoint_envelope_digest: checkpointEnvelopeDigest(cp),
    scope_id: cp.scope_id,
    epoch: cp.epoch,
    policy_digest: cp.policy_digest,
    signature_profile: "ed25519",
    signature: "witness-signature",
    signature_verified: true,
    ...over,
  };
}

export function viewReceipt(id, cp, over = {}) {
  return {
    receiver_identity: id,
    receiver_key_digest: RECEIVER_KEYS[id] ?? `sha256:vwq-receiver-key-${id}`,
    checkpoint_envelope_digest: checkpointEnvelopeDigest(cp),
    comparison_policy_digest: COMPARISON_POLICY_DIGEST,
    receiver_sequence: 1,
    signature_profile: "ed25519",
    signature: "receipt-signature",
    signature_verified: true,
    ...over,
  };
}

export function comparisonPolicy(over = {}) {
  return {
    comparison_roster: Object.entries(RECEIVER_KEYS).map(([receiver_identity, key_digest]) => ({
      receiver_identity,
      key_digest,
    })),
    receiver_signature_profile: "ed25519",
    strong_tier_intake_rule: "every_roster_receiver_responds",
    comparison_policy_digest: COMPARISON_POLICY_DIGEST,
    ...over,
  };
}

export function comparisonManifest(cps, over = {}) {
  const digests = cps.map((cp) => checkpointEnvelopeDigest(cp)).sort();
  return {
    comparison_policy_digest: COMPARISON_POLICY_DIGEST,
    views: digests,
    input_envelope_digests: digests,
    intake_complete: true,
    comparison_roster_digest: "sha256:vwq-comparison-roster-1",
    ...over,
  };
}

/** A view: one checkpoint, its witness statements, and the receipts that carried it. */
export function view(cp, witnesses = ["w-a", "w-b"], receivers = ["r-a"]) {
  return {
    checkpoint: cp,
    witness_statements: witnesses.map((id) => witnessStatement(id, cp)),
    carried_by: receivers.map((id) => viewReceipt(id, cp)),
  };
}

/**
 * The base bundle every case starts from: two views at one coordinate, differing histories — a real
 * fork, fully witnessed and fully carried. Cases mutate a copy of it.
 */
export function baseBundle() {
  const cpA = checkpoint({ history_root: "root-a" });
  const cpB = checkpoint({ history_root: "root-b" });
  return {
    committed: {
      producer_public_key_pem: producerPem(),
      producer_key_digest: producerKeyDigest(),
      protocol_version: PROTOCOL_VERSION,
      c1_roots: [C1_ROOT],
      chain: [],
      transition_policy: {},
    },
    witness_policy: witnessPolicy(),
    comparison_policy: comparisonPolicy(),
    comparison_manifest: comparisonManifest([cpA, cpB]),
    views: [view(cpA, ["w-a", "w-b"], ["r-a"]), view(cpB, ["w-a", "w-b"], ["r-b"])],
    receiver_statuses: [],
  };
}

/** The same bundle with no fork: both views are one checkpoint. */
export function cleanBundle() {
  const cp = checkpoint({ history_root: "root-a" });
  return {
    ...baseBundle(),
    comparison_manifest: comparisonManifest([cp]),
    views: [view(cp, ["w-a", "w-b"], ["r-a"]), view(cp, ["w-a", "w-b"], ["r-b"])],
  };
}
