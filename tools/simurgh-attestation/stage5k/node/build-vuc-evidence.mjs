// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — build the byte-stable Lane-A evidence pack: bundle.json + external-config.json +
// public-attestation.json + audit-attestation.json. Deterministic keys ⇒ byte-identical on every run.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSignedVucBundle } from "./buildSignedBundle.mjs";
import { makeAdapterFacts } from "./adapter.mjs";
import { makeCtx } from "../core/context.mjs";
import { vucVerify } from "../core/vucCore.mjs";
import { buildPublicAttestation, buildAuditAttestation } from "../core/attestation.mjs";
import { signContent } from "../core/signatures.mjs";
import { canonicalJson } from "../core/digests.mjs";
import { DOMAINS } from "../constants.mjs";
import { vucLaneKeys } from "./laneKeys.mjs";

export const EVIDENCE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5k"
);

export function buildLaneAEvidence(dir = EVIDENCE_DIR) {
  const keys = vucLaneKeys();
  const { bundle, cfg } = buildSignedVucBundle(keys);
  const facts = makeAdapterFacts(bundle, cfg);
  const ctx = makeCtx(bundle, cfg, facts);
  const pubRaw = vucVerify(bundle, cfg, facts, { tier: "public" }).raw;
  const audRaw = vucVerify(bundle, cfg, facts, { tier: "audit" }).raw;
  const vid = keys.verifier.id;

  const publicAtt = buildPublicAttestation(bundle, pubRaw, vid);
  const publicWrap = {
    attestation: publicAtt,
    signature: signContent(keys.verifier.privatePem, DOMAINS.attestation_public, publicAtt),
  };
  const auditAtt = buildAuditAttestation(bundle, publicAtt, audRaw, vid, ctx);
  const auditWrap = {
    attestation: auditAtt,
    signature: signContent(keys.verifier.privatePem, DOMAINS.attestation_audit, auditAtt),
  };

  mkdirSync(dir, { recursive: true });
  const write = (name, obj) => writeFileSync(join(dir, name), canonicalJson(obj) + "\n");
  write("bundle.json", bundle);
  write("external-config.json", cfg);
  write("public-attestation.json", publicWrap);
  write("audit-attestation.json", auditWrap);
  return {
    dir,
    files: [
      "bundle.json",
      "external-config.json",
      "public-attestation.json",
      "audit-attestation.json",
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { dir, files } = buildLaneAEvidence(process.argv[2] || undefined);
  console.log(`wrote ${files.length} files to ${dir}`);
}
