// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.2 — the sealed §7 -> §8 acceptance-to-context adapter.
//
// Section 8 owns the Section7AcceptedContext capability type and this one sealed adapter; Section 7
// exclusively owns the acceptance relation. The adapter does not reinterpret, weaken, supplement, or
// independently reproduce §7 acceptance — it mints the opaque capability ONLY after the frozen
// PRODUCTION §7 verifier accepts the same immutable inputs from which the context is derived. The
// constructor is unexported and the brand is a module-private WeakSet; there is no exported mint, so
// a caller cannot fabricate a context by asserting `{ accepted: true }`.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { encodeDigestToken } from "./digestTokenCodec.mjs";
import { evaluateSection7Safe } from "./section7Verifier.mjs";
import { isCommittedUniverseContext } from "./committedUniverseContext.mjs";

const MINTED = new WeakSet();
const sha256 = (buf) => createHash("sha256").update(buf).digest();
const digestTokenOfCanonical = (obj) =>
  encodeDigestToken(sha256(Buffer.from(canonicalJson(obj), "utf8")));

// The ONLY constructor — module-private, never exported.
function mint(section7Verified, committedUniverse) {
  const ctx = Object.freeze({
    // §7-verified challenge (from the accepted snapshot)
    ordered_selected_indices: Object.freeze([...section7Verified.ordered_selected_indices]),
    ordered_selected_indices_digest: section7Verified.ordered_selected_indices_digest,
    challenge_subject_digest: section7Verified.challenge_subject_digest,
    challenge_record_digest: section7Verified.challenge_record_digest,
    // §8-authenticated committed universe
    scope_manifest_identity: committedUniverse.scope_manifest_identity,
    merkle_root: committedUniverse.merkle_root,
    epoch_digest: committedUniverse.epoch_digest,
    N: committedUniverse.N,
    execution_census: committedUniverse.execution_census,
    disclosure_policy: committedUniverse.disclosure_policy,
  });
  MINTED.add(ctx);
  return ctx;
}

export function isSection7AcceptedContext(x) {
  return x !== null && typeof x === "object" && MINTED.has(x);
}

/**
 * Run the frozen production §7 verifier on an immutable snapshot; mint the opaque
 * Section7AcceptedContext ONLY on a clean ACCEPT of the same inputs. Returns null on any symbolic
 * rejection, the raw-29 fail-closed path, or an unexpected result.
 */
export function acceptSection7ForSection8(
  section6AcceptedContext,
  producerBundle,
  committedUniverseContext
) {
  if (!isCommittedUniverseContext(committedUniverseContext)) {
    throw new TypeError("acceptSection7ForSection8_requires_committed_universe");
  }
  // One immutable snapshot of the producer bundle; later mutation of the caller's object is inert.
  if (producerBundle === null || typeof producerBundle !== "object") return null;
  const snapshot = Object.freeze({
    beacon_contract: producerBundle.beacon_contract,
    beacon_suffix: producerBundle.beacon_suffix,
    ordered_selected_indices: producerBundle.ordered_selected_indices,
    challenge_record: producerBundle.challenge_record,
  });

  // The frozen production verifier is the sole minting gate (never the injectable test factory).
  const verdict = evaluateSection7Safe(section6AcceptedContext, snapshot);
  if (!verdict || verdict.accept !== true) return null; // symbolic reject, raw 29, or throw -> no context

  // Derive the §7-verified challenge from the accepted snapshot.
  let indicesArtifact, record;
  try {
    indicesArtifact = JSON.parse(snapshot.ordered_selected_indices);
    record = JSON.parse(snapshot.challenge_record);
  } catch {
    return null; // unreachable after ACCEPT, but fail closed rather than throw
  }
  // The committed universe must be consistent with the accepted challenge's universe cardinality.
  if (committedUniverseContext.N !== section6AcceptedContext.universe_size) return null;

  const section7Verified = {
    ordered_selected_indices: indicesArtifact.indices.map(Number),
    ordered_selected_indices_digest: record.ordered_selected_indices_digest,
    challenge_subject_digest: record.challenge_subject_digest,
    challenge_record_digest: digestTokenOfCanonical(record),
  };
  return mint(section7Verified, committedUniverseContext);
}
