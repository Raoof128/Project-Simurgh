// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.6 — the opening-side limit-compatibility invariant (the §4.1.1 discipline applied to
// openings). Derives, through the PRODUCTION canonical encoder, the maximum canonical opening-bundle
// size for the operational profile (max k, MAX_CASE_BYTES, N, max authentication-path length). The
// §8 discharge requires MAX_OPENING_PACKAGE_CANONICAL_BYTES >= this value <= the transport ceiling,
// so an honest producer's largest valid opening is never rejected by its own precommitted limit.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { encodeDigestToken } from "../core/digestTokenCodec.mjs";

const token = (fill) => encodeDigestToken(Buffer.alloc(32, fill));

/** The maximum authentication-path length for N leaves under the §3.5 recursive MTH (upper bound). */
export function maxAuthPathLength(N) {
  if (!Number.isSafeInteger(N) || N < 1) throw new RangeError("N");
  return N === 1 ? 0 : Math.ceil(Math.log2(N));
}

/** A maximal opening bundle: k openings, each with a MAX_CASE_BYTES case and a full auth path. */
export function maximalOpeningBundle({ k, maxCaseBytes, N }) {
  const maxIndex = String(N - 1);
  // canonicalJson({ d: filler }) = '{"d":"' + filler + '"}' = 7 + len(filler) bytes.
  const filler = "x".repeat(Math.max(0, maxCaseBytes - 7));
  const authLen = maxAuthPathLength(N);
  const opening = {
    index: maxIndex,
    salt: token(0xaa),
    case: { d: filler },
    auth_path: Array.from({ length: authLen }, () => ({ sibling: token(0xbb), side: "left" })),
  };
  return {
    schema_id: "simurgh.vsc.opening_bundle.v1",
    challenge_record_digest: token(0xcc),
    openings: Array.from({ length: k }, () => opening),
    presented_history: [],
  };
}

/** The exact canonical byte size of the maximal opening bundle, measured by the production encoder. */
export function maxCanonicalOpeningBundleBytes(params) {
  return Buffer.byteLength(canonicalJson(maximalOpeningBundle(params)), "utf8");
}

/** True iff the policy admits the operational maximum: canonical >= max-opening, transport >= canonical. */
export function openingCompatibilityInvariantHolds(policy, opProfile) {
  const need = maxCanonicalOpeningBundleBytes(opProfile);
  return (
    policy.max_opening_package_canonical_bytes >= need &&
    policy.max_opening_package_transport_bytes >= policy.max_opening_package_canonical_bytes
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prof = { k: 128, maxCaseBytes: 65536, N: 65536 };
  console.log(
    "max canonical opening bundle bytes:",
    maxCanonicalOpeningBundleBytes(prof).toLocaleString()
  );
  console.log("max auth-path length (N=65536):", maxAuthPathLength(65536));
}
