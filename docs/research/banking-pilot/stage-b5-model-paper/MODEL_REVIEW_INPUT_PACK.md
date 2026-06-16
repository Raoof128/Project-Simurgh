# Stage B5 — Model Review Input Pack (sanitised, frozen)

**Evidence freeze:** `main` @ `92dabb4` (PR #28 squash merge), 2026-06-12.
This file is the ONLY factual source for all Stage B5 model passes.

## 1. Project summary

- Project Simurgh — open research prototype; Banking Shield is its
  banking-adjacent pilot track.
- Banking Shield collects **metadata-only banking-adjacent integrity
  evidence** from fictional scenarios.
- No real banking integration. No real financial decisions affected.
- Non-claims (standing): not fraud detection, not scam prevention, not
  financial advice, not a real banking decision, not payment verification.
- Stack: Node.js/Express backend, static HTML/CSS/JS tester pages, in-memory
  session store, HMAC-SHA256 audit chains, shell/Node CI gates.

## 2. Phase A evidence (structural privacy gates, synthetic)

- Public tester flow: consent → scenario → report, all token-bound.
- Five fictional scenario types: `mock_cdr_consent`,
  `mock_confirmation_of_payee`, `remote_access_warning`, `mock_payment_pause`,
  `mock_ai_agent_finance_action`.
- Deterministic local risk scoring (enum-driven; no network, no ML).
- Forbidden-field firewall: 47 forbidden key names (credentials, OTPs, account
  identifiers, amounts, payees, device/proctoring telemetry fields, and the
  structural pollution keys `__proto__`/`prototype`/`constructor`), enforced
  recursively with a depth cap of 20 and a 16 KB body limit; rejected attempts
  are themselves audit events and escalate later risk scoring.
- Session tokens: HMAC-SHA256, constant-time comparison, 24 h TTL,
  version/purpose/phase binding; path/token match enforced on reads.
- Per-session HMAC audit chain with domain-separated keys (participant-code
  hashing and chain signing use different derived keys).
- Exports: Report (privacy assertions all `false`, i.e. nothing sensitive
  recorded), Audit (safe event list), Verify (chain consistency check).
- Withdrawal blocks report export afterwards; audit/verify stay readable for
  transparency.
- Tamper evidence: a modified audit fixture fails verification in the E2E gate.

## 3. Phase B evidence (internal human dry run, aggregate-only)

- 5 trusted internal testers; 30 total sessions; 25 submitted scenario
  sessions (5 per scenario type); 5 separate withdrawal sessions.
- Deterministic policy pattern identical across all testers:
  safe / warning / warning / warning / safe across the five scenario types.
- Privacy counts: 0 real banking values entered; 0 sensitive values found in
  evidence; 0 forbidden payload structures; 0 sensitive narrative-layer events.
- Comprehension (out of 5): fictional-only 5, no-bank-connection 5,
  no-fraud-detection 5, no-financial-advice 5, withdrawal 5.
- Report/Audit/Verify export interpretability: understood by 1 of 5 pre
  copy-patch; after the B3b export-page copy patch, a focused 3-session rerun
  (B3c) confirmed the improved copy with all audit chains valid.
- All 5 withdrawal sessions blocked report export afterwards.
- Main finding: the weakness was export-page interpretability, not privacy.
- Honest framing: a small trusted internal dry run, NOT a statistically
  powered user study.

## 4. B4-A / B4-B evidence (AI privacy firewall + explanation UI)

- Deterministic offline narrative generator: pure function of an allowlisted
  payload; enum→template; no randomness, no clock, no I/O, no network imports.
- No live LLM, no network egress, no provider secrets. A static no-egress gate
  (with a negative self-test that fails on an injected network primitive)
  proves the four firewall modules import no network primitive.
- Input firewall: allowlist-only payload (session id hashed, enums only),
  defensive recursive forbidden-field re-scan, 4 KB byte cap. Fail-closed.
- Output claim firewall: exact top-level schema (field allowlist), required
  string fields, 600-character caps on every field including each non-claim,
  forbidden-claim scan over 28 affirmative-capability phrases, and an
  official-result drift check (`risk_score`/`verdict`/`manual_review_required`
  must match the authoritative record).
- Negation-aware claim scanning: disclaimers in negated form ("not fraud
  detection", "not a fraud detection tool" — one determiner allowed after the
  negator) pass, while affirmative phrasing and weakened negation ("not really
  a …") are blocked. Fail-closed: false positives block, never bypass.
- AI privacy receipt on every response: provider `deterministic_mock`,
  `sensitive_payload_sent_to_ai:false`, `network_egress_used:false`,
  `official_result_unchanged`, `claim_guard_passed`, success-only
  `narrative_hash` (SHA-256).
- Endpoint: default-off feature flag (exact string `"true"`), token-bound,
  path-matched, read-rate-limited; withdrawn → 403, unsubmitted → 409,
  disabled → 503 with an off-path receipt; exactly one HMAC audit event with
  the narrative hash on success.
- B4-B UI: report-page panel rendering narrative + receipt via
  `textContent`-only DOM writes (no `innerHTML`); handles generated, blocked,
  disabled, and network-failure states; receipt always rendered.
- Evidence fixtures: an accepted explanation fixture and a rejected-claim
  fixture (a deliberately poisoned narrative blocked by the claim guard),
  both attack-value-scanned.

## 5. Gate results at evidence freeze

| Gate                                 | Result            |
| ------------------------------------ | ----------------- |
| Unit tests (`npm test`)              | 417/417 pass      |
| Banking smoke                        | 14/14 pass        |
| AI firewall smoke                    | 5/5 pass          |
| Full banking E2E smoke               | 43/43 pass        |
| Banking security audit               | 27/27 pass        |
| Banking privacy audits               | all 3 PASS        |
| No-egress static gate                | PASS              |
| `npm audit`                          | 0 vulnerabilities |
| CI quality gate (`scripts/check.sh`) | green             |

## 6. Allowed claims

```text
Metadata-only integrity evidence
Fictional banking-adjacent prototype
Trusted internal dry run
Deterministic AI privacy firewall
AI-style explanation without sensitive financial payloads
```

## 7. Forbidden claims

```text
Fraud detection
Scam prevention
Real banking protection
Payment safety
Real payee verification
Financial advice
CDR / APRA / AML / CTF compliance
Production readiness
Bank-grade security
```

## 8. One pre-approved anecdote

During CI integration, the repository's own overclaim-wording scanner flagged
the B4-A forbidden-claim denylist, because the denylist literally contains the
phrases it exists to block. The fix was an explicit scanner exclusion, not
string obfuscation. This is usable in the paper as evidence that claim
discipline was enforced mechanically at two independent layers (runtime output
firewall and repository CI).
