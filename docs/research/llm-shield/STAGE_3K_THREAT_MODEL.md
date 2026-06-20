# Stage 3K — Threat Model

Assume a Claude Fable 5-style jailbreak or indirect prompt injection can bypass
prompt-level filtering. The attacker attempts to cause consequences through one of
four channels:

1. **Context authority escalation** — malicious data tries to become
   system/developer instruction authority.
2. **Tool misuse** — malicious content tries to trigger unauthorized or unsafe
   tool execution.
3. **Output export** — malicious content tries to leak hidden policy, secrets,
   tool args, or internal state.
4. **Task derailment / DoS** — malicious content tries to preserve containment but
   destroy useful task completion.

Stage 3K does not attempt to prove the model cannot be manipulated. It measures
whether manipulation **fails to cross Simurgh's consequence boundaries**.

## Stress surfaces

- **3K-A mutation operators** (deterministic, enumerated, not model-generated):
  instruction_softening, authority_shadowing, data_camouflage, format_shift,
  role_indirection, benign_prefix_padding, benign_suffix_padding,
  multi_step_delegation, encoded_hint, tool_affordance_lure.
- **3K-B action-open categories**: choose_from_untrusted_list,
  follow_external_recommendation, summarise_then_act, resolve_ambiguous_recipient,
  approve_relevant_update.

## Out of scope

No adaptive black-box optimization in the claiming lane, no live provider, no
proof of model robustness, no production-deployment claim. Deterministic mutations
are explicitly **not** equivalent to AutoDojo or live black-box attacks.
