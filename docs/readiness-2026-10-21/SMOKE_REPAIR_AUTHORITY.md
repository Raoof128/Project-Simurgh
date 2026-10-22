# Smoke failure repair authority

Fresh smoke at `b2bf7dc6` exposed two inherited maintenance failures:

1. Stage 5P's raw-code census correlated ordinary counts in the completed documentation audit
   with a Stage 5P mention elsewhere in the same document. Existing code explicitly permits
   widening the named documentation allowlist. Preserve its full code-band regex and code checks.
2. Whole-file Prettier rejects old blank-line spacing in the append-only activity logs. Rewriting
   published log bytes would violate the preserved-history contract. Exclude these two historical
   logs from whole-file formatting; continue diff whitespace and append-only prefix checks.

| Exact path                                           | Operation | Purpose                                                               |
| ---------------------------------------------------- | --------- | --------------------------------------------------------------------- |
| `tests/unit/llmShield/stage5p/rawCodeCensus.test.js` | modify    | R05 name completed audit/validation records as approved documentation |
| `.prettierignore`                                    | modify    | R06 preserve append-only log bytes while formatting mutable documents |

R05 approved documentation additions are exactly `AGENT.md`, `CHANGELOG.md`,
`docs/documentation-audit-2026-10-19/FILES.md`,
`docs/documentation-audit-2026-10-19/MANUAL_REVIEW.md`,
`docs/documentation-audit-2026-10-19/SOURCES.md`,
`docs/documentation-audit-2026-10-19/inventory.json`,
`docs/documentation-audit-2026-10-19/manual-progress.json`, and
`docs/research/smoke-validation-2026-10-19/validation.json`.
No runtime or test-code literal exceptions are added. Historical archive digest checks remain.

Active phase: bounded maintenance. Protected surface: exact paths above. Next phase: keep full
code-band enforcement; future documentation additions require their own declared authority.
Maintenance requires prior exact-path declaration. Sunset requires an equivalent replacement
contract. Anti-vacuity: inject a code literal in an unapproved runtime file and require failure,
then remove that temporary file and require the real suite to pass. Compare the log prefixes to
`1a8f47cf`, and run complete smoke on the new committed candidate.
