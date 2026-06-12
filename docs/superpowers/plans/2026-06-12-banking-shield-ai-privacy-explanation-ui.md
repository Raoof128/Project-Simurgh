# Banking Shield AI Privacy Explanation UI (Stage B4-B) Implementation Plan

**Goal:** Surface the B4-A privacy-firewalled explanation on the public Banking
Shield report page with Simurgh-matched styling and smoke coverage, without
changing backend privacy, scoring, audit, or claim semantics.

**Architecture:** Reuse the existing report page and `GET
/api/banking-pilot/:sessionId/ai-privacy-explain`. Add one UI action and a
dedicated result panel that renders narrative and receipt fields with safe
`textContent` DOM writes. Keep disabled/off-path responses visible as a locked
receipt state.

## Tasks

- [x] Add B4-B plan/spec documents.
- [x] Add report-page AI explanation UI and Simurgh-matched CSS.
- [x] Add smoke assertions for B4-B page contract and flag-on explanation
      response.
- [x] Add B4-B closeout/claim-audit docs and update `AGENT.md`/`CHANGELOG.md`.
- [x] Run focused and broad verification.

## Constraints

- No live LLM provider.
- No network egress beyond the browser calling the existing local API route.
- No real banking integration or bank branding.
- No API field renames.
- No change to `verdict`, risk scoring, audit verification, withdrawal blocking,
  or privacy assertions.
