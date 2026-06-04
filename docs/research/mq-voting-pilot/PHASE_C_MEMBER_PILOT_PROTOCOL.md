# Phase C Member Pilot Protocol — MQ Persian Society Voting Pilot

**Version:** 2026-06-v1
**Status:** Pending governance and ethics clearance — not yet active

---

## Research question

Can volunteer MQ Persian Society members use the Simurgh voting pilot clearly, safely, and voluntarily alongside a real society ballot, while Simurgh remains blind to ballot choice?

## Phase definition

| Phase | Participants                             | Data label                            |
| ----- | ---------------------------------------- | ------------------------------------- |
| A     | None (synthetic)                         | `synthetic: true`                     |
| B     | Internal dry run (executive/researchers) | `data_source: internal_human_dry_run` |
| C     | Volunteer society members                | `data_source: human_participant`      |

## Scope

Phase C is a shadow pilot. It runs beside the official MQ Persian Society election. It does not:

- Affect the official election result
- Collect ballot choice or candidate selection
- Record screen, webcam, audio, or clipboard content
- Store raw device identifiers
- Produce results used for disciplinary action
- Make claims about public election security

## Participant flow

1. Member receives opt-in invitation through society channels
2. Member opens `/voting-pilot` on the pilot server
3. Consent page displayed — member reads and chooses Agree or Decline
4. If Decline: no session created, no data collected, flow ends
5. If Agree: anonymous participant code displayed once (not stored by Simurgh)
6. Member completes the mock/shadow ballot flow alongside the real ballot
7. Simurgh records privacy-safe integrity metadata only
8. Member may withdraw at any time — telemetry stops immediately, report blocked
9. Post-session: member may note their anonymous code for follow-up if desired

## What Simurgh records (Phase C)

- Session ID (random, not linked to identity)
- Consent timestamp
- Proof status and integrity tier
- Focus-loss and paste event counts
- Audit chain validity
- Submission timestamp

## What Simurgh does not record

- Ballot choice, candidate name, or vote preference
- Participant name, student ID, or email
- Screen content, webcam, or microphone
- Clipboard text or typed text
- Raw process names or window titles
- Device serial numbers or MAC addresses

## Data label

All Phase C session artefacts must carry:

```json
{
  "synthetic": false,
  "human_participant": true,
  "data_source": "human_participant"
}
```

## Participant ceiling

Recommended maximum for Phase C pilot: **30 participants**. Any expansion beyond this requires a separate governance review.

## Integrity tiers available

- `browser_only`: no installation required; lower signal coverage
- `browser_plus_daemon`: optional Simurgh Device Shield; higher signal coverage

Daemon absence is not misconduct and is not reported negatively to the society.

## Analysis

Results will be analysed in aggregate. No individual integrity score will be attributed to a named participant or used for disciplinary purposes. Findings will be reported at the level of the full Phase C cohort.

## Prerequisites

See `PHASE_C_GO_NO_GO_CHECKLIST.md`. Phase C must not launch until all checklist items are satisfied.
