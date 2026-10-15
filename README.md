# Project Simurgh

**Verifiable security controls for autonomous AI agents.**

Simurgh is a provider-agnostic research prototype for measuring whether agent permissions,
tool-use boundaries and approval controls held, then making the resulting evidence inspectable
and reproducible. Its Verifiable Containment Attestation (VCA) research treats model and guardrail
failures as possible inputs to an experiment.

**Research question:** when untrusted content asks an agent to cross a tool-use boundary, can a
host-controlled authorization gate prevent the simulated consequence, preserve authorized work,
and produce a complete record that another reviewer can recompute?

This repository contains synthetic demonstrations and historical signed research evidence.
It does not establish general model safety, production readiness, or endorsement by OpenAI.

## Start here

[Reviewer index](docs/REVIEWER_INDEX.md) identifies current instructions, historical records and
the evidence needed to challenge each result. The [presentation audit](docs/openai/PRESENTATION_AUDIT.md)
records the scope and limits of the documentation review.

- [One-page OpenAI research brief](docs/openai/OPENAI_BRIEF.md)
- [Claim audit and evidence map](docs/openai/CLAIM_AUDIT.md)
- [Research proposal](docs/openai/PROPOSAL.txt) and [application checklist](docs/openai/APPLICATION_CHECKLIST.md)
- [Evaluation protocol](docs/openai/EVALUATION.md) and [readiness report](docs/openai/READINESS_REPORT.md)
- [Research roadmap](ROADMAP.md)
- [Real-effects assurance lab](docs/assurance/README.md) and [industry gaps](docs/assurance/INDUSTRY_GAPS.md)
- [Complete historical README](RESEARCH_HISTORY.md), preserved verbatim, including the prior
  Anthropic-oriented analysis, stage history, papers and reproduction instructions

## Reproduce the focused demonstration

Use Node.js 22 or newer. Install from the committed lockfile, then run the deterministic,
key-free track:

```bash
npm ci
npm run openai:offline -- --out /tmp/simurgh-openai/report.json
npm run openai:verify -- /tmp/simurgh-openai/report.json
npm run test:openai
```

Use a fresh output path for each run; the runner refuses to overwrite reports. Without `--out`,
it prints the unique temporary path it created. In the managed cloud workspace, add
`--cache /workspace/.npm-cache` to `npm ci` if the default npm cache is not writable.

The demonstration uses authored scenarios and local simulated tools. Read the report's counts,
control results and limitations together. Offline fixtures are not OpenAI model responses or live
benchmark results. The verifier recomputes the declared experiment from its fixtures; this is
reproducibility within a shared implementation, not independently established ground truth.

The optional Responses API track requires explicit opt-in, an owner-selected model and an API key.
Its live behavior remains unvalidated until an authorized capture is executed. No paid run is
required for the offline demonstration. See the [research brief](docs/openai/OPENAI_BRIEF.md) for the
evaluation design and [official-source notes](docs/openai/SOURCES.md) for the integration rationale.

## Read the evidence with its limits

The additive [assurance lab](docs/assurance/README.md) now executes disposable file writes in a
child process and compares reported actions with read-back disk effects. Its 17 authored cases
under three controls are separate from the simulated OpenAI instrument. It includes ordinary
checkpoint and policy baselines, ineffective mutations and explicit unknown outcomes. Run
`npm run test:assurance` and `npm run assurance:verify -- docs/assurance/evidence/report.json`.
The [pinned SDK extension](docs/assurance/sdk/README.md) now reproduces all 102 case/control/runtime
rows through OpenAI Agents SDK and LangGraph approval/resume flows. Proposals remain scripted;
no live model or independent operator was tested.
The [durability extension](docs/assurance/durable/README.md) adds 26 local crash/retry/concurrency
cases with immutable authority and an idempotent file sink. It covers process restart, with
explicit limits on power loss and distributed execution.
The [Redis connector extension](docs/assurance/redis/README.md) adds 19 real-service cases for
conditional writes, lost replies, GET-only recovery, eight-process contention and AOF restart.
An unresolved pre-send attempt remains unknown, making its retry-availability cost explicit.
The [persisted workflow extension](docs/assurance/workflow/README.md) restores actual native SDK
approval checkpoints after application SIGKILL. Its 24 cases include current-policy checks and
replay after an effect; the scope is one approval/tool workflow on a trusted host.
The [incident scope extension](docs/assurance/scope/README.md) adds 54 local HTTP case/control rows
motivated by the 2026 Hugging Face and Australian statistics incidents. It tests exact request
permissions and durable stopping, and retains a known failure: an approved service can relay beyond
the broker's view. The [source review](docs/assurance/scope/INCIDENT_RESEARCH.md) maps further gaps.
The [kernel egress extension](docs/assurance/egress/README.md) now tests an ingress-only Linux
service profile against that onward-request gap. Its 36 rows block eight observed network channels
while preserving two useful operations; a filesystem mailbox remains a documented failure.

The [descriptor isolation experiment](docs/assurance/isolation/README.md) adds 57 rows for exact
file handles, IPC denial and approved preconnected TCP peers. Twelve attack baselines are blocked
while three useful tasks complete; approved channels can still carry unwanted content.

The [local Meta pilot](docs/assurance/meta/README.md) now runs Llama 3.2 1B Instruct on CPU.
A compact prompt produced 13 usable proposals from 15 cases; the initial prompt produced zero.
Both captures are retained, with separate replay under enforced/bypass/deny-all mock controls.

The [frozen repeated Meta workflow study](docs/assurance/meta-study/README.md) adds 24 separately authored cases,
three sampling seeds and real SDK/Redis/isolation adapters. Its 144 attempts yielded only three
valid writes and zero complete workflows; both unsafe bypass writes were blocked. Raw failures
and descriptive uncertainty are published, with model-driven recovery explicitly unexercised.

The [frozen Luna 6 API comparison](docs/assurance/openai-comparison/README.md) uses the same cases
and plain-text prompts. All 144 API calls completed, but multi-message output produced only three
usable reads and zero complete workflows. The failed interface comparison is retained with usage
and all control replays; it supplies no new prevention or model-derived recovery result.

The [native Luna function-call study](docs/assurance/openai-native/README.md) then completes 69 of
72 workflows, including 34 of 36 benign tasks, and executes two model-derived process-kill
recovery probes with one final Redis effect each. Three wrong-tool choices remain failures.
No unsafe bypass effect occurred, so this run establishes useful workflow/recovery evidence,
not a new prevention rate; all earlier captures remain unchanged.

The [fresh-corpus synthetic safety study](docs/assurance/safety-study/README.md) separates deliberate boundary
violations from model behavior. Eight unsafe bypass cases are blocked while both authorized
operations succeed. Luna completes 35/72 fresh workflows but produces no unsafe baseline, so
its prevention rate remains unestimable. Official Llama 3B completes 20/24 workflows and all
12 benign tasks; its four observed unsafe bypass writes are blocked. Results remain bounded
to this synthetic corpus, with failures and limitations retained in the study guide.

The [local Hugging Face incident-pattern simulation](docs/assurance/hf-incident/README.md)
blocks three direct misuse scenarios while preserving approved work. It retains an approved-service
relay failure and, in separate kernel probes, a shared-file mailbox failure. These scripted local
results identify concrete containment gaps; they do not establish prevention of the real incident.

The [composed containment study](docs/assurance/hf-containment/README.md) then combines
service descriptor isolation and scoped gateway credentials. It blocks all 12 scripted unsafe
baselines while preserving both useful workflows, with separate ablations exposing each layer's
gaps. Its [native Llama successor](docs/assurance/hf-native/README.md) blocks one model-selected
scorer mutation but completes only one of two benign prompts; all interface failures remain.
External reproduction and representative production integration are still outstanding.

| Research result                                                                                              | Primary evidence                                                                                                                                         | Boundary                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage 3V-B records 138 guardrail misses contained in a 180-case reference set; targeted attack success 0/150 | [Metrics](docs/research/llm-shield/evidence/stage-3v-b/metrics.json), [write-up](docs/research/llm-shield/LLM_SHIELD_STAGE_3V_B_WRITEUP.md)              | Historical Llama Guard 4 capture, synthetic cases and input-only classifier visibility; not an OpenAI evaluation or general robustness estimate                     |
| Stage 5Q discharged 1,438 of 23,332 obligated cells: **6.2%**                                                | [Discharge ledger](docs/research/llm-shield/evidence/stage-5q/coverage/discharge-ledger.json), [closeout](docs/research/llm-shield/STAGE_5Q_CLOSEOUT.md) | L1 was not certified; Q1 was not authorized; the published incomplete result stays frozen                                                                           |
| Stage 5R added **zero discharged cells**                                                                     | [Delta ledger](docs/research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json), [closeout](docs/research/llm-shield/STAGE_5R_CLOSEOUT.md)          | 8 admissible / 8 attempted / 47 not attempted / 55 families; 0 newly discharged / 15,301 under-supported / 23,332 inherited cells; cumulative coverage remains 6.2% |
| Stage 5S compares authenticated checkpoints for conflicting histories                                        | [Attestation](docs/research/llm-shield/evidence/stage-5s/attestation/vwq-attestation.json), [closeout](docs/research/llm-shield/STAGE_5S_CLOSEOUT.md)    | Comparison-bounded; witness independence is **unproven**; multiple keys and processes belong to one operator                                                        |

Signing binds records to keys and committed bytes. It does not establish ground truth, external
identity or human deliberation. An approval receipt establishes its recorded protocol conditions,
not that a person understood the decision. A clean result applies only to the declared inputs,
comparison set and measured execution surface.

## Existing research mechanisms

- **Authorization boundaries:** context provenance, tool invocation and output checks in
  [`src/llmShield/`](src/llmShield/).
- **Approval and delegation evidence:** [Stage 4Q friction receipts](docs/research/llm-shield/STAGE_4Q_CLOSEOUT.md)
  and [Stage 4S delegation completeness](docs/research/llm-shield/STAGE_4S_CLOSEOUT.md).
- **Offline verification:** canonical records, signed attestations, tamper controls and
  per-stage verifiers in [`tools/simurgh-attestation/`](tools/simurgh-attestation/).
- **Formal models:** [`proofs/`](proofs/) checks selected stated properties. Proofs do not establish
  that an entire implementation, deployment or model is secure.

These capabilities have different evidence levels. Consult the [claim audit](docs/openai/CLAIM_AUDIT.md)
before combining results from separate stages into a new assertion.

## Reproduce historical stages

Historical reproduction scripts require **Node.js 26 or newer**; some additionally require Python,
pytest, Lean or browser tooling. The scripts report their own required gates and skips. A full clone
with historical tags is needed for the VCA chain:

```bash
git fetch --tags
scripts/reproduce-vca-chain.sh
scripts/reproduce-llm-shield-stage5s.sh
```

These are separate historical workflows, not prerequisites for the focused demonstration.
See [historical reproduction instructions](RESEARCH_HISTORY.md#reproduce-it-yourself-offline-no-private-key)
for prerequisites and expected results. Run `npm test` for the repository's unit suite;
`scripts/check.sh` is the broader quality gate. Historical test totals are dated measurements,
not results of the current checkout.

## Repository and version map

| Path or version                           | Meaning                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `tools/openai-readiness/`, `docs/openai/` | Additive OpenAI-oriented evaluation and reviewer package                          |
| `src/llmShield/`                          | Existing containment runtime and provider gateway                                 |
| `tools/simurgh-attestation/`              | Historical research verifiers and evidence builders                               |
| `docs/research/llm-shield/evidence/`      | Historical committed evidence; preserved during this readiness work               |
| `papers/`                                 | Research manuscripts and artifact documentation                                   |
| `package.json` version `0.4.18`           | Historical application package version; retained to avoid implying a new release  |
| Research release `v2.54.1`                | Existing VCA research release line, separate from the application package version |

The earlier device-integrity application remains available as prior research. Its original roadmap
is preserved in [DEVICE_ROADMAP.md](DEVICE_ROADMAP.md). The active research priorities are in
[ROADMAP.md](ROADMAP.md).

## License and status

Research prototype. See [LICENSE](LICENSE), [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md) and
[ethics guidance](docs/ETHICS.md). The package declares `AGPL-3.0-or-later`; this work does not relicense
existing code. Contributions to differently licensed upstream repositories need a separate license
review. See [contribution guidance](CONTRIBUTING.md) for reproducibility and disclosure expectations.
OpenAI application materials are drafts for owner review; no submission or endorsement is
implied.
