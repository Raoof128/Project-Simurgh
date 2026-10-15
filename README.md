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
The result remains local and synthetic; no SDK, live model or independent operator was tested.

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
