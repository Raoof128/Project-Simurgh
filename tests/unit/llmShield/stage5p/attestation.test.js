// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — the signed two-tier attestation, verified OFFLINE from the public key alone.
//
// The frozen bundle in evidence/stage-5p/attestation/ was signed once, by a real random Ed25519
// stage key whose private half was never committed. Nothing here needs that private key: an
// outsider verifies the signature, and — the check that actually matters — RECOMPUTES the public
// payload from the repo and compares it to what was signed.
//
// That second check is the difference between "someone signed a document" and "the document is
// still true". A signature over stale claims verifies perfectly.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import {
  SIG5P,
  KNOWN_LIMITATIONS,
  ATTESTED_NON_CLAIMS,
  buildPublicPayload,
  buildAuditPayload,
  verifyAttestation,
} from "../../../../tools/simurgh-attestation/stage5p/node/attestation.mjs";

const DIR = fileURLToPath(
  new URL("../../../../docs/research/llm-shield/evidence/stage-5p/attestation/", import.meta.url)
);
const BUNDLE = JSON.parse(readFileSync(DIR + "stage5p-attestation.json", "utf8"));
const PUB = readFileSync(DIR + "stage5p-signer.pub", "utf8");
const digestOf = (v) =>
  crypto
    .createHash("sha256")
    .update(Buffer.from(canonicalJson(v), "utf8"))
    .digest("hex");

test("the frozen bundle verifies offline from the public key alone", () => {
  const r = verifyAttestation(BUNDLE, PUB);
  for (const [name, passed] of Object.entries(r.checks)) {
    assert.equal(passed, true, `attestation check failed: ${name}`);
  }
  assert.equal(r.ok, true);
});

test("THE CHECK THAT MATTERS — the signed claims still match what the repo computes today", () => {
  // A signature over stale claims verifies perfectly. This is what catches drift.
  assert.deepEqual(
    BUNDLE.public.payload,
    buildPublicPayload(),
    "the attestation was signed over a state the repo no longer produces"
  );
  assert.deepEqual(BUNDLE.audit.payload, buildAuditPayload());
});

test("the audit tier BINDS the public tier by digest, not by adjacency", () => {
  assert.equal(BUNDLE.audit.payload.public_attestation_digest, digestOf(BUNDLE.public.payload));
  assert.equal(BUNDLE.public.payload.attestation_schema, SIG5P.public);
  assert.equal(BUNDLE.audit.payload.attestation_schema, SIG5P.audit);
  assert.notEqual(SIG5P.public, SIG5P.audit, "the two tiers must not share a domain");
});

test("a tampered payload fails — in EITHER tier", () => {
  for (const tier of ["public", "audit"]) {
    const forged = JSON.parse(JSON.stringify(BUNDLE));
    forged[tier].payload.attestation_schema = SIG5P[tier]; // keep the schema legal
    forged[tier].payload.stage = "5Q";
    const r = verifyAttestation(forged, PUB);
    assert.equal(r.ok, false, `a tampered ${tier} payload verified`);
    assert.equal(r.checks[`${tier}_signature_valid`], false);
  }
});

test("a swapped signature fails — the two tiers are not interchangeable", () => {
  const forged = JSON.parse(JSON.stringify(BUNDLE));
  forged.public.signature = BUNDLE.audit.signature;
  assert.equal(verifyAttestation(forged, PUB).ok, false);
});

test("verification against the WRONG key fails — the pin is not decorative", () => {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const other = publicKey.export({ format: "pem", type: "spki" });
  assert.equal(verifyAttestation(BUNDLE, other).ok, false, "any key verified the bundle");
});

test("an empty limitations list is REJECTED — perfection is not a signable claim", () => {
  const forged = JSON.parse(JSON.stringify(BUNDLE));
  forged.audit.payload.known_limitations = [];
  assert.equal(verifyAttestation(forged, PUB).checks.limitations_signed, false);
});

// ---- what is actually signed ---------------------------------------------------------------

test("the LIMITATIONS are signed, and they name the real bounds rather than gestures", () => {
  const signed = BUNDLE.audit.payload.known_limitations;
  assert.deepEqual(signed, [...KNOWN_LIMITATIONS]);
  assert.ok(signed.length >= 10, "a stage this size has more than a handful of real bounds");
  // The four that would be most tempting to leave out.
  const joined = signed.join(" ");
  assert.match(joined, /NOT_a_fulcio_keyless_ceremony/i, "Lane B's biggest bound must be signed");
  assert.match(joined, /not_an_offline_gleif_signature/i, "Lane C1's authentication gap");
  assert.match(joined, /lane_c2.*unreachable/i, "an unreachable lane is a signed fact");
  // Lane L EXECUTED, so its limitation is now about SCOPE rather than absence: one model, one day,
  // and containment as a property of the verifier rather than a claim about model safety.
  assert.match(joined, /lane_l_captured_ONE_model_on_ONE_day/i);
  assert.match(joined, /containment_is_a_property_of_the_VERIFIER/i);
});

test("the NON-CLAIMS travel in the PUBLIC tier, so consumers get them without an audit", () => {
  assert.deepEqual(BUNDLE.public.payload.non_claims, [...ATTESTED_NON_CLAIMS]);
  for (const nc of [
    "not_proof_of_uncompromised_identity",
    "not_proof_of_submission_completeness",
    "not_proof_of_present_accountability",
  ]) {
    assert.ok(BUNDLE.public.payload.non_claims.includes(nc));
  }
});

test("lanes that did NOT run are stated POSITIVELY — absence is a signed fact", () => {
  assert.deepEqual(BUNDLE.public.payload.lanes_not_executed, ["C2"]);
  // ...and the lanes that DID run carry real coordinates, not booleans.
  assert.equal(BUNDLE.public.payload.lane_b_log, "rekor.sigstore.dev");
  assert.ok(BUNDLE.public.payload.lane_b_log_index > 0);
  assert.equal(BUNDLE.public.payload.lane_b_is_keyless, false, "never presented as keyless");
  assert.equal(BUNDLE.public.payload.lane_c1_records, 3);
  assert.equal(BUNDLE.public.payload.lane_l_probes, 3);
  // Produced + refused must account for EVERY probe — a probe with no disposition would be a
  // silently dropped result, which is the one thing a live lane must never do.
  assert.equal(
    BUNDLE.public.payload.lane_l_produced_claims + BUNDLE.public.payload.lane_l_refusals,
    BUNDLE.public.payload.lane_l_probes
  );
});

test("the attestation binds the FROZEN contract, not a summary of it", () => {
  const p = BUNDLE.public.payload;
  assert.equal(p.check_order.length, 9);
  assert.equal(p.typed_outcomes.length, 11);
  assert.match(p.raw_code_allocation_digest, /^[0-9a-f]{64}$/);
  assert.match(p.lane_a_census_digest, /^[0-9a-f]{64}$/);
  assert.match(p.raw_code_census_digest, /^[0-9a-f]{64}$/);
  assert.match(p.lean_core_digest, /^[0-9a-f]{64}$/);
  assert.equal(p.lane_a_census_ok, true);
  assert.equal(p.raw_code_census_ok, true);
  assert.deepEqual(p.discharge_counts, {
    witnessed: 11,
    mechanically_unreachable: 0,
    reserved: 0,
    pending: 0,
  });
});

test("the Lean digest binds the proof a reader HAS to the proof we signed", () => {
  const lean = readFileSync(
    fileURLToPath(new URL("../../../../proofs/stage5p/Vsi.lean", import.meta.url))
  );
  assert.equal(
    crypto.createHash("sha256").update(lean).digest("hex"),
    BUNDLE.public.payload.lean_core_digest
  );
});

test("the payload carries NO clock, host or absolute path — or it would not reproduce", () => {
  const text = canonicalJson(BUNDLE.public.payload);
  assert.ok(!/\/Users\//.test(text), "an absolute path would leak the producer's machine");
  assert.ok(!/"generated_at"|"timestamp"|"hostname"/.test(text));
  // integrated_time from Rekor is a LOG fact, not our clock — it is deliberately not in the public
  // payload; the uuid and log index pin the entry without importing a wall clock.
  assert.ok(!("generated_utc" in BUNDLE.public.payload));
});

test("NO private key is committed anywhere in the attestation evidence", () => {
  for (const f of ["stage5p-signer.pub", "stage5p-attestation.json"]) {
    const text = readFileSync(DIR + f, "utf8");
    assert.ok(!text.includes("PRIVATE KEY"), `${f} contains private key material`);
  }
  assert.match(readFileSync(DIR + "stage5p-signer.pub", "utf8"), /BEGIN PUBLIC KEY/);
});
