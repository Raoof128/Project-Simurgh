// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.9 — the generated §9 censuses and their digests (oracle-free).
//
// The identity grid is defined HERE and imported by the census test, so the evidence and the freeze
// receipt cannot describe two different grids. This stage's recurring defect is a census maintained
// in two places that disagree; one owner is the fix.
//
// Nothing below targets an expected value: the grid is enumerated from the size list, every case is
// evaluated by the production evaluators, and the digests are taken over the canonical result.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import {
  productQk,
  productQJ,
  pDetect,
  DEFAULT_EVALUATION_LIMITS,
} from "../core/exactProbability.mjs";
import { formatRational } from "../core/probabilityRational.mjs";
import { measureProbabilityCompatibility } from "./measureProbabilityCompatibility.mjs";

const sha256Hex = (s) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

/** The universe sizes the grid sweeps: powers of two, their neighbours, and irregular sizes. */
export const SECTION9_GRID_SIZES = Object.freeze([
  1, 2, 3, 4, 7, 8, 9, 16, 17, 100, 256, 257, 1024, 1247, 4096,
]);

/** Enumerate (N, J, k) covering J<k, J==k, J>k, N=1, k=1, k=N and the degenerate branch. */
export function section9IdentityGrid() {
  const grid = [];
  for (const N of SECTION9_GRID_SIZES) {
    for (const k of [1, 2, 3, N - 1, N, Math.max(1, N >> 1)]) {
      for (const J of [1, 2, N - 1, N, Math.max(1, N >> 2)]) {
        if (k < 1 || k > N || J < 1 || J > N) continue;
        grid.push([N, J, k]);
      }
    }
  }
  return grid;
}

/**
 * Evaluate every grid case, asserting nothing: the report records what the evaluators produced,
 * including whether the two product identities agreed. A consumer decides whether that is acceptable.
 */
export function section9IdentityCensus(limits = DEFAULT_EVALUATION_LIMITS) {
  const rows = [];
  let degenerate = 0;
  let compared = 0;
  let identityHolds = true;
  for (const [N, J, k] of section9IdentityGrid()) {
    const Nb = BigInt(N);
    const Jb = BigInt(J);
    const kb = BigInt(k);
    const r = pDetect(Nb, Jb, kb, limits);
    if (Nb - Jb < kb) {
      degenerate++;
      rows.push({ N, J, k, form: r.form, terms: r.terms, p_detect: formatRational(r.value) });
      continue;
    }
    const qk = productQk(Nb, Jb, kb, limits);
    const qj = productQJ(Nb, Jb, kb, limits);
    const agree = qk.n === qj.n && qk.d === qj.d;
    if (!agree) identityHolds = false;
    compared++;
    rows.push({
      N,
      J,
      k,
      form: r.form,
      terms: r.terms,
      p_detect: formatRational(r.value),
      identity_agrees: agree,
    });
  }
  return {
    sizes: [...SECTION9_GRID_SIZES],
    total_cases: rows.length,
    compared_cases: compared,
    degenerate_cases: degenerate,
    identity_holds: identityHolds,
    rows,
  };
}

/** The full §9 census report plus the digests recorded in the freeze receipt. */
export function section9CensusReport() {
  const identity = section9IdentityCensus();
  const compatibility = measureProbabilityCompatibility();
  return {
    identity_grid: identity,
    compatibility_proof: compatibility,
    digests: {
      identity_grid_digest: sha256Hex(canonicalJson(identity)),
      compatibility_proof_digest: sha256Hex(canonicalJson(compatibility)),
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith("measureSection9Censuses.mjs")) {
  process.stdout.write(canonicalJson(section9CensusReport()) + "\n");
}
