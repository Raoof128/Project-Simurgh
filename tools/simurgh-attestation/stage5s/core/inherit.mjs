// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — inheritance from 5R's C1 commitment, as pure functions.
//
// Ruling 2: no I/O here. `node/loadInheritedRoots.mjs` reads bytes and hands them over.
//
// ROOTS BEFORE SIGNATURES. 5R verifies in that order and 5S keeps it, because the failure it
// prevents is subtle: a signature gate that runs first verifies that SOMEONE correctly signed
// SOMETHING, and then a root mismatch is reported as a secondary detail — or not reported at all,
// because the run already failed for a "better" reason. The digest of the bytes is the primary fact.
//
// WHAT 5S INHERITS AND WHAT IT DOES NOT. It inherits the C1 digest and binds it. It does not inherit
// 5R's authority to speak about 5R's campaign, and it does not become the external witness C1's own
// note asks for — §1.5: the stage supplies the mechanism, it is not itself an independent witness.

import { createHash } from "node:crypto";

export const INHERIT_REFUSALS = Object.freeze({
  ROOT_DIGEST_MISMATCH: "c1_root_digest_mismatch",
  MISSING_ROOT: "c1_missing_required_root",
  SIGNATURE_INVALID: "c1_signature_invalid",
});

/** The roots a C1 commitment must carry for 5S to bind it at all. */
export const REQUIRED_C1_ROOTS = Object.freeze([
  "detector_implementation_digest",
  "instrument_lock_digest",
  "tranche_digest",
  "runner_digest",
  "schema",
]);

const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * Validate an inherited C1 commitment. Pure.
 *
 * @param {{bytes: Buffer|string, parsed: object, expectedDigest: string,
 *          verifySignature?: () => boolean}} input
 * @returns {{ok: boolean, refusals: Array<{reason: string, detail?: string}>}}
 */
export function validateInheritance(input) {
  const { bytes, parsed, expectedDigest, verifySignature } = input;
  const refusals = [];

  // 1. ROOTS. The digest of the bytes we were handed, against the digest we were told to expect.
  const actual = sha256Hex(bytes);
  if (actual !== expectedDigest) {
    refusals.push({
      reason: INHERIT_REFUSALS.ROOT_DIGEST_MISMATCH,
      detail: `expected ${expectedDigest}, computed ${actual}`,
    });
    // Return before the signature gate: a signature over the wrong roots is not reassurance.
    return { ok: false, refusals };
  }

  for (const root of REQUIRED_C1_ROOTS) {
    if (parsed?.[root] === undefined) {
      refusals.push({ reason: INHERIT_REFUSALS.MISSING_ROOT, detail: root });
    }
  }
  if (refusals.length > 0) return { ok: false, refusals };

  // 2. SIGNATURE, last, and only over roots that already agree.
  if (typeof verifySignature === "function" && verifySignature() !== true) {
    refusals.push({ reason: INHERIT_REFUSALS.SIGNATURE_INVALID });
  }
  return { ok: refusals.length === 0, refusals };
}

/**
 * The binding 5S carries into its own attestation root.
 *
 * @param {{source_path: string, source_digest: string, source_commit: string, parsed: object}} loaded
 */
export function c1Binding(loaded) {
  return Object.freeze({
    inherited_from: "5R",
    c1_source_path: loaded.source_path,
    c1_source_commit: loaded.source_commit,
    c1_digest: loaded.source_digest,
    c1_domain: String(loaded.parsed?.schema ?? ""),
  });
}
