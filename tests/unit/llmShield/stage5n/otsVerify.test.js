// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — offline OTS→Bitcoin verifier against the REAL banked .ots proofs (no network).
//
// NO SKIPS (5S-F007). These tests were inert from the 5N ceremony until 2026-07-31 because they read
// a machine-local scratch directory that no longer existed, while the evidence sat committed in the
// tree under different filenames. A required committed capture that is absent is now a REFUSAL: the
// locator throws at module load rather than letting the suite report a quiet green over nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyOtsOffline } from "../../../../tools/simurgh-attestation/stage5n/node/otsVerify.mjs";

import {
  realEvidencePath,
  requireRealEvidence,
} from "../../../../tools/simurgh-attestation/stage5n/node/realEvidence.mjs";

requireRealEvidence();

test("start .ots: leaf == D_start, recomputes to a Bitcoin merkle root at a confirmed height", () => {
  const D = readFileSync(realEvidencePath("D_start_hex"), "utf8").trim();
  const r = verifyOtsOffline(readFileSync(realEvidencePath("start_ots")), D);
  assert.equal(r.leaf_ok, true);
  assert.equal(r.confirmed, true);
  assert.ok(r.attestations.length > 0);
  for (const a of r.attestations) {
    assert.ok(Number.isInteger(a.height) && a.height > 900000, `height ${a.height}`);
    assert.match(a.merkle_root, /^[0-9a-f]{64}$/, "offline-recomputed merkle root");
  }
});

test("end .ots: leaf == D_end, confirmed", () => {
  const D = readFileSync(realEvidencePath("D_end_hex"), "utf8").trim();
  const r = verifyOtsOffline(readFileSync(realEvidencePath("end_ots")), D);
  assert.equal(r.leaf_ok, true);
  assert.equal(r.confirmed, true);
});

test("wrong expected leaf → leaf_ok false, not confirmed (no throw)", () => {
  const r = verifyOtsOffline(readFileSync(realEvidencePath("start_ots")), "0".repeat(64));
  assert.equal(r.leaf_ok, false);
  assert.equal(r.confirmed, false);
});

test("garbage bytes → typed error, never a throw", () => {
  const r = verifyOtsOffline(Buffer.from("not an ots file"), "0".repeat(64));
  assert.equal(r.confirmed, false);
  assert.ok(r.error);
});
