// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — load the committed INSECURE_FIXTURE_ONLY Lane-A keys into the buildSignedBundle shape.
// Deterministic keys ⇒ deterministic Ed25519 signatures ⇒ byte-identical evidence.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createPublicKey } from "node:crypto";
import { fingerprint } from "../core/signatures.mjs";

const KEYDIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/llmShield/stage5i/test-keys"
);

function load(name, subject) {
  const privatePem = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8");
  const pem = createPublicKey(privatePem).export({ type: "spki", format: "pem" });
  return {
    privatePem,
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

export function laneKeys() {
  const hostA = load("hostA", "reviewerA-host");
  const hostB = load("hostB", "reviewerB-host");
  return {
    producer: load("producer", "evidence-producer"),
    grantIssuer: load("grantIssuer", "panel-coordinator"),
    affIssuer: load("affIssuer", "affiliation-authority"),
    verifier: load("verifier", "simurgh-verifier"),
    reviewers: [load("reviewerA", "reviewerA"), load("reviewerB", "reviewerB")],
    hosts: { A: hostA.id.key_fingerprint, B: hostB.id.key_fingerprint },
  };
}

// The frozen Lane-A panel: 8 sections, 2 reviewers, each C(r) ⊂ S, union = S.
export function lanePanelSpec(keys) {
  const sections = ["1", "2", "3", "4", "5", "6", "7", "8"].map((id) => ({
    section_id: id,
    canonical_path: `sec/${id}`,
    redaction_types: [],
  }));
  const panel = [
    { i: 0, hostFp: keys.hosts.A, lineage: "sha256:lineage-A", sec: ["1", "2", "3", "4", "5"] },
    { i: 1, hostFp: keys.hosts.B, lineage: "sha256:lineage-B", sec: ["4", "5", "6", "7", "8"] },
  ];
  return { sections, panel };
}
