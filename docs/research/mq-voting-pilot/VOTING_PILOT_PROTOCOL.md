# MQ Persian Society Voting Pilot — Protocol

**Version:** 2026-05-v1
**Status:** Pre-pilot (governance/ethics clearance required before human participants)

## Research question

Can Project Simurgh provide privacy-preserving integrity evidence for small-scale student-society online voting sessions without collecting ballot content, screen recordings, webcam/audio, or personal device identifiers?

## Pilot mode

Shadow mode. Simurgh runs beside the official MQ Persian Society vote. It does not decide winners, disqualify votes, or touch ballot choices.

## Phases

| Phase | Description                             | Participants              |
| ----- | --------------------------------------- | ------------------------- |
| A     | Lab validation — synthetic persona runs | None (researcher only)    |
| B     | Internal dry run                        | 3–5 executive members     |
| C     | Optional member pilot                   | Volunteer society members |

Phase C requires written MQ Persian Society executive approval and MQ Human Research Ethics approval before proceeding.

## Integrity tiers

- `browser_only`: browser-SDK session; no native installation required.
- `browser_plus_daemon`: browser-SDK plus optional Simurgh Device Shield daemon.

Daemon absence is not treated as misconduct or suspicious behaviour. It is recorded as reduced integrity-signal coverage.

## Data separation

| Category                      | Label                 |
| ----------------------------- | --------------------- |
| Persona script sessions       | synthetic_persona     |
| Researcher manual walkthrough | researcher_self_pilot |
| Real consenting members       | human_participant     |
| Official election outcome     | out_of_scope          |
