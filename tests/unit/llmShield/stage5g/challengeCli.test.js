import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { fixtureIdentities, fixtureArtifacts } from "./_validBundle.mjs";
import { identityDigest } from "../../../../tools/simurgh-attestation/stage5g/core/digests.mjs";
import { fingerprint } from "../../../../tools/simurgh-attestation/stage5g/core/signatures.mjs";
import { issueChallengeReceipt } from "../../../../tools/simurgh-attestation/stage5g/node/issue-vfc-challenge.mjs";
import { verifyChallengeReceipt } from "../../../../tools/simurgh-attestation/stage5g/node/verify-vfc-challenge.mjs";

const KEYS = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../fixtures/llmShield/stage5g/test-keys"
);
const verifierPriv = readFileSync(join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vfc.pem"), "utf8");
const { verifier } = fixtureIdentities();
const arts = fixtureArtifacts();
const pin = {
  verifier_key_fingerprint: verifier.key_fingerprint,
  verifier_identity_subject: verifier.identity_subject,
  verifier_identity_digest: identityDigest(verifier, "verifier"),
};

test("issued challenge verifies under the external pin", () => {
  const r = issueChallengeReceipt({ verifierPriv, verifierIdentity: verifier, ...arts });
  assert.equal(verifyChallengeReceipt(r, verifier, pin), true);
});

test("tampered receipt fails verification", () => {
  const r = issueChallengeReceipt({ verifierPriv, verifierIdentity: verifier, ...arts });
  r.content.challenge_id = "swapped";
  assert.equal(verifyChallengeReceipt(r, verifier, pin), false);
});

test("wrong pin fingerprint fails", () => {
  const r = issueChallengeReceipt({ verifierPriv, verifierIdentity: verifier, ...arts });
  assert.equal(
    verifyChallengeReceipt(r, verifier, { ...pin, verifier_key_fingerprint: "sha256:0" }),
    false
  );
});
