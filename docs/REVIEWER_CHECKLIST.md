# Reviewer Checklist

## Read First

- `docs/STAGE_1_5_REVIEWER_PACK.md`
- `README.md`
- `docs/LIMITATIONS.md`
- `docs/THREAT_MODEL.md`
- `SECURITY.md`
- `PRIVACY.md`
- `ETHICS.md`

## Commands to Run

```bash
npm install
./scripts/check.sh
npm test
node tools/privacy-audit.mjs
npm audit --audit-level=high
git diff --check
```

## Claims to Verify

- Metadata-only telemetry.
- No screen, webcam, audio, typed-content, pasted-content, or biometric storage.
- HMAC audit chain.
- Audit verification endpoint.
- Session token enforcement.
- Replay protection.
- Helper secret enforcement.
- Instructor token enforcement.
- Rate limiting.
- Manual-review wording.
- Stage 2 not implemented yet.

## Limitations to Inspect

- GPU overlays.
- Click-through overlays.
- Read-only cheating workflows.
- Helper coverage gaps.
- OS API behavior dependencies.
- Compromised endpoint boundary.
- Missing pilot/red-team/legal review evidence.

## Evidence Available

- Unit tests under `tests/unit/`.
- Check suite in `scripts/check.sh`.
- Privacy audit in `tools/privacy-audit.mjs`.
- CI workflow in `.github/workflows/stage-1-checks.yml`.
- Stage 1 reference in `docs/STAGE_1_ACADEMIC_SHIELD.md`.

## Evidence Pending

- Fresh remote CI run after this branch is pushed.
- Redacted reviewer command-output bundle.
- Red-team results.
- Privacy/legal review memo.
- Accessibility review.
- Institutional pilot data.

## Questions Before Stage 2 Support

- What pilot environment will be used?
- Who owns privacy/legal approval?
- What devices and operating systems must be supported first?
- What red-team scenarios are in scope?
- What evidence can be shared publicly?
- What deployment channel will sign and distribute the Local Integrity Node?
