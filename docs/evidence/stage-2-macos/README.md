# Stage 2 macOS Evidence Folder

This folder is for storing evidence of the Stage 2 macOS Device Shield completion.

## Evidence Rules (MANDATORY)

- **Do NOT commit secrets:** No API keys, tokens, or private keys.
- **Do NOT commit personal data:** No real student names, emails, or IDs.
- **Do NOT commit raw local data:** No screenshots, screen recordings, raw process names, raw window titles, PIDs, usernames, home directories, serial numbers, or MAC addresses.
- **Do NOT commit forbidden fields:** No screen pixels, webcam frames, typed content, or pasted content.

## Allowed Evidence

- Redacted command output summaries.
- Links to GitHub Actions runs.
- Links to release tags.
- Check.sh summaries (redacted if necessary).
- Smoke test and security audit pass/fail summaries.
- Verified audit-chain JSON files (containing metadata only).

## Folder Structure

- `.gitkeep`: Preserves the folder in the repository.
- `reports/`: Redacted check/test/audit reports.
- `verification/`: Redacted command-line output logs.
