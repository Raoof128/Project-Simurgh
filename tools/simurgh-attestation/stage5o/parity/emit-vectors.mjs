// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.8 item 4 — the cross-runtime parity VECTOR EMITTER (Node reference).
//
// Emits every cryptographic value that reaches a Section 7 verdict, computed by the real modules from
// fixed inputs. NO expected digest is embedded — the modules compute the outputs, and the Python and
// browser runners recompute them independently and compare byte-for-byte. Node is NOT authoritative;
// it is one of three runtimes that must agree. Run: node emit-vectors.mjs > section7_parity_vectors.json
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { encodeDigestToken, decodeDigestToken } from "../core/digestTokenCodec.mjs";
import { hkdfExtract, hkdfExpand } from "../core/hkdf.mjs";
import { deriveChallengeIndices } from "../core/challengeIndexSampler.mjs";
import {
  decodeHeader,
  blockHashInternalHex,
  blockHashDisplayHex,
  compactTargetToBig,
} from "../core/bitcoinMainnetSuffixValidator.mjs";
import { generateAuthorityRegistry } from "../node/measureStage5oAuthorityRegistry.mjs";
import { PROFILE_DESCRIPTORS, SCHEMA_DESCRIPTORS } from "../core/section7AuthorityDescriptors.mjs";
import {
  caseDigest,
  leafId,
  caseLinkCommitment,
  CASE_DOMAIN,
  LEAF_DOMAIN,
  EXECUTION_CASE_LINK_DOMAIN,
} from "../core/leafConstruction.mjs";
import { MTH, buildInclusionPath } from "../core/merkleTree.mjs";
import { disclosurePolicyDigest, DISCLOSURE_POLICY_DOMAIN } from "../core/disclosurePolicy.mjs";

const sha256 = (buf) => createHash("sha256").update(buf).digest();
const hex = (s) => Buffer.from(s, "hex");
const R = (fill) => Buffer.alloc(32, fill);

const PAIR22 = PROFILE_DESCRIPTORS.challenge_protocol_profile;
const SEED_RULE = PAIR22.rules.find((r) => r.rule_id === "challenge_seed");
const CHECKPOINT_RULE = PAIR22.rules.find((r) => r.rule_id === "checkpoint_instance_digest");
const SEED_DOMAIN = SEED_RULE.seed_domain;
const DRAW_DOMAIN = SEED_RULE.draw_domain;
const CHECKPOINT_DOMAIN = CHECKPOINT_RULE.domain;
const PAIR18_ID = SCHEMA_DESCRIPTORS.verified_closure_bitcoin_checkpoint.schema_id;
const PAIR22_ID = PAIR22.profile_id;

const { registry, perId } = generateAuthorityRegistry();

// Public real Bitcoin headers (genesis, block 1, block 2) — the same bytes committed in the Lane-B chain.
const HEADERS = {
  0: "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c",
  1: "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299",
  2: "010000004860eb18bf1b1620e37e9490fc8a427514416fd75159ab86688e9a8300000000d5fdcc541e25de1c7a5addedf24858b8bb665c9f36ef744ee42c316022c90f9bb0bc6649ffff001d08d2bd61",
};

// ---- registry: the 17 framed-hashed descriptors (prepared = the exact object hashed).
const registryVectors = Object.entries(perId).map(([id, p]) => ({
  id,
  kind: p.kind,
  domain: p.domain,
  prepared: p.prepared,
  digest: p.token,
}));

// ---- HKDF: RFC 5869 Appendix A.1/A.3 and the §7 seed derivation.
const hkdfRfc = [
  (() => {
    const salt = hex("000102030405060708090a0b0c");
    const ikm = hex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b");
    const info = hex("f0f1f2f3f4f5f6f7f8f9");
    const prk = hkdfExtract(salt, ikm);
    return {
      case: "rfc5869_a1",
      salt: salt.toString("hex"),
      ikm: ikm.toString("hex"),
      info: info.toString("hex"),
      L: 42,
      prk: prk.toString("hex"),
      okm: hkdfExpand(prk, info, 42).toString("hex"),
    };
  })(),
];

const subjectDigest = encodeDigestToken(Buffer.alloc(32, 0x5c));
const beaconValueHex = blockHashInternalHex(HEADERS[2]); // block-2 internal hash
const seedIkm = Buffer.concat([
  Buffer.from(SEED_DOMAIN, "utf8"),
  decodeDigestToken(subjectDigest),
  hex(beaconValueHex),
]);
const seedRaw = hkdfExtract(decodeDigestToken(registry[PAIR22_ID]), seedIkm);
const seedToken = encodeDigestToken(seedRaw);

// ---- sampler over the derived seed.
const N = 256;
const k = 8;
const drawCeiling = 4194304;
const sampled = deriveChallengeIndices({
  seed: seedRaw,
  universeSize: N,
  k,
  drawCeiling,
  drawDomain: DRAW_DOMAIN,
});

// ---- checkpoint-instance digest over a fixed checkpoint object.
const checkpoint = {
  network_profile_id: "simurgh.bitcoin.mainnet.header_validation.v1",
  checkpoint_height: "0",
  checkpoint_block_hash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
  checkpoint_header: HEADERS[0],
  checkpoint_nbits: "ffff001d",
  checkpoint_witness_profile_id: "simurgh.vsc.checkpoint_witness.v1",
  checkpoint_witness_profile_digest: encodeDigestToken(Buffer.alloc(32, 0x11)),
  checkpoint_witness_key_fingerprint: encodeDigestToken(Buffer.alloc(32, 0x22)),
  stage5l_checkpoint_evidence_digest: encodeDigestToken(Buffer.alloc(32, 0x33)),
};
const checkpointPre = Buffer.concat([
  Buffer.from(CHECKPOINT_DOMAIN, "utf8"),
  decodeDigestToken(registry[PAIR18_ID]),
  Buffer.from(canonicalJson(checkpoint), "utf8"),
]);
const checkpointInstanceDigest = encodeDigestToken(sha256(checkpointPre));

// ---- five root digests over fixed canonical artifacts (sha256(canonicalJson)).
const rootArtifacts = {
  beacon_contract: { schema_id: "simurgh.vsc.beacon_contract.v1", challenge_height: "2" },
  beacon_suffix: { schema_id: "simurgh.vsc.beacon_suffix.v1", headers: [HEADERS[1], HEADERS[2]] },
  ordered_selected_indices: {
    schema_id: "simurgh.vsc.ordered_selected_indices.v1",
    indices: sampled.sortedIndices.map(String),
  },
};
const roots = {
  challenge_subject: subjectDigest,
  verified_closure_bitcoin_checkpoint: checkpointInstanceDigest,
  beacon_contract: encodeDigestToken(
    sha256(Buffer.from(canonicalJson(rootArtifacts.beacon_contract), "utf8"))
  ),
  beacon_suffix: encodeDigestToken(
    sha256(Buffer.from(canonicalJson(rootArtifacts.beacon_suffix), "utf8"))
  ),
  ordered_selected_indices: encodeDigestToken(
    sha256(Buffer.from(canonicalJson(rootArtifacts.ordered_selected_indices), "utf8"))
  ),
};

// ---- Bitcoin primitives.
const bitcoin = Object.entries(HEADERS).map(([height, header]) => {
  const h = decodeHeader(header);
  return {
    height: Number(height),
    header,
    internal: blockHashInternalHex(header),
    display: blockHashDisplayHex(header),
    nbits_hex: h.nBitsHex,
    nbits_u32: h.nBits,
    target_decimal: compactTargetToBig(h.nBits).toString(10),
    pow_ok: BigInt("0x" + blockHashDisplayHex(header)) <= compactTargetToBig(h.nBits),
  };
});

// ---- canonicalisation vectors (nested, unicode, arrays) for the canonical-JSON parity.
const canonicalVectors = [
  { value: { b: 1, a: 2, "": 3 }, canonical: canonicalJson({ b: 1, a: 2, "": 3 }) },
  {
    value: { z: [3, 2, 1], nested: { y: "é", x: null } },
    canonical: canonicalJson({ z: [3, 2, 1], nested: { y: "é", x: null } }),
  },
  { value: ["10", "2", "1"], canonical: canonicalJson(["10", "2", "1"]) },
];

// ---- negatives: properties the runners must reproduce as failures.
let uppercaseThrows = false;
try {
  decodeDigestToken("A".repeat(64));
} catch {
  uppercaseThrows = true;
}
let negTargetThrows = false;
try {
  compactTargetToBig(0x00800000 | 0x1d00ffff); // sign bit set
} catch {
  negTargetThrows = true;
}
const mutatedNonceHeader = HEADERS[1].slice(0, 152) + "deadbeef";
const mutatedNoncePowOk =
  BigInt("0x" + blockHashDisplayHex(mutatedNonceHeader)) <=
  compactTargetToBig(decodeHeader(mutatedNonceHeader).nBits);
const seedBit = Buffer.from(seedRaw);
seedBit[0] ^= 0x01;
const mutatedSeedIndices = deriveChallengeIndices({
  seed: seedBit,
  universeSize: N,
  k,
  drawCeiling,
  drawDomain: DRAW_DOMAIN,
}).sortedIndices;
let exhaustionThrows = false;
try {
  deriveChallengeIndices({
    seed: seedRaw,
    universeSize: 2,
    k: 2,
    drawCeiling: 1,
    drawDomain: DRAW_DOMAIN,
  });
} catch {
  exhaustionThrows = true;
}

// ---- Section 8 crypto surface: case_digest, leaf_id, case_link, Merkle, disclosure_policy_digest.
const caseBytes = Buffer.from(canonicalJson({ case: 1 }), "utf8");
const s8CaseDigest = caseDigest(caseBytes);
const s8LeafId = leafId(R(0x77), 5, R(0x5a), s8CaseDigest);
const s8Link = caseLinkCommitment(s8CaseDigest, R(0xe5));
const s8Leaves = [1, 2, 3, 4, 5].map((f) => R(f));
const s8Root = MTH(s8Leaves);
const s8Path = buildInclusionPath(s8Leaves, 3);
const s8Policy = {
  max_opening_package_transport_bytes: 1048576,
  max_opening_package_canonical_bytes: 524288,
  max_presented_history_transport_bytes: 1048576,
  max_presented_history_canonical_bytes: 524288,
  max_presented_history_entries: 1024,
  max_cumulative_disclosed_indices: 64,
};

const section8 = {
  domains: {
    case_domain: CASE_DOMAIN,
    leaf_domain: LEAF_DOMAIN,
    execution_case_link_domain: EXECUTION_CASE_LINK_DOMAIN,
    disclosure_policy_domain: DISCLOSURE_POLICY_DOMAIN,
  },
  case: { case_bytes_hex: caseBytes.toString("hex"), case_digest: s8CaseDigest.toString("hex") },
  leaf: {
    epoch: R(0x77).toString("hex"),
    index: 5,
    salt: R(0x5a).toString("hex"),
    leaf_id: s8LeafId.toString("hex"),
  },
  case_link: {
    execution_record_digest: R(0xe5).toString("hex"),
    commitment: s8Link.toString("hex"),
  },
  merkle: {
    leaves: s8Leaves.map((l) => l.toString("hex")),
    root: s8Root.toString("hex"),
    index: 3,
    path: s8Path.map((s) => ({ sibling: s.sibling.toString("hex"), side: s.side })),
  },
  disclosure_policy: { policy: s8Policy, digest: disclosurePolicyDigest(s8Policy) },
};

const vectors = {
  meta: { stage: "5o", surface: "section7_and_8_crypto", runtime_reference: "node" },
  section8,
  domains: {
    seed_domain: SEED_DOMAIN,
    draw_domain: DRAW_DOMAIN,
    checkpoint_domain: CHECKPOINT_DOMAIN,
  },
  canonical_vectors: canonicalVectors,
  registry: registryVectors,
  hkdf_rfc: hkdfRfc,
  hkdf_seed: {
    salt: registry[PAIR22_ID],
    seed_domain: SEED_DOMAIN,
    subject_digest: subjectDigest,
    beacon_value: beaconValueHex,
    seed: seedToken,
  },
  sampler: {
    seed: seedToken,
    N,
    k,
    draw_domain: DRAW_DOMAIN,
    draw_ceiling: drawCeiling,
    indices: sampled.sortedIndices,
    draws_used: sampled.drawsUsed,
  },
  bitcoin,
  checkpoint_instance: {
    domain: CHECKPOINT_DOMAIN,
    pair18_digest: registry[PAIR18_ID],
    checkpoint,
    digest: checkpointInstanceDigest,
  },
  roots,
  root_artifacts: rootArtifacts,
  negatives: {
    uppercase_token_decodes: !uppercaseThrows,
    malformed_compact_target_throws: negTargetThrows,
    mutated_nonce_pow_ok: mutatedNoncePowOk,
    one_bit_seed_mutation_indices: mutatedSeedIndices,
    sampler_exhaustion_throws: exhaustionThrows,
  },
};

process.stdout.write(JSON.stringify(vectors, null, 2) + "\n");
