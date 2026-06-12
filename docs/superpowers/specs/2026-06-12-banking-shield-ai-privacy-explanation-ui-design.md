# Stage B4-B - Banking Shield AI Privacy Explanation UI

**Date:** 2026-06-12
**Status:** Approved inline design
**Stage:** B4-B
**Subtitle:** Public report-page surface for the B4-A privacy-firewalled explanation

## 1. Purpose

B4-B surfaces the B4-A backend AI privacy firewall on the public Banking Shield
report page. The UI must help a tester understand the deterministic narrative
and its receipt without expanding the data boundary.

The user-facing claim is narrow:

> Banking Shield can show a plain-English explanation generated from
> metadata-only evidence, while preserving the official policy result and
> showing an auditable receipt that no sensitive payload or network egress was
> used.

## 2. Scope

### In scope

- Add a report-page AI privacy explanation action.
- Fetch `GET /api/banking-pilot/:sessionId/ai-privacy-explain` with the existing
  session token.
- Render the approved narrative fields and receipt flags.
- Render the default-off state clearly when the feature flag is disabled.
- Match the existing Simurgh Banking Shield appearance.
- Add smoke coverage for the visible B4-B UI contract.

### Out of scope

- Backend route, payload, firewall, receipt, or audit semantics changes.
- Live LLM provider, secrets, or network egress.
- Phase C, real banking integrations, real bank data, or production claims.
- Any change to official policy result, risk score, audit validity, withdrawal
  handling, or privacy assertions.

## 3. UI contract

The report page adds an "AI Privacy Explanation" export control next to Report,
Audit, and Verify. The result area shows:

- Narrative summary.
- Policy outcome explanation.
- Privacy boundary note.
- Audit/verify explanation.
- Manual review note.
- Non-claims.
- Receipt flags: sensitive payload sent to AI, network egress used, official
  result unchanged, claim guard passed, and narrative hash when available.

When disabled, the UI shows a locked/off-path receipt instead of treating the
503 response as a broken page.

## 4. Design direction

Use the existing Simurgh research-demo visual system:

- Paper background, ink text, oxblood primary, moss secondary.
- Fraunces headings, JetBrains Mono labels, Inter Tight body.
- Dense evidence panels rather than a marketing layout.
- Compact badges for receipt flags.
- Mobile-safe stacked controls and panels.

## 5. Security review

- The browser sends only the existing bearer token and session id already used
  by report/audit/verify exports.
- The page does not collect or store new banking fields.
- Output is rendered through `textContent`, not HTML injection.
- Disabled, withdrawn, and firewall-failed responses remain visible as receipt
  states and do not imply the explanation was generated.

## 6. Verification

- Static page smoke confirms the public report page contains the B4-B panel and
  control.
- Full Banking Shield E2E smoke exercises:
  - flag-off UI path by static contract.
  - flag-on endpoint response used by the UI contract.
  - receipt flags stay false/true as expected.
- B4-A privacy and no-egress audits remain passing.
