# Stage B5 — Model Response Log

Model: Claude (Fable 5), inline execution in Claude Code, 2026-06-12.
Every pass used `prompts/00-system-instruction.md` + `MODEL_REVIEW_INPUT_PACK.md`
as the only inputs. Rubric: see `MODEL_REVIEW_PROTOCOL.md`.

---

## Pass 1 — Novelty extraction

**Ranked contributions (novelty × defensibility):**

1. **Deterministic offline AI privacy firewall (B4-A).** An "AI-style"
   explanation layer that is structurally incapable of exfiltration: input
   allowlist → deterministic generator → output claim firewall → signed
   privacy receipt, with a static no-egress gate (including a negative
   self-test) proving the absence of network primitives. Evidence: §4, §5 of
   the input pack. Most defensible because the property is structural, not
   behavioural.
2. **Machine-enforced claim discipline as a system property.** A
   negation-aware forbidden-claim scanner blocks affirmative capability claims
   ("fraud detected") while passing required disclaimers ("not a fraud
   detection tool"), enforced fail-closed at runtime and mirrored by a CI
   overclaim scanner. Evidence: §4, §8. Novel framing: overclaim resistance is
   testable, like memory safety.
3. **Metadata-only integrity evidence architecture.** A recursive
   forbidden-field firewall (47 key names incl. prototype-pollution keys,
   depth-capped) that audit-logs rejected attempts and escalates subsequent
   risk, so the absence of sensitive data is itself evidenced. Evidence: §2.
4. **Verifiable participation lifecycle with withdrawal semantics.** Per-session
   HMAC audit chains with domain-separated keys; withdrawal blocks report
   export but preserves audit/verify reads for transparency; human evidence is
   aggregate-only by construction. Evidence: §2, §3.
5. _(supporting, not headline)_ **User-facing privacy receipts** rendered with
   the explanation (B4-B), making the firewall outcome inspectable by the
   participant. Evidence: §4.

Rejected candidate framings: anything implying detection efficacy, payment
safety, or compliance — the pack contains no evidence for them and they are on
the forbidden list.

**Rubric:** all 8 criteria PASS.

---

## Pass 3 — Reviewer #2 attack

**Likely rejection grounds and pre-emptions:**

- **"The AI is fake."** The narrative provider is a deterministic mock; the
  firewall has never filtered a real LLM. → Must be stated in the abstract,
  not discovered by the reviewer. Frame B4-A as establishing the _contract and
  enforcement points_ a future live provider must pass through; the claim
  guard is exercised against poisoned narratives (rejected-claim fixture).
- **"n=5 is not a user study."** → Frame Phase B as a formative internal dry
  run; claim only comprehension-by-trusted-insiders, no generalisation.
- **"Guardrails exist."** Content-filtering frameworks already moderate LLM
  output. → Differentiate: this design's primary guarantee is structural
  (no-egress, allowlist input, deterministic provider), with content scanning
  only as the last layer; plus receipts and audit chains make the guarantee
  inspectable per-response.
- **"Threat model is implicit."** → Add an explicit threat model section
  (Pass 5) with trust assumptions: the server is trusted; the chain is
  tamper-evident, not tamper-proof, because the server holds the HMAC keys.
- **"Self-graded evidence."** The gates are written by the same project they
  validate. → Acknowledge; mitigations: negative self-tests (the no-egress
  gate fails on an injected network primitive; tampered audit fixtures fail
  verification), and full public reproducibility of all gates.
- **"Deployment realism."** In-memory single-node store, no persistence story.
  → Scope explicitly as a research prototype; persistence is future work.

**Required-fix list adopted for the draft:** explicit threat model; mock
provider in abstract; limitations section covering all six points above.

**Rubric:** all 8 criteria PASS.

---

## Pass 4 — Methodology audit

- **Honest frame:** "a small formative dry run with five trusted internal
  testers", not a statistically powered user study. No inferential statistics;
  counts only.
- **Can infer:** trusted insiders could complete consent → scenario → report →
  withdrawal; the non-claims and the fictional framing were understood (5/5 on
  all five comprehension checks); the deterministic policy pattern reproduced
  identically across testers; withdrawal blocked report export in all 5 cases.
- **Cannot infer:** general-population usability; resistance to deceptive
  framing; behaviour of non-trusted or adversarial participants; any
  effectiveness property of the warnings themselves.
- **Label exploratory:** the export-interpretability finding (1/5 understood
  pre-patch; post-patch confirmed only in a 3-session focused rerun) — report
  as a design iteration, not a measured improvement.
- **Tables:** Phase B aggregates (sessions/scenarios/withdrawals), the 5×
  comprehension counts, gate results. All fillable from the pack.

**Rubric:** all 8 criteria PASS (method honesty is the point of the pass).

---

## Pass 5 — Threat model

**Assets:** A1 sensitive banking payloads (must never enter the system);
A2 audit-chain integrity; A3 the claim boundary (no capability overclaims);
A4 participant anonymity (aggregate-only human evidence); A5 official policy
result integrity (narrative must not alter it).

**Attacker capabilities considered:**

- T1 A participant (or compromised page) submits sensitive or structurally
  polluted payloads. → Controls: recursive forbidden-field firewall, pollution
  keys on the denylist, depth cap, body limit, rejected-attempt audit events,
  risk escalation. (A1)
- T2 A future narrative provider attempts exfiltration. → Controls: allowlist
  input with hashed session id, 4 KB cap, no-egress static gate, deterministic
  mock provider in this work. (A1)
- T3 The narrative layer emits a capability overclaim. → Controls: output
  schema allowlist, length caps, negation-aware forbidden-claim scan,
  fail-closed 422 with receipt. (A3)
- T4 The narrative drifts the official result. → Control: official-result
  drift check against the authoritative record. (A5)
- T5 Audit-log tampering. → Control: HMAC chain; tampered fixtures fail
  verification. Tamper-evident only: the server holds the keys, so a fully
  compromised server can rewrite chains. (A2, residual)
- T6 Token theft/replay. → Controls: HMAC-SHA256 tokens, constant-time
  comparison, TTL, purpose/phase binding, path/token match; transport security
  assumed. (A1, A4)
- T7 Withdrawal bypass. → Controls: withdrawn → 403 on report and explanation;
  audit/verify intentionally remain readable. (A4)

**Trust assumptions:** the server and its environment secrets are trusted;
TLS protects transport; testers are trusted insiders in Phase B.

**Out of scope:** denial of service beyond rate limiting; side channels;
real banking infrastructure; malicious server operator (beyond tamper
evidence); browser compromise.

**Residual risks:** denylist-based claim scanning is incomplete by
construction; receipts attest process, not ground truth, and rely on server
honesty; withdrawal does not erase the (metadata-only) audit chain — by
design, for transparency, and stated to participants.

**Rubric:** all 8 criteria PASS.

---

## Pass 6 — Related-work map (categories only; citations to be verified)

| Category                                                             | Why Banking Shield differs                                                                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Open-banking consent UX `[CITATION NEEDED]`                          | We evidence the _integrity of the consent flow itself_ (chains, receipts), not consent-screen design efficacy.                                                                 |
| Payee-confirmation services `[CITATION NEEDED]`                      | Our payee scenario is fictional; the contribution is the metadata boundary, not name-matching.                                                                                 |
| Security-warning comprehension (HCI) `[CITATION NEEDED]`             | We measure comprehension of _non-claims_ (what the system does NOT do), an inverted warning problem.                                                                           |
| Privacy-preserving telemetry / data minimisation `[CITATION NEEDED]` | Minimisation is enforced by a fail-closed structural firewall whose rejections are themselves evidence.                                                                        |
| Tamper-evident logging / transparency logs `[CITATION NEEDED]`       | Standard hash-chain machinery, applied per-session with participant-facing verify exports and withdrawal semantics.                                                            |
| LLM guardrails and output moderation `[CITATION NEEDED]`             | Guardrails filter content from a live model; B4-A makes the provider structurally unable to receive sensitive input or emit unchecked claims, and proves no-egress statically. |
| AI transparency artifacts (model cards etc.) `[CITATION NEEDED]`     | Receipts are _per-response_ machine-checked artifacts, not per-model documentation.                                                                                            |

**Rubric:** all 8 criteria PASS (no concrete citations emitted).

---

## Pass 7 — Figure and table plan

Figures (each tied to a claim):

- **F1 Architecture** — supports "metadata-only by construction" (§2).
- **F2 Session lifecycle** — consent → scenario → report/audit/verify →
  withdrawal; supports the verifiable-lifecycle claim (§2, §3).
- **F3 B4-A firewall pipeline** — input firewall → deterministic generator →
  output claim firewall → receipt; supports the structural-guarantee claim (§4).
- **F4 Evidence pipeline** — tests/smokes/audits → fixtures → paper; supports
  reproducibility (§5).

Tables: **T1** allowed vs forbidden data; **T2** Phase B aggregates;
**T3** gate results; **T4** claims vs non-claims; **T5** threats → controls
(from Pass 5). Stub specifications: `../paper/figures/README.md`,
`../paper/tables/README.md`.

**Rubric:** all 8 criteria PASS.

---

## Pass 8 — Candidate abstracts (5 styles)

1. **Systems:** leads with the firewall pipeline and fail-closed enforcement
   points; results = gate counts and fixtures.
2. **Privacy/security:** leads with the inversion — evidence of absence
   (nothing sensitive recorded) as the deliverable; receipts + chains.
   **Selected as the base.**
3. **AI governance:** leads with machine-enforced claim discipline and
   per-response transparency artifacts.
4. **Banking-adjacent:** leads with the fictional scenario suite and the
   consent/withdrawal lifecycle; carefully heaviest with non-claims.
5. **Short preprint:** four sentences; prototype + firewall + dry run +
   limitations.

The merged abstract (base 2, with 3's claim-discipline sentence and 5's
limitation sentence) appears in the draft v0.1.

**Rubric:** all 8 criteria PASS.

---

## Pass 9 — Paper outline

Emitted to `../paper/banking-shield-paper-outline.md` (section-level claims,
evidence bindings, and per-section forbidden-overclaim notes).

**Rubric:** all 8 criteria PASS.

---

## Pass 10 — Draft v0.1

Emitted to `../paper/banking-shield-paper-v0.1.md`. Constraints honoured: no
invented results, `[CITATION NEEDED]` placeholders only, evaluation
conclusions stated as hypothesis/result/caption, limitations section present,
mock provider declared in the abstract.

**Rubric:** all 8 criteria PASS.

---

## Pass 11 — Reviewer simulation (of draft v0.1)

**Reviewer A — privacy/security systems. Leaning: weak accept (workshop) /
borderline (major venue).**
Strengths: structural no-egress argument with negative self-test; fail-closed
design; honest threat model; reproducible gates. Weaknesses: provider is a
mock, so the central artifact is a contract rather than a measured system;
single-node prototype; denylist scanning acknowledged but unquantified.
Required: clarify what breaks when a live LLM replaces the mock (which
guarantees survive: input allowlist, no-egress boundary at the proxy, output
scan; which weaken: determinism, hash reproducibility). Questions: can the
receipt be made externally verifiable (third-party countersignature)?

**Reviewer B — banking/governance. Leaning: weak accept.**
Strengths: rigorous non-claim discipline rare in this space; explicit
regulatory non-claims. Weaknesses: "Banking Shield" name invites
misreading; scenarios are stylised. Required: keep the name but front-load the
fictional framing in §1; add a paragraph on why metadata-only evidence might
matter to auditors _as a pattern_ without claiming compliance value.

**Reviewer C — HCI/usability. Leaning: borderline.**
Strengths: honest formative framing; the inverted-warning angle
(comprehension of non-claims) is genuinely interesting. Weaknesses: n=5
insiders; the interpretability iteration is anecdotal; no comprehension
instrument validation. Required: present Phase B strictly as formative,
move comprehension counts to a clearly labelled exploratory table, and state
the rerun (n=3) cannot establish improvement. (Draft already does the first
two; the third was tightened in Pass 12.)

**Reviewer D — AI safety. Leaning: accept (as a pattern paper).**
Strengths: claim-discipline-as-mechanism; the two-layer enforcement anecdote
(runtime + CI flagging its own denylist) is a memorable, honest detail;
fail-closed bias means false positives block. Weaknesses: negation handling is
a 16-char window heuristic — adversarial phrasing will evade a denylist;
no red-team pass against the scanner. Required: state denylist incompleteness
as a limitation (present) and propose allowlist-template generation as the
stronger future guarantee (added in Pass 12).

**Disposition:** all four reviews actionable; fixes applied in Pass 12 where
they did not require new experiments; the rest recorded as future work.

**Rubric:** all 8 criteria PASS.

---

## Pass 12 — Final polish

Applied to v0.1 in place: front-loaded fictional framing in §1 (Reviewer B);
added live-provider survival analysis to Design discussion (Reviewer A);
explicitly marked the B3c rerun as unable to establish improvement
(Reviewer C); added allowlist-template future work (Reviewer D). No claims
changed; no facts added beyond the input pack; non-claims and limitations
preserved verbatim.

**Rubric:** all 8 criteria PASS.

---

## Log integrity note

No pass was scored REJECTED. No pass requested data outside
`MODEL_ALLOWED_INPUTS.md`. All factual statements trace to the input pack.
