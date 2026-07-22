// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §12.2/§12.3 — the six-section registry and the cross-section package subject.
//
// "No Assembled Stranger": six individually valid artifacts that belong to different runs are a
// REJECTED package, not a package with a caveat. The subject is RECOMPUTED from each section's own
// payload — copying one digest into six sections and comparing the copies would bind six producer
// declarations to one another rather than six payloads to one accepted event.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PACKAGE_SUBJECT_DOMAIN,
  MANDATORY_SECTION_KEYS,
  packageSubjectDigest,
  projectSectionSubject,
  registryVerdict,
} from "../../../../tools/simurgh-attestation/stage5o/core/packageSubject.mjs";

const SUBJ = {
  stage5o_precommitment_digest: "a".repeat(64),
  closure_slot_id: "slot-0001",
  challenge_subject_digest: "b".repeat(64),
  challenge_record_digest: "c".repeat(64),
};

test("§12.2 the mandatory registry is exactly six uniquely-keyed sections", () => {
  assert.deepEqual(MANDATORY_SECTION_KEYS, [
    "stage5o/census_closure",
    "stage5o/challenge",
    "stage5o/openings",
    "stage5o/disclosure_ledger",
    "stage5o/probability_claim",
    "stage5o/verifier_receipts",
  ]);
  assert.equal(new Set(MANDATORY_SECTION_KEYS).size, 6, "keys must be unique");
  // the census closure is the §6/A17 keyed section and is MANDATORY, not carried indirectly
  assert.ok(MANDATORY_SECTION_KEYS.includes("stage5o/census_closure"));
});

test("§12.2 exact-set semantics: missing, spare, duplicate and unknown all reject", () => {
  const ok = MANDATORY_SECTION_KEYS.map((k) => ({ key: k }));
  assert.equal(registryVerdict(ok).ok, true);

  const missing = ok.filter((s) => s.key !== "stage5o/census_closure");
  assert.equal(registryVerdict(missing).ok, false);
  assert.equal(registryVerdict(missing).detail, "missing");

  const spare = [...ok, { key: "stage5o/narrative" }];
  assert.equal(registryVerdict(spare).ok, false);
  assert.equal(registryVerdict(spare).detail, "spare", "a narrative section is a SPARE key");

  const dup = [...ok, { key: "stage5o/openings" }];
  assert.equal(registryVerdict(dup).ok, false);
  assert.equal(registryVerdict(dup).detail, "duplicate");

  const unknown = ok.map((s) => (s.key === "stage5o/openings" ? { key: "stage5o/vibes" } : s));
  assert.equal(registryVerdict(unknown).ok, false);
});

test("§12.3 the subject is domain-separated and moves with every one of its four inputs", () => {
  assert.equal(PACKAGE_SUBJECT_DOMAIN, "simurgh.vsc.presented_evidence_package_subject.v1");
  const base = packageSubjectDigest(SUBJ);
  assert.match(base, /^[0-9a-f]{64}$/);
  assert.equal(packageSubjectDigest({ ...SUBJ }), base, "stable");
  for (const field of Object.keys(SUBJ)) {
    const mutated = { ...SUBJ, [field]: field.endsWith("_id") ? "slot-9999" : "d".repeat(64) };
    assert.notEqual(packageSubjectDigest(mutated), base, `${field} must move the subject`);
  }
});

test("§12.3 each section PROJECTS the subject from its own payload, not from a copied field", () => {
  const authoritative = packageSubjectDigest(SUBJ);
  // A section whose payload genuinely carries the accepted-run identifiers projects correctly.
  const good = { key: "stage5o/openings", payload: { ...SUBJ, opening_count: 8 } };
  assert.equal(projectSectionSubject(good), authoritative);

  // A section from ANOTHER run projects to a different subject even though it is internally valid.
  const otherRun = {
    key: "stage5o/openings",
    payload: { ...SUBJ, challenge_record_digest: "9".repeat(64), opening_count: 8 },
  };
  assert.notEqual(projectSectionSubject(otherRun), authoritative);

  // A section that merely ASSERTS the subject without carrying the identifiers cannot project it.
  const declared = { key: "stage5o/openings", payload: { package_subject_digest: authoritative } };
  assert.notEqual(
    projectSectionSubject(declared),
    authoritative,
    "a copied declaration must not satisfy the binding"
  );
});

test("§12.3 the mix-and-match attack: challenge from run A, openings from run B", () => {
  const runA = SUBJ;
  const runB = { ...SUBJ, challenge_record_digest: "e".repeat(64) };
  const sections = [
    { key: "stage5o/challenge", payload: { ...runA } },
    { key: "stage5o/openings", payload: { ...runB } },
  ];
  const subjects = sections.map(projectSectionSubject);
  assert.notEqual(subjects[0], subjects[1], "the two runs must not agree");
  assert.equal(new Set(subjects).size, 2, "a mixed package has more than one subject");
});
