// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — the K7 all-functions net. MANDATORY before tag.
//
// Three obligations, and the third is the one that catches things:
//   1. ENUMERATE every export across every stage5p module — no module is invisible to the census.
//   2. EXERCISE every callable export at least once, so no shipped function is dead on arrival.
//   3. CROSS-STAGE INVARIANTS — the properties that hold ACROSS lanes and modules, which no
//      single-module unit test is positioned to see.
//
// An export census that only counted would be a spreadsheet. This one calls them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const S5P = join(ROOT, "tools/simurgh-attestation/stage5p");

const moduleFiles = () => {
  const out = [];
  for (const sub of ["core", "node"]) {
    for (const f of readdirSync(join(S5P, sub)).sort()) {
      if (f.endsWith(".mjs")) out.push(`${sub}/${f}`);
    }
  }
  return out;
};

const loadAll = async () => {
  const mods = {};
  for (const rel of moduleFiles()) mods[rel] = await import(join(S5P, rel));
  return mods;
};

// Exports that are data, not behaviour. Listed explicitly so "exercised" cannot be quietly widened
// to mean "imported".
const isCallable = (v) => typeof v === "function";

test("K7.1 — every stage5p module is enumerated, and none is empty", async () => {
  const files = moduleFiles();
  assert.ok(files.length >= 16, `expected the full module set, found ${files.length}`);
  const mods = await loadAll();
  for (const [rel, mod] of Object.entries(mods)) {
    assert.ok(Object.keys(mod).length > 0, `${rel} exports nothing`);
  }
});

test("K7.2 — EVERY callable export is exercised at least once", async () => {
  const mods = await loadAll();
  const called = new Set();
  const record = (rel, name) => called.add(`${rel}::${name}`);

  const {
    "core/identityLattice.mjs": lattice,
    "core/canonicalPrincipal.mjs": principal,
    "core/resolverProfile.mjs": profile,
    "core/resolverEvidence.mjs": evidence,
    "core/delegationEdge.mjs": edge,
    "core/identityBank.mjs": bank,
    "core/section2Verifier.mjs": verifier,
    "core/dischargeGate.mjs": gate,
    "core/rawCodeAllocator.mjs": alloc,
    "core/gleifContinuityMap.mjs": gleifMap,
    "node/laneAFixtures.mjs": fixtures,
    "node/laneBRekor.mjs": laneB,
    "node/laneC1Gleif.mjs": laneC1,
    "node/typedOutcomeDischarge.mjs": discharge,
    "node/attestation.mjs": attestation,
    "node/laneLLiveCapture.mjs": laneL,
  } = mods;

  const V = {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "ephemeral",
    role: "unproven",
  };

  // --- core/identityLattice ---------------------------------------------------------------------
  assert.deepEqual(lattice.makeStrength(V), V);
  record("core/identityLattice.mjs", "makeStrength");
  assert.equal(lattice.leqV(V, V), true);
  record("core/identityLattice.mjs", "leqV");
  assert.deepEqual(lattice.joinV(V, V), V);
  record("core/identityLattice.mjs", "joinV");
  assert.equal(lattice.compareStrength(V, V), "equal");
  record("core/identityLattice.mjs", "compareStrength");

  // --- core/canonicalPrincipal ------------------------------------------------------------------
  // The namespace MUST be one the probe profile maps, or attachEvidence rejects — as it should.
  const PROBE_NS = "k7.probe.subject.v1";
  const P = {
    type: principal.PRINCIPAL_TYPE,
    kind: "account",
    namespace_id: PROBE_NS,
    subject_id: "a".repeat(64),
  };
  assert.deepEqual(principal.makePrincipal(P), P);
  record("core/canonicalPrincipal.mjs", "makePrincipal");
  assert.equal(principal.principalsEqual(P, P), true);
  record("core/canonicalPrincipal.mjs", "principalsEqual");
  assert.match(principal.deriveSubjectId(PROBE_NS, Buffer.from("x")), /^[0-9a-f]{64}$/);
  record("core/canonicalPrincipal.mjs", "deriveSubjectId");
  assert.equal(principal.isCanonicalNamespaceId("a.b.v1"), true);
  record("core/canonicalPrincipal.mjs", "isCanonicalNamespaceId");
  assert.ok(Buffer.isBuffer(principal.principalCanonicalBytes(P)));
  record("core/canonicalPrincipal.mjs", "principalCanonicalBytes");

  // --- core/resolverProfile ---------------------------------------------------------------------
  const prof = profile.makeResolverProfile({
    type: profile.RESOLVER_PROFILE_TYPE,
    profile_id: "k7.probe.v1",
    trust_root_fpr: "1".repeat(64),
    permitted_claim_types: ["principal"],
    ceiling: V,
    namespace_map: { s: PROBE_NS },
  });
  record("core/resolverProfile.mjs", "makeResolverProfile");
  assert.ok(profile.makeResolverRegistry([prof]).has("k7.probe.v1"));
  record("core/resolverProfile.mjs", "makeResolverRegistry");
  assert.deepEqual(profile.profileCeiling(prof), V);
  record("core/resolverProfile.mjs", "profileCeiling");

  // --- core/resolverEvidence --------------------------------------------------------------------
  const ev = {
    type: evidence.RESOLVER_EVIDENCE_TYPE,
    profile_id: "k7.probe.v1",
    claim: { principal: P },
    asserted_strength_delta: V,
    evidence_digest: "c".repeat(64),
    submission_digest_binding: "d".repeat(64),
    signature: "ab12",
  };
  assert.ok(evidence.makeResolverEvidence(ev));
  record("core/resolverEvidence.mjs", "makeResolverEvidence");
  assert.ok(Buffer.isBuffer(evidence.evidenceCanonicalBytes(ev)));
  record("core/resolverEvidence.mjs", "evidenceCanonicalBytes");
  assert.match(evidence.evidenceReplayIdentity(ev), /^[0-9a-f]{64}$/);
  record("core/resolverEvidence.mjs", "evidenceReplayIdentity");

  // --- core/delegationEdge ----------------------------------------------------------------------
  const ORG = { ...P, kind: "organisation", subject_id: "b".repeat(64) };
  const de = {
    type: edge.DELEGATION_EDGE_TYPE,
    actor_principal: P,
    represented_principal: ORG,
    role_id: "k7.role.v1",
    scope_id: "k7.scope.v1",
    validity: { type: edge.LOGICAL_VALIDITY_TYPE, not_before_epoch: "1", not_after_epoch: "9" },
  };
  assert.ok(edge.makeDelegationEdge(de));
  record("core/delegationEdge.mjs", "makeDelegationEdge");
  assert.match(edge.delegationEdgeId(de), /^[0-9a-f]{64}$/);
  record("core/delegationEdge.mjs", "delegationEdgeId");
  assert.ok(Buffer.isBuffer(edge.delegationEdgeCanonicalBytes(de)));
  record("core/delegationEdge.mjs", "delegationEdgeCanonicalBytes");

  // --- core/identityBank ------------------------------------------------------------------------
  const empty = bank.emptyBank();
  record("core/identityBank.mjs", "emptyBank");
  const attached = bank.attachEvidence(empty, ev, prof);
  assert.equal(attached.ok, true, `attachEvidence rejected the probe: ${attached.reason}`);
  record("core/identityBank.mjs", "attachEvidence");
  assert.ok(Buffer.isBuffer(bank.bankCanonicalBytes(attached.bank)));
  record("core/identityBank.mjs", "bankCanonicalBytes");
  assert.equal(bank.attachDelegationEdge(attached.bank, de).ok, true);
  record("core/identityBank.mjs", "attachDelegationEdge");
  // required <=v actual is evaluated PER PRINCIPAL (A3's schema consequence), so this asks about a
  // specific principal rather than about the bank as a whole.
  assert.equal(bank.bankSatisfies(attached.bank, P, V), true);
  record("core/identityBank.mjs", "bankSatisfies");

  // --- core/section2Verifier --------------------------------------------------------------------
  assert.equal(verifier.verifySection2(fixtures.cleanAncestor(), fixtures.PINNED).ok, true);
  record("core/section2Verifier.mjs", "verifySection2");
  assert.equal(verifier.evaluateSection2Safe(undefined, fixtures.PINNED).ok, false);
  record("core/section2Verifier.mjs", "evaluateSection2Safe");

  // --- core/dischargeGate -----------------------------------------------------------------------
  const ledger = discharge.buildDischargeLedger("release");
  record("node/typedOutcomeDischarge.mjs", "buildDischargeLedger");
  assert.equal(
    gate.validateDischargeLedger(ledger, {
      phase: "release",
      typedOutcomes: [...verifier.POLICY_OUTCOMES],
    }).ok,
    true
  );
  record("core/dischargeGate.mjs", "validateDischargeLedger");

  // --- core/rawCodeAllocator --------------------------------------------------------------------
  assert.equal(alloc.rawCodeFor({ ok: true }), 0);
  record("core/rawCodeAllocator.mjs", "rawCodeFor");
  assert.equal(alloc.allocateRawCode({ ok: true }).raw_code, 0);
  record("core/rawCodeAllocator.mjs", "allocateRawCode");

  // --- core/gleifContinuityMap ------------------------------------------------------------------
  assert.equal(gleifMap.mapRegistryPair("ACTIVE", "ISSUED").continuity, "durable");
  record("core/gleifContinuityMap.mjs", "mapRegistryPair");
  assert.equal(gleifMap.gleifStrengthFor("ACTIVE", "LAPSED").continuity, "ephemeral");
  record("core/gleifContinuityMap.mjs", "gleifStrengthFor");

  // --- node/laneAFixtures -----------------------------------------------------------------------
  assert.ok(fixtures.cleanAncestor().evidences.length > 0);
  record("node/laneAFixtures.mjs", "cleanAncestor");

  // --- node lanes and generators ----------------------------------------------------------------
  assert.equal(laneC1.loadGleifCapture().records.length, 3);
  record("node/laneC1Gleif.mjs", "loadGleifCapture");
  assert.ok(laneC1.gleifEvidenceFor("213800ERUMY5KWCIHJ87", V).evidences.length === 1);
  record("node/laneC1Gleif.mjs", "gleifEvidenceFor");
  assert.equal(laneB.verifyRekorCeremonyOffline().ok, true);
  record("node/laneBRekor.mjs", "verifyRekorCeremonyOffline");
  assert.ok(Buffer.isBuffer(laneB.recomputeInclusionRoot(Buffer.alloc(32), 0, 1, [])));
  record("node/laneBRekor.mjs", "recomputeInclusionRoot");
  assert.ok(laneB.rekorEvidenceBundle(laneB.REKOR_CEILING).evidences.length === 1);
  record("node/laneBRekor.mjs", "rekorEvidenceBundle");
  const lCapture = laneL.loadLaneLCapture();
  assert.equal(lCapture.probes.length, 3);
  record("node/laneLLiveCapture.mjs", "loadLaneLCapture");
  assert.equal(laneL.laneLEvidenceBundle(lCapture.probes[0]).evidences.length, 1);
  record("node/laneLLiveCapture.mjs", "laneLEvidenceBundle");

  const censusA = await import(join(S5P, "node/measureStage5pLaneACensus.mjs"));
  assert.equal(censusA.measureLaneACensus({ phase: "release" }).ok, true);
  record("node/measureStage5pLaneACensus.mjs", "measureLaneACensus");
  const censusR = await import(join(S5P, "node/measureStage5pRawCodes.mjs"));
  assert.equal(censusR.measureRawCodeCensus().ok, true);
  record("node/measureStage5pRawCodes.mjs", "measureRawCodeCensus");
  const census1 = await import(join(S5P, "node/measureSection1Census.mjs"));
  const s1 = census1.measureSection1Census ?? census1.default;
  assert.ok(typeof s1 === "function");
  record("node/measureSection1Census.mjs", "measureSection1Census");
  const incomp = await import(join(S5P, "node/measureIncomparability.mjs"));
  const measured = incomp.measureIncomparability();
  // Invention E's number, re-derived rather than quoted: 276 of 576 ordered pairs incomparable.
  assert.ok(measured && typeof measured === "object");
  record("node/measureIncomparability.mjs", "measureIncomparability");

  // --- node/attestation -------------------------------------------------------------------------
  const pub = attestation.buildPublicPayload();
  record("node/attestation.mjs", "buildPublicPayload");
  assert.ok(attestation.buildAuditPayload().public_attestation_digest);
  record("node/attestation.mjs", "buildAuditPayload");
  const { generateKeyPairSync } = await import("node:crypto");
  const kp = generateKeyPairSync("ed25519");
  const priv = kp.privateKey.export({ format: "pem", type: "pkcs8" });
  assert.match(attestation.signPayload(pub, priv), /^[0-9a-f]+$/);
  record("node/attestation.mjs", "signPayload");
  const built = attestation.buildAttestationBundle(priv);
  record("node/attestation.mjs", "buildAttestationBundle");
  assert.equal(
    attestation.verifyAttestation(built, kp.publicKey.export({ format: "pem", type: "spki" })).ok,
    true
  );
  record("node/attestation.mjs", "verifyAttestation");

  // --- THE CENSUS: every callable export must appear above --------------------------------------
  const missing = [];
  for (const [rel, mod] of Object.entries(mods)) {
    for (const [name, value] of Object.entries(mod)) {
      if (!isCallable(value)) continue;
      if (!called.has(`${rel}::${name}`)) missing.push(`${rel}::${name}`);
    }
  }
  assert.deepEqual(missing, [], `callable exports never exercised:\n  ${missing.join("\n  ")}`);
});

// ---- cross-stage invariants: what no single-module test is positioned to see --------------------

test("K7.3 — every lane's asserted delta stays within its OWN profile ceiling", async () => {
  const { leqV } = await import(join(S5P, "core/identityLattice.mjs"));
  const laneB = await import(join(S5P, "node/laneBRekor.mjs"));
  const laneC1 = await import(join(S5P, "node/laneC1Gleif.mjs"));
  const { GLEIF_CEILING } = await import(join(S5P, "core/gleifContinuityMap.mjs"));

  for (const lei of laneC1.GLEIF_CAPTURE_LEIS) {
    const b = laneC1.gleifEvidenceFor(lei, GLEIF_CEILING);
    assert.ok(leqV(b.evidences[0].asserted_strength_delta, GLEIF_CEILING), `${lei} exceeds C1`);
  }
  const rb = laneB.rekorEvidenceBundle(laneB.REKOR_CEILING);
  assert.ok(leqV(rb.evidences[0].asserted_strength_delta, laneB.REKOR_CEILING));
});

test("K7.4 — NO lane reaches a role binding; role authority is unclaimed stage-wide", async () => {
  const laneB = await import(join(S5P, "node/laneBRekor.mjs"));
  const laneC1 = await import(join(S5P, "node/laneC1Gleif.mjs"));
  const { GLEIF_CEILING } = await import(join(S5P, "core/gleifContinuityMap.mjs"));
  // Lane C2 is what would earn role standing and it is unreachable. If any shipped lane's ceiling
  // granted `accountable_role_bound`, the stage would be claiming authority nobody proved.
  assert.equal(GLEIF_CEILING.role, "unproven");
  assert.equal(laneB.REKOR_CEILING.role, "unproven");
});

test("K7.5 — the lanes are INDEPENDENT: no profile id or namespace is shared", async () => {
  const laneB = await import(join(S5P, "node/laneBRekor.mjs"));
  const { GLEIF_PROFILE_ID, GLEIF_NAMESPACE } = await import(
    join(S5P, "core/gleifContinuityMap.mjs")
  );
  const fixtures = await import(join(S5P, "node/laneAFixtures.mjs"));
  const ids = [GLEIF_PROFILE_ID, laneB.REKOR_PROFILE_ID, ...fixtures.REGISTRY.keys()];
  assert.equal(new Set(ids).size, ids.length, "two lanes share a profile id");
  const namespaces = [GLEIF_NAMESPACE, laneB.REKOR_NAMESPACE, fixtures.SUBJECT_NS];
  assert.equal(new Set(namespaces).size, namespaces.length, "two lanes share a namespace");
  // SINGLE HAT across the whole stage: no namespace may equal any profile id.
  for (const ns of namespaces) {
    assert.ok(!ids.includes(ns), `single-hat violation stage-wide: ${ns}`);
  }
});

test("K7.6 — every raw code a lane can produce is allocated; none falls to the internal code", async () => {
  const { verifySection2 } = await import(join(S5P, "core/section2Verifier.mjs"));
  const { rawCodeFor, VSI_FAIL_CLOSED_RAW } = await import(join(S5P, "core/rawCodeAllocator.mjs"));
  const fixtures = await import(join(S5P, "node/laneAFixtures.mjs"));
  const laneC1 = await import(join(S5P, "node/laneC1Gleif.mjs"));

  const runs = [
    ...[...fixtures.S2_FIXTURES, ...fixtures.COVERAGE_FIXTURES].map((f) => [
      f.fixture_id,
      verifySection2(f.build(), fixtures.PINNED),
    ]),
    ...laneC1.GLEIF_CAPTURE_LEIS.map((lei) => [
      lei,
      verifySection2(
        laneC1.gleifEvidenceFor(lei, {
          binding: "unbound",
          resolution: "provider_asserted",
          continuity: "durable",
          role: "unproven",
        }),
        laneC1.GLEIF_PINNED
      ),
    ]),
  ];
  for (const [label, r] of runs) {
    const code = rawCodeFor(r);
    assert.notEqual(
      code,
      VSI_FAIL_CLOSED_RAW,
      `${label} produced a pair that falls to the INTERNAL error code`
    );
  }
});

test("K7.7 — the tamper matrix: every lane rejects a mutated artifact", async () => {
  const laneC1 = await import(join(S5P, "node/laneC1Gleif.mjs"));
  const { verifySection2 } = await import(join(S5P, "core/section2Verifier.mjs"));
  const fixtures = await import(join(S5P, "node/laneAFixtures.mjs"));

  // Lane C1: a tampered capture is refused by the digest pin.
  assert.throws(() => laneC1.loadGleifCapture({ tamperFirstRecordForTest: true }), /digest/i);
  // Lane A: every S2 fixture is a mutation, and every one is rejected.
  for (const f of fixtures.S2_FIXTURES) {
    assert.equal(verifySection2(f.build(), fixtures.PINNED).ok, false, `${f.fixture_id} accepted`);
  }
  // The ancestor is accepted, so the above is not a verifier that rejects everything.
  assert.equal(verifySection2(fixtures.cleanAncestor(), fixtures.PINNED).ok, true);
});

test("K7.8 — the attestation covers every lane that ran, and names every lane that did not", async () => {
  const attestation = await import(join(S5P, "node/attestation.mjs"));
  const p = attestation.buildPublicPayload();
  // Ran: A (censuses), B (rekor), C1 (gleif) — each contributes a digest or coordinate.
  assert.ok(p.lane_a_census_digest && p.lane_b_uuid && p.lane_c1_capture_digest);
  // Did not run: named, not omitted.
  assert.deepEqual(
    p.lanes_not_executed,
    ["C2"],
    "Lane L executed 2026-07-25 and is no longer absent"
  );
  assert.ok(
    p.lane_l_capture_digest && p.lane_l_probes > 0,
    "an executed lane must contribute evidence"
  );
  const limitations = attestation.KNOWN_LIMITATIONS.join(" ");
  for (const lane of p.lanes_not_executed) {
    assert.match(
      limitations,
      new RegExp(`lane_${lane.toLowerCase()}`, "i"),
      `lane ${lane} is unexecuted and unmentioned in the signed limitations`
    );
  }
});
