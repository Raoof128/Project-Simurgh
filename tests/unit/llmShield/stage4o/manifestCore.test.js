// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateManifest,
  computeToolsetRoot,
  deltaObject,
  deltaDigest,
  commitmentDigest,
  validateEnvelope,
} from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import {
  COMMITMENT_SCHEMA,
  GENESIS,
} from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";
import { mkEntry, mkManifest } from "./helpers.mjs";

test("valid manifest passes; unknown key, bad enum, unsorted, duplicate all fail exact-key validation", () => {
  const m = mkManifest([mkEntry(1), mkEntry(2)]);
  assert.deepEqual(validateManifest(m), { ok: true });
  assert.equal(validateManifest({ ...m, extra: 1 }).ok, false);
  const bad = mkManifest([mkEntry(1, { authority_class: "root" }), mkEntry(2)]);
  assert.equal(validateManifest(bad).ok, false);
  const unsorted = { ...m, tools: [...m.tools].reverse() };
  assert.equal(validateManifest(unsorted).ok, false);
  const dup = { ...m, tools: [m.tools[0], m.tools[0]] };
  assert.equal(validateManifest(dup).ok, false);
});

test("computeToolsetRoot equals the manifest's own toolset_digest", () => {
  const m = mkManifest([mkEntry(1), mkEntry(2), mkEntry(3)]);
  assert.equal(computeToolsetRoot(m), m.toolset_digest);
});

test("delta object is sorted and delta digest deterministic", () => {
  const m0 = mkManifest([mkEntry(1), mkEntry(2)]);
  const m1 = mkManifest([mkEntry(1), mkEntry(2, { authority_class: "write" }), mkEntry(3)]);
  const d = deltaObject(m0, m1);
  assert.equal(d.added.length, 1);
  assert.equal(d.changed.length, 1);
  assert.equal(d.removed.length, 0);
  assert.equal(deltaDigest(m0, m1), deltaDigest(m0, m1));
});

test("envelope: genesis rules enforced at epoch 0; epoch fields sane", () => {
  const m = mkManifest([mkEntry(1)]);
  const env = {
    schema: COMMITMENT_SCHEMA,
    manifest: m,
    manifest_epoch: 0,
    valid_from_epoch: 0,
    valid_until_epoch: 10,
    previous_manifest_digest: GENESIS,
    delta_digest: GENESIS,
    consent_binding: "state",
    signer_public_key_pem: "PEM",
    signature: "sig",
  };
  assert.deepEqual(validateEnvelope(env), { ok: true });
  assert.equal(
    validateEnvelope({ ...env, previous_manifest_digest: "sha256:" + "a".repeat(64) }).ok,
    false
  );
  assert.equal(validateEnvelope({ ...env, valid_until_epoch: -1 }).ok, false);
  assert.match(commitmentDigest(env), /^sha256:/);
  assert.equal(commitmentDigest(env), commitmentDigest({ ...env, signature: "other" }));
});
