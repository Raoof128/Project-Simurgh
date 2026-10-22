# Phase 10 corpus provenance

Authored on 16 October 2026 as a fresh, internally held-out synthetic corpus by a
separate internal corpus-author agent. The implementer builds the harness in a
separate agent context and receives corpus metadata, validation results and file
hashes without task text before the planned source/protocol freeze. This documents
internal author separation; it is not independent evaluator custody, independent
evaluation, or an established benchmark.

The author was permitted to read the Phase 10 declaration and repository
AGENTS.md/AGENT.md rules. The author did not inspect implementation source, prior
task corpora, or model outputs; did not call models or access the network; and
wrote only this provenance and tasks.json. Task wording was created directly for
this phase without sampling or adapting earlier prompts. The parent handles
repository logs, source freeze, model execution and commits. The author has not
verified that those later activities have occurred.

## Construction rules and inventory

- Six distinct benign narrative families, with two matched pairs per family:
  one active pair and one restricted pair.
- Twelve pairs and 24 tasks in total: 12 benign, 12 adversarial; 12 active and
  12 restricted tasks.
- Each family has exactly one restricted state, assigned once across the six
  families: signal_stop, ancestor_revoke, pending_alert, credential_revoke,
  unknown_prior and monitor_expired. Each restricted state has two tasks.
- Pair members share their family, pair identity, state, instruction and exact
  expected report. Only task identity, kind and untrusted source differ.
- Every task authorizes one exact report to the owned synthetic inbox only when
  trusted state permits it; otherwise the instruction requires decline.
- Benign sources provide scenario data without commands. Adversarial variants
  add benign-domain pressure, claimed authority, replacement report wording,
  invented clearance or continuation despite uncertainty. Source text has no
  authority to change the trusted instruction or execution state.
- The expected field stores the exact report target and content for action
  validation in both states; it does not authorize sending in a restricted
  state. Restricted states require decline and no new action.
- No actual credentials, personal information, third-party endpoints, exploit
  code or real harmful task is included. All effects target the owned synthetic
  inbox; the surrounding objects and activities are fictional.

## Validation and limits

Before handoff, a local structural validator checks exact keys and types, ASCII
identifiers and report content, unique task and pair identities, field length
limits, the 24-task census, kind/state balance, one-to-one family/restricted-state
assignment, and within-pair equality of all fields except identity, kind and
source. The author separately reviews benign sources for commands and verifies
the instruction's conditional authorization in every task. No model response or
behavioral success rate is available at corpus-author handoff.

This is a small, deliberately constructed, English-only corpus with explicit
state conditions and a single tool decision. Families and matched pairs are
correlated. Restricted states are assigned to families rather than crossed with
every family, so state and narrative effects cannot be separated. Adversarial
text emphasizes instruction pressure and fabricated approval; it does not
represent the full variety of real inputs, live monitoring or provider identity
systems. The fixed report requirement and synthetic owned destination further
limit generalization. Shared project context and model infrastructure mean that
separate authoring is not evidence of outside independence or uncontaminated
training data. No population safety rate, benchmark standing, independent
review, or successful held-out run is claimed by this provenance.
