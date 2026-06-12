# Banking Shield: Metadata-Only Integrity Evidence and a Deterministic AI Privacy Firewall for a Banking-Adjacent Research Prototype

**Draft v0.1 (post Pass-12 polish) — 2026-06-12.**
All facts trace to the Stage B5 evidence pack (repo `main` @ `92dabb4`).
Citations are deliberately unpopulated (`[CITATION NEEDED]`) pending manual
verification. This draft makes no fraud-detection, scam-prevention,
payment-safety, payee-verification, financial-advice, compliance, or
production-readiness claims.

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
  property with a negative self-test (§4.2).
- **C3** Claim discipline as a mechanism: a negation-aware scanner that blocks
  affirmative capability phrasing while passing required disclaimers,
  enforced at runtime and mirrored by repository CI (§4.3).
- **C4** A verifiable participation lifecycle — consent, withdrawal, HMAC
  audit chains, aggregate-only human evidence — exercised in a formative
  internal dry run (§4.4, §6.2).

## 2 Background and Motivation

A Banking Shield session walks a participant through consent, one of five
fictional scenarios (a mock data-sharing consent screen, a mock payee-name
check, a remote-access caution, a payment-pause prompt, and an AI-agent
finance approval), and an export page offering a Report, an Audit listing,
a Verify check, and — behind a default-off flag — an AI-style explanation.
All scoring is a deterministic local function of enumerated metadata; the
"policy outcome" (safe/warning/critical) is a fictional prototype output, not
a calibrated alert.

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
  weak point, motivating an explanation layer.
- **O3.** The riskiest place to add that explanation layer is exactly where
  G1/G2 bite; hence the firewall-first design of §4.2.

## 3 Threat Model

**Assets.** A1 sensitive banking payloads (must never enter); A2 audit-chain
integrity; A3 the claim boundary; A4 participant anonymity; A5 official
policy-result integrity.

**Threats and controls.** T1 sensitive/polluted submissions → recursive
denylist firewall, depth cap, body cap, rejection audit events. T2 provider
exfiltration → allowlist input (hashed session id, enums only), 4 KB cap,
static no-egress gate. T3 capability overclaims → output schema allowlist,
length caps, negation-aware claim scan, fail-closed rejection. T4 narrative
drift → official-result equality check against the authoritative record.
T5 log tampering → per-session HMAC chains with domain-separated keys;
tampered fixtures fail verification. T6 token theft/replay → HMAC tokens,
constant-time comparison, TTL, purpose/phase binding, path/token match.
T7 withdrawal bypass → withdrawn sessions receive 403 on report and
explanation; audit/verify remain readable for transparency.

**Trust assumptions and residual risks.** The server, its secrets, and
transport security are trusted; Phase B testers are trusted insiders. The
audit chain is tamper-_evident_, not tamper-proof: the server holds the keys.
Denylist scanning is incomplete by construction. Receipts attest process, not
ground truth. Withdrawal does not erase the metadata-only audit chain — by
design and disclosed. Out of scope: DoS beyond rate limiting, side channels,
browser compromise, a malicious operator.

## 4 Design

### 4.1 Metadata-only integrity evidence (C1)

Every write is filtered by a recursive forbidden-field firewall before
validation: 47 forbidden key names spanning credentials, financial
identifiers, content fields, device telemetry, and the structural pollution
keys `__proto__`/`prototype`/`constructor`, with a recursion depth cap and a
16 KB body limit. A rejected attempt is not silently dropped: it appends a
rejected-attempt audit event (route, reason, field name — never the value)
and escalates the session's subsequent policy scoring. _Alternative
considered:_ schema-level allowlisting alone — rejected because an allowlist
validates shape but does not produce evidence of hostile attempts; the
denylist layer converts attacks into auditable signal. Both are used.

### 4.2 The deterministic AI privacy firewall (C2)

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
(E3)?

### 6.1 Gate results (E1)

_Hypothesis:_ all structural properties are mechanically checkable. _Result:_
at the evidence freeze, 417/417 unit tests, 14/14 banking smoke checks, 5/5
firewall smoke checks, 43/43 end-to-end checks (including tamper-evidence:
a modified audit fixture fails verification), 27/27 security audit checks,
three privacy audits PASS, no-egress gate PASS, and zero `npm audit`
vulnerabilities. _(Table T3: every gate green at freeze — the claim is about
gates, not about the world.)_

### 6.2 Formative internal dry run (E2, exploratory)

_Hypothesis:_ trusted insiders can complete the lifecycle and understand the
non-claims. _Result:_ five trusted internal testers completed 30 sessions
(25 scenario submissions, 5 per scenario type; 5 withdrawal sessions). Zero
real banking values were entered; zero sensitive values were found in
evidence; the deterministic policy pattern reproduced identically across
testers; all five withdrawals blocked subsequent report export; and
comprehension of all five non-claim checks was 5/5. Export interpretability
was the weak point (1/5 pre copy-patch); a focused 3-session rerun confirmed
the revised copy but **cannot establish improvement** — we report it as a
design iteration. This is a formative dry run with n=5 trusted insiders, not
a user study; no generalisation is claimed. _(Table T2: the dry run evidences
lifecycle completion and non-claim comprehension, nothing more.)_

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

Grouped by approach; citations pending manual verification. Open-banking
consent UX `[CITATION NEEDED]` studies consent-screen efficacy; we evidence
the integrity of the flow itself. Payee-confirmation services
`[CITATION NEEDED]` perform real name matching; our payee scenario is
fictional and the contribution is the metadata boundary. Security-warning
comprehension `[CITATION NEEDED]` measures whether users heed warnings; we
measure comprehension of _non-claims_ — an inverted warning problem.
Data-minimisation and privacy-preserving telemetry `[CITATION NEEDED]`
minimise at collection; our firewall additionally converts refusals into
evidence. Tamper-evident logging `[CITATION NEEDED]` provides the chain
machinery we apply per-session with participant-facing verification and
withdrawal semantics. LLM guardrails `[CITATION NEEDED]` moderate live model
output behaviourally; B4-A makes the provider structurally unable to receive
sensitive input, statically unable to egress, and schema-bound on output,
with content scanning only as the final layer. AI transparency artifacts
`[CITATION NEEDED]` document models per-release; our receipts are
per-response and machine-checked.

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
