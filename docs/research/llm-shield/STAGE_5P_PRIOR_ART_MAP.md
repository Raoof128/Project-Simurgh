# Stage 5P — VSI: prior-art map

**Motto: AnthropicSafe First, then ReviewerSafe.**

Six families that touch "bind a submission to who submitted it". For each: what it does, **the seam
it concedes**, and why 5P is not it. To be signed with `SIG5P.audit` alongside the closeout.

**Source-precision guard.** Every family names a primary source. The **Quote** column states whether
the seam is a **verbatim** quotation extracted from that primary source by whitespace-normalised
substring match, or **paraphrase** (my own words, citation pinned, text not extracted). No quotation
marks appear around any wording that was not extracted — an anti-fabrication project must not carry a
reconstructed quote.

---

## 1. Sigstore / Fulcio keyless signing — **the closest neighbour, and the one 5P consumes**

**Primary:** Sigstore security model, <https://docs.sigstore.dev/about/security/>. **Quote: verbatim.**

Under a heading the documentation itself titles _What Sigstore Doesn't Guarantee_:

> "If an OIDC identity or OIDC provider is compromised, Fulcio might issue unauthorized certificates."

and, on monitoring:

> "Fulcio itself does not monitor the certificate transparency log; users are responsible for
> monitoring the log for unauthorized certificates issued to their identities."

> "If no third parties monitor the logs, then any misbehavior by Rekor and Fulcio might go
> undetected."

**Seam.** The binding is an assertion by a third-party IdP, captured in a certificate valid for
roughly ten minutes, whose misuse is detected only if somebody is watching. It establishes that
**someone authenticated as the stated identity at signing time**.

**Why 5P is not it.** 5P does not compete with Sigstore; it **consumes** it and then asks the question
Sigstore does not: _which durable principal remains answerable for this evidence once the certificate
has expired?_ Sigstore's achieved vector in 5P's own lattice is written down before the ceremony
runs: `cryptographically_bound / provider_asserted / ephemeral / unproven`. Three of four axes at
their floor is not a criticism of Sigstore — it is Sigstore's scope, stated in Sigstore's own words.

## 2. SCITT — IETF RFC 9943

**Primary:** RFC 9943, _An Architecture for Trustworthy and Transparent Digital Supply Chains_.
**Quote: verbatim** (extracted from the RFC text, §§9.2 and 9.3).

> §9.2 — "Issuers can make false Statements either intentionally or unintentionally; registering a
> Statement only proves it was produced by an Issuer."

> "Transparency does not prevent dishonest or compromised Issuers, but it holds them accountable."

> §9.3 — "Issuers can refuse to register their Statements with a TS or selectively submit some but
> not all the Statements they issue."

**Seam.** Two, and the standard concedes both in normative text. Registration proves **production**,
not accountability resolution. And **selective submission is unaddressed** — the Completeness
Invariant, conceded by an IETF standard.

**Why 5P is not it.** 5P closes neither seam and says so. The first is the stage's own subject: 5P
types _how far_ an identity resolves rather than treating "produced by an Issuer" as the end of the
question. The second is **out of scope by Law 6** and minted as a socket for a dedicated blade —
because an identity resolver alone genuinely cannot fix it. RFC 9943 §9.3 continues with the posture
5P inherits: _"It is important for Relying Parties not to accept Signed Statements for which they
cannot discover Receipts"_.

## 3. C2PA / CAWG identity assertion

**Primary:** Creator Assertions Working Group identity framework, <https://cawg.io/about/identity-framework/>.
**Quote: paraphrase** (framework page read; wording not extracted, so not quoted).

**Seam.** CAWG lets a credential holder prove control over a digital identity and document a **named
actor's role** in an asset's lifecycle. It is the closest identity-layer neighbour, and this repo
already bridged C2PA structurally in 4W. But control-at-signing is again a point event, and the
framework does not decide whether that identity remains resolvable, nor whether an institutional
submission channel accepted the actor's evidence.

**Why 5P is not it.** 5P is not a media-provenance format and asserts no authorship. It separates
_role_ from _continuity_ from _resolution_ as **independent axes**, precisely so that a proven role
cannot imply a durable principal, and vice versa.

## 4. X.509 / traditional PKI identity

**Primary:** RFC 5280. **Quote: paraphrase** (not extracted).

**Seam.** A CA binds a name to a key with revocation and validity periods — genuinely durable
identity, at the cost of key custody, enrolment friction, and revocation infrastructure that keyless
signing exists to avoid.

**Why 5P is not it.** 5P is not a CA and issues no certificates. It is a **verifier of how strongly a
binding resolves**, agnostic about whether the binding came from a long-lived CA-issued key or a
ten-minute ephemeral one. That agnosticism is the whole point: those two are **incomparable** in
5P's order, and a system that ranked them would have to launder one into the other.

## 5. Verifiable Credentials / DIDs

**Primary:** W3C Verifiable Credentials Data Model. **Quote: paraphrase** (not extracted).

**Seam.** A rich issuer-subject-holder model with cryptographic presentation. What it does not supply
is a **verdict discipline** over partial information: an implementation is free to decide for itself
what a partially-resolved holder means, and the ecosystem's trust registries remain a deployment
concern rather than a checkable artifact.

**Why 5P is not it.** 5P is deliberately smaller. It defines one thing — the componentwise strength
of a resolution and the rules under which it may change — and refuses to compute an overall level.

## 6. This repo's own `stage5g/core/rungLattice.mjs` — **the prior art 5P corrects**

**Primary:** `tools/simurgh-attestation/stage5g/core/rungLattice.mjs`. **Quote: verbatim** (source).

```js
if (challengeBound && anchorValid && subjectDistinct) return "externally_anchored";
if (challengeBound) return "challenge_bound";
return "distinct_key_only";
```

**Seam.** Three independent verified predicates collapsed into one three-valued rung. Sound for 5G's
purpose, where the predicates genuinely compose toward a single anchoring claim.

**Why 5P is not it.** For identity the same collapse is **wrong**, and stating that plainly about our
own shipped code is the honest form of the novelty claim. A durable pseudonymous organisational key
and an ephemeral principal-resolved OIDC identity are not ordered with respect to each other; any
total order must launder one into the other. 5P's order is **partial**, and incomparability is a
typed outcome rather than a tie broken by convention.

---

## Regulatory context (not prior art — the wound)

**Primary:** Regulation (EU) 2024/1689, **OJ L 2024/1689**. **Quote: verbatim** (extracted).

> Art. 22(3)(c) — the authorised representative shall "provide a competent authority, upon a reasoned
> request, with all the information and documentation" necessary to demonstrate conformity.

> Art. 18(2) — Member States determine conditions under which documentation remains available "for
> the cases when a provider or its authorised representative established on its territory goes
> bankrupt or ceases its activity prior to the end of that period."

The obligation to **produce evidence on demand, years later, potentially after the accountable
principal has ceased to exist**, is the continuity problem in legal text. VSI makes one part of it
machine-checkable. **It does not claim to satisfy Article 18.**

**Reported, not primary — barred from fixture names until pinned.** The FCC net-neutrality
comment-fraud figures (NY Attorney General; ~9.3M filings under false identities) and the March 2026
AI-astroturf allegation before the California Attorney General are **secondary reporting**, and the
latter is unadjudicated. They motivate the stage; they may not name a fixture.
