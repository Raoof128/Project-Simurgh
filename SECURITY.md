# Security Policy

## Supported Versions

Project Simurgh is a research prototype. Only the `main` branch is considered active.

| Branch | Supported |
|---|---|
| `main` | ✅ Active |
| Feature branches | Development only |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues to: **raoof.r12@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected component (server, helper, audit chain, etc.)
- Potential impact assessment

You will receive a response within **72 hours**. If the vulnerability is confirmed, a fix will be prioritised for the next release. You will be credited in the changelog unless you request anonymity.

## Security Architecture

### Trust Boundaries

| Component | Trust Level | Notes |
|---|---|---|
| Student browser | **Untrusted** | All inputs sanitised and range-clamped before processing |
| Native helper | **Authenticated** | `x-simurgh-helper-secret` HMAC header required |
| Instructor dashboard | **Authenticated** | Bearer token required in non-demo mode |
| Claude API | **Trusted service** | Receives sanitised metadata only, never raw content |
| Audit chain | **Tamper-evident** | HMAC-SHA256 linked entries; any modification invalidates downstream signatures |

### What Simurgh Does Not Store

Simurgh is designed around data minimisation:

- No screen pixels or screenshots
- No webcam frames or microphone audio
- No typed answer content
- No paste content (only paste length)
- No raw student names or identifiers (SHA-256 hashed only)
- No biometric data

### Known Limitations (from research paper §VI-C)

The following attack classes cannot be detected from telemetry alone:

1. **Click-through overlays** — `WS_EX_TRANSPARENT` (Windows) or `ignoresMouseEvents` (macOS) do not fire focus events
2. **Read-don't-paste workflows** — silent transcription at human WPM with no paste events

These are documented in the disclosure paper and are the subject of ongoing research (Countermeasure A native helper).

## Dependency Security

```bash
npm audit
```

Report any findings with a high or critical severity rating via the vulnerability disclosure process above.
