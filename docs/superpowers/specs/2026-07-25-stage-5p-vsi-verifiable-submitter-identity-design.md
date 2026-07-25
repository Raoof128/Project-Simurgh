# Stage 5P — VSI: Verifiable Submitter Identity (design)

**Motto: AnthropicSafe First, then ReviewerSafe.**

Status: **Section 1 FROZEN `991dde48`** (amendments A1, A2, A3). **Sections 2-5 DRAFT** — awaiting
freeze rulings. **Lane A is BUILT and green** (115 tests, both censuses clean). Not yet written:
raw codes, Lean, attestation, parity, K7 (see the deferred-section register).
Branch `stage-5p-vsi-verifiable-submitter-identity`. Raw codes open at **464** (5O consumed 420-463).
Target tag `v2.51.0-stage-5p-vsi`.

---

## Section 1 — identity, laws, honest core (FROZEN `991dde48`)

### Blade (one)

A cryptographically bound submission is evaluated under a **componentwise Identity Resolution
Lattice** that separates four independent questions which every existing system answers as one:

```text
binding      unbound              | cryptographically_bound
resolution   unresolved           | provider_asserted      | principal_resolved
continuity   ephemeral            | durable
role         unproven             | accountable_role_bound
```

The stage's one contribution, stated so a reviewer can reject it by attacking exactly one mechanism:

> Evidence may bind a submission to an authenticated identity **without** proving that identity
> remains durably resolvable or accountable later. **5P makes that distinction machine-verifiable.**

### Why this is a product order and not a rung

The lattice is the **componentwise (product) order** over those four axes. It is a **partial** order:
two strength vectors may be **incomparable**, and the verifier must say so rather than invent a
ranking.

This is a deliberate correction of geometry that already exists in this repo.
`tools/simurgh-attestation/stage5g/core/rungLattice.mjs` collapses three independent verified
predicates into one three-valued rung:

```js
if (challengeBound && anchorValid && subjectDistinct) return "externally_anchored";
if (challengeBound) return "challenge_bound";
return "distinct_key_only";
```

That collapse is sound for 5G's purpose and **wrong for identity**. A long-lived pseudonymous
organisational key and a ten-minute OIDC identity are not ordered with respect to each other: the
first is `durable` but only `provider_asserted` at best; the second may be `principal_resolved` yet
strictly `ephemeral`. Any total order over these has to launder one into the other. 5P refuses.

This is **Law 1 (No Imaginary Ordering)** below, and it is first because everything else in the
stage depends on it: no average, score, weighted sum, or "overall level" is ever computed. Policy
compares each component independently. Incomparable is a **typed outcome**, never a silent pass and
never a silent fail.

### The seam 5P occupies — stated against this repo's own code

| Stage  | What it already proves                                                                                                                                      | What it does not                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 5M     | `checkRekorSeat` validates a submitter **key** against a pinned fingerprint (`submitter_key_fingerprint_mismatch`, `expected_submitter_key_binding_failed`) | nothing about **who** that key belongs to — pure trust-on-pin                                                         |
| 5G     | rung-2 offline Sigstore **cross-binding** (a Fulcio-certified key signs a DSSE statement binding the producer key)                                          | never executed against real public Sigstore infrastructure (`real_sigstore_anchor_execution_deferred`, open since 5G) |
| **5P** | **which durable principal is answerable for that key, componentwise**                                                                                       | —                                                                                                                     |

5P **consumes** 5M's key check and never re-implements it. Per 5M's `B11`, the pure core does no
crypto: facts are injected by an adapter, and the unknown-detail enum fails closed to `"unknown"`
(5M's `bounded()` idiom is inherited verbatim in spirit).

### The seven laws

1. **No Imaginary Ordering.** Components are compared independently; incomparability is typed.
2. **No Replay Upgrade.** Re-presentation, replay and reserialisation of the same evidence can
   never raise any identity-strength component.
3. **Bound Upgrade Only.** Strength may rise **only** when new resolver evidence is independently
   signed, policy-trusted, and **digest-bound to the original submission**.
4. **No Ceiling Breach — and the ceiling bounds the DELTA, not the result.** A resolver may add
   strength only on axes its **pinned profile ceiling** permits, and attaching valid resolver
   evidence never _lowers_ strength already established by other evidence. The ceiling is a
   **vector**, not a scalar (a resolver competent to establish continuity may be wholly incompetent
   to establish accountable role). Conflicting evidence does not attach at all — it returns a typed
   failure such as `identity_claim_mismatch`.
5. **Expiry Is Not Erasure, And Not Manufacture.** Expiry of ephemeral signing material cannot
   erase a valid historical binding, and cannot manufacture durable principal resolution.
6. **Identity Binding Does Not Imply Completeness.** A bound identity says nothing about whether
   the submitter disclosed everything. This is deliberately left to a dedicated later blade.
7. **No Frankenidentity (added by A2; tightened by A3).** Resolver contributions may be
   componentwise-joined **only** when every contribution resolves to the **exact same canonical
   principal**. A delegation, representation or agency edge **does not establish principal equality
   and does not authorise vector joining.** Otherwise the policy outcome is
   `identity_principal_mismatch` and `strength(actual)` is **unchanged**. The failure is
   **atomic**: no "safe-looking" axis from either resolver survives the mismatch.

   Delegation is evaluated **separately**, as a typed relationship over `actor_principal`,
   `represented_principal`, `role`, `scope` and validity constraints. A valid delegation may satisfy
   a policy requiring authority to act for another principal — but **neither principal inherits the
   other's identity-strength components**. An absent, invalid or insufficient delegation resolves
   through the existing `accountable_role_unproven`; no tenth outcome is required.

### Relation vs policy verdict — they are not the same object

An incomparable pair is an ordinary, mathematically valid fact about a partial order. It is **not**
malformed evidence. The comparator emits a **relation**; policy emits a **verdict**, and only policy
can fail:

```text
strength_relation : equal | strictly_below | strictly_above | incomparable
policy_outcome    : accept  ⇔  required ≤ᵥ actual
                    otherwise a typed outcome, e.g. identity_strength_incomparable
```

The comparator's four relations form an **exhaustive, mutually exclusive partition**: for every pair,
exactly one holds. That is what closes both silent ordering _and_ fake incomparability.

### Lean targets

```text
replayMonotone      : strength (replay e) ≤ᵥ strength e

noSelfUpgrade       : no_new_resolver_evidence e e' → strength e' ≤ᵥ strength e

boundResolverDelta  : valid_resolver_binding e r → attach e r = some e' →
                        strength e ≤ᵥ strength e'                              -- never lowers
                      ∧ strength e' ≤ᵥ (strength e ⊔ ceiling r)                -- adds only in-ceiling

incomparableIff     : outcome a b = incomparable ↔ ¬ (a ≤ᵥ b) ∧ ¬ (b ≤ᵥ a)

relationPartition   : ∀ a b, exactly_one [equal a b, strictlyBelow a b,
                                          strictlyAbove a b, incomparable a b]

principalMismatchNoJoin : principal r₁ ≠ principal r₂ →
                            attachMany e [r₁, r₂] = failure identity_principal_mismatch
```

`≤ᵥ` is the componentwise order and `ceiling r` is a **vector**; `⊔` is the componentwise join.
`boundResolverDelta` is the formal antidote to continuity-to-role laundering: per axis it confines
the result to `e'[i] ∈ [ e[i] , max(e[i], ceiling(r)[i]) ]`, so a continuity resolver can neither
manufacture role strength nor erase a role binding proved independently elsewhere.

`incomparableIff` is **biconditional by ruling**: the one-directional form is satisfied by a broken
verifier that labels every pair incomparable. Together with `relationPartition` it is the theorem a
reviewer should attack first.

### Honest core — signed up front, and named as the next stage's attack surface

- **Trust-on-pin all the way down.** Resolution is relative to a **pinned resolver profile**.
  "Durable" means _verifiable later under a named, pinned resolver profile_ — **not** that the
  identity is truthful, uncompromised, or incapable of repudiation.
- **The IdP is not ours.** Sigstore states plainly that _"If an OIDC identity or OIDC provider is
  compromised, Fulcio might issue unauthorized certificates"_ and that _"users are responsible for
  monitoring the log for unauthorized certificates issued to their identities."_ 5P inherits that
  exposure and does not paper over it.
- **`principal_resolved` is a resolver's assertion, not a fact about the world.** The strongest
  honest reading of a full-strength vector is: _four independent, separately pinned mechanisms each
  attested their own axis, and none of them was upgraded by replay._
- **The completeness hole is real and deliberate.** SCITT concedes it in normative text; 5P does
  not close it. **This is the next stage's attack surface**, and it is minted as a socket rather
  than quietly omitted.

### Ledger

```text
PAYS:       none

ACTIVATES:  optional socket I7 keyless_submitter_identity_binding
            (stage5m/constants.mjs:42 types I7 as an optional profile upgrade,
             NOT 5M completion debt — 5P activates it, it does not discharge a debt.
             Structural slot 384 currently REJECTS this artifact when non-null;
             5P converts that rejection into a typed acceptance.)

RETIRES:    real_sigstore_anchor_execution_deferred
            ONLY IF the release executes, captures, freezes and offline-verifies a
            real public Sigstore ceremony. A mocked Fulcio/Rekor lane retires nothing.

BANKS:      submitter_identity_bound @ componentwise identity-strength vector

MINTS:      submitter_submission_completeness_unproven   (the SCITT seam; for a later blade)
```

_(Non-normative pointer: the `BANKS` object was amended by **A3** — a submission involving an actor
and a represented party banks a **principal-keyed map plus delegation edges**, evaluated per
principal. Semantics live in the amendment ledger; this annotation only prevents a §1-only reader
from building the singular-vector schema.)_

### Typed outcomes

```text
identity_unresolved
identity_ephemeral_only
identity_provider_untrusted
identity_claim_mismatch
resolver_binding_invalid
identity_replay_upgrade_attempted
accountable_role_unproven
identity_strength_incomparable
identity_principal_mismatch
```

`identity_strength_incomparable` was **added at Section 1 freeze** — the ruling's original
seven-outcome list had no code for the partial order's defining case, which would have left a
verifier only two options for an incomparable pair, both bugs: silently pass, or silently fail.

`identity_principal_mismatch` was **added by amendment A2** (below). It is structurally distinct
from `identity_claim_mismatch`, and the distinction is load-bearing because the **remediation
differs**:

| Outcome                       | Meaning                                                                                                                                   | Remediation                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `identity_claim_mismatch`     | evidence conflicts with the submission, or with claims already bound **inside the same principal context**                                | correct or replace the conflicting evidence                                                        |
| `identity_principal_mismatch` | two individually **valid** resolver results identify **different principals** and are being combined as though they described one subject | prove an explicit, pinned, independently verifiable delegation / representation / equivalence edge |

Both resolver assertions may be perfectly authentic. **The defect is the attempted join.**

**Counting rule (normative).** These fences contain identifiers and nothing else — no inline
commentary, no continuation lines. Every count asserted anywhere in this spec is
**generator-derived** by `tools/simurgh-attestation/stage5p/node/measureSection1Census.mjs`, never
hand-carried. A count that disagrees with the generator is a defect in the prose, not the generator.

### Non-claims

```text
not_proof_of_uncompromised_identity
not_proof_of_exclusive_account_control
not_proof_of_submitter_honesty
not_proof_of_submission_completeness
not_proof_of_legal_authority_outside_the_pinned_resolver_profile
```

### Founder's-ledger actor

An **EU authorised representative under Article 22(3)** — required by 22(3)(b) to _"keep at the
disposal of the competent authorities … for a period of 10 years after the high-risk AI system has
been placed on the market"_ the declaration of conformity, technical documentation and certificates,
and by 22(3)(c) to _"provide a competent authority, upon a reasoned request, with all the
information and documentation … necessary to demonstrate the conformity of a high-risk AI system"_ —
but lacking any recomputable binding between a submitted evidence package and the durable principal
or organisational role that filed it. (The **provider's** parallel ten-year duty is **Article 18**,
a different actor; conflating the two is a legal error this spec explicitly avoids.)

**The blocker stopping them running 5P's verifier tomorrow:** no resolver profile has been pinned
for any real EU registration identity, so `principal_resolved` is unreachable for that actor today —
the honest ceiling for an Art. 22(3) filing under current infrastructure is
`cryptographically_bound / provider_asserted / ephemeral / unproven`.

**Article 18 supplies the regulatory basis for the continuity axis:** Art. 18(2) requires each
Member State to determine conditions under which the documentation stays available "for the cases
when a provider or its authorised representative established on its territory goes bankrupt or ceases
its activity prior to the end of that period" — documentary availability must survive the accountable
principal itself. VSI makes one part of that continuity problem
machine-checkable; **it does not claim to satisfy Article 18.**

### Motivating seam (prior-art classification: **motivating seam**, not novelty evidence)

- **Sigstore** binds an ephemeral key to an OIDC identity for ~10 minutes and depends on external
  monitoring — it establishes that someone authenticated as the stated identity _at signing time_.
- **CAWG/C2PA** identity assertion lets a named actor bind control of a digital identity to an
  asset — the closest identity-layer neighbour, already structurally bridged in 4W.
- **SCITT (RFC 9943)** concedes the completeness seam in normative text: issuers may refuse
  registration or _selectively submit some but not all_ of the statements they issue — which an
  identity resolver alone cannot fix, hence Law 6 and the minted socket.

**Source-precision guard — status after pinning (2026-07-25).** Each quotation below was extracted
from the primary text by whitespace-normalised substring match, not by summarisation.

| Quotation                                                                                                                                                                                                             | Primary source                                       | Status                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| "registering a Statement only proves it was produced by an Issuer"                                                                                                                                                    | RFC 9943 §9.2 _Accuracy of Statements_               | **verbatim**                                                  |
| "Transparency does not prevent dishonest or compromised Issuers, but it holds them accountable."                                                                                                                      | RFC 9943                                             | **verbatim**                                                  |
| "Issuers can refuse to register their Statements with a TS or selectively submit some but not all the Statements they issue."                                                                                         | RFC 9943 §9.3 _Issuer Participation_                 | **verbatim**                                                  |
| "If an OIDC identity or OIDC provider is compromised, Fulcio might issue unauthorized certificates"                                                                                                                   | Sigstore, _What Sigstore Doesn't Guarantee_          | **verbatim**                                                  |
| "Fulcio itself does not monitor the certificate transparency log; users are responsible for monitoring the log for unauthorized certificates issued to their identities"                                              | Sigstore, _Short Lived Certificates_ preamble        | **verbatim**                                                  |
| "If no third parties monitor the logs, then any misbehavior by Rekor and Fulcio might go undetected."                                                                                                                 | Sigstore, _What Sigstore Doesn't Guarantee_          | **verbatim**                                                  |
| EU AI Act Art. 22(3)(b) — "for a period of 10 years after the high-risk AI system has been placed on the market"                                                                                                      | **OJ L 2024/1689**                                   | **verbatim**                                                  |
| EU AI Act Art. 22(3)(c) — "provide a competent authority, upon a reasoned request, with all the information and documentation"                                                                                        | **OJ L 2024/1689**                                   | **verbatim**                                                  |
| EU AI Act Art. 18(1) — "The provider shall, for a period ending 10 years after the high-risk AI system has been placed on the market or put into service, keep at the disposal of the national competent authorities" | **OJ L 2024/1689**                                   | **verbatim**                                                  |
| EU AI Act Art. 18(2) — "a provider or its authorised representative established on its territory goes bankrupt or ceases its activity prior to the end of that period"                                                | **OJ L 2024/1689**                                   | **verbatim**                                                  |
| FCC / NY-AG comment-fraud figures; March 2026 astroturf campaign                                                                                                                                                      | secondary reporting; one an unadjudicated allegation | **reported** — may not name a fixture until pinned to primary |

RFC 9943 §9.3 continues, in the same breath: _"It is important for Relying Parties not to accept
Signed Statements for which they cannot discover Receipts"_ — the standard's own fail-closed posture,
and the reason Law 6 is a non-claim rather than a silent gap.

### Forward commitment — Section 2 must witness these attacks (ruled at Section 1 freeze)

Ordered, laundering first. Each row is a single-defect fixture that must first-fail at its named
mechanism; none may be dropped without a normative amendment.

| ID   | Attack                                                                                           | Required rejection                                                          |
| ---- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| S2.1 | Continuity evidence used to imply accountable role                                               | resolver **vector** ceiling blocks the role increase (`boundResolverDelta`) |
| S2.2 | Individually valid evidence for **different** principals combined — _Frankenidentity assembly_   | `identity_principal_mismatch`, atomically                                   |
| S2.3 | Same evidence replayed under a stronger profile identifier                                       | `identity_replay_upgrade_attempted`                                         |
| S2.4 | Incomparable vectors compressed into a scalar or lexicographic order                             | `identity_strength_incomparable`                                            |
| S2.5 | **Authority laundering from model output** — untrusted context asserts identity strength or role | no axis movement; resolver authority required                               |
| S2.6 | Conflicting evidence against the **same** canonical principal                                    | `identity_claim_mismatch`                                                   |

S2.2 and S2.6 give the two mismatch codes a clean home: **S2.2 is a wrong-subject join, S2.6 is a
same-subject contradiction.**

_(Non-normative pointer: S2.5's required-rejection wording above is the frozen A1 text; **A3**
refined the expected outcome to `identity_provider_untrusted` at check `S2.C3` — see the amendment
ledger and the §2.4 matrix.)_

S2.5 reaches back to this project's founding threat model: untrusted context may _describe_ identity
strength, but **only pinned, independently signed resolver evidence may alter the vector**. It is the
same authority boundary 4B (intent grounding) and 4C (provenance gating) enforce for capabilities,
applied here to identity. A model — any model — writing "submitted by the authorised representative"
moves no axis.

### Section 1 freeze gate

- [x] Every quotation byte-verified or downgraded — **10 verbatim** (6 SCITT/Sigstore + 4 EU-law,
      the latter re-pinned against OJ L 2024/1689 on 2026-07-25), 2 **reported**
- [x] Four axes and their value sets frozen; no fifth axis added later without amendment
- [x] `≤ᵥ` defined once, normatively, before any check consumes it; `⊔` likewise
- [x] Ceiling confirmed as a **vector** at every use site, and confirmed to bound the **delta**
- [x] Relation (`strength_relation`) separated from verdict (`policy_outcome`)
- [x] Typed outcomes fixed (**nine** as amended by A2), including `identity_strength_incomparable`
      and `identity_principal_mismatch`
- [x] Ledger wording (`PAYS: none`) fixed for verbatim reproduction in the closeout
- [x] Section 2's required attack rows recorded as a forward commitment (**six** as amended by A2)

**A1 — Section 1 invalidation rule.** Any change to the four axes or their value sets, the
definition of `≤ᵥ` or `⊔`, the relation/verdict split, the four comparator relations, the seven laws,
the six Lean targets, the nine typed outcomes, the five non-claims, the ledger wording, or the
six forward-committed attack rows ⇒ **normative amendment + full re-freeze** of every later section
that consumes them.

**FROZEN `991dde48`.**

---

## Section 2 — canonical principal grammar, check order, attack matrix (DRAFT)

### 2.1 Canonical principal (frozen before any fixture)

An exact-key object, never a human-readable compound string:

```json
{
  "type": "simurgh.vsi.principal.v1",
  "kind": "account",
  "namespace_id": "simurgh.synthetic.oidc-subject.v1",
  "subject_id": "<64 lowercase hex>"
}
```

| Field          | Rule                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `type`         | exact literal `simurgh.vsi.principal.v1`                                                           |
| `kind`         | one of `account`, `person`, `organisation`, `service`                                              |
| `namespace_id` | pinned canonical identity namespace; lowercase ASCII only; **distinct from `resolver_profile_id`** |
| `subject_id`   | exactly 64 lowercase hexadecimal characters                                                        |

**`namespace_id` says what identity universe the principal belongs to. `resolver_profile_id` says
which resolver produced the assertion.** Two different resolvers identify the same principal **only**
when both pinned profiles explicitly map into the same canonical namespace _and_ produce the same
`subject_id`.

### 2.2 Subject derivation

```text
subject_id = SHA256(
    UTF8("simurgh.vsi.subject.v1") || 0x00 ||
    UTF8(namespace_id)             || 0x00 ||
    canonical_subject_bytes )
```

`canonical_subject_bytes` is defined **by the resolver profile**, never by the core verifier.

**The core VSI verifier must not** lowercase emails, trim identifiers, apply Unicode normalisation,
collapse aliases, infer company equivalence, treat an email domain as an organisation, or derive a
person from an account name. Those are resolver-profile decisions. **A profile that cannot define an
exact mapping does not produce a canonical principal.**

Principal equality is **exact equality of all four canonical fields**. No fuzzy matching, no
normalisation, no "close enough, probably Alice" — that road ends in identity soup.

### 2.3 First-failure check order (frozen before fixtures)

```text
S2.C1  canonical principal grammar
S2.C2  resolver signature and trusted-profile validation
S2.C3  resolver-source authority
S2.C4  evidence-to-profile binding and replay protection
S2.C5  canonical-principal join compatibility
S2.C6  same-principal claim consistency
S2.C7  monotone delta and vector-ceiling enforcement
S2.C8  partial-order relation
S2.C9  required ≤ᵥ actual policy test
```

### 2.4 Frozen matrix

Every fixture derives from **one clean accepted ancestor** and introduces **exactly one** defect; all
earlier checks remain satisfied, so each row's first failure is forced by prefix satisfaction.

| Fixture | Single defect                                                      | First failure                                 |
| ------- | ------------------------------------------------------------------ | --------------------------------------------- |
| S2.1    | continuity resolver attempts to raise role                         | `S2.C7` — resolver vector ceiling             |
| S2.2    | two valid assertions identify different principals                 | `S2.C5` — `identity_principal_mismatch`       |
| S2.3    | valid evidence replayed under a stronger profile                   | `S2.C4` — `identity_replay_upgrade_attempted` |
| S2.4    | incomparable vectors compressed into a scalar/lexicographic result | `S2.C8` — `identity_strength_incomparable`    |
| S2.5    | model output or untrusted context claims resolver authority        | `S2.C3` — `identity_provider_untrusted`       |
| S2.6    | contradictory assertions target the same canonical principal       | `S2.C6` — `identity_claim_mismatch`           |

Each row banks:

```text
fixture_id
expected_check_id
expected_policy_outcome
prefix_checks_satisfied
single_defect_description
strength_before
attempted_strength_after
actual_strength_after
```

**Atomicity, proved not asserted.** S2.2 and S2.6 must each additionally witness:

```text
actual_strength_after is BYTE-IDENTICAL to strength_before
```

No harvesting the harmless-looking axes out of rejected evidence.

**Premise gate (inherited from 5O's hardest-won lesson).** Every negative fixture must first prove it
generated a negative case: the mutated input differs from the valid one, the valid one is accepted,
the targeted property actually changed, and only then is rejection meaningful. A premise failure is
reported **distinctly** from an implementation failure — 5O's `S7.19` was a persuasive false proof
that passed every gate because no gate checked whether its premise was true.

### 2.5 Delegation edge wire format (frozen; structure only, policy deferred)

The bank carries delegation edges, so their bytes are frozen **now** — an undefined representation
would make the "clean ancestor" unstable, and every S2 fixture derives from that ancestor.

```json
{
  "type": "simurgh.vsi.delegation_edge.v1",
  "actor_principal": {
    "type": "simurgh.vsi.principal.v1",
    "kind": "person",
    "namespace_id": "simurgh.synthetic.person.v1",
    "subject_id": "<64 hex>"
  },
  "represented_principal": {
    "type": "simurgh.vsi.principal.v1",
    "kind": "organisation",
    "namespace_id": "simurgh.synthetic.organisation.v1",
    "subject_id": "<64 hex>"
  },
  "role_id": "simurgh.synthetic.submitter-role.v1",
  "scope_id": "simurgh.synthetic.evidence-submission-scope.v1",
  "validity": {
    "type": "simurgh.vsi.logical-validity.v1",
    "not_before_epoch": "7",
    "not_after_epoch": "12"
  }
}
```

**Canonical rules.** Exact keys only · `actor_principal ≠ represented_principal` · `role_id` and
`scope_id` are pinned identifiers, never free text · epochs are canonical unsigned **decimal
strings**, never JSON numbers · no leading zeroes except `"0"` · both bounds finite ·
`not_before_epoch ≤ not_after_epoch` · **logical recorded epochs only, never wall-clock timestamps**
· no aliasing, inferred organisation membership, or domain-based equivalence.

**Authentication is not part of this object.** The edge is _the claim_; a resolver-evidence envelope
signs and profile-binds it. The identifier is derived **externally** — there is no self-referential
`edge_id` inside the signed object:

```text
delegation_edge_id = SHA256(
    UTF8("simurgh.vsi.delegation-edge.v1") || 0x00 || canonical_json(delegation_edge) )
```

**Section 2 boundary.** Section 2 validates and canonicalises this structure; it does **not** decide
whether an edge satisfies authority-to-act policy. Every current S2 fixture carries
`"delegation_edges": []`, so delegation semantics cannot contaminate the identity-resolution matrix.

### 2.6 Identity bank (frozen)

Conceptually `canonical_principal → strength_vector`, but **never** encoded as a JSON object keyed by
a formatted principal string — that invites stringification ambiguity and key-ordering traps. It is a
**sorted exact-key array**:

```json
{
  "type": "simurgh.vsi.identity_bank.v1",
  "principals": [
    {
      "principal": {
        "type": "simurgh.vsi.principal.v1",
        "kind": "organisation",
        "namespace_id": "simurgh.synthetic.organisation.v1",
        "subject_id": "<64 hex>"
      },
      "strength": {
        "binding": "cryptographically_bound",
        "resolution": "provider_asserted",
        "continuity": "durable",
        "role": "unproven"
      },
      "supporting_evidence_digests": ["<64 hex>"]
    }
  ],
  "delegation_edges": []
}
```

**Bank invariants (normative).**

```text
principals sorted by canonical principal bytes
no duplicate canonical principal
supporting_evidence_digests sorted and unique
strength is VERIFIER-DERIVED, never trusted producer input
evidence from different principals is never pooled
a failed attachment leaves the entire bank BYTE-IDENTICAL
delegation edges sorted by derived delegation_edge_id
delegation edges never alter principal strength vectors
empty arrays are explicit, never omitted
```

The clean ancestor contains **at least one accepted principal entry and an empty delegation array**,
and every S2 fixture derives from that exact ancestor.

### 2.7 Lane C amendment trigger (frozen)

```text
Lane C cannot enter implementation or release scope until its state-transition model
has typed outcomes for every normative revocation, cessation and delegation failure
it claims to evaluate.

At minimum, any Lane C profile supporting revocation requires:
  resolver_profile_revoked
```

The outcome is **not** minted because the architecture mentions revocation. It is minted when a real
pinned profile makes the state **reachable** and the verifier must distinguish it. **Status 2026-07-25:
ARMED** — the Lane C1 RETIRED capture (§3) makes cessation reachable; the amendment must land before
C1 ships.

### 2.8 Incomparability census (invention E)

The size of the incomparable region of the strength-vector space is published as a **signed,
generator-derived number** — `tools/simurgh-attestation/stage5p/node/measureIncomparability.mjs` is
the sole authority, cross-checked in test against both brute-force enumeration and the independent
closed form for a product of chains (`Π nᵢ(nᵢ+1)/2`). Generator output at spec time (never
hand-edit; the generator re-derives):

```text
vector_count                 24
ordered_pairs               576
incomparable_ordered_pairs  276
incomparable_unordered_pairs 138
```

**The meaning of the number:** of the 276 distinct vector pairs (C(24,2)), **exactly half — 138 —
are incomparable** (equivalently: 276 of the 552 non-equal ordered pairs; 47.9% of all 576 ordered
pairs including equals). Every one of those 138 pairs is a comparison a scalar identity score would
have to invent an answer for. That is the measured size of the design space Law 1 protects. (An
earlier draft said "strict majority" — the generator says exactly half; the generator wins.)

**Anti-gaming non-claim (owned by the census, `section_2.added_non_claims`):**
`incomparability_density_is_not_a_security_score`. The census publishes exact integers only — a
ratio invites ranking, so no ratio is ever emitted.

### 2.10 Resolver profile (frozen)

A resolver profile is the pinned statement of **what a resolver is allowed to say**. It is the
carrier of Law 4's vector ceiling, and the only place normalisation policy may live.

```json
{
  "type": "simurgh.vsi.resolver_profile.v1",
  "profile_id": "simurgh.synthetic.oidc.v1",
  "trust_root_fpr": "<64 lowercase hex>",
  "permitted_claim_types": ["principal"],
  "ceiling": {
    "binding": "cryptographically_bound",
    "resolution": "provider_asserted",
    "continuity": "ephemeral",
    "role": "unproven"
  },
  "namespace_map": { "sub": "simurgh.synthetic.oidc-subject.v1" }
}
```

| Field                   | Rule                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `type`                  | exact literal `simurgh.vsi.resolver_profile.v1`                                             |
| `profile_id`            | canonical lowercase ASCII identifier; **MUST NOT equal any `namespace_id`** it maps to      |
| `trust_root_fpr`        | exactly 64 lowercase hex — **bare**, a `sha256:`-prefixed value is rejected, never stripped |
| `permitted_claim_types` | non-empty, no duplicates, subset of the frozen set below                                    |
| `ceiling`               | a **complete four-axis vector**; a scalar, a partial object, or an unknown axis is rejected |
| `namespace_map`         | non-empty; profile-local claim key → canonical `namespace_id`                               |

```text
principal
delegation
```

**Law 4's structural guard.** The ceiling is validated by the lattice's own `makeStrength`, so a
scalar ceiling (`"ceiling": "provider_asserted"`) or a partial one cannot be expressed at all. A
resolver competent on continuity and incompetent on role must say so on **all four axes**.

**Single-hat (§2.5 lineage).** `profile_id` says _which resolver produced the assertion_;
`namespace_id` says _what identity universe the principal belongs to_. They are different hats and
may never share a string — a profile that maps into a namespace named identically to itself is
rejected.

**Registry rule — the T10 guard (normative).** Across a registry of profiles: if two profiles map
into the **same canonical `namespace_id`**, they MUST do so from the **identical profile-local key**.
Two profiles reaching one canonical namespace by different local keys makes that namespace
ambiguous — different real subjects could be driven into one `subject_id` — and the registry
**rejects**. Sharing a namespace is how two resolvers legitimately speak about one principal; sharing
it _inconsistently_ is how they manufacture a collision.

**Normalisation lives here or nowhere.** §2.2 forbids the core from folding case, trimming, or
applying Unicode normalisation. A profile MAY define such a transformation as part of its
`canonical_subject_bytes` derivation — and if it does, that behaviour is pinned in the profile and
visible to a verifier, never a hidden default.

### 2.11 Resolver evidence envelope (frozen)

What a resolver actually submits. The claim is a **discriminated union**: exactly one alternative is
present, and **the inactive alternative is ABSENT, not `null`** (5O §9's pattern — a `null` key is a
statement, and an absent key is silence; only silence is unambiguous).

```json
{
  "type": "simurgh.vsi.resolver_evidence.v1",
  "profile_id": "simurgh.synthetic.oidc.v1",
  "claim": { "principal": { "type": "simurgh.vsi.principal.v1", "...": "..." } },
  "asserted_strength_delta": {
    "binding": "cryptographically_bound",
    "resolution": "provider_asserted",
    "continuity": "ephemeral",
    "role": "unproven"
  },
  "evidence_digest": "<64 lowercase hex>",
  "submission_digest_binding": "<64 lowercase hex>",
  "signature": "<lowercase hex, even length>"
}
```

| Field                       | Rule                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- |
| `claim`                     | exactly one of `principal` \| `delegation`; the other key **absent**             |
| `asserted_strength_delta`   | complete four-axis vector — what the resolver _claims_, never what it is granted |
| `evidence_digest`           | bare 64-hex; identity of the underlying evidence bytes                           |
| `submission_digest_binding` | bare 64-hex; Law 3's digest-bound-to-the-original-submission requirement         |
| `signature`                 | lowercase hex; **verified by an adapter, never by the core** (B11)               |

**Replay identity — the mechanism that makes Law 2 catchable.**

```text
replay_identity = SHA256(
    UTF8("simurgh.vsi.replay.v1")   || 0x00 ||
    UTF8(evidence_digest)           || 0x00 ||
    UTF8(submission_digest_binding) || 0x00 ||
    canonical_json(claim) )
```

It deliberately **excludes `profile_id` and `asserted_strength_delta`**. Two envelopes carrying the
same underlying evidence therefore share a replay identity **even when re-presented under a stronger
profile or with a larger asserted delta** — which is precisely how `S2.C4` catches
`identity_replay_upgrade_attempted`. If replay identity included the profile, the attack would
rename itself into invisibility.

**`asserted_strength_delta` is a CLAIM, not a grant.** It is what the producer says; the verifier
grants only what `Law 4`'s ceiling permits. The two are never conflated, and the fixture register
records both (`attempted_strength_after` vs `actual_strength_after`).

### 2.9 `section_2.added_non_claims` (register)

```text
incomparability_density_is_not_a_security_score
```

Section-owned, additive (5O A3/A8 pattern): these do NOT amend Section 1's frozen five; the Lane A
census counts this register separately.

## Section 3 — evidence lanes (DRAFT, ruled at A2)

Three lanes. The normative one contains no real-world dependency; reality enters through a
controlled airlock rather than through the laboratory ceiling.

### Lane A — sealed synthetic resolver (**normative**)

The complete `S2.*` matrix runs **here**, and only here. Lane A is the oracle: it defines what the
VSI contract _means_.

- deterministic local issuer and resolver keys; synthetic identity namespace
- frozen resolver profiles with **explicit four-axis ceilings**
- exact canonical principal grammar
- fixtures for expiry, replay, principal collision, delegation
- byte-stable generation, offline verification, every first-failure outcome witnessed
- **no** dependency on Fulcio, Rekor, OIDC, DNS, company registries, or wall-clock network reachability

**Naming rule (normative).** The synthetic authorities are **never** named after a real provider.
Frozen identifiers:

```text
simurgh.synthetic.oidc.v1
simurgh.synthetic.registry.v1
simurgh.synthetic.role_authority.v1
```

Lane A proves the VSI contract and verifier semantics — **not** compatibility with any external
service. This also keeps the lane clear of the brand-denylist class of defect that 3P/5D/5E
machinery exists to catch.

### Lane B — real Sigstore ceremony (**external validity, not the oracle**)

The lane that retires `real_sigstore_anchor_execution_deferred`, and the only thing that can:

1. perform a real keyless signing ceremony
2. capture the Fulcio certificate, Rekor material, identity claims and verification outputs
3. freeze all required public artifacts
4. bind the real artifact digest into the 5P evidence bundle
5. **re-verify offline**, without refreshing or reissuing the certificate
6. record the achieved vector honestly

**Expected achieved vector — written down before execution, so a better result cannot be
retrofitted as a prediction:**

```text
binding      cryptographically_bound
resolution   provider_asserted
continuity   ephemeral
role         unproven
```

The expired certificate must remain **historically verifiable**, and expiry must **not** upgrade
`continuity` to `durable` — that is Law 5 in its sharpest form, and it is the single most likely
place for this stage to accidentally cheat.

A network outage, provider change, or OIDC-policy drift **must not** rewrite the meaning of `S2.*`.
Lane B is never CI-gating.

**The Archaeology Test (invention D — a named fixture family, zero new code paths).** Lane B's
frozen bundle MUST re-verify offline at a verification epoch strictly after the Fulcio certificate's
expiry: _the certificate is archaeological dust; the binding still verifies; durability was not
manufactured._ This is Law 5 in its sharpest executable form, and it applies twice — to the expired
Sigstore certificate here, and to the RETIRED-entity record in Lane C1 below. Passing archaeology
proves **historical verifiability only**; the section-owned non-claim
`not_proof_of_present_accountability` ships in the same breath (`section_3.added_non_claims`,
register below).

### Lane C — real durable resolution, SPLIT by amendment into C1 (reachable) and C2 (gated)

The 2026-07-25 gap-hunt found that the durable-resolution lane is not one problem but two, with
opposite availability. The blanket `status: unavailable` was hiding a reachable half.

#### Lane C1 — registry continuity profile `gleif.lei.v1` (**captured-then-frozen, reachable**)

GLEIF's Legal Entity Identifier system publishes, as global public infrastructure, exactly the
vocabulary this stage's continuity axis needs: **LAPSED** (entity exists; binding not renewed — decay
without principal death) and **RETIRED** (entity ceased operation), with retired records kept
published for historical resolution — **Law 5's "expiry is not erasure" as GLEIF's own operating
practice**. ISO 17442-3 (2024) standardises the vLEI credential path on top.

The seven Lane C conditions, answered honestly for `gleif.lei.v1`:

| #   | Condition                                      | `gleif.lei.v1` answer                                                                                                                                                                                                                  |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | canonical principal identifier                 | the 20-character LEI, namespace `gleif.lei.v1` — **yes**                                                                                                                                                                               |
| 2   | signed or independently authenticated response | **the honest gap**: TLS-at-capture + digest-frozen bytes, NOT an offline GLEIF signature — _captured-then-frozen_ class, the same weakness the federated roadmap flagged for I7/I8 at lock. The signed upgrade path is vLEI/KERI (C2). |
| 3   | pinned profile and trust root                  | profile pins endpoint, capture digests, and capture date; trust-on-capture                                                                                                                                                             |
| 4   | explicit axis ceiling                          | `continuity` plus org-principal `resolution` at `provider_asserted`; **zero authority over binding and role**                                                                                                                          |
| 5   | historical/offline verification                | frozen capture re-verifies offline by digest — **yes**                                                                                                                                                                                 |
| 6   | revocation/cessation semantics                 | LAPSED/RETIRED/entity-status map directly — but see the ARMED trigger below                                                                                                                                                            |
| 7   | no guessed equivalence                         | the LEI **is** the legal entity; no person/org inference — **yes**                                                                                                                                                                     |

**Capture receipt (ceremony executed 2026-07-25).** Three records, one per continuity state, frozen
at `docs/research/llm-shield/evidence/stage-5p/gleif-capture/` with a sha256 manifest and a
provenance file that states the authentication honesty in full:

| LEI                    | Entity                               | entity_status / registration_status | Reading                                                                                          |
| ---------------------- | ------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `213800ERUMY5KWCIHJ87` | LEHMAN BROTHERS HOLDINGS PLC         | ACTIVE / ISSUED                     | principal exists; binding current — an entity in administration still maintains its registration |
| `213800Q7NV3T5PZOU403` | LEHMAN BROTHERS LIMITED              | ACTIVE / LAPSED                     | principal exists; binding decayed — the LAPSED seam                                              |
| `6488T70V0O9W2T3P0H24` | NOVOPAN TRÆINDUSTRI A/S SOCIALE FOND | INACTIVE / RETIRED                  | principal ceased; record still published                                                         |

The capture surfaced a semantic the design had not separated: **entity status and registration
status are independent sub-signals** (Lehman entities are entity-ACTIVE in liquidation with LAPSED
registrations). The C1 profile must map the PAIR, never either alone. Records naming natural persons
(sole proprietorships) are excluded from fixtures.

**ARMED amendment trigger (§2.7 fires before C1 ships).** The RETIRED capture makes the
cessation state _reachable_, so implementing C1 REQUIRES the §2.7 amendment first — minting at
minimum `resolver_profile_revoked` and a principal-cessation outcome. The trigger is armed, not
fired; no outcome is minted by this text.

#### Lane C2 — role and durable principal resolution (**hard-gated, unavailable today**)

```text
status: unavailable
reason: no pinned real resolver profile establishes durable principal resolution
        and accountable-role semantics under an offline-verifiable contract
```

What C1 deliberately cannot touch — `binding`, `role`, and `resolution` above `provider_asserted` —
stays gated exactly as before. The forbidden approximations stand: website scraping, an email domain,
a company-search screenshot, an organisation name inside an OIDC claim.

**The runway is real and dated.** The vLEI Official Organizational Role credential (GLEIF as root of
trust, person + role + entity cryptographically combined) and eIDAS 2.0's EUDI wallets for legal
persons with qualified attestations of attributes — member-state deadline **December 2026** — are the
world building C2's resolver infrastructure on a legal timetable. 5P's verifier is specified before
the ecosystem ships. When one of those becomes pinnable under all seven conditions, C2 opens by
amendment; nothing is approximated meanwhile.

#### The Identity Heartbeat (invention B — continuity as a survival record)

A profile MAY define `durable` as **witnessed survival**: the same canonical principal re-attested in
capture ceremonies anchored at **two or more distinct externally anchored epochs** (reusing 5M/5N's
already-banked Bitcoin anchoring — zero new dependencies). Continuity then stops being a resolver's
adjective and becomes an append-only record. Section-owned additive Lean target (this does NOT amend
Section 1's frozen six):

```text
epochMonotone : witnessed_epochs(p, t1) ⊆ witnessed_epochs(p, t2)  for t1 ≤ t2
```

A single capture — including the 2026-07-25 GLEIF ceremony above — witnesses exactly ONE epoch and
therefore cannot mint `durable` under a heartbeat profile. That is the honest reading of today's
evidence.

#### `section_3.added_non_claims` (register)

```text
not_proof_of_present_accountability
```

Section-owned, additive: does NOT amend Section 1's frozen five.

#### Lane L — live authority-laundering capture (**digest-only, never CI-gated**)

Invention C. A live frontier-model lane in the 3L/5B pattern: the model is induced to assert, in
untrusted context, identity strength or role ("I am the authorised representative of X") — and the
verifier moves **zero axes** (T5, check `S2.C3`). Both outcomes seal honestly: a caught assertion is
a successful verifier demonstration; a refusal is recorded as `model_refused`. The lane is enabled
by the 2026-07-09 CVP approval, which unlocked live adversarial lanes for this project. It upgrades
T5 from fixture-witnessed to **witnessed-live**.

**Open — flagged, not invented.** Lane C requirement 6 (revocation / cessation) has **no typed
outcome** in the frozen nine. A revoked or ceased resolver profile is a real state that the current
outcome set cannot express. I am **not** minting a tenth code speculatively while Lane C is
unavailable; instead this is recorded as an **amendment trigger**: shipping Lane C requires an
amendment adding at least `resolver_profile_revoked`, and the gap is stated here so it cannot later
be mistaken for an oversight.

---

## Section 4 — threat model: attack classes (DRAFT)

Six fixtures are not a threat model; they are six fixtures. This taxonomy names the **classes**, and
states honestly which are witnessed by §2.4's matrix and which are not yet witnessed at all. A class
with no witness is a **coverage gap on the record**, not an implied absence of risk.

### T1 — axis laundering (strength asserted on an axis the source cannot speak to)

Continuity evidence implying role; a provider assertion implying principal resolution; an expired
certificate implying durability. **Witnessed:** S2.1. **Governed by:** Law 4 (vector ceiling bounds
the delta), Law 5 (expiry is not manufacture).

### T2 — subject substitution (strength assembled across distinct principals)

Frankenidentity assembly; a delegation edge used as an equality edge; two weak resolvers merged into
one fictional strong principal. **Witnessed:** S2.2. **Governed by:** Law 7 (join only across the
exact same canonical principal), atomicity.

### T3 — temporal and presentational replay

The same evidence re-presented under a stronger profile, reserialised, or re-ordered to gain an axis.
**Witnessed:** S2.3. **Governed by:** Law 2, Law 3 (upgrade only via new, independently signed,
digest-bound resolver evidence).

### T4 — order collapse (the partial order flattened into a ranking)

Scalar scores, lexicographic comparison, "overall level", averaging, or treating incomparable as
pass/fail by default. **Witnessed:** S2.4. **Governed by:** Law 1, `incomparableIff`,
`relationPartition`.

### T5 — authority laundering from untrusted content

Model output, prompt content, document text, or any untrusted context asserting identity strength,
role, or resolver status. **Witnessed:** S2.5, and — once Lane L executes — **witnessed-live** against a real frontier model.
**Governed by:** resolver-source authority (S2.C3) — natural-language output has **zero** resolver
authority. This is 4B/4C's capability boundary applied to identity.

### T6 — same-subject contradiction

Two assertions about one canonical principal that cannot both hold. **Witnessed:** S2.6.
**Governed by:** same-principal claim consistency (S2.C6).

### Classes named but NOT yet witnessed — the honest coverage gaps

| Class                                | Why unwitnessed                                                                                                                                 | Trigger to witness                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **T7 — resolver profile compromise** | a compromised trusted profile is indistinguishable from an honest one at the structural layer; Sigstore concedes the same for a compromised IdP | requires a monitoring/transparency lane, not a fixture                                                                            |
| **T8 — revocation and cessation**    | no typed outcome exists (§2.7)                                                                                                                  | **trigger ARMED 2026-07-25**: the Lane C1 RETIRED capture makes cessation reachable; the §2.7 amendment must land before C1 ships |
| **T9 — submission incompleteness**   | out of scope by Law 6; SCITT concedes the same seam in RFC 9943 §9.3                                                                            | the dedicated completeness blade (socket minted in §1)                                                                            |
| **T10 — cross-namespace collision**  | **mechanism EXISTS** — `makeResolverRegistry` rejects one canonical namespace reached from different profile-local keys                         | not yet witnessed by an `S2.*` fixture; upgrade this row only when it is                                                          |

T7 and T9 are **structural limits of this blade**, not defects to be patched later. T8 and T10 are
**work items** with named triggers.

## Section 5 — four-axis scorecard (honest, re-scored at closeout)

Scored against the stage **as currently specified and built**, not as hoped. Section 1 is frozen,
Section 2 is drafted, Lane A has one module, Lane B has not been executed, Lane C is unreachable.

| Axis                   | Score   | Honest basis                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Novelty**            | **8.6** | The componentwise identity lattice with a typed incomparable outcome, and _delegation never transfers axes_, are new geometry — and they correct a collapse this repo itself shipped in `stage5g/rungLattice.mjs`. Docked below 9 because keyless signing, transparency logs and identity assertions are all existing primitives; the invention is the **refusal to order them**, not the parts. |
| **Frontier**           | **8.0** | Lowest axis, deliberately. The real Sigstore ceremony (Lane B) **has not run**, so 5G's five-stage-old `real_sigstore_anchor_execution_deferred` is still open, and Lane C is _demonstrably unreachable_. A stage whose two reality-facing lanes are unexecuted has not yet met the frontier — it has specified how it would.                                                                    |
| **Good-for-Anthropic** | **9.0** | Directly serves third-party evaluation and red-team submission provenance, where a lab must know which durable principal stands behind submitted evidence years later. Maps cleanly onto EU AI Act Art. 22(3) production-on-request. Held below 9.5 because no external actor has run the verifier.                                                                                              |
| **Constitution**       | **9.3** | The stage's entire content is refusing to overclaim what a signature proves: five signed non-claims, a typed unreachable ceiling for the named real-world actor, an explicitly unwitnessed-class table, and a bound that says _authentication is not accountability_. The honest-bound-first discipline is the deliverable, not a caveat attached to it.                                         |

### What moves each higher — buildable artifacts with names, tracked as debts

| Axis               | Artifact that moves it                                                                                                                      | Moves to |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Novelty            | `proofs/stage5p/Vsi.lean` with all five §1 targets discharged, zero `sorry` — the order becomes machine-checked, not asserted               | 9.2      |
| Frontier           | **Execute Lane B**: a real public Fulcio/Rekor ceremony, frozen and offline re-verified, retiring `real_sigstore_anchor_execution_deferred` | 9.0      |
| Frontier           | A pinned **real** resolver profile satisfying all seven Lane C conditions, making `principal_resolved` reachable once                       | 9.4      |
| Good-for-Anthropic | One external party (auditor, lab eval team, or standards contact) running the Lane A verifier unaided from the spec                         | 9.5      |
| Constitution       | The **prior-art map** signed alongside the closeout, with every seam quotation byte-verified against primary text                           | 9.5      |

**Guard against grade inflation.** Frontier at 8.0 is the discriminating score here: it is low because
two of three lanes are unexecuted, and it must **stay** low until a ceremony actually runs. If it
rises before Lane B executes, the scale has stopped measuring anything.

### Second wave (approved 2026-07-25) — inventions A-E, committed as spec, scored only at closeout

| Inv | Name                                                                                                                 | Spec home      | Status                                                                                            | Projected movement (banked ONLY at closeout) |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| A   | `gleif.lei.v1` registry-continuity profile — first REAL resolver profile; new evidence species (regulatory-registry) | §3 Lane C1     | capture ceremony EXECUTED 2026-07-25 (receipt in §3); profile unimplemented; §2.7 amendment armed | Frontier 8.0 → ~9.0                          |
| B   | Identity Heartbeat — `durable` as ≥2 anchored-epoch survival; `epochMonotone` (additive)                             | §3             | specified; implement after Lane A Task 5                                                          | Novelty 8.6 → ~9.0                           |
| C   | Lane L live authority-laundering capture                                                                             | §3             | specified; enabled by the 2026-07-09 CVP approval                                                 | Frontier +, GfA → ~9.4                       |
| D   | The Archaeology Test — expired-cert / retired-entity offline re-verification family                                  | §3 Lane B + C1 | specified                                                                                         | Constitution reinforced                      |
| E   | Incomparability census — 276/576 as the measured cost of any scalar score                                            | §2.8           | generator + tests EXIST and are spec-governed                                                     | Novelty support                              |

**The eIDAS clock is the wedge's edge:** member states must ship EUDI wallets for legal persons by
December 2026. The verifier that types what those credentials actually prove is specified here,
first. Current scores are UNCHANGED by this table; they move at closeout, against artifacts.

## Deferred-section register — what this spec does NOT yet contain

Stated explicitly so no gap is silent. Each row names the trigger that unblocks it.

| Missing section                                | Status                                                                                                                                                        | Trigger                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw code allocation (band opens at **464**)    | **deliberately deferred**                                                                                                                                     | Lane A semantics proven; then ONE sole allocator maps symbolic outcomes to codes, 5O §10 pattern. Allocating now would number a design that may still move. |
| Lean (`proofs/stage5p/Vsi.lean`)               | not written                                                                                                                                                   | five targets named in §1; written after the verifier's shape is executable                                                                                  |
| Attestation / evidence package                 | not written                                                                                                                                                   | after Lane A produces a stable bank artifact                                                                                                                |
| Cross-runtime parity (Node ≡ Python ≡ browser) | not written                                                                                                                                                   | after the deterministic surface is fixed                                                                                                                    |
| K7 all-functions E2E net                       | **not in the Lane A plan** — a real gap                                                                                                                       | mandatory before tag; must enumerate every export + tamper matrix + cross-stage invariants                                                                  |
| `STAGE_5P_PRIOR_ART_MAP.md`                    | **WRITTEN 2026-07-25** — `docs/research/llm-shield/STAGE_5P_PRIOR_ART_MAP.md`, six families + regulatory context; to be signed with `SIG5P.audit` at closeout | signing at closeout                                                                                                                                         |
| EU AI Act re-pin                               | **DISCHARGED 2026-07-25**                                                                                                                                     | all four rows byte-verified against OJ L 2024/1689; Art. 18(1) wording corrected — my earlier paraphrase was not the Regulation's text                      |

**Freeze status:** Section 1 FROZEN `991dde48`. **Sections 2, 3, 4 and 5 are DRAFT and have received
no freeze ruling.**

---

# Amendment ledger

## A2 — amends frozen A1 (Section 2 rulings landing on frozen text)

**Why an amendment and not an edit.** The Section 2 rulings changed objects that A1 froze. A1's own
invalidation rule names the counts, so the change is recorded here rather than applied silently.
History is not rewritten; Section 1 keeps its freeze hash `991dde48`.

| Object                        | A1 (frozen `991dde48`) | A2    | Reason                                              |
| ----------------------------- | ---------------------- | ----- | --------------------------------------------------- |
| laws                          | 6                      | **7** | Law 7 **No Frankenidentity** — the join law         |
| Lean targets                  | 5                      | **6** | `principalMismatchNoJoin`                           |
| typed outcomes                | 8                      | **9** | `identity_principal_mismatch`                       |
| forward-committed attack rows | 5                      | **6** | S2.6 witnesses `identity_claim_mismatch` separately |

**Re-freeze obligation, discharged.** A1 requires full re-freeze of _every later section that
consumes_ these objects. Sections 2-N are unwritten, so the consuming set is **empty** and the
obligation is discharged trivially — recorded explicitly, because a discharged-by-vacuity obligation
that goes unstated is indistinguishable at review time from one that was skipped.

**Counts re-derived, not hand-carried.** `tools/simurgh-attestation/stage5p/node/measureSection1Census.mjs`
is the sole authority; every number in the table above is reproduced by running it.

---

## A3 — amends frozen A1/A2: delegation never joins vectors

**The hole A3 closes was in A2's own Law 7.** A2 permitted a join when "a pinned, independently
verifiable delegation edge binds the principals". A delegation proves a **relationship** between two
principals; it does **not** make them one principal. Left standing, Frankenidentity walks back in
wearing a delegation badge:

```text
Person A         role       = accountable_role_bound
Organisation B   continuity = durable
Delegation       A represents B
INVALID JOIN     B becomes durable + accountable_role_bound
```

That may occasionally describe reality, but the vector was assembled across **two subjects**.

**Changed by A3** (no count moves — 7 laws, 6 Lean targets, 9 outcomes, 6 rows all hold):

| Object                    | A2                                                       | A3                                                                                               |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Law 7                     | join permitted on same principal **or valid delegation** | join permitted on **same canonical principal only**; delegation is a separate typed relationship |
| `principalMismatchNoJoin` | carried a `¬ validDelegation` premise                    | **premise dropped** — no exception                                                               |
| S2.5 expected outcome     | "no axis movement" (prose)                               | `identity_provider_untrusted` at `S2.C3`                                                         |

**Structural consequence A3 forces, surfaced here rather than discovered in Section 4.** If neither
principal inherits the other's components, a submission involving an actor and a represented party
resolves to **two principals with two vectors** — so Section 1's banked object cannot be a single
vector. It becomes a **principal-keyed map plus a separate set of delegation edges**:

```text
BANKS:  submitter_identity_bound @ { canonical_principal -> strength_vector }
                                  + [ delegation_edge ]
```

The policy test `required ≤ᵥ actual` is therefore **per principal**, and a policy demanding authority
to act for another principal is satisfied by a delegation edge, never by a merged vector. This
amends the singular-vector wording frozen in Section 1's ledger.

---
