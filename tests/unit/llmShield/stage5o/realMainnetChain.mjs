// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 Lane B/C — a committed REAL Bitcoin-mainnet contiguous chain (genesis + blocks 1..8).
//
// NOT a test file. These are the exact raw 80-byte headers; CI never touches the network. Blocks
// 0..8 are a single difficulty period (nBits 0x1d00ffff), so the same-period rule holds and a beacon
// early in the suffix has >= 6 descendants (check 7). The witness fields on the checkpoint are
// Section-6 evidence, not Bitcoin data; they are placeholders here (the Bitcoin validator ignores
// them; the verifier only shape-checks them).
//
// PROVENANCE (Lane B capture ceremony):
//   source:     https://blockstream.info/api  (block-height/:h then block/:hash/header)
//   retrieved:  2026-07-22T05:25:13Z
//   heights:    0..8   network: bitcoin mainnet   nBits: ffff001d (period 0)
//   independent cross-check: header hashes below equal the well-known public block hashes, and the
//   committed bytes reproduce them via double-SHA256 (bitcoinMainnetSuffixValidator).
export const REAL_MAINNET_PROVENANCE = Object.freeze({
  source: "https://blockstream.info/api",
  retrieved: "2026-07-22T05:25:13Z",
  network_profile_id: "simurgh.bitcoin.mainnet.header_validation.v1",
  heights: "0..8",
  nbits: "ffff001d",
});

// [height, headerHex80, displayHash]
export const REAL_CHAIN = Object.freeze([
  [
    0,
    "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c",
    "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
  ],
  [
    1,
    "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299",
    "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048",
  ],
  [
    2,
    "010000004860eb18bf1b1620e37e9490fc8a427514416fd75159ab86688e9a8300000000d5fdcc541e25de1c7a5addedf24858b8bb665c9f36ef744ee42c316022c90f9bb0bc6649ffff001d08d2bd61",
    "000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da3fdcc99ddbd",
  ],
  [
    3,
    "01000000bddd99ccfda39da1b108ce1a5d70038d0a967bacb68b6b63065f626a0000000044f672226090d85db9a9f2fbfe5f0f9609b387af7be5b7fbb7a1767c831c9e995dbe6649ffff001d05e0ed6d",
    "0000000082b5015589a3fdf2d4baff403e6f0be035a5d9742c1cae6295464449",
  ],
  [
    4,
    "010000004944469562ae1c2c74d9a535e00b6f3e40ffbad4f2fda3895501b582000000007a06ea98cd40ba2e3288262b28638cec5337c1456aaf5eedc8e9e5a20f062bdf8cc16649ffff001d2bfee0a9",
    "000000004ebadb55ee9096c9a2f8880e09da59c0d68b1c228da88e48844a1485",
  ],
  [
    5,
    "0100000085144a84488ea88d221c8bd6c059da090e88f8a2c99690ee55dbba4e00000000e11c48fecdd9e72510ca84f023370c9a38bf91ac5cae88019bee94d24528526344c36649ffff001d1d03e477",
    "000000009b7262315dbf071787ad3656097b892abffd1f95a1a022f896f533fc",
  ],
  [
    6,
    "01000000fc33f596f822a0a1951ffdbf2a897b095636ad871707bf5d3162729b00000000379dfb96a5ea8c81700ea4ac6b97ae9a9312b2d4301a29580e924ee6761a2520adc46649ffff001d189c4c97",
    "000000003031a0e73735690c5a1ff2a4be82553b2a12b776fbd3a215dc8f778d",
  ],
  [
    7,
    "010000008d778fdc15a2d3fb76b7122a3b5582bea4f21f5a0c693537e7a03130000000003f674005103b42f984169c7d008370967e91920a6a5d64fd51282f75bc73a68af1c66649ffff001d39a59c86",
    "0000000071966c2b1d065fd446b1e485b2c9d9594acd2007ccbd5441cfc89444",
  ],
  [
    8,
    "010000004494c8cf4154bdcc0720cd4a59d9c9b285e4b146d45f061d2b6c967100000000e3855ed886605b6d4a99d5fa2ef2e9b0b164e63df3c4136bebf2d0dac0f1f7a667c86649ffff001d1c4b5666",
    "00000000408c48f847aa786c2268fc3e6ec2af68e8468a34a28c61b7f1de0dc6",
  ],
]);

const MAINNET = "simurgh.bitcoin.mainnet.header_validation.v1";

/** The genesis block as an accepted-context checkpoint (witness fields are Section-6 placeholders). */
export function genesisCheckpoint() {
  const [, header, hash] = REAL_CHAIN[0];
  return {
    network_profile_id: MAINNET,
    checkpoint_height: "0",
    checkpoint_block_hash: hash,
    checkpoint_header: header,
    checkpoint_nbits: "ffff001d",
    checkpoint_witness_profile_id: "simurgh.vsc.checkpoint_witness.v1",
    checkpoint_witness_profile_digest: "11".repeat(32),
    checkpoint_witness_key_fingerprint: "22".repeat(32),
    stage5l_checkpoint_evidence_digest: "33".repeat(32),
  };
}

/** The suffix headers (blocks 1..n) for a genesis-rooted suffix. */
export function suffixHeaders(count = 8) {
  return REAL_CHAIN.slice(1, 1 + count).map(([, header]) => header);
}
