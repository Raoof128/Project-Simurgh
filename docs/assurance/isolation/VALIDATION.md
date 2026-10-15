# Validation record

Local environment: Linux 6.18.44 x86_64, Python 3.12.14, UID 1000, no effective capabilities,
pre-existing platform seccomp and no_new_privs. No environment configuration changes were needed.
All test traffic uses local synthetic fixtures. Landlock ABI discovery returned -1/ENOSYS; this
experiment's pass criteria do not depend on Landlock being unavailable on other hosts.

The 57-row artifact distinguishes twelve live attack baselines, three useful tasks, two descriptor
hygiene cases and two retained content-release failures under baseline/capability/deny-all controls.
Successful replay requires exact source hashes, case/control identity/order and observed outcomes.

Tests cover real kernel restrictions, wrong syscall ABI, full-width descriptor arguments, raw-fork
inheritance, exec denial, shared/file-backed mmap denial and private anonymous allocation, wrong
file modes, peer substitution, unexpected standard streams, multithreaded setup, collector failure,
malformed worker output, report omission/duplication/tampering and missing useful/attack controls.
The malformed-worker regression first failed: broker error handling could leave a partially parsed
result attached to an invalid experiment. Result publication now follows validation.

Execution results and final review are recorded in the
[phase ledger](../../superpowers/plans/2026-10-15-assurance-isolation.md) and root logs. These are local
author-run observations. A fresh code-review agent is not an outside operator or held-out attacker.
No hosted CI result, independent replication, live model or production deployment is implied.

Final review reproduced 24 tests and all 57 rows. It found one Important defect: the single-case
CLI accepted malformed worker envelopes (including duplicate keys and wrong errno types) before
full-matrix validation. Seven envelope variants plus boolean errno acceptance reproduced red.
Shared strict validation now rejects them before publication and during matrix checks; the complete
26-test suite passes. The source hashes refresh with all row observations unchanged. A minor
protocol-validation limitation remains: bootstrap checks IP family/stream type/peer but does not
query SO_PROTOCOL; the trusted fixture provisions TCP. No live alternate-protocol result is claimed.

Final local results: **26 tests passed**, **57-row replay passed**, full repository npm **5,119
passed / 0 failed / 3 skipped** (Chrome and Lean prerequisites unavailable). Previous egress **20
tests and 36-row replay passed**; its files remain unchanged. Ruff and scoped formatting pass.
Subjective readiness: reproducibility 8/10, boundary evidence 7/10, integration utility 3/10 and
novelty 2/10. Raising these requires, respectively, outside replay, held-out probes, a native launcher
with a real workload, and a measured advantage over standard fixtures. These are author judgments,
not measured security scores.
