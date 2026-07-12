// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — split attestations (audit ⟹ public), the committed Lane-A pack, and byte-stability.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSignedVucBundle } from "../../../../tools/simurgh-attestation/stage5k/node/buildSignedBundle.mjs";
import {
  makeAdapterFacts,
  makeAttestationFacts,
} from "../../../../tools/simurgh-attestation/stage5k/node/adapter.mjs";
import { makeCtx } from "../../../../tools/simurgh-attestation/stage5k/core/context.mjs";
import { vucVerify } from "../../../../tools/simurgh-attestation/stage5k/core/vucCore.mjs";
import {
  buildPublicAttestation,
  buildAuditAttestation,
  verifyAttestation,
} from "../../../../tools/simurgh-attestation/stage5k/core/attestation.mjs";
import { signContent } from "../../../../tools/simurgh-attestation/stage5k/core/signatures.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5k/constants.mjs";
import { vucLaneKeys } from "../../../../tools/simurgh-attestation/stage5k/node/laneKeys.mjs";
import { buildLaneAEvidence } from "../../../../tools/simurgh-attestation/stage5k/node/build-vuc-evidence.mjs";
import { verifyPack } from "../../../../tools/simurgh-attestation/stage5k/node/verify-vuc-attestation.mjs";
import { verifyByteStability } from "../../../../tools/simurgh-attestation/stage5k/node/verify-byte-stability.mjs";

function built() {
  const keys = vucLaneKeys();
  const { bundle, cfg } = buildSignedVucBundle(keys);
  const facts = makeAdapterFacts(bundle, cfg);
  const ctx = makeCtx(bundle, cfg, facts);
  const vid = keys.verifier.id;
  const publicAtt = buildPublicAttestation(bundle, 0, vid);
  const publicWrap = {
    attestation: publicAtt,
    signature: signContent(keys.verifier.privatePem, DOMAINS.attestation_public, publicAtt),
  };
  const auditAtt = buildAuditAttestation(bundle, publicAtt, 0, vid, ctx);
  const auditWrap = {
    attestation: auditAtt,
    signature: signContent(keys.verifier.privatePem, DOMAINS.attestation_audit, auditAtt),
  };
  const afacts = { ...facts, ...makeAttestationFacts([publicWrap, auditWrap], cfg) };
  return { bundle, cfg, ctx, publicAtt, auditAtt, facts: afacts };
}

test("public attestation never carries a projection_root; binds context + policy", () => {
  const { bundle, cfg, publicAtt, facts } = built();
  assert.equal(publicAtt.projection_status, "not_verified");
  assert.equal("projection_root" in publicAtt, false);
  assert.equal(verifyAttestation(publicAtt, bundle, cfg, facts).ok, true);
});

test("audit ⟹ public: audit binds the public digest, same context + policy", () => {
  const { bundle, cfg, ctx, publicAtt, auditAtt, facts } = built();
  assert.equal(verifyAttestation(auditAtt, bundle, cfg, facts, { publicAtt, ctx }).ok, true);
  // tamper the public digest the audit binds → reject
  const bad = { ...auditAtt, public_attestation_digest: "sha256:" + "0".repeat(64) };
  assert.equal(verifyAttestation(bad, bundle, cfg, facts, { publicAtt, ctx }).ok, false);
});

test("attestation with an invalid signature is rejected", () => {
  const { bundle, cfg, publicAtt, facts } = built();
  const broken = { ...facts, attestationSigValid: {} };
  assert.equal(verifyAttestation(publicAtt, bundle, cfg, broken).ok, false);
});

test("committed Lane-A pack builds, verifies raw 0 (public + audit), and is byte-stable", () => {
  const dir = mkdtempSync(join(tmpdir(), "vuc-pack-"));
  buildLaneAEvidence(dir);
  assert.equal(verifyPack(dir, "public").raw, 0);
  assert.equal(verifyPack(dir, "audit").raw, 0);
  const { files } = verifyByteStability();
  assert.equal(files.length, 4);
});
