// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8 — a valid opening case builder (NOT a test file). Constructs a real committed universe
// (N leaves, real Merkle root, execution census with correct case-links), accepts a real §7 challenge
// through the sealed adapter, and builds a valid opening bundle for the selected indices.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  encodeDigestToken,
  decodeDigestToken,
} from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import {
  caseDigest,
  leafId,
  caseLinkCommitment,
} from "../../../../tools/simurgh-attestation/stage5o/core/leafConstruction.mjs";
import {
  MTH,
  buildInclusionPath,
} from "../../../../tools/simurgh-attestation/stage5o/core/merkleTree.mjs";
import { mintCommittedUniverseContext } from "../../../../tools/simurgh-attestation/stage5o/core/committedUniverseContext.mjs";
import { disclosurePolicyDigest } from "../../../../tools/simurgh-attestation/stage5o/core/disclosurePolicy.mjs";
import { acceptSection7ForSection8 } from "../../../../tools/simurgh-attestation/stage5o/core/acceptSection7ForSection8.mjs";
import { buildValidSection7Case } from "./section7SyntheticFixture.mjs";
import { genesisCheckpoint, suffixHeaders, REAL_CHAIN } from "./realMainnetChain.mjs";
import { blockHashInternalHex } from "../../../../tools/simurgh-attestation/stage5o/core/bitcoinMainnetSuffixValidator.mjs";

const sha256 = (s) => createHash("sha256").update(s).digest();
export const EPOCH_TOKEN = encodeDigestToken(Buffer.alloc(32, 0x77));
export const POLICY = Object.freeze({
  max_opening_package_transport_bytes: 1048576,
  max_opening_package_canonical_bytes: 524288,
  max_presented_history_transport_bytes: 1048576,
  max_presented_history_canonical_bytes: 524288,
  max_presented_history_entries: 1024,
  max_cumulative_disclosed_indices: 64,
});

/** Build a valid §8 opening case over the real §7 challenge. Returns everything the tests mutate. */
export function buildValidSection8Case({ N = 256, k = 8, budget, policyOverride } = {}) {
  const policy = {
    ...POLICY,
    ...(budget ? { max_cumulative_disclosed_indices: budget } : {}),
    ...(policyOverride || {}),
  };
  const r7 = buildValidSection7Case({
    checkpoint: genesisCheckpoint(),
    headers: suffixHeaders(8),
    beaconValueHex: blockHashInternalHex(REAL_CHAIN[2][1]),
    precommittedBeaconHeight: 2,
    k,
    universeSize: N,
  });
  const selected = JSON.parse(r7.bundle.ordered_selected_indices).indices.map(Number);

  const epochRaw = decodeDigestToken(EPOCH_TOKEN);
  const leaves = [];
  const parts = [];
  for (let i = 0; i < N; i++) {
    const caseObj = { i };
    const salt = sha256("salt:" + i);
    const cd = caseDigest(Buffer.from(canonicalJson(caseObj), "utf8"));
    leaves.push(leafId(epochRaw, i, salt, cd));
    parts.push({ caseObj, salt, cd });
  }
  const root = MTH(leaves);

  const census = {};
  for (const i of selected) {
    const execDigest = encodeDigestToken(sha256("exec:" + i));
    const clc = caseLinkCommitment(parts[i].cd, decodeDigestToken(execDigest));
    census[i] = {
      case_link_commitment: encodeDigestToken(clc),
      execution_record_digest: execDigest,
    };
  }

  const committedUniverse = mintCommittedUniverseContext({
    scope_manifest_identity: "simurgh.vsc.scope_manifest.v1",
    merkle_root: encodeDigestToken(root),
    epoch_digest: EPOCH_TOKEN,
    N,
    execution_census: census,
    disclosure_policy: policy,
    precommitted_disclosure_policy_digest: disclosurePolicyDigest(policy),
  });

  const acceptedCtx = acceptSection7ForSection8(r7.context, r7.bundle, committedUniverse);

  const openings = [...selected]
    .sort((a, b) => a - b)
    .map((i) => ({
      index: String(i),
      salt: encodeDigestToken(parts[i].salt),
      case: parts[i].caseObj,
      auth_path: buildInclusionPath(leaves, i).map((s) => ({
        sibling: encodeDigestToken(s.sibling),
        side: s.side,
      })),
    }));
  const openingBundle = {
    schema_id: "simurgh.vsc.opening_bundle.v1",
    challenge_record_digest: acceptedCtx.challenge_record_digest,
    openings,
    presented_history: [],
  };
  return {
    acceptedCtx,
    committedUniverse,
    openingBundle,
    raw: canonicalJson(openingBundle),
    selected: [...selected].sort((a, b) => a - b),
    parts,
    leaves,
  };
}

export { canonicalJson };
