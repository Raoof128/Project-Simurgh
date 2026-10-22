import test from "node:test";
import assert from "node:assert/strict";
import {
  createArtifact,
  verifyArtifact,
  fingerprint,
} from "../../../tools/openai-readiness/artifact.mjs";
import { runOffline } from "../../../tools/openai-readiness/experiment.mjs";
test("fresh self attestation verifies reproducible payload with optional pinned key", () => {
  const a = createArtifact(runOffline());
  const b = createArtifact(runOffline());
  assert.deepEqual(a.payload, b.payload);
  assert.notEqual(a.publicKey, b.publicKey);
  assert.equal(verifyArtifact(a).valid, true);
  assert.equal(verifyArtifact(a, { expectedFingerprint: fingerprint(a.publicKey) }).valid, true);
  assert.throws(() => verifyArtifact(a, { expectedFingerprint: "0".repeat(64) }));
  assert.equal(JSON.stringify(a).includes("PRIVATE KEY"), false);
});
test("tampering, omission, reordering and unknown cases fail verification even after resigning", () => {
  const base = runOffline();
  const variants = [
    structuredClone(base),
    structuredClone(base),
    structuredClone(base),
    structuredClone(base),
  ];
  variants[0].modes.enforced.metrics.attackSuccesses++;
  variants[1].modes.enforced.cases.pop();
  variants[2].modes.enforced.cases.reverse();
  variants[3].modes.enforced.cases[0].id = "unknown";
  for (const payload of variants) assert.throws(() => verifyArtifact(createArtifact(payload)));
  const a = createArtifact(base);
  a.payload.corpusHash = "tampered";
  assert.throws(() => verifyArtifact(a));
});
test("noncanonical signature encodings fail closed", () => {
  const a = createArtifact(runOffline());
  a.signature += "!!!";
  assert.throws(() => verifyArtifact(a));
});
