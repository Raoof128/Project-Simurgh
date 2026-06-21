// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyExtraction } from "../../../../tools/simurgh-extraction/verify-stage3t-attestation.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3t";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

test("committed 3T attestation verifies (portable checks all true)", async () => {
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  const { ok, checks } = verifyExtraction({
    attestation,
    sidecar,
    publicKeyPem: pub.public_key_pem,
    set,
    detectorConfig,
  });
  assert.equal(ok, true, JSON.stringify(checks));
  assert.equal(checks.meta_set_digest_binding, true);
  assert.equal(checks.detector_id_binding, true);
});

test("a tampered decision breaks the signature", async () => {
  const attestation = { ...(await rd("result/attestation.json")), decision: "no_pattern_observed" };
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  const { ok } = verifyExtraction({
    attestation,
    sidecar,
    publicKeyPem: pub.public_key_pem,
    set,
    detectorConfig,
  });
  assert.equal(ok, false);
});

test("a meta-set with a swapped run breaks the digest binding", async () => {
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  set.runs[0].capability_tag = "tampered_capability";
  const { ok, checks } = verifyExtraction({
    attestation,
    sidecar,
    publicKeyPem: pub.public_key_pem,
    set,
    detectorConfig,
  });
  assert.equal(checks.meta_set_digest_binding, false);
  assert.equal(ok, false);
});
