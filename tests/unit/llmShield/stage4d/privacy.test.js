// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { auditPrivacy } from "../../../../tools/simurgh-attestation/stage4d/privacy.mjs";

test("auditPrivacy rejects raw secret-like fields and private keys", () => {
  assert.equal(auditPrivacy({ raw_secret: "abc" }).ok, false);
  assert.equal(
    auditPrivacy({ nested: { private_signing_key: "-----BEGIN PRIVATE KEY-----" } }).reason,
    "privacy_leak_detected"
  );
});

test("auditPrivacy accepts hashes and redacted metadata", () => {
  assert.equal(auditPrivacy({ body_digest: "0".repeat(64), sink_id: "egress" }).ok, true);
});
