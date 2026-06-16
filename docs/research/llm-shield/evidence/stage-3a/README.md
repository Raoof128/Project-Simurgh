# Stage 3A-alpha LLM Shield — Evidence

Fixtures for the input-only LLM safety boundary. Two attack classes
(direct jailbreak, system-prompt extraction), benign-hard prompts including
system-prompt-discussion cases that must pass as safe, and one contexts-rejection
fixture protecting the future 3C provenance boundary.

Reproduce:

    bash scripts/smoke-llm-shield.sh

This boots the server, runs every fixture, and prints attack_block_rate,
benign_pass_rate, and false_positive_rate. See
`docs/superpowers/specs/2026-06-16-stage-3a-alpha-llm-shield-design.md` and
`docs/research/llm-shield/LLM_SHIELD_STAGE_3A.md` (non-claims) for scope and limitations.
