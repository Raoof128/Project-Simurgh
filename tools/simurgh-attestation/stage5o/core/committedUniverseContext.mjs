// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.2 — the opaque CommittedUniverseContext (§8's authenticated view of the anchored
// commitment: the manifest root, scope identity, epoch, execution census, and disclosure policy).
//
// §7's frozen Section6AcceptedContext deliberately carries only what §7's eleven checks need, so §8
// authenticates the PUBLIC committed universe against the anchored precommitment through its own
// capability rather than by reopening §7. Opacity is a module-private WeakSet: only objects minted
// here are members, so a lookalike is rejected. The mint is the seam an anchored-commitment
// acceptance path calls; tests call it to obtain a real committed universe.
import { decodeDigestToken } from "./digestTokenCodec.mjs";
import { canonicalDisclosurePolicy, disclosurePolicyDigest } from "./disclosurePolicy.mjs";

const MINTED = new WeakSet();
const posInt = (n) => Number.isSafeInteger(n) && n > 0;

export function mintCommittedUniverseContext(fields) {
  if (fields === null || typeof fields !== "object") {
    throw new TypeError("committed_universe_object");
  }
  if (
    typeof fields.scope_manifest_identity !== "string" ||
    fields.scope_manifest_identity.length === 0
  ) {
    throw new Error("committed_universe_scope_manifest_identity");
  }
  decodeDigestToken(fields.merkle_root); // throws on a malformed token
  decodeDigestToken(fields.epoch_digest);
  if (!posInt(fields.N)) throw new Error("committed_universe_N");

  // execution census: E[i] = { case_link_commitment, execution_record_digest }, both tokens.
  if (fields.execution_census === null || typeof fields.execution_census !== "object") {
    throw new TypeError("committed_universe_execution_census");
  }
  const census = {};
  for (const [k, v] of Object.entries(fields.execution_census)) {
    if (!/^(0|[1-9][0-9]*)$/.test(k)) throw new Error("committed_universe_census_index");
    if (v === null || typeof v !== "object") throw new TypeError("committed_universe_census_entry");
    decodeDigestToken(v.case_link_commitment);
    decodeDigestToken(v.execution_record_digest);
    census[k] = Object.freeze({
      case_link_commitment: v.case_link_commitment,
      execution_record_digest: v.execution_record_digest,
    });
  }

  // the disclosure policy (six limits) and the precommitment binding: the recomputed digest must
  // equal the value §4.7 bound into the precommitment. Recomputing it here is the anchored-commitment
  // acceptance's half of the §8.6 discharge; §8's verifier re-executes it (check 6).
  const policy = canonicalDisclosurePolicy(fields.disclosure_policy);
  decodeDigestToken(fields.precommitted_disclosure_policy_digest);
  if (disclosurePolicyDigest(policy) !== fields.precommitted_disclosure_policy_digest) {
    throw new Error("committed_universe_disclosure_policy_precommitment_mismatch");
  }

  const ctx = Object.freeze({
    scope_manifest_identity: fields.scope_manifest_identity,
    merkle_root: fields.merkle_root,
    epoch_digest: fields.epoch_digest,
    N: fields.N,
    execution_census: Object.freeze(census),
    disclosure_policy: Object.freeze(policy),
    precommitted_disclosure_policy_digest: fields.precommitted_disclosure_policy_digest,
  });
  MINTED.add(ctx);
  return ctx;
}

export function isCommittedUniverseContext(x) {
  return x !== null && typeof x === "object" && MINTED.has(x);
}
