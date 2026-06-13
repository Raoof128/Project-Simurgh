# Banking Shield — Citation & Claim Audit (preprint package)

Audit date: 2026-06-13. Scope: `main.tex` / `source/banking-shield-paper-v1.2.md`
and `references.bib`. Method: every empirical claim re-run against live source,
gates, and the frozen evidence pack; every reference verified via CrossRef DOI
content negotiation (`application/vnd.citationstyles.csl+json`) or HTTP
resolution.

## 1. Citation audit — all 16 references verified to exist

DOI references (CrossRef-confirmed authors, title, venue; year set to the
version-of-record / issue year matching the printed volume/issue):

| Key                      | Year | Venue (vol/iss)               | Status                                       |
| ------------------------ | ---- | ----------------------------- | -------------------------------------------- |
| `sree2019secure`         | 2019 | Concurrency Comput. 31(15)    | OK                                           |
| `ali2022bcals`           | 2022 | Trans. Emerg. Telecom. 33(4)  | year fixed 2021→2022                         |
| `lindell2012protective`  | 2012 | Risk Analysis 32(4)           | year fixed 2011→2012                         |
| `kim2019wireless`        | 2019 | J. Conting. Crisis Mgmt 27(4) | OK                                           |
| `scherr2016text`         | 2016 | Appl. Cognitive Psych. 30(2)  | year fixed 2015→2016                         |
| `klein2022pond`          | 2022 | Contemp. Account. Res. 39(1)  | year fixed 2021→2022 (was an outright error) |
| `yeung2022demystifying`  | 2022 | Regulation & Governance 16(1) | year fixed 2021→2022                         |
| `bradshaw2019privacy`    | 2019 | Policy & Internet 11(1)       | OK                                           |
| `lee2024lifecycle`       | 2024 | Br. J. Educ. Technol. 55(5)   | OK                                           |
| `ray2026trism`           | 2026 | Expert Systems 43(3)          | OK                                           |
| `mitchell2019modelcards` | 2019 | FAccT (FAT\*)                 | OK                                           |
| `gebru2021datasheets`    | 2021 | Commun. ACM 64(12)            | OK                                           |

Institutional / scheme URLs (HTTP-resolved 2026-06-13):

| Key                   | URL status                                                |
| --------------------- | --------------------------------------------------------- |
| `openbanking_consent` | 200                                                       |
| `worldbank_consent`   | 200                                                       |
| `payuk_cop`           | 403 (Cloudflare bot-block; page exists, human-accessible) |
| `epc_vop`             | 403 (Cloudflare bot-block; page exists, human-accessible) |

Zero hallucinated, non-existent, or unverifiable citations. Five online-first vs
version-of-record year mismatches were corrected so each year matches the printed
volume/issue already cited.

## 2. Claims audit — every factual claim verified true

Verified live against source and the frozen evidence pack:

- Forbidden-field firewall: **46** names incl. `__proto__`/`prototype`/`constructor`
  (`src/bankingPilot/forbiddenBankingFields.js`); recursion-depth cap present.
- Output claim firewall: **29** affirmative-capability phrasings
  (`FORBIDDEN_CLAIM_PHRASES`), negation-aware; 600-char field cap.
- Caps: narrative payload **4 KB** (`MAX_NARRATIVE_PAYLOAD_BYTES=4096`), body
  **16 KB** (`BANKING_BODY_LIMIT_BYTES`).
- No-egress static gate over the **4** AI-firewall modules; negative self-test.
- Default-off flag requires exact string `"true"`; explanation panel writes via
  `textContent` only; read-rate limiter wired to export routes; HMAC keys
  domain-separated (`src/bankingPilot/index.js`).
- Gates at freeze: 417/417 unit, 14/14 banking smoke, 5/5 AI-firewall smoke,
  43/43 full E2E, 27/27 security, 3/3 privacy audits, no-egress PASS, 0 vulns.
- Phase B aggregates (`docs/research/banking-pilot/evidence/phase-b-internal-dry-run/aggregate-results.json`):
  5 testers, 30 sessions, 25 submitted + 5 withdrawal, policy pattern
  safe/warning/warning/warning/safe, 0 sensitive values, 5/5 on all five
  comprehension items, 1/5 pre-patch export interpretability.
- Fixture pair: accepted-explanation passes; rejected-claim blocked with failed
  gate recorded in its receipt.

Overclaim discipline intact: every banking-capability noun appears only in
negated non-claims, denylist descriptions, related-work contrasts, or
limitations.

## 3. Defects found and fixed during this audit cycle

- Phrase count 28 → **29** (long-standing undercount).
- Stale "v1.1 preprint candidate" → **v1.2** in the LLM-assistance disclosure.
- Figure 3 caption: removed internal "(page-one figure candidate)".
- Five citation years corrected (table above).

## 4. External-review wording refinements — applied 2026-06-13

All three judgment-call recommendations from the external review are now applied
in both `main.tex` and `source/banking-shield-paper-v1.2.md`:

- §4.1 data minimisation reworded to a data-minimisation _design principle_ in
  the limited engineering sense; `klein2022pond`/`yeung2022demystifying` now cited
  as GDPR data-protection-by-design _governance context_, not as
  data-minimisation authorities.
- Related work no longer calls `lee2024lifecycle` "guardrail practice": it now
  reads as a life-cycle bias/risk study, with `ray2026trism` as TRiSM controls;
  both framed as live-model filtering that Banking Shield contrasts structurally.
- Added a one-line clarifier in §4.2 that "AI-style" denotes the
  explanation-interface contract and guardrail pathway, not a live generative
  model evaluated in this study.

No venue is targeted; the artifact is positioned as a research preprint.
