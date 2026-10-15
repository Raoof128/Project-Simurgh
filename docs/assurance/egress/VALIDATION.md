# Validation — 15 October 2026 (Australia/Sydney)

Linux 6.18.44 x86_64, Python 3.12, standard library. Existing platform seccomp remains active;
the new worker appends restrictions with `no_new_privs`. IPv4/IPv6 loopback and Unix fixtures run
locally. No key, paid/model call, external target or platform configuration change was required.

Network namespace provisioning was unavailable: `unshare --user --map-root-user --net ip -brief
address` returned `cannot open /proc/self/uid_map: Read-only file system`. The design therefore
uses an ingress-only seccomp profile and records the narrower scope. No namespace result is claimed.

Kernel behavior tests and the first service test failed before implementation. The implemented
profile then passed real socket, raw syscall, x32 and fork/exec checks. The approved service tests
observe actual baseline payloads and their absence under the filter. Complete matrix replay and
tamper/omission checks are run separately from the repository's Node suite.

## Executed checks

- New Python suite: **20 tests passed**, including actual kernel socket/syscall denial, x32 kill,
  fork/exec inheritance, failed installation, thread and socket-stdio rejection, real descriptor
  import refusal, all eight baseline network deliveries, useful work and the retained mailbox failure.
- The saved **36-row** report replays against fresh local services. Omitted/duplicated/extra rows,
  source changes, fabricated absence and missing baseline delivery are refused. Existing output,
  omitted-row and duplicate-key CLI probes exit 1.
- Previous task-scope suite: **24 tests passed**; its saved **54-row** report replays unchanged.
  All seven earlier tool/source-report families are byte-identical to `accfec27`. The older SDK,
  workflow and connector dependencies are untouched; their suites were not rerun in this phase.
- Full `PYTHONDONTWRITEBYTECODE=1 npm test`: **5,122 total; 5,119 passed; zero failed; three skipped**
  because Chrome/Lean prerequisites are unavailable. These counts exclude the separate Python suite.
  This run preceded the Python-only observer correction below; the full new Python suite and report
  replay were rerun after that correction.
- Ruff check/format, scoped Prettier, census and diff checks pass. Only the standing mutable census
  current set moves **30 → 31**, adding the named kernel-egress step as `unclassifiable_step`.
  Baseline19 stays unchanged. No historical coverage discharge is claimed.

Logs remain in `/tmp/simurgh-egress-*.log`; the committed report and reproduction commands are the
durable review path. Hosted CI and independent operator reproduction remain unobserved.

## Fresh review and correction

One fresh reviewer independently passed the initial 19 tests, reproduced all 36 report rows,
checked four source-response hashes and confirmed frozen-source/census preservation. It found
**one Important measurement defect**, no Critical or other material finding: a timeout reading an
accepted connection could be interpreted as an idle listener during shutdown, hiding queued data
behind an empty observation.

Ruling: fix before publication. A regression sent a partial payload on a stalled first connection
and a full fixture payload on a second connection; the old observer incorrectly returned no events
without refusing. The test failed before correction. Idle timeout handling now surrounds only
listener polling; accepted-stream, forwarding and acknowledgment failures invalidate observation.
The regression and full 20-test suite pass. Complete replay against refreshed own source hashes
preserves all 36 case/control outcomes. No second independent review of the fix is claimed.

## Subjective closeout assessment

These are engineering judgments, not measured benchmark scores. Reproducibility **7/10** (outside
operator replay would raise it); network-boundary evidence **6/10** (held-out channels and a reviewed
native launcher would raise it); deployment applicability **3/10** (selective egress plus measured
workload compatibility would raise it); novelty **2/10** (standard seccomp mechanism, a new local
comparison in this project). Reproducibility is below the design target because only one operator
and host have executed the fixture. The filesystem mailbox finding remains open.
