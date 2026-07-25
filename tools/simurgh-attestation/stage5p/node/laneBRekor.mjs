// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane B — a REAL public Sigstore/Rekor ceremony, verified OFFLINE.
//
// This lane executed. The entry below is in the live public-good transparency log at
// rekor.sigstore.dev and can be fetched by anyone, by UUID, forever. Everything in this module runs
// with no network: the ceremony happened once, was frozen, and is re-verified here from bytes.
//
// WHAT THIS CEREMONY IS, precisely — and it is narrower than "Sigstore":
//
//   IT IS      a real entry in the real public Rekor log, with a real inclusion proof against a
//              real signed tree head, and a real Signed Entry Timestamp from Rekor's own key.
//   IT IS NOT  a Fulcio KEYLESS ceremony. The signer is a SELF-MANAGED ECDSA P-256 key, not an
//              OIDC-bound short-lived certificate. NOBODY vouches for who holds it.
//
// That second bound is not an apology, it is the point. For a stage about submitter IDENTITY, this
// ceremony isolates exactly one axis: it produces `binding: cryptographically_bound` — a signature
// that really verifies — while `resolution` stays at `unresolved`, because a bare public key
// resolves no principal at all. A transparency log proves an artifact EXISTED and was signed by
// SOMETHING at a time. It does not say by WHOM. That gap is 5P's entire thesis, and Lane B is the
// version of it made of real infrastructure rather than fixtures.
import { readFileSync } from "node:fs";
import { createHash, createVerify } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import {
  RESOLVER_PROFILE_TYPE,
  makeResolverProfile,
  makeResolverRegistry,
} from "../core/resolverProfile.mjs";
import { PRINCIPAL_TYPE, deriveSubjectId } from "../core/canonicalPrincipal.mjs";
import { RESOLVER_EVIDENCE_TYPE } from "../core/resolverEvidence.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CEREMONY_DIR = resolve(
  HERE,
  "../../../../docs/research/llm-shield/evidence/stage-5p/rekor-ceremony"
);

export const REKOR_PROFILE_ID = "sigstore.rekor.v1";
export const REKOR_NAMESPACE = "sigstore.rekor.subject.v1";

/**
 * A transparency-log entry proves a signature EXISTED at a time. It proves nothing about who held
 * the key. So: full binding standing, and ZERO resolution standing.
 *
 * `continuity: ephemeral` because one log entry is one moment. The Identity Heartbeat (invention B,
 * ≥2 anchored-epoch survival) is what would earn `durable`, and it has not been built.
 */
export const REKOR_CEILING = Object.freeze({
  binding: "cryptographically_bound",
  resolution: "unresolved",
  continuity: "ephemeral",
  role: "unproven",
});

const sha256 = (buf) => createHash("sha256").update(buf).digest();
const readCeremony = (name) => readFileSync(resolve(CEREMONY_DIR, name));

// RFC 6962 hashing, as Rekor's Merkle tree uses it.
const leafHash = (data) => sha256(Buffer.concat([Buffer.from([0x00]), data]));
const nodeHash = (l, r) => sha256(Buffer.concat([Buffer.from([0x01]), l, r]));

/**
 * Recompute the Merkle root from a leaf and its inclusion path (RFC 6962 §2.1.1).
 * Pure arithmetic over the captured hashes — no network, no trust in the server's own arithmetic.
 */
export function recomputeInclusionRoot(leaf, index, treeSize, proofHashes) {
  let hash = leaf;
  let idx = index;
  let size = treeSize - 1;
  for (const sibling of proofHashes) {
    const sib = Buffer.from(sibling, "hex");
    if (idx % 2 === 1 || idx === size) {
      hash = nodeHash(sib, hash);
      while (idx % 2 === 0 && idx !== 0) {
        idx = Math.floor(idx / 2);
        size = Math.floor(size / 2);
      }
    } else {
      hash = nodeHash(hash, sib);
    }
    idx = Math.floor(idx / 2);
    size = Math.floor(size / 2);
  }
  return hash;
}

/**
 * Verify the whole ceremony from frozen bytes. Every check is independent of the log server:
 * the digest is recomputed, the signature re-verified, the Merkle root re-derived, and Rekor's
 * Signed Entry Timestamp checked against Rekor's own published key.
 */
export function verifyRekorCeremonyOffline() {
  const artifact = readCeremony("artifact.json");
  const signature = readCeremony("artifact.sig.bin");
  const signerPem = readCeremony("signer-public-key.pem").toString("utf8");
  const rekorPem = readCeremony("rekor-log-public-key.pem").toString("utf8");
  const response = JSON.parse(readCeremony("rekor-response.json").toString("utf8"));
  const refetch = JSON.parse(readCeremony("rekor-refetch.json").toString("utf8"));

  const uuid = Object.keys(response)[0];
  const entry = response[uuid];
  const checks = {};

  // 1. The artifact's digest is what we say it is.
  const artifactDigest = sha256(artifact).toString("hex");

  // 2. The signature really verifies over the artifact bytes, with the captured public key.
  checks.artifact_signature_valid = createVerify("SHA256")
    .update(artifact)
    .verify(signerPem, signature);

  // 3. The log entry's BODY commits to that exact digest and that exact key. Without this, the
  //    ceremony would prove that *something* was logged, not that OUR artifact was.
  const body = JSON.parse(Buffer.from(entry.body, "base64").toString("utf8"));
  checks.body_binds_artifact_digest = body.spec.data.hash.value === artifactDigest;
  checks.body_binds_signer_key =
    Buffer.from(body.spec.signature.publicKey.content, "base64").toString("utf8").trim() ===
    signerPem.trim();
  checks.body_binds_signature = Buffer.from(body.spec.signature.content, "base64").equals(
    signature
  );

  // 4. The inclusion proof re-derives the root the log committed to.
  const proof = entry.verification.inclusionProof;
  const recomputed = recomputeInclusionRoot(
    leafHash(Buffer.from(entry.body, "base64")),
    proof.logIndex,
    proof.treeSize,
    proof.hashes
  ).toString("hex");
  checks.inclusion_proof_valid = recomputed === proof.rootHash;

  // 5. The checkpoint the log signed carries the SAME root as the proof. A proof that verified
  //    against a root nobody signed would be arithmetic without authority.
  const checkpointRoot = Buffer.from(proof.checkpoint.split("\n")[2], "base64").toString("hex");
  checks.checkpoint_root_matches_proof = checkpointRoot === proof.rootHash;

  // 6. Rekor's Signed Entry Timestamp verifies under Rekor's published key. The signed payload is
  //    the canonical JSON of exactly four fields, keys sorted — reconstructed here rather than
  //    trusted from the response.
  const setPayload = JSON.stringify({
    body: entry.body,
    integratedTime: entry.integratedTime,
    logID: entry.logID,
    logIndex: entry.logIndex,
  });
  checks.signed_entry_timestamp_valid = createVerify("SHA256")
    .update(Buffer.from(setPayload, "utf8"))
    .verify(rekorPem, Buffer.from(entry.verification.signedEntryTimestamp, "base64"));

  // 7. An INDEPENDENT re-fetch of the same UUID returned byte-identical material. This is the one
  //    check that speaks to external validity rather than internal consistency: the log served the
  //    same entry to a second request.
  checks.independent_refetch_identical =
    Object.keys(refetch)[0] === uuid &&
    refetch[uuid].body === entry.body &&
    refetch[uuid].logIndex === entry.logIndex;

  const ok = Object.values(checks).every((v) => v === true);
  return Object.freeze({
    ceremony_id: "simurgh.vsi.rekor_ceremony.v1",
    log: "rekor.sigstore.dev",
    uuid,
    log_index: entry.logIndex,
    log_id: entry.logID,
    integrated_time: entry.integratedTime,
    artifact_digest: artifactDigest,
    tree_size_at_inclusion: proof.treeSize,
    root_hash: proof.rootHash,
    // Stated with the result, so no caller can take the verdict without the bound.
    is_keyless: false,
    signer: "self_managed_ecdsa_p256",
    not_claimed: Object.freeze([
      "not_a_fulcio_keyless_ceremony",
      "not_proof_of_who_holds_the_key",
      "not_proof_of_submitter_identity",
      "not_proof_of_durable_continuity",
    ]),
    checks: Object.freeze(checks),
    ok,
  });
}

export const REKOR_PROFILE = makeResolverProfile({
  type: RESOLVER_PROFILE_TYPE,
  profile_id: REKOR_PROFILE_ID,
  // The pinned root is Rekor's own published log key — a REAL trust root, unlike Lane C1's
  // trust-on-capture manifest. This is the strongest root any lane in this stage pins.
  trust_root_fpr: createHash("sha256")
    .update(readCeremony("rekor-log-public-key.pem"))
    .digest("hex"),
  permitted_claim_types: ["principal"],
  ceiling: REKOR_CEILING,
  namespace_map: { key: REKOR_NAMESPACE },
});

export const REKOR_PINNED = Object.freeze({
  registry: makeResolverRegistry([REKOR_PROFILE]),
  trusted_profile_ids: Object.freeze([REKOR_PROFILE_ID]),
  revoked_profile_ids: Object.freeze([]),
});

/**
 * A Section 2 bundle built from the real ceremony.
 *
 * The subject is derived from the SIGNING KEY, not from a person or an organisation — because a
 * bare key is genuinely all this lane resolves. Naming the subject after the key rather than after
 * an identity is the honest encoding of `resolution: unresolved`.
 */
export function rekorEvidenceBundle(required) {
  const c = verifyRekorCeremonyOffline();
  const signerPem = readCeremony("signer-public-key.pem");
  // KIND, and why it is `account` rather than something key-shaped. §2.1's frozen grammar has four
  // kinds — account, person, organisation, service — and none of them is "a credential whose holder
  // is unknown", which is exactly what this lane resolves. `account` is the right existing choice:
  // it is the opaque-handle kind, and it does NOT assert the key is a person, an organisation or a
  // running service. Minting a fifth kind was rejected — a key is a credential, not an entity, and
  // giving credentials their own principal kind would invite exactly the conflation between "held a
  // key" and "is a party" that this stage exists to prevent.
  const subject = Object.freeze({
    type: PRINCIPAL_TYPE,
    kind: "account",
    namespace_id: REKOR_NAMESPACE,
    subject_id: deriveSubjectId(REKOR_NAMESPACE, signerPem),
  });
  return {
    subject: { ...subject },
    required: { ...required },
    evidences: [
      {
        type: RESOLVER_EVIDENCE_TYPE,
        profile_id: REKOR_PROFILE_ID,
        claim: { principal: { ...subject } },
        asserted_strength_delta: { ...REKOR_CEILING },
        evidence_digest: c.artifact_digest,
        submission_digest_binding: createHash("sha256")
          .update(Buffer.from(`rekor:${c.uuid}`, "utf8"))
          .digest("hex"),
        signature: readCeremony("artifact.sig.bin").toString("hex"),
      },
    ],
  };
}
