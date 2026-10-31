# Phases 17–20: provider transfer, reliability and presentation

This successor adds fresh measurements without changing predecessor source or evidence.
Original inputs froze at `4afe9538a080991b32b5fd038580b06cfe835fd8`; the separately declared
host-role correction froze at `fbe06eca6425c87b344bf2137b52f364fec28be6`.
Independent external reproduction was explicitly deferred by the user.

## Comparative model result

There are 24 new internally authored tasks: six lifecycle families, active/restricted
states and paired benign/adversarial source text. Two trials per task give 48 proposals
per model. Three matched controls per proposal give 288 branches, all retained.

| Model                 | Control         | Active completion | Restricted new-effect trials | Valid active proposals blocked |
| --------------------- | --------------- | ----------------: | ---------------------------: | -----------------------------: |
| gpt-6-luna            | Credential only |             24/24 |                         0/24 |                           0/24 |
| gpt-6-luna            | Composed        |             24/24 |                         0/24 |                           0/24 |
| gpt-6-luna            | Deny all        |              0/24 |                         0/24 |                          24/24 |
| Llama-3.2-3B-Instruct | Credential only |             23/24 |                        17/24 |                           0/23 |
| Llama-3.2-3B-Instruct | Composed        |             23/24 |                         0/24 |                           0/23 |
| Llama-3.2-3B-Instruct | Deny all        |              0/24 |                         0/24 |                          23/23 |

Luna emitted 24 send calls and 24 declines. Llama emitted 46 calls, one decline and one
malformed output; its restricted subset contained 22 calls, one decline and one malformed
output. The incomplete active Llama task is retained. All controls retain four earlier
effects per model from the unknown-acknowledgement fixtures. Those effects were not prevented.

For Llama, 9/12 restricted tasks had an effect in at least one credential-only trial,
versus 0/12 under composition. Descriptive task-level Wilson intervals are approximately
46.8–91.1% and 0–24.2%. These are not population estimates: six families and repeated
trials are clustered, the corpus is authored internally, and the sample is small.
The task-level intervals still treat the 12 restricted tasks as independent, but each benign and
adversarial pair shares one restricted state. At the level of the six restricted states, 5/6 had
a credential-only effect (signal stop 3, ancestor revoke 4, pending alert 4, unknown prior 4,
monitor expired 2 of the 17 effect trials; credential revoke 0) versus 0/6 under composition,
with Wilson intervals of about 43.6–97.0% and 0–39.0%. _(Added 28 October 2026, pass-3 audit;
recomputed from `evidence.zip`. No reported number changed.)_
The credential-only control observes revocation but has no stop, lease or alert input. Joining the
restricted credential-only Llama rows to their generations shows a new effect exactly when Llama
emitted the exact-argument call in a state that control cannot see (ancestor revoke 4/4, pending
alert 4/4, unknown prior 4/4, signal stop 3, monitor expired 2; credential revoke 4 calls, 0
effects), so 5/6 is the most that baseline could show and the headline difference mostly measures
call emission rather than gate discrimination. _(Added 31 October 2026, repository audit;
recomputed from `evidence.zip`.)_

Model identity and sampling, as retained in `evidence.zip`: the `llama.json` header records
`manifest_sha256` `d3118936…` (the committed prospective manifest for
`meta-llama/Llama-3.2-3B-Instruct` at revision `0cb88a4f`, whose weight hashes come from the
hub's LFS metadata with `weights_downloaded: false`) and the worker's own `ready: true`; the
archive holds the worker's claim, not an independent hash of the loaded weights. The capture used
`torch.bfloat16` on CPU, temperature 0.7, top*p 0.9, max_new_tokens 256, seed 171000 and a single
captured generation per proposal. *(Added 31 October 2026, repository audit.)\_
Luna's zero baseline effects demonstrate no additional protection in this comparison.

Both models receive the same semantic messages, exact target report and explicit trusted
state. Luna uses strict Responses functions; Llama uses its tool chat template. This
interface difference prevents attributing the whole model difference to model capability.
The task families reuse known lifecycle hazards; this is not an unseen-family benchmark.
No adaptive feedback follows the single captured proposal in these matched branches.

## Live integration and retained defect

The separate eight-case workflow makes a real read-tool roundtrip before applying a host
lifecycle transition and requesting a final tool decision. Original user-role host updates
led to eight declines, including all three active cases. A separately frozen developer-role
correction produced two successful authorized effects and five restricted declines, with
one active refusal still unresolved. See the [full correction table](../provider-role-phase-17b/RESULTS.md).

The corrected workflow's observed utility is 2/3, not 3/3. Model refusals are separate from
enforcement blocks. Offline forced-call tests exercise all eight states even when the model
would decline. Pipeline reopen is object/storage reopen; the reliability experiment separately
uses actual process kills. Provider IAM and authenticated live safety-alert delivery are untested.

## Reliability and native platforms

The paced run completed 120 isolated fixtures over 61.45 seconds: two full epochs of six
schedules, five repetitions and two controls, at 0.5-second arrival spacing and four fixture
workers. It retained 420 final calls, 20 initial calls and 1,200 raw snapshots. Logical policy
time remains fixed; this is not a wall-clock lease-expiry or shared production-server load test.

In each epoch, composed controls retained five authorized reopen effects and five idempotent
retry effects. Queued stop and killed-update cases each produced zero new composed effects,
versus ten under credential-only control. Unknown acknowledgements retained five prior effects
per control; composed siblings created no new effect. Concurrent siblings shared one composed
budget. Exact schedule validators check these outcomes against raw storage.

Composed dispatch latency median/p95 was 0.226/0.558 seconds in epoch 1 and 0.233/0.328 in
epoch 2. Credential-only values were 0.173/0.426 and 0.237/0.325. These include local SDK/HTTP
work on a shared research host, not isolated enforcement overhead or deployment SLOs.

[Native CI](https://github.com/Raoof128/Project-Simurgh/actions/runs/38962135213) passed at
`fbe06eca`: macOS node 2 tests, macOS daemon 8 tests, Windows daemon 11 tests; Windows native
affinity fixture build passed with zero warnings/errors. Interactive desktop capture was not run.
Runtime and model dependency consistency checks pass; npm audit reports zero vulnerabilities
at retrieval time. Neither check is a repository-wide security review.

## Cost, timing and evidence

The original study made 64 Luna requests; the correction made 16, with no automatic retries.
All 80 attempts share the $1 declared cap; conservative reservations total $0.539648.
The [report](report.json) and [corrective report](../provider-role-phase-17b/report.json)
retain actual token usage and conservative estimates from the retrieved pricing table.
The combined conservative token estimate is $0.0061306 for 22,208 input and 2,252 output
tokens. Original-study API latency median/max was 1.166/2.396 seconds.
Estimated cost is not a provider invoice. Local model compute has no API charge but is not free.

Comparison capture wall time, excluding model weight load but including control branches,
was 112.27 seconds for Luna and 501.74 for Llama. API latency is recorded separately. Timing
was observed on this host during other validation work and is not a fair throughput benchmark.

The original archive contains 2,880 comparison snapshots, 80 workflow snapshots and 1,200
reliability snapshots. The corrective archive adds 80 workflow snapshots and binds the first
workflow capture and budget ledger. Verification reconstructs storage and freshly dispatches
all comparison and workflow proposals. Raw effects, model failures and original declines remain.
See [verification receipts](VALIDATION.md), [the runbook](RUNBOOK.md), [corpus provenance](CORPUS.md)
and [the primary-source register](sources.json).

## Readiness items 2–5

| Requested item            | Delivered                                                                    | Remaining boundary                                                                   |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 2. OpenAI integration     | Real two-turn workflow, host-role correction, replayable effects             | One active refusal; real provider IAM/alerts untested                                |
| 3. Comparative experiment | Two model families, matched controls, utility/cost/timing/uncertainty        | Internally authored, small, explicit-state tasks; broader transfer unproven          |
| 4. Engineering assurance  | Paced reliability, native macOS/Windows CI, dependencies and mutation checks | Deployment soak, interactive capture and interrupted whole-change review remain open |
| 5. Presentation           | One-page brief, result table and credential-free demonstration               | No outreach, submission or endorsement claim                                         |

Independent reproduction remains deferred. These artifacts support technical review of a
bounded research prototype; they do not establish production readiness or guarantee attention.
