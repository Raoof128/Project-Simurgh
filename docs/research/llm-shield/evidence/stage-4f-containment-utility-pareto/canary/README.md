# Stage 4F Canary Lane

This lane is the deterministic canary used for default CI and machinery checks.

The clean artifacts must verify green, the red arms must fail with pre-registered reasons, and the golden output must remain byte-stable across repeated recorded-fixture runs.

The lane-local public key is reviewer convenience material only. `verify-frontier` trusts the external `--pubkey` argument.
