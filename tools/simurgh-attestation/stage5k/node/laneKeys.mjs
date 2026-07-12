// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — committed INSECURE_FIXTURE_ONLY Lane keys. VUC REUSES the 5J/5I producer + reviewer keys
// (the producer key also signs the universe commitment — no delegation object in v1) and adds its own
// content-blind sequencer + verifier keys. Deterministic keys ⇒ deterministic Ed25519 ⇒ byte-identical.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createPublicKey } from "node:crypto";
import { fingerprint } from "../core/signatures.mjs";
import { vrcLaneKeys } from "../../stage5j/node/laneKeys.mjs";

const KEYDIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/llmShield/stage5k/test-keys"
);

function load(name, subject) {
  const privatePem = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8");
  const pem = createPublicKey(privatePem).export({ type: "spki", format: "pem" });
  return {
    privatePem,
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}

export function vucLaneKeys() {
  const vrc = vrcLaneKeys();
  return {
    vrc, // full 5J key bundle (vpc, producer, reviewers, ledger, scale, verifier)
    producer: vrc.producer, // reused; also signs the universe commitment (no delegation, v1)
    reviewers: vrc.reviewers, // reused 5I panel principals
    sequencer: load("sequencer", "vuc-sequencer"),
    verifier: load("verifier", "vuc-verifier"),
  };
}
