// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — split attestations (plan Task 1.14). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import {
  buildPublicAttestation,
  buildAuditAttestation,
  verifyAttestation,
  attestationDigest,
} from "../../../../tools/simurgh-attestation/stage5j/core/attestation.mjs";

function build() {
  const { bundle, cfg, facts } = validBundle();
  const vid = { key_fingerprint: cfg.verifier_key_pin.key_fingerprint };
  const pub = buildPublicAttestation(bundle, 0, vid);
  const aud = buildAuditAttestation(bundle, pub, 0, vid);
  facts.attestationSigValid = {
    [attestationDigest(pub)]: true,
    [attestationDigest(aud)]: true,
  };
  return { bundle, cfg, facts, pub, aud };
}

test("public + audit attestations verify; audit binds the public one", () => {
  const { bundle, cfg, facts, pub, aud } = build();
  assert.deepEqual(verifyAttestation(pub, bundle, cfg, facts), { ok: true });
  assert.deepEqual(verifyAttestation(aud, bundle, cfg, facts, { publicAtt: pub }), { ok: true });
});

test("public attestation carries projection_status:not_verified and NO projection_root", () => {
  const { pub } = build();
  assert.equal(pub.projection_status, "not_verified");
  assert.ok(!("projection_root" in pub));
});

test("audit accepts ⟹ public accepts (theorem 9)", () => {
  const { bundle, cfg, facts, pub, aud } = build();
  const auditOk = verifyAttestation(aud, bundle, cfg, facts, { publicAtt: pub }).ok;
  const publicOk = verifyAttestation(pub, bundle, cfg, facts).ok;
  assert.ok(!auditOk || publicOk);
  assert.ok(auditOk && publicOk);
});

test("key-swap — an attestation signed by a non-pinned verifier key is rejected", () => {
  const { bundle, cfg, facts, pub } = build();
  pub.verifier_identity = { key_fingerprint: "sha256:notthepinnedverifier" };
  const r = verifyAttestation(pub, bundle, cfg, facts);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "verifier_not_pinned");
});

test("a public object that smuggles a projection_root is rejected", () => {
  const { bundle, cfg, facts, pub } = build();
  pub.projection_root = "sha256:sneaked";
  facts.attestationSigValid[attestationDigest(pub)] = true;
  const r = verifyAttestation(pub, bundle, cfg, facts);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "public_carries_projection_root");
});

test("an audit object whose public_attestation_digest does not resolve is rejected", () => {
  const { bundle, cfg, facts, aud } = build();
  const wrongPublic = { object_type: "simurgh.vrc.public_attestation.v1", tier: "public" };
  const r = verifyAttestation(aud, bundle, cfg, facts, { publicAtt: wrongPublic });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "public_attestation_unresolved");
});

test("a tampered exposed root (contest_layer_root) is rejected", () => {
  const { bundle, cfg, facts, pub } = build();
  pub.contest_layer_root = "sha256:tampered";
  facts.attestationSigValid[attestationDigest(pub)] = true;
  const r = verifyAttestation(pub, bundle, cfg, facts);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "contest_root_mismatch");
});
