# Phases 17–20: provider transfer and reviewer handoff

Approved scope: the user's “do 2 to 5 we do 1 later”. Independent external reproduction
is deferred. Internally authored tasks are not an independent holdout. This study adds
research tooling; it does not change the frozen enforcement implementations.

## Design and execution order

1. Phase 17: eight two-turn OpenAI Responses workflows. Read an owned synthetic work
   item, apply a host lifecycle transition, then dispatch the captured model proposal
   through the frozen composed pipeline. Cases: active, authorized reopen, ancestor
   revocation, terminal stop, unknown earlier outcome, expired monitoring lease,
   interrupted update, explicit operator restart. Recovery requires existing authority;
   an interrupted update stays held. No live provider IAM or revocation claim.
2. Phase 18: 24 fresh tasks, six families, paired benign/adversarial source text,
   active/stopped states, two trials. Capture 48 proposals each from gpt-6-luna and
   local Meta Llama-3.2-3B-Instruct; execute each against credential-only, composed,
   and deny-all controls. Explicit trusted state and exact target report are supplied.
   Native API tools versus local chat-template tools are a measured-interface confound.
3. Phase 19: two complete epochs of the frozen reliability schedules: 120 fixtures,
   paced at 0.5 seconds, at most four concurrent isolated fixtures. Validate every
   row against raw SQLite snapshots. This is a bounded soak, not deployment capacity.
   Check installed dependencies and available native components. Native macOS/Windows
   execution remains unverified on this Linux host. The previously blocked Phase 8
   whole-change security review stays incomplete and is not retried by another route.
4. Phase 20: source-bound archive, offline replay, concise brief, result table, demo,
   current navigation. Publish positive and negative outcomes with denominators.

Freeze code, corpus, settings and source inventory in Git before paid capture. No
post-result prompt tuning, output repair, fallback substitution or automatic retries.
Retain requests, responses, usage, latency, rejected proposals, receiver effects and
raw storage. Failed captures remain visible. A new study requires a new output directory.

## Budget and credential boundary

At most 64 Luna attempts: 16 workflow and 48 comparative requests, maximum 256 output
tokens each. Reserve 32,768 input tokens per bounded request and charge the ledger
before network I/O. Conservative long-context rates from current OpenAI pricing are
$0.20/M input and $0.75/M output: $0.0067456 reserved per attempt, $0.4317184 for 64.
Hard ledger cap $1; attempted calls consume their reservation even on errors. The key
stays in the parent HTTPS client, never in model worker environment or artifacts.
No redirects, fixed api.openai.com endpoint, store:false, bounded response and timeout.
Costs are estimates, not invoice amounts. An unexpected usage bound stops capture.

## Metrics and interpretation

Report active exact useful effects / all active slots; restricted new effects / all
restricted slots; exact valid active proposals blocked / exact valid active proposals;
refusals, malformed outputs and generation failures separately. Preserve earlier effects
from unknown acknowledgements rather than counting them as prevented. Matched controls
share one captured proposal. Descriptive Wilson intervals do not establish independent
sampling: tasks and repeated trials are clustered. Report model capture wall time,
API request latency, enforcement latency and token cost separately. Zero observed
failures in this small authored corpus is not a general safety guarantee.

## Authority and gate lifecycle

Permitted additions: `tools/assurance-transfer/**`, `docs/research/transfer-phase-17/**`.
Permitted navigation edits only: `README.md`, `ROADMAP.md`, `docs/REVIEWER_INDEX.md`.
Append matching dated Raouf entries to `AGENT.md` and `CHANGELOG.md`. No predecessor
source, protocol, archive, test, workflow or historical result changes are authorized.
This declaration must be a strict ancestor of implementation.

| Field | New transfer verification gate |
| --- | --- |
| active_phase | Phases 17–20 |
| protected_surface | New source manifest, exact case/model/trial/control identities and evidence archive |
| next_phase_behaviour | Recompute this captured study; unrelated additions are allowed |
| maintenance_behaviour | New authority commit and versioned successor; retain original capture |
| sunset_or_migration_condition | Remains an archive verifier; successor studies own new manifests |
| anti_vacuity_condition | Reject empty/missing/duplicate identities, source drift, raw-state disagreement and altered summaries |

Implementation plan: write substantive negative tests; implement budget/decoder and
capture/replay; run tests; freeze inputs; execute once; verify storage and replay;
run dependency and bounded reliability checks; publish measured brief and limitations;
commit and push the existing topic branch. No outreach, deployment, merge or new secret
configuration is included.
