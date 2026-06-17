# Stage 3A-alpha LLM Shield — Evidence

Fixtures for the input-only LLM safety boundary. Two attack classes
(direct jailbreak, system-prompt extraction) and benign-hard prompts including
system-prompt-discussion cases that must pass as safe. (The former
contexts-rejection fixture documented an alpha-only limitation that Stage 3D
lifts: `contexts[]` is now a governed provenance channel — see the Stage 3D
context-provenance corpus under `evidence/stage-3d/`.)

Reproduce:

    bash scripts/smoke-llm-shield.sh

This boots the server, runs every fixture, and prints attack_block_rate,
benign_pass_rate, and false_positive_rate. See
`docs/superpowers/specs/2026-06-16-stage-3a-alpha-llm-shield-design.md` and
`docs/research/llm-shield/LLM_SHIELD_STAGE_3A.md` (non-claims) for scope and limitations.
