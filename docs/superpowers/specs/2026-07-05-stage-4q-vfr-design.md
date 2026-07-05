# Stage 4Q — VFR: Verifiable Friction Receipts

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

- **Date:** 2026-07-05
- **Status:** DESIGN — approved section-by-section in brainstorm; awaiting plan
- **Stage identity:** Stage 4Q = VFR. Signed, epoch-bound, ordered proof that an
  approval-gate friction checkpoint preceded a protected authority crossing.
- **Subtitle:** The Friction Precedence Law for approval-gated authority crossings.
- **Target version:** `v2.26.0-stage-4q-vfr` (verified: latest tag is
  `v2.25.0-stage-4p-voca`).
- **Raw codes:** 80–89 (verified free: Stage 4P owns 67–79). Next stage starts at 90.
- **Roadmap position:** VFR ships FIRST, PCCC second, as two separate stages
  (decided 2026-07-05: one blade per stage; friction gates egress, not the private
  match). 4Q states the PCCC forward hook but takes no dependency on it.

---

## 1. Frozen claim and scope

> Stage 4Q VFR v1 covers exactly one friction kind: an approval gate. A valid
> friction receipt proves that a declared approval checkpoint was recorded, signed,
> epoch-valid, causally bound to the protected crossing, and ordered before that
> crossing in the recorded run. Delay, cooldown, rate-limit, step-up auth, and
> demotion friction are explicitly deferred vocabulary extensions.

The approver may be human, policy, or fixture signer, depending on the lane. 4Q
never claims to prove human intent (see rails, §1.3).

### 1.1 Protected authority boundaries (frozen definition)

> Protected authority boundaries in 4Q are limited to: tool execution, unsafe
> export, privilege expansion, consent broadening, and disclosure escalation.
> Other authority surfaces are deferred.

This definition is frozen in Section 1 so later sections cannot drift into
"approval before anything vaguely important."

### 1.2 The Friction Precedence Law

> No protected authority crossing is accepted unless a valid approval receipt is
> causally bound to it, ordered before it in the recorded run chain, and signed by
> a distinct approver key.

Mechanism (frozen wording): Stage 4Q uses a two-key pincer ordering rule. A
protected authority crossing must embed the approval receipt digest, and the run
chain must show that the approval receipt appears before the crossing event. The
approval receipt must be signed by a distinct approver key, separate from the
tool/harness signer. Missing binding, post-hoc ordering, chain-position
laundering, or same-key approval/tool signing fails closed.

Lean theorem name: `frictionPrecedence` — named for what construction actually
proves (the 4P `CpcEmissionBounded` lesson), NOT "NoBackdating".

### 1.3 Signed non-claims / honesty rails (11 rails)

```text
not_general_friction_taxonomy
delay_and_cooldown_deferred
not_human_intent_proof
live_capture_is_local_mcp_fixture_only
not_external_tool_provider_guarantee
approval_key_is_authorisation_evidence_not_identity_truth
pincer_ordering_is_recorded_run_order_not_physical_time_truth
friction_receipt_is_enforcement_evidence_not_prevention
approver_key_separation_is_cryptographic_not_organisational
display_digest_is_rendering_commitment_not_comprehension_proof
exemption_claim_is_falsifiable_declaration_not_self_granted_bypass
```

Rail 11 is added by the No Silent Exemption mechanism (§2.7, decided during
planning): a crossing that declines to bind an approval must sign an explicit
exemption claim, which policy then judges. The claim is a falsifiable
declaration a reviewer can reject, never a self-granted bypass.

Rail 8 exists because VFR proves the friction receipt existed and preceded the
crossing; it does NOT prove the friction stopped harm, changed behaviour, or
prevented the underlying jailbreak. Rail 9 exists because one local operator
holds both keys during capture: separation is cryptographic, not organisational.
Rail 10 exists because `approval_display_digest` (§2.2) commits what was
RENDERED to the approver, never what the approver understood.

Rail 7 note (upgraded by §3.3 heartbeat anchoring): recorded-run order is
additionally anchored to the public 4N heartbeat via window-straddle rules, so
ordering is publicly anchored — still not physical-time truth. The rail stands.

### 1.4 Reviewer note (not a stage, not a claim)

The OWASP-LLM10 "Unbounded Consumption" / NIST MEASURE 2.7 evidence-contract
mapping ships inside the attestation as a labelled `reviewer_note`, carrying Q8's
"enforcement of declared budget, NOT prevention" non-claim. Frozen wording:

> The reviewer note is signed for reproducibility but is not itself a compliance
> claim or raw-code enforcement rule.

### 1.5 Four-axis scorecard (honest; re-score at closeout)

- **Novelty 8** — strong differentiator: signed, ordered, offline-verifiable
  friction receipts as first-class evidence primitives are not commonly separated
  from general audit logs or approval UX. Closeout requires a source-map before
  any stronger firstness claim.
- **Frontier 7.5** — agent-governance work discusses friction qualitatively; the
  differentiator is making the friction-before-authority claim recomputable from
  offline evidence.
- **Good-for-Anthropic 8** — directly machine-checks "human oversight before
  consequential action" (as recorded-run evidence, per rails).
- **Constitution 8** — maps to oversight/corrigibility clauses.
- **What moves it higher:** a live Lane B arm where the approver is a genuinely
  separate process (shipped in this design), and PCCC later consuming VFR
  receipts to gate match-result egress.

**Post-amendment projection (§6 inventions adopted; closeout re-score decides):**
Novelty 9.5 (10 only if the signed source-map survives contact), Frontier 9.5,
Good-for-Anthropic 9.5, Constitution 10. Projections are targets, not claims;
the closeout re-score is the number of record.

---

## 2. Architecture, schemas, raw codes, check order

### 2.1 Components (all additive, zero new dependencies)

1. **Lane A kernel — `authorise_with_friction()`** in
   `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py`,
   fifth member of the additive family. `authorise`, `authorise_with_intent`,
   `authorise_with_provenance`, `authorise_with_manifest` remain FROZEN. Pure and
   deterministic: takes an `Action`, a `FrictionContext` (declared approval
   receipt + epoch envelope + chain references), returns a
   `FrictionAuthorityDecision` carrying exactly one raw code. Reuses the existing
   `action_digest()` for binding. Lane A is the claim source.
2. **Approval receipt** — canonicalJson-signed JSON (schema §2.2), signed by the
   approver key. The crossing record binds it via a variant `approval_binding_kind`
   (`receipt`｜`exemption`) + `approval_binding_digest` (causal half of the pincer;
   §2.7). For the receipt path the digest equals `approvalReceiptDigest(receipt)`.
3. **Run chain** — 3Q-style hash-chained ledger entries for both the approval
   event and the crossing event. The verifier independently recomputes chain
   positions and requires `position(approval) < position(crossing)` AND digest
   agreement with the causal binding (chain half of the pincer).
4. **Two keys** — a `stage4q` harness key signs the attestation bundle (§3.4); a
   distinct approver key signs receipts. The distinct-key check compares PUBLIC
   KEY DIGESTS, not labels (`approver_key_id` is optional and never trusted for
   the raw-86 check). Fixture keys: `test-keys/INSECURE_FIXTURE_ONLY_<name>.pem`,
   digit-free names, path-regex allowlisted in BOTH the 3M and 3O audit scripts
   (4P lesson).
5. **Lane B** — the shipped 4O MCP harness, extended so a tool call proceeds only
   with a valid, ordered, bound approval receipt. The approver is a SEPARATE
   LOCAL FIXTURE-SIGNER PROCESS (frozen: stronger than "separate key" only).
   Captures are generated once locally, committed digest-only, and CI is
   replay-only — no network, ever.
6. **Offline verifier + proofs** — `tools/simurgh-attestation/stage4q/`
   build/sign/verify scripts mirroring 4P's layout; Lean obligations in
   `proofs/` (§4.1).

### 2.2 Exact schemas (five, exact-key)

```text
simurgh.vfr_friction_envelope.v1
simurgh.vfr_approval_receipt.v1
simurgh.vfr_boundary_crossing.v1
simurgh.vfr_run_chain_entry.v1
simurgh.vfr_attestation.v1
```

Approval receipt minimum exact-key shape:

```json
{
  "schema": "simurgh.vfr_approval_receipt.v1",
  "action_digest": "sha256:...",
  "request_digest": "sha256:...",
  "boundary_kind": "tool_execution",
  "stage4n_window_anchor_digest": "sha256:...",
  "run_id_digest": "sha256:...",
  "receipt_epoch": 10,
  "valid_from_epoch": 10,
  "valid_until_epoch": 20,
  "nonce_digest": "sha256:...",
  "approval_display_digest": "sha256:...",
  "approver_public_key_digest": "sha256:...",
  "signature": "base64..."
}
```

`approval_display_digest` (invention §6.3) commits the rendered approval request
shown to the approver. Executing an action other than the one displayed fails as
raw 88 (existing semantics: internal fields do not match the crossing being
authorised). Rail 10 scopes the claim: rendering commitment, not comprehension.
`receipt_epoch` (added during planning, plan Freeze 3) is the epoch at which the
receipt was minted and is the base for the window-straddle check (§3.3), with the
structural constraint `valid_from_epoch ≤ receipt_epoch ≤ valid_until_epoch`.

**Replay/run binding (frozen):** the receipt is bound to the action, the request,
the protected boundary kind, the epoch/window (`stage4n_window_anchor_digest`),
and the recorded run (`run_id_digest` — the run-chain genesis digest). Otherwise
a valid old approval becomes a skeleton key.

### 2.3 Raw codes 80–89 and frozen check order

```text
80 friction_envelope_missing
81 friction_signature_invalid
82 friction_epoch_invalid
83 approval_receipt_missing
84 approval_digest_not_bound_to_crossing
85 approval_chain_position_invalid
86 approver_key_not_distinct
87 friction_policy_not_satisfied
88 friction_receipt_binding_mismatch
89 friction_order_laundering
```

**Frozen check order** (structural validity first, laundering early after it,
same 4P pattern):

```text
80 → 83 → 81 → 82 → 89 → 86 → 84 → 85 → 87 → 88
```

Rationale:

```text
80 structural envelope exists
83 approval receipt exists and schema-parses
81 signatures verify
82 epoch valid
89 chain/order laundering
86 approver key distinct
84 crossing embeds receipt digest
85 approval position precedes crossing position
87 declared policy satisfied
88 receipt/action/request/boundary binding matches
```

### 2.4 The 84 / 88 distinction (frozen)

```text
84 approval_digest_not_bound_to_crossing
The crossing's approval_binding_digest does not resolve to a valid bound object:
either the object is unresolved/absent (approval_binding_unresolved), the digest
does not match the recomputed receipt/exemption digest (approval_binding_digest_mismatch),
or both a receipt and an exemption were supplied (binding_kind_conflict).

88 friction_receipt_binding_mismatch
The bound object (receipt OR exemption) exists and its digest matches, but its
internal fields do not match the crossing/action/request/boundary/window being
authorised.
```

### 2.5 82 / 88 replay semantics (frozen)

> A receipt outside its 4N validity window fails as raw 82. A receipt inside a
> valid window but replayed against a different run_id_digest, action_digest,
> request_digest, or boundary_kind fails as raw 88.

### 2.6 Known blast radius, planned up front

Additive raw codes have broken SIX goldens historically (4H exit-map.json, 4H
exitWrapper inline map, 4K/4H exitWrapper snapshots, 4L e2e net, shared
exit-code goldens). The plan enumerates and updates all of them in the SAME
commit that introduces codes 80–89.

### 2.7 No Silent Exemption (added during planning; zero new raw codes)

Internet survey (2026-07-05) found prior art for proof-of-non-execution
(Proof-Carrying Agent Actions, arXiv 2606.04104) and proof-that-oversight-ran
(OVERT), but none making an _unbound_ crossing sign an explicit,
policy-falsifiable exemption. 4Q closes this at the binding level. The crossing
carries a **variant binding** — never an overloaded `approval_receipt_digest`:
`approval_binding_kind` ∈ {`receipt`, `exemption`} plus an `approval_binding_digest`.
A crossing may decline to bind an approval ONLY by setting
`approval_binding_kind: "exemption"` and pointing `approval_binding_digest` at a
signed sixth-schema exemption object (`simurgh.vfr_approval_exemption.v1`) — a
"receipt of absence" binding action/request/boundary/run/window and carrying its
reason + policy id, harness-signed. Because it is signed, the exemption is a
non-repudiable declaration — never a silent gap. The pincer judges the exemption
path (right after the structural tier):

```text
crossing.approval_binding_kind === "exemption":
  a receipt is also supplied                          → raw 84 binding_kind_conflict
  no valid signed exemption resolves the binding      → raw 84 approval_binding_unresolved
  exemption signature invalid                         → raw 81 exemption_signature_invalid
  approval_binding_digest != approvalExemptionDigest  → raw 84 approval_binding_digest_mismatch
  exemption fields do not bind this crossing          → raw 88 friction_receipt_binding_mismatch
  boundary_kind ∉ admissible_exemption_boundary_kinds → raw 87 approval_exemption_not_permitted_by_policy
  otherwise                                           → GREEN reason "accepted_exempt"
```

Policy is an **affirmative allowlist**: the envelope's
`admissible_exemption_boundary_kinds` defaults to `[]`, so under `vfr-default.v1`
every exemption is refused (raw 87) — fail-closed by omission. This is the
completeness invariant applied to the approval binding: the negative space ("no
approval") is itself signed, bound, and policy-falsifiable. It makes the raw-84
reasons reachable under the explicit variant, replacing the unreachable
`crossing_missing_receipt_digest`. An exempt crossing is schema-valid, so it is
still census-counted and ledgered — exemptions never escape the census. The
Friction Precedence Law is PARAMETERISED: the pincer conjunction is proven for
the approval path (`acceptWithApproval`), while the exemption path proves a
different obligation (`noSilentExemption`): accepted only if a signed exemption is
bound AND policy admits it. Carried by rail 11
(`exemption_claim_is_falsifiable_declaration_not_self_granted_bypass`).

---

## 3. Data flow

### 3.1 Lane A (claim source): fixture corpus → kernel → evidence

A normative corpus of friction scenarios — one GREEN pincer-complete case, one
case per failure code 80–89, plus tamper variants (mutated receipt fields,
swapped chain positions, same-key signing, cross-run receipt replay) — is fed
through `authorise_with_friction()`. Each decision record carries the raw code,
the receipt digest, the crossing digest, and both chain positions. Records
become `simurgh.vfr_run_chain_entry.v1` entries in the hash-chained run ledger;
the corpus plus chain becomes the Lane A evidence file. Deterministic and
byte-stable: fixtures in, identical evidence out.

### 3.2 Lane B (live corroboration): capture once → digest-only → replay forever

Locally: the approver fixture-signer runs as a separate process, mints
`simurgh.vfr_approval_receipt.v1` receipts bound per §2.2; the 4O MCP harness
attempts real tool calls; the kernel gate admits only pincer-valid calls.

**Lane B arms (frozen — both claws of the pincer exercised live):**

```text
approved-and-ordered              → raw 0
human-at-terminal approval        → raw 0   (invention §6.7: real human on stdin CLI,
                                             own key, captured once, digest-only;
                                             rail 3 still applies)
refusal-bearing run               → GREEN   (invention §6.2: run containing ledgered
                                             refusals must still verify)
no receipt                        → 83
wrong embedded approval digest    → 84
receipt after crossing            → 85
harness-signer-as-approver        → 86   (mandatory negative arm)
expired epoch                     → 82
display/executed mismatch         → 88   (invention §6.3)
crossing-census mismatch          → 89   (invention §6.1: harness-counted attempts
                                             vs chain-committed cardinality)
```

The raw-86 arm is mandatory: the harness/tool signer attempts to sign the
approval receipt and must fail as `approver_key_not_distinct`. This proves the
two-key pincer is not decorative. The transcript is committed DIGEST-ONLY; CI
replay recomputes and compares digests offline. No network in CI, ever.

### 3.3 Epoch source

`valid_from_epoch` / `valid_until_epoch` and `stage4n_window_anchor_digest` come
from the shipped 4N seismograph window machinery — VFR receipts anchor to
existing 4N windows rather than inventing a second clock. A receipt outside its
window is 82; in-window cross-run/cross-action replay is 88 (§2.5).

**Heartbeat straddle rule (invention §6.4, frozen):** run-chain genesis and
final digests are anchored into 4N heartbeat windows. A receipt minted in window
W may authorize crossings only in W or W+1; cross-window straddle beyond W+1
fails as raw 82. This publicly anchors ordering to the already-shipped 4N
heartbeat without claiming physical-time truth (rail 7 note, §1.3).

### 3.4 Attestation build → sign → verify (non-circular, prettier-safe)

`tools/simurgh-attestation/stage4q/build-4q-vfr.mjs` assembles Lane A evidence +
Lane B capture digests + the 10 rails + the `reviewer_note` + the signed
`novelty_source_map` (§6.6) + the signed `constitution_projection` (§6.8) + the
crossing-census commitment (§6.1) into `simurgh.vfr_attestation.v1`. Signing
construction (frozen — 4P pattern, clarified):

```text
body0 = attestation without bundle_digest and signature
bundle_digest = domainDigest(ATTESTATION_BUNDLE, SCHEMAS.ATTESTATION, body0)
signed_payload = canonicalJson({ ...body0, bundle_digest })
signature = Ed25519.sign(signed_payload, stage4q_private_key)
final_bundle = { ...body0, bundle_digest, signature }
```

Verifier repeats exactly:

```text
remove signature and bundle_digest
recompute body0
recompute bundle_digest
verify signature over canonicalJson({ ...body0, bundle_digest })
```

The offline verifier is two-tier (structure/signature tier, then full pincer
recomputation tier) and recomputes chain positions itself — it never trusts
recorded positions.

### 3.5 Reproduce

`scripts/reproduce-llm-shield-stage4q.sh`, one command, Node 26
(`/opt/homebrew/opt/node@26/bin` — byte-stability gotcha), `evidence/stage-4q/`
fully prettier-ignored from day one (the 4N `cmp` lesson).

**BYO-approver mode (invention §6.5, 3O lineage):** the reproduce script accepts
`--approver-key <path>`; a reviewer mints their OWN approver key, re-runs the
Lane A corpus, and obtains **decision-equivalent** evidence — the same per-case
`{raw, reason}`, same boundary_kind, same census count, same check-order
behaviour — proving the machinery has no hidden dependence on the project's
approver key. The derived digests (receipt digest, chain root, evidence digests)
necessarily differ, since changing the key cascades through them; byte identity
is cryptographically impossible and is NOT claimed. This is the 3O
contract-equivalence lineage: same contract under a foreign key, not same bytes.

---

## 4. Proofs, K7 E2E net, CI/reproduce, docs accuracy

### 4.1 Lean proofs (`proofs/`, Lean 4.15.0, same core as 4M–4P)

Model: abstract run chain (list of entries), receipts and crossings as
structures, an `accept` predicate encoding the kernel's pincer rule. Five
obligations:

```text
frictionPrecedence:
  accept ⇒ causallyBound ∧ chainPrecedes ∧ approverDistinct

failClosed:
  no approval event in the chain ⇒ ¬accept

sameKeyFails:
  approver key digest = harness/tool key digest ⇒ ¬accept

frictionCoverage:
  chainComplete ∧ census = countCrossings ⇒
    ∀ c ∈ crossings, accepted c ⇒ hasValidReceipt c

noSilentExemption:
  acceptExempt ⇒ exemptionSignedBound ∧ policyAdmitsExemption ∧ censusHonest
```

`sameKeyFails` makes the two-key pincer machine-visible, not just tested.
`noSilentExemption` (§2.7) machine-checks that an unbound crossing is accepted
only via an explicit exemption claim over a non-protected boundary.
`frictionCoverage` (invention §6.1) lifts the law from per-crossing (∃ receipt)
to run-level totality (∀ crossings) under the committed census. Honest
scoping stated in the proof header: the theorems are about the decision
function; `pincer_ordering_is_recorded_run_order_not_physical_time_truth`
applies.

### 4.2 K7 all-functions E2E net (mandatory before tag, in spec from day one)

One test that composes every stage4q export — kernel function, receipt mint
(fixture signer), chain build, attestation build, sign, both verifier tiers —
end to end, then runs the full tamper matrix through the composed pipeline: one
expected-GREEN pincer-complete arm, one expected-GREEN refusal-bearing-run arm
(invention §6.2: ledgered refusals verify; a chain with a deleted refusal fails
as 89), plus one arm per raw code 80–89, each asserting the exact code AND that
the frozen check order fired (a mutant killing 83 must not surface as 81).

**Export inventory + byte-idempotency (frozen):** The K7 net freezes an explicit
export inventory for every stage4q module and asserts
`Object.keys(importedModule).sort()` equals the frozen list. The net also reruns
the fixture builder and Lane B capture twice, then checks `git diff` over the
stage4q fixture and evidence directories to prove byte-idempotency. This repeats
the 4P all-functions shield and catches dead-code theatre.

**Cross-stage invariants asserted in the same net:** the committed 4P offline
verifier still passes against the released 4P evidence; the 3Q registry chain is
unbroken; shared exit-code goldens are consistent.

### 4.3 Privacy scan (frozen)

> Privacy scan: committed 4Q fixtures and evidence must contain digests, enums,
> schema names, public keys, and synthetic fixture labels only. They must not
> contain raw prompts, raw tool arguments, raw endpoints, hostnames, account
> IDs, API keys, private keys, email addresses, or real user approvals. Public
> keys are allowed only in explicit public-key fields or test-key allowlisted
> paths.

### 4.4 CI wiring (frozen paragraph)

> `npm test` gates unit tests only. The 4Q e2e net is wired into
> `scripts/check-e2e.sh` and `scripts/reproduce-llm-shield-stage4q.sh`
> explicitly. The reproduce script runs Stage 4Q unit tests, fixture
> regeneration, Lane B replay, offline verification, Lean proof check,
> private-key audits, privacy scan, and the K7 all-functions net. The known
> pre-existing `scripts/check.sh` RED from unrelated worktree/history artifacts
> is recorded in closeout and is not counted as a 4Q gate.

Gotchas pre-paid: explicit `*.test.js` globs, never bare dirs (4K lesson); no
shelling to `rg` in any test (Linux ENOENT, 4L lesson); six goldens updated in
the same commit as codes 80–89 (§2.6); overclaim-scan phrasing written to dodge
the honest-negation trap (4N lesson); fixture keys allowlisted by path regex in
both 3M and 3O audit scripts (4P lesson).

### 4.5 Docs set + accuracy pass

`STAGE_4Q_THREAT_MODEL.md`, `STAGE_4Q_VALIDATION_MATRIX.md` (tamper matrix as
expected-RED/GREEN table), `STAGE_4Q_REVIEWER_CHECKLIST.md`,
`STAGE_4Q_CLOSEOUT.md` with the four-axis re-score and the Novelty source-map
(gating any firstness language; also signed into the attestation per §6.6). The plan ENDS with the docs-accuracy pass —
every checklist row verified against shipped behavior, spec deltas recorded
explicitly rather than papered over (the 4P Lane C lesson).

---

## 5. Threat model, residual risks, deferred, closeout

### 5.1 Adversary model (three faces, same as 4P)

- **Dishonest builder:** backdates approvals, launders chain order, mints
  approvals with the harness key, replays old receipts across runs — each maps
  to a raw code (89, 85, 86, 88) and a K7 tamper arm.
- **Careless integrator:** omits the receipt, ships expired windows, embeds the
  wrong digest — 83, 82, 84.
- **Skeptical reviewer:** trusts nothing recorded; the verifier recomputes chain
  positions, digests, and signatures offline, so every claim is theirs to
  re-derive.

### 5.2 Residual risks (stated, not hidden)

1. The Lane B approver is a synthetic fixture-signer, not a human approval UX —
   `not_human_intent_proof` carries this.
2. The pincer proves RECORDED-RUN order —
   `pincer_ordering_is_recorded_run_order_not_physical_time_truth` carries this.
3. Key separation is cryptographic, not organisational: one local operator holds
   both keys during capture —
   `approver_key_separation_is_cryptographic_not_organisational` carries this.
4. VFR proves friction PRECEDED the crossing, never that friction HELPED —
   `friction_receipt_is_enforcement_evidence_not_prevention` carries this.
5. `approval_display_digest` commits what was rendered, never what the approver
   read or understood —
   `display_digest_is_rendering_commitment_not_comprehension_proof` carries this.
6. A No Silent Exemption claim (§2.7) is only as trustworthy as the harness key
   that signs it: it makes the no-approval state explicit and policy-falsifiable,
   but does not itself prove the exemption was appropriate —
   `exemption_claim_is_falsifiable_declaration_not_self_granted_bypass` carries
   this.

### 5.3 Deferred, by name

Delay/cooldown and the rest of the friction vocabulary; authority surfaces
beyond the five frozen boundary kinds (§1.1); real approval UX; HTTP
resale-shape substrate; production VOPRF/PSI (unchanged from roadmap).

### 5.4 Forward hook

PCCC (next stage) consumes VFR receipts to gate the EGRESS of private-match
results — friction gates export, not the match. 4Q states this hook but takes
no dependency on PCCC.

### 5.5 Closeout criteria (frozen)

> All Stage 4Q-specific gates green under Node 26: unit tests, 4Q reproduce,
> 4Q offline verify, Lean proofs, K7 E2E, privacy scan, private-key audits, and
> check-e2e wiring. The known pre-existing check.sh RED is documented separately
> and not counted as a 4Q gate.

Then: tag `v2.26.0-stage-4q-vfr`; four-axis re-score with the Novelty
source-map attached; reviewer checklist rows verified against shipped behavior
with any spec deltas recorded; memory file updated. Raw codes 80–89 consumed;
next stage starts at 90.

---

## 6. Adopted inventions (all eight; ZERO new raw codes)

Decided 2026-07-05: every invention folds into existing code semantics (the 4P
precedent — pincer/contest/disclosure/bridge added no codes). Blade unchanged:
approval-gate friction only.

1. **Friction Coverage Commitment** — 4L cardinality reuse. The run chain
   commits the COUNT of attempted protected crossings; Lane B independently
   counts attempts. Census mismatch (selective omission) = raw 89. Lean:
   `frictionCoverage` (§4.1). The Completeness Invariant applied to friction.
2. **Ledgered refusals, expected-GREEN** — every kernel refusal is a signed
   chain entry; refusal-bearing runs verify GREEN; a deleted refusal breaks the
   chain = 89. 4L F9 lineage.
3. **`approval_display_digest`** — the receipt commits the RENDERED approval
   request; display/executed mismatch = 88. Closes approval bait-and-switch.
   Rail 10 scopes it.
4. **4N heartbeat straddle anchoring** — receipts minted in window W authorize
   crossings in W or W+1 only; beyond = 82. Publicly anchors ordering to the
   shipped 4N heartbeat (rail 7 note).
5. **BYO-approver reproduce mode** — 3O lineage; a reviewer-minted approver key
   yields **decision-equivalent** evidence (same per-case `{raw, reason}`), NOT
   byte-identical — changing the key necessarily cascades through the receipt
   digest and every downstream digest, so byte identity is cryptographically
   impossible and claiming it would be false (§3.5).
6. **Signed `novelty_source_map`** — prior-art audit (SCITT, in-toto,
   transparency logs, GitHub required reviews, OPA audit; per row: what it
   orders / what it doesn't) SIGNED into the attestation. Makes the firstness
   claim falsifiable; any successful attack on a row triggers re-score.
7. **Human-at-terminal arm** — one Lane B arm with a real human approver on a
   stdin CLI, own key, captured once, digest-only. Rail 3 unchanged.
8. **Signed `constitution_projection`** — 4M Article-73-projection lineage: each
   of the five frozen boundary kinds mapped to the constitution clause it
   operationalizes; each Lane A arm annotated by clause.

### 6.9 Plan-time freezes (from spec marking; RESOLVED in the plan)

All four freezes below are resolved in the implementation plan's "Resolved §6.9
plan-time freezes" header. Summary:

1. Raw 87's policy envelope: exact keys of the declared policy object — RESOLVED.
2. `FrictionContext`: exact fields, including the chain-references shape —
   RESOLVED.
3. 4N epoch mapping: RESOLVED with an explicit `receipt_epoch` field (the mint
   epoch and straddle base), the constraint `valid_from_epoch ≤ receipt_epoch ≤
valid_until_epoch`, and the worked boundary example (receipt_epoch 10,
   valid_until 11: crossing 11 GREEN, crossing 12 → raw 82 straddle).
4. Census unit of counting (invention 1): one "attempted protected crossing" =
   one gate call whose crossing schema-parses with a frozen boundary_kind;
   identical for Lane A and Lane B; malformed crossings are ledgered (raw 80) but
   not counted — RESOLVED.

A second review pass added five must-fix corrections and the No Silent Exemption
mechanism (§2.7, rail 11, `noSilentExemption`), all folded into the plan.

---

## Approved final 4Q identity

```text
Stage 4Q — VFR: Verifiable Friction Receipts
Target: v2.26.0-stage-4q-vfr
Law: Friction Precedence Law (+ No Silent Exemption, §2.7)
Theorems: frictionPrecedence (+ failClosed, sameKeyFails, frictionCoverage, noSilentExemption)
Core mechanism: two-key pincer ordering + friction coverage commitment + signed negative binding
Scope: approval gate only
Lanes: Lane A kernel + Lane B 4O MCP live capture replay (incl. human arm)
Rails: 11 signed non-claims
Raw codes: 80–89 (inventions AND No Silent Exemption add ZERO new codes)
Next stage starts at: 90
```
