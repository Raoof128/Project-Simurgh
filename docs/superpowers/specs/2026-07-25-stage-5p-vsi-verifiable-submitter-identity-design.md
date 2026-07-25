# Stage 5P — VSI: Verifiable Submitter Identity (design)

**Motto: AnthropicSafe First, then ReviewerSafe.**

Status: **Section 1 FROZEN `991dde48`** (amendment A1). Sections 2-N unwritten.
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

### The six laws

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
```

`identity_strength_incomparable` was **added at Section 1 freeze** — the ruling's original
seven-outcome list had no code for the partial order's defining case, which would have left a
verifier only two options for an incomparable pair, both bugs: silently pass, or silently fail.

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

| #   | Attack                                                                                                            | Required rejection                                      |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Continuity evidence presented as accountable-role evidence                                                        | resolver axis ceiling (`boundResolverDelta`)            |
| 2   | Two weak resolvers combined into one imaginary strong principal                                                   | cross-resolver principal mismatch                       |
| 3   | Same evidence replayed through a stronger profile identifier                                                      | `identity_replay_upgrade_attempted`                     |
| 4   | Incomparable vectors compressed into a scalar or lexicographic score                                              | `identity_strength_incomparable`                        |
| 5   | **Authority laundering from model output** — untrusted natural-language content asserts a role or resolver status | natural-language output has **zero** resolver authority |

Row 5 reaches back to this project's founding threat model: untrusted context may _describe_ identity
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
- [x] Eight typed outcomes fixed, including `identity_strength_incomparable`
- [x] Ledger wording (`PAYS: none`) fixed for verbatim reproduction in the closeout
- [x] Section 2's five required attack rows recorded as a forward commitment

**A1 — Section 1 invalidation rule.** Any change to the four axes or their value sets, the
definition of `≤ᵥ` or `⊔`, the relation/verdict split, the four comparator relations, the six laws,
the five Lean targets, the eight typed outcomes, the five non-claims, the ledger wording, or the
five forward-committed attack rows ⇒ **normative amendment + full re-freeze** of every later section
that consumes them.

**FROZEN `991dde48`.**
