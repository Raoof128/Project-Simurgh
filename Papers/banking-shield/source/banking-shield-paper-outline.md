# Banking Shield Paper — Outline (Pass 9)

Target shape: 10–12 page systems/privacy paper (USENIX-style budget).
Thesis (X better for Y in Z): **Structural, fail-closed metadata firewalls
with machine-enforced claim discipline are better than content-level filtering
for adding AI-style explanations to privacy-sensitive research prototypes.**

| §   | Section (pages)                 | Section-level claim                                                                                                                              | Evidence binding (input pack) | Forbidden overclaims to avoid here                        |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | --------------------------------------------------------- |
| 0   | Abstract (0.25)                 | Prototype + firewall + dry run + limitations, 5 sentences, mock provider declared.                                                               | §1–§5                         | Any capability claim; "protects".                         |
| 1   | Introduction (1.5–2)            | Gap G1: explanation layers leak; G2: overclaims are unpoliced; G3: absence of data is rarely evidenced. Contributions C1–C4 map to §4–§6.        | §1, §6, §7                    | Real banking protection; the name must be defused in ¶1.  |
| 2   | Background & Motivation (1–1.5) | Banking-adjacent flows need evidence of what was NOT collected; observations O1–O3 from Phase A/B aggregates.                                    | §2, §3                        | Fraud/scam vocabulary outside non-claims.                 |
| 3   | Threat model (0.5–1)            | Assets A1–A5, threats T1–T7, trust assumptions, residual risks.                                                                                  | Pass 5 log                    | Tamper-_proof_; absolute safety.                          |
| 4   | Design (3–3.5)                  | C1 metadata-only architecture; C2 deterministic AI privacy firewall; C3 claim discipline as mechanism; alternatives discussed per choice.        | §2, §4                        | "Verifies payees"; calibrated alerting; live-LLM results. |
| 5   | Implementation (0.5)            | Node/Express prototype; in-memory store; gates as code.                                                                                          | §1, §5                        | Production readiness.                                     |
| 6   | Evaluation (2.5–3)              | E1 gate results (T3); E2 Phase B formative dry run (T2, exploratory); E3 fixture studies (accepted + rejected-claim); each conclusion stated 3×. | §3, §4, §5                    | Statistical claims from n=5; effectiveness claims.        |
| 7   | Limitations (0.5)               | Mock provider; n=5 insiders; denylist incompleteness; self-graded gates; single node; server-trusted chain.                                      | Pass 3, 4, 11 logs            | Softening any of these.                                   |
| 8   | Related work (1)                | Seven categories, grouped by approach; `[CITATION NEEDED]` until verified.                                                                       | Pass 6 log                    | Unverified citations.                                     |
| 9   | Conclusion (0.25)               | Three sentences: hypothesis, approach, key result.                                                                                               | all                           | Future-tense capability promises.                         |

Figures F1–F4 and tables T1–T5 per Pass 7 (`figures/README.md`,
`tables/README.md`).

Contribution list (Pattern 3, each maps to a section):

- **C1** A metadata-only integrity-evidence architecture whose rejections are
  themselves evidence (§4.1, eval §6.1).
- **C2** A deterministic, offline, fail-closed AI privacy firewall with
  per-response privacy receipts and a statically proven no-egress property
  (§4.2, eval §6.1, §6.3).
- **C3** Machine-enforced claim discipline: negation-aware overclaim blocking
  at runtime and in CI (§4.3, eval §6.3).
- **C4** A verifiable participation lifecycle (consent, withdrawal, HMAC audit
  chains, aggregate-only human evidence) exercised in a formative internal dry
  run (§4.4, eval §6.2).
