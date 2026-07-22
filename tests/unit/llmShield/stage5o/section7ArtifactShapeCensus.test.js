// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 — the exact-key SHAPE CENSUS (§7.3.7).
//
// section7AuthorityDescriptors.mjs is the normative source; challengeArtifactShape.mjs must MIRROR
// it, never the reverse (§7.3.4). This census proves the mirror: for each of the four producer
// artifacts the shape module's exact-key set EQUALS the descriptor's field set — independently
// declared and proven equal, not derived (derivation would make the census vacuous). A field added
// to a descriptor with no matching shape key (or a shape key with no descriptor field) fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCHEMA_DESCRIPTORS } from "../../../../tools/simurgh-attestation/stage5o/core/section7AuthorityDescriptors.mjs";
import {
  BEACON_CONTRACT_ARTIFACT_KEYS,
  BEACON_SUFFIX_ARTIFACT_KEYS,
  ORDERED_SELECTED_INDICES_ARTIFACT_KEYS,
  CHALLENGE_RECORD_KEYS,
  VERIFIED_CLOSURE_BITCOIN_CHECKPOINT_KEYS,
  checkBeaconContractArtifactShape,
} from "../../../../tools/simurgh-attestation/stage5o/core/challengeArtifactShape.mjs";
import { encodeDigestToken } from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import {
  SCHEMA_IDS,
  PROFILE_IDS,
  BEACON_SOURCE_ID,
  BEACON_DEPTH_CONVENTION_ID,
} from "../../../../tools/simurgh-attestation/stage5o/core/constants.mjs";

const tok = (fill) => encodeDigestToken(Buffer.alloc(32, fill));
const validBeaconContract = () => ({
  schema_id: SCHEMA_IDS.beacon_contract,
  schema_digest: tok(0x11),
  profile_id: PROFILE_IDS.beacon_contract,
  profile_digest: tok(0x12),
  beacon_source_id: BEACON_SOURCE_ID,
  depth_convention_id: BEACON_DEPTH_CONVENTION_ID,
  challenge_height: "850000",
});

const sortedSet = (a) => [...a].sort();

const CASES = [
  ["beacon_contract", BEACON_CONTRACT_ARTIFACT_KEYS],
  ["beacon_suffix", BEACON_SUFFIX_ARTIFACT_KEYS],
  ["ordered_selected_indices", ORDERED_SELECTED_INDICES_ARTIFACT_KEYS],
  ["challenge_record", CHALLENGE_RECORD_KEYS],
  ["verified_closure_bitcoin_checkpoint", VERIFIED_CLOSURE_BITCOIN_CHECKPOINT_KEYS],
];

for (const [name, keys] of CASES) {
  test(`shape census: ${name} shape keys mirror the descriptor field set exactly`, () => {
    const descriptorFields = sortedSet(Object.keys(SCHEMA_DESCRIPTORS[name].fields));
    assert.deepEqual(
      sortedSet(keys),
      descriptorFields,
      `${name}: shape module key-set must equal SCHEMA_DESCRIPTORS.${name}.fields keys`
    );
  });
}

test("shape census: no producer artifact declares a duplicate key", () => {
  for (const [name, keys] of CASES) {
    assert.equal(new Set(keys).size, keys.length, `${name}: shape key-set has a duplicate`);
  }
});

test("beacon_contract shape: a valid instance is accepted", () => {
  assert.doesNotThrow(() => checkBeaconContractArtifactShape(validBeaconContract()));
});

test("beacon_contract shape: wrong depth_convention_id REJECTs", () => {
  const bad = validBeaconContract();
  bad.depth_convention_id = "simurgh.bitcoin.depth.inclusive_block_count.v1";
  assert.throws(
    () => checkBeaconContractArtifactShape(bad),
    /beacon_contract_depth_convention_id/,
    "a non-frozen depth convention must reject"
  );
});

test("beacon_contract shape: a missing key REJECTs (exact-key schema)", () => {
  const bad = validBeaconContract();
  delete bad.challenge_height;
  assert.throws(() => checkBeaconContractArtifactShape(bad), /exact_key_schema/);
});
