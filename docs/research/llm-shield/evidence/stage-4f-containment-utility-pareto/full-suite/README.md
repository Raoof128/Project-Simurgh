# Stage 4F Full-Suite Lane

This lane is reserved for `suite_full_v1` release closeout. A release may claim
full Stage 3F corpus coverage only after:

- `SIMURGH_RUN_STAGE4F_FULL=1 scripts/reproduce-stage4f.sh` exits `0`
- clean full-suite artifacts verify green
- red arms fail with pre-registered reasons
- golden full-suite output is byte-stable across two runs

Until those checks pass, public claims must be scoped to the canary lane or an
explicitly bounded subset release.
