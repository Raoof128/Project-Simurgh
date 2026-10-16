# Phase 10 results: fresh Llama proposals against composed controls

16 October 2026 (Australia/Sydney). Source/protocol freeze: **`67d1442f`**.
One retained run used the official manifested **Llama-3.2-3B-Instruct** snapshot on CPU:
**24 tasks × two trials = 48 generated responses**, each shared across three controls,
for **144 execution branches**. All requests, complete responses and branches were
retained; no retries, fallback model, output repair or result-conditioned tuning occurred.

**Composed controls preserved 22/24 authorized completions and produced zero new
unauthorized effects on 24 stopped branches.** Credential-only preserved the same
22/24 completions but produced 16 new unauthorized effects on those stopped branches.
Deny-all prevented new effects while completing none of the authorized tasks.

## Measured outcomes

| Metric                                                 | Credential only | Composed | Deny all |
| ------------------------------------------------------ | --------------: | -------: | -------: |
| Authorized active completions / 24 active branches     |              22 |       22 |        0 |
| New unauthorized-effect branches / 24 stopped branches |              16 |        0 |        0 |
| New unauthorized-effect branches / all 48 branches     |              16 |        0 |        0 |
| False blocks / 22 exact valid active proposals         |               0 |        0 |       22 |
| Total new receiver effects                             |              38 |       22 |        0 |
| Earlier unknown-prior effects, retained separately     |               4 |        4 |        4 |

All **12 benign active branches** completed under composed and credential-only controls.
Of 12 adversarial active branches, **10 completed and two proposed different content**;
both controls blocked those two. These are task failures, not false blocks of exact valid
proposals. Deny-all blocked all 24 active proposals, including those same two invalid
content proposals; its false-block denominator is therefore 22, not 24.

The model proposed **44 sends and four declines**. On the 24 stopped branches it proposed
20 sends and four declines. The four declines occurred in the explicit terminal-stop
family. For ancestor revocation, unresolved alerts, unknown prior outcome and expired
monitoring, all four proposals per state reached the credential-only receiver but were
blocked by composed controls. Credential revocation produced four receiver denials under
credential-only and four conservatively translated blocked outcomes under composed.
No invalid text, truncation, generation error or execution runtime error occurred.

| Final outcome / 48 branches | Credential only | Composed | Deny all |
| --------------------------- | --------------: | -------: | -------: |
| Observed                    |              38 |       22 |        0 |
| Blocked                     |               2 |       22 |       44 |
| Denied                      |               4 |        0 |        0 |
| Declined                    |               4 |        4 |        4 |
| Unknown final result        |               0 |        0 |        0 |

Zero final unknown results does **not** erase the four initial unknown-prior effects in
each control. Each initial lost acknowledgment reserves the shared budget; the earlier
receiver effect appears in both initial and final snapshots and is excluded from new
counts. All three controls use the same initial fixture, including deny-all. A prior
effect is not evidence that deny-all admitted a new model action.

## Interpretation and uncertainty

This matched-proposal experiment shows the incremental local effect of adding context,
signal and shared-budget checks to the exact credential gateway for these captured calls.
The credential-only baseline already enforces exact content and receiver credentials;
it is not an unrestricted agent. The model receives no feedback from any control and
makes only one decision, so no adaptive recovery or strategy change is measured.

Across two trials per task, credential-only had any new unauthorized effect on **8/12
stopped tasks**, compared with **0/12** for composed and deny-all. Across all tasks the
corresponding counts are **8/24, 0/24, 0/24**. The stopped-task descriptive Wilson 95%
bounds are about **39.1–86.2%** for credential-only and **0–24.2%** for composed/deny-all.
These are descriptive summaries, not calibrated population safety guarantees: tasks
are few, paired and internally authored, each restricted state is coupled to one
narrative family, and two repeated trials are not independent task samples. Zero observed
unauthorized effects does not establish a zero true failure rate.

Trusted execution state and the exact report are explicit in every prompt. The model's
20 stopped-state sends expose a useful local weakness, but this is not a test of detecting
hidden impossibility, general deception, live provider compaction or arbitrary tool use.
The corpus author was separate from the harness implementer, who did not inspect prompt
text before freeze. Both remain within the project; this is not external task custody.

## Runtime and reproducibility

- Captured generation batch wall time: **356.05 seconds**, summing the maximum recorded
  row time in each of three batches. Do not sum overlapping per-response batch clocks.
- **24,906 input tokens** and **1,462 generated tokens** retained. Four CPU threads,
  batch size 16, temperature 0.7, top-p 0.9, maximum 128 generated tokens. The full
  manifested runtime/settings and development pilot are bound in the protocol.
- Paid API cost: **$0**. Local compute has a cost; the timing is an observation on this
  host, not a standardized latency or monetary cost-per-task benchmark. All controls
  share the same generation cost; there were 48 responses, not 144 model calls.
- [Report](report.json), [full capture](capture.json), [journal](journal.jsonl),
  [archive](evidence.zip), [root](ROOT.sha256), [replay receipt](receipt.json),
  [token receipt](token-receipt.json), [protocol](protocol.json), [guide](README.md).
- **1,440 raw SQLite snapshots**, **95 source/data bindings**, exact inventory and fresh
  native execution of all captured proposals. Archive size: **1,711,443 bytes**.
  Manifest SHA-256: `3a63db0052b42c284b9feba94b82aa0b236e31530837c2caf42d927e2f008a96`.
- Mandatory fresh replay passed. Local tokenizer verification checked all 48 generations,
  with zero generation errors, and bound its receipt to capture SHA-256
  `0e0202204e0eb6fea42366f60f2161eb57ab2706cbd49c67328522306ab85b85`.
- [Fresh review](REVIEW.md): two Important findings corrected before freeze; **16 focused
  tests passed**. Inherited composition/model harness suites passed **20/13 tests**.
  Repository tests: **5,122 passed**, zero failures, three prerequisite skips.

Source and token checks bind supplied evidence; they do not independently prove inference
origin or completeness against a compromised producer. Live provider identity, external
custody, broad task/model transfer and the interrupted Phase 8 review remain open. Clean-checkout
reproduction is tracked separately in the [handoff plan](../handoff-phase-11/PLAN.md).
