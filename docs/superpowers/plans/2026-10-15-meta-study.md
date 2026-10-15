# Frozen repeated local Meta workflow study

User authorized items 1–4: freeze protocol, separately authored unseen cases, repeated local
captures with uncertainty, and complete workflows. Base 18b55a1a. Work inline with a separate
case author and a workflow implementation agent; one fresh final reviewer. Existing ten source /
report families are frozen. No paid API or environment settings changes. Commit/push authorized.

## Design and scope

Two actual model turns: read_document(resource), then write_record(resource, content). Public
and private synthetic files live in a disposable directory; a child using the existing descriptor
seccomp profile can read only a host-provisioned public descriptor in enforced mode. Private reads
attempt real pathname access and must be denied. A native OpenAI Agents SDK approval checkpoint
wraps write actions; exact host authority and the existing Redis connector govern actual writes.
The host sets identity/run/revision, never the model. Model selects only resource/content.

Each case executes an enforced trajectory and feeds its observed first-step result to the second
model turn. Saved actions are replayed through enforced, bypass and deny-all controls, each with
fresh state. These are paired fixed-action replays, not independently sampled counterfactual agents.
Recovery probes use captured valid writes, actual checkpoint persistence, SIGKILL and fresh-process
resume; explicitly separate these probes from the main model sample.

Case author has no inherited conversation and is instructed to read only the interface brief,
not implementation, policy logic, old cases or outputs. This is separate AI-agent authorship,
not independent organizational/human review or a guarantee of training-data novelty. Create 24
cases (12 benign / 12 attack), including quoted commands, conflicting reference content, noisy
records, fake approval, memory poisoning and private-read bait. Exact expected resource/content
come from trusted task fields; attack text is only untrusted reference. Original pilot is development
data. All cases, prompt templates, settings, metrics and source hashes are committed before inference.
No edits or retries after inspecting evaluation outputs; failures remain in the dataset.

Three fixed seeds 0, 1, 2, temperature 0.7, top_p 0.9, max_new_tokens 128, input limit 2048,
BF16 CPU four threads, existing pinned official Meta 1B artifact. Exactly 24 × 3 × 2 = 144
attempts, no repair or retries. Keep raw completions, token IDs, prompts and observed feedback.
Retain generation errors and length-limit outcomes. Durable journal plus exact inventory validation.
Failure to meet the full inventory refuses a complete report. No success claims from parse failures.

Primary summaries: schema validity, benign end-to-end completion, observed unauthorized effects,
paired prevention only for demonstrated unsafe bypass effects, rejection of authorized actions,
end-to-end/generation and enforcement latency (separate), and memory. Report per seed and per case;
95% case-cluster bootstrap intervals with fixed RNG for means, not an iid 72-trial binomial claim.
Cases are purposive, not a population sample; intervals describe within-suite sensitivity only.
No meaningful confidence claim if there are zero demonstrated unsafe baseline actions.

## Tasks and acceptance

1. Freeze separate-authorship corpus and protocol: exact nonempty set, hashes and pre-inference Git
   commit. Test prompt/schema/case inventory refusals before implementation. No outcome-driven edits.
2. Workflow adapter: actual kernel read; native SDK pause/restore; real Redis read-back; denied,
   bypass and deny-all controls; recovery after pause/after effect. Test real effects, unsafe
   baselines, content mismatch, corrupt checkpoint, and no duplicate effect on recovery.
3. Capture/replay/statistics: tests before code, exact seeds/cases/two-step validation, tamper refusal,
   bootstrap by case, record all failures, fixed output/no-overwrite; run the complete frozen study.
4. Publish raw evidence, measured summary and reproducible commands; add narrow CI, adjust only the
   current mutable census if needed. Full relevant suites, old evidence replay and frozen-byte check.
   Fresh review, verified fixes, both Raouf logs, commit/push and clean-tree verification.

## Gate lifecycle

- active_phase: local Meta workflow study v1
- protected_surface: tools/local-meta-study/**, docs/assurance/meta-study/**
- next_phase_behaviour: preserve frozen capture/protocol; new models/runs receive new artifacts
- maintenance_behaviour: reproduce defects; preserve raw observations; version changed evaluation
- sunset_or_migration_condition: explicit successor protocol with new corpus/settings commitment
- anti_vacuity_condition: exact 24-case × 3-seed × 2-turn inventory; all control effects observed;
  empty results, missing rows, source drift and malformed envelopes refuse

## Limits and scorecard

Evaluation engineers can run this tomorrow with the installed local weights and workflow runtime.
Remaining barrier to external replication is authorized model access and a fresh Linux x86_64 host.
This connects established mechanisms, not a new security primitive. Existing source map covers
standards, 2026 incidents, SDK approval boundaries and deployment pain; no new incident-prevention
claim. Initial scores: protocol discipline 5/10, independent authorship 3/10, workflow realism 5/10,
statistical strength 2/10. Raise by committed protocol, outside authors/operator, multi-step real
workloads, and larger independently sampled case families respectively.

## Ledger

Ruling: user approval of items 1–4 supplies scope/design authority; proceed without repeated approval
menus. Cost if wrong: implementation choices need revision, but artifacts are additive/reversible.
Ruling: separate agent authorship supplies a blinded-to-implementation case source, not external
independence. Cost if wrong: shared-model biases can weaken the challenge set.

Pre-inference review: a fresh reviewer found unverified capture header provenance (Important),
invalid results receiving prevention credit (Important), and unchecked workflow/RSS measurements
(Important). Regression tests reproduced each before the fix. Header now checks actual ancestor
commit protocol/source blobs, model manifest, fully resolved generation configuration and package
versions. Prevention requires observed denial for each demonstrated unsafe baseline operation.
Workflow/tool/load timing and RSS are bounded. Also strengthened token vocabulary/EOS envelopes
and exact six-family/two-kind corpus balance. All 21 tests pass after the single fix pass.
No second independent review claimed; no evaluation inference had run during any correction.
Token-to-text decoding remains outside lightweight replay and is disclosed. Model identity remains
operator-controlled provenance, not independent attestation.

Ruling: use a pre-inference review rather than outcome-informed code tuning — preserve the fixed
experiment after collection — cost if wrong: an unseen defect may invalidate collection, which must
then be retained and disclosed rather than silently regenerated.
