// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q signed VFR attestation builder (4Q spec §3.4). Signs canonicalJson of the frozen
// body0 shape (non-circular): bundle_digest first, then Ed25519 over {...body0, bundle_digest}.
// The signing key lives OUTSIDE the repo (~/simurgh-keys/stage4q.pem). Motto: AnthropicSafe
// First, then ReviewerSafe.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPrivateKey, createPublicKey, sign as edSign } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, SCHEMAS, VFR_NON_CLAIMS } from "../constants.mjs";
import { domainDigest, chainRootDigest, chainEntryDigest } from "../core/digest.mjs";
import { buildChain } from "../core/chainCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const LANE_A = join(REPO, "tests/fixtures/llmShield/stage4q/lane-a");
const LANE_B = join(REPO, "tests/fixtures/llmShield/stage4q/lane-b");
const INV = join(REPO, "tests/fixtures/llmShield/stage4q/invention");
const ANCHOR = join(REPO, "tests/fixtures/llmShield/stage4q/stage4n-anchor.json");
const EVID = join(REPO, "docs/research/llm-shield/evidence/stage-4q");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

function countCrossings(chainEvents) {
  return chainEvents.filter((e) => e.entry_kind === "crossing").length;
}

// The frozen body0 (everything except bundle_digest + signature), assembled from committed
// evidence. Pure function of the repo — the verifier recomputes it identically.
export function buildBody0() {
  const corpus = readJson(join(LANE_A, "corpus.json"));
  const capture = readJson(join(LANE_B, "capture.json"));
  const anchor = readJson(ANCHOR);
  const sourceMap = readJson(join(INV, "novelty-source-map.json"));
  const projection = readJson(join(INV, "constitution-projection.json"));
  const reviewerNote = readJson(join(INV, "reviewer-note.json"));

  const laneAroots = corpus.cases.map((c) => {
    const { entries } = buildChain(c.chain_events);
    return chainRootDigest(entries.map((e) => chainEntryDigest(e)));
  });
  const laneBroots = capture.arms.map((a) => {
    const { entries } = buildChain(a.chain_events);
    return chainRootDigest(entries.map((e) => chainEntryDigest(e)));
  });
  const laneBcrossings = capture.arms.reduce((n, a) => n + countCrossings(a.chain_events), 0);
  const totalCrossings =
    corpus.cases.reduce((n, c) => n + countCrossings(c.chain_events), 0) + laneBcrossings;

  return {
    schema: SCHEMAS.ATTESTATION,
    stage: "4q",
    lane_a_evidence_digest: domainDigest(DOMAINS.LANE_A_EVIDENCE, SCHEMAS.ATTESTATION, corpus),
    lane_b_capture_digest: domainDigest(DOMAINS.LANE_B_CAPTURE, SCHEMAS.ATTESTATION, capture),
    run_chain_root_digest: domainDigest(DOMAINS.CHAIN_ROOT, SCHEMAS.RUN_CHAIN_ENTRY, [
      ...laneAroots,
      ...laneBroots,
    ]),
    census: {
      committed_crossings: totalCrossings,
      chain_crossings: totalCrossings,
      laneb_observed: laneBcrossings,
    },
    non_claims: [...VFR_NON_CLAIMS],
    reviewer_note: reviewerNote,
    novelty_source_map: sourceMap,
    constitution_projection: projection,
    stage4n_window_anchor_digest: anchor.stage4n_window_anchor_digest,
    signer_public_key: null, // filled at sign time
  };
}

export function bundleDigestOf(body0) {
  return domainDigest(DOMAINS.ATTESTATION_BUNDLE, SCHEMAS.ATTESTATION, body0);
}

function main() {
  const keyIdx = process.argv.indexOf("--key");
  if (keyIdx === -1) {
    process.stderr.write("usage: build-stage4q-attestation.mjs --key <private.pem>\n");
    process.exit(2);
  }
  const priv = createPrivateKey(readFileSync(process.argv[keyIdx + 1], "utf8"));
  const signerPem = createPublicKey(priv).export({ type: "spki", format: "pem" });

  const body0 = { ...buildBody0(), signer_public_key: signerPem };
  const bundle_digest = bundleDigestOf(body0);
  const signed = canonicalJson({ ...body0, bundle_digest });
  const signature = edSign(null, Buffer.from(signed), priv).toString("base64");
  const bundle = { ...body0, bundle_digest, signature };
  writeFileSync(join(EVID, "vfr-attestation.json"), JSON.stringify(bundle, null, 2) + "\n");
  console.log("stage4q: wrote signed VFR attestation");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
