// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 Lane B — the real Bitcoin-mainnet suffix validator, pinned to public known-answer
// vectors (the genesis block and block 1). No network access; pure functions of bytes.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeHeader,
  doubleSha256,
  blockHashInternalHex,
  blockHashDisplayHex,
  compactTargetToBig,
  validateBitcoinMainnetSuffix,
} from "../../../../tools/simurgh-attestation/stage5o/core/bitcoinMainnetSuffixValidator.mjs";

// Bitcoin genesis block (height 0) and block 1 — public, immutable.
const GENESIS =
  "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c";
const GENESIS_DISPLAY = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
const BLOCK1 =
  "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299";
const BLOCK1_DISPLAY = "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048";
const MAINNET = "simurgh.bitcoin.mainnet.header_validation.v1";

test("decode: a genesis header parses to the six fields, 80 bytes", () => {
  const h = decodeHeader(GENESIS);
  assert.equal(h.version, 1);
  assert.equal(h.prevBlockInternalHex, "0".repeat(64));
  assert.equal(h.nBitsHex, "ffff001d");
});

test("hash: double-SHA256 of the genesis header gives the known display hash", () => {
  assert.equal(blockHashDisplayHex(GENESIS), GENESIS_DISPLAY);
  assert.equal(blockHashDisplayHex(BLOCK1), BLOCK1_DISPLAY);
  // internal order is the byte-reverse of display
  assert.equal(
    blockHashInternalHex(GENESIS),
    Buffer.from(GENESIS_DISPLAY, "hex").reverse().toString("hex")
  );
});

test("compact target: 0x1d00ffff decodes to the genesis/pow-limit target", () => {
  const t = compactTargetToBig(0x1d00ffff);
  assert.equal(t, 0x00000000ffff0000000000000000000000000000000000000000000000000000n);
});

test("pow: the genesis hash is below its target (real proof of work)", () => {
  const target = compactTargetToBig(0x1d00ffff);
  const hashLe = BigInt("0x" + blockHashDisplayHex(GENESIS)); // display == big-endian numeric
  assert.ok(hashLe <= target);
});

test("doubleSha256 is exposed and 32 bytes", () => {
  assert.equal(doubleSha256(Buffer.from(GENESIS, "hex")).length, 32);
});

function checkpointOf(headerHex, height, displayHash) {
  return {
    network_profile_id: MAINNET,
    checkpoint_height: String(height),
    checkpoint_block_hash: displayHash,
    checkpoint_header: headerHex,
    checkpoint_nbits: "ffff001d",
    checkpoint_witness_profile_id: "simurgh.vsc.checkpoint_witness.v1",
    checkpoint_witness_profile_digest: "11".repeat(32),
    checkpoint_witness_key_fingerprint: "22".repeat(32),
    stage5l_checkpoint_evidence_digest: "33".repeat(32),
  };
}

const limits = { maxHeaders: 2016, retargetInterval: 2016 };

test("validate: genesis checkpoint + block 1 suffix accepts and extracts the beacon", () => {
  const r = validateBitcoinMainnetSuffix({
    checkpoint: checkpointOf(GENESIS, 0, GENESIS_DISPLAY),
    headers: [BLOCK1],
    precommittedBeaconHeight: "1",
    expectedNetworkProfileId: MAINNET,
    resourceLimits: limits,
  });
  assert.equal(r.ok, true, r.ok ? "" : r.reason);
  assert.equal(r.value.beaconHeight, 1);
  assert.equal(r.value.finalSuffixHeight, 1);
  assert.equal(r.value.beaconValue, blockHashInternalHex(BLOCK1));
  assert.equal(r.value.networkProfileId, MAINNET);
});

test("validate: broken prev_block linkage rejects", () => {
  // A block-1 header whose prev_block does not root in the genesis checkpoint.
  const bad = "01000000" + "ab".repeat(32) + BLOCK1.slice(8 + 64);
  const r = validateBitcoinMainnetSuffix({
    checkpoint: checkpointOf(GENESIS, 0, GENESIS_DISPLAY),
    headers: [bad],
    precommittedBeaconHeight: "1",
    expectedNetworkProfileId: MAINNET,
    resourceLimits: limits,
  });
  assert.equal(r.ok, false);
});

test("validate: a mutated nonce (invalid PoW) rejects", () => {
  const badNonce = BLOCK1.slice(0, 152) + "deadbeef";
  const r = validateBitcoinMainnetSuffix({
    checkpoint: checkpointOf(GENESIS, 0, GENESIS_DISPLAY),
    headers: [badNonce],
    precommittedBeaconHeight: "1",
    expectedNetworkProfileId: MAINNET,
    resourceLimits: limits,
  });
  assert.equal(r.ok, false);
});

test("validate: a non-mainnet network profile rejects", () => {
  const r = validateBitcoinMainnetSuffix({
    checkpoint: checkpointOf(GENESIS, 0, GENESIS_DISPLAY),
    headers: [BLOCK1],
    precommittedBeaconHeight: "1",
    expectedNetworkProfileId: "simurgh.bitcoin.testnet.v1",
    resourceLimits: limits,
  });
  assert.equal(r.ok, false);
});

test("validate: a beacon height outside the chain rejects", () => {
  const r = validateBitcoinMainnetSuffix({
    checkpoint: checkpointOf(GENESIS, 0, GENESIS_DISPLAY),
    headers: [BLOCK1],
    precommittedBeaconHeight: "9",
    expectedNetworkProfileId: MAINNET,
    resourceLimits: limits,
  });
  assert.equal(r.ok, false);
});

test("validate: more headers than the resource ceiling rejects", () => {
  const r = validateBitcoinMainnetSuffix({
    checkpoint: checkpointOf(GENESIS, 0, GENESIS_DISPLAY),
    headers: [BLOCK1],
    precommittedBeaconHeight: "1",
    expectedNetworkProfileId: MAINNET,
    resourceLimits: { maxHeaders: 0, retargetInterval: 2016 },
  });
  assert.equal(r.ok, false);
});
