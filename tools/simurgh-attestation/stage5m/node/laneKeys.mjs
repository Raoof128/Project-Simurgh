// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — committed INSECURE_FIXTURE_ONLY Lane-A keys (gate / sequencer / tsaverifier Ed25519;
// submitter EC P-256 for Rekor). Deterministic committed keys ⇒ byte-identical Lane-A evidence.
// Real Lane-B/D keys are NOT here (public-only, under evidence/stage-5m/real-laneb/keys).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createPublicKey } from "node:crypto";
import { fingerprint } from "../../stage5l/node/signatures.mjs";

const KEYDIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/llmShield/stage5m/test-keys"
);

function load(name, subject) {
  const privatePem = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8");
  const pem = createPublicKey(privatePem).export({ type: "spki", format: "pem" });
  return {
    privatePem,
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

export function vtcQuorumLaneKeys() {
  return {
    gate: load("gate", "vtcq-5m-gate"),
    sequencer: load("sequencer", "vtcq-5m-sequencer"),
    tsaverifier: load("tsaverifier", "vtcq-5m-tsa-verifier"),
    submitter: load("submitter", "vtcq-5m-submitter"),
  };
}
