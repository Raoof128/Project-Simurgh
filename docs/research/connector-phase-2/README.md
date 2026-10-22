# Phase 2 reviewer guide: approved report delivery

This experiment composes the OpenAI Agents SDK's native approval interruption,
a mandatory isolated proposal worker, host-owned exact authority and a separate
sandbox inbox process. It tests whether those boundaries still agree after a sender
is killed. All identities, report contents and connector credentials are synthetic.
No paid model, OpenAI key, real inbox or affected incident service is used.

The [protocol](protocol.json) names the case/control matrix before execution. The
[design and ledger](../CONNECTOR_PHASE_2.md) records contracts, scope and decisions.
The [report](report.json) contains every observed effect and source hash.
The [verification receipt](verification.json) records 17 focused passes and 5,122
repository passes with three existing prerequisite skips; hosted CI is recorded separately.

## What to inspect

| Control                              | Useful deliveries / 2 | Unauthorized deliveries / 9 |
| ------------------------------------ | --------------------: | --------------------------: |
| Exact enforcement                    |                     2 |                           0 |
| Authority bypass, isolation retained |                     2 |                           9 |
| Deny-all, isolation retained         |                     0 |                           0 |

Each control also has one invalid-input case and one native rejection. Thus the matrix
has 13 cases × 3 controls = 39 rows. These are deterministic authored proposals, not
39 independent model trials. The model prevention rate is `null`. The two useful
reports differ in approved destination and content; they do not establish broad utility.

Four additional recovery observations record:

1. A real SIGKILL inside a native callback before sending: pending intent remains
   unknown until receiver lookup returns `not_observed`; zero inbox effects.
2. A real SIGKILL after receiver commit and before host success commit: unknown becomes
   `observed` on lookup; exactly one inbox effect.
3. Receiver stopped: fresh reconciliation returns `unknown`; it does not resend.
4. Persisted revocation: explicit retry is blocked; the earlier single effect remains.

The two kill scenarios use separate host databases. The before-send absence is never
silently retried. Unit coverage additionally exercises an explicit, authorized retry
of an absent observation, receipt mismatch and dispatch/revocation lock ordering.

## Reproduce on Linux x86_64

Python 3.12 is required for the pinned SDK environment. Start in the repository root:

```bash
python3.12 -m venv /tmp/simurgh-connector-venv
. /tmp/simurgh-connector-venv/bin/activate
python -m pip install --require-hashes --only-binary=:all: \
  -r tools/assurance-sdk/requirements.lock \
  -r tools/assurance-workflow/requirements.lock
python -m pip check
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tools/assurance-connector/tests -v
PYTHONDONTWRITEBYTECODE=1 python tools/assurance-connector/study.py \
  --verify docs/research/connector-phase-2/report.json
PYTHONDONTWRITEBYTECODE=1 python tools/assurance-connector/study.py \
  --out /tmp/simurgh-connector-fresh.json
```

Use a new `--out` path; existing files are refused. Verification reruns the complete
experiment and compares the full report, exact inventories, dependency versions and
source hashes. A changed file, omitted row or altered effect fails verification.
The `assurance:connector` and `test:connector` npm aliases use the active `python3`;
activate the pinned environment first. No Redis, browser, Lean or provider key is
needed for this phase. Unsupported isolation prerequisites fail the command.

The current workspace already has `/workspace/.venvs/simurgh-assurance-workflow`.
It was reused without changing cloud settings or storing secrets. Hosted CI uses
hash-locked installation and runs the connector checks in the existing workflow job.

## Trust boundary and limits

```mermaid
flowchart LR
  SDK[Trusted SDK: native approval] --> Worker[Isolated proposal worker]
  Worker -->|untrusted proposal only| Host[Host: exact grant and revocation]
  Host -->|authenticated loopback RPC| Inbox[Separate sandbox inbox]
  Host --> Intent[Durable pending intent]
  Inbox --> Effect[Atomic receipt and inbox row]
  Observer[Same-host observer] --> Effect
  Intent --> Recovery[Lookup without blind resend]
  Recovery --> Inbox
```

The SDK and Python bootstrap are trusted and are **not** inside the worker sandbox.
The worker installs the existing Linux seccomp profile, has no path or network
capabilities, and emits its proposal through parent-owned pipes. File-write and new
socket probes must fail before it emits that proposal. The launcher bounds combined pipe capture to 16 KiB, applies a ten-second wall timeout,
and kills its process group on exit; a regression exercises a filtered forked descendant.
CPU, memory and process-count quotas are not implemented. The host treats stdout as
untrusted data and checks exact approval independently. The connector token stays in
the host and receiver; the child receives a scrubbed environment and no connector FDs.

The connector's SQLite inbox row is the effect. Receiver receipt and effect commit
together. A real email API may have different idempotency retention, delivery semantics,
partial failures or receipt trust; those are not covered. Revocation waits behind an
already dispatching transaction, so an earlier effect may complete before revocation
returns. It cannot retract a sent report. Reconciliation does not confer permission.

Receiver inspection is separate from tool output but shares the machine and author.
It is not independent attestation. There is no real SSO, human approval study, token
rotation, tenant administrator, external customer or broad adversarial code corpus.
No claim is made that this would have prevented the Hugging Face or Australian incident.

## Gap disposition and next experiment

| Gap                       | New evidence                                                    | Still open                                                  |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| G14 identity and approval | Exact synthetic identity, native approval, persisted revocation | Enterprise IAM, delegation, operator usability              |
| G15 composed connector    | Native SDK → isolated worker → authority → sandbox inbox        | Vendor connector and deployment hardening                   |
| G16 content release       | Exact content and destination; secret-relay negatives           | Broader content policies and legitimate transformations     |
| G17 unknown outcomes      | Native callback kills, idempotency, lookup and revoked retry    | Remote service failures, retention and distributed ordering |

Phase 3 should freeze held-out benign/adversarial tasks, measure native interface
reliability separately from enforcement, and retain failures/refusals. Phase 4 still
needs an outside operator. A larger model cannot substitute for either step.

Subjective planning scorecard (not a benchmark): local reproducibility **7/10** (next:
fresh-host reproduction receipt); evaluation breadth **4/10** (next: frozen held-out
study); integration **4/10** (next: representative vendor connector and identity adapter);
independent evidence **3/10** (next: outside operator's effect observations). The local
composition improves integration evidence without changing the earlier model results.
