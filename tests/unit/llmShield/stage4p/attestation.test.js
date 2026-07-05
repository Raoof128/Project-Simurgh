// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  buildBundle,
  buildBody0,
} from "../../../../tools/simurgh-attestation/stage4p/node/build-stage4p-attestation.mjs";
import { verifyBundle } from "../../../../tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";
import {
  DOMAINS,
  SCHEMAS,
  VOCA_NON_CLAIMS,
} from "../../../../tools/simurgh-attestation/stage4p/constants.mjs";

function throwawayKeyPem() {
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ type: "pkcs8", format: "pem" });
}

test("buildBundle: schema-valid bundle with 16 byte-equal frozen non-claims", () => {
  const bundle = buildBundle({ keyPem: throwawayKeyPem() });
  assert.equal(bundle.schema, SCHEMAS.ATTESTATION);
  assert.deepEqual(bundle.non_claims, VOCA_NON_CLAIMS);
  assert.equal(bundle.arms.length, 32); // 25 lane-a + 6 lane-b + 1 lane-c
  assert.equal(bundle.cpc_signals.length, 5);
});

test("buildBundle: verifier accepts a freshly built bundle (raw 0)", () => {
  const bundle = buildBundle({ keyPem: throwawayKeyPem() });
  const out = verifyBundle(bundle);
  assert.equal(out.ok, true);
  assert.equal(out.raw, 0);
});

test("MF5: vendor_custody_disclosure.attestation_digest equals the independently recomputed body0_digest", () => {
  const bundle = buildBundle({ keyPem: throwawayKeyPem() });
  const body0 = buildBody0();
  const body0Digest = domainDigest(DOMAINS.ATTESTATION_BUNDLE, SCHEMAS.ATTESTATION, body0);
  assert.equal(bundle.vendor_custody_disclosure.attestation_digest, body0Digest);
});

test("corroborating_commitments carries only entropy-passing matchable digests, nothing degraded", () => {
  const bundle = buildBundle({ keyPem: throwawayKeyPem() });
  const degradedEntry = bundle.cpc_signals.find((e) => e.arm === "degraded");
  assert.ok(!("custody_class_digest" in degradedEntry.signal));
  assert.ok(
    !bundle.corroborating_commitments.includes(degradedEntry.signal.stage4n_window_anchor_digest)
  );
  for (const c of bundle.corroborating_commitments) assert.match(c, /^sha256:[a-f0-9]{64}$/);
});

test("tamper matrix: every mutation fails verification with a nonzero raw", () => {
  const base = buildBundle({ keyPem: throwawayKeyPem() });
  assert.equal(verifyBundle(base).raw, 0, "sanity: base bundle must verify clean first");

  // 1. flip one arm's raw
  const flippedArm = structuredClone(base);
  flippedArm.arms[0] = { ...flippedArm.arms[0], raw: flippedArm.arms[0].raw === 0 ? 66 : 0 };
  const t1 = verifyBundle(flippedArm);
  assert.equal(t1.ok, false);
  assert.notEqual(t1.raw, 0);

  // 2. drop a non-claim
  const droppedNonClaim = structuredClone(base);
  droppedNonClaim.non_claims = droppedNonClaim.non_claims.slice(1);
  const t2 = verifyBundle(droppedNonClaim);
  assert.equal(t2.ok, false);
  assert.notEqual(t2.raw, 0);

  // 3. mutate corroborating_commitments (append a bogus but well-shaped digest)
  const mutatedCommitments = structuredClone(base);
  mutatedCommitments.corroborating_commitments = [
    ...mutatedCommitments.corroborating_commitments,
    "sha256:" + "ab".repeat(32),
  ];
  const t3 = verifyBundle(mutatedCommitments);
  assert.equal(t3.ok, false);
  assert.notEqual(t3.raw, 0);

  // 4. inject a degraded signal's window anchor into corroborating_commitments
  const degradedInjected = structuredClone(base);
  const degradedEntry = degradedInjected.cpc_signals.find((e) => e.arm === "degraded");
  degradedInjected.corroborating_commitments = [
    ...degradedInjected.corroborating_commitments,
    degradedEntry.signal.stage4n_window_anchor_digest,
  ];
  const t4 = verifyBundle(degradedInjected);
  assert.equal(t4.ok, false);
  assert.notEqual(t4.raw, 0);

  // 5. mutate a disclosure field
  const mutatedDisclosure = structuredClone(base);
  mutatedDisclosure.vendor_custody_disclosure = {
    ...mutatedDisclosure.vendor_custody_disclosure,
    declared_relay_count: mutatedDisclosure.vendor_custody_disclosure.declared_relay_count + 1,
  };
  const t5 = verifyBundle(mutatedDisclosure);
  assert.equal(t5.ok, false);
  assert.notEqual(t5.raw, 0);

  // 6. corrupt signature
  const corruptSig = structuredClone(base);
  const chars = corruptSig.signature.split("");
  const i = Math.min(5, chars.length - 1);
  chars[i] = chars[i] === "A" ? "B" : "A";
  corruptSig.signature = chars.join("");
  const t6 = verifyBundle(corruptSig);
  assert.equal(t6.ok, false);
  assert.notEqual(t6.raw, 0);
});
