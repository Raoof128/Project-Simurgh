// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4O offline verifier (4O spec §8). Two-tier, offline primary. Recomputes every
// digest, verifies BOTH signatures (manifest key on commitments, attestation key on the
// bundle), re-derives the decision corpus from the committed arms and compares, checks the
// constitutional alignment map, and verifies the timeline against the frozen 4N feed.
// --selective <arm> proves ONE tool's membership from its inclusion proof without reading
// the rest of tools[]. Any failure -> RED, non-zero exit via stage4CodeForRawCode.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync, readdirSync } from "node:fs";
import { createPublicKey, verify as edVerify } from "node:crypto";
import { domainDigest } from "../core/digest.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { commitmentDigest, toolEntryDigest } from "../core/manifestCore.mjs";
import { verifySurfacePath } from "../core/merkleSurface.mjs";
import { parseFeed } from "../core/timelineCore.mjs";
import { verifyTimelineRecord } from "../core/timelineCore.mjs";
import { checkAlignmentMap } from "../core/constitutionCore.mjs";
import { buildDecisionCorpus, attestationDigest } from "./build-stage4o-attestation.mjs";
import { DOMAINS, ATTESTATION_SCHEMA, HONESTY_CEILING } from "../constants.mjs";
import { stage4CodeForRawCode } from "../../stage4h/exitCodes.mjs";

const FIX = "tests/fixtures/llmShield/stage4o";
const FEED = "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};

function commitmentVerifier(pem) {
  const key = createPublicKey(pem);
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

function readArms() {
  return readdirSync(`${FIX}/arms`)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${FIX}/arms/${f}`, "utf8")));
}

export function verifyEvidence(evidenceDir) {
  const attestation = JSON.parse(readFileSync(`${evidenceDir}/vtsa-attestation.json`, "utf8"));
  const manifest = JSON.parse(readFileSync(`${evidenceDir}/vtsa-manifest.json`, "utf8"));
  const fail = (verdict) => ({ ok: false, verdict });

  // 1. attestation digest recompute + bundle signature.
  if (attestationDigest(attestation) !== manifest.attestation_digest)
    return fail("attestation_digest_mismatch");
  try {
    const ok = edVerify(
      null,
      Buffer.from(manifest.attestation_digest),
      createPublicKey(manifest.attestation_signer_public_key_pem),
      Buffer.from(manifest.signature, "base64")
    );
    if (!ok) return fail("attestation_signature_invalid");
  } catch {
    return fail("attestation_signature_invalid");
  }

  // 2. corpus digest recompute.
  if (
    domainDigest(DOMAINS.DECISION_CORPUS, ATTESTATION_SCHEMA, attestation.decision_corpus) !==
    attestation.corpus_digest
  ) {
    return fail("corpus_digest_mismatch");
  }

  // 3. re-derive the corpus from committed arms and compare.
  const manifestPub = attestation.manifest_signer_public_key_pem;
  const verifyCommitmentSignature = commitmentVerifier(manifestPub);
  const feed = parseFeed(readFileSync(FEED, "utf8"));
  const rederived = buildDecisionCorpus({
    arms: readArms(),
    verifyCommitmentSignature,
    stage4nRecords: feed,
  });
  if (canonicalJson(rederived) !== canonicalJson(attestation.decision_corpus)) {
    return fail("corpus_rederivation_mismatch");
  }

  // 4. alignment map + honesty ceiling.
  if (!checkAlignmentMap(attestation.constitutional_alignment).ok)
    return fail("alignment_map_invalid");
  if (attestation.honesty_ceiling !== HONESTY_CEILING) return fail("honesty_ceiling_altered");

  // 5. timeline record against the frozen 4N feed and the committed clean chain.
  const chain = JSON.parse(readFileSync(`${evidenceDir}/clean-chain.json`, "utf8")).chain;
  const tl = verifyTimelineRecord({
    record: attestation.timeline_record,
    chain,
    stage4nRecords: feed,
  });
  if (!tl.ok) return fail(`timeline_${tl.reason}`);

  return { ok: true, verdict: "green", arms: attestation.decision_corpus.length };
}

// Selective disclosure (§5a): prove one tool's membership without the full tools[] body.
export function verifySelective(armName) {
  const arm = JSON.parse(readFileSync(`${FIX}/arms/${armName}.json`, "utf8"));
  if (arm.evaluator !== "gate") return { ok: false, verdict: "not_a_gate_arm" };
  const head = arm.chain[arm.chain.length - 1];
  const root = head.manifest.toolset_digest;
  const entry = head.manifest.tools.find(
    (t) => t.tool_name_digest === arm.receipt.tool_name_digest
  );
  // The disclosed artifact is {entry, inclusion_proof, root}; membership is checked without
  // consulting any other tool in tools[].
  if (!entry) return { ok: false, verdict: "tool_not_disclosed" };
  const included = verifySurfacePath(toolEntryDigest(entry), arm.receipt.inclusion_proof, root);
  return included
    ? { ok: true, verdict: "included" }
    : { ok: false, verdict: "inclusion_proof_invalid" };
}

if (process.argv[1] && process.argv[1].endsWith("verify-stage4o.mjs")) {
  const selective = arg("--selective");
  if (selective) {
    const out = verifySelective(selective);
    console.log(`stage4o selective(${selective}): ${out.verdict}`);
    process.exit(out.ok ? 0 : stage4CodeForRawCode(29));
  }
  const evidenceDir = arg("--evidence") ?? "docs/research/llm-shield/evidence/stage-4o";
  const out = verifyEvidence(evidenceDir);
  console.log(`stage4o verify: ${out.verdict}${out.ok ? ` (${out.arms} arms)` : ""}`);
  process.exit(out.ok ? 0 : stage4CodeForRawCode(29));
}
