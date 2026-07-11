// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I VPC — Lane C independent-party ceremony runner (for the droplet team). Generates all keys
// with YOUR entropy, builds a full split-review coverage bundle over the REAL Claude Opus 4.6 Sabotage
// Risk Report PUBLIC structure (37 leaf sections), self-verifies raw 0 (public + audit), and writes a
// VERIFY-ONLY pack to --out (default ./stage5i-droplet-output). We ingest without your private keys.
import { generateKeyPairSync } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname, isAbsolute } from "node:path";
import { fingerprint } from "../core/signatures.mjs";
import { canonicalJson } from "../core/digests.mjs";
import { buildSignedBundle } from "../node/buildSignedBundle.mjs";
import { makeAdapterFacts } from "../node/adapter.mjs";
import { vpcVerify } from "../core/vpcCore.mjs";
import { derivePartition } from "./build-real-coverage.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function key(subject) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" });
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

export function runDropletCeremony() {
  const keys = {
    producer: key("droplet-evidence-producer"),
    grantIssuer: key("droplet-panel-coordinator"),
    affIssuer: key("droplet-affiliation-authority"),
    verifier: key("droplet-simurgh-verifier"),
    reviewers: [key("droplet-reviewer-A"), key("droplet-reviewer-B")],
  };
  const hostA = key("droplet-reviewer-A-host");
  const hostB = key("droplet-reviewer-B-host");

  const pc = derivePartition(join(HERE, "opus-4-6-sabotage-risk-report.toc.json"));
  const sections = pc.sections;
  const ids = sections.map((s) => s.section_id);
  const mid = Math.ceil(ids.length / 2);
  const panel = [
    {
      i: 0,
      hostFp: hostA.id.key_fingerprint,
      lineage: "sha256:droplet-lineage-A",
      sec: ids.slice(0, mid + 1),
    },
    {
      i: 1,
      hostFp: hostB.id.key_fingerprint,
      lineage: "sha256:droplet-lineage-B",
      sec: ids.slice(mid - 1),
    },
  ];

  const { bundle, external_config } = buildSignedBundle(keys, {
    sections,
    panel,
    campaign_id: "vpc-lanec-droplet-opus46",
  });
  const pub = vpcVerify(bundle, external_config, makeAdapterFacts(bundle, external_config), {
    tier: "public",
  });
  const aud = vpcVerify(bundle, external_config, makeAdapterFacts(bundle, external_config), {
    tier: "audit",
  });
  return {
    bundle,
    external_config,
    pub,
    aud,
    sections: ids.length,
    verifierFp: keys.verifier.id.key_fingerprint,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const outArg = argv.includes("--out")
    ? argv[argv.indexOf("--out") + 1]
    : "stage5i-droplet-output";
  const outDir = isAbsolute(outArg) ? outArg : join(process.cwd(), outArg);
  const { bundle, external_config, pub, aud, sections, verifierFp } = runDropletCeremony();
  const att = bundle.attestation.content;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "bundle.json"), canonicalJson(bundle) + "\n");
  writeFileSync(join(outDir, "external-config.json"), canonicalJson(external_config) + "\n");
  const result = {
    public_raw: pub.raw,
    audit_raw: aud.raw,
    reviewers: bundle.coverage_receipts.length,
    sections_total: sections,
    coverage_union: att.coverage_union.length,
    coverage_gap: att.coverage_gap.length,
    partition_digest: att.partition_digest,
    panel_subject_root: att.panel_subject_root,
    panel_evidence_root: att.panel_evidence_root,
    single_reviewer_sections: att.coverage_depth.single_reviewer_sections.length,
    verifier_key_fingerprint: verifierFp,
    note: "Independent-party ceremony over the Opus 4.6 PUBLIC structure. NOT rsp compliance; does not observe the confidential report or Anthropic's real review panel; affiliation axis modeled.",
  };
  writeFileSync(join(outDir, "ceremony-result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(
    `Lane C ceremony: public=${pub.raw} audit=${aud.raw} reviewers=${bundle.coverage_receipts.length} sections=${sections} gap=${att.coverage_gap.length}`
  );
  if (pub.raw !== 0 || aud.raw !== 0) {
    console.error(
      `CEREMONY DID NOT VERIFY (public=${pub.raw} audit=${aud.raw}) — send ceremony-result.json and report this.`
    );
    process.exit(1);
  }
  console.log(
    `Wrote ${outDir}/{bundle.json,external-config.json,ceremony-result.json}. Send those THREE files back (NOT any *.pem).`
  );
}
