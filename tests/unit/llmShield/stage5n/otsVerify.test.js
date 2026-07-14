// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — offline OTS→Bitcoin verifier against the REAL banked .ots proofs (no network). Skips if absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { verifyOtsOffline } from "../../../../tools/simurgh-attestation/stage5n/node/otsVerify.mjs";

const CAP = "/Users/raoof.r12/Desktop/Raouf/test/stage5n-gate-capture";
const have = existsSync(`${CAP}/D_start.ots`);

test(
  "start .ots: leaf == D_start, recomputes to a Bitcoin merkle root at a confirmed height",
  { skip: !have },
  () => {
    const D = readFileSync(`${CAP}/D_start.hex`, "utf8").trim();
    const r = verifyOtsOffline(readFileSync(`${CAP}/D_start.ots`), D);
    assert.equal(r.leaf_ok, true);
    assert.equal(r.confirmed, true);
    assert.ok(r.attestations.length > 0);
    for (const a of r.attestations) {
      assert.ok(Number.isInteger(a.height) && a.height > 900000, `height ${a.height}`);
      assert.match(a.merkle_root, /^[0-9a-f]{64}$/, "offline-recomputed merkle root");
    }
  }
);

test("end .ots: leaf == D_end, confirmed", { skip: !have }, () => {
  const D = readFileSync(`${CAP}/D_end.hex`, "utf8").trim();
  const r = verifyOtsOffline(readFileSync(`${CAP}/D_end.ots`), D);
  assert.equal(r.leaf_ok, true);
  assert.equal(r.confirmed, true);
});

test("wrong expected leaf → leaf_ok false, not confirmed (no throw)", { skip: !have }, () => {
  const r = verifyOtsOffline(readFileSync(`${CAP}/D_start.ots`), "0".repeat(64));
  assert.equal(r.leaf_ok, false);
  assert.equal(r.confirmed, false);
});

test("garbage bytes → typed error, never a throw", () => {
  const r = verifyOtsOffline(Buffer.from("not an ots file"), "0".repeat(64));
  assert.equal(r.confirmed, false);
  assert.ok(r.error);
});
