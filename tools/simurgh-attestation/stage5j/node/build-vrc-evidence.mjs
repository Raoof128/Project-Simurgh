// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — build the byte-stable Lane-A evidence pack from committed keys. Deterministic keys ⇒
// deterministic Ed25519 ⇒ byte-identical output. The Fable-5 laundering scenario is the base pack; the
// full 332–346 negative-arm reachability lives in the K7 net.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../core/digests.mjs";
import { signContent } from "../core/signatures.mjs";
import { DOMAINS } from "../constants.mjs";
import { vrcLaneKeys } from "./laneKeys.mjs";
import { buildSignedVrcBundle } from "./buildSignedBundle.mjs";
import { verifyVrc } from "./adapter.mjs";
import { buildPublicAttestation, buildAuditAttestation } from "../core/attestation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const EVIDENCE_DIR = join(ROOT, "docs/research/llm-shield/evidence/stage-5j");

export function buildLaneAEvidence(outDir = EVIDENCE_DIR) {
  const keys = vrcLaneKeys();
  const { bundle, cfg } = buildSignedVrcBundle(keys);

  const publicVerdict = verifyVrc(bundle, cfg, { tier: "public" }).raw;
  const auditVerdict = verifyVrc(bundle, cfg, { tier: "audit" }).raw;
  const vid = { key_fingerprint: keys.verifier.id.key_fingerprint };

  const pub = buildPublicAttestation(bundle, publicVerdict, vid);
  pub.signature = signContent(keys.verifier.privatePem, DOMAINS.attestation_public, pub);
  const aud = buildAuditAttestation(bundle, pub, auditVerdict, vid);
  aud.signature = signContent(keys.verifier.privatePem, DOMAINS.attestation_audit, aud);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "bundle.json"), canonicalJson(bundle) + "\n");
  writeFileSync(join(outDir, "external-config.json"), canonicalJson(cfg) + "\n");
  writeFileSync(join(outDir, "public-attestation.json"), canonicalJson(pub) + "\n");
  writeFileSync(join(outDir, "audit-attestation.json"), canonicalJson(aud) + "\n");
  return { bundle, cfg, pub, aud, publicVerdict, auditVerdict, outDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { outDir, publicVerdict, auditVerdict } = buildLaneAEvidence();
  console.log(
    `Lane-A evidence written to ${outDir} (public=${publicVerdict} audit=${auditVerdict})`
  );
}
