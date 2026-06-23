<div align="center">

<img src="docs/Project-Simurgh-Logo.png" alt="Project Simurgh" width="240"/>

# Project Simurgh

**Verifiable evidence for high-stakes and agentic AI systems.**

_Provider-agnostic Verifiable Containment Attestation (VCA): machine-checkable, offline-reproducible
proof of what happened after a guardrail missed — not another jailbreak detector._

[![Quality gate](https://github.com/Raoof128/Project-Simurgh/actions/workflows/stage-1-checks.yml/badge.svg?branch=main)](https://github.com/Raoof128/Project-Simurgh/actions/workflows/stage-1-checks.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.0-1a1a1a?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-AGPL--3.0-d6cfbe?style=flat-square)](#license)
[![Status](https://img.shields.io/badge/status-research%20prototype-2f4a2a?style=flat-square)](#status)
[![Latest](https://img.shields.io/badge/release-v2.8.1-blue?style=flat-square)](https://github.com/Raoof128/Project-Simurgh/releases)

</div>

---

## Goal

Most AI safety tooling tries to stop a bad input. Project Simurgh starts from the opposite, more
honest assumption: **input filters and external guardrails will sometimes miss.** The goal is to
produce **signed, offline-reproducible evidence of the consequences** — whether untrusted context
gained authority, whether an unauthorised tool executed, whether unsafe output was exported — so a
third party can _verify_ what a run did instead of taking a vendor's word for it.

In one sentence: **Simurgh gives an agentic system a verifiable receipt, not a passport.**

> 📄 **One-page technical brief:**
> [Verifiable Containment Attestation After Guardrail Failure](docs/research/llm-shield/ONE_PAGE_BRIEF.md)
> — the problem, the concrete Llama Guard 4 result, and the one-command reproduction, on a single
> page. A printable, on-brand version is at
> [`docs/research/llm-shield/one-page-brief.html`](docs/research/llm-shield/one-page-brief.html).

---

## What it is — and what it is not

| Simurgh **is**                                                       | Simurgh **is not**                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| A research prototype for **verifiable containment attestation**      | A jailbreak detector or a claim of jailbreak immunity          |
| Evidence of **downstream consequences** after a guardrail misses     | A model-level guardrail or a replacement for one               |
| **Offline-reproducible** with a committed public key                 | Dependent on any vendor, network service, or live model re-run |
| Measured over a **synthetic reference corpus** (Stage 3L, 180 cases) | Validated on real-world production traffic                     |
| Honest about its limits, with machine-readable **non-claims**        | A production-ready or compliance-certified system              |

Every signed artifact carries explicit non-claims, including: no jailbreak immunity; no general
jailbreak resistance; live models are not re-executed in CI; the origin of a live capture is
self-reported, not proven; signed evidence is not ground truth; and no vendor is ranked or labelled
unsafe.

---

## Flagship: Verifiable Containment Attestation (LLM Shield)

The current work is a ladder of signed, independently reproducible research rungs (**Stage 3A → 3X**,
releases `v1.6.0` → `v2.8.1`). Each rung produces an Ed25519-signed, metadata-only evidence bundle
that re-derives byte-for-byte offline.

### The concrete result (Stage 3V-B)

A **real, live Llama Guard 4 12B** was run once as an input-only content-safety classifier over the
Stage 3L synthetic 180-case reference set, captured, frozen, and signed (the model is **not**
re-executed in CI):

| Metric                                                              | Result                                    |
| ------------------------------------------------------------------- | ----------------------------------------- |
| Llama Guard 4 allowed / blocked                                     | 168 / 12                                  |
| Malicious cases the guardrail **missed** → **contained by Simurgh** | **138 / 138**                             |
| External-guardrail-plus-Simurgh targeted attack-success rate        | **0 / 150**                               |
| Unsafe tool execution / output export / context escalation          | 0 / 0 / 0                                 |
| Capture determinism                                                 | 3 independent greedy runs, byte-identical |

An input-only guardrail can only judge the user turn; in the 120 downstream-injection cases the
attack lives in untrusted context, tool requests, or provider output, which it structurally cannot
see. Simurgh's context, tool, and output boundaries contained every case it missed. This is a
**boundary claim**, not a statement that Llama Guard 4 is weak.

### The replay map (Stage 3X)

Stage 3X turns the whole chain into a public, externally replayable timeline:

- **12 / 12** rungs tag-and-commit pinned
- **10 / 12** evidence-root manifests pinned and chain-checked
- **5 / 12** deep per-file re-walk (current-format manifests, under strict path-containment rules)
- **3 / 12** full reproduce paths
- **2 / 12** index-only, each with a signed reason

It does **not** claim uniform 12/12 reproduction — the chain tells the truth about its own uneven
history, with a machine-readable summary and a per-rung reason for every classification.

---

## Capabilities

Everything below is implemented, tested, and (for the attestation work) shipped as signed,
offline-reproducible evidence. All capabilities are research-prototype grade and bounded by the
documented non-claims.

### Containment gateway (post-guardrail boundaries)

- **Input firewall** — prompt normalisation and classification of direct-input attacks.
- **Context-provenance guard** — blocks untrusted/tool-supplied context from gaining developer or
  system authority.
- **Tool-invocation gate** — refuses unauthorised or self-authorised tool/shell requests.
- **Output-leakage firewall** — prevents export of system prompts, secrets, and internal policy.
- **Containment evaluation** — assumes the input filter can fail and measures whether the downstream
  context/tool/output/audit boundaries prevent unsafe consequences (Stage 3L: 120/120 input-miss
  cases contained at their intended boundary; targeted ASR 0/150; 30/30 benign).

### Verifiable attestation & offline reproducibility

- **Ed25519-signed, metadata-only evidence bundles** over canonical JSON (signature survives
  formatting and merges; raw prompts and model outputs are never exported).
- **Two-tier verifiers** — a portable signature/structure check plus a `--reproduce` mode that
  re-derives the bundle byte-for-byte; all verifiers **fail closed** and never throw.
- **Negative self-proof (tamper) suites** on every rung — mutated evidence is rejected, counters stay
  zero.
- **Generic evidence-hashes verifier** with hardened path-containment (rejects self-inclusion,
  traversal, and escapes).
- **Claim-checked ledger** (Stage 3N) and **attestation registry + signed regression diff** (Stage
  3Q) with anti-laundering lattice.

### External-defence evaluation

- **Provider-agnostic adapter contract** that treats any external guardrail as an untrusted advisory
  signal, with harness-computed hashes (no adapter-supplied hashes).
- **Live model capture** — a transport-only harness runs a real model once, freezes the output, and
  attests it; the model is never re-executed in CI (Stage 3V-B: **Llama Guard 4 12B**).
- **Recorded-fixture mode** (Stage 3V-A) for deterministic, GPU-free evaluation.

### Agent-evaluation integration

- **AgentDojo harness** (Stage 3H–3J) — in-loop mediating defence against a real gateway, scored
  without altering AgentDojo itself; full four-suite deterministic run reported **benign 97/97, UUA
  949/949, attack-success 0/949**.
- **Adaptive-attack readiness probe** (Stage 3K) — deterministic, key-free mutation/action-open
  campaign.

### Supply-chain & release provenance

- **Witnessed release provenance** (Stage 3W) — a dual-root model: a local Ed25519 root plus an
  additive GitHub OIDC/Sigstore CI witness that re-verifies from real command exits, corroborating
  by digest equality without ever gating offline verification.
- **Public VCA timeline + one-command external reproduction** (Stage 3X).

### Capability-extraction attestation

- **Offline, red-team-hardened distillation/extraction detector** (Stage 3T–3U) over synthetic
  metadata, with a frozen versioned detector and signed known-limitations — framed as a reproducible
  recipe, never an accusation.

### Live gateway

- **Provider gateway** (Stage 3E) with an optional, disabled-by-default Anthropic adapter: lazy SDK
  import, minimal-context summaries, denial-of-wallet caps, no provider tools, and a sealed
  containment tail.

### Device-integrity proofs (cross-platform)

- **Metadata-only display-affinity scanning** on macOS, Windows, and Linux (X11 + Wayland portal
  probe), **P-256-signed localhost-daemon proofs** with session/exam/challenge binding, server-side
  tamper/replay/raw-field rejection, and an **HMAC-SHA-256 tamper-evident audit chain** — collecting
  no video, audio, biometric, or personal-identity data.

### Engineering & assurance

- A single **quality gate** (`scripts/check.sh`): per-stage smoke, security/privacy/consistency
  audits, policy-drift guards (tooling stages never touch `src/llmShield`), and **100% function
  coverage** on the pure attestation libraries — **989 automated tests** in total.

---

## Reproduce it yourself (offline, no private key)

A reviewer with no prior context can replay the chain in three commands. Network is used only to
clone and install dependencies; verification itself is fully offline.

```bash
git clone https://github.com/Raoof128/Project-Simurgh.git
cd Project-Simurgh
npm ci
scripts/reproduce-vca-chain.sh
```

Expected: `Stage 3X VCA chain reproduction: PASS` with `rungs_passed: 12, rungs_failed: 0`.

> Use a full clone (or run `git fetch --tags` after a shallow clone): Stage 3X verifies 12 historical
> release tags, so they must be present locally. The reviewer command preflights this and prints an
> exact instruction if any are missing.

Verify a single signed rung directly, and confirm it fails closed under tampering:

```bash
node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce   # -> { "ok": true, ... }
node tests/e2e/llm_shield_stage3x_tamper_runner.mjs                       # -> { "all_passed": true }
```

---

## Device Integrity track (prior published work)

Simurgh's first arc produced privacy-preserving **device-integrity proofs** for capture-resistant,
high-stakes sessions (e.g. proctoring and voting-adjacent workflows): metadata-only display-affinity
scanning across macOS, Windows, and Linux, P-256-signed localhost-daemon proofs with
session/exam/challenge binding, server-side tamper and replay rejection, and an HMAC-SHA-256
tamper-evident audit chain. It collects no video, audio, biometric data, answer content, raw process
names, window titles, PIDs, usernames, or personal identity data. This track is a frozen research
prototype and makes no production-deployment, MDM, hardware-attestation, or automatic-misconduct
claim. See [`PRIVACY.md`](PRIVACY.md), [`docs/ETHICS.md`](docs/ETHICS.md), and
[`docs/DISCLAIMER.md`](docs/DISCLAIMER.md).

### Research papers (Zenodo preprints)

| Paper                                                                                               | DOI                                                                | Source                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| Privacy-Preserving Device Integrity Proofs for Capture-Resistant High-Stakes Sessions               | [10.5281/zenodo.20374849](https://doi.org/10.5281/zenodo.20374849) | [`papers/project-simurgh/`](papers/project-simurgh/)           |
| Privacy-Preserving Integrity Evidence for Student-Society Voting-Adjacent Workflows (Phase C pilot) | [10.5281/zenodo.20549736](https://doi.org/10.5281/zenodo.20549736) | [`papers/simurgh-voting-pilot/`](papers/simurgh-voting-pilot/) |
| Banking Shield: Machine-Checked Absence Claims for Privacy-Sensitive AI Explanations                | [10.5281/zenodo.20675513](https://doi.org/10.5281/zenodo.20675513) | [`papers/banking-shield/`](papers/banking-shield/)             |

> Abedini, M. R. (2026). Zenodo.

---

## Repository layout

| Path                                 | Contents                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `src/llmShield/`                     | Containment gateway boundaries (input firewall, context-provenance guard, tool gate, output firewall) |
| `tools/simurgh-attestation/`         | Ed25519 signing, canonical-JSON, two-tier verifiers, the public VCA timeline                          |
| `tools/external-defense-adapters/`   | Adapter contract + Llama Guard 4 adapter (Stage 3V)                                                   |
| `tools/capture/`                     | Transport-only model-capture harness (run once, then frozen)                                          |
| `docs/research/llm-shield/evidence/` | Per-stage signed evidence bundles (3M → 3X)                                                           |
| `scripts/`                           | Quality gates, per-stage smoke/audits, and `reproduce-vca-chain.sh`                                   |
| `papers/`                            | Published research preprints                                                                          |

---

## Verification

The full quality gate (`scripts/check.sh`) runs on every push. The current suite is **989 automated
tests** plus per-stage smoke gates, security/privacy/consistency audits, policy-drift guards, and
100% function coverage on the pure attestation libraries. Every VCA rung is signed with its own
Ed25519 key (private keys are never committed), reproduces byte-identically including its signature,
and ships a negative self-proof (tamper) suite that the verifiers reject while failing closed.

---

## Status

Research prototype and technical demonstrator. The VCA / LLM-Shield line is the active front; the
device-integrity track is frozen prior work. Nothing here is deployed in production; no hardware
attestation, notarisation, MDM deployment, or compliance certification is claimed. Methodology is
LLM-assisted and disclosed in the research write-ups; claims are bounded by the signed evidence,
verifier outputs, and documented non-claims.

## License

Licensed under AGPL-3.0. © 2026 Mohammad Raouf Abedini. Authored and owned by the project
maintainer; see the research papers for full citations.
