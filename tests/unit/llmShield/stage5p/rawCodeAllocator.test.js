// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Annex R — the sole raw-code allocator.
//
// Expectations transcribed from the SPEC's Annex R table, not read off the implementation. The
// numbers below are written out literally on purpose: a test that derived them from the allocator
// would agree with any allocation, including a wrong one.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VSI_ALLOCATION,
  VSI_CLOSED_BAND,
  VSI_AMENDMENT_BAND,
  VSI_ALLOCATED_HI,
  VSI_PAIR_ALIASES,
  VSI_BAND_LO,
  VSI_BAND_HI,
  VSI_OK_RAW,
  VSI_FAIL_CLOSED_RAW,
  rawCodeFor,
  allocateRawCode,
} from "../../../../tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs";
import {
  SECTION2_CHECK_IDS,
  POLICY_OUTCOMES,
  verifySection2,
  evaluateSection2Safe,
} from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import {
  S2_FIXTURES,
  COVERAGE_FIXTURES,
  cleanAncestor,
  PINNED,
} from "../../../../tools/simurgh-attestation/stage5p/node/laneAFixtures.mjs";
import {
  RAW_VERIFIER_CODES,
  VSI_RAW_CODES,
  VSI_CHECK_ORDER,
  VSI_AMENDMENT_CODES,
  VSI_WRAPPER,
  VSI_RESERVED_FROM,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

// Annex R.1, transcribed.
const ANNEX_R = [
  [464, "S2.C2", "resolver_binding_invalid"],
  [465, "S2.C3", "identity_provider_untrusted"],
  [466, "S2.C4", "identity_replay_upgrade_attempted"],
  [467, "S2.C5", "identity_principal_mismatch"],
  [468, "S2.C6", "identity_claim_mismatch"],
  [469, "S2.C7", "accountable_role_unproven"],
  [470, "S2.C8", "identity_unresolved"],
  [471, "S2.C8", "identity_strength_incomparable"],
  [472, "S2.C9", "identity_ephemeral_only"],
];

// A5.4, transcribed. Append-only, ordered by MINT sequence — NOT by check order.
const A5_BAND = [
  [473, "S2.C3", "resolver_profile_revoked"],
  [474, "S2.C9", "identity_principal_ceased"],
];

test("the CLOSED band is byte-for-byte what Annex R froze — an amendment never moves it", () => {
  assert.deepEqual(
    VSI_CLOSED_BAND.map((r) => [r.raw_code, r.check_id, r.policy_outcome]),
    ANNEX_R
  );
  assert.equal(VSI_BAND_LO, 464);
  assert.equal(VSI_BAND_HI, 472);
});

test("the AMENDMENT band matches A5.4, and every row names the amendment that minted it", () => {
  assert.deepEqual(
    VSI_AMENDMENT_BAND.map((r) => [r.raw_code, r.check_id, r.policy_outcome]),
    A5_BAND
  );
  for (const r of VSI_AMENDMENT_BAND) {
    assert.equal(r.minted_by, "A5", "an unattributed code cannot be traced back to a ruling");
    assert.ok(r.raw_code > VSI_BAND_HI, "an amendment must append, never intrude");
  }
  assert.equal(VSI_ALLOCATED_HI, 474);
});

test("the full allocation is the closed band followed by the amendment band", () => {
  assert.deepEqual(
    VSI_ALLOCATION.map((r) => [r.raw_code, r.check_id, r.policy_outcome]),
    [...ANNEX_R, ...A5_BAND]
  );
});

test("all nine frozen outcomes appear exactly once — no omission, no duplicate", () => {
  const seen = VSI_ALLOCATION.map((r) => r.policy_outcome);
  assert.equal(seen.length, POLICY_OUTCOMES.length);
  assert.deepEqual([...seen].sort(), [...POLICY_OUTCOMES].sort());
  assert.equal(new Set(seen).size, seen.length, "an outcome is allocated twice");
});

test("codes are unique and contiguous across BOTH segments, with nothing outside them", () => {
  const codes = VSI_ALLOCATION.map((r) => r.raw_code);
  assert.equal(new Set(codes).size, codes.length, "a code is allocated twice");
  // Appending leaves no gap: contiguity still holds end to end.
  assert.deepEqual(
    codes,
    Array.from({ length: VSI_ALLOCATED_HI - VSI_BAND_LO + 1 }, (_, i) => VSI_BAND_LO + i)
  );
});

test("the CLOSED band follows frozen check order; the amendment band follows MINT order", () => {
  const closed = VSI_CLOSED_BAND.map((r) => SECTION2_CHECK_IDS.indexOf(r.check_id));
  assert.ok(
    closed.every((n) => n >= 0),
    "an allocated check id is not in the frozen order"
  );
  assert.deepEqual(
    closed,
    [...closed].sort((a, b) => a - b),
    "closed band contradicts check order"
  );

  // The amendment band is deliberately NOT globally check-ordered, and asserting that it were would
  // assert something false: 473 sits at S2.C3, numerically above 472's S2.C9. That IS "existing
  // codes never move" — past the first amendment, numeric adjacency stops tracking check order.
  const amended = VSI_AMENDMENT_BAND.map((r) => SECTION2_CHECK_IDS.indexOf(r.check_id));
  assert.ok(
    amended.every((n) => n >= 0),
    "an amended check id is not in the frozen order"
  );
  assert.ok(
    amended[0] < closed[closed.length - 1],
    "PREMISE: 473 must genuinely be out of global check order, or this test proves nothing"
  );
});

test("within S2.C8 the SPECIFIC unresolved condition precedes the GENERAL incomparable relation", () => {
  const c8 = VSI_ALLOCATION.filter((r) => r.check_id === "S2.C8");
  assert.equal(c8.length, 2, "PREMISE FAILED: S2.C8 no longer carries two outcomes");
  assert.deepEqual(
    c8.map((r) => r.policy_outcome),
    ["identity_unresolved", "identity_strength_incomparable"]
  );
  assert.ok(c8[0].raw_code < c8[1].raw_code);
});

test("success is raw 0, and 0 is not a member of the band", () => {
  assert.equal(VSI_OK_RAW, 0);
  assert.ok(!VSI_ALLOCATION.some((r) => r.raw_code === 0));
  assert.equal(allocateRawCode(verifySection2(cleanAncestor(), PINNED)).raw_code, 0);
});

// ---- executed agreement: the allocator is checked against RUNS, not against declarations --------

test("every Lane A fixture's EXECUTED symbolic result maps to its Annex R raw code", () => {
  const expected = new Map(
    [...ANNEX_R, ...A5_BAND].map(([code, check, outcome]) => [`${check}|${outcome}`, code])
  );
  // PREMISE: the ancestor is accepted, so each rejection below is caused by the fixture's defect.
  assert.equal(verifySection2(cleanAncestor(), PINNED).ok, true, "PREMISE FAILED");

  for (const f of [...S2_FIXTURES, ...COVERAGE_FIXTURES]) {
    const r = verifySection2(f.build(), PINNED);
    assert.equal(r.ok, false, `${f.fixture_id} must be rejected`);
    const key = `${r.check_id}|${r.outcome}`;
    assert.ok(expected.has(key), `${f.fixture_id} produced an unallocated pair ${key}`);
    assert.equal(
      rawCodeFor(r),
      expected.get(key),
      `${f.fixture_id} (${key}) mapped to the wrong raw code`
    );
    assert.equal(allocateRawCode(r).raw_code, expected.get(key));
  }
});

test("the outer wrapper attaches a code without disturbing the symbolic result", () => {
  const r = verifySection2(S2_FIXTURES[0].build(), PINNED);
  const wrapped = allocateRawCode(r);
  assert.equal(wrapped.check_id, r.check_id);
  assert.equal(wrapped.outcome, r.outcome);
  assert.equal(wrapped.ok, false);
  assert.equal(typeof wrapped.raw_code, "number");
});

// ---- fail closed, never guess ------------------------------------------------------------------

test("an unknown, missing or contradictory symbol fails closed to the shared internal code", () => {
  assert.equal(VSI_FAIL_CLOSED_RAW, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED);
  assert.equal(VSI_FAIL_CLOSED_RAW, 29);

  const hostile = [
    undefined,
    null,
    42,
    "S2.C2",
    {},
    { ok: false },
    { ok: false, check_id: "S2.C2" },
    { ok: false, outcome: "resolver_binding_invalid" },
    { ok: false, check_id: "S2.C99", outcome: "resolver_binding_invalid" },
    { ok: false, check_id: "S2.C2", outcome: "identity_vibes_acceptable" },
    // CONTRADICTORY: both symbols are real, but this pair was never allocated.
    { ok: false, check_id: "S2.C2", outcome: "identity_ephemeral_only" },
  ];
  for (const h of hostile) {
    assert.equal(rawCodeFor(h), VSI_FAIL_CLOSED_RAW, `guessed for ${JSON.stringify(h)}`);
    // Never guess the nearest band member.
    assert.ok(rawCodeFor(h) < VSI_BAND_LO || rawCodeFor(h) > VSI_BAND_HI);
  }
});

test("the fail-closed verifier wrapper composes with the allocator without throwing", () => {
  for (const hostile of [undefined, null, 42, "bundle", [], { evidences: [null] }]) {
    const wrapped = allocateRawCode(evaluateSection2Safe(hostile, PINNED));
    assert.equal(wrapped.ok, false);
    // A malformed SUBMISSION is an ordinary typed rejection, not an internal defect. It must land
    // inside the band — routing it to 29 would blame the verifier for the caller's input.
    assert.notEqual(
      wrapped.raw_code,
      VSI_FAIL_CLOSED_RAW,
      "a caller's bad input was reported as our internal error"
    );
    assert.ok(VSI_ALLOCATION.some((r) => r.raw_code === wrapped.raw_code));
  }
});

// ---- declared aliases: one code per OUTCOME, across every emission site ------------------------

test("aliases mint nothing — each points at a code the band already allocated", () => {
  const allocated = new Set(VSI_ALLOCATION.map((r) => r.raw_code));
  for (const a of VSI_PAIR_ALIASES) {
    assert.ok(allocated.has(a.raw_code), `alias ${a.check_id} invented code ${a.raw_code}`);
    const owner = VSI_ALLOCATION.find((r) => r.raw_code === a.raw_code);
    assert.equal(
      owner.policy_outcome,
      a.policy_outcome,
      "an alias may add a CHECK site, never re-point a code at a different outcome"
    );
    assert.notEqual(owner.check_id, a.check_id, "an alias duplicating the allocated site is noise");
  }
});

test("identity_unresolved reports 470 at ALL THREE of its emission sites", () => {
  for (const check_id of ["S2.C1", "S2.C8", "S2.C9"]) {
    assert.equal(
      rawCodeFor({ ok: false, check_id, outcome: "identity_unresolved" }),
      470,
      `${check_id} does not report the allocated code for identity_unresolved`
    );
  }
});

test("an alias does NOT weaken contradiction detection", () => {
  // S2.C9 emits identity_unresolved (aliased) and identity_ephemeral_only (allocated) — but
  // S2.C9 paired with any OTHER real outcome is still contradictory.
  for (const outcome of [
    "resolver_binding_invalid",
    "identity_provider_untrusted",
    "accountable_role_unproven",
  ]) {
    assert.equal(rawCodeFor({ ok: false, check_id: "S2.C9", outcome }), VSI_FAIL_CLOSED_RAW);
  }
  // ...and S2.C1 is aliased for identity_unresolved ONLY.
  assert.equal(
    rawCodeFor({ ok: false, check_id: "S2.C1", outcome: "identity_strength_incomparable" }),
    VSI_FAIL_CLOSED_RAW
  );
});

// ---- the repo registry and the allocator may never disagree ------------------------------------

test("the repo-wide registry agrees with the allocator on every single code", () => {
  const fromRegistry = Object.entries(VSI_RAW_CODES)
    .filter(([k]) => k !== "OK")
    .map(([k, v]) => [k.toLowerCase(), v])
    .sort((a, b) => a[1] - b[1]);
  assert.deepEqual(
    fromRegistry,
    VSI_ALLOCATION.map((r) => [r.policy_outcome, r.raw_code])
  );
  assert.equal(VSI_RAW_CODES.OK, 0);
  // VSI_CHECK_ORDER is the CLOSED band's first-failure spine ONLY. The amendment band has no check
  // order to express, so extending that array would assert something untrue about 473/474.
  assert.deepEqual(
    [...VSI_CHECK_ORDER],
    VSI_CLOSED_BAND.map((r) => r.raw_code)
  );
  assert.deepEqual(
    [...VSI_AMENDMENT_CODES],
    VSI_AMENDMENT_BAND.map((r) => r.raw_code)
  );
  assert.equal(VSI_WRAPPER, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED);
});

test("allocation is CLOSED after 474 — the next outcome needs an amendment, not a gap-fill", () => {
  assert.equal(VSI_RESERVED_FROM, 475);
  assert.equal(VSI_RESERVED_FROM, VSI_ALLOCATED_HI + 1);
  for (const r of VSI_ALLOCATION) assert.ok(r.raw_code < VSI_RESERVED_FROM);
});

// ---- Law 1 still holds at the numbering layer --------------------------------------------------

test("allocating codes did NOT smuggle in a score — no numeric strength export exists", async () => {
  const modules = [
    "core/identityLattice.mjs",
    "core/rawCodeAllocator.mjs",
    "core/section2Verifier.mjs",
    "core/identityBank.mjs",
  ];
  for (const m of modules) {
    const mod = await import(`../../../../tools/simurgh-attestation/stage5p/${m}`);
    for (const name of Object.keys(mod)) {
      assert.doesNotMatch(
        name,
        /score|rank|level|overall|weight|numeric|magnitude/i,
        `${m} exports "${name}" — Law 1 forbids an ordering number escaping`
      );
    }
  }
  // A raw code is an identifier for a REJECTION, never a position on any axis.
  assert.ok(!VSI_ALLOCATION.some((r) => "strength" in r || "position" in r || "rank" in r));
});
