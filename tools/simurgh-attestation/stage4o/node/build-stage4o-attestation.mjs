// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4O dual-key attestation builder (4O spec §8, §11). Replays every committed arm
// through the real gate/timeline evaluators (with REAL Ed25519 commitment verification),
// assembles the signed decision corpus + timeline record + constitutional alignment map +
// non-claims, and signs the bundle with the ATTESTATION key (distinct from the MANIFEST
// key that signs commitments). Deterministic: Ed25519 over a fixed message reproduces
// byte-for-byte, so the committed evidence is regenerable.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
  createHash,
} from "node:crypto";
import { domainDigest } from "../core/digest.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { gateToolCall } from "../core/decisionCore.mjs";
import { commitmentDigest } from "../core/manifestCore.mjs";
import { verifyTimelineRecord, buildTimelineRecord, parseFeed } from "../core/timelineCore.mjs";
import { buildAlignmentMap, HONESTY_CEILING } from "../core/constitutionCore.mjs";
import { DOMAINS, ATTESTATION_SCHEMA, VTSA_NON_CLAIMS } from "../constants.mjs";

const FIX = "tests/fixtures/llmShield/stage4o";
const FEED = "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl";

const KNOWN_LIMITATIONS = Object.freeze([
  "lane_a_manifest_modelled_not_live_mcp",
  "digest_privacy_not_secrecy_against_dictionary_inference",
  "timeline_binds_at_attestation_time_not_real_time",
  "proof_is_of_model_not_implementation",
  // F1 hard gate (4O spec §11.2): the May-2026 Claude Code MCP-poisoning disclosure
  // (GMO Flatt Security) is a vulnerability narrative, not a tool-definition changelog —
  // it publishes no concrete before/after tool surfaces. Per the gate we do NOT
  // approximate; the retro fixture is withheld and recorded here instead.
  "retro_fixture_public_data_insufficient",
]);

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};

function loadManifestPub() {
  return JSON.parse(readFileSync(`${FIX}/vtsa-manifest-signer.pub`, "utf8")).public_key_pem;
}

function commitmentVerifier(manifestPubPem) {
  const key = createPublicKey(manifestPubPem);
  return (env) => {
    if (typeof env.signature !== "string") return false;
    try {
      return edVerify(
        null,
        Buffer.from(commitmentDigest(env)),
        key,
        Buffer.from(env.signature, "base64")
      );
    } catch {
      return false;
    }
  };
}

export function buildDecisionCorpus({ arms, verifyCommitmentSignature, stage4nRecords }) {
  const entries = arms.map((arm) => {
    if (arm.evaluator === "timeline") {
      const out = verifyTimelineRecord({
        record: arm.timeline_record,
        chain: arm.chain,
        stage4nRecords,
      });
      return {
        arm: arm.arm,
        evaluator: "timeline",
        raw: out.ok ? 0 : out.raw,
        reason: out.reason ?? "ok",
      };
    }
    const out = gateToolCall({
      chain: arm.chain,
      receipt: arm.receipt,
      actionDigest: arm.action_digest,
      verifyCommitmentSignature,
    });
    return {
      arm: arm.arm,
      evaluator: "gate",
      raw: out.raw,
      reason: out.reason ?? "ok",
      bindings: out.bindings ?? null,
    };
  });
  entries.sort((a, b) => (a.arm < b.arm ? -1 : 1));
  return entries;
}

function readArms() {
  return readdirSync(`${FIX}/arms`)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${FIX}/arms/${f}`, "utf8")));
}

export function buildAttestation() {
  const manifestPubPem = loadManifestPub();
  const verifyCommitmentSignature = commitmentVerifier(manifestPubPem);
  const arms = readArms();
  const feed = parseFeed(readFileSync(FEED, "utf8"));
  const corpus = buildDecisionCorpus({ arms, verifyCommitmentSignature, stage4nRecords: feed });
  const cleanChain = JSON.parse(readFileSync(`${FIX}/chains/clean-chain.json`, "utf8")).chain;
  const timeline = buildTimelineRecord({
    chainHeadEnvelope: cleanChain[0],
    stage4nRecord: feed[0],
  });
  const corpus_digest = domainDigest(DOMAINS.DECISION_CORPUS, ATTESTATION_SCHEMA, corpus);
  return {
    schema: ATTESTATION_SCHEMA,
    corpus_digest,
    decision_corpus: corpus,
    timeline_record: timeline,
    constitutional_alignment: buildAlignmentMap(),
    honesty_ceiling: HONESTY_CEILING,
    non_claims: [...VTSA_NON_CLAIMS],
    known_limitations: [...KNOWN_LIMITATIONS],
    manifest_signer_public_key_pem: manifestPubPem,
  };
}

export function attestationDigest(attestation) {
  return domainDigest(
    DOMAINS.ATTESTATION_BUNDLE,
    ATTESTATION_SCHEMA,
    JSON.parse(canonicalJson(attestation))
  );
}

function fingerprint(pem) {
  return "sha256:" + createHash("sha256").update(pem).digest("hex");
}

// CLI
if (process.argv[1] && process.argv[1].endsWith("build-stage4o-attestation.mjs")) {
  const outDir = arg("--out-dir") ?? "docs/research/llm-shield/evidence/stage-4o";
  let attestationKey;
  let attestationPubPem;
  if (process.argv.includes("--attestation-key")) {
    attestationKey = createPrivateKey(readFileSync(arg("--attestation-key"), "utf8"));
    attestationPubPem = createPublicKey(attestationKey).export({ type: "spki", format: "pem" });
  } else {
    // Default: the committed fixture attestation key (this stage is Lane-A modelled;
    // a production deployment swaps in a real key via --attestation-key).
    attestationKey = createPrivateKey(
      readFileSync(`${FIX}/test-keys/INSECURE_FIXTURE_ONLY_attestation-signer.pem`, "utf8")
    );
    attestationPubPem = JSON.parse(readFileSync(`${FIX}/vtsa-signer.pub`, "utf8")).public_key_pem;
  }
  const attestation = buildAttestation();
  const digest = attestationDigest(attestation);
  const signature = edSign(null, Buffer.from(digest), attestationKey).toString("base64");
  const manifest = {
    schema: "simurgh.vtsa_attestation_manifest.v1",
    attestation_digest: digest,
    signature,
    attestation_signer_public_key_pem: attestationPubPem,
    attestation_signer_fingerprint: fingerprint(attestationPubPem),
    manifest_signer_public_key_pem: attestation.manifest_signer_public_key_pem,
    manifest_signer_fingerprint: fingerprint(attestation.manifest_signer_public_key_pem),
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "vtsa-attestation.json"), JSON.stringify(attestation, null, 2) + "\n");
  writeFileSync(join(outDir, "vtsa-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(
    join(outDir, "clean-chain.json"),
    readFileSync(`${FIX}/chains/clean-chain.json`, "utf8")
  );
  console.log(
    `stage4o attestation written to ${outDir} (${attestation.decision_corpus.length} arms)`
  );
}
