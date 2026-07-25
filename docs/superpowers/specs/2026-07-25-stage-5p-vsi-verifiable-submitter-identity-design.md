# Stage 5P — VSI: Verifiable Submitter Identity (design)

**Motto: AnthropicSafe First, then ReviewerSafe.**

Status: **Section 1 FROZEN `991dde48`** (amendments A1, A2, A3). **Section 2 DRAFT** — awaiting
freeze ruling. Sections 3-N unwritten.
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

**Article 18 supplies the regulatory basis for the continuity axis:** it expressly requires
documentary availability to survive the bankruptcy or cessation of the provider or authorised
representative during the ten-year retention period. VSI makes one part of that continuity problem
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

| Quotation                                                                                                                                                                | Primary source                                       | Status                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "registering a Statement only proves it was produced by an Issuer"                                                                                                       | RFC 9943 §9.2 _Accuracy of Statements_               | **verbatim**                                                                                                                                                              |
| "Transparency does not prevent dishonest or compromised Issuers, but it holds them accountable."                                                                         | RFC 9943                                             | **verbatim**                                                                                                                                                              |
| "Issuers can refuse to register their Statements with a TS or selectively submit some but not all the Statements they issue."                                            | RFC 9943 §9.3 _Issuer Participation_                 | **verbatim**                                                                                                                                                              |
| "If an OIDC identity or OIDC provider is compromised, Fulcio might issue unauthorized certificates"                                                                      | Sigstore, _What Sigstore Doesn't Guarantee_          | **verbatim**                                                                                                                                                              |
| "Fulcio itself does not monitor the certificate transparency log; users are responsible for monitoring the log for unauthorized certificates issued to their identities" | Sigstore, _Short Lived Certificates_ preamble        | **verbatim**                                                                                                                                                              |
| "If no third parties monitor the logs, then any misbehavior by Rekor and Fulcio might go undetected."                                                                    | Sigstore, _What Sigstore Doesn't Guarantee_          | **verbatim**                                                                                                                                                              |
| EU AI Act Art. 22(3)(b), 22(3)(c), Art. 18                                                                                                                               | artificialintelligenceact.eu article pages           | **extracted, not byte-verified against OJ L 2024/1689** — to be re-pinned against the Official Journal PDF before freeze of any section that depends on the exact wording |
| FCC / NY-AG comment-fraud figures; March 2026 astroturf campaign                                                                                                         | secondary reporting; one an unadjudicated allegation | **reported** — may not name a fixture until pinned to primary                                                                                                             |

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

S2.5 reaches back to this project's founding threat model: untrusted context may _describe_ identity
strength, but **only pinned, independently signed resolver evidence may alter the vector**. It is the
same authority boundary 4B (intent grounding) and 4C (provenance gating) enforce for capabilities,
applied here to identity. A model — any model — writing "submitted by the authorised representative"
moves no axis.

### Section 1 freeze gate

- [x] Every quotation byte-verified or downgraded — 6 **verbatim**, 3 EU-law rows **extracted**
      (re-pin against OJ L 2024/1689 before any section depends on exact wording), 2 **reported**
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

### Lane C — real durable resolution (**hard-gated, unavailable today**)

```text
status: unavailable
reason: no pinned real resolver profile establishes durable principal resolution
        and accountable-role semantics under an offline-verifiable contract
```

Lane C ships only when **all seven** exist: canonical principal identifier; signed or independently
authenticated resolver response; pinned profile and trust root; explicit axis ceiling;
historical/offline verification method; revocation, cessation and delegation semantics; and no
guessed equivalence between a person, an organisation and a legal role.

**Explicitly forbidden approximations** — these are hints wearing resolver costumes, and none may
move an axis: website scraping, an email domain, a company-search screenshot, or an organisation
name inside an OIDC claim.

Until Lane C exists, the founder's-ledger blocker stays **demonstrably unreachable**. That is a
stronger research result than a decorative green box, and it is the honest reason
`principal_resolved` and `accountable_role_bound` are unreachable for a real Art. 22(3) filing today.

**Open — flagged, not invented.** Lane C requirement 6 (revocation / cessation) has **no typed
outcome** in the frozen nine. A revoked or ceased resolver profile is a real state that the current
outcome set cannot express. I am **not** minting a tenth code speculatively while Lane C is
unavailable; instead this is recorded as an **amendment trigger**: shipping Lane C requires an
amendment adding at least `resolver_profile_revoked`, and the gap is stated here so it cannot later
be mistaken for an oversight.

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
pinned profile makes the state **reachable** and the verifier must distinguish it.
