# Stage 2 Windows Device Shield — Evidence Folder

This folder is reserved for redacted Windows Device Shield verification artefacts.

---

## What belongs here

- Redacted command summaries (trimmed output with no secrets or personal data)
- GitHub Actions run links
- Release links and tag links
- Redacted Windows validation summaries
- Smoke and security audit pass summaries

---

## What is strictly forbidden

The following must **never** appear in any file in this directory:

| Category         | Examples                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| Secrets          | Private keys, access tokens, session signing secrets, audit secrets         |
| Process identity | HWNDs, window handles, PIDs, process names, window titles, executable paths |
| Device identity  | Usernames, home directories, serial numbers, MAC addresses                  |
| Network identity | Internal IP ranges, private hostnames                                       |
| Visual data      | Screenshots containing personal data, screen pixels, webcam frames          |
| Audio            | Microphone recordings, audio data                                           |
| Content          | Typed content, pasted content, answer text                                  |
| Biometric        | Face data, biometric data                                                   |
| Student data     | Raw student names, student IDs, SHA-256 pre-images                          |

---

## Privacy note

Project Simurgh collects behavioural metadata only. Evidence artefacts must respect the same boundary: no raw identifiers, no content, no personal data. Aggregate counts (e.g. `capture_excluded_window_count: 1`) are acceptable. Raw identifiers (e.g. `HWND: 0x1A2B`) are not.

---

## Reference

Privacy contract: [`PRIVACY.md`](../../PRIVACY.md)
Forbidden-field list: [`src/device/forbiddenLocalFields.js`](../../src/device/forbiddenLocalFields.js)
