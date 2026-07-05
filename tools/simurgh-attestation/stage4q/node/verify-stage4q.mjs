// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q two-tier offline verifier (4Q spec §3.4). Tier 1: structure + bundle_digest
// recompute + Ed25519 + non-claims verbatim + invention validators. Tier 2: full recompute
// of lane-a/lane-b evidence + census + chain roots. --approver-key runs BYO decision-
// equivalence. Exits through stage4CodeForRawCode. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicKey, verify as edVerify } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VFR_NON_CLAIMS } from "../constants.mjs";
import { stage4CodeForRawCode } from "../../stage4h/exitCodes.mjs";
import {
  validateSourceMap,
  validateConstitutionProjection,
  validateReviewerNote,
} from "../core/inventionCore.mjs";
import { buildBody0, bundleDigestOf } from "./build-stage4q-attestation.mjs";
import { replayCorpus } from "./build-stage4q-fixtures.mjs";
import { replayCapture } from "./laneb-approval-capture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const LANE_A = join(REPO, "tests/fixtures/llmShield/stage4q/lane-a");
const LANE_B = join(REPO, "tests/fixtures/llmShield/stage4q/lane-b");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export function recomputeBundleDigest(body0) {
  return bundleDigestOf(body0);
}

export function verifyBundle(bundle) {
  const { bundle_digest, signature, ...body0 } = bundle;
  // Tier 1 — structural integrity + signature.
  if (recomputeBundleDigest(body0) !== bundle_digest)
    return { raw: 88, reason: "bundle_digest_mismatch" };
  try {
    const ok = edVerify(
      null,
      Buffer.from(canonicalJson({ ...body0, bundle_digest })),
      createPublicKey(body0.signer_public_key),
      Buffer.from(signature, "base64")
    );
    if (!ok) return { raw: 81, reason: "attestation_signature_invalid" };
  } catch {
    return { raw: 81, reason: "attestation_signature_invalid" };
  }
  if (canonicalJson(body0.non_claims) !== canonicalJson([...VFR_NON_CLAIMS]))
    return { raw: 88, reason: "non_claims_tampered" };
  if (!validateSourceMap(body0.novelty_source_map).ok)
    return { raw: 88, reason: "source_map_invalid" };
  if (!validateConstitutionProjection(body0.constitution_projection).ok)
    return { raw: 88, reason: "constitution_projection_invalid" };
  if (!validateReviewerNote(body0.reviewer_note).ok)
    return { raw: 88, reason: "reviewer_note_invalid" };

  // Tier 2 — full recompute of the evidence the bundle summarises.
  const recomputed = buildBody0();
  for (const field of [
    "lane_a_evidence_digest",
    "lane_b_capture_digest",
    "run_chain_root_digest",
    "stage4n_window_anchor_digest",
  ]) {
    if (recomputed[field] !== body0[field])
      return { raw: 88, reason: `recompute_mismatch:${field}` };
  }
  if (canonicalJson(recomputed.census) !== canonicalJson(body0.census))
    return { raw: 89, reason: "census_mismatch" };

  // The committed evidence must still replay to its committed decisions.
  const corpus = readJson(join(LANE_A, "corpus.json"));
  const expectedA = readJson(join(LANE_A, "expected-decisions.json"));
  if (canonicalJson(replayCorpus(corpus)) !== canonicalJson(expectedA))
    return { raw: 88, reason: "lane_a_replay_divergence" };
  const capture = readJson(join(LANE_B, "capture.json"));
  const expectedB = readJson(join(LANE_B, "expected-arms.json"));
  if (canonicalJson(replayCapture(capture)) !== canonicalJson(expectedB))
    return { raw: 88, reason: "lane_b_replay_divergence" };

  return { raw: 0, reason: "verified" };
}

// BYO-approver (§3.5): rebuild the Lane A corpus with a foreign approver key and assert
// DECISION equivalence (same per-case {raw, reason}) — NOT byte identity (impossible).
export function verifyByoApprover(approverKeyPath) {
  const outDir = mkdtempSync(join(tmpdir(), "stage4q-byo-"));
  execFileSync("node", [join(HERE, "build-stage4q-fixtures.mjs"), "--emit-corpus", outDir], {
    env: { ...process.env, STAGE4Q_APPROVER_KEY_PATH: approverKeyPath },
  });
  const byoCorpus = readJson(join(outDir, "corpus.json"));
  const byoDecisions = replayCorpus(byoCorpus).map(({ case_id, raw, reason }) => ({
    case_id,
    raw,
    reason,
  }));
  const committed = readJson(join(LANE_A, "expected-decisions.json"));
  return canonicalJson(byoDecisions) === canonicalJson(committed)
    ? { raw: 0, reason: "byo_decision_equivalent" }
    : { raw: 88, reason: "byo_decision_divergence" };
}

function main() {
  const path = process.argv[2];
  if (!path || path.startsWith("--")) {
    process.stderr.write("usage: verify-stage4q.mjs <attestation.json> [--approver-key <pem>]\n");
    process.exit(stage4CodeForRawCode(29));
  }
  const bundle = readJson(path);
  let out = verifyBundle(bundle);
  const byoIdx = process.argv.indexOf("--approver-key");
  if (out.raw === 0 && byoIdx !== -1) out = verifyByoApprover(process.argv[byoIdx + 1]);
  process.stderr.write(`stage4q verify: ${out.reason} (raw ${out.raw})\n`);
  process.exit(stage4CodeForRawCode(out.raw));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
