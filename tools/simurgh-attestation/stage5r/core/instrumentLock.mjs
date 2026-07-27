// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 17: the instrument lock.
//
// Task 15 proves the instrument. Task 20 runs the campaign. Nothing in between stops the instrument
// changing, so without this 5R could prove Instrument A and run Instrument B, and no evidence in the
// stage could tell. The lock closes that window.
//
// THE CENSUS IS EXACT, AND ITS SCOPE IS CAMPAIGN-AFFECTING BYTES ONLY. An earlier draft said the lock
// covered "every deterministic core module and every campaign driver", which is self-defeating: Tasks
// 22–26 add ledger, attestation, parity and K7 code, so either the lock goes stale on the next task
// or the word "every" is false. Reporting, attestation, parity and K7 bytes get a separate
// release-surface root at Task 27. One lock does not pretend to be both.
//
// ADDING OR DELETING AN ELIGIBLE FILE MUST FAIL. The census is a SET, not a prefix: a lock that only
// checked the digests of files it already knew about would be silent about a new suppression
// transform appearing between the proof and the run.

import { createHash } from "node:crypto";

export const LOCK_DOMAIN = "simurgh.vpf.instrument-lock.v1";

/**
 * The exact set of paths whose bytes can change a campaign outcome.
 *
 * Anything not here is either incapable of affecting a verdict, a delta or an admissibility decision,
 * or belongs to the release surface rather than the instrument.
 */
export const LOCKED_PATHS = Object.freeze([
  "tools/simurgh-attestation/stage5r/core/admissibility.mjs",
  "tools/simurgh-attestation/stage5r/core/archetypes.mjs",
  "tools/simurgh-attestation/stage5r/core/controls.mjs",
  "tools/simurgh-attestation/stage5r/core/deltaLedger.mjs",
  "tools/simurgh-attestation/stage5r/core/familyContract.mjs",
  "tools/simurgh-attestation/stage5r/core/inherit.mjs",
  "tools/simurgh-attestation/stage5r/core/laneB.mjs",
  "tools/simurgh-attestation/stage5r/core/measurements.mjs",
  "tools/simurgh-attestation/stage5r/core/mutants.mjs",
  "tools/simurgh-attestation/stage5r/core/suppression.mjs",
  "tools/simurgh-attestation/stage5r/node/detectorChild.mjs",
  "tools/simurgh-attestation/stage5r/node/runMutationSelfProof.mjs",
]);

/**
 * Paths deliberately OUTSIDE the instrument lock, each with its reason.
 *
 * Named rather than absent: an unexplained omission and a decision look identical in a census.
 */
export const NOT_LOCKED = Object.freeze([
  { path: "core/prose.mjs", reason: "document gate; cannot change a campaign verdict" },
  { path: "core/rawCodeScan.mjs", reason: "document gate; cannot change a campaign verdict" },
  { path: "core/parityManifest.mjs", reason: "release surface — Task 27's release_surface_root" },
  {
    path: "core/scratchTree.mjs",
    reason: "test-harness plumbing; its failures are loud, not silent",
  },
  { path: "core/writeSurface.mjs", reason: "repository hygiene; no campaign input" },
  {
    path: "core/transition.mjs",
    reason: "prior-stage non-disturbance; measured before the campaign",
  },
]);

const sha = (text) =>
  createHash("sha256")
    .update(Buffer.from(LOCK_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(String(text), "utf8"))
    .digest("hex");

/**
 * Build the lock from a path → text map.
 *
 * @param {{files: Record<string,string>, runtime: object}} input
 * @returns {object}
 */
export function buildLock({ files, runtime }) {
  const missing = LOCKED_PATHS.filter((p) => typeof files[p] !== "string");
  if (missing.length) {
    throw new Error(
      `instrument lock: census names ${missing.length} path(s) that do not exist: ${missing.join(", ")}`
    );
  }
  const entries = LOCKED_PATHS.map((path) => ({ path, digest: sha(files[path]) }));
  return {
    schema: LOCK_DOMAIN,
    note:
      "The bytes that can change a campaign outcome, locked between the self-proof and the run. " +
      "Reporting, attestation, parity and K7 bytes are the release surface and are covered " +
      "separately; one lock does not pretend to be both.",
    census_is_exact: true,
    entry_count: entries.length,
    entries,
    not_locked: NOT_LOCKED,
    runtime,
  };
}

/**
 * Verify a lock against the current files, distinguishing the three ways it can be wrong.
 *
 * @param {{lock: object, files: Record<string,string>}} input
 * @returns {{ok: boolean, drifted: string[], added: string[], removed: string[]}}
 */
export function verifyLock({ lock, files }) {
  const locked = new Map(lock.entries.map((e) => [e.path, e.digest]));
  const drifted = [];
  const removed = [];
  for (const [path, digest] of locked) {
    if (typeof files[path] !== "string") {
      removed.push(path);
      continue;
    }
    if (sha(files[path]) !== digest) drifted.push(path);
  }
  // An ELIGIBLE file that appeared after the lock was taken. The census is a set: a new suppression
  // transform between the proof and the run is exactly the drift this catches.
  const added = LOCKED_PATHS.filter((p) => !locked.has(p) && typeof files[p] === "string");
  return {
    ok: drifted.length === 0 && added.length === 0 && removed.length === 0,
    drifted: drifted.sort(),
    added: added.sort(),
    removed: removed.sort(),
  };
}
