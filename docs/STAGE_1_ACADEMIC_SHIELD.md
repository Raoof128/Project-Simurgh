# Stage 1 Academic Shield

This branch contains active development for Simurgh Academic Shield, the privacy-first academic integrity prototype.

**Status:** experimental development branch — not yet stable release.

## Core goals

- Metadata-only telemetry (no screen pixels, no content, no biometrics)
- Local deterministic risk scoring with weighted category breakdown
- Optional Claude narrative on Warning/Critical cases only (fail-open)
- Academic event timeline with named taxonomy
- Session lifecycle (created → joined → active → submitted)
- JSON report export with manual review recommendation
- HMAC audit chain verification

## Design spec

Full spec: [`docs/superpowers/specs/2026-05-13-simurgh-academic-shield-design.md`](superpowers/specs/2026-05-13-simurgh-academic-shield-design.md)

## Branch strategy

```
main
  └── stage-1-academic-shield   ← this branch
        └── draft PR: Stage 1 Academic Shield prototype
```

`main` remains the stable, polished branch. All Stage 1 work happens here.
