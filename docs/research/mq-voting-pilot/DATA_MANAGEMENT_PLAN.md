# Data Management Plan — MQ Persian Society Voting Pilot

**Version:** 2026-05-v1

## Data collected by Simurgh

- Pilot session records (in-memory; no persistent database in Phase A/B)
- Synthetic persona output JSON in `docs/research/mq-voting-pilot/evidence/synthetic/`
- Pre-pilot gate evidence in `docs/research/mq-voting-pilot/evidence/pre-pilot/`

## Data NOT collected

Ballot choice, candidate selection, student name, student ID, email, screen pixels, webcam, audio, typed text, clipboard text, raw process/window names, device serial identifiers.

## Retention

Synthetic and participant artefacts are retained only for the approved research period and deleted according to the MQ ethics-approved data management plan.

## De-identification

Participant codes are HMAC-SHA256 hashed with a server-side pepper. Raw codes are shown once to participants and not stored.

## Storage location

Local development server only (Phase A/B). No cloud storage or external transmission of participant data without ethics approval.

## Access control

Research data is accessible to the principal researcher only. No third-party sharing without ethics approval.
