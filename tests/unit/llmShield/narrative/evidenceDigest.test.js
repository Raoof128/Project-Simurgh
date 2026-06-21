// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  EVIDENCE_DIGEST_SCHEMA,
  digestSourceInput,
  buildEvidenceDigest,
  resolveDigestRef,
} from "../../../../tools/simurgh-narrative/evidenceDigest.mjs";

const base = {
  sessionHash: "sha256:sess",
  sourceInputs: [{ kind: "gateway_receipt", path: "p1", digest: "sha256:a" }],
  audit_chain_valid: true,
  daemon_proof_counts: { valid: 12, missing: 1, replayed: 0 },
  gateway: { fallback_used: true, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
  vca: { attestation_verified: true, claim_conflicts: 0 },
  privacy: {
    raw_pixels_captured: false,
    raw_window_titles_captured: false,
    typed_content_captured: false,
  },
};

test("digestSourceInput hashes content", () => {
  const s = digestSourceInput("vca_attestation", "x/y.json", "hello");
  assert.equal(s.kind, "vca_attestation");
  assert.equal(s.path, "x/y.json");
  assert.match(s.digest, /^sha256:/);
});

test("buildEvidenceDigest is deterministic + schema-typed", () => {
  const a = buildEvidenceDigest(base);
  const b = buildEvidenceDigest(JSON.parse(JSON.stringify(base)));
  assert.equal(a.type, EVIDENCE_DIGEST_SCHEMA);
  assert.equal(a.session_hash, "sha256:sess");
  assert.deepEqual(a, b);
  assert.equal(a.source_inputs[0].kind, "gateway_receipt");
  assert.equal(a.gateway.fallback_used, true);
});

test("buildEvidenceDigest coerces defaults when fields are absent", () => {
  const a = buildEvidenceDigest({ sessionHash: "sha256:x" });
  assert.equal(a.audit_chain_valid, false);
  assert.equal(a.daemon_proof_counts.valid, 0);
  assert.equal(a.gateway.fallback_used, false);
  assert.equal(a.vca.attestation_verified, false);
  assert.equal(a.privacy.typed_content_captured, false);
  assert.deepEqual(a.source_inputs, []);
});

test("resolveDigestRef walks dotted paths and reports missing", () => {
  const d = buildEvidenceDigest(base);
  assert.deepEqual(resolveDigestRef(d, "gateway.fallback_used"), { found: true, value: true });
  assert.deepEqual(resolveDigestRef(d, "daemon_proof_counts.missing"), { found: true, value: 1 });
  assert.deepEqual(resolveDigestRef(d, "gateway.nope"), { found: false, value: undefined });
  assert.deepEqual(resolveDigestRef(d, "does.not.exist"), { found: false, value: undefined });
  assert.deepEqual(resolveDigestRef(d, 42), { found: false, value: undefined });
});
