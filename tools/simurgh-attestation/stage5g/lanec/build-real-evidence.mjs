// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC Lane C ingest. Assembles the external actor's returned capture-package.json into a
// rung-1 (challenge_bound) foreign_capture attestation, signs the attestation-of-record with the Simurgh
// verifier key, and writes an evidence dir the standard verifier checks (raw 0). NON-CI — driven by a real
// returned package. Both outcomes sealed honestly: a completed package yields rung-1 real evidence; a
// no-show is a campaign_outcome record, never an attestation.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { domainDigest, identityDigest, artifactDigest } from "../core/digests.mjs";
import { signContent } from "../core/signatures.mjs";
import { DOMAIN, VFC_SCHEMAS } from "../constants.mjs";

// Build the census from the returned capture (one terminal per case; deterministic record ids).
function buildCensus(pkg, receipt) {
  const cases = pkg.capture.cells.map((c) => c.case_id);
  return {
    schema: VFC_SCHEMAS.capture_census,
    challenge_record_digest: receipt.challenge_record_digest,
    corpus_digest: pkg.capture.corpus_digest,
    attempt_records: cases.map((c, i) => ({
      record_id: `a${i + 1}`,
      case_id: c,
      terminal_ref: `t${i + 1}`,
    })),
    terminal_records: cases.map((c, i) => ({
      record_id: `t${i + 1}`,
      case_id: c,
      status: "completed",
    })),
    capture_digest: domainDigest(DOMAIN.capture, pkg.capture),
  };
}

export function assembleRealAttestation({
  pkg,
  receipt,
  verifierIdentity,
  artifacts,
  verifierPriv,
}) {
  const census = buildCensus(pkg, receipt);
  const content = {
    schema: VFC_SCHEMAS.foreign_capture,
    challenge_receipt: receipt,
    producer_transcript: pkg.producer_transcript,
    verifier_identity: verifierIdentity,
    producer_identity: pkg.producer_identity,
    capture: pkg.capture,
    panel_plan_ref: { path: "panel-plan.json", digest: artifactDigest(artifacts.panelPlan) },
    corpus_ref: { path: "shared-corpus.json", digest: artifactDigest(artifacts.corpus) },
    detector_snapshot_ref: {
      path: "detector-snapshot-manifest.json",
      digest: artifactDigest(artifacts.detectorSnapshot),
    },
    capture_census_digest: domainDigest(DOMAIN.capture_census, census),
    separation_claim: { claimed_rung: "challenge_bound" },
  };
  const bundle = {
    ...content,
    attestation_signature: signContent(verifierPriv, DOMAIN.foreign_capture, content),
  };
  const pin = {
    verifier_key_fingerprint: verifierIdentity.key_fingerprint,
    verifier_identity_subject: verifierIdentity.identity_subject,
    verifier_identity_digest: identityDigest(verifierIdentity, "verifier"),
  };
  return { bundle, census, pin };
}

export function writeRealEvidence(outDir, { bundle, census, pin }, artifacts) {
  mkdirSync(outDir, { recursive: true });
  const w = (p, o) => writeFileSync(join(outDir, p), JSON.stringify(o, null, 2) + "\n");
  w("vfc-attestation.json", bundle);
  w("capture-census.json", census);
  w("panel-plan.json", artifacts.panelPlan);
  w("shared-corpus.json", artifacts.corpus);
  w("detector-snapshot-manifest.json", artifacts.detectorSnapshot);
  w("pin.json", pin);
  w("trust-root.json", { schema_version: "0.3", fulcio_root_fingerprints: [] });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pkgP, receiptP, vidP, corpusP, panelP, snapP, keyP, outDir] = process.argv.slice(2);
  const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
  const artifacts = {
    corpus: readJson(corpusP),
    panelPlan: readJson(panelP),
    detectorSnapshot: readJson(snapP),
  };
  const assembled = assembleRealAttestation({
    pkg: readJson(pkgP),
    receipt: readJson(receiptP),
    verifierIdentity: readJson(vidP),
    artifacts,
    verifierPriv: readFileSync(keyP, "utf8"),
  });
  writeRealEvidence(
    outDir ??
      join(
        fileURLToPath(new URL(".", import.meta.url)),
        "../../../../docs/research/llm-shield/evidence/stage-5g/real-capture"
      ),
    assembled,
    artifacts
  );
  console.log(
    "[lanec] wrote real rung-1 attestation — verify with verify-vfc-attestation.mjs --dir <outDir>"
  );
}
