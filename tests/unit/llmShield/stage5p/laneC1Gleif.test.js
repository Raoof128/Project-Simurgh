// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane C1 — the `gleif.lei.v1` registry-continuity profile.
//
// The FIRST real resolver profile in this stage: a public registry, captured and frozen, re-verified
// offline by digest. Its honest bound is stated in the capture's own provenance and repeated here —
// TLS-at-capture, NOT an offline GLEIF signature. This lane proves the continuity axis against real
// public infrastructure; it does not prove the bytes were signed by GLEIF.
//
// The capture discovered the semantic this file exists to enforce: `entity.status` and
// `registration.status` are INDEPENDENT sub-signals. Lehman entities are entity-ACTIVE in
// liquidation with LAPSED registrations. Reading either alone gets the answer wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GLEIF_PROFILE_ID,
  GLEIF_NAMESPACE,
  GLEIF_CEILING,
  GLEIF_PAIR_MAP,
  mapRegistryPair,
} from "../../../../tools/simurgh-attestation/stage5p/core/gleifContinuityMap.mjs";
import {
  loadGleifCapture,
  gleifEvidenceFor,
  GLEIF_PINNED,
  GLEIF_CAPTURE_LEIS,
} from "../../../../tools/simurgh-attestation/stage5p/node/laneC1Gleif.mjs";
import { verifySection2 } from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import {
  rawCodeFor,
  VSI_ALLOCATION,
  VSI_OK_RAW,
} from "../../../../tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs";

// The code for an outcome comes from the allocator. Its binding to the frozen Annex R / A5 tables is
// asserted literally in rawCodeAllocator.test.js — re-transcribing the numbers here would duplicate
// that proof rather than add one, and would put the same literal in two places to drift apart.
const codeFor = (outcome) => VSI_ALLOCATION.find((r) => r.policy_outcome === outcome).raw_code;
import { leqV } from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";

// ---- the PAIR is normative -----------------------------------------------------------------

test("the profile's ceiling grants continuity and org resolution — and NOTHING on binding or role", () => {
  assert.equal(GLEIF_CEILING.binding, "unbound", "a registry proves no key binding");
  assert.equal(GLEIF_CEILING.role, "unproven", "a registry proves no accountable role");
  assert.equal(GLEIF_CEILING.continuity, "durable");
  assert.equal(GLEIF_CEILING.resolution, "provider_asserted");
});

test("the map is keyed on the PAIR — never on either status alone", () => {
  // The capture's discovery, encoded: entity-ACTIVE appears with BOTH a current and a decayed
  // registration, so entity status alone cannot decide continuity.
  const activeIssued = mapRegistryPair("ACTIVE", "ISSUED");
  const activeLapsed = mapRegistryPair("ACTIVE", "LAPSED");
  assert.equal(activeIssued.continuity, "durable");
  assert.equal(activeLapsed.continuity, "ephemeral");
  assert.notEqual(activeIssued.continuity, activeLapsed.continuity);
  // ...and registration status alone cannot decide lifecycle either.
  assert.equal(activeLapsed.principal_lifecycle, "active");
  assert.equal(mapRegistryPair("INACTIVE", "RETIRED").principal_lifecycle, "ceased");
});

test("LAPSED is decay, not death — the entity is still alive and the binding is not", () => {
  const m = mapRegistryPair("ACTIVE", "LAPSED");
  assert.equal(m.principal_lifecycle, "active", "a lapsed registration does not kill the entity");
  assert.equal(m.continuity, "ephemeral", "but it can no longer support a durable claim");
});

test("RETIRED records stay published — Law 5 as GLEIF's own operating practice", () => {
  const m = mapRegistryPair("INACTIVE", "RETIRED");
  assert.equal(m.principal_lifecycle, "ceased");
  // The record is still resolvable; expiry is not erasure. That is what makes the Archaeology Test
  // possible at all — a ceased principal's history must still verify.
  assert.equal(m.record_still_resolvable, true);
});

test("an UNOBSERVED pair is rejected, never guessed", () => {
  // GLEIF publishes more statuses than the capture contains (PENDING_TRANSFER, MERGED, ANNULLED,
  // DUPLICATE...). Mapping only what was actually observed and failing closed on the rest is Lane C
  // condition 7 — no guessed equivalence — rather than a gap in the table.
  for (const [e, r] of [
    ["ACTIVE", "PENDING_TRANSFER"],
    ["INACTIVE", "ISSUED"],
    ["ACTIVE", "RETIRED"],
    ["MERGED", "ISSUED"],
    ["", ""],
  ]) {
    assert.throws(() => mapRegistryPair(e, r), /unmapped registry pair/i, `guessed for ${e}/${r}`);
  }
});

test("the mapped pairs are exactly the three the capture actually contains", () => {
  assert.equal(GLEIF_PAIR_MAP.size, 3, "the map must not grow beyond what was captured");
  assert.deepEqual([...GLEIF_PAIR_MAP.keys()].sort(), [
    "ACTIVE|ISSUED",
    "ACTIVE|LAPSED",
    "INACTIVE|RETIRED",
  ]);
});

// ---- the capture re-verifies OFFLINE, by digest ------------------------------------------------

test("every captured record re-verifies against the frozen sha256 manifest", () => {
  const capture = loadGleifCapture();
  assert.equal(capture.records.length, 3);
  for (const r of capture.records) {
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
    assert.equal(r.digest_verified, true, `${r.lei} does not match its manifest digest`);
  }
});

test("a tampered record is REJECTED — the digest pin is not decorative", () => {
  assert.throws(
    () => loadGleifCapture({ tamperFirstRecordForTest: true }),
    /digest mismatch/i,
    "the capture loader accepted bytes that do not match the manifest"
  );
});

test("the loader performs NO network access — the lane is offline by construction", async () => {
  const src = await import("node:fs").then(({ readFileSync }) =>
    readFileSync(
      new URL(
        "../../../../tools/simurgh-attestation/stage5p/node/laneC1Gleif.mjs",
        import.meta.url
      ),
      "utf8"
    )
  );
  for (const forbidden of ["fetch(", "node:http", "node:https", "XMLHttpRequest", "axios"]) {
    assert.ok(!src.includes(forbidden), `Lane C1 must not reach the network: found ${forbidden}`);
  }
});

// ---- the three records drive the verifier -------------------------------------------------------

test("ISSUED — a current registration supports a durable continuity requirement", () => {
  const lei = "213800ERUMY5KWCIHJ87";
  const bundle = gleifEvidenceFor(lei, {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "durable",
    role: "unproven",
  });
  const r = verifySection2(bundle, GLEIF_PINNED);
  assert.equal(r.ok, true, `ISSUED record rejected: ${JSON.stringify(r)}`);
  assert.equal(rawCodeFor(r), VSI_OK_RAW);
});

test("LAPSED — the entity lives, the binding decayed, so durability is not met", () => {
  const lei = "213800Q7NV3T5PZOU403";
  const bundle = gleifEvidenceFor(lei, {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "durable",
    role: "unproven",
  });
  const r = verifySection2(bundle, GLEIF_PINNED);
  assert.equal(r.ok, false);
  assert.equal(r.check_id, "S2.C9");
  assert.equal(r.outcome, "identity_ephemeral_only");
  assert.equal(rawCodeFor(r), codeFor("identity_ephemeral_only"));
});

test("RETIRED — the subject ceased, and that is a DIFFERENT failure from mere decay", () => {
  const lei = "6488T70V0O9W2T3P0H24";
  const bundle = gleifEvidenceFor(lei, {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "durable",
    role: "unproven",
  });
  const r = verifySection2(bundle, GLEIF_PINNED);
  assert.equal(r.ok, false);
  assert.equal(r.check_id, "S2.C9");
  assert.equal(r.outcome, "identity_principal_ceased", "cessation must not be reported as decay");
  assert.equal(rawCodeFor(r), codeFor("identity_principal_ceased"));
});

test("the registry can NEVER launder its way to a role or a key binding", () => {
  // The whole T1 attack surface for a registry profile: it has continuity standing and no other.
  const lei = "213800ERUMY5KWCIHJ87";
  for (const overreach of [
    { axis: "role", value: "accountable_role_bound" },
    { axis: "binding", value: "cryptographically_bound" },
  ]) {
    const bundle = gleifEvidenceFor(lei, GLEIF_CEILING);
    // The delta the builder produced is FROZEN, so the attack has to construct a fresh vector —
    // which is the honest shape of the attack anyway: a hostile producer builds its own envelope.
    assert.throws(
      () => (bundle.evidences[0].asserted_strength_delta[overreach.axis] = overreach.value),
      TypeError,
      "a builder-produced delta must not be mutable in place"
    );
    bundle.evidences[0].asserted_strength_delta = {
      ...bundle.evidences[0].asserted_strength_delta,
      [overreach.axis]: overreach.value,
    };
    const r = verifySection2(bundle, GLEIF_PINNED);
    assert.equal(r.ok, false, `registry laundered ${overreach.axis}`);
    assert.equal(r.check_id, "S2.C7");
    assert.equal(r.outcome, "accountable_role_unproven");
    assert.equal(rawCodeFor(r), codeFor("accountable_role_unproven"));
  }
});

test("each LEI derives a DISTINCT canonical subject in the gleif namespace", () => {
  const ids = GLEIF_CAPTURE_LEIS.map((lei) => gleifEvidenceFor(lei, GLEIF_CEILING).subject);
  for (const s of ids) {
    assert.equal(s.namespace_id, GLEIF_NAMESPACE);
    assert.match(s.subject_id, /^[0-9a-f]{64}$/);
    assert.ok(!s.subject_id.startsWith("sha256:"), "bare hex only — no prefixed token");
  }
  assert.equal(new Set(ids.map((s) => s.subject_id)).size, 3, "two LEIs collided");
});

test("the profile id is the pinned one, and it is genuinely trusted in this lane", () => {
  assert.equal(GLEIF_PROFILE_ID, "gleif.lei.v1");
  assert.ok(GLEIF_PINNED.trusted_profile_ids.includes(GLEIF_PROFILE_ID));
  assert.ok(GLEIF_PINNED.registry.has(GLEIF_PROFILE_ID));
  // Not revoked — a live registry, unlike the synthetic revoked registrar in Lane A.
  assert.ok(!(GLEIF_PINNED.revoked_profile_ids ?? []).includes(GLEIF_PROFILE_ID));
});

test("what a registry grants never exceeds its declared ceiling, on any record", () => {
  for (const lei of GLEIF_CAPTURE_LEIS) {
    const bundle = gleifEvidenceFor(lei, GLEIF_CEILING);
    const asserted = bundle.evidences[0].asserted_strength_delta;
    assert.ok(leqV(asserted, GLEIF_CEILING), `${lei} asserts beyond the ceiling`);
  }
});
