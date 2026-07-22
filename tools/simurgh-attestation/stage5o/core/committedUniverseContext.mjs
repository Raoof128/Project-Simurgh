// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.2 — the opaque CommittedUniverseContext (§8's authenticated view of the anchored
// commitment: the manifest root, scope identity, epoch, execution census, and disclosure policy).
//
// §7's frozen Section6AcceptedContext deliberately carries only what §7's eleven checks need, so §8
// authenticates the PUBLIC committed universe against the anchored precommitment through this own
// capability rather than by reopening §7. Opacity is a module-private WeakSet: only objects minted
// here are members, so a lookalike is rejected. The mint is the seam an anchored-commitment
// acceptance path calls; tests call it to obtain a real committed universe.
import { decodeDigestToken } from "./digestTokenCodec.mjs";

const MINTED = new WeakSet();

const POLICY_LIMITS = Object.freeze([
  "max_opening_package_transport_bytes",
  "max_opening_package_canonical_bytes",
  "max_presented_history_transport_bytes",
  "max_presented_history_canonical_bytes",
  "max_presented_history_entries",
  "max_cumulative_disclosed_indices",
]);

const posInt = (n) => Number.isSafeInteger(n) && n > 0;

export function mintCommittedUniverseContext(fields) {
  if (fields === null || typeof fields !== "object")
    throw new TypeError("committed_universe_object");
  if (
    typeof fields.scope_manifest_identity !== "string" ||
    fields.scope_manifest_identity.length === 0
  ) {
    throw new Error("committed_universe_scope_manifest_identity");
  }
  decodeDigestToken(fields.merkle_root); // throws on a malformed token
  decodeDigestToken(fields.epoch_digest);
  if (!posInt(fields.N)) throw new Error("committed_universe_N");
  if (fields.execution_census === null || typeof fields.execution_census !== "object") {
    throw new TypeError("committed_universe_execution_census");
  }
  for (const [k, v] of Object.entries(fields.execution_census)) {
    if (!/^(0|[1-9][0-9]*)$/.test(k)) throw new Error("committed_universe_census_index");
    decodeDigestToken(v); // each E[i].execution_record_digest is a token
  }
  const dp = fields.disclosure_policy;
  if (dp === null || typeof dp !== "object")
    throw new TypeError("committed_universe_disclosure_policy");
  for (const limit of POLICY_LIMITS) {
    if (!posInt(dp[limit])) throw new Error(`disclosure_policy_${limit}`);
  }
  if (dp.max_opening_package_canonical_bytes > dp.max_opening_package_transport_bytes) {
    throw new Error("disclosure_policy_opening_canonical_over_transport");
  }
  if (dp.max_presented_history_canonical_bytes > dp.max_presented_history_transport_bytes) {
    throw new Error("disclosure_policy_history_canonical_over_transport");
  }

  const ctx = Object.freeze({
    scope_manifest_identity: fields.scope_manifest_identity,
    merkle_root: fields.merkle_root,
    epoch_digest: fields.epoch_digest,
    N: fields.N,
    execution_census: Object.freeze({ ...fields.execution_census }),
    disclosure_policy: Object.freeze(POLICY_LIMITS.reduce((o, k) => ((o[k] = dp[k]), o), {})),
  });
  MINTED.add(ctx);
  return ctx;
}

export function isCommittedUniverseContext(x) {
  return x !== null && typeof x === "object" && MINTED.has(x);
}
