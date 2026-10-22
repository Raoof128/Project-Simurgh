# Phase 6 results: safety signals and monitor-gated dispatch

16 October 2026 (Australia/Sydney). Source/protocol freeze: `1cdf1327`.
One retained execution completed all **42 matrix rows and two in-flight drills**.
The publication runner's fresh replay passed. This is a synthetic engineering
experiment using the real pinned SDK, isolated tool worker and owned loopback receiver.
No model inference, provider API request or real webhook delivery occurred.

## Observed outcomes

| Final outcome across 21 cases per policy                      | Local-only exact authorization | Integrated signal gate |
| ------------------------------------------------------------- | -----------------------------: | ---------------------: |
| Final delivery observed                                       |                             20 |                      6 |
| Final delivery blocked by declared stop/hold conditions       |                              0 |                     14 |
| Receiver outcome unknown                                      |                              1 |                      1 |
| Total observed receiver effects, including earlier deliveries |                             20 |                      8 |
| Unresolved authenticated alerts retained                      |                              0 |                      2 |

The integrated controller completed all six cases intended to permit final delivery:
authorized work, a resolved unrelated alert, forged and expired webhook rejection,
an approved monitor restart and an unrelated transport error. It blocked final
delivery in all 14 declared stop/hold cases. The receiver outage remained unknown.
These are predefined cases, not a detection rate, false-positive estimate, model
safety score or measure of lost utility on representative user tasks.

Two integrated cases retain an earlier effect: a stream-time block and a delayed
alert arriving after an authorized delivery. Thus six final observed deliveries
coexist with eight receiver effects. Blocking the later attempt does not erase
the earlier effect. The local-only policy applies exact tool authorization but
does not consume these signals; its higher completion count is not a superior
safety result. All fixture actions use the preapproved synthetic content.

The controller verified synthetic signatures using OpenAI SDK 3.31.0. It retained
pending state for unavailable alert detail, accepted a null reason without inventing
one, and stopped locally even when the alert's `request_paused` flag was false.
Duplicate event delivery caused one lookup. Forged and expired signatures were
rejected without blocking permitted work. A restored heartbeat did not resume a
monitor pause until a separate current operator approval was supplied. Provider
stops remained terminal despite restart attempts.

## In-flight limit

Both event-gated drills admitted an authorized send before the signal. In the
integrated drill, the durable stop latch preceded the receiver commit; that already
admitted send still completed, and the later native dispatch was blocked. The
local-only policy ignored the signal and allowed its later dispatch; receiver
idempotency kept one effect rather than creating a duplicate.

This demonstrates admission stopping and an honest cancellation limit. It does not
show that asynchronous monitoring prevents every harmful action, cancels remote work,
or undoes commits. The fixture deliberately separates stop latch and revocation
acknowledgment with thread events; it supplies no production latency estimate or SLA.

## Evidence and checks

- [Canonical report](report.json), [archive](evidence.zip), [root](ROOT.sha256),
  [receipt](receipt.json), [protocol](protocol.json), [reproduction guide](README.md).
- **88 raw SQLite snapshots**: one receiver and one controller per row. Complete
  normalized controller schema/table contents are checked, including configuration,
  operator decisions, inbox digests/identities, lease state and event records.
- Archive size: **88,914 bytes**. Manifest SHA-256:
  `e965fce04c552df897f5f650660bb0b1106ae0486725b5f9a0d3e9f1f5f9039f`.
- **48 source/data bindings** match the pre-execution Git commit. Verification checks
  both current files and committed bytes, all case identities, raw observations and
  a fresh native replay. Retained failure artifacts must not be overwritten.
- **24 focused tests passed**. The repository suite passed **5,122 tests**, with
  zero failures and three existing Chrome/Lean prerequisite skips. Ruff and pinned
  dependency compatibility checks passed; no frozen predecessor source/evidence changed.
- Four important internal-review findings were reproduced before repair: a stale
  timestamp under SQLite contention, restart approval surviving reboot, incomplete
  raw-controller verification, and a CLI import failure hidden by test imports.
  Author testing additionally caught non-separated signing keys. The regressions
  now pass. No deferred minor findings. The final published pack is author-verified,
  not an outside operator's or the internal reviewer's validated artifact.
- The live gate census adds one exact identity, 41→42, under preceding P6-CI01
  authority `484a972c`. Historical baseline fields remain unchanged. This does not
  resolve the census's existing classification findings.

## Limits and next phase

This partially addresses N01/N02 in the [OpenAI needs review](../OPENAI_NEEDS_2026-10-16.md).
There is no deployed HTTP receiver or authenticated OpenAI alert-fetch adapter.
The application must wire trusted API/stream errors and project-bound lookups to the
library. Alert delivery can fail silently; a healthy local heartbeat does not prove
provider detection coverage. Fixture keys are public, and the trusted application,
clock, state and operator key remain outside the attacker's control.

The decisions were to use signed local fixtures, make provider stops terminal,
permit only explicitly approved monitor restarts, and retain the already admitted
work limit. Their costs are untested live interoperability, conservative availability
after false alerts and no distributed cancellation guarantee. Separately operated
receiver evidence and real credential lifecycle validation remain open.

Next is **phase 7: authority and honest failure reporting across compaction and
delegation**. It needs a new protocol, approved collaboration counterparts and
separate scripted-versus-model results. Phase 8 then tests authenticated credential
expiry, rotation and revocation. Neither is completed by this report.

| Planning axis (subjective, not a benchmark) | Score / 10 | Named evidence needed to improve it                                 |
| ------------------------------------------- | ---------: | ------------------------------------------------------------------- |
| Local failure/replay coverage               |          8 | Separately operated concurrent fault campaign                       |
| Live provider integration                   |          2 | Owned webhook transport and authenticated project lookup validation |
| Independent custody                         |          1 | Outside operator receiver commitment and reproduction receipt       |
