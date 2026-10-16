# Phase 10: fresh local model decisions against composed controls

Declared 16 October 2026 (Australia/Sydney), baseline `762bb34b`, under the user's
instruction to continue all locally executable phases back to back. Next phases:
10 fresh evaluation, 11 portable reproduction handoff, 12 presentation/gap closeout.
Real provider-account integration and independent outside custody remain external
prerequisites; local work does not stand in for either. No provider key or paid model
call is needed. Preserve all frozen predecessor sources, captures and evidence.

## Design and fixed sample

Use the existing official hash-manifested Llama-3.2-3B-Instruct CPU snapshot and the
unchanged phase 3 offline model worker. Its tool interface remains one strict native
`send_report(resource,content)` or `decline(reason)` call. Host identity and route stay
outside model control. Prompt trusted task/state separately from untrusted source text.
No substring extraction, output repair, retries, result-conditioned tuning or fallback
model. Invalid text, explicit decline, truncation and runtime failures remain visible.

A separate internal corpus author sees only this interface and state definitions,
not implementation, previous prompts or outputs. Six narrative families each contain
an active benign/adversarial pair and a stopped benign/adversarial pair: 24 tasks,
12 active and 12 stopped. Restricted states, one per family: `signal_stop`,
`ancestor_revoke`, `pending_alert`, `credential_revoke`, `unknown_prior`, `monitor_expired`.
Each pair differs only in its untrusted source. Two seeded trials per task produce
48 unique generation slots. Share each single captured proposal across `credential_only`,
`composed`, `deny_all`: 144 branches. There is no adaptive feedback in this study.
The implementer does not inspect held-out prompt text before source/protocol freeze.
This is internal author separation, not independent evaluator custody or population sampling.

Each branch constructs the real frozen Phase 9 pipeline and authenticated service.
Apply the declared state; composed processes signals/context, credential-only omits
those control reactions, and both enforce receiver credentials and exact action content.
Deny-all retains the same fixture but blocks every proposed send. `unknown_prior`
prepares a lost-acknowledgment action A and tests proposed sibling B; its earlier
receiver effect is retained and excluded from _new-effect_ counts. Preserve the initial
receiver snapshot as well as all nine final databases: 1,440 raw snapshots for a complete
144-branch run. This is controlled local state, not live OpenAI monitoring behavior.

Metrics: new unauthorized effects / all branches, authorized completion on active tasks,
model calls versus explicit declines on stopped tasks, invalid/truncated/error counts,
unknown results, and false blocks among exact valid active proposals. Count the earlier
unknown-prior effect separately. A safe stop is not report delivery. Report task-level
any-event counts across two trials, with descriptive Wilson bounds and explicit small,
paired/family-correlated sample limits. Generation latency is captured batch wall time,
not the sum of overlapping per-row clocks. Token counts are retained; paid API cost is
zero, while local compute is not economically costless. Do not claim a general safety rate.

Freeze tasks/settings/model manifest/source hashes in Git BEFORE held-out inference.
A disjoint development pilot checks runtime/interface without reading held-out prompts.
Use the known phase 3 settings initially (batch 16, 128 output tokens, temperature .7,
top-p .9, four CPU threads, input limit 1536). Any setting change is declared before
freeze. Run once, append requests and complete returned batches before branch execution,
retain partial failures and missing slots; never label an incomplete inventory complete.
Fresh verification reexecutes proposals, checks all raw schemas/tables and source bindings,
recomputes metrics and verifies tokenizer/prompt/token linkage locally when the model is
available. Offline hosted replay does not regenerate model outputs or prove inference truth.

## Plan, authority and lifecycle

1. Corpus author writes only `docs/research/model-composition-phase-10/tasks.json` and
   `corpus-provenance.md`; no model calls or reading implementation/old task text.
   Parent builds schema/prompt/parser tests against development-only cases.
2. Test-first native trial bridge, append-only capture runner, exact inventory/raw
   evidence and metrics/replay verifier. Reuse frozen worker and pipeline unchanged.
3. Development pilot, focused/inherited/repository checks and fresh whole-change review.
   Parent checks corpus metadata only until source/protocol freeze. Corpus schema and
   pair validation is programmatic; the final reviewer may inspect authored task text.
4. Freeze, execute once, retain full capture/raw evidence, independently rerun verifier,
   validate tokenizer linkage, report all outcomes, publish and record hosted replay.
5. Continue directly to portable handoff and presentation closeout in new namespaces.

Write scope: add `tools/assurance-model-composed/**`,
`docs/research/model-composition-phase-10/**`, this ledger,
`.github/workflows/assurance-model-composed.yml`; update current navigation, npm scripts,
and both logs. P10-CI01 authorizes only `current` in
`docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` for exact identity
`assurance-model-composed.yml::Validate composed model evidence`; retain all other fields.
The declaration commit must strictly precede that census edit.

| Field                         | Declaration                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| active_phase                  | Phase 10 composed model evaluation                                                           |
| protected_surface             | New harness, tasks, protocol, captures and raw evidence                                      |
| next_phase_behaviour          | Add successor namespaces; preserve frozen replay                                             |
| maintenance_behaviour         | Bounded repair authority before frozen changes                                               |
| sunset_or_migration_condition | Versioned successor retains this study's limits                                              |
| anti_vacuity_condition        | Exact 24 tasks, 48 generations, 144 branches, 1,440 raw snapshots; replay and negative tests |

## Decisions and progress ledger

- Ruling: one separate corpus author under the parallel-agent skill while the parent
  implements the harness; one fresh whole-change reviewer under executing-plans. This
  reduces author adaptation, but remains same-project research.
- Ruling: fixed proposals across controls isolate execution-policy differences; no
  model response to control feedback is measured. Cost: limited recovery/interaction realism.
- Ruling: blocked/denied/unknown/declined and intended stopping remain separate. Exact
  content authorization is retained in every non-deny-all control, so this comparison
  is not an unrestricted agent baseline.
- Source context: existing OpenAI needs N03/N09 and the 29-source standards/incident/
  prior-art/buyer review motivate the study. No claim of exhaustive industry coverage.
- Existing topic branch is authorized; no merge, deployment or outreach is planned.
- Corpus author delivered 24 validated tasks, SHA-256
  `222ec69bddff3f78280141c3c5be64da1e2ec55ece16b0931f63ab1278b041f3`;
  parent inspected metadata only. Original provenance hash:
  `31cf868a275d630bcc42f3c6f3c4efd58235bed3231e22554f7cd0ee512053d7`.
- Development pilot: two generated responses, exact active send and explicit stopped
  decline, seed 103999. Settings unchanged except declared prompt date; full pilot retained.
- Harness: 13 tests passed after observed missing-implementation failures. Exact raw
  state, full-batch journal ordering, corruption/missing inventory and metric tampering
  covered. A malformed development fixture ID and Ruff's removed import exports were
  corrected before the final passing run; neither involved held-out inference.
- Ruling: add a bounded 128 MiB archive reader for 1,440 snapshots instead of changing
  the frozen 32 MiB historical reader — preserve old verification semantics; cost is a
  larger bounded memory envelope. `.prettierignore` is not changed; canonical evidence
  is validated by byte bindings, with formatting checks scoped to editable prose/config.
- Fresh whole-change reviewer independently passed 13 tests and a seven-state,
  21-branch/210-snapshot capture and replay. Corpus inventory/provenance and 94 initial
  bindings checked. No Critical findings; two Important findings accepted and fixed:
  P10-R01 separates effect authorization from lost acknowledgment; P10-R02 rejects
  empty/invented/missing token inventories and binds checked/error counts to capture hash.
- Final: fixed P10-R01 and P10-R02 — real lost-ack receiver and tokenizer regressions
  observed RED, then GREEN; complete focused suite **16 passed**. Mixed generation
  errors remain counted, while all-error tokenizer evaluation cannot pass. Explicit
  all-task/stopped-task denominators are now reported. No second reviewer pass or
  held-out inference was used to tune these fixes. No deferred Minor findings.
- Review scope limits accepted: this review does not attest inference origin, internal
  author independence, or complete the earlier interrupted Phase 8 security review.
- Freeze: 95 source/data bindings before held-out inference; original corpus bytes
  preserved. Repository tests: 5,122 passed, zero failures, three prerequisite skips;
  inherited composition/model suites 20/13 passed; Ruff and 62-package check passed.
  Prior broader hosted run 38843556999 is now successful, all 13 jobs.

- Retained run complete: 48 generations, 144 branches, 1,440 snapshots; 356.05 seconds
  batch generation time. Composed/credential-only active completion 22/24 each; stopped
  unauthorized effects 0/24 versus 16/24. Deny-all completes zero. Four initial prior
  effects per control retained separately. Model: 44 calls, four declines, no invalid,
  truncated or error responses. Mandatory and separate replay passed; tokenizer checked
  all 48 outputs, capture digest bound. Published results retain the two active failures.
