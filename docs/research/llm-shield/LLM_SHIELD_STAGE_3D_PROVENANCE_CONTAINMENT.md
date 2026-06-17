<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3D — LLM Shield Provenance & Containment

**Status:** implemented (mock-provider, mock-tool, metadata-only research prototype)
**Release target:** `v0.6.0-stage-3d-llm-containment`
**Builds on:** Stage 3A-alpha (input boundary), Stage 3B (frozen benchmark), Stage 3C (canonicalize-then-classify + warning tier).

## Steel-thread sentence

> Stage 3D does not prove jailbreak resistance. It demonstrates that jailbreak
> **consequences** can be contained across the context, tool, and output
> boundaries — even when input filtering is incomplete — with metadata-only
> receipts and tamper-evident audit evidence.

> Stage 3D turns LLM safety from prompt refusal into consequence containment:
> context cannot self-promote to instruction authority, tools cannot
> self-authorise, unsafe output cannot silently export, and every boundary
> decision leaves a metadata-only receipt on a verifiable HMAC chain.

## The four boundaries

1. **Input** (unchanged 3A/3B/3C): `safe` / `warning` / `blocked`; a blocked input
   skips the provider.
2. **Context provenance** (`contextProvenanceGuard.js`): untrusted `contexts[]` are
   **demoted to data**; context that forges system/developer authority, is
   malformed, oversize, unsigned-trusted, or carries secret/policy markers is
   **rejected** (provider skipped). No untrusted context becomes instruction
   authority.
3. **Tool invocation** (`toolPolicy.js` + `toolInvocationGate.js`): unsafe tool
   classes (shell, network, secret access, prompt/policy export, `mock_file_read`,
   unknown) are **blocked before any (mock) execution**. The gate never executes a
   tool; tool names are hashed.
4. **Output leakage** (`outputLeakageFirewall.js`): suspected system-prompt /
   developer-instruction / hidden-policy / secret / tool-arg / classifier-internal
   leakage is **blocked before export**; blocked output is hashed, never stored.

A per-session **run risk accumulator** (`runRiskAccumulator.js`) scores each run
and accumulates monotonically across runs; multi-turn softening escalates.
Thresholds are locked (0–2 safe / 3–5 warning / 6+ blocked); point weights are
tunable and finalised by the fixture runner.

## Activation (additive)

Stage 3D runs only when a request carries `contexts`, `tool_mode`, `scenario`, or
`stage3d: true`. Plain `{ input }` requests keep the byte-for-byte 3A/3B/3C path,
so the frozen Stage 3B benchmark and the existing `v1`/`3C` receipt do not drift.
The live route maps a bounded `scenario` enum to committed canned mock outputs;
raw `mock_provider_output` is rejected over HTTP (fixtures-only injection lives in
the direct-import fixture runner).

## Evidence

- 60-case corpus (`evidence/stage-3d/fixtures/`, 10 per category), all passing.
- `evidence/stage-3d/metrics.json` (runner-generated), receipt samples, and the
  captured gate outputs.
- Gates: `scripts/smoke-llm-shield-stage3d.sh`,
  `scripts/security-audit-llm-shield-stage3d.sh`,
  `scripts/privacy-audit-llm-shield-stage3d.mjs`.

## Non-claims (loud)

- Existing 3A/3B/3C non-claims hold: no jailbreak immunity; phrase/canonical/
  heuristic matching is incomplete by construction.
- Stage 3D does **not** prove jailbreak immunity or live-provider safety.
- Stage 3D does **not** replace provider-side safety systems.
- Stage 3D does **not** execute real tools and does **not** call live LLM providers.
- Stage 3D does **not** guarantee all context poisoning or all output leakage is
  detected (deterministic heuristics, finite tables).
- Stage 3D is **not** production deployment.
- **Receipts attest process, not ground truth** — "the configured boundary
  classified/blocked/logged these events," not "the content was truly safe."

## References

- Spec: `docs/superpowers/specs/2026-06-17-stage-3d-llm-shield-provenance-containment-design.md`
- Plan: `docs/superpowers/plans/2026-06-17-stage-3d-llm-shield-provenance-containment.md`
- Threat model: `STAGE_3D_THREAT_MODEL.md`; validation: `STAGE_3D_VALIDATION_MATRIX.md`;
  reviewer checklist: `STAGE_3D_REVIEWER_CHECKLIST.md`; closeout: `STAGE_3D_CLOSEOUT.md`.
