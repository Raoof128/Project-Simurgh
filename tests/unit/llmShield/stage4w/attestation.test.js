import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAttestation,
  bundleMerkleRoot,
  resignAttestation,
} from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4w/node/verify-stage4w-attestation.mjs";
import { buildBridgeStatement } from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-bridge.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");

test("attestation round-trips public + audit tiers", () => {
  const att = buildAttestation();
  assert.equal(verifyAttestation(att, { tier: "public" }).ok, true);
  assert.equal(verifyAttestation(att, { tier: "audit" }).ok, true);
});

test("stale-signature forgery is caught (broken signature)", () => {
  const att = buildAttestation();
  const forged = JSON.parse(JSON.stringify(att));
  forged.content.lane_a_fixtures[0].narrative_digest = "sha256:" + "0".repeat(64);
  forged.bundle_merkle_root = bundleMerkleRoot(forged); // recomputes root but NOT re-signed
  const r = verifyAttestation(forged, { tier: "audit" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "attestation_signature_invalid");
});

test("validly RE-SIGNED falsified Lane A pack is public-GREEN but audit-RED (reviewer P1 #6)", () => {
  const forged = JSON.parse(JSON.stringify(buildAttestation()));
  forged.content.lane_a_fixtures[0].narrative_digest = "sha256:" + "0".repeat(64);
  forged.bundle_merkle_root = bundleMerkleRoot(forged);
  resignAttestation(forged, readKey("vsn")); // valid signature over the lie
  assert.equal(verifyAttestation(forged, { tier: "public" }).ok, true);
  const audit = verifyAttestation(forged, { tier: "audit" });
  assert.equal(audit.ok, false);
  assert.equal(audit.reason, "lane_a_fixture_falsified");
});

test("bridge statement is in-toto v1 with recomputable subject", () => {
  const s = buildBridgeStatement(
    "sha256:" + "a".repeat(64),
    "sha256:" + "b".repeat(64),
    "sha256:" + "c".repeat(64)
  );
  assert.equal(s._type, "https://in-toto.io/Statement/v1");
  assert.equal(s.subject[0].digest.sha256, "a".repeat(64));
  assert.equal(s.predicate.span_map_digest, "sha256:" + "b".repeat(64));
});
