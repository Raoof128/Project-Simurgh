// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §12.9 — the S12.* evidence matrix.
//
// Every row carries ONE defect and first-fails at ITS check. One row is deliberately AFFIRMATIVE:
// the Lane A dictionary attack passes as evidence of the signed non-claim, because demonstrating a
// declared limitation is evidence, not a verifier defect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  verifySection12Package,
  verifySection12View,
  evaluateSection12Safe,
  SECTION12_FIRST_FAILURE_ORDER,
  SECTION12_CHECK_IDS,
  LANES,
} from "../../../../tools/simurgh-attestation/stage5o/core/section12Verifier.mjs";
import { MANDATORY_SECTION_KEYS } from "../../../../tools/simurgh-attestation/stage5o/core/packageSubject.mjs";
import {
  deterministicSalt,
  sectionCommitment,
  buildView,
} from "../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { RAW_VERIFIER_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { makeSection12Fixture, laneBSalts } from "./section12Fixture.mjs";

const witnessed = new Set();
function expectReject(ctx, raw, reason, check) {
  const v = verifySection12Package(ctx, raw);
  assert.equal(v.accept, false, `expected reject for ${reason}`);
  assert.equal(v.reason, reason, `wrong reason (got ${v.reason})`);
  assert.equal(v.check, check, `${reason} must first-fail at check ${check}, got ${v.check}`);
  witnessed.add(reason);
}

test("S12.0 a positive six-section Lane A package ACCEPTS and yields a computed capsule root", () => {
  const f = makeSection12Fixture();
  const v = verifySection12Package(f.ctx, f.raw);
  assert.equal(v.accept, true, JSON.stringify(v));
  // The root is a STAGE 4T value in Stage 4T's own token encoding (`sha256:<hex>`), propagated
  // unchanged exactly as 148/149 are. Re-encoding it to Stage 5O bare hex would mint a rival
  // encoding for a construction A17 pins to `stage4t_package_adapter_profile`.
  assert.match(v.capsule_root, /^sha256:[0-9a-f]{64}$/);
  assert.equal(v.commitments.length, 6);
});

test("S12.0b a positive six-section Lane B package ACCEPTS", () => {
  const f = makeSection12Fixture({ lane: LANES.B, salts: laneBSalts() });
  assert.equal(verifySection12Package(f.ctx, f.raw).accept, true);
});

test("S12.1 transport oversize -> s12_package_transport_oversize (check 1)", () => {
  const f = makeSection12Fixture({ ceilings: { transport: 32, canonical: 32 } });
  expectReject(f.ctx, f.raw, "s12_package_transport_oversize", 1);
});

test("S12.2 non-canonical bytes -> s12_noncanonical (check 2)", () => {
  const f = makeSection12Fixture();
  expectReject(f.ctx, f.raw + " ", "s12_noncanonical", 2);
});

test("S12.3 canonical oversize -> s12_package_canonical_oversize (check 3)", () => {
  const f = makeSection12Fixture({ ceilings: { transport: 1 << 20, canonical: 64 } });
  expectReject(f.ctx, f.raw, "s12_package_canonical_oversize", 3);
});

test("S12.4 a forged ACCEPT receipt -> s12_package_shape (check 4)", () => {
  const f = makeSection12Fixture();
  const pkg = JSON.parse(f.raw);
  const r = pkg.sections.find((s) => s.key === "stage5o/verifier_receipts");
  r.payload.receipts.section8.verdict = "REJECT";
  r.payload.receipts.section8.raw_code = 431;
  expectReject(f.ctx, canonicalJson(pkg), "s12_package_shape", 4);
});

test("S12.5 missing census_closure -> s12_section_registry_mismatch (check 5)", () => {
  const f = makeSection12Fixture();
  const pkg = JSON.parse(f.raw);
  pkg.sections = pkg.sections.filter((s) => s.key !== "stage5o/census_closure");
  delete pkg.salts["stage5o/census_closure"];
  expectReject(f.ctx, canonicalJson(pkg), "s12_section_registry_mismatch", 5);
});

test("S12.5b a spare narrative section -> s12_section_registry_mismatch (check 5)", () => {
  const f = makeSection12Fixture();
  const pkg = JSON.parse(f.raw);
  pkg.sections.push({ key: "stage5o/narrative", payload: { ...f.subjectFields } });
  pkg.salts["stage5o/narrative"] = deterministicSalt("stage5o/narrative");
  expectReject(f.ctx, canonicalJson(pkg), "s12_section_registry_mismatch", 5);
});

test("S12.6 challenge/opening MIX-AND-MATCH -> s12_challenge_binding_mismatch (check 6)", () => {
  const f = makeSection12Fixture();
  const pkg = JSON.parse(f.raw);
  const openings = pkg.sections.find((s) => s.key === "stage5o/openings");
  // individually valid, but from another run: a different accepted challenge record
  openings.payload.challenge_record_digest = "9".repeat(64);
  expectReject(f.ctx, canonicalJson(pkg), "s12_challenge_binding_mismatch", 6);
});

test("S12.6b a probability claim for another N or k -> s12_challenge_binding_mismatch (check 6)", () => {
  const f = makeSection12Fixture();
  const pkg = JSON.parse(f.raw);
  const claim = pkg.sections.find((s) => s.key === "stage5o/probability_claim");
  claim.payload.challenge_subject_digest = "7".repeat(64); // another accepted subject
  expectReject(f.ctx, canonicalJson(pkg), "s12_challenge_binding_mismatch", 6);
});

test("S12.7 Lane A salts declared as Lane B -> s12_lane_declaration_invalid (check 7)", () => {
  const f = makeSection12Fixture();
  const pkg = JSON.parse(f.raw);
  pkg.lane = LANES.B; // salts are still the deterministic profile
  expectReject(f.ctx, canonicalJson(pkg), "s12_lane_declaration_invalid", 7);
});

test("S12.7b duplicate Lane B salts -> s12_lane_declaration_invalid (check 7)", () => {
  const salts = laneBSalts();
  salts["stage5o/openings"] = salts["stage5o/challenge"]; // reused, so not independent
  const f = makeSection12Fixture({ lane: LANES.B, salts });
  expectReject(f.ctx, f.raw, "s12_lane_declaration_invalid", 7);
});

test("S12.7c one deterministic salt inside a Lane B package -> check 7", () => {
  const salts = laneBSalts();
  salts["stage5o/openings"] = deterministicSalt("stage5o/openings");
  const f = makeSection12Fixture({ lane: LANES.B, salts });
  expectReject(f.ctx, f.raw, "s12_lane_declaration_invalid", 7);
});

test("S12.7d wrong salt width -> s12_lane_declaration_invalid (check 7)", () => {
  const salts = laneBSalts();
  salts["stage5o/openings"] = "abcd";
  const f = makeSection12Fixture({ lane: LANES.B, salts });
  expectReject(f.ctx, f.raw, "s12_lane_declaration_invalid", 7);
});

test("§12.8 a view mutating a disclosed section propagates Stage 4T's 148 UNCHANGED", () => {
  const f = makeSection12Fixture({ lane: LANES.B, salts: laneBSalts() });
  const accepted = verifySection12Package(f.ctx, f.raw);
  const capsule = { projected_sections: f.projectedSections };
  const view = buildView(capsule, "auditor", ["stage5o/openings"], f.salts);
  view.disclosed[0].section = { ...view.disclosed[0].section, tampered: true };
  const out = verifySection12View(f.ctx, f.raw, view);
  assert.equal(out.raw, 148, "4T's code must propagate with no alias");
  assert.equal(out.reason, "view_inconsistent_with_capsule");
  assert.ok(accepted.accept);
});

test("§12.8 a view omitting a section without declaring the redaction propagates 149", () => {
  const f = makeSection12Fixture({ lane: LANES.B, salts: laneBSalts() });
  const capsule = { projected_sections: f.projectedSections };
  const view = buildView(capsule, "auditor", ["stage5o/openings"], f.salts);
  view.redactions = { count: 0, keys: [], commitments: [] }; // omission now undeclared
  const out = verifySection12View(f.ctx, f.raw, view);
  assert.equal(out.raw, 149);
  assert.equal(out.reason, "redaction_undeclared");
});

test("§12.8 a genuinely redacted Lane B view VERIFIES", () => {
  const f = makeSection12Fixture({ lane: LANES.B, salts: laneBSalts() });
  const capsule = { projected_sections: f.projectedSections };
  const view = buildView(capsule, "public", ["stage5o/openings"], f.salts);
  const out = verifySection12View(f.ctx, f.raw, view);
  assert.equal(out.accept, true, JSON.stringify(out));
  // the redacted section discloses a commitment and nothing else — no value, no salt
  assert.equal(view.redactions.keys.length, 1);
  assert.ok(!JSON.stringify(view.redactions).includes(f.salts["stage5o/openings"]));
});

test("§12.1 LANE A DICTIONARY ATTACK — passes as EVIDENCE of the signed non-claim", () => {
  // not_proof_of_redacted_section_confidentiality_in_lane_a
  const f = makeSection12Fixture(); // Lane A: deterministic salts
  const key = "stage5o/openings";
  const capsule = { projected_sections: f.projectedSections };
  const view = buildView(capsule, "public", [key], f.salts);
  const redactedCommitment = view.redactions.commitments[0];

  // An attacker who can GUESS the content recomputes the public salt and confirms the guess.
  const guess = f.projectedSections.find((s) => `${s.regime}/${s.section_id}` === key);
  const publicSalt = deterministicSalt(key); // derivable by anyone: a function of a public key
  assert.equal(publicSalt, f.salts[key], "Lane A salt is publicly derivable");
  assert.equal(
    sectionCommitment(guess, publicSalt),
    redactedCommitment,
    "Lane A redaction hides NOTHING from a guesser — this is the declared limitation"
  );

  // The same guess against a Lane B salt does NOT confirm, which is the whole of Lane B's value.
  const bSalts = laneBSalts();
  assert.notEqual(sectionCommitment(guess, bSalts[key]), redactedCommitment);
});

test("matrix: every one of the seven §12 reasons has a live witness", () => {
  assert.deepEqual(
    [...witnessed].sort(),
    [...SECTION12_FIRST_FAILURE_ORDER].sort(),
    "some ruled reason has no fixture"
  );
  assert.equal(SECTION12_FIRST_FAILURE_ORDER.length, SECTION12_CHECK_IDS.length);
});

test("safe wrapper: raw 29 only for an unexpected throw, never for invalid evidence", () => {
  const f = makeSection12Fixture();
  const bad = evaluateSection12Safe({ not: "a context" }, f.raw);
  assert.equal(bad.raw, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED);
  const hostile = evaluateSection12Safe(f.ctx, f.raw + " ");
  assert.equal(hostile.reason, "s12_noncanonical", "hostile evidence stays symbolic");
  assert.equal(hostile.raw, undefined);
});

test("§12.6 the lane enum has exactly two values; a fixture class is not a lane", () => {
  const f = makeSection12Fixture();
  const pkg = JSON.parse(f.raw);
  pkg.lane = "dishonest_producer_fixture";
  expectReject(f.ctx, canonicalJson(pkg), "s12_lane_declaration_invalid", 7);
  assert.deepEqual(Object.values(LANES).sort(), [
    "lane_a_deterministic_fixture",
    "lane_b_random_ceremony",
  ]);
  assert.equal(MANDATORY_SECTION_KEYS.length, 6);
  assert.ok(createHash && randomBytes);
});
