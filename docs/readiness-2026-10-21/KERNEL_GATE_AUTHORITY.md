# Stage 4U documentation exception and non-vacuity repair

R11: the complete candidate E2E run passed all reproduction steps but its kernel gate rejected
an audited README change as a code change. Authorize modification of the exact path
`tests/e2e/llmShield/stage4u/k7AllFunctions.test.js` before implementation.

Permit only the committed adapter README at `tools/agentdojo-simurgh-adapter/README.md` with
SHA-256 `99d985c35b73f36389fb986c4d77d154060f32e10876749ac0e13dad7de38b86`.
All other adapter and src/llmShield changes remain refused; kernel bytes must match the baseline.
A missing baseline must now fail explicitly rather than return a false passing result.
No adapter, kernel, source capture or frozen specification is changed by this repair.

Active phase: readiness maintenance. Protected surface: existing adapter/kernel gate.
Successor behavior: keep the exact byte-bound documentation exception and code protections.
Maintenance requires prior declaration of any replacement exception. Migration requires an
equivalent named code boundary. Anti-vacuity: require a real merge base; positive control must
pass with the audited README, and an extra committed adapter-code change in a disposable checkout
must fail. Run the complete E2E workflow after committing the repair.
