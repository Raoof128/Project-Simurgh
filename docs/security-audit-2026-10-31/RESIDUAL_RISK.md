# Residual-risk register — 31 October 2026

Four classes, kept apart: **confirmed unresolved vulnerabilities** (reproduced here, not repaired
in place), **missing external evidence** (claims this repository cannot establish about itself),
**unsupported platforms** (what this host could not execute), and **future research**.

## Confirmed unresolved (disclosed in SECURITY.md)

| Risk                                                                                                                                                    | Surface                                                              | Why not repaired here                                                                                                | Mitigation in place                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Output firewall exports canaries, keys and encoded policy text; 9/12 benign code outputs blocked (B-3)                                                  | `src/llmShield/outputLeakageFirewall.js`                             | Policy-drift guards freeze `src/llmShield`; a successor firewall needs its own design and benign-utility measurement | Mount guard withholds exports at blocked cumulative risk; disclosure                                          |
| Adapter egress gate grounds attacker addresses by substring; unknown verdicts allow (B-4, B-8)                                                          | `tools/agentdojo-simurgh-adapter/**` (Stage 4U)                      | Read-only kernel guard; frozen Stage 1-LIVE/4D–4G evidence binds these helpers                                       | Disclosure; the fixed attacker address in the frozen corpus is rejected                                       |
| Audit chain silently stops at ~5,000 entries; receipts repeat a stale hash (B-6)                                                                        | `src/audit/hmacChain.js`, both routers                               | See area D in FINDINGS.md for the maintained-surface status                                                          | Disclosure                                                                                                    |
| Self-asserted `synthetic` provenance accepted; framing downgrades a hard block (B-9, B-11)                                                              | `src/llmShield`                                                      | Frozen                                                                                                               | Disclosure                                                                                                    |
| 5S witness/receiver signatures never verified; standalone verifier reads its key beside the bundle (E-2, C-3, C-4)                                      | `tools/simurgh-attestation/stage5s/**`                               | Stage-owned frozen verifier; a repair needs a declared maintenance surface and a re-run of the 5S lanes              | Disclosure; producer checkpoint signature is verified                                                         |
| 4F frontier unsigned (C-5, M94); 4N unauthenticated with a Merkle second preimage (C-6, M107); 4M residuals (C-7)                                       | retained stage verifiers                                             | Frozen stages                                                                                                        | README and SECURITY.md say so; no production claim rests on them                                              |
| Shared canonical JSON non-injective (`__proto__`, integer-like keys, 2^53+1, 1e400) (E-3, C-8)                                                          | `tools/simurgh-attestation/canonicalise.mjs` and two copies          | ~140 importers, including frozen stage verifiers; changing the function changes what frozen verifiers accept         | No committed evidence contains such input; a string-building successor exists in `stage5s/core/canonical.mjs` |
| 184 stage-owned CLI entry guards exit 0 silently through an aliased path (C-1)                                                                          | stage verifiers                                                      | Stage-owned                                                                                                          | The 19 maintained entry points are fixed; reviewer instruction in SECURITY.md                                 |
| Frozen composed gate: revocation not re-driven after a crash, instance-unbound restart tokens, suspend-excluding clock, symlinked signal DB (A1-4…A1-8) | `tools/assurance-signals/signals.py`                                 | Hash-pinned by eleven protocols                                                                                      | Successor handles the alert path; a future study freezes the successor                                        |
| Workflow records `denied` after an effect landed; recovery exception leaks and double-counts (A2-1, A2-2, A2-9)                                         | `tools/assurance-workflow`, `tools/assurance-recovery`               | Hash-pinned                                                                                                          | Effect counts come from receiver snapshots, so published numbers are unaffected                               |
| 5R parity runner overwrites its receipt and exits 0 on browser failure (E-5)                                                                            | `stage5r/node/runCrossRuntimeParity.mjs`                             | Stage-owned                                                                                                          | Dirty-tree check in CI                                                                                        |
| Five Python lock files without hashes (E-10)                                                                                                            | `local-meta-pilot`, `openai-readiness/inspect`, `stage5f`, `stage5g` | Historical tooling; regenerating hashes needs the exact index state                                                  | Not installed by any hosted workflow with `--require-hashes` off                                              |
| Historical live gateway quota and retry accounting (B-5)                                                                                                | `src/llmShield/gateway` direct module use                            | Frozen; mounted route returns 410                                                                                    | 410                                                                                                           |
| Daemon canonicalisers diverge across Node/Rust/Swift/C# (E-4, A2-7)                                                                                     | device daemons, assurance lab                                        | Historical device track                                                                                              | Latent for current flat payloads; fail-closed direction                                                       |

## Missing external evidence

- No outside operator has reproduced the transfer study; the archive root is a self-supplied
  integrity pin (RUNBOOK). A consistently re-signed archive with a new root passes the hash
  layer by design; only the Linux replay catches it.
- Llama weight identity rests on the worker's manifest hash and `ready` flag (F-2).
- No live provider webhook shape or alert semantics were observed; the successor's alert handling
  is mechanism-only (A1-2).
- Branch protection on `main` still requires no status checks and allows force pushes (pass-3
  H2); it is a repository setting outside the tree, unchanged by this audit.
- Vulnerability alerts and Dependabot security updates are disabled at the repository level.

## Unsupported on this host (blocked, not failed)

| Check                                                                                    | Reason                                                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Seccomp fresh-execution replay (`transfer_study.py verify`, `corrected_roles.py verify`) | Linux x86_64 only                                                  |
| Isolation, egress, recovery, eval and reliability Python suites                          | seccomp worker, `/proc`, macOS flock on frozen modules             |
| Pinned Redis 8.10.2 suites                                                               | Redis built from source in CI only; a RESP shim covered logic only |
| Node 26 reproduce scripts (14 of 52) and `check-e2e.sh`                                  | Node 26 absent                                                     |
| Windows daemon tests                                                                     | .NET 8 SDK absent (7.0 installed)                                  |
| `simurgh-daemon-macos` `swift test`                                                      | hung on a Keychain prompt                                          |
| Stage 4H fixture byte-reproduction                                                       | Node 26 only (`node_major` baked into the evidence)                |
| Browser-side portable verifiers (4M HTML, 5S) and interactive desktop capture            | not exercised                                                      |
| Hosted CI on the audited revisions                                                       | nothing was pushed                                                 |

## Future research

- A maintained LLM Shield successor (output firewall with normalisation, decoding and
  context-echo checks; provenance not caller-assertable) measured for benign utility.
- A declared `maintenance_behaviour` for the 5Q and 5R gates so a stage-workflow pin does not
  need its own pull request.
- Freezing the composed-gate successor in a new protocol and re-running the transfer study.
- Independent custody of the evidence archives.
