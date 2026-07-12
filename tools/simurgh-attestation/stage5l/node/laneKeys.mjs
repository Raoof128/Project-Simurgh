// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — committed INSECURE_FIXTURE_ONLY Lane keys (gate / sequencer / tsa-verifier). Deterministic
// keys ⇒ deterministic Ed25519 ⇒ byte-identical evidence.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createPublicKey } from "node:crypto";
import { fingerprint } from "./signatures.mjs";

const KEYDIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/llmShield/stage5l/test-keys"
);

function load(name, subject) {
  const privatePem = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8");
  const pem = createPublicKey(privatePem).export({ type: "spki", format: "pem" });
  return {
    privatePem,
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

export function vtcqLaneKeys() {
  return {
    gate: load("gate", "vtcq-gate"),
    sequencer: load("sequencer", "vtcq-sequencer"),
    tsaverifier: load("tsaverifier", "vtcq-tsa-verifier"),
  };
}
