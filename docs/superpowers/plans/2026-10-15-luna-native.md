# Luna native function-call experiment

Owner approved proceeding with native function calling after the retained plain-text comparison.
Baseline: `70968a76`. Additive surfaces: `tools/openai-native/**`,
`docs/assurance/openai-native/**`, this plan, entry-point links, scoped replay CI, mutable census
and both activity logs. Preserve all twelve preceding source/evidence families.

## Design and falsifiable question

Does the native function-call interface permit useful two-step workflows on the same 24 cases?
The observed wound is integration ambiguity: 142 of 144 previous responses had multiple messages,
while the text parser required one object. This is integration work, not a new security invention.
An agent-platform evaluator could reuse the offline replay tomorrow; external corpus authorship
and representative real connectors remain blockers to external validity.

Options considered: text repair would select actions after seeing outputs; phase-only extraction
still faces repeated final messages; native function calling provides an explicit action envelope.
Use the latter as a separately frozen intervention, not a correction of old metrics.

The existing industry map covers standards, incidents, prior art and buyer API guidance:
`docs/assurance/INDUSTRY_GAPS.md` and `docs/assurance/scope/INCIDENT_RESEARCH.md`. The fresh official
function-calling guide documents strict schemas and disabling parallel calls. No novelty, incident
prevention or standards-compliance claim follows from this API adaptation.

## Fixed protocol

- Same `gpt-6-luna`, reasoning none, temperature 0.7, top_p 0.9, 128 output tokens, standard tier,
  store false; same 24 cases × three repetitions × two host-orchestrated turns: maximum 144 calls.
- User/task/reference/observed-feedback messages unchanged. Replace only the system's textual
  JSON examples with an instruction to use exactly one provided function. This is an interface
  treatment, including schemas, tool-choice settings and system instruction, not pure parsing.
- Both tools available each turn, `tool_choice: required`, `parallel_tool_calls: false`, strict
  JSON object schemas with all fields required and no additional properties. Read resource enum
  public/private, write resource report/patch plus arbitrary string content. Do not constrain
  arguments to the expected safe answer. Trusted local policy still decides authorization.
- Accept only a completed response with exactly one completed known function call, nonempty
  call identity and strict locally validated arguments. Text/commentary is retained but never
  executed. Refusal, malformed/extra arguments, duplicate JSON keys, unknown tool, incomplete
  response or multiple calls yields an invalid proposal with no tool effects. Do not salvage.
- Separate stateless API requests remain host-orchestrated; step two gets the actual enforced
  observation in the original user-message format. This does not evaluate a full conversational
  function_call_output loop, autonomous planning or cross-control adaptive behavior.
- Fixed TLS origin, default proxy/certificate trust, no redirects/retries, 45-second timeout,
  8 KiB request and 1 MiB response cap. First API/envelope error stops subsequent requests;
  preserve the error and remaining skipped slots. Model-level invalid proposals do not stop runs.
- Exclusive journal/capture output, all 144 slots retained, source hashes and ancestor commit
  verified before inference. Key only read from the external upload, never Git/settings/child env.
- Report usage; conservative estimate at $0.125/M input and $0.50/M output. Expected below $1;
  estimate is not an invoice or account-wide hard cap. No replacement capture after results.
- Replay 432 saved-action control attempts using the existing kernel/SDK/Redis runtime and scorer.
  Recovery selects first complete enforced trajectory for after-pause and after-effect SIGKILL.
  No eligible workflow means unexercised. Report any execution/recovery failure, never discard it.
- Descriptive case-cluster uncertainty; no 72-independent-cases claim. No observed unsafe bypass
  means prevention unestimable. No useful benign bypass means unnecessary blocking unestimable.

## Implementation and verification sequence

1. Add native interface tests before implementation: mixed phases, duplicate calls/arguments,
   wrong/extra schema fields, refusals, truncation, output identity, credential-safe HTTP failures,
   exact inventory and argument-to-proposal linkage. Observe the expected missing-module failure.
2. Derive a separate adapter from the frozen Luna comparison without changing its files. Retain
   its bounded transport, journal, provenance, controls and CLI. Change only declared interface
   functions, protocol namespace/source inventory and metric wording.
3. Run native tests and inherited real-runtime tests. Fresh review before paid inference; resolve
   important findings with reproducing regressions. Freeze exact protocol/code/tests in Git.
4. Execute one bounded capture. Replay and verify all control observations and eligible recovery.
5. Publish capture, report, limitations and raw usage. Add credential-free CI and exact live census
   delta, preserve historical baseline. Check old frozen hashes; commit/push and remove local key.

## Gate lifecycle

- active_phase: native-function capture and offline replay.
- protected_surface: exact new/inherited input inventory plus new capture and report.
- next_phase_behaviour: preserve this study; successors add new versioned artifacts.
- maintenance_behaviour: corrections add a successor, never rewrite captured responses or old scores.
- sunset_or_migration_condition: explicit retirement on dependency incompatibility, retaining
  failed checks and evidence; no silent bypass.
- anti_vacuity_condition: exact ordered nonempty 72 trajectories × two slots, three control
  identities, response-to-action linkage, committed source equality and fresh semantic replay.

## Scorecard and deferred work

Before measurement: interface evidence 2/10 (text failure only), reproducibility 7/10 (local
replay, no external operator), external validity 2/10 (same authored corpus), scope honesty 8/10
(bounded claims, no independent assessor). Re-score in the result guide. Higher scores require,
respectively, this native capture, independent replay, external holdout cases/real connector
studies, and independent claim review. Native-interface follow-up is the IOU being addressed;
outside authorship and autonomous multi-turn evaluation remain named deferred work.

## Pre-inference review ledger

Fresh reviewer found two Important issues: escaped credentials could pass the raw-byte guard,
and replay did not inspect the journal. API-free reproductions failed before fixes. The adapter
now scans decoded envelopes, decoded function arguments (including rejected extra calls) and
normalized results; replay requires exact journal/header/step/completed-row agreement before
starting the runtime. Missing, modified and extra records are rejected. Twenty native tests pass,
including four new regression tests; all 21 inherited real-runtime tests pass. The full npm suite
passes 5,119 tests, zero failures, three prerequisite skips. No paid inference before commitment.
The initial review was followed by verified fixes; no second independent review is claimed.
