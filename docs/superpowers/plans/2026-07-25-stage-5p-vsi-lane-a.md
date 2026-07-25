# Stage 5P — VSI Lane A implementation plan

**Motto: AnthropicSafe First, then ReviewerSafe.**

Spec: `docs/superpowers/specs/2026-07-25-stage-5p-vsi-verifiable-submitter-identity-design.md`
(Section 1 FROZEN `991dde48`, amendments A1/A2/A3; Section 2 DRAFT).
Branch `stage-5p-vsi-verifiable-submitter-identity`. Already landed: `identityLattice.mjs` +
9 passing tests (`5f6bdaa4`), `measureSection1Census.mjs` (`44fafbcb`, hardened `f4c84b9b`).

**Audience: an engineer who knows nothing about this codebase.** Every path is exact. Every task ends
with an independently testable deliverable and its own commit. Work tasks in order — later tasks
consume earlier tasks' exact export names.

**Honest note on this plan's depth.** Tasks 1-6 carry exact schemas, signatures, invariants and test
names. They do **not** reproduce every line of finished test code; each step names the assertions
required and the command that proves them. Where a construction is subtle (subject derivation, bank
sorting, first-failure ordering) the literal bytes or code are given. Treat any assertion listed as
mandatory, not illustrative.

---

## Global constraints (copied verbatim from the spec — do not paraphrase)

```text
LAW 1  No Imaginary Ordering — no average, score, weighted sum or "overall level" is computed.
LAW 2  No Replay Upgrade — replay/reserialisation never raises any component.
LAW 3  Bound Upgrade Only — strength rises only via independently signed, policy-trusted resolver
       evidence digest-bound to the original submission.
LAW 4  No Ceiling Breach — the ceiling bounds the DELTA, is a VECTOR, and attaching never lowers.
LAW 5  Expiry Is Not Erasure, And Not Manufacture.
LAW 6  Identity Binding Does Not Imply Completeness.
LAW 7  No Frankenidentity — join ONLY across the exact same canonical principal. Delegation never
       authorises vector joining. Failure is ATOMIC.
```

```text
subject_id = SHA256( UTF8("simurgh.vsi.subject.v1") || 0x00 ||
                     UTF8(namespace_id)             || 0x00 || canonical_subject_bytes )

delegation_edge_id = SHA256( UTF8("simurgh.vsi.delegation-edge.v1") || 0x00 ||
                             canonical_json(delegation_edge) )
```

Additional standing rules:

- **Pure core, injected facts** (5M `B11`): nothing under `stage5p/core/` performs crypto, I/O, or
  reads a clock. Digests are computed in `stage5p/node/` and passed in.
- **The core verifier must not** lowercase emails, trim identifiers, apply Unicode normalisation,
  collapse aliases, infer company equivalence, treat an email domain as an organisation, or derive a
  person from an account name. Those are resolver-profile decisions.
- **Synthetic authorities are never named after a real provider.** Frozen: `simurgh.synthetic.oidc.v1`,
  `simurgh.synthetic.registry.v1`, `simurgh.synthetic.role_authority.v1`.
- **Reuse, do not reinvent:** `tools/simurgh-attestation/canonicalise.mjs` exports `canonicalJson`.
- **No attribution trailers** in any commit message.
- Run `npx prettier --write` on every touched file before committing; `npx prettier --check` must pass.
- Node 26 for all test runs: `/opt/homebrew/opt/node@26/bin/node`.

---

## File map

| Path                                                                   | Responsibility                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tools/simurgh-attestation/stage5p/core/identityLattice.mjs`           | **exists** — axes, product order, relations, join                      |
| `tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs`        | principal schema, validation, equality, canonical bytes                |
| `tools/simurgh-attestation/stage5p/core/resolverProfile.mjs`           | profile schema, trust root, claim types, 4-axis ceiling, namespace map |
| `tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs`          | evidence envelope schema, profile binding, replay identity             |
| `tools/simurgh-attestation/stage5p/core/delegationEdge.mjs`            | §2.5 edge validation + canonical bytes (structure only)                |
| `tools/simurgh-attestation/stage5p/core/identityBank.mjs`              | §2.6 sorted bank, atomic attach, provenance                            |
| `tools/simurgh-attestation/stage5p/core/section2Verifier.mjs`          | the nine checks `S2.C1..S2.C9`, first-failure only                     |
| `tools/simurgh-attestation/stage5p/core/constants.mjs`                 | frozen ids, check order, typed outcomes, synthetic namespaces          |
| `tools/simurgh-attestation/stage5p/node/laneAFixtures.mjs`             | clean ancestor + six single-defect mutations                           |
| `tools/simurgh-attestation/stage5p/node/measureStage5pLaneACensus.mjs` | Lane A census (separate from the Section 1 census)                     |
| `tests/unit/llmShield/stage5p/*.test.js`                               | one test file per module, plus the matrix                              |

---

## Task 1 — canonical principal

**Interfaces**

```text
consumes: nothing (leaf)
produces: PRINCIPAL_KINDS, makePrincipal(obj), principalCanonicalBytes(p),
          principalsEqual(a,b), deriveSubjectId(namespaceId, canonicalSubjectBytes)
```

`makePrincipal` accepts exactly `{type, kind, namespace_id, subject_id}`; rejects any extra key,
missing key, `type !== "simurgh.vsi.principal.v1"`, `kind` outside
`["account","person","organisation","service"]`, `namespace_id` that is not lowercase ASCII, and
`subject_id` not matching `/^[0-9a-f]{64}$/`.

`deriveSubjectId` lives in `stage5p/node/` (it hashes) and is imported by fixtures, **not** by core.

**Steps**

1. Write `tests/unit/llmShield/stage5p/canonicalPrincipal.test.js` asserting, at minimum:
   - all four `kind` values accepted; a fifth rejected
   - uppercase hex `subject_id` rejected; 63- and 65-char rejected
   - uppercase `namespace_id` rejected
   - **laundering rejections, one test each:** `"Alice@x"` vs `"alice@x"` are different subjects;
     a trailing-space identifier is not trimmed into equality; NFC and NFD spellings of the same
     grapheme produce **different** subjects (assert the module does not normalise)
   - `principalsEqual` is exact over all four fields — differing only in `kind` is not equal
   - `namespace_id === resolver_profile_id` is _not_ special-cased anywhere (they are distinct fields)
2. Run it; watch every test fail (module absent).
3. Implement `canonicalPrincipal.mjs`; run until green.
4. `prettier --write`, commit: `feat(5p): canonical principal — exact schema, no normalisation`.

**Expected output:** `pass 8+ / fail 0`.

---

## Task 2 — resolver profile

**Interfaces**

```text
consumes: identityLattice (AXES, makeStrength)
produces: makeResolverProfile(obj), profileCeiling(p) -> frozen strength vector,
          RESOLVER_PROFILE_IDS
```

Profile fields: `type` (`simurgh.vsi.resolver_profile.v1`), `profile_id`, `trust_root_fpr`,
`permitted_claim_types[]`, `ceiling` (a full four-axis vector), `namespace_map` (profile → canonical
`namespace_id`).

**The ceiling is a VECTOR.** Assert a profile whose ceiling is a scalar or a partial object is
rejected — this is Law 4's structural guard.

**Steps:** test-first as Task 1. Mandatory assertions: a profile may not declare a `namespace_map`
entry that collides with another profile's canonical namespace unless the mapping is identical;
`permitted_claim_types` must be non-empty; ceiling must pass `makeStrength`.
Commit: `feat(5p): resolver profile — pinned trust root and four-axis vector ceiling`.

---

## Task 3 — resolver evidence envelope

**Interfaces**

```text
consumes: canonicalPrincipal, resolverProfile
produces: makeResolverEvidence(obj), evidenceReplayIdentity(e), evidenceCanonicalBytes(e)
```

Envelope carries: `type`, `profile_id`, `claim` (principal claim **or** delegation claim, exactly
one — discriminated, the inactive alternative must be **ABSENT**, not null, per 5O's §9 pattern),
`asserted_strength_delta`, `evidence_digest`, `signature`, `submission_digest_binding`.

**Replay identity** is what Law 2 keys on: the same evidence presented under a different
`profile_id` must produce the **same** replay identity, so `S2.C4` can catch it. Assert exactly that.

Commit: `feat(5p): resolver evidence envelope — discriminated claim, replay identity`.

---

## Task 4 — delegation edge (structure only)

**Interfaces**

```text
consumes: canonicalPrincipal
produces: makeDelegationEdge(obj), delegationEdgeCanonicalBytes(e)
```

Enforce every §2.5 rule. Mandatory rejections, one test each: extra key; `actor_principal ===
represented_principal`; epoch as a JSON number; `"07"` leading zero; `not_before > not_after`;
non-finite bound; free-text `role_id`.

**Do not implement authority-to-act evaluation.** A test asserts the module exports no function whose
name matches `/authoris|authoriz|satisf|permit/i` — the Section 2 boundary, enforced structurally.

Commit: `feat(5p): delegation edge wire format — structure frozen, policy deferred`.

---

## Task 5 — identity bank

**Interfaces**

```text
consumes: canonicalPrincipal, identityLattice, delegationEdge
produces: emptyBank(), attachEvidence(bank, evidence, profile) -> {ok:true, bank} | {ok:false, reason},
          bankCanonicalBytes(bank)
```

Implements every §2.6 invariant. **The three that carry the stage:**

- **Law 7 atomicity.** On any failure, `bankCanonicalBytes(after) === bankCanonicalBytes(before)`,
  asserted byte-for-byte, not field-by-field.
- **Law 4 delta.** `attach` may raise an axis only within `strength(e) ⊔ ceiling(profile)`, and never
  lowers an existing axis. Test with a continuity-only profile against a bank already holding
  `role: accountable_role_bound` — the role must survive untouched.
- **No pooling.** Evidence for principal A never contributes to principal B's vector, even when both
  are in the bank.

Sorting is by `principalCanonicalBytes`, delegation edges by `delegation_edge_id`. Assert that
inserting the same principals in reverse order yields byte-identical bank output.

Commit: `feat(5p): identity bank — sorted, atomic, per-principal, never pooled`.

---

## Task 6 — nine-check verifier

**Interfaces**

```text
consumes: all of the above
produces: SECTION2_CHECK_IDS, verifySection2(bundle, pinned) -> {ok} | {check_id, outcome},
          evaluateSection2Safe(...)  // fail-closed wrapper, added LAST
```

Frozen executable order — this array **is** the normative order, and prose must follow it:

```text
S2.C1 canonical principal grammar
S2.C2 resolver signature and trusted-profile validation
S2.C3 resolver-source authority
S2.C4 evidence-to-profile binding and replay protection
S2.C5 canonical-principal join compatibility
S2.C6 same-principal claim consistency
S2.C7 monotone delta and vector-ceiling enforcement
S2.C8 partial-order relation
S2.C9 required <=v actual policy test
```

**First failure only.** A test asserts no later check can shadow an earlier defect: for each fixture,
the reported `check_id` equals the expected one **and** all earlier checks are recorded satisfied.

Raw codes are **not** allocated in this task. Numeric allocation happens once, in a later section, as
the sole allocator (5O's §10 pattern) — do not scatter numbers through the verifier.

Commit: `feat(5p): section 2 verifier — nine checks, first-failure only`.

---

## Task 7 — clean ancestor, then six fixtures

**Ancestor** (`laneAFixtures.mjs`): one deterministic synthetic principal, one trusted resolver
profile, one valid signed assertion, one accepted bank result, `"delegation_edges": []`.
Deterministic keys — no randomness, no clock. Assert the ancestor **ACCEPTS** before any mutation
exists; an ancestor that does not accept invalidates all six fixtures.

**Each fixture mutates the ancestor in exactly one way:**

| Fixture | Single defect                                                      | First failure                                 |
| ------- | ------------------------------------------------------------------ | --------------------------------------------- |
| S2.1    | continuity resolver attempts to raise role                         | `S2.C7`                                       |
| S2.2    | two valid assertions identify different principals                 | `S2.C5` → `identity_principal_mismatch`       |
| S2.3    | valid evidence replayed under a stronger profile                   | `S2.C4` → `identity_replay_upgrade_attempted` |
| S2.4    | incomparable vectors compressed into a scalar/lexicographic result | `S2.C8` → `identity_strength_incomparable`    |
| S2.5    | model output / untrusted context claims resolver authority         | `S2.C3` → `identity_provider_untrusted`       |
| S2.6    | contradictory assertions against the same canonical principal      | `S2.C6` → `identity_claim_mismatch`           |

Each row banks: `fixture_id`, `expected_check_id`, `expected_policy_outcome`,
`prefix_checks_satisfied`, `single_defect_description`, `strength_before`,
`attempted_strength_after`, `actual_strength_after`.

**PREMISE GATE — mandatory, and the reason this plan exists.** Before asserting any rejection, each
fixture must prove it generated a negative case:

```text
require mutated_bytes !== ancestor_bytes      // the mutation actually applied
require ancestor is ACCEPTED                  // the base is genuinely clean
require the targeted property actually changed
then     assert mutated is REJECTED at the expected check
```

A premise failure is reported as `PREMISE FAILED`, **distinctly** from an implementation failure.
5O's `S7.19` was a persuasive false proof that passed every gate because no gate checked whether its
premise was true; the same defect then reappeared in the tests written to prevent it. This session
already reproduced it once in the census tooling — a mutation that landed in the wrong fence and a
gate that matched a heading literal that did not exist.

S2.2 and S2.6 additionally assert `actual_strength_after` is **byte-identical** to `strength_before`.

Commit: `test(5p): clean ancestor and six single-defect S2 fixtures`.

---

## Task 8 — Lane A census

New file `measureStage5pLaneACensus.mjs`. **Do not extend `measureSection1Census.mjs`** — Section 1 is
frozen and its generator stays scoped to what it measures.

Derives (never hard-codes): `principal_kinds`, `principal_schema_fields`, `strength_axes`,
`resolver_profiles`, `resolver_evidence_fields`, `bank_schema_fields`, `delegation_edge_fields`,
`check_ids`, `typed_outcomes`, `fixtures`, `first_failure_rows`.

Rejects: duplicate identifiers · malformed fence contents · missing check IDs · fixture/check
mismatch · hand-carried prose counts that drift · **non-contiguous** `S2.C*` or `S2.*` identifiers.

Dynamic fixture contents (e.g. how many supporting evidence digests happen to exist) must **not**
become frozen prose counts.

**Every gate must be proved capable of failing** under targeted mutation before it is trusted, and
that proof is itself a test. Build twice, `cmp`, for byte-stability.

Commit: `feat(5p): Lane A census — oracle-free, byte-stable, gates proved non-vacuous`.

---

## Task 9 — full matrix and tamper net

Positive acceptance · six named failures · atomic no-change assertions · cross-runtime parity on the
deterministic surface where applicable. Then the fail-closed `evaluateSection2Safe` wrapper is wired
**last**, per the standing invariant.

Commit: `test(5p): Lane A matrix and tamper net`.

---

## Definition of done for Lane A

- [ ] Ancestor accepts; all six fixtures reject at their committed check with their committed outcome
- [ ] Every premise gate passes and is distinguishable from an implementation failure
- [ ] Bank atomicity asserted byte-for-byte on S2.2 and S2.6
- [ ] Lane A census green, byte-stable, every gate demonstrated failing
- [ ] `npx prettier --check` clean; full stage5p suite green on Node 26
- [ ] No raw codes allocated; no real provider named; no scalar score anywhere in the surface
