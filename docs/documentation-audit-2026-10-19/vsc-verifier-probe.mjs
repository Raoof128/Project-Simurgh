// Documentation-only offline reproduction. No services, keys, or repository evidence are changed.
import assert from "node:assert/strict";
import {
  buildValidSection8Case,
  canonicalJson,
} from "../../tests/unit/llmShield/stage5o/section8Fixture.mjs";
import { makeSection9Fixture } from "../../tests/unit/llmShield/stage5o/section9Fixture.mjs";
import { makeSection12Fixture } from "../../tests/unit/llmShield/stage5o/section12Fixture.mjs";
import { buildValidSection7Case } from "../../tests/unit/llmShield/stage5o/section7SyntheticFixture.mjs";
import {
  genesisCheckpoint,
  suffixHeaders,
  REAL_CHAIN,
} from "../../tests/unit/llmShield/stage5o/realMainnetChain.mjs";
import { blockHashInternalHex } from "../../tools/simurgh-attestation/stage5o/core/bitcoinMainnetSuffixValidator.mjs";
import { mintCommittedUniverseContext } from "../../tools/simurgh-attestation/stage5o/core/committedUniverseContext.mjs";
import { acceptSection7ForSection8 } from "../../tools/simurgh-attestation/stage5o/core/acceptSection7ForSection8.mjs";
import { evaluateSection8Safe } from "../../tools/simurgh-attestation/stage5o/core/section8Verifier.mjs";
import { evaluateSection9Safe } from "../../tools/simurgh-attestation/stage5o/core/section9Verifier.mjs";
import {
  evaluateSection12Safe,
  LANES,
} from "../../tools/simurgh-attestation/stage5o/core/section12Verifier.mjs";
import { merkleLeaf } from "../../tools/simurgh-attestation/stage5o/core/merkleTree.mjs";
import { SUBJECT_FIELDS } from "../../tools/simurgh-attestation/stage5o/core/packageSubject.mjs";

const cases = [];
const record = (name, result, accept) => {
  assert.equal(result.accept === true, accept, name);
  cases.push({ name, result });
};
const s8 = buildValidSection8Case();
record("section8_fixture_control", evaluateSection8Safe(s8.acceptedCtx, s8.raw), true);
const history = structuredClone(s8.openingBundle);
history.presented_history = [{ challenge_record_digest: "a".repeat(64), disclosed_indices: ["0"] }];
record(
  "unauthenticated_history_accepted",
  evaluateSection8Safe(s8.acceptedCtx, canonicalJson(history)),
  true
);
history.presented_history[0].challenge_record_digest = s8.acceptedCtx.challenge_record_digest;
record(
  "exact_current_challenge_replay_rejected",
  evaluateSection8Safe(s8.acceptedCtx, canonicalJson(history)),
  false
);
assert.equal(cases.at(-1).result.reject, "s8_presented_history_invalid");
cases.push({
  name: "accepted_fixture_does_not_validate_full_case_or_census_schema",
  result: {
    declared_N: s8.acceptedCtx.N,
    census_rows: Object.keys(s8.acceptedCtx.execution_census).length,
    first_case_keys: Object.keys(s8.openingBundle.openings[0].case),
  },
});
assert.equal(Object.keys(s8.acceptedCtx.execution_census).length, 8);

// The same accepted challenge can be paired with a separately caller-minted root.
const one = buildValidSection8Case({ k: 1 });
const r7 = buildValidSection7Case({
  checkpoint: genesisCheckpoint(),
  headers: suffixHeaders(8),
  beaconValueHex: blockHashInternalHex(REAL_CHAIN[2][1]),
  precommittedBeaconHeight: 2,
  k: 1,
  universeSize: 256,
});
const universe = mintCommittedUniverseContext({
  ...one.committedUniverse,
  merkle_root: merkleLeaf(one.leaves[one.selected[0]]).toString("hex"),
  scope_manifest_identity: "unanchored-replacement",
});
const joined = acceptSection7ForSection8(r7.context, r7.bundle, universe);
const shortPath = structuredClone(one.openingBundle);
shortPath.openings[0].auth_path = [];
shortPath.challenge_record_digest = joined.challenge_record_digest;
record(
  "N256_single_leaf_root_empty_path_caller_minted_context",
  evaluateSection8Safe(joined, canonicalJson(shortPath)),
  true
);

const s12 = makeSection12Fixture();
record("section12_fixture_control", evaluateSection12Safe(s12.ctx, s12.raw), true);
const minimal = structuredClone(s12.pkg);
for (const s of minimal.sections) {
  s.payload = Object.fromEntries(SUBJECT_FIELDS.map((k) => [k, s.payload[k]]));
  if (s.key === "stage5o/verifier_receipts") {
    s.payload.receipts = Object.fromEntries(
      ["section7", "section8", "section9"].map((k) => [
        k,
        {
          verifier_id: "not-a-verifier",
          verifier_contract_digest: "unverified",
          input_artifact_digest: "unrelated-input",
          accepted_subject_digest: "wrong-subject",
          verdict: "ACCEPT",
          symbolic_reason: "accept",
          raw_code: 0,
          accepted_projection_digest: "unrelated-projection",
          unknown_field: true,
        },
      ])
    );
  }
}
record(
  "no_artifact_bodies_and_fabricated_receipts_accepted",
  evaluateSection12Safe(s12.ctx, canonicalJson(minimal)),
  true
);
record(
  "authority_context_without_resource_limits_accepted",
  evaluateSection12Safe(
    { package_subject_digest: s12.ctx.package_subject_digest },
    canonicalJson(minimal)
  ),
  true
);
const claimedB = structuredClone(minimal);
claimedB.lane = LANES.B;
claimedB.salts = Object.fromEntries(
  Object.keys(claimedB.salts).map((k, i) => [k, String(i + 1).repeat(64)])
);
record(
  "predictable_lane_b_salts_without_ceremony_receipt_accepted",
  evaluateSection12Safe(s12.ctx, canonicalJson(claimedB)),
  true
);
const wrongReceipt = structuredClone(minimal);
wrongReceipt.sections.find(
  (s) => s.key === "stage5o/verifier_receipts"
).payload.receipts.section7.raw_code = 425;
record(
  "nonzero_receipt_control_rejected",
  evaluateSection12Safe(s12.ctx, canonicalJson(wrongReceipt)),
  false
);
assert.equal(cases.at(-1).result.reason, "s12_package_shape");
const unknownPayload = structuredClone(minimal);
unknownPayload.sections[0].payload.regime = "different";
unknownPayload.sections[0].payload.section_id = "overridden";
record(
  "payload_can_override_stage4t_section_identity",
  evaluateSection12Safe(s12.ctx, canonicalJson(unknownPayload)),
  true
);

const s9 = makeSection9Fixture({
  policyOverride: {
    k_derivation_version: "unregistered-version",
    max_probability_decimal_digits: 1000,
    max_probability_intermediate_bits: 4194304,
  },
});
record(
  "caller_minted_probability_policy_unknown_version_and_expanded_limits",
  evaluateSection9Safe(s9.authority, s9.raw),
  true
);
console.log(
  JSON.stringify(
    {
      scope:
        "Offline direct-module probes using repository fixtures and committed historical headers. Accepted outputs are conditional on caller-created contexts; no full release or live anchor ceremony.",
      cases,
    },
    null,
    2
  )
);
