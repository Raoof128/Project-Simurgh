// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 Lane B + Lane C.
//
// Lane B proves the real Bitcoin validator's semantics against a committed real mainnet chain
// (genesis + blocks 1..8). Lane C proves the PRODUCTION composition: the exported two-argument
// verifier, wired to the real validator, accepts a real producer bundle and maps a real check-6
// rejection to the symbolic reason (never raw 29). No live network — the chain bytes are committed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateBitcoinMainnetSuffix,
  blockHashInternalHex,
} from "../../../../tools/simurgh-attestation/stage5o/core/bitcoinMainnetSuffixValidator.mjs";
import {
  verifySection7Relation,
  evaluateSection7Safe,
} from "../../../../tools/simurgh-attestation/stage5o/core/section7Verifier.mjs";
import { RAW_VERIFIER_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { genesisCheckpoint, suffixHeaders, REAL_CHAIN } from "./realMainnetChain.mjs";
import { buildValidSection7Case, bundleOf } from "./section7SyntheticFixture.mjs";

const MAINNET = "simurgh.bitcoin.mainnet.header_validation.v1";
const limits = { maxHeaders: 2016, retargetInterval: 2016 };
const validateReal = (over = {}) =>
  validateBitcoinMainnetSuffix({
    checkpoint: genesisCheckpoint(),
    headers: suffixHeaders(8),
    precommittedBeaconHeight: "2",
    expectedNetworkProfileId: MAINNET,
    resourceLimits: limits,
    ...over,
  });

// ---- Lane B: the real validator over the committed real chain.

test("Lane B: the real chain validates; derived goldens (beacon at height 2, depth 6)", () => {
  const r = validateReal();
  assert.equal(r.ok, true, r.ok ? "" : r.reason);
  assert.equal(r.value.beaconHeight, 2);
  assert.equal(r.value.finalSuffixHeight, 8);
  assert.equal(r.value.finalSuffixHeight - r.value.beaconHeight, 6);
  assert.equal(r.value.beaconValue, blockHashInternalHex(REAL_CHAIN[2][1]));
  assert.equal(r.value.checkpointBlockHash, REAL_CHAIN[0][2]);
  assert.equal(r.value.validatedHeaderCount, 8);
});

test("Lane B: broken previous-block linkage rejects", () => {
  const headers = suffixHeaders(8);
  headers[3] = "01000000" + "ab".repeat(32) + headers[3].slice(72); // clobber prev_block
  assert.equal(validateReal({ headers }).ok, false);
});

test("Lane B: reordered headers reject", () => {
  const headers = suffixHeaders(8);
  [headers[2], headers[3]] = [headers[3], headers[2]];
  assert.equal(validateReal({ headers }).ok, false);
});

test("Lane B: an omitted header rejects (linkage gap)", () => {
  const headers = suffixHeaders(8).filter((_, i) => i !== 4);
  assert.equal(validateReal({ headers }).ok, false);
});

test("Lane B: a mutated nonce (invalid PoW) rejects", () => {
  const headers = suffixHeaders(8);
  headers[5] = headers[5].slice(0, 152) + "deadbeef";
  assert.equal(validateReal({ headers }).ok, false);
});

test("Lane B: a non-mainnet expected profile rejects", () => {
  assert.equal(validateReal({ expectedNetworkProfileId: "simurgh.bitcoin.testnet.v1" }).ok, false);
});

test("Lane B: a changed checkpoint root rejects", () => {
  const cp = { ...genesisCheckpoint(), checkpoint_block_hash: "ff".repeat(32) };
  assert.equal(validateReal({ checkpoint: cp }).ok, false);
});

test("Lane B: a beacon height outside the suffix rejects (0 and 9)", () => {
  assert.equal(validateReal({ precommittedBeaconHeight: "0" }).ok, false);
  assert.equal(validateReal({ precommittedBeaconHeight: "9" }).ok, false);
});

test("Lane B: a suffix over the header ceiling rejects", () => {
  assert.equal(
    validateReal({ resourceLimits: { maxHeaders: 3, retargetInterval: 2016 } }).ok,
    false
  );
});

test("Lane B: internal and display hash order never coincide", () => {
  const h = REAL_CHAIN[1][1];
  assert.notEqual(blockHashInternalHex(h), REAL_CHAIN[1][2]); // internal != display
  assert.equal(
    Buffer.from(blockHashInternalHex(h), "hex").reverse().toString("hex"),
    REAL_CHAIN[1][2]
  );
});

// ---- Lane C: the production two-argument verifier over a REAL producer bundle.

function realCase() {
  return buildValidSection7Case({
    checkpoint: genesisCheckpoint(),
    headers: suffixHeaders(8),
    beaconValueHex: blockHashInternalHex(REAL_CHAIN[2][1]), // block-2 internal hash (height 2)
    precommittedBeaconHeight: 2,
    k: 8,
    universeSize: 256,
  });
}

test("Lane C: the exported verifier + real validator + real bundle ACCEPTs", () => {
  const { context, bundle } = realCase();
  assert.deepEqual(verifySection7Relation(context, bundle), { accept: true });
});

test("Lane C: a real check-6 rejection stays symbolic (s7_chain_invalid), never raw 29", () => {
  const { context, parts } = realCase();
  const broken = { ...parts };
  broken.beaconSuffix = {
    ...parts.beaconSuffix,
    headers: [...parts.beaconSuffix.headers.slice(0, -1), "f".repeat(160)],
  };
  const bundle = bundleOf(broken);
  assert.deepEqual(evaluateSection7Safe(context, bundle), { reject: "s7_chain_invalid" });
  assert.notEqual(
    evaluateSection7Safe(context, bundle).raw_code,
    RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED
  );
});

test("Lane C: the production verifier is two-argument; a third argument cannot weaken it", () => {
  const { context, bundle } = realCase();
  assert.equal(verifySection7Relation.length, 2);
  const evil = () => ({ ok: true, value: {} });
  assert.deepEqual(verifySection7Relation(context, bundle, evil), { accept: true });
});
