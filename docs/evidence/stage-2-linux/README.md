# Stage 2 Linux — Evidence Rules

This directory is for reviewer-facing evidence captured during real Linux
device validation of the Linux Device Shield research prototype.

Evidence must preserve the Stage 2.8 research-prototype non-claims and
manual-review-only posture.

## Posture

Research prototype only. No production endpoint deployment, no hardware
attestation, no system-wide service, no automatic misconduct detection.

## Allowed evidence

- Daemon `/health` JSON
- Daemon `/status` JSON
- Signed daemon proof JSON with `signature` redacted
- Server accept/reject response JSON
- Report `device_integrity` section
- Audit chain verification result (`GET /api/audit/:id/verify`)
- Test logs (`npm test`, `cargo test`, Stage 2.7 smoke, Stage 2.8 smoke)
- Output from `systemctl --user is-enabled` / `is-active`
- GitHub Actions run URL + summary

## Forbidden evidence

NEVER commit, upload, share, or screenshot:

- Window titles
- Process names
- PIDs
- XIDs / X11 window IDs
- Usernames
- Hostnames
- Home directory paths
- Machine IDs / serial numbers
- MAC addresses
- Screen pixels / screenshots with personal data
- Webcam frames / microphone audio
- Typed content / pasted content

If in doubt: redact before commit. The `tools/privacy-audit.mjs` sweep is the
automated guard; this list is the human one.

## Validation matrix (target — full version lands in PR #23 closeout)

| Platform              | Required signals                                           |
| --------------------- | ---------------------------------------------------------- |
| Ubuntu GNOME Wayland  | `/health` ok, `portal_advertised` true, no consent dialog  |
| Ubuntu GNOME X11/Xorg | X11 scanner healthy, `x11_managed_window_count > 0`        |
| Headless (no display) | `scanner_unavailable`, `scanner_reason: no_display_server` |
| Xvfb in CI            | All Xvfb integration tests pass deterministically          |

## Non-claims preserved

This evidence does NOT constitute a claim of:

- production Linux endpoint deployment
- distro packaging
- system-wide service deployment
- MDM / fleet deployment
- hardware attestation
- kernel-level visibility
- universal Wayland surface enumeration
- GPU overlay detection
- automatic misconduct detection

Manual review recommended. No automatic misconduct finding.
