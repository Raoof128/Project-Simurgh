# Paper Findings Summary

**For:** Privacy-Preserving Integrity Proofs for Student-Society Voting  
**Pilot:** Project Simurgh Phase C — MQ Persian Society  
**Tag:** `v0.5.0-voting-pilot-phase-c-closeout`

---

## Paper title

**Privacy-Preserving Integrity Proofs for Student-Society Voting:
A Phase C Pilot of Project Simurgh at Macquarie University**

_Subtitle: A voting-adjacent case study, not a production election-security claim_

---

## Abstract-level summary

Project Simurgh provides session-level integrity evidence for high-stakes
digital interactions. This paper reports a Phase C consented shadow-mode pilot
conducted alongside a real MQ Persian Society event preference poll. Thirty
sessions completed the full consent-to-submit flow. In all 30 sessions,
Simurgh collected no ballot choices, screen recordings, webcam/audio, typed
content, pasted content, or personal device identifiers. One additional
consented session was withdrawn and excluded from analysis. After data
collection closed, all write endpoints were enforced server-side with HTTP 410
Gone responses, demonstrating a reproducible collection-closure posture.

---

## Headline finding

In a 30-session study pilot, Project Simurgh provided privacy-preserving
voting-session integrity evidence without collecting ballot choices, screen
recordings, webcam/audio, typed content, pasted content, or personal device
identifiers. One additional consented session was withdrawn and excluded from
analysis. After collection, all write endpoints were closed server-side with
HTTP 410 responses.

---

## Key findings for paper sections

### Privacy (Section: Privacy Model Validation)

- `ballot_choice_recorded_by_simurgh: false` in all 30 submitted sessions.
- Ballot choice discarded client-side before network call — structurally absent
  from server request body in every session.
- Server `FORBIDDEN_BALLOT_FIELDS` guard provided an independent second layer
  of ballot-field rejection.
- Privacy audit (`node tools/privacy-audit.mjs`) passed across all 52 evidence
  files scanned at closeout.

### Integrity (Section: Pilot Integrity Flow)

- 31 consented sessions; 30 submitted; 1 withdrawn.
- HMAC audit chain initialised per session; submit event recorded per
  submitted session.
- Withdrawn session excluded from report export (403 on report endpoint).
- Collection closure enforced server-side after 30-session target reached.

### Collection closure (Section: Post-Pilot Collection Posture)

- `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true` causes all write endpoints to
  return 410 Gone, enforced before authentication middleware.
- Closure is not bypassable with a valid token.
- Report export remains available and token-protected.
- Verified by dedicated closure smoke suite (5/5 gates pass).

### Safety gates (Section: Evaluation / Verification)

| Gate           | Result          |
| -------------- | --------------- |
| Node tests     | 359/359 pass    |
| npm audit      | 0 high/critical |
| Privacy audit  | PASS            |
| Smoke          | 8/8             |
| Security audit | 10/10           |
| Closure smoke  | 5/5             |

---

## Wording the pilot correctly

### Correct

> Project Simurgh provided privacy-preserving integrity evidence for a
> consented voting-adjacent pilot.

> Participants completed a consented shadow-mode pilot alongside the official
> MQ Persian Society voting event.

> Simurgh collected session-level integrity metadata in shadow mode without
> influencing or observing the official vote.

### Incorrect (do not use)

> ~~Simurgh secured the vote.~~

> ~~Simurgh monitored the election.~~

> ~~Participants voted through Simurgh.~~

> ~~Voting security system.~~

---

## Suggested paper structure

1. **Introduction** — student-society governance context; motivation for
   integrity evidence without privacy cost; shadow-mode design rationale.
2. **Related work** — privacy-preserving audit systems; integrity proofs for
   digital interactions; consent-based telemetry.
3. **System design** — consent flow; HMAC audit chain; ballot-field exclusion;
   collection-closure posture.
4. **Phase C pilot** — study design; participant recruitment; shadow-mode
   protocol; data management.
5. **Results** — dataset (Table 1); privacy assertions (Table 2); integrity
   flow (Table 3); safety gates (Table 4); collection closure (Table 5).
6. **Discussion** — what the results show; limitations; non-claims;
   generalisation bounds.
7. **Conclusion** — paper-safe headline finding; future work.

---

## Non-claims to preserve in every section

- This is a research prototype, not a production election-security system.
- No automatic misconduct finding is made from pilot data.
- The official election result was determined entirely by the society's own
  voting system — not by Simurgh.
- No hardware attestation, screen capture analysis, or process enumeration
  was performed during the pilot.
- The 30-session dataset is a proof-of-concept pilot; statistical power was
  not the goal of Phase C.
