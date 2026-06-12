# Banking Shield: Metadata-Only Integrity Evidence and a Deterministic AI Privacy Firewall for a Banking-Adjacent Research Prototype

**Version 1.0 — 2026-06-12.** Full paper produced by Stage B5-D from draft
v0.1, the reviewer-simulation fix list, and citation verification via an
academic search gateway (verified citations carry DOIs; categories without a
verified source retain explicit `[CITATION NEEDED]` markers — none are
invented). All facts trace to the Stage B5 evidence pack (repo `main` @
`92dabb4`). This paper makes no fraud-detection, scam-prevention,
payment-safety, payee-verification, financial-advice, compliance, or
production-readiness claims. Substantial LLM assistance was used in drafting
and is disclosed in §10.

---

## Abstract

Research prototypes that touch banking-adjacent workflows face a double bind:
they must demonstrate integrity to participants, yet any data they collect —
and any AI-generated explanation they emit — creates privacy and overclaim
risk. Existing approaches moderate AI output behaviourally, leaving open what
the explanation layer received, where its output travelled, and what it was
allowed to claim. We present Banking Shield, a fictional banking-adjacent
research prototype whose central design inversion is to treat _evidence of
absence_ — proof that sensitive data was never recorded and never reached the
explanation layer — as the deliverable. Banking Shield combines a fail-closed
metadata firewall whose rejections are themselves audit evidence, per-session
tamper-evident HMAC audit chains with participant withdrawal semantics, and a
deterministic, offline AI privacy firewall: an allowlist input contract, a
deterministic mock narrative provider (no live LLM), a negation-aware output
claim firewall, and a per-response privacy receipt, with a static gate proving
the absence of network primitives. At the evidence freeze, all automated
gates passed (417/417 unit tests; 43/43 end-to-end checks; 27/27 security
checks; three privacy audits), and a formative dry run with five trusted
internal testers completed 30 sessions with zero sensitive values in the
evidence and 5/5 comprehension of the system's non-claims. The prototype is
research-only and single-node; we state its limitations explicitly and argue
that structural, fail-closed enforcement with machine-checked claim
discipline is a reusable pattern for AI-assisted explanation in
privacy-sensitive settings.

## 1 Introduction

Banking Shield is a _fictional_ banking-adjacent research prototype: it has no
connection to any bank, processes no real financial data, and makes no
fraud-detection, scam-prevention, payment-safety, payee-verification,
financial-advice, or compliance claims. We state this before anything else
because the project's central contribution is precisely the machinery that
keeps such claims — and such data — out of the system.

Prototypes in sensitive domains usually argue safety by _policy_ ("we do not
collect X") and argue explanation quality by _behaviour_ ("the model rarely
says Y"). Three gaps follow:

- **G1 — Explanation layers leak by default.** An LLM-backed explanation
  feature typically receives the session record and emits free text; nothing
  structural prevents sensitive input or unbounded output.
- **G2 — Overclaims are unpoliced.** Nothing stops an explanation layer from
  asserting capabilities ("fraud detected") that the system does not have;
  in regulated-adjacent domains this is the costliest failure mode.
- **G3 — Absence of data is rarely evidenced.** Systems log what they did,
  not what they refused; a participant cannot verify that nothing sensitive
  was recorded.

Our thesis: **structural, fail-closed metadata firewalls with machine-enforced
claim discipline are better than content-level filtering for adding AI-style
explanations to privacy-sensitive research prototypes.** Contributions:

- **C1** A metadata-only integrity-evidence architecture: a recursive
  forbidden-field firewall (47 key names, including prototype-pollution keys)
  whose rejections are audit events that escalate subsequent policy scoring —
  refusals become evidence (§4.1).
- **C2** A deterministic, offline AI privacy firewall: allowlist input
  contract, deterministic narrative provider, fail-closed output claim
  firewall, per-response privacy receipt, and a statically proven no-egress
  property with a negative self-test (§4.2, Figure 3).
- **C3** Claim discipline as a mechanism: a negation-aware scanner that blocks
  affirmative capability phrasing while passing required disclaimers,
  enforced at runtime and mirrored by repository CI (§4.3).
- **C4** A verifiable participation lifecycle — consent, withdrawal, HMAC
  audit chains, aggregate-only human evidence — exercised in a formative
  internal dry run (§4.4, §6.2).

**Figure 1 — Banking Shield architecture.** _Every write passes the
forbidden-field firewall before validation; every export is token-bound and
chained. The system is metadata-only by construction (C1)._

```text
            Consent page        Scenario page          Report page
                 │                    │                     │
                 ▼                    ▼                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  Token layer (HMAC-SHA256, TTL, purpose/phase binding)  │
        └───────────────┬─────────────────────────┬───────────────┘
                        ▼                         ▼
        ┌────────────────────────────┐  ┌──────────────────────────┐
        │ Forbidden-field firewall   │  │ Exports: Report / Audit  │
        │ (47 names, depth cap,      │  │ / Verify / AI explanation│
        │  rejections → audit events)│  │ (withdrawal-gated)       │
        └───────────────┬────────────┘  └────────────┬─────────────┘
                        ▼                            │
        ┌────────────────────────────┐               │
        │ Deterministic policy       │               │
        │ scoring (enums only)       │               │
        └───────────────┬────────────┘               │
                        ▼                            ▼
        ┌─────────────────────────────────────────────────────────┐
        │  In-memory session store + per-session HMAC audit chain │
        │  (domain-separated keys; tamper-evident)                │
        └─────────────────────────────────────────────────────────┘
```

## 2 Background and Motivation

A Banking Shield session walks a participant through consent, one of five
fictional scenarios (a mock data-sharing consent screen, a mock payee-name
check, a remote-access caution, a payment-pause prompt, and an AI-agent
finance approval), and an export page offering a Report, an Audit listing,
a Verify check, and — behind a default-off flag — an AI-style explanation
(Figure 2). All scoring is a deterministic local function of enumerated
metadata; the "policy outcome" (safe/warning/critical) is a fictional
prototype output, not a calibrated alert.

**Figure 2 — Session lifecycle.** _Withdrawal blocks report and explanation
export (403) but preserves audit/verify reads for transparency (C4)._

```text
 consent ──► scenario submit ──► report / audit / verify / AI explanation
    │                                   ▲          ▲
    └────────► withdraw ────────────────┤          │
                 │            report: 403   audit/verify: still readable
                 └── explanation: 403
```

Three observations from the project's own evidence motivate the design:

- **O1.** Every class of sensitive input the project could imagine (47 field
  names: credentials, OTPs, account identifiers, amounts, payees, device
  telemetry, structural pollution keys) appeared _only_ in attack-style tests
  — and each was rejected and logged, suggesting refusal-as-evidence is
  mechanically achievable.
- **O2.** In the human dry run, all five testers understood the non-claims
  (5/5 on fictional-only, no-bank-connection, no-fraud-detection,
  no-financial-advice, withdrawal), but only one of five initially understood
  the Report/Audit/Verify exports — interpretability, not privacy, was the
  weak point, motivating an explanation layer. This echoes the broader
  finding that warning comprehension depends strongly on text characteristics
  and terminology (Lindell & Perry 2011,
  [doi:10.1111/j.1539-6924.2011.01647.x](https://doi.org/10.1111/j.1539-6924.2011.01647.x);
  Scherr et al. 2015,
  [doi:10.1002/acp.3195](https://doi.org/10.1002/acp.3195)).
- **O3.** The riskiest place to add that explanation layer is exactly where
  G1/G2 bite; hence the firewall-first design of §4.2.

**Table 1 — Allowed vs forbidden data (T1).**

| Allowed into the narrative payload (allowlist) | Forbidden everywhere (47-name denylist, classes) |
| ---------------------------------------------- | ------------------------------------------------ |
| Hashed session id                              | Credentials and one-time codes                   |
| Scenario type (enum)                           | Account/card/payment identifiers                 |
| User action/decision category (enum)           | Amounts, balances, payees, references            |
| Policy outcome + score (deterministic)         | Transaction/statement content                    |
| Manual-review flag (boolean)                   | Screens, recordings, keystrokes, clipboard       |
| Privacy-assertion booleans                     | Window titles, process/app names, device ids     |
| —                                              | `__proto__`, `prototype`, `constructor`          |

## 3 Threat Model

**Assets.** A1 sensitive banking payloads (must never enter); A2 audit-chain
integrity; A3 the claim boundary; A4 participant anonymity; A5 official
policy-result integrity.

**Table 2 — Threats and controls (T5).**

| Threat                                     | Controls                                                                                         | Asset |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----- |
| T1 Sensitive/polluted submission           | Recursive denylist firewall, depth cap, body cap, rejection audit events, score escalation       | A1    |
| T2 Provider exfiltration (future live LLM) | Allowlist input (hashed id, enums), 4 KB cap, static no-egress gate, deterministic mock provider | A1    |
| T3 Capability overclaim in narrative       | Output schema allowlist, length caps, negation-aware claim scan, fail-closed rejection           | A3    |
| T4 Narrative drifts official result        | Equality check against the authoritative record                                                  | A5    |
| T5 Audit-log tampering                     | Per-session HMAC chains, domain-separated keys; tampered fixtures fail verification              | A2    |
| T6 Token theft/replay                      | HMAC tokens, constant-time compare, TTL, purpose/phase binding, path/token match                 | A1,A4 |
| T7 Withdrawal bypass                       | Withdrawn → 403 on report/explanation; audit/verify intentionally readable                       | A4    |

**Trust assumptions and residual risks.** The server, its secrets, and
transport security are trusted; Phase B testers are trusted insiders. The
audit chain is tamper-_evident_, not tamper-proof: the server holds the keys —
a limitation shared by server-side secure-logging schemes generally, which
motivates third-party or distributed verification in that literature (Sree &
Bhanu 2019, [doi:10.1002/cpe.5143](https://doi.org/10.1002/cpe.5143); Ali et
al. 2021, [doi:10.1002/ett.4272](https://doi.org/10.1002/ett.4272)). Denylist
scanning is incomplete by construction. Receipts attest process, not ground
truth. Withdrawal does not erase the metadata-only audit chain — by design
and disclosed. Out of scope: DoS beyond rate limiting, side channels, browser
compromise, a malicious operator.

## 4 Design

### 4.1 Metadata-only integrity evidence (C1)

Every write is filtered by a recursive forbidden-field firewall before
validation: 47 forbidden key names spanning credentials, financial
identifiers, content fields, device telemetry, and the structural pollution
keys `__proto__`/`prototype`/`constructor`, with a recursion depth cap and a
16 KB body limit. A rejected attempt is not silently dropped: it appends a
rejected-attempt audit event (route, reason, field name — never the value)
and escalates the session's subsequent policy scoring. This operationalises
the data-minimisation principle — collect only what the stated purpose
requires (Klein et al. 2021,
[doi:10.1111/1911-3846.12735](https://doi.org/10.1111/1911-3846.12735);
Yeung & Bygrave 2021,
[doi:10.1111/rego.12401](https://doi.org/10.1111/rego.12401)) — as an
enforced, evidence-producing mechanism rather than a policy statement; no
compliance property is claimed or implied. _Alternative considered:_
schema-level allowlisting alone — rejected because an allowlist validates
shape but does not produce evidence of hostile attempts; the denylist layer
converts attacks into auditable signal. Both are used.

### 4.2 The deterministic AI privacy firewall (C2)

**Figure 3 — The AI privacy firewall (page-one figure candidate).** _The
no-egress boundary is statically proven; every stage fails closed to a
receipt, never to a narrative (C2)._

```text
   session record (authoritative)
        │ allowlist build (hashed id + enums only)
        ▼
 ┌─────────────────── statically proven no-egress boundary ──────────────────┐
 │  INPUT FIREWALL ──► DETERMINISTIC PROVIDER ──► OUTPUT CLAIM FIREWALL      │
 │  re-scan denylist     enum→template,            schema allowlist,         │
 │  4 KB byte cap        no rand/clock/I-O         600-char caps,            │
 │      │ fail                  │                  negation-aware claim scan,│
 │      ▼                       │                  official-result equality  │
 │   receipt (422)              │                      │ fail                │
 └──────────────────────────────┼──────────────────────┼────────────────────┘
                                ▼                      ▼
                     narrative + receipt (200)    receipt (422)
                                │
                                └── SHA-256 narrative hash → audit chain
```

The explanation pipeline has four fail-closed stages:

1. **Input firewall.** The narrative payload is _constructed_, not passed
   through: a hashed session id, scenario/action enums, the policy outcome,
   and the privacy-assertion booleans. The assembled payload is re-scanned
   against the forbidden-field denylist (defence in depth) and capped at
   4 KB. Failure returns a receipt, never a narrative.
2. **Deterministic provider.** Narrative text is an enum→template pure
   function: no randomness, no clock, no I/O. A static no-egress gate proves
   the four firewall modules import no network primitive, and a negative
   self-test confirms the gate fails when a network primitive is injected.
3. **Output claim firewall.** The narrative must match an exact top-level
   schema (field allowlist), respect 600-character caps per field, contain a
   non-empty non-claims list, and pass a negation-aware scan over 28
   affirmative-capability phrasings; an equality check proves the narrative
   did not drift the official result.
4. **Privacy receipt.** Every response — success, blocked, or disabled —
   carries a receipt: provider identity (`deterministic_mock`),
   `sensitive_payload_sent_to_ai:false`, `network_egress_used:false`,
   official-result and claim-guard flags, and a success-only SHA-256
   narrative hash that is also written into the session's audit chain.

_Alternative considered:_ a live LLM behind the same firewall. Rejected for
this work: it would convert the no-egress property from statically provable
to operationally asserted. **What survives a future live provider:** the
input allowlist, the byte cap, the output schema and claim scan, and the
receipt mechanism are provider-independent; what is lost is determinism and
reproducible narrative hashing, which would need replay logging instead. The
mock therefore establishes the _contract and enforcement points_, which is
the claim we make — not that a live model has been filtered.

### 4.3 Claim discipline as a mechanism (C3)

The output firewall's scanner is negation-aware: required disclaimers ("not
fraud detection", "not a fraud detection tool" — one determiner permitted
after the negator) pass, while affirmative phrasing and weakened negation
("not really a …") are blocked. The bias is fail-closed: a false positive
blocks a narrative; no false negative class is claimed. The same boundary is
enforced a second time in repository CI by an overclaim-wording scanner —
which, notably, flagged the firewall's own denylist during integration (the
denylist literally contains the phrases it blocks) and was resolved by an
explicit scanner exclusion rather than string obfuscation. Claim discipline
is thus testable at two independent layers.

### 4.4 Verifiable participation lifecycle (C4)

Each session carries an HMAC-SHA256 audit chain with domain-separated keys
(participant-code hashing and chain signing cannot be cross-validated).
Participants can export their Report (whose privacy assertions are all
`false` — nothing sensitive recorded), the Audit listing, and a Verify check
of chain consistency. Withdrawal blocks report and explanation export but
intentionally preserves audit/verify reads. Human evidence is aggregate-only
by construction.

**Table 3 — Claims vs non-claims (T4).**

| The paper claims                                       | The paper does NOT claim                    |
| ------------------------------------------------------ | ------------------------------------------- |
| Metadata-only integrity evidence (about the process)   | Fraud detection or scam prevention          |
| A fictional banking-adjacent prototype                 | Real banking protection or payment safety   |
| A trusted internal dry run (formative)                 | Real payee verification or financial advice |
| A deterministic AI privacy firewall (contract + gates) | CDR/APRA/AML/CTF compliance                 |
| AI-style explanation without sensitive payloads        | Production readiness or bank-grade security |

## 5 Implementation

Node.js/Express; static HTML/CSS/JS tester pages with `textContent`-only DOM
writes in the explanation panel; an in-memory session store; shell/Node CI
gates. The explanation endpoint is behind a default-off flag requiring the
exact string `"true"`, is token-bound, path-matched, and read-rate-limited.
The prototype is single-node and research-only.

## 6 Evaluation

We evaluate three questions: does the structural machinery hold under its own
gates (E1); can trusted humans complete and comprehend the lifecycle (E2);
and does the claim firewall block what it must while passing what it must
(E3)? Figure 4 shows how evidence flows from gates to this paper.

**Figure 4 — Evidence pipeline.** _Every claim in this paper traces to a
gate, fixture, or frozen aggregate (E1–E3)._

```text
 unit tests ─┐
 smoke gates ─┤
 security audit ─┼──► generated, attack-scanned fixtures ──► frozen evidence
 privacy audits ─┤         (accepted + rejected-claim)         pack @ 92dabb4
 no-egress gate ─┘                                                  │
 Phase B aggregate JSON (aggregate-only) ───────────────────────────┤
                                                                    ▼
                                                              this paper
```

### 6.1 Gate results (E1)

_Hypothesis:_ all structural properties are mechanically checkable. _Result:_
at the evidence freeze, every automated gate passed (Table 4). _(Table 4:
every gate green at freeze — the claim is about gates, not about the world.)_

**Table 4 — Gate results at evidence freeze (T3).**

| Gate                       | Result                                   |
| -------------------------- | ---------------------------------------- |
| Unit tests                 | 417/417 pass                             |
| Banking smoke              | 14/14 pass                               |
| AI firewall smoke          | 5/5 pass                                 |
| Full banking E2E smoke     | 43/43 pass (incl. tamper-evidence check) |
| Banking security audit     | 27/27 pass                               |
| Banking privacy audits     | all 3 PASS                               |
| No-egress static gate      | PASS (with negative self-test)           |
| Dependency audit           | 0 vulnerabilities                        |
| Repository CI quality gate | green                                    |

### 6.2 Formative internal dry run (E2, exploratory)

_Hypothesis:_ trusted insiders can complete the lifecycle and understand the
non-claims. _Result:_ five trusted internal testers completed 30 sessions
(Table 5). Zero real banking values were entered; zero sensitive values were
found in evidence; the deterministic policy pattern reproduced identically
across testers (safe/warning/warning/warning/safe across the five scenario
types); all five withdrawals blocked subsequent report export; and
comprehension of all five non-claim checks was 5/5. Export interpretability
was the weak point (1/5 pre copy-patch); a focused 3-session rerun confirmed
the revised copy but **cannot establish improvement** — we report it as a
design iteration. This is a formative dry run with n=5 trusted insiders, not
a user study; no generalisation is claimed. _(Table 5: the dry run evidences
lifecycle completion and non-claim comprehension, nothing more.)_

**Table 5 — Phase B aggregates (T2, exploratory).**

| Measure                                  | Value                           |
| ---------------------------------------- | ------------------------------- |
| Trusted internal testers                 | 5                               |
| Total sessions                           | 30                              |
| Submitted scenario sessions              | 25 (5 per scenario)             |
| Withdrawal sessions                      | 5                               |
| Withdrawals blocking later report export | 5/5                             |
| Real banking values entered              | 0                               |
| Sensitive values found in evidence       | 0                               |
| Forbidden payload structures in evidence | 0                               |
| Comprehension: fictional-only            | 5/5                             |
| Comprehension: no bank connection        | 5/5                             |
| Comprehension: no fraud detection        | 5/5                             |
| Comprehension: no financial advice       | 5/5                             |
| Comprehension: withdrawal                | 5/5                             |
| Export interpretability (pre copy-patch) | 1/5 (design iteration followed) |

### 6.3 Fixture studies (E3)

_Hypothesis:_ the output firewall passes a clean narrative and blocks a
poisoned one. _Result:_ the accepted-explanation fixture (clean generated
narrative with receipt) passes all gates and contains no attack values; the
rejected-claim fixture — a deliberately poisoned narrative asserting a
detection capability — is blocked by the claim guard with the failed gate
recorded in its receipt. _(Fixture pair: one accepted, one rejected, both
attack-value-scanned — the firewall's two required behaviours, demonstrated.)_

## 7 Limitations

(1) The narrative provider is a deterministic mock; no live LLM has been
filtered. (2) n=5 trusted insiders; no statistical claims. (3) Denylist claim
scanning is incomplete by construction; adversarial phrasing can evade it.
(4) The gates are written by the project they validate; mitigated by negative
self-tests and full public reproducibility, not eliminated. (5) Single-node,
in-memory prototype. (6) The audit chain is server-keyed: tamper-evident to
participants, not tamper-proof against the operator.

## 8 Related Work

Grouped by approach. Citations below were verified through an academic search
gateway and carry DOIs; categories for which no source could be verified in
the available corpus retain explicit markers.

**Tamper-evident logging.** Secure-logging schemes protect log integrity and
authenticity with hash chains, MACs, and related structures, and survey the
limits of server-trusted designs (Sree & Bhanu 2019,
[doi:10.1002/cpe.5143](https://doi.org/10.1002/cpe.5143); Ali et al. 2021,
[doi:10.1002/ett.4272](https://doi.org/10.1002/ett.4272)). We apply standard
HMAC-chain machinery per-session, with participant-facing verify exports and
withdrawal semantics; our chain is deliberately scoped as tamper-evident, not
tamper-proof.

**Warning and rights comprehension.** Warning research shows comprehension
hinges on reception, attention, and terminology (Lindell & Perry 2011,
[doi:10.1111/j.1539-6924.2011.01647.x](https://doi.org/10.1111/j.1539-6924.2011.01647.x)),
that recipients frequently take no action on textual alerts (Kim et al. 2019,
[doi:10.1111/1468-5973.12278](https://doi.org/10.1111/1468-5973.12278)), and
that text characteristics measurably drive comprehension of rights-style
warnings (Scherr et al. 2015,
[doi:10.1002/acp.3195](https://doi.org/10.1002/acp.3195)). Banking Shield
measures comprehension of _non-claims_ — what the system does NOT do — an
inverted warning problem, in a formative setting only.

**Data minimisation and design-based regulation.** The GDPR's
data-minimisation and data-protection-by-design principles require systems to
hold only what their purpose strictly needs and to hard-wire protection into
architecture (Klein et al. 2021,
[doi:10.1111/1911-3846.12735](https://doi.org/10.1111/1911-3846.12735);
Yeung & Bygrave 2021,
[doi:10.1111/rego.12401](https://doi.org/10.1111/rego.12401); Bradshaw &
DeNardis 2019, [doi:10.1002/poi3.195](https://doi.org/10.1002/poi3.195)). Our
firewall is one concrete design-based mechanism, with the additional property
that refusals produce evidence; we claim no compliance status under any
regulation.

**LLM guardrails and AI risk frameworks.** Guardrail practice moderates live
model output with content filters, usage monitoring, and evaluation
frameworks (Lee et al. 2024,
[doi:10.1111/bjet.13505](https://doi.org/10.1111/bjet.13505)), and AI
trust/risk/security frameworks catalogue runtime enforcement and output
filtering controls (Ray 2026,
[doi:10.1111/exsy.70213](https://doi.org/10.1111/exsy.70213)). These filter
content from a live model; B4-A instead makes the provider structurally
unable to receive sensitive input, statically unable to egress, and
schema-bound on output, with content scanning only as the final layer.

**Open-banking consent UX.** `[CITATION NEEDED]` — studies consent-screen
efficacy; we evidence the integrity of the flow itself.

**Payee-confirmation services.** `[CITATION NEEDED]` — real name-matching
services; our payee scenario is fictional and the contribution is the
metadata boundary.

**Per-response AI transparency artifacts.** `[CITATION NEEDED]` — model
documentation is typically per-release; our receipts are per-response and
machine-checked.

## 9 Conclusion

We asked whether an AI-style explanation layer can be added to a
privacy-sensitive research prototype without inheriting the leak and
overclaim risks of live generative pipelines. Banking Shield answers with a
structural pattern: fail-closed metadata firewalls, a deterministic offline
provider behind provider-independent enforcement points, machine-checked
claim discipline, and per-response receipts anchored in tamper-evident audit
chains. At the evidence freeze every automated gate passed and a formative
five-tester dry run completed with zero sensitive values recorded and full
non-claim comprehension — evidence that, within its research-only scope, the
pattern holds. Future work: replay-logged live-provider integration behind
the same contract, allowlist-template generation as a stronger guarantee than
denylist scanning, externally countersigned receipts, and a powered user
study.

## 10 LLM-Assistance Disclosure

This paper was drafted with substantial assistance from a frontier language
model operating under a logged, evidence-pack-constrained protocol
(`docs/research/banking-pilot/stage-b5-model-paper/`): the model synthesised,
critiqued, and drafted; it validated nothing. All factual statements trace to
automated gate results, generated fixtures, and frozen aggregate evidence.
Citation candidates were verified through an academic search gateway before
inclusion; unverifiable categories are explicitly marked rather than cited.

## References

- Ali, A., Khan, A., Ahmed, M., & Jeon, G. (2021). BCALS: Blockchain-based
  secure log management system for cloud computing. _Transactions on Emerging
  Telecommunications Technologies_, 33(4).
  [doi:10.1002/ett.4272](https://doi.org/10.1002/ett.4272)
- Bradshaw, S., & DeNardis, L. (2019). Privacy by Infrastructure: The
  Unresolved Case of the Domain Name System. _Policy & Internet_, 11(1),
  16–36. [doi:10.1002/poi3.195](https://doi.org/10.1002/poi3.195)
- Kim, G., Martel, A., Eisenman, D., Prelip, M., Arevian, A., Johnson, K. L.,
  & Glik, D. (2019). Wireless Emergency Alert messages: Influences on
  protective action behaviour. _Journal of Contingencies and Crisis
  Management_, 27(4), 374–386.
  [doi:10.1111/1468-5973.12278](https://doi.org/10.1111/1468-5973.12278)
- Klein, A., Manini, R., & Shi, Y. (2021). Across the Pond: How US Firms'
  Boards of Directors Adapted to the Passage of the General Data Protection
  Regulation. _Contemporary Accounting Research_, 39(1), 199–233.
  [doi:10.1111/1911-3846.12735](https://doi.org/10.1111/1911-3846.12735)
- Lee, J., Hicke, Y., Yu, R., Brooks, C., & Kizilcec, R. F. (2024). The life
  cycle of large language models in education: A framework for understanding
  sources of bias. _British Journal of Educational Technology_, 55(5),
  1982–2002. [doi:10.1111/bjet.13505](https://doi.org/10.1111/bjet.13505)
- Lindell, M. K., & Perry, R. W. (2011). The Protective Action Decision
  Model: Theoretical Modifications and Additional Evidence. _Risk Analysis_,
  32(4), 616–632.
  [doi:10.1111/j.1539-6924.2011.01647.x](https://doi.org/10.1111/j.1539-6924.2011.01647.x)
- Ray, P. P. (2026). A Review of TRiSM Frameworks in Artificial Intelligence
  Systems: Fundamentals, Taxonomy, Use Cases, Key Challenges and Future
  Directions. _Expert Systems_, 43(3).
  [doi:10.1111/exsy.70213](https://doi.org/10.1111/exsy.70213)
- Scherr, K. C., Agauas, S. J., & Ashby, J. (2015). The Text Matters: Eye
  Movements Reflect the Cognitive Processing of Interrogation Rights.
  _Applied Cognitive Psychology_, 30(2), 234–241.
  [doi:10.1002/acp.3195](https://doi.org/10.1002/acp.3195)
- Sree, T. R., & Bhanu, S. M. (2019). Secure logging scheme for forensic
  analysis in cloud. _Concurrency and Computation: Practice and Experience_,
  31(15). [doi:10.1002/cpe.5143](https://doi.org/10.1002/cpe.5143)
- Yeung, K., & Bygrave, L. A. (2021). Demystifying the modernized European
  data protection regime: Cross-disciplinary insights from legal and
  regulatory governance scholarship. _Regulation & Governance_, 16(1),
  137–155. [doi:10.1111/rego.12401](https://doi.org/10.1111/rego.12401)
