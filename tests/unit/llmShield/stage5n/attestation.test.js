// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — two-tier attestation sign/verify/tamper + in-toto subject correctness + domain distinctness.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildPublicPayload,
  buildAuditPayload,
  signAttestation,
  verifyAttestation,
  SIG5N,
} from "../../../../tools/simurgh-attestation/stage5n/node/attestation.mjs";
import { buildIntotoStatement } from "../../../../tools/simurgh-attestation/stage5n/node/intoto.mjs";
import { buildValid } from "./_valid.mjs";

const KEYDIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/llmShield/stage5n/test-keys"
);
function keypair(role) {
  const priv = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${role}.pem`), "utf8");
  const pub = crypto
    .createPublicKey(crypto.createPrivateKey(priv))
    .export({ type: "spki", format: "pem" })
    .toString();
  return { priv, pub };
}

test("public attestation: sign → verify; tamper any bound field → fail", () => {
  const v = buildValid();
  const { priv, pub } = keypair("finalsigner");
  const verdict = { raw: 0, reason: "ok", elapsed_lower_bound_ms: 90000 };
  const payload = buildPublicPayload(v.envelope, verdict, v.verifier_config, v.census);
  assert.ok(payload.non_claims.includes("not_runtime_binary_attestation"));
  assert.equal(payload.elapsed_lower_bound_ms, 90000);
  const signed = signAttestation(payload, priv, SIG5N.public);
  assert.equal(verifyAttestation(signed, pub, SIG5N.public), true);
  const tampered = { ...signed, D_out: "0".repeat(64) };
  assert.equal(verifyAttestation(tampered, pub, SIG5N.public), false);
  // Wrong domain must not verify (domain distinctness).
  assert.equal(verifyAttestation(signed, pub, SIG5N.audit), false);
});

test("audit attestation binds the public digest + signed known_limitations", () => {
  const v = buildValid();
  const { priv, pub } = keypair("finalsigner");
  const verdict = { raw: 0, reason: "ok", elapsed_lower_bound_ms: 90000 };
  const audit = buildAuditPayload(v.envelope, verdict, v.verifier_config, v.census, v.facts);
  assert.ok(audit.public_attestation_digest.match(/^[0-9a-f]{64}$/));
  assert.ok(audit.known_limitations.some((l) => /finalisation_is_not_cognition/.test(l)));
  const signed = signAttestation(audit, priv, SIG5N.audit);
  assert.equal(verifyAttestation(signed, pub, SIG5N.audit), true);
});

test("in-toto subject is sha256(envelope bytes), NOT D_out; predicate carries the interval + non-claim", () => {
  const v = buildValid();
  const bytes = Buffer.from(JSON.stringify(v.envelope), "utf8");
  const stmt = buildIntotoStatement(
    bytes,
    v.envelope,
    { raw: 0, elapsed_lower_bound_ms: 90000 },
    "aa".repeat(32)
  );
  const expected = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(stmt.subject[0].digest.sha256, expected);
  assert.notEqual(
    stmt.subject[0].digest.sha256,
    v.envelope.D_out,
    "subject must not be the domain-separated D_out"
  );
  assert.equal(stmt.predicate.D_out, v.envelope.D_out);
  assert.equal(stmt.predicate.elapsed_lower_bound_ms, 90000);
  assert.match(stmt.predicate.conformance, /unregistered candidate/);
});
