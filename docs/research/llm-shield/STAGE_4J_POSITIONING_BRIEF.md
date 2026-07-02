# Stage 4J PCTA — Positioning Brief: Complementary to Anthropic's Fable 5 Safeguards

> **Status: DRAFT companion brief for Stage 4J (PCTA).** This is positioning material, not part of the executable plan. Two things must happen before any external / Anthropic-facing use:
>
> 1. **Citations & incident facts are NOT yet independently verified** — the June 2026 Fable 5 / Mythos 5 dates, the outlet corroboration in §13, and arXiv 2501.18837 / 2605.24248. See the **Verification checklist** at the end. The method note's hedge is deliberate; do not drop it.
> 2. **The §10 "Measured" column is filled by the Stage 4J executing agent** from the real J5 reproduce run (`scripts/reproduce-llm-shield-stage4j.sh` + `docs/research/llm-shield/evidence/stage-4j/p-gate-results.json`). Until Stage 4J is built it stays `⏳ pending`. Fabricating those numbers would fail PCTA's own T1–T7.

---

> **Thesis (one sentence).** Anthropic's Fable 5 safeguards and Simurgh's PCTA are **not competitors** — they occupy **different cells of the same defense-in-depth stack**: Anthropic stretches an _inline, probabilistic content classifier_ to stop a jailbroken model from **producing** dangerous knowledge; PCTA adds an _offline, deterministic authority attestation_ that proves a jailbroken or prompt-injected agent never **acted** on authority it shouldn't have — and proves it to a hostile reviewer **without blocking anything**. One governs _what the model says_; the other governs _what the agent is allowed to do_.

**Executive summary.** In June 2026 the US government briefly export-controlled Anthropic's Fable 5 and Mythos 5 after a reported safeguard bypass; access was restored on 30 June once Anthropic tightened its safety classifier and proposed an industry jailbreak-severity framework (corroborated by CNBC, BBC, NBC, The Hacker News, Fortune, and the White House — see §13). The episode cleanly marks where frontier safeguards are strong and where they are silent. **Anthropic's control is an inline, probabilistic content classifier that governs _what a model may say_. Simurgh's PCTA is an offline, deterministic, adversary-verifiable attestation that governs _what an agent was allowed to do_.** They are complementary layers of one defense-in-depth stack (§7), not competitors: PCTA occupies the agentic-authority cell that a content classifier and a severity rubric do not reach.

## Context — the June 2026 Fable 5 / Mythos 5 episode

_(Dates/outlets pending verification — see banner.)_

- **Launch & split (9 Jun 2026).** Anthropic released Fable 5 and Mythos 5 — one underlying model, with Fable 5 under strong safeguards for general use and Mythos 5 (its strongest cyber model) limited to Project Glasswing defensive-security partners.
- **Suspension (12 Jun 2026).** A Commerce Department export-control directive (Secretary Howard Lutnick) followed a partner-reported Fable 5 bypass; because it barred all foreign-national access, Anthropic suspended both models for everyone (Fortune).
- **Restoration (26–30 Jun 2026).** Commerce cleared a limited Mythos 5 re-release to US critical-infrastructure organizations (NBC News), then lifted the Fable 5 controls on 30 June (CNBC; BBC).
- **Anthropic's account.** The bypass elicited routine vulnerability-finding that weaker models (Opus 4.8, GPT-5.5, Kimi K2.7) could also produce; Anthropic trained a new classifier blocking it in >99% of cases (Redeploying Fable 5; The Hacker News).

> **Why it matters here:** the entire incident concerns _what the model produced_ (vulnerability knowledge). It says nothing about _what an agent was authorized to do_ with a tool — the surface PCTA addresses.

## 1. What Anthropic does — the "safety-margin stretch"

From the Redeploying Fable 5 post (Jun 30, 2026):

- Inline **classifiers** detect potentially harmful cyber requests/outputs and **block** the model at inference time.
- A deliberately **widened "safety margin"** — for Fable 5, larger than any prior launch — over-blocks _probably-benign_ requests so that fewer genuinely harmful ones slip through.
- Purpose: absorb **minor jailbreaks** (ones that only nibble into the margin) and reinforce **defense-in-depth**.
- Conceded costs, in their own words: classifiers **can be jailbroken**; the margin generates **false positives** on benign coding/debugging; and it is **"probably impossible to make any model fully robust."**
- The classifier is the production lineage of Anthropic's Constitutional Classifiers research (arXiv 2501.18837 — _pending verification_), which documents the same robustness-for-overrefusal tradeoff (a reported ~0.38% refusal-rate increase for large robustness gains).
- Paired with a proposed **four-criteria jailbreak-severity framework** — _capability gain · breadth · ease of weaponization · discoverability_ — explicitly modeled on CVSS and developed with Amazon, Microsoft, and Google, alongside independent testing (CAISI, HackerOne, government pre-release access) (AI Weekly).

> The mechanism is a **conservative threshold shift**: trade precision (accept more false positives) for recall (miss fewer attacks), and lean on layering to catch what leaks.

## 2. What PCTA does — "attest, don't own"

- PCTA does **not** dispatch or block tools — the host runtime performs allow/deny. It is an **offline, third-party-reproducible attestation** that, per tool call, (1) enforcement was required, (2) a valid signed authority proof accompanied the action, (3) **untrusted context never became authority**, and (4) the host **recorded applying exactly the authorized action** (`recorded_allowed`, not proof of execution).
- Every check is a **deterministic recompute** of cryptographic digests and proofs against a signed evidence pack — not a probabilistic judgment.
- It ships with a **reviewer recompute path (T1–T7): "you do not need to trust us; run these things."**

## 3. Two design points, side by side

> This table characterizes two deliberate design choices at different layers — it is **not a scorecard**. Each system is optimized for a different object (model output vs. agent authority), so "which is better" is not a well-posed question.

| Axis                    | Anthropic safety-margin classifier                           | Simurgh PCTA                                                     |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Layer / timing**      | Inline, at inference                                         | Post-hoc, offline                                                |
| **Action**              | Prevents — blocks the response                               | Attests / detects — host owns dispatch                           |
| **Decision basis**      | Probabilistic classifier judgment                            | Deterministic recompute of digests + proofs                      |
| **Tunable?**            | Yes — margin width is a dial                                 | No dial — binary hold / fail                                     |
| **Robustness model**    | Hardened against jailbreaks; residual risk acknowledged      | No classifier surface to jailbreak; decidable property           |
| **False-positive cost** | Real — blocks benign work                                    | Zero — never blocks anything                                     |
| **Verifiability**       | Validated via vendor + government testing (CAISI, HackerOne) | Adversary re-runs it offline (T1–T7)                             |
| **Threat object**       | Model _knowledge / output_ (e.g. exploit generation)         | Tool-_action_ authority provenance + applied-action faithfulness |
| **Failure posture**     | Degrades if the classifier is bypassed                       | Fail-closed (unknown → run-level 3)                              |
| **Trust root**          | Self-contained — no host cooperation needed                  | Assumes host enforces + honest reviewer runtime                  |

## 4. Where we are aligned (same direction)

- **Defense-in-depth as doctrine.** Both accept no single layer is perfect; both add layers rather than chase an impossible "fully robust" model.
- **Independent verifiability as the destination.** Their post repeatedly asks for safeguards that can be _independently tested_ (CAISI, HackerOne, government pre-release). PCTA's entire design is _adversary-recomputable_ — that is what "independently tested" means operationally.
- **Shared-standard ambition.** Their four-criteria severity framework and "common industry bar" want a _portable, objective_ way to reason about risk. A per-run, deterministic attestation is a natural evidentiary primitive underneath such a standard.

## 5. Where PCTA is a different _kind_ of guarantee

- **Deterministic, not probabilistic.** A recompute either holds or it doesn't — no threshold to tune, no margin to widen.
- **Nothing to jailbreak.** A classifier is a model you can trick; PCTA is arithmetic over evidence. Their conceded failure mode is structurally absent for PCTA's property.
- **Zero false-positive tax.** They _explicitly pay_ friction (blocked benign coding) to widen the margin. PCTA never blocks — assurance without a benign-work tax.
- **Adversary-verifiable, not vendor-attested.** "Run T1–T7 yourself" is a stronger epistemic class than "we tested it, trust us."
- **Falsifiable per gate.** One explicit falsifier per check (P0–P8); a classifier verdict is not falsifiable in that sense.

## 6. Honest boundaries — what PCTA does **not** do

> Stated up front so the brief survives a hostile reviewer.

- **It would not have caught the Fable 5 bypass.** That was _content/knowledge_ generation (finding vulns, writing exploit code) — model-output safety, explicitly **outside** PCTA's scope. On that specific threat, the classifier is the only relevant control.
- **Detective, not preventive.** PCTA _detects_ a bad action post-hoc; it does not _stop_ one inline. To halt a live attack, inline blocking is strictly better.
- **It assumes a cooperating host + honest reviewer runtime.** PCTA attests that enforcement held; it does not itself perform enforcement, and it cannot see execution-truth or the host's internal flow graph (deferred closers: zkTLS/DECO for applied-action reality, attested runtime for internal-flow reality).
- **The determinism is bought by scope.** PCTA is deterministic only because it checks a _decidable_ property (did untrusted context become authority; does applied match authorized). "Is this exploit code dangerous?" is not decidable that way — which is exactly why the probabilistic classifier still has to exist.

## 7. How they compose — the joint stack

1. **Model training** — decline overtly dangerous requests.
2. **Inline classifier + safety margin** — block harmful _content generation_. ← _Anthropic's stretch_
3. **Host runtime** — allow / deny tool dispatch. ← _host owns this_
4. **PCTA attestation** — offline, deterministic, adversary-verifiable proof that layer 3 enforced **clean-provenance authority** and recorded applying **exactly** what was authorized. ← _Simurgh_
5. **Deferred closers** — zkTLS/DECO (applied-action reality), attested runtime / TEE-eBPF (internal-flow reality).

**The two are orthogonal, not overlapping.** Their severity framework answers _"how bad could this class of bypass be?"_ PCTA answers _"did enforcement actually hold on this run?"_ Severity scoring triages the population of bypasses; PCTA produces a per-run integrity receipt for the agentic-authority cell the classifier never touches.

## 8. The line for Anthropic

> Not _"a better safeguard."_ Rather: **a different, harder-to-fake, friction-free class of guarantee — deterministic and adversary-verifiable — for the agentic-authority cell that a probabilistic content classifier and a severity framework do not cover.** Your own post makes the case for it: classifiers are jailbreakable, margins cost false positives, and full robustness is impossible. An independent, non-blocking, deterministic attestation of _what the agent was allowed to do_ is the layer that gets stronger precisely where the classifier admits it is weakest.

## 9. Coverage matrix — who covers what (the honest "side-by-side")

> **Why this, and not a scored head-to-head.** A "PCTA 100% vs classifier 60%" benchmark would be a _category error_ — the two operate on different inputs (content-harm vs authority-provenance), so a shared score is meaningless; we also have no honest numbers for their classifier and Stage 4J isn't built yet (inventing figures = fabrication). The matrix instead **demonstrates complementarity per scenario**.

| Threat scenario                                                        | Anthropic classifier         | Host runtime  | Simurgh PCTA                                                    |
| ---------------------------------------------------------------------- | ---------------------------- | ------------- | --------------------------------------------------------------- |
| Model **generates** exploit code / vuln knowledge                      | **Blocks inline** (in scope) | —             | Silent — out of scope                                           |
| Prompt-injected agent **acts** with authority from untrusted context   | Not its object               | May allow     | **Rejects — `34`** (killer invariant)                           |
| Tool executed with **no authorization proof**                          | Not its object               | Owns dispatch | **Detects — `31` / `35`**                                       |
| Authorized action **swapped before apply** ("said bob, sent attacker") | No                           | Depends       | **Detects — `35`** (applied-action reality closer = zkTLS/DECO) |
| **Replayed / stale** authorization within the pack                     | No                           | Depends       | **Rejects — `33`**                                              |
| **Forged / unpinned-key** signature on the proof                       | No                           | No            | **Rejects — `32`**                                              |
| High-consequence action **under-declared** `authority_sink:false`      | No                           | No            | **Flags — `38`** (P8, partial)                                  |
| Enforcement **required but not applied**                               | No                           | —             | **Detects — `36`**                                              |

**Read of the matrix:** row 1 is the classifier's cell alone — PCTA is honestly silent. Every other row is the _agentic-authority_ cell the classifier never touches. That is the whole pitch in one table: **non-overlapping coverage, not a contest.** (Code mappings match the exit ledger §0.3 of the plan.)

## 10. Deterministic reviewer harness — "run it yourself, get these results"

Because every PCTA check is a recompute (not a judgment), its outcomes are **fixed and reproducible** — a hostile reviewer runs the harness and gets exactly these exits. This is the honest analogue of a benchmark: not a score we assert, but a result _they_ reproduce.

| Reviewer test / gate                       | Fixture                             | Expected raw → typed | Deterministic? | Measured (J5 reproduce) |
| ------------------------------------------ | ----------------------------------- | -------------------- | -------------- | ----------------------- |
| T1 / P0 · clean authorized call            | `clean-authorized.json`             | `0 → 0`              | Yes            | ⏳ pending build        |
| T2 / P1 · strip the proof                  | `missing-proof.json`                | `31 → 1`             | Yes            | ⏳ pending build        |
| T3 / P2 · corrupt / unpinned signature     | `forged-sig.json`                   | `32 → 1`             | Yes            | ⏳ pending build        |
| T4 / P3 · replay stale proof               | `stale-proof.json`                  | `33 → 1`             | Yes            | ⏳ pending build        |
| T5 / P4 · authority from untrusted context | `untrusted-authority.json`          | `34 → 1`             | Yes            | ⏳ pending build        |
| T6 / P5 · applied ≠ authorized action      | `action-mismatch.json`              | `35 → 1`             | Yes            | ⏳ pending build        |
| P6 · enforcement required, not applied     | `enforcement-gap.json`              | `36 → 1`             | Yes            | ⏳ pending build        |
| P7 · intent / policy digest mismatch       | `digest-mismatch.json`              | `37 → 1`             | Yes            | ⏳ pending build        |
| T7 / P8 · under-declared authority sink    | `authority-sink-underdeclared.json` | `38 → 1`             | Yes            | ⏳ pending build        |

> The **Measured** column is intentionally empty until Stage 4J's J5 one-command reproduce runs — it will be filled with the observed exit, the byte-stable golden hash, and wall-clock timing from the actual harness. We do not pre-populate it: an attestation project that fabricates its own benchmark row would fail its own T1–T7. What _is_ already asserted (the Expected column) is fixed by the exit-code ledger §0.3 of the plan.

## 11. Why now — the policy & standards demand signal

_(Policy citations pending verification — see banner.)_ Regulators and industry are actively asking for PCTA's category of evidence — verifiable, agent-level security assurance:

- **Executive Order "Promoting Advanced Artificial Intelligence Innovation and Security" (2 Jun 2026)** establishes a voluntary review framework for "covered frontier" models and an interagency **AI cybersecurity vulnerability clearinghouse** (White House; Holland & Knight).
- **NIST/CAISI RFI, "Mitigating Risks of AI Agent Systems" (Jan 2026)** explicitly seeks methodologies to **measure** secure development and deployment of agentic systems (CAISI RFI) — PCTA is a concrete candidate primitive.
- **CISA + allied "Careful Adoption of Agentic AI Services" (May 2026)** — first multinational agentic-AI security guidance (CSA summary).
- Anthropic's own severity framework seeks a **portable, objective** measure (a "CVSS for jailbreaks"); a per-run attestation is a natural evidentiary complement to it.

> **Honest positioning.** These signals concern _agentic_ security and measurement — PCTA's lane. They are **not** the content-jailbreak severity that the Fable 5 framework scores. Keep the two distinct when citing them.

## 12. Better together — the case for Anthropic shipping both

Adopting both is not two isolated tools; it is a **single, legible security story** stronger than the sum of its parts:

- **Closes the layer the classifier admits it cannot.** Their own post concedes classifiers are jailbreakable and full robustness is impossible. Pairing a probabilistic content filter with a deterministic authority attestation means a bypass of one layer is not a bypass of the system.
- **Turns "trust us" into "run it yourself."** The classifier is vendor + government tested; PCTA is adversary-recomputable. Shipping both lets Anthropic tell CAISI, HackerOne, and regulators: _here is a safeguard you can independently reproduce_.
- **No new friction tax.** PCTA never blocks; it adds assurance without widening the safety margin or increasing benign-work false positives.
- **Feeds the severity framework.** Severity scoring triages _how bad a class of bypass is_; PCTA records _whether enforcement actually held on a run_. Together they give a portable, evidence-backed story.
- **Composable, not invasive.** PCTA sits post-hoc and offline over a signed evidence pack — it does not touch the inference path or require re-architecting the classifier.

> **The pitch in one line:** keep your classifier doing what it does best — governing model output — and add a deterministic, non-blocking, adversary-verifiable attestation for the agent-authority layer it was never meant to cover, so the combined stack is both _harder to bypass_ and _easier to prove_.

**Honest framing note.** PCTA is pre-build (Stage 4J). The near-term ask is not "deploy in production today" but "adopt the joint architecture and run the reviewer harness (§10)"; production numbers follow the J5 reproduce.

## 13. Sources

**The episode**

- Anthropic — Redeploying Fable 5 · Fable 5 & Mythos 5 launch
- CNBC · BBC · NBC News · The Hacker News · Fortune · Security Boulevard

**Framework & safeguards**

- Anthropic — Constitutional Classifiers (arXiv 2501.18837) · Collaboration with US CAISI & UK AISI
- AI Weekly — cross-lab jailbreak rubric

**Policy & standards**

- White House EO (2 Jun 2026) · DLA Piper analysis · Holland & Knight analysis
- NIST CAISI · CAISI agentic-AI RFI · CISA/CSA agentic guidance
- Project Glasswing

---

## Verification checklist (must clear before external / Anthropic-facing use)

- [ ] **Incident facts (§Context, §13).** Confirm the 9 Jun launch/split, 12 Jun suspension, 26–30 Jun restoration, and the CNBC/BBC/NBC/Hacker News/Fortune corroboration against primary sources. Memory records Jun-12 lockdown / Jun-18 severity framework / Jun-26 Lutnick as web-verified 2026-06-27; the day-level dates here are finer and unconfirmed.
- [ ] **arXiv 2501.18837 (Constitutional Classifiers)** — confirm title, authors, and the ~0.38% refusal-rate figure.
- [ ] **arXiv 2605.24248 (MCP attested tool-admission)** — the one reference still unverified across the whole PCTA effort; verify or drop before publication.
- [ ] **§9/§10 P-gate numbering.** Reason-codes (31–38) match the plan's exit ledger §0.3 exactly. Reconcile the P-*number*↔code labels (P1..P8 here) against the plan's actual P0–P8 gate definitions and gate order (P4-pre→P1→P2→P3→P7→P4→P8→P5→P6) so a reviewer reading both docs hits no contradiction.
- [ ] **§10 Measured column** filled by the Stage 4J executing agent from the real J5 reproduce (see banner).

_Method note: incident facts above are corroborated by multiple independent outlets (see §13), not a single company post; names and dates are as reported as of 2 Jul 2026 and pending independent verification. The broader academic positioning (FIDES, classic Proof-Carrying Authorization, MCP admission) and its citation hygiene live in the consolidated PCTA plan; one reference (arXiv 2605.24248) remains to be independently verified before external use._
