// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 8 — the two policy blocks, deliberately not one.
//
// §3.3 keeps them apart because they authorise different propositions. The quorum policy governs a
// CI-gated lane and its refusals carry raw codes; the corroboration policy governs Lane C, which is
// never CI-gated, so its refusals carry NO raw code and surface as a status instead. That asymmetry
// is the whole ruling, and this file checks it against the allocator rather than against prose: for
// every corroboration refusal `codeFor` must return null, and for every quorum refusal it must
// return a code inside the witness-policy band.
//
// RULING 3: THE VALIDATORS RETURN VALIDITY ONLY. Deriving `external_corroboration_status` here would
// couple a status to a validator and let a malformed Lane C block become a verifier refusal. The
// statuses are computed in Task 13, from five separate functions in five separate files.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXTERNAL_ANCHOR_CLASS,
  WITNESS_OPERATOR_CLASS,
} from "../../../../tools/simurgh-attestation/stage5s/core/classes.mjs";
import {
  CORROBORATION_POLICY_REFUSALS,
  QUORUM_POLICY_REFUSALS,
  validateExternalCorroborationPolicy,
  validateWitnessQuorumPolicy,
} from "../../../../tools/simurgh-attestation/stage5s/core/policy.mjs";
import { codeFor } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";

const SRC = "tools/simurgh-attestation/stage5s/core/policy.mjs";

const quorumPolicy = (over = {}) => ({
  threshold_q: 2,
  witness_roster: [
    { witness_identity: "w-a", key_digest: "sha256:aa", witness_operator_class: "unresolved" },
    { witness_identity: "w-b", key_digest: "sha256:bb", witness_operator_class: "unresolved" },
    {
      witness_identity: "w-c",
      key_digest: "sha256:cc",
      witness_operator_class: "same_operator_distinct_key",
    },
  ],
  required_class_mix: { unresolved: 1 },
  ...over,
});

const corroborationPolicy = (over = {}) => ({
  minimum_distinct_mechanisms: 2,
  permitted_ecology_classes: ["rfc3161", "rekor", "bitcoin_ots"],
  required_envelope_digest: "sha256:ee",
  freshness_and_inclusion_requirements: { inclusion_proof: "required" },
  ...over,
});

const reasons = (r) => r.refusals.map((x) => x.reason);

// ---------------------------------------------------------------- the quorum lane

test("[5s-t8] a well-formed witness_quorum_policy validates", () => {
  const r = validateWitnessQuorumPolicy(quorumPolicy());
  assert.deepEqual(r, { ok: true, refusals: [] });
});

test("[5s-t8] an absent quorum policy is NOT_COMMITTED, never silently defaulted", () => {
  for (const absent of [undefined, null, "", 7, []]) {
    const r = validateWitnessQuorumPolicy(absent);
    assert.equal(r.ok, false);
    assert.deepEqual(reasons(r), [QUORUM_POLICY_REFUSALS.NOT_COMMITTED]);
  }
});

test("[5s-t8] threshold_q must be a positive integer no larger than the roster", () => {
  for (const bad of [0, -1, 1.5, "2", null, 4]) {
    const r = validateWitnessQuorumPolicy(quorumPolicy({ threshold_q: bad }));
    assert.equal(r.ok, false, `threshold_q ${JSON.stringify(bad)} was accepted`);
    assert.ok(reasons(r).includes(QUORUM_POLICY_REFUSALS.MALFORMED_OR_ROSTER_INVALID));
  }
});

test("[5s-t8] a roster with a duplicate identity or a shared key digest is invalid", () => {
  const dupIdentity = quorumPolicy();
  dupIdentity.witness_roster[1].witness_identity = "w-a";
  assert.equal(validateWitnessQuorumPolicy(dupIdentity).ok, false);

  const sharedKey = quorumPolicy();
  sharedKey.witness_roster[1].key_digest = "sha256:aa";
  assert.equal(validateWitnessQuorumPolicy(sharedKey).ok, false);
});

test("[5s-t8] a roster entry carrying an unknown operator class is invalid", () => {
  const p = quorumPolicy();
  p.witness_roster[0].witness_operator_class = "trusted_partner";
  assert.equal(validateWitnessQuorumPolicy(p).ok, false);
});

test("[5s-t8] an ANCHOR class inside required_class_mix is refused WITH a raw code", () => {
  // The machine-checked form of §3.1: the quorum lane is CI-gated, so laundering an anchor into it
  // is a structural malformation and takes 485 — not a status, not a warning.
  for (const anchor of EXTERNAL_ANCHOR_CLASS) {
    const r = validateWitnessQuorumPolicy(quorumPolicy({ required_class_mix: { [anchor]: 1 } }));
    assert.equal(r.ok, false, `${anchor} was accepted as a witness class`);
    assert.ok(reasons(r).includes(QUORUM_POLICY_REFUSALS.MALFORMED_OR_ROSTER_INVALID));
    assert.ok(
      r.refusals.some((x) => /taxonom/i.test(x.detail ?? "")),
      "the refusal did not say the taxonomy was crossed"
    );
  }
});

test("[5s-t8] a required class mix that cannot fit inside threshold_q is unsatisfiable", () => {
  const r = validateWitnessQuorumPolicy(
    quorumPolicy({
      threshold_q: 2,
      required_class_mix: { unresolved: 2, same_operator_distinct_key: 1 },
    })
  );
  assert.equal(r.ok, false);
});

test("[5s-t8] every class of the witness taxonomy is accepted in the mix", () => {
  for (const cls of WITNESS_OPERATOR_CLASS) {
    const r = validateWitnessQuorumPolicy(quorumPolicy({ required_class_mix: { [cls]: 1 } }));
    assert.equal(r.ok, true, `${cls} was rejected: ${JSON.stringify(r.refusals)}`);
  }
});

// ------------------------------------------------------- the corroboration lane

test("[5s-t8] a well-formed external_corroboration_policy validates", () => {
  assert.deepEqual(validateExternalCorroborationPolicy(corroborationPolicy()), {
    ok: true,
    refusals: [],
  });
});

test("[5s-t8] the four §3.3 fields are each required", () => {
  for (const field of [
    "minimum_distinct_mechanisms",
    "permitted_ecology_classes",
    "required_envelope_digest",
    "freshness_and_inclusion_requirements",
  ]) {
    const p = corroborationPolicy();
    delete p[field];
    assert.equal(validateExternalCorroborationPolicy(p).ok, false, `${field} was optional`);
  }
});

test("[5s-t8] a WITNESS class inside permitted_ecology_classes crosses the taxonomy", () => {
  for (const cls of WITNESS_OPERATOR_CLASS) {
    const r = validateExternalCorroborationPolicy(
      corroborationPolicy({ permitted_ecology_classes: [cls] })
    );
    assert.equal(r.ok, false, `${cls} was accepted as an anchor class`);
    assert.ok(reasons(r).includes(CORROBORATION_POLICY_REFUSALS.CLASS_TAXONOMY_CROSSED));
  }
});

test("[5s-t8] an ecology class in neither taxonomy is unknown, not crossed", () => {
  const r = validateExternalCorroborationPolicy(
    corroborationPolicy({ permitted_ecology_classes: ["opentimestamps_v9"] })
  );
  assert.equal(r.ok, false);
  assert.ok(reasons(r).includes(CORROBORATION_POLICY_REFUSALS.ECOLOGY_CLASS_UNKNOWN));
  assert.ok(!reasons(r).includes(CORROBORATION_POLICY_REFUSALS.CLASS_TAXONOMY_CROSSED));
});

test("[5s-t8] a mechanism minimum exceeding the permitted classes is unsatisfiable", () => {
  const r = validateExternalCorroborationPolicy(
    corroborationPolicy({ minimum_distinct_mechanisms: 4 })
  );
  assert.equal(r.ok, false);
});

// ------------------------------------------------ the asymmetry, checked mechanically

test("[5s-t8] every QUORUM refusal carries a raw code inside the witness-policy band", () => {
  const codes = Object.values(QUORUM_POLICY_REFUSALS).map((r) => codeFor(r));
  assert.ok(codes.length > 0, "the quorum refusal namespace is empty");
  for (const [reason, code] of Object.values(QUORUM_POLICY_REFUSALS).map((r) => [r, codeFor(r)])) {
    assert.equal(typeof code, "number", `${reason} allocates no raw code`);
    assert.ok(code >= 484 && code <= 487, `${reason} allocates ${code}, outside 484..487`);
  }
});

test("[5s-t8] NO corroboration refusal carries a raw code — Lane C is never CI-gated", () => {
  // §3.3: "a status carried in the attestation, not a core-verifier refusal, so no raw code crosses
  // the §2 freeze for a lane that is never CI-gated."
  const all = Object.values(CORROBORATION_POLICY_REFUSALS);
  assert.ok(all.length > 0, "the corroboration refusal namespace is empty");
  for (const reason of all) {
    assert.equal(codeFor(reason), null, `${reason} allocates a raw code and must not`);
  }
});

test("[5s-t8] the two refusal namespaces are disjoint", () => {
  const q = new Set(Object.values(QUORUM_POLICY_REFUSALS));
  const shared = Object.values(CORROBORATION_POLICY_REFUSALS).filter((r) => q.has(r));
  assert.deepEqual(shared, []);
});

// ------------------------------------------------ Ruling 3: validity only, no status

test("[5s-t8] both validators return VALIDITY ONLY — the shape is exactly {ok, refusals}", () => {
  const shapes = [
    validateWitnessQuorumPolicy(quorumPolicy()),
    validateWitnessQuorumPolicy(null),
    validateExternalCorroborationPolicy(corroborationPolicy()),
    validateExternalCorroborationPolicy(null),
  ];
  for (const s of shapes) {
    assert.deepEqual(Object.keys(s).sort(), ["ok", "refusals"]);
  }
});

test("[5s-t8] the module derives no status — checked over source with comments stripped", () => {
  const raw = readFileSync(SRC, "utf8");
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  // Anti-vacuity: stripping must not be allowed to empty the thing under test.
  assert.ok(
    code.includes("validateExternalCorroborationPolicy"),
    "stripping removed the validator"
  );
  assert.ok(code.includes("validateWitnessQuorumPolicy"), "stripping removed the validator");

  for (const forbidden of [
    "external_corroboration_status",
    "witness_independence_status",
    "quorum_status",
    "comparison_status",
    "not_satisfied",
    "satisfied",
  ]) {
    assert.ok(!code.includes(forbidden), `policy.mjs derives a status: ${forbidden}`);
  }
});
