// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5N — the locator for the REAL banked ceremony evidence.
//
// WHY THIS FILE EXISTS. Eight Stage 5N tests over real TSA and Bitcoin evidence were silently inert
// from the ceremony until 2026-07-31, because they resolved their inputs from
// `/Users/raoof.r12/Desktop/Raouf/test/stage5n-gate-capture` — a machine-local scratch directory
// outside the repository. The evidence itself had been committed under
// `docs/research/llm-shield/evidence/stage-5n/real-laneb/` all along, under different filenames. The
// camera kept working; it was pointed at an empty chair.
//
// THREE RULES FALL OUT OF THAT, AND THEY ARE NOT NEGOTIABLE HERE:
//
//   1. PATHS RESOLVE FROM THE MODULE, never from a user home and never from `process.cwd()`. A
//      checkout anywhere on any machine finds the same bytes.
//   2. A REQUIRED COMMITTED CAPTURE THAT IS ABSENT IS A REFUSAL, never a skip. Committed evidence and
//      live acquisition are different propositions: a live network ceremony that was not run is
//      honestly `not_captured`, but a file that is supposed to be in the tree and is not is a broken
//      gate. Conflating them is what made the defect invisible for a whole stage.
//   3. THE FILE SET IS PINNED AS A SET, both directions. A count agrees with itself while two files
//      swap places, and a renamed file is exactly how this defect started.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root, derived from THIS module's location — five levels up from `.../stage5n/node/`. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export const REAL_EVIDENCE_DIR = join(
  REPO_ROOT,
  "docs/research/llm-shield/evidence/stage-5n/real-laneb"
);

/**
 * Logical name → committed filename. The mapping is explicit because it is the thing that drifted:
 * the tests asked for `D_start.ots` and `submitter_pub.pem`, and the ceremony banked
 * `start.confirmed.ots` and `ceremony_submitter_pub.pem`.
 *
 * `*.confirmed.ots` is the deliberate choice over `*.pending.ots`: a pending OpenTimestamps proof has
 * no Bitcoin attestation yet, and these tests assert a confirmed height.
 */
export const REAL_EVIDENCE_FILES = Object.freeze({
  D_start_hex: "D_start.hex",
  D_end_hex: "D_end.hex",
  start_ots: "start.confirmed.ots",
  end_ots: "end.confirmed.ots",
  start_tsr: "start.tsr",
  end_tsr: "end.tsr",
  start_rekor_entry: "start_rekor_entry.json",
  end_rekor_entry: "end_rekor_entry.json",
  submitter_pub_pem: "ceremony_submitter_pub.pem",
  rekor_pub_pem: "rekor_prod_pub.pem",
});

/**
 * The complete committed listing, pinned as a set. Anything added, removed or renamed in the banked
 * ceremony directory surfaces here rather than in a test that quietly stops running.
 */
export const REAL_EVIDENCE_LISTING = Object.freeze([
  "D_end.hex",
  "D_start.hex",
  "EVIDENCE_MANIFEST.json",
  "ceremony_submitter_pub.pem",
  "contract.json",
  "end.confirmed.ots",
  "end.pending.ots",
  "end.tsq",
  "end.tsr",
  "end_artifact.txt",
  "end_rekor_entry.json",
  "end_rekor_post.json",
  "envelope.json",
  "fresh_start_evidence.json",
  "phase-b.json",
  "rekor_prod_pub.pem",
  "start.confirmed.ots",
  "start.pending.ots",
  "start.tsq",
  "start.tsr",
  "start_artifact.txt",
  "start_rekor_entry.json",
  "start_rekor_post.json",
]);

/**
 * Resolve one logical evidence name to an absolute path.
 *
 * @param {keyof REAL_EVIDENCE_FILES} logical
 * @returns {string}
 */
export function realEvidencePath(logical) {
  const filename = REAL_EVIDENCE_FILES[logical];
  if (!filename) throw new Error(`realEvidencePath: unknown logical name "${logical}"`);
  return join(REAL_EVIDENCE_DIR, filename);
}

/**
 * Audit the committed evidence directory. Reports missing, extra and renamed independently — a single
 * "ok" boolean would tell a reader something is wrong and nothing about what.
 *
 * @param {string} [dir] the directory to audit; defaults to the committed one. Overridable ONLY so a
 *   regression test can seed a damaged copy and watch the guard fire — never to relocate the real
 *   evidence, which is the defect this module exists to prevent.
 * @returns {{ok: boolean, dir: string, missing: string[], extra: string[], removed: string[],
 *            present: string[]}}
 */
export function auditRealEvidence(dir = REAL_EVIDENCE_DIR) {
  const listing = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => !f.startsWith("."))
        .sort()
    : [];
  const pinned = new Set(REAL_EVIDENCE_LISTING);
  const found = new Set(listing);

  const required = Object.values(REAL_EVIDENCE_FILES);
  return {
    ok:
      required.every((f) => found.has(f)) &&
      listing.every((f) => pinned.has(f)) &&
      REAL_EVIDENCE_LISTING.every((f) => found.has(f)),
    dir,
    // A required input that is not on disk. The defect this module exists to make impossible.
    missing: required.filter((f) => !found.has(f)),
    // In the tree but not in the pin: an addition nobody declared.
    extra: listing.filter((f) => !pinned.has(f)),
    // In the pin but not in the tree: a deletion or a rename.
    removed: REAL_EVIDENCE_LISTING.filter((f) => !found.has(f)),
    present: listing,
  };
}

/**
 * Assert the committed capture is intact, and REFUSE if it is not. Called at module load by every
 * real-evidence test file, so an absent capture fails the suite instead of silently skipping it.
 */
export function requireRealEvidence(dir = REAL_EVIDENCE_DIR) {
  const audit = auditRealEvidence(dir);
  if (audit.missing.length > 0 || audit.removed.length > 0) {
    throw new Error(
      `Stage 5N committed ceremony evidence is not intact under ${audit.dir}\n` +
        `  missing required: ${audit.missing.join(", ") || "none"}\n` +
        `  pinned but absent: ${audit.removed.join(", ") || "none"}\n` +
        "A required committed capture that is absent is a REFUSAL, never a skip."
    );
  }
  return audit;
}
