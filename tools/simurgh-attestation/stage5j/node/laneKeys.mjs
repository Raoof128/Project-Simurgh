// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — load the committed INSECURE_FIXTURE_ONLY Lane-A keys. VRC REUSES 5I's producer + reviewer
// keys (producer_ref binds the 5I producer identity; reviewer_id must equal the 5I panel fingerprints)
// and adds its own ledger-authority / scale-authority / verifier keys. Deterministic keys ⇒
// deterministic Ed25519 ⇒ byte-identical evidence.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createPublicKey } from "node:crypto";
import { fingerprint } from "../core/signatures.mjs";
import { laneKeys as vpcLaneKeys } from "../../stage5i/node/laneKeys.mjs";

const KEYDIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/llmShield/stage5j/test-keys"
);

function load(name, subject) {
  const privatePem = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8");
  const pem = createPublicKey(privatePem).export({ type: "spki", format: "pem" });
  return {
    privatePem,
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

export function vrcLaneKeys() {
  const vpc = vpcLaneKeys(); // 5I committed keys (producer, reviewers, verifier, …)
  return {
    vpc,
    producer: vpc.producer, // reuse — producer_ref binds the 5I producer identity
    reviewers: vpc.reviewers, // reuse — C(r) uses these fingerprints
    ledger: load("ledger", "vrc-ledger-authority"),
    scale: load("scale", "vrc-scale-authority"),
    verifier: load("verifier", "vrc-verifier"),
  };
}
