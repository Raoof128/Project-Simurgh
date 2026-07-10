import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validBundle, fixtureArtifacts } from "./_validBundle.mjs";
import {
  assembleRealAttestation,
  writeRealEvidence,
} from "../../../../tools/simurgh-attestation/stage5g/lanec/build-real-evidence.mjs";
import { verifyEvidence } from "../../../../tools/simurgh-attestation/stage5g/node/verify-vfc-attestation.mjs";

const KEYS = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../fixtures/llmShield/stage5g/test-keys"
);
const verifierPriv = readFileSync(join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vfc.pem"), "utf8");

// A returned capture-package.json carries exactly these three keys (OUTPUT_CONTRACT.md). Here we synthesise
// one from a valid bundle's producer-side parts to prove the ingest+verify path without running a model.
function syntheticPackage() {
  const b = validBundle({ rung: "challenge_bound" });
  return {
    pkg: {
      producer_identity: b.producer_identity,
      capture: b.capture,
      producer_transcript: b.producer_transcript,
    },
    receipt: b.challenge_receipt,
    verifierIdentity: b.verifier_identity,
  };
}

test("ingesting a returned capture package yields a verifiable rung-1 attestation (raw 0, both tiers)", () => {
  const { pkg, receipt, verifierIdentity } = syntheticPackage();
  const artifacts = fixtureArtifacts();
  const assembled = assembleRealAttestation({
    pkg,
    receipt,
    verifierIdentity,
    artifacts,
    verifierPriv,
  });
  const d = mkdtempSync(join(tmpdir(), "vfc-lanec-"));
  writeRealEvidence(d, assembled, artifacts);
  const pins = { dir: d, verifierPin: join(d, "pin.json"), trustRoot: join(d, "trust-root.json") };
  const pub = verifyEvidence({ ...pins, tier: "public" });
  const aud = verifyEvidence({ ...pins, tier: "audit" });
  assert.equal(pub.raw, 0);
  assert.equal(pub.proven_rung, "challenge_bound");
  assert.equal(aud.raw, 0);
  assert.equal(aud.audit_census_verified, true);
});
