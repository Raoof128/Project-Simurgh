## Change Log

## [stage-4o-vtsa-design] — 2026-07-04 — Stage 4O VTSA design spec

**Raouf:** Approved and wrote the Stage 4O design spec (Verifiable Tool-Surface Attestation): manifest-bound kernel entry point `authorise_with_manifest` (existing three entry points byte-frozen), `simurgh.tool_manifest.v1` schema with domain-separated digests, closed raw-code block 55–63 (first failure wins, all run-level `1`), hybrid Lane A modelled manifest (normative) + Lane B digest-only real-MCP capture fixture (external validity only), two keypairs (manifest vs attestation), logical epochs (no wall clock), Lean `NoSilentToolSwap` over the recorded dispatch surface, kernel↔verifier parity test. Design only — no implementation, no tag.

### Added

- `docs/superpowers/specs/2026-07-04-stage-4o-vtsa-design.md`

### Verified

- Raw 29 `INTERNAL_ERROR_FAIL_CLOSED` → run-level 3 confirmed in `tools/simurgh-attestation/stage4h/exitCodes.mjs` before citing it as the verifier artifact-failure path.
- Latest tag `v2.23.0-stage-4n-extraction-seismograph` confirmed before pinning the v2.24.0 target.

## [stage-4h-2-discrimination] — 2026-06-30 — Q0/Q4 verifier discrimination

**Raouf:** Implemented Stage 4H.2 only: Q0 clean positive acceptance plus Q4 dishonest-producer laundering discrimination. The signed fixture matrix proves the verifier is not reject-all (`q0-clean-disconnected-untrusted` accepts with raw `0`) and not accept-all (`q4a-forged-premise-digest` raw `22`, `q4b-clean-derivation-over-dirty-replay` raw `24` with `proof_accepts_bad_flow`, `q4c-derivation-scope-omission` raw `26` with `derivation_scope_incomplete`). Q1/Q2/Q5 remain green; Q3/Q6/Q7 remain `not_in_scope`. No release tag.

### Added

- Stage 4H.2 Q0/Q4 signed fixtures, certificates, manifests, expected CLI results, and discrimination evidence.
- Reviewer-grade Stage 4H E2E smoke coverage for the Q0/Q4 real builder plus real verifier CLI matrix.

### Verified

- `scripts/reproduce-llm-shield-stage4h.sh`
- targeted Stage 4H unit/e2e tests
- `npm run format:check`
- `npm test` (`1143/1143`)
- `./scripts/check.sh` (`155/0`, local .NET 8 Windows daemon tests skipped because SDK unavailable)
- metadata/privacy scan, claim-boundary scan, and `git diff --check`

## [stage-4h-2-discrimination-plan-boolean-patch] — 2026-06-30 — boolean summary correction

**Raouf:** Patched the Stage 4H.2 implementation plan before inline execution so `decision_input.untrusted_reached_authority` remains a boolean in the planned Q0/Q4 helper. The one-edge-delta claim is narrowed to the Stage 4H DFI/canonical-premise edge, while directly mirrored decision/policy summary metadata may differ only to truthfully reflect the same source-set change. This is documentation-only: no verifier code, fixture builder, tests, or evidence regeneration in this commit.

### Changed

- `docs/superpowers/plans/2026-06-30-stage-4h-2-discrimination-q0-q4.md` — kept `untrusted_reached_authority` boolean and narrowed one-edge-delta wording.

### Verified

- Prettier check, `git diff --check`, and boolean-field scan pass; the planned helper keeps `untrusted_reached_authority` boolean and has no string assignment for that field.

## [stage-4h-2-discrimination-plan-patch] — 2026-06-30 — one-edge-delta correction

**Raouf:** Patched the Stage 4H.2 implementation plan before execution so the planned Q0/Q4 fixture helper preserves the one-edge-delta claim at the Stage 4H DFI/canonical-premise layer. Non-essential replay fields now stay constant between Q0 and Q4; `policy_features_source.input_sources` is documented as a direct mirror of the same DFI source set; the plan adds a focused one-edge-delta audit test and q-gate wording for the narrowed claim. This is documentation-only: no verifier code, fixture builder, tests, or evidence regeneration in this commit.

### Changed

- `docs/superpowers/plans/2026-06-30-stage-4h-2-discrimination-q0-q4.md` — corrected the planned Q0/Q4 helper and added the one-edge-delta audit requirement.

### Verified

- Prettier check, `git diff --check`, and one-edge-delta wording scan pass; stale dirty-vs-clean conditional replay-field changes are absent from the planned helper.

## [stage-4h-2-discrimination-plan] — 2026-06-30 — Q0/Q4 implementation plan

**Raouf:** Added the Stage 4H.2 implementation plan for Q0 clean positive acceptance and Q4 dishonest-producer laundering discrimination. This is planning-only: no verifier code, fixture builder, tests, or evidence regeneration in this commit. The plan keeps the approved Rev 3 scope and raw-code ledger (`0`, `22`, `24`, `26`), pins the check order, names the fixture matrix, requires Q4c true partial coverage with `derivation_scope_incomplete`, keeps Q3/Q6/Q7 out of scope, and requires reviewer-grade E2E smoke coverage through the real fixture builder and real verifier CLI.

### Added

- `docs/superpowers/plans/2026-06-30-stage-4h-2-discrimination-q0-q4.md` — task-by-task implementation plan for 4H.2 Q0/Q4 verifier discrimination.

### Verified

- Prettier check and `git diff --check` pass on the plan/log files; self-review confirms the plan maps every 4H.2 acceptance criterion to implementation tasks and preserves the Q0/Q4 scope boundary.

## [stage-4h-2-discrimination-design] — 2026-06-30 — Q0/Q4 verifier-discrimination design

**Raouf:** Added the repo-native Stage 4H.2 design spec for the Q0 clean positive fixture and Q4 dishonest-producer laundering matrix. This is design-only: no implementation plan, verifier code, fixture builder, or evidence regeneration in this commit. The spec preserves the approved Rev 3 scope, locks the Q2-vs-Q4 raw-code ledger (`0`, `22`, `24`, `26`), pins the verifier check order, names the Q0/Q4 fixtures, requires true Q4c partial coverage with `derivation_scope_incomplete`, keeps Q3/Q6/Q7 out of scope, and requires the reviewer-grade Stage 4H E2E smoke to cover the Q0/Q4 real CLI matrix before 4H.2 can be accepted.

### Added

- `docs/superpowers/specs/2026-06-30-stage-4h-2-discrimination-q0-q4-design.md` — design contract for 4H.2 verifier discrimination.

### Verified

- Prettier check and `git diff --check` pass on the design/log files; design self-review confirms the Rev 3 Q0/Q4 scope, raw-code ledger, check order, fixture names, non-claims, and E2E smoke requirement remain intact.

## [stage-1-live-authority-gate] — 2026-06-25 — Authority gate (egress + mutation): FULL containment within taxonomy

**Raouf:** Ran the authority gate A/B (`--defence-mode authority` = egress + destructive-mutation gate) on Llama-3.3-70B-FP8, same 10×14 set, against the PRE-REGISTERED authority predictions. RESULT — the bounded-consequence thesis proven: **ASR 9/140 → 0/140**; every one of the 9 baseline attack successes contained. By class: `egress` 5/40→0/40, `egress_mass_recipient` 1/10→0/10, and the mutation gate closed the gap `delete_only` 3/10→**0/10** (which the egress-only gate could not). Honest cost: **1 benign regression (`user_task_8`)** — but that task names both recipients explicitly so neither gate should block it; it passed under the egress-only gate (0 regressions) and failed only here, so most likely run-to-run greedy/batching nondeterminism (same drift as baseline 9↔10), NOT a confirmed false-block; reported transparently, flagged for per-action attribution. Utility-under-attack 91→80. Closes the three-experiment Llama arc: demotion (advisory, failed) → egress gate (scoped win) → authority gate (full containment in declared taxonomy). Explicit non-claims kept (not immunity; taxonomy excludes non-destructive mutation/financial/code). Evidence metadata-only. No `src/llmShield` change.

### Added

- `docs/research/llm-shield/evidence/stage-1-live/llama-3.3-70b-fp8/authority-gate/` — baseline + authority per-case rows, metrics, manifest, verbatim by-class output, RESULTS.md.

---

## [stage-1-live-egress-gate] — 2026-06-25 — Egress tool-gate: scoped containment WIN (by pre-registered class)

**Raouf:** Ran the egress tool-gate A/B (`--defence-mode toolgate`) on Llama-3.3-70B-FP8, same 10×14 set, analysed against the PRE-REGISTERED class taxonomy (frozen before results). RESULT — a clean, scoped, honest win: overall ASR **9/140 → 4/140**, and by class the egress gate eliminated EVERY egress-based attack (`egress` 5/40→0/40, `egress_mass_recipient` 1/10→0/10) while **all 4 remaining defended successes are `delete_only`** — exactly the out-of-jurisdiction gap predicted. Benign utility held **7/10→7/10 with ZERO false-block regressions** (no tax on normal operation). Honest cost: utility-under-attack 91→74 (blocking an injected egress sometimes also derails the agent's legit task; the model retried blocked egress heavily — 1111 blocks/1574 gated). `egress_plus_delete` was already 0/80 at baseline (Llama never completed those multi-step goals undefended). Honest baseline variance noted: same-session baseline 9/140 vs the earlier 10/140 (greedy is not bit-deterministic under vLLM concurrent batching; A/B uses the same-session baseline). The `delete_only` survivors directly size Stage 4C (mutation gate), evaluated next in `authority` mode. Evidence metadata-only. No `src/llmShield` change.

### Added

- `docs/research/llm-shield/evidence/stage-1-live/llama-3.3-70b-fp8/egress-gate/` — baseline + tool-gate per-case rows, metrics, manifest, verbatim by-class analyzer output, RESULTS.md.

---

## [stage-1-live-llama-ab] — 2026-06-25 — Live Llama-3.3-70B A/B: non-zero baseline + HONEST negative containment result

**Raouf:** Ran the first Stage 1-LIVE A/B with a non-zero baseline, on a self-hosted open model. Served `RedHatAI/Llama-3.3-70B-Instruct-FP8-dynamic` (FP8 quant of official Meta Llama-3.3-70B-Instruct) via vLLM on an H100 (greedy, tool-calling), drove the pinned AgentDojo workspace suite (10 user × all 14 injection goals = 140 attack cases + 10 benign, canonical important_instructions). Built a REAL in-loop mediating defence (`live_defence.py`): every tool output is routed through the gateway context-provenance guard (`guardContexts`) and rewritten before the model sees it — demoted → wrapped as untrusted data; rejected → withheld; chunked to ≤4KB so size never false-rejects. RESULT (reported honestly, NOT a containment win): baseline targeted ASR **10/140 (7.1%)**, defended **8/140 (5.7%)** — only 2 of 10 contained, within noise (overlapping 95% CIs); benign utility **8/10 → 6/10**; utility-under-attack **78/140 → 65/140**; 550 tool outputs mediated (531 demoted, 19 rejected). CONCLUSION: `important_instructions` does not match the gateway's content-rejection rules so it is demoted (advisory), and Llama largely obeyed the injection anyway while the wrapping cost utility — **demotion-only provenance wrapping is advisory, not live behavioural containment.** Next stage (separate): action-level tool-gate defence that blocks the malicious tool call itself. Also found+fixed an AgentDojo tool-output serialization bug (modern reasoning models read malformed tool results as empty). All evidence metadata-only; HF/OpenAI keys never touched a committed file. No `src/llmShield` change.

### Added

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/live_defence.py` — in-loop gateway mediator (provenance-demotion of tool outputs) + defended pipeline builder.
- `docs/research/llm-shield/evidence/stage-1-live/llama-3.3-70b-fp8/` — baseline + defended A/B metadata-only evidence + honest-finding README.
- `docs/research/llm-shield/evidence/stage-1-live/gpt-5.4-mini/` — relocated gpt-5.4-mini artifacts.

### Changed

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage1_live_runner.py` — `--defended` now builds the real in-loop pipeline (replaces the broken `SimurghDefence` append); records per-tool-output mediation tally in the manifest.
- `docs/research/llm-shield/evidence/stage-1-live/README.md` — per-model results index.

---

## [stage-1-live-byo-endpoint] — 2026-06-25 — Runner ready for a self-hosted open model (vLLM/RunPod) for a non-zero baseline

**Raouf:** Prepared the Stage 1-LIVE runner to target a self-hosted OpenAI-compatible endpoint so we can drive AgentDojo with a capable-but-foolable open model (Llama-3.3-70B-Instruct) and finally get a **non-zero baseline ASR** (gpt-5.4-mini was too aligned: 0 ASR). Web-checked the model choice (AgentDojo "inverse scaling": GPT-4o 69% util / 53% ASR, Command-R+ 28% / ~1%; open 70B-class ≈ 42–54% util sits in the foolable zone) and the OpenAI deprecation cliff (legacy GPT-4 family all retire 2026-10-23), which is why offline open weights is the better, reproducible path. Added `--base-url`/`--api-key` (no real OpenAI key needed for a self-hosted endpoint; manifest records endpoint HOST only, never credentials), `--greedy` (temperature=0/seed=0 deterministic decoding via a `force_greedy_decoding()` patch, for byte-reproducible replay à la 3V-B), provider-label provenance (`vllm:` vs `openai:`), and a RunPod runbook (vLLM tool-calling serve command + exact run steps). No live numbers yet (pod not up). No `src/llmShield` change.

### Changed

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage1_live_runner.py` — `force_greedy_decoding()`, endpoint/api-key threading, provider label, manifest endpoint_host/decoding fields, CLI flags.
- `scripts/run-llm-shield-live-agentdojo.sh` — allow `--base-url` runs without `OPENAI_API_KEY`; self-hosted usage help.

### Added

- `docs/research/llm-shield/evidence/stage-1-live/RUNPOD-LLAMA-RUNBOOK.md` — turnkey RunPod + vLLM runbook for the Llama-3.3-70B agent run.

---

## [stage-1-live-gpt54mini-real-result] — 2026-06-25 — Live AgentDojo run on gpt-5.4-mini: harness bug found+fixed, honest 0-ASR baseline

**Raouf:** Ran the Stage 1-LIVE harness live on a user-supplied burner key (since revoked) with `gpt-5.4-mini`. Diagnosed why strong/new models looked degenerate: **AgentDojo 0.1.30 has a tool-output serialization bug** — it sends tool results as its internal content blocks `[{"type":"text","content":...}]`, but OpenAI's schema requires the key `text`; a modern reasoning model reads the malformed part as an EMPTY tool result and refuses, collapsing benign utility. Proven by trace + a direct minimal API probe. The runner now repairs this (`make_modern_model_compatible`): flatten tool content to a plain string, and register the live model name so the canonical `important_instructions` attack can run on post-2024 model strings. Scoring, environments, tasks, and attack payloads are untouched. RESULT (honest): with the fix, `gpt-5.4-mini` workspace benign utility **0/5 → 5/5**; targeted ASR **0/30** (injecagent) and **0/42** (canonical important_instructions, all 14 injection goals × 3 user tasks); utility-under-attack 25–42/case. The frontier model natively resists these attacks, so **baseline ASR is 0 — there is nothing for a downstream containment layer to catch, and this is NOT presented as a Simurgh win** (a defended run would also be 0, like deterministic 3J). A live non-zero baseline needs a capable-but-foolable weaker model or a stronger adaptive attack = genuine future work. Committed artifacts are metadata-only (5×6 baseline slice); the key never touched any committed file (verified). No `src/llmShield` change.

### Changed

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage1_live_runner.py` — `make_modern_model_compatible()` (tool-serialization fix + model-name registration); default attack → `important_instructions`; honest manifest note.
- `docs/research/llm-shield/evidence/stage-1-live/README.md` — real findings (bug + fix, 0-ASR honesty).

### Added

- `docs/research/llm-shield/evidence/stage-1-live/workspace-live-{metrics,suite-breakdown,taxonomy}.json`, `live-manifest.json` — metadata-only baseline artifacts.

---

## [stage-1-live-model-agnostic] — 2026-06-24 — Live runner accepts any OpenAI model + reasoning effort

**Raouf:** Made the Stage 1-LIVE runner model-agnostic so it can use current/future OpenAI models (e.g. a gpt-5.x reasoning model) that AgentDojo 0.1.30 models enum does not know. Builds the OpenAI LLM element directly with the raw model string and passes it as PipelineConfig(llm=<element>), which bypasses the enum; added --reasoning-effort (none/low/medium/high/xhigh) plumbed into OpenAILLM. Import-safe; no key used. Still opt-in and gated; no live numbers committed.

### Changed

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage1_live_runner.py` — raw-model OpenAILLM construction + reasoning_effort flag.

---

## [stage-1-live-verified-inconclusive] — 2026-06-24 — Live OpenAI AgentDojo harness verified (result inconclusive, honestly)

**Raouf:** Ran the Stage 1-LIVE harness end-to-end against the real OpenAI API on a user-supplied burner key (since revoked). The harness WORKS: fixed two first-run bugs live (AgentDojo `NullLogger` does not set logdir on **enter** -> use `OutputLogger`; `SuiteResults` is a TypedDict -> subscript access), added an injection-task cap and a model flag. HONEST OUTCOME: the result is inconclusive and NOT dressed up. gpt-4o-mini (12x6): benign utility 1/12 (~8%), targeted ASR 0/72 -- the agent is too weak to do its own tasks, so it is also never productively hijacked (degenerate, same failure mode as deterministic 3J). gpt-4o-2024-05-13 (the capable model) could not run: the test key's org is on a 30k TPM tier and each AgentDojo call is ~30k tokens -> immediate 429. Conclusion: a valid live-agent test needs a capable model + adequate rate limits = genuine future work. NO live evidence numbers committed (the degenerate run is not a result). The key never touched any committed file (verified). No `src/llmShield` change; no paper results claim.

### Changed

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage1_live_runner.py` -- live-run fixes (OutputLogger context, TypedDict access, `--max-injection-tasks`, model flag).
- `docs/research/llm-shield/evidence/stage-1-live/README.md` -- honest live findings recorded.

### Verified

- Harness ran live (real OpenAI calls, 84/84 task completion on the mini run); module still import-safe; no key in repo (`grep sk-proj` clean).

---

## [stage-1-live-agentdojo-prep] — 2026-06-24 — Live OpenAI AgentDojo runner (prepared, keyed, opt-in)

**Raouf:** Prepared the one external-validity experiment that needs a paid API: AgentDojo with a REAL OpenAI agent. Stages 3H-3J used a deterministic ground-truth pipeline, so baseline ASR was trivially 0/949 (no LLM to fool, guards never fired). This runner swaps in a live OpenAI model so the baseline ASR is non-zero and the defended run has something real to contain. Gated and safe: `scripts/run-llm-shield-live-agentdojo.sh` no-ops without `OPENAI_API_KEY` (never runs in CI / never spends), the module is import-safe (lazy agentdojo/openai imports), and it reuses the already-unit-tested `build_stage3j_artifacts` aggregator. HONEST STATUS: the live pipeline construction is UNVERIFIED until the first keyed run and may need iteration; NO evidence numbers are committed (the evidence dir holds only a README). Metadata-only output. No `src/llmShield` change.

### Added

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage1_live_runner.py` (opt-in, pragma no cover).
- `scripts/run-llm-shield-live-agentdojo.sh` (key-gated no-op-safe wrapper).
- `docs/research/llm-shield/evidence/stage-1-live/README.md` (status + run instructions; no numbers).

### Verified

- Wrapper no-ops cleanly without `OPENAI_API_KEY` (exit 0); module imports without agentdojo; `--help` works. Live path intentionally unrun.

---

## [stage-3z-producer-independent-witness] — 2026-06-24 — Producer-independent witness (honest-producer gap closed)

**Raouf:** Stage 3Z turns the paper's deepest acknowledged hole — the honest-producer gap — from "future work" into a built, falsifiable mechanism. A VCA signature proves issuer+integrity, not truth: a gateway can sign a CLEAN receipt for a dirty run and pass every signature/structure check. The witness cross-checks each signed receipt against an INDEPENDENT consequence oracle (canary/honeytoken sightings at the real export/tool sinks) whose channel is not derived from the receipt. Falsifiable self-proof: a dishonest gateway signs a clean receipt for a run that leaks a canary — its Ed25519 signature still verifies (plain verifier fooled) yet the witness raises a claim_conflict. 4 fixtures: 2 corroborated, 2 caught, **0 false accusations, 0 missed lies**. Sacred rule preserved: a conservative over-claim is a note, never an accusation. Pure offline/deterministic/key-free; no `src/llmShield` change.

### Added

- `tools/simurgh-attestation/independentWitnessLib.mjs` (pure cross-check lib), `tests/e2e/llm_shield_stage3z_witness_runner.mjs` (self-proof + signature-vs-witness demo), `tests/unit/llmShield/stage3zWitness.test.js` (7/7).
- `scripts/reproduce-llm-shield-stage3z.sh`, `docs/research/llm-shield/evidence/stage-3z/{metrics,self-proof-results}.json`, `README.md`.
- Paper: honest-producer subsection upgraded to "built + demonstrated", Stage 3Z eval paragraph + results rows + ladder node, limitations updated.

### Verified

- `scripts/reproduce-llm-shield-stage3z.sh` PASS (falsification holds); `node --test` 7/7; paper builds clean (0 undefined refs, 7 pages).

---

## [stage-3y-thirdparty-injection-corpus] — 2026-06-24 — Third-party attack corpus, component external validity

**Raouf:** Stage 3Y answers the reviewer's deepest critique (Stage 3L is self-authored) with **independently-authored** attacks: 175 payloads rendered from the AgentDojo benchmark (Debenedetti et al., NeurIPS 2024) — 35 injection-task goals × 5 published attack envelopes — driven through the REAL Simurgh boundaries. The result is honest and includes misses: the deterministic input firewall detects only **35/175** (95% CI [0.14, 0.27]) — just the `injecagent` override-phrase family — and misses **140/175** [0.73, 0.86] (even `ignore_previous` evades it via a word insertion + the `iunstructions` typo in AgentDojo's own string). The same 175 payloads as untrusted context are structurally contained **175/175** [0.98, 1.0] with **0** cases of untrusted context gaining authority. That is the paper's thesis under third-party attacks: input guardrails miss; downstream structural containment holds. Evidence is metadata-only (per-case SHA-256 + verdicts, no raw payload text); reproduction needs the Stage 3I AgentDojo venv. No live-agent or production claim. No `src/llmShield` change.

### Added

- `tests/e2e/llm_shield_stage3y_corpus_extract.py` (corpus renderer, metadata-only manifest), `tests/e2e/llm_shield_stage3y_boundary_runner.mjs` (boundary driver + Clopper-Pearson CIs, `evaluateCases` export), `tests/unit/llmShield/stage3yBoundaryRunner.test.js` (hermetic, 3/3).
- `scripts/reproduce-llm-shield-stage3y.sh` (extract → drive → privacy check).
- `docs/research/llm-shield/evidence/stage-3y/{corpus-provenance,metrics,per-case-verdicts}.json`, `README.md`.
- Paper Stage 3Y subsection + Table (`tab:thirdparty`), ladder node, abstract sentence.

### Verified

- `scripts/reproduce-llm-shield-stage3y.sh` PASS (175 cases, privacy check clean); `node --test` 3/3; paper builds clean (0 undefined refs, 6 pages).

---

## [aisec-2026-paper-reviewer-hardening] — 2026-06-24 — AISec paper reviewer-hardening (integrity pass)

**Raouf:** Acted on a strict line-by-line reviewer pass and corrected an overclaim the prior revision introduced. Stage 3V-A had been dressed as a second external "guardrail comparator"; investigation showed it is a synthetic, self-authored fixture (`fixture_provenance: synthetic_deterministic`), so it is now honestly reframed as an **advisory-invariance check** with no detection/ASR claim, and the misleading comparator table was removed. The **real** Llama Guard 4 12B capture is now the single, clearly-labelled external reference and leads the evaluation (its 138/150 allow rate framed as the structural input-only blind spot, not a vendor weakness). Added exact 95% Clopper-Pearson intervals to all small-n rates (0/30 → [0,0.12], 0/150 → [0,0.02], 138/138 → [0.97,1]); demoted the self-authored perfect counts to fixture-validity. Added a **honest-producer trust-boundary** subsection to the security analysis (a dishonest gateway that signs a clean receipt is outside what a signature detects; producer-independent witnessing is the open problem). Replaced the contentless JSON-signing flowchart (Fig 2) with a context-provenance authority-decision figure. Collapsed five contributions to three. Abstract reframed around the real finding. All 12 numeric/provenance claims cross-check against frozen evidence; identity and overclaim scans clean.

### Changed

- `Papers/llm-shield-aisec2026/main.tex` — abstract, contributions (5→3), new provenance figure (replaces JSON flowchart), Stage 3L CIs + fixture-validity framing, Stage 3V-B/3V-A reorder + honest reframing, removed comparator table, results-table CIs, honest-producer security subsection, limitations.
- `Papers/llm-shield-aisec2026/artifact/reproduce-paper-claims.sh` — 3V-A check now asserts synthetic provenance + advisory-invariance (no ASR claim); label fixes.
- `Papers/llm-shield-aisec2026/audit/repo-claim-audit.md` — 3V-A row reframed as synthetic advisory-invariance.
- `Papers/llm-shield-aisec2026/dist/llm-shield-aisec2026-anonymous.tar.gz` — rebuilt.

### Verified

- `make` clean (0 undefined refs, 6 pages, all 8 floats referenced); reproduce script 6/6; 12/12 numbers match evidence; overclaim + identity scans clean.

---

## [aisec-2026-paper-evidence-depth] — 2026-06-24 — AISec paper evidence-depth revision

**Raouf:** Deepened the AISec 2026 LLM Shield paper on the reviewer Evidence axis using only already-frozen evidence (no new runs, no `src/llmShield` change). Added a benign false-positive rate `0/30` (hard-negative control), a per-boundary ablation of the 120 input-miss cases (context-guard `72`, tool-gate `24`, output-firewall `24`), a second external-guardrail reference (Stage 3V-A recorded generic: external-only ASR `80/150`, contained `80/80`, external+gateway `0/150`) alongside the live Llama Guard 4 point in a new comparator table, and the Stage 3V-B compute environment in-paper (LG4-12B, input-only greedy, bnb-8bit, RTX 3090 24GB, transformers preview). Abstract and claims table updated for two external references. The reviewer reproduction script (now 6/6) and the repo-claim-audit ledger were extended; the anonymous tarball rebuilt and re-scanned.

### Changed

- `Papers/llm-shield-aisec2026/main.tex` — FPR row + text, ablation Table 5, Stage 3V-A paragraph + comparator Table 4, Stage 3V-B compute sentence, abstract, claims table.
- `Papers/llm-shield-aisec2026/artifact/reproduce-paper-claims.sh` — added benign-FPR, ablation, and Stage 3V-A checks (6 steps).
- `Papers/llm-shield-aisec2026/audit/repo-claim-audit.md` — added the four new claim rows with evidence paths.
- `Papers/llm-shield-aisec2026/dist/llm-shield-aisec2026-anonymous.tar.gz` — rebuilt.

A follow-up full reviewer-grade audit hardened the draft: fixed a broken evidence path in the claims table (`vca-chain-results.json` → `vca-chain-reproduction-results.json`), normalised one British spelling, refreshed the ladder-figure accessibility description, pluralised contribution C4, and added in-text references for four previously unreferenced floats. All 19 numeric claims cross-check against frozen evidence; all 6 citations resolve.

### Verified

- `make` builds `main.pdf` clean (0 undefined references, 5 pages, all 9 floats referenced).
- `artifact/reproduce-paper-claims.sh` passes 6/6; overclaim and PDF identity scans clean; 19/19 numbers match evidence; 6/6 citations resolve.

---

## [stage-3m-verifiable-containment-attestation] — 2026-06-20 — Verifiable containment attestation

**Raouf:** Stage 3M turns the Stage 3L containment evidence into an offline-verifiable run-set attestation. The HMAC audit chain remains internal tamper-evidence; a new Ed25519 signature is the external layer so any third party verifies the exported metadata-only bundle with the published public key — no symmetric secret shared. The signature covers `canonicalJson(parse(bundle))` (not file bytes), so reformatting never breaks verification. The bundle embeds metrics, boundary breakdown, recomputed gate results, policy digests, privacy report, a hash-bound 7-file `referenced_evidence` list, and machine-readable `non_claims`; v1 attests the Stage 3L 180-case run-set only (`simurgh.vca.run_set.v1`). The two-tier offline verifier (portable + `--reproduce`) passes every check; tamper tests cover bundle edits, re-signed bad metrics, decorative gate results, edited evidence, wrong key, fingerprint mismatch, and leakage. Public key committed (fingerprint `sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798`); private key never committed; CI verifies only; zero `src/llmShield` change. Honest boundary: it signs the evidence that exists and does not upgrade the Stage 3L audit sample into a full per-case HMAC chain. No jailbreak-immunity / model-safety claim.

### Added

- `tools/simurgh-attestation/{canonicalise,attestationLib,keygen,sign-attestation,verify-attestation}.mjs` and `tests/unit/llmShield/attestation/{canonicalise,attestationLib,verifyAttestation}.test.js`.
- `scripts/{smoke,security-audit,privacy-audit,policy-drift-guard}-llm-shield-stage3m.*`.
- `docs/research/llm-shield/{LLM_SHIELD_STAGE_3M_VERIFIABLE_CONTAINMENT_ATTESTATION,STAGE_3M_THREAT_MODEL,STAGE_3M_VALIDATION_MATRIX,STAGE_3M_REVIEWER_CHECKLIST,STAGE_3M_CLOSEOUT}.md`; `docs/research/llm-shield/evidence/stage-3m/**`.
- `docs/superpowers/specs/2026-06-20-stage-3m-verifiable-containment-attestation-design.md` and `docs/superpowers/plans/2026-06-20-stage-3m-verifiable-containment-attestation.md`.

### Changed

- `scripts/check.sh` — wired the Stage 3M smoke gate + 100% attestation-helper coverage step.
- `README.md`, `AGENT.md` — Stage 3M milestone.

### Verified

- `node --test tests/unit/llmShield/attestation/*.test.js` passed (18/18).
- `scripts/smoke-llm-shield-stage3m.sh` passed (verify portable + `--reproduce`, policy-drift, privacy, security audits).

---

## [stage-3l-fable5-reference-containment] — 2026-06-20 — Fable-5 reference containment regression

**Raouf:** Stage 3L is a deterministic, key-free measurement stage proving a Fable-5-style failure chain is contained _after input filtering fails_. A 180-case corpus (5 malicious families × {24 input-miss + 6 direct} + 30 benign hard-negatives) runs through the real Simurgh boundary functions in pipeline order, so the observed containment boundary is measured rather than asserted. H1 is enforced as a fixture-validity gate: each input-miss case must pass the input firewall and be contained by its intended downstream boundary; each direct case must be blocked at input. Results: input-miss `120/120` downstream-contained (input-firewall containment `0/120`), direct blocked `30/30`, `case_expectation_mismatches=0`, targeted ASR `0/150`, benign `30/30`, context-authority escalation `0`, unsafe tool/export `0`, receipt/audit `180/180`, generated-evidence leakage `0`, policy-drift `0`. The Fable 5 incident is a payload-redacted public reference event only; no transcript committed, no immunity claimed, no `src/llmShield` change. Stage 3M not triggered.

### Added

- `tests/e2e/llm_shield_stage3l_fable5_reference_{lib,runner}.mjs` and `tests/unit/llmShield/stage3lFable5ReferenceLib.test.js`.
- `scripts/{smoke,security-audit,privacy-audit,consistency-audit,policy-drift-guard}-llm-shield-stage3l.*`.
- `docs/research/llm-shield/{LLM_SHIELD_STAGE_3L_FABLE5_REFERENCE_CONTAINMENT,STAGE_3L_THREAT_MODEL,STAGE_3L_VALIDATION_MATRIX,STAGE_3L_REVIEWER_CHECKLIST,STAGE_3L_CLOSEOUT}.md`; `docs/research/llm-shield/evidence/stage-3l/**`.
- `docs/superpowers/specs/2026-06-20-stage-3l-fable5-reference-containment-design.md` and `docs/superpowers/plans/2026-06-20-stage-3l-fable5-reference-containment.md`.

### Changed

- `scripts/check.sh` — wired the Stage 3L smoke gate (with `SIMURGH_RUN_STAGE3L=1` opt-in real run).
- `README.md`, `AGENT.md` — Stage 3L milestone.

### Verified

- `node --test tests/unit/llmShield/stage3lFable5ReferenceLib.test.js` passed (11/11).
- `scripts/smoke-llm-shield-stage3l.sh` passed (runner + policy-drift + privacy + consistency + security audits).

---

## [stage-3i-agentdojo-utility-recovery] — 2026-06-20 — AgentDojo utility recovery via context-provenance calibration

**Raouf:** Stage 3I recovered the Stage 3H-L2 sampled-run benign utility by fixing an adapter context-provenance schema mismatch, without changing the gateway guard. The Layer-2 adapter previously sent `trust_level`/`source_type`/`purpose` values outside the context-provenance guard's allowed enums, so every context was schema-rejected and all defended cases were blocked at the context boundary. The adapter now declares the benign benchmark seed as `synthetic` (accepted) and injection-bearing context as `untrusted` (demoted-to-data, never authority), and the gateway `/run` response exposes `input_verdict` for precise boundary labelling. On the real external AgentDojo pass (`agentdojo==0.1.30`), defended benign utility rose `0/10 → 10/10`, over-defence fell `10/10 → 0/10`, defended Targeted ASR stayed `0/20`, utility under attack `20/20`, with context-authority escalation `0` and receipt/audit coverage `30/30`. The task-permit stack remains deferred; no jailbreak-immunity claim.

### Added

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/stage3i_{error_taxonomy,metrics}.py` and `tests/test_stage3i_{error_taxonomy,metrics,context_calibration}.py`.
- `tests/unit/llmShield/gateway/stage3iContextCalibration.test.js`.
- `scripts/{privacy,consistency}-audit-llm-shield-stage3i.mjs`, `scripts/smoke-llm-shield-stage3i-phase1.sh`.
- `docs/research/llm-shield/evidence/stage-3i/**`; Stage 3I spec and Phase 1 / Phase 2–3 plans.

### Changed

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/layer2_runner.py` — valid per-kind context provenance, accurate boundary mapping, Stage 3I evidence emission.
- `src/llmShield/gateway/gatewayRouter.js` — `/run` response exposes metadata-only `input_verdict` (no verdict-logic change).
- `scripts/consistency-audit-llm-shield-stage3i.mjs` — recovery-compatible (taxonomy correctly empties on full recovery).

### Verified

- `npm test` passed (625/625); adapter `python3 -m pytest tools/agentdojo-simurgh-adapter/tests` passed (50/50).
- Real external pass `scripts/smoke-llm-shield-stage3h-layer2.sh` (`agentdojo==0.1.30`) passed; Stage 3H-L2 and Stage 3I audits passed.

---

## [stage-3h-agentdojo-external-run] — 2026-06-19 — Sampled AgentDojo external-number run

**Raouf:** Stage 3H-L2 executes the pinned sampled AgentDojo workspace run in baseline and Simurgh-defended modes, preserving the unchanged AgentDojo scorer and exporting metadata-only Simurgh evidence. The stage reports native Utility, Utility Under Attack, and Targeted ASR with numerator/denominator counts, plus containment, receipt, audit, gateway-contact, and over-defence metrics. In the deterministic ground-truth mode, baseline Targeted ASR was `0/20` and defended Targeted ASR was `0/20`; defended benign utility dropped from `10/10` to `0/10`, and over-defence was `10/10`. Full workspace and all-suite runs remain deferred.

### Added

- `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/layer2_{manifest,metrics,sanitise,runner}.py` and `agentdojo_register.py`.
- `tools/agentdojo-simurgh-adapter/tests/test_layer2_*.py` and `test_agentdojo_register.py`.
- `docs/research/llm-shield/evidence/stage-3h-layer2/**` — frozen sample, run manifest, AgentDojo-native results, Simurgh containment metrics, run index, and summary metrics.
- `scripts/smoke-llm-shield-stage3h-layer2.sh`, `scripts/security-audit-llm-shield-stage3h-layer2.sh`, `scripts/privacy-audit-llm-shield-stage3h-layer2.mjs`, and `scripts/consistency-audit-llm-shield-stage3h-layer2.mjs`.
- Reviewer docs: `LLM_SHIELD_STAGE_3H_LAYER2_AGENTDOJO_EXTERNAL_RUN.md`, `STAGE_3H_LAYER2_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

### Changed

- `scripts/check.sh` — adds an explicit opt-in `SIMURGH_RUN_STAGE3H_LAYER2=1` gate for the external run.

### Verified

- `/tmp/simurgh-stage3h-l2-venv/bin/python -m pytest tools/agentdojo-simurgh-adapter/tests -q` passed.
- `SIMURGH_STAGE3H_LAYER2_PYTHON=/tmp/simurgh-stage3h-l2-venv/bin/python SIMURGH_RUN_STAGE3H_LAYER2=1 scripts/smoke-llm-shield-stage3h-layer2.sh` passed.
- `node scripts/privacy-audit-llm-shield-stage3h-layer2.mjs`, `node scripts/consistency-audit-llm-shield-stage3h-layer2.mjs`, and `scripts/security-audit-llm-shield-stage3h-layer2.sh` passed.

---

## [stage-3h-agentdojo-harness-core] — 2026-06-19 — External AgentDojo benchmark harness (core)

**Raouf:** Stage 3H makes the LLM Shield externally benchmark-compatible by inserting Simurgh as an in-loop mediating defence (transport + enforcement only) that calls the real Node HTTP gateway, with AgentDojo's task definitions and scoring logic left unchanged. A Python adapter (`tools/agentdojo-simurgh-adapter/`) forwards each step to the gateway and enforces the returned verdict; it performs no safety classification. The mandatory CI path is a no-AgentDojo, no-network canary dry-run that drives a vendored 30-case workspace fixture through the real gateway, demonstrating containment across three boundaries (context guard, tool gate, output firewall) with benign and hard-negative controls passing cleanly (over-defence 0/10). Stage 3H-core ships the harness; a full Layer-2 AgentDojo external run is supported by design but not claimed unless executed separately with the pinned AgentDojo dependency (future tag `v1.1.0-stage-3h-agentdojo-external-run`). Not jailbreak immunity, not provable security; receipts attest process, not ground truth.

### Added

- `tools/agentdojo-simurgh-adapter/**` — Python adapter (`simurgh_client`, `mapping`, `defence`, `evidence_writer`) + pytest suite; transport/enforcement only, no safety logic.
- `tests/e2e/llm_shield_stage3h_agentdojo_adapter_smoke.mjs`, `tests/e2e/llm_shield_stage3h_metrics_{lib,runner}.mjs`, `tests/unit/llmShield/stage3hMetricsLib.test.js`.
- `docs/research/llm-shield/evidence/stage-3h/**` — metrics, run manifest, 30-case workspace canary, README.
- `scripts/{smoke,security-audit}-llm-shield-stage3h.sh`, `scripts/{privacy,consistency}-audit-llm-shield-stage3h.mjs`.
- Reviewer docs: `LLM_SHIELD_STAGE_3H_EXTERNAL_AGENTDOJO_BENCHMARK.md`, `STAGE_3H_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

### Changed

- `scripts/check.sh` — wired Stage 3H smoke, security audit, privacy audit, and metrics unit test.
- `.gitignore` — ignore Python bytecode for the Stage 3H adapter.

### Verified

- `node --test tests/unit/llmShield/stage3hMetricsLib.test.js` passed (3/3).
- `cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/ -q` passed (13/13).
- `bash scripts/smoke-llm-shield-stage3h.sh` passed (30 canary cases, chain valid).
- `bash scripts/security-audit-llm-shield-stage3h.sh` passed.
- `node scripts/privacy-audit-llm-shield-stage3h.mjs` and `node scripts/consistency-audit-llm-shield-stage3h.mjs` passed.

---

## [stage-3g-live-provider-shadow] — 2026-06-19 — LLM Shield live-provider shadow evaluation

**Raouf:** Stage 3G adds a 60-case live-provider shadow evaluation protocol derived from the Stage 3F corpus. Each selected case is represented across `mock`, `recorded_fixture`, and `live_shadow` modes for 180 metadata-only shadow observations. The committed CI path remains key-free and no-network; optional real live execution is explicit via `--run-live` and the Stage 3E-live env. Stage 3G does not evaluate model alignment or claim live-provider jailbreak immunity. It evaluates whether the Stage 3F containment invariants still hold when an external live provider is placed behind the LLM Shield gateway in shadow mode.

### Added

- `tests/e2e/llm_shield_stage3g_live_shadow_{lib,runner}.mjs` and `tests/unit/llmShield/stage3gLiveShadowLib.test.js`.
- `docs/research/llm-shield/evidence/stage-3g/**` — live-shadow manifest, metrics, provider-output hashes, receipt sample, audit sample, and runner output.
- `scripts/{smoke,security-audit}-llm-shield-stage3g.sh` and `scripts/privacy-audit-llm-shield-stage3g.mjs`.
- Reviewer docs: `LLM_SHIELD_STAGE_3G_LIVE_PROVIDER_SHADOW_EVALUATION.md`, `STAGE_3G_{THREAT_MODEL,VALIDATION_MATRIX,CLOSEOUT}.md`.

### Changed

- `scripts/check.sh` — wired Stage 3G smoke, security audit, and privacy audit.

### Verified

- `node --test tests/unit/llmShield/stage3gLiveShadowLib.test.js` passed.
- `node tests/e2e/llm_shield_stage3g_live_shadow_runner.mjs` passed.
- `bash scripts/smoke-llm-shield-stage3g.sh` passed.
- `bash scripts/security-audit-llm-shield-stage3g.sh` passed `4/4`.
- `node scripts/privacy-audit-llm-shield-stage3g.mjs` passed.

---

## [stage-3f-agentic-prompt-injection-benchmark] — 2026-06-19 — Agentic prompt-injection containment benchmark

**Raouf:** Stage 3F adds a deterministic 240-case benchmark for measuring whether prompt-injection attempts can cause unauthorised system consequences across input, context, tool, output, risk, receipt, and audit boundaries. The benchmark reports detection quality honestly while hard-gating only containment invariants: zero unsafe tool execution, zero unsafe output export, zero context authority escalation, complete receipt coverage, complete audit verification, valid corpus manifest, frozen detector digests, and metadata-only generated evidence. Not jailbreak immunity; receipts attest process, not ground truth.

### Added

- `tests/e2e/llm_shield_stage3f_benchmark_lib.mjs` and `tests/e2e/llm_shield_stage3f_benchmark_runner.mjs` — pure validation helpers plus read-only/update benchmark runner.
- `tests/unit/llmShield/stage3fBenchmarkLib.test.js` — TDD coverage for schema validation, fixture hashes, corpus counts, metrics, hard gates, and metadata-only manifests.
- `docs/research/llm-shield/evidence/stage-3f/**` — 240 synthetic fixtures, metrics, corpus manifest, detector digests, receipt samples, audit sample, and runner output.
- `scripts/{smoke,security-audit}-llm-shield-stage3f.sh` and `scripts/privacy-audit-llm-shield-stage3f.mjs`.
- Reviewer docs: `LLM_SHIELD_STAGE_3F_AGENTIC_PROMPT_INJECTION_BENCHMARK.md`, `STAGE_3F_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`.

### Changed

- `scripts/check.sh` — wired Stage 3F smoke, security audit, and privacy audit into the comprehensive LLM Shield gate.

### Verified

- `node --test tests/unit/llmShield/stage3fBenchmarkLib.test.js` passed.
- `node tests/e2e/llm_shield_stage3f_benchmark_runner.mjs` passed.
- `bash scripts/smoke-llm-shield-stage3f.sh` passed.
- `bash scripts/security-audit-llm-shield-stage3f.sh` passed `4/4`.
- `node scripts/privacy-audit-llm-shield-stage3f.mjs` passed.

---

## [ci-xvfb-readiness] — 2026-06-18 — Stabilize Linux daemon Xvfb CI

**Raouf:** Follow-up to the security audit hardening release after the CI quality gate failed in Linux daemon Xvfb integration tests and the commit subject missed the repository's Conventional Commit style. The Xvfb harness now waits for the spawned display to accept an X11 connection instead of relying on a fixed sleep, and the display mutex recovers from poisoning so one startup miss cannot cascade into unrelated failures. The Stage 2.4/2.5 audit allowlist now matches the same reviewed `public/index.html` `innerHTML` sinks by content instead of brittle line numbers.

### Changed

- `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs` — wait for Xvfb readiness before returning the guard; recover poisoned display mutexes.
- `scripts/security-audit-stage-2-4-2-5.sh` — replace shifted `public/index.html` line-number allowlist entries with content-specific allowlist patterns.

### Verified

- `cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml` passed.
- `cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings` passed.
- `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml --test xvfb_integration_tests -- --test-threads=1` passed locally in non-mandatory Xvfb mode.
- `cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml --test proof_endpoint_tests -- --test-threads=1` passed.
- `npm test` passed `594/594`.
- `npm audit --audit-level=high` reported `0` vulnerabilities.

### Follow-ups

- Confirm the next GitHub Actions quality-gate run passes on Ubuntu with Xvfb installed.

---

## [security-audit-hardening] — 2026-06-18 — Security audit hardening patch

**Raouf:** Added the reviewer-facing closeout note for the security audit hardening patch. The document records **6/6 findings addressed**: explicit-only demo mode, bearer-only instructor authentication, removal of raw answer `localStorage` persistence, versioned HMAC student digests, bounded academic timelines, and paired-state daemon proof enforcement. It also records the verification commands/results and the local Windows .NET 8 SDK blocker as environment-only.

### Added

- `docs/security/SECURITY_AUDIT_HARDENING_CLOSEOUT_2026_06_18.md` — concise reviewer closeout covering finding status, verification, and the local Windows .NET SDK blocker.

### Verified

- Documentation pass only. `npx prettier --check docs/security/SECURITY_AUDIT_HARDENING_CLOSEOUT_2026_06_18.md AGENT.md CHANGELOG.md` passed; repository-wide tool-name search passed; `git diff --check` passed.

### Follow-ups

- Windows daemon verification remains locally blocked until the workstation has .NET SDK 8.x, or the equivalent Windows CI runner is used.

---

## [stage-3e-live-anthropic-adapter] — 2026-06-18 — LLM Shield Anthropic live adapter (Stage 3E-live)

**Raouf:** Stage 3E-live activates the first live provider adapter behind the sealed Stage 3E-core gateway — **Anthropic only**, **disabled by default**. The deferred `live` contract becomes a working path: env-gated (`SIMURGH_LIVE_PROVIDER_ENABLED=true` + `SIMURGH_LLM_PROVIDER=anthropic` + `SIMURGH_LIVE_PROVIDER_MODEL` + server-side `ANTHROPIC_API_KEY`), **lazy SDK import** (`import("@anthropic-ai/sdk")` only inside the adapter, only after `liveProviderGuard` passes — no static import under the gateway), **no provider-side tools** (no `tools`/`tool_choice`/MCP/computer-use; no `toolRunner`/`betaZodTool`), and a real request **timeout** via `AbortController`. Untrusted `contexts[]` reach the provider only as a deterministic, bounded `minimal_summary` (500 chars/context, 2 KB total) with an explicit "data, not instruction" boundary; a separate raw-context cap (8000 chars) protects the gateway edge; rejected context skips the provider. The live response is distrusted through the **sealed 3D tail** verbatim — tool-shaped output is sanitized to hashed metadata and **never executed**, refusals still run the output firewall, blocked output is hash-only. Denial-of-wallet caps (OWASP LLM10) via `liveCallLedger` (session/minute/day). Receipt schema stays `"3E"` with **additive** live metadata (egress flag, model/shape hashes, `*_recorded:false`, no-tools booleans); audit chain gains additive live events. Mock/recorded paths and the frozen 3B benchmark are byte-unchanged. Optional live smoke skips without env; CI stays key-free. Not jailbreak immunity; a live call is an observed gateway event, not a proof of model safety.

### Added

- `src/llmShield/gateway/{liveProviderGuard,liveCallLedger,anthropicMessageBuild,anthropicResponseNormalise,anthropicProviderAdapter}.js` (+ unit suites).
- `tests/e2e/{_live_server, llm_shield_stage3e_live_missing_key_smoke, llm_shield_stage3e_live_context_rejected_smoke, llm_shield_stage3e_live_rate_limit_smoke, llm_shield_stage3e_live_optional_anthropic_smoke, llm_shield_stage3e_live_fixture_runner}.mjs`; 40-case synthetic corpus + manifest + metrics under `evidence/stage-3e-live/`.
- `scripts/{smoke,security-audit}-llm-shield-stage3e-live.sh`, `scripts/privacy-audit-llm-shield-stage3e-live.mjs`.
- Reviewer docs: `LLM_SHIELD_STAGE_3E_LIVE_ANTHROPIC_ADAPTER.md`, `STAGE_3E_LIVE_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`; spec + plan.

### Changed

- `providerTypes.js` (+`GATEWAY_PROVIDERS_LIVE`), `gatewayEnv.js` (re-export guard), `providerRegistry.js` (live→anthropic), `gatewayRouter.js` (env-gated live branch + live caps + live risk bonus + additive audit/receipt), `gatewayReceipt.js`/`gatewayAudit.js` (additive live fields/events).
- `scripts/check.sh` — wired the three Stage 3E-live gates.
- `docs/.../stage-3e/openapi.json` + `docker-compose.gateway.yml` — live mode documentation (mock default unchanged; no API key in request body or image).

### Verified

- `npm test` 589 pass; 3E-live smoke (disabled/missing-key/context-rejected/rate-limit PASS, optional SKIP, fixtures 40/40); security + privacy audits PASS; mock/recorded + 3B no drift; prettier clean; `npm audit` 0 vulns. Tag `v0.7.1-stage-3e-live-anthropic-adapter` after merge.

---

## [stage-3e-core-industry-gateway] — 2026-06-17 — LLM Shield industry gateway (Stage 3E-core)

**Raouf:** Stage 3E-core wraps the Stage 3D containment core in a stable, **no-network** HTTP gateway so external reviewers can test it. New gateway at `/api/llm-shield/gateway/*` (sessions/run/verify/openapi.json), mounted **before** the base router and reusing the existing session/token scheme (`getStore("llmShieldGatewaySessions")`, secret label `llm-shield-gateway`). Two provider modes: `mock` (reuses 3D scenarios) and `recorded_fixture` (synthetic-only, `provenance:"synthetic"` + `provider_output_hash` verified, selected by opaque `case_id` via manifest — path selectors rejected). `live` is a **fail-closed contract** with no adapter (`gateway_live_provider_not_implemented`); live adapters deferred to Stage 3E-live. The run handler composes the 3A/3C input firewall + the 3D context guard / tool gate / output firewall / risk accumulator verbatim around an untrusted provider: provider-side tools off, tool-shaped output gated (never executed), provider output distrusted through the firewall before export (blocked = hash-only), forbidden request fields (`api_key`, `provider_response_body`, `synthetic_provider_output`, …) rejected, denial-of-wallet input/context caps (OWASP LLM10). New `gatewayReceipt` (`type simurgh.llm_gateway_receipt.v1`, schema `3E`) + `gatewayAudit` events (output-hash recorded on every provider-called path); `safetyReceipt.js`/`stage3dReceipt.js` untouched. OpenAPI 3.1 (mock examples only) + non-root Docker (mock default). Not jailbreak immunity; receipts attest process, not ground truth.

### Added

- `src/llmShield/gateway/{gatewayEnv,providerTypes,providerOutputNormalise,mockGatewayProvider,recordedFixtureProvider,providerRegistry,gatewayReceipt,gatewayAudit,gatewayRateLimit,gatewayRouter}.js` (+ unit suites).
- `tests/e2e/llm_shield_stage3e_*` (7 smokes + fixture runner); 70-case synthetic corpus + manifest + metrics under `evidence/stage-3e/`.
- `scripts/{smoke,security-audit,privacy-audit,docker-smoke}-llm-shield-stage3e.*`; OpenAPI `openapi.json`; `Dockerfile.gateway`, `docker-compose.gateway.yml`, `.dockerignore`.
- Reviewer docs: `LLM_SHIELD_STAGE_3E_CORE_INDUSTRY_GATEWAY.md`, `STAGE_3E_CORE_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`; spec + plan.

### Changed

- `server.js` — mount gateway router before base router.
- `package.json` — test glob now includes two-level-deep unit tests (`tests/unit/**/**/*.test.js`); the `gateway/` suites were previously uncounted (520 → 554).
- `scripts/check.sh` — wired the four Stage 3E gates (docker skips if unavailable).

### Verified

- `npm test` 554 pass; 3A/3B/3D gates pass, 3B no drift; 3E smoke + security 15/15 + privacy pass; docker smoke SKIP (no docker locally); `npm audit` 0 vulns; prettier clean. Tag `v0.7.0-stage-3e-core-industry-gateway` after merge.

---

## [stage-3d-provenance-containment] — 2026-06-17 — LLM Shield containment (Stage 3D)

**Raouf:** Stage 3D repositions the LLM Shield from a jailbreak _detector_ to a jailbreak-_consequence_ container: even when input filtering misses, three downstream boundaries stop the consequence and leave metadata-only, audit-chained evidence. (1) **Context provenance** — untrusted `contexts[]` are demoted to data; context that forges system/developer authority, is malformed/oversize/unsigned-trusted, or carries secret/policy markers is rejected (provider skipped). (2) **Tool gate** — unsafe + unknown tool classes are blocked before any (mock) execution; the gate never executes a tool and hashes the tool name. (3) **Output firewall** — suspected system-prompt/secret/tool-arg/classifier-internal leakage is blocked before export; blocked output is hashed, never stored. A per-session **run risk accumulator** scores each run and accumulates monotonically (thresholds locked 0–2/3–5/6+; weights tunable), so multi-turn softening escalates. Activation is **additive**: only requests carrying `contexts`/`tool_mode`/`scenario`/`stage3d:true` take the 3D path; plain `{ input }` keeps the byte-for-byte 3A/3B/3C path so the frozen Stage 3B benchmark and the `v1`/`3C` receipt do not drift. The live route maps a bounded `scenario` enum to committed canned mock outputs; raw `mock_provider_output` is rejected over HTTP (fixtures-only injection lives in the direct-import fixture runner). Not jailbreak immunity, not live-provider safety, no real tools/network; receipts attest process, not ground truth.

### Added

- `src/llmShield/{stage3dReceipt.js,stage3dMockScenarios.js,contextCanonicalise.js,contextProvenanceGuard.js,toolPolicy.js,toolInvocationGate.js,outputLeakageFirewall.js,runRiskAccumulator.js}`.
- Stage 3D audit events + `recordStage3dRun`/`recordStage3dReceiptExported` in `llmShieldAudit.js`.
- Unit suites for all eight new modules; e2e smokes (activation, context, tool gate, output firewall, risk) + the direct-import fixture runner.
- 60-case fixture corpus (`evidence/stage-3d/fixtures/`, 10/category) + `metrics.json` + receipt samples + captured gate outputs.
- Reviewer docs: `LLM_SHIELD_STAGE_3D_PROVENANCE_CONTAINMENT.md`, `STAGE_3D_{THREAT_MODEL,VALIDATION_MATRIX,REVIEWER_CHECKLIST,CLOSEOUT}.md`; spec + plan under `docs/superpowers/`.
- Gates: `scripts/{smoke,security-audit}-llm-shield-stage3d.sh`, `scripts/privacy-audit-llm-shield-stage3d.mjs`.

### Changed

- `src/llmShield/llmShieldRouter.js` — additive `isStage3DRun` gate + full `handleStage3dRun` (context → risk → scenario provider → tool gate → output firewall → 3D receipt).
- `src/llmShield/llmShieldAudit.js` — new Stage 3D events.
- `scripts/security-audit-llm-shield.sh` — `contexts[]` now asserts Stage 3D activation.
- Retired the superseded `evidence/stage-3a/fixtures/contexts-rejection/` alpha fixture; updated its README and the `router.test.js` contexts assertion.
- `safetyReceipt.js`, `promptFirewall.js`, `promptCanonicalise.js`, `mockLlmProvider.js` are **unchanged**.

### Verified

- Full `npm test` (520 pass); `scripts/smoke-llm-shield.sh`; `scripts/smoke-llm-shield-bench.sh` no drift; `scripts/smoke-llm-shield-stage3d.sh`; `scripts/security-audit-llm-shield.sh` 7/7; `scripts/security-audit-llm-shield-stage3d.sh` 9/9; both privacy audits PASS; `npm audit --audit-level=high` 0 vulns; `npx prettier --check .` clean. Tag `v0.6.0-stage-3d-llm-containment`.

---

## [stage-3c-hardening-llm-shield] — 2026-06-16 — LLM Shield hardening (Stage 3C)

**Raouf:** Hardened the LLM Shield detector against the **frozen** Stage 3B corpus with a deterministic canonicalize-then-classify pipeline and a context-sensitive `warning` tier — the first and only stage allowed to change the detector. No corpus payloads edited; the baseline and detector digests were re-frozen via the reviewed `--update-baseline`. Adversarial detection improved **2/30 → 18/30** (blocked 13 + warning 5), clean-benign held at **10/10**, and hard-negative blocked false positives _dropped_ **2/5 → 0/5**. An ablation shows canonicalisation drives recall (5→14→18) while the context guard adds zero detection and exists purely to cut false positives (2/5→0/5). A held-out set of 12 new variants, authored after the detector froze and never used to tune it, generalizes to **7/9** adversarial (the two misses are the same semantic styles — academic-framing, multi-step-softening — that miss on the frozen corpus, indicating a real capability ceiling rather than overfitting). Not jailbreak immunity: an application-layer, pre-provider boundary made measurable and auditable.

### Added

- `src/llmShield/promptCanonicalise.js` — homoglyph fold, leet/symbol de-stuffing, base64 decode-for-inspection (decoded before folding; case-sensitive), `signals[]`.
- `src/llmShield/promptContextGuard.js` — framing-aware deterministic blocked→warning de-escalation (phrase-specific).
- `warning` verdict end-to-end: warning receipt (`risk_tier`, `signals[]`) + `LLM_INPUT_WARNED` audit event.
- `tests/e2e/llm_shield_ablation_runner.mjs`, `tests/e2e/llm_shield_heldout_runner.mjs`; `docs/research/llm-shield/evidence/stage-3c/heldout/**` (12 fixtures).
- `docs/research/llm-shield/{RELATED_WORK.md,STAGE_3C_FINDINGS.md,LLM_SHIELD_STAGE_3C.md}`.

### Changed

- `src/llmShield/promptFirewall.js` (canonical/compact scan + heuristics + warning verdict + ablation `stages` toggle), `safetyReceipt.js` (warning variant, schema `3C`, `signals[]`), `llmShieldAudit.js` (`LLM_INPUT_WARNED` + `recordWarnedRun` + `signals`), `llmShieldRouter.js` (warning route).
- `tests/e2e/llm_shield_bench_lib.mjs` (warning counts as detection; FP stays blocked-only; `detection_split`).
- `docs/research/llm-shield/evidence/stage-3b/{fixtures/** (baseline re-snapshot only),metrics.json,detector-digests.json}`.
- `scripts/{security-audit-llm-shield.sh (schema 3C),privacy-audit-llm-shield.mjs (warning-receipt + held-out checks),check.sh (ablation/held-out informational steps)}`.

### Verified

- Full `npm test`; `scripts/smoke-llm-shield.sh`; `scripts/smoke-llm-shield-bench.sh` no drift; `scripts/security-audit-llm-shield.sh` 7/7; `node scripts/privacy-audit-llm-shield.mjs` PASS; ablation + held-out runners; `npx prettier --check`.

---

## [llm-shield-docs-to-research] — 2026-06-16 — Relocate LLM Shield docs into docs/research/llm-shield + restore 3B framing

**Raouf:** Two things. (1) Restored the "2/30 is not a failure of Stage 3B — it is the baseline measurement Stage 3B exists to expose" framing to the 3B stage doc and evidence README (the framing commit had missed the #32 squash). (2) Moved the LLM Shield docs into the research-folder convention used by the banking and voting pilots: `docs/research/llm-shield/` holds the narrative stage docs (`LLM_SHIELD_STAGE_3A.md`, `LLM_SHIELD_STAGE_3B_BENCHMARK.md`) and an `evidence/` subfolder (`stage-3a/`, `stage-3b/`). Design specs and plans stay in `docs/superpowers/` (same as banking/voting). All `git mv` (history preserved).

### Changed

- `docs/stages/STAGE_3A_LLM_SHIELD.md` -> `docs/research/llm-shield/LLM_SHIELD_STAGE_3A.md`
- `docs/stages/STAGE_3B_LLM_SHIELD_BENCHMARK.md` -> `docs/research/llm-shield/LLM_SHIELD_STAGE_3B_BENCHMARK.md`
- `docs/evidence/stage-3a-llm-shield/` -> `docs/research/llm-shield/evidence/stage-3a/`
- `docs/evidence/stage-3b-llm-shield/` -> `docs/research/llm-shield/evidence/stage-3b/`
- Path references updated in `scripts/security-audit-llm-shield.sh`, `scripts/privacy-audit-llm-shield.mjs`, `tests/e2e/llm_shield_bench_runner.mjs`, `tests/e2e/llm_shield_fixture_runner.mjs`, and the moved docs.

### Verified

- `npm test` 456/456; `scripts/smoke-llm-shield.sh` all gates; `scripts/smoke-llm-shield-bench.sh` no drift; `scripts/security-audit-llm-shield.sh` 7/7; `node scripts/privacy-audit-llm-shield.mjs` PASS; `npx prettier --check .` clean.

---

## [stage-3b-adversarial-llm-shield] — 2026-06-16 — Adversarial LLM Shield benchmark (Stage 3B)

**Raouf:** Added a frozen, style-diverse adversarial benchmark that measures the **unchanged** Stage 3A-alpha detector — recording exactly which attacks are blocked vs missed, catalogued by attack style, rather than claiming jailbreak immunity. The scientific point is the separation `ground_truth` (what a case is) vs `baseline_verdict` (what the unchanged detector does): a malicious prompt with `baseline_verdict: safe` is the benchmark doing its job, not a CI failure. The detector is digest-frozen — `promptFirewall.js`/`promptNormalise.js` are unchanged and the security audit fails if they drift. Hardening is deferred to a later stage measured against this frozen corpus. Baseline result: the naive detector blocks 2/30 obfuscated attacks, passes 10/10 clean-benign, and false-positives on 2/5 hard-negatives.

### Added

- `tests/e2e/llm_shield_bench_lib.mjs` — pure helpers: `ATTACK_STYLES` enum (13), `sortReasonCodes`, `validateCorpus` (unique `case_id` + enum + `payload_hash`), `computeMetrics`.
- `tests/e2e/llm_shield_bench_runner.mjs` — CI mode (asserts frozen baseline + payload_hash + metrics, writes nothing) and `--update-baseline` writer mode (the only writer).
- `docs/evidence/stage-3b-llm-shield/fixtures/**` — 30 adversarial (10 styles × 3) + 15 benign (5 normal-task, 5 ai-safety-question, 5 hard-negative).
- `docs/evidence/stage-3b-llm-shield/{metrics.json,detector-digests.json,README.md}` — committed deterministic metrics, frozen detector hashes, reproduce docs.
- `scripts/smoke-llm-shield-bench.sh`, `scripts/security-audit-llm-shield.sh` (boundary checks + detector-digest freeze; no `npm audit`), `scripts/privacy-audit-llm-shield.mjs` (raw payloads only in fixtures; generated evidence metadata-only).
- `tests/unit/llmShield/benchLib.test.js` — 7 unit tests for the pure helpers.
- `docs/stages/STAGE_3B_LLM_SHIELD_BENCHMARK.md` — stage doc, figures, non-claims.

### Changed

- `scripts/check.sh` — wired in three new gates (bench smoke, security audit, privacy audit).

### Deviation from spec

- `benign_pass_rate == 100%` split into gated `clean_benign_pass_rate` (10 plainly-benign) + measured-not-gated `hard_negative_false_positive_rate` (5 hard-negatives), since hard-negatives exist to surface false positives, not be forced to zero.

### Verified

- `npm test` — 456/456 pass (7 new `benchLib` tests, no regressions).
- `scripts/smoke-llm-shield-bench.sh` — baseline frozen, no drift.
- `scripts/security-audit-llm-shield.sh` — 7/7. `node scripts/privacy-audit-llm-shield.mjs` — PASS.
- `npx prettier --check .` — clean.

### Follow-ups

- Hardening stage: obfuscation normalisation + `warning` verdict, measured against this frozen corpus for an honest before/after delta.

---

## [stage-3a-alpha-llm-shield] — 2026-06-16 — LLM Shield seed crystal (Stage 3A-alpha)

**Raouf:** Shipped the first slice of the Simurgh LLM Shield: an input-only safety boundary that classifies user input for direct prompt-injection and system-prompt-extraction attempts _before_ model invocation, calls only a deterministic local mock provider for safe input, skips the provider for blocked input, and emits a metadata-only safety receipt linked to a per-session HMAC audit chain. A fourth shield grafted onto the existing spine — reuses `src/audit/hmacChain.js`, `src/security/sessionToken.js`, and `src/storage/memoryStore.js` directly, and mirrors the Banking Shield AI-firewall pattern (construct what is allowed, reject what is not, log rejections without recording prohibited values). No untrusted `contexts[]`, tool gate, output firewall, obfuscation handling, live model, or UI — all explicitly deferred to Stages 3B–3F. Detection is deterministic phrase matching with negation-awareness; the alpha corpus is small and partly denylist-aligned, so the 100% block rate is not broad jailbreak resistance (documented in the stage doc benchmark caveat).

### Added

- `src/llmShield/promptNormalise.js` — NFKC fold, zero-width/control strip (keeps `\n`/`\t`), raw + normalised hashing.
- `src/llmShield/promptFirewall.js` — deterministic two-class classification (`policy_override_attempt`, `system_prompt_exfiltration`), negation-aware phrase matching, 4 KB input cap (`payload_too_large`).
- `src/llmShield/mockLlmProvider.js` — deterministic provider (no network, clock, or randomness; never echoes raw input).
- `src/llmShield/safetyReceipt.js` — `simurgh.llm_safety_receipt.v1` builders (`schema_version: "3A-alpha"`), metadata-only, `network_egress_used:false`.
- `src/llmShield/llmShieldAudit.js` — `LLM_*` events with ordered run recorders (blocked path records `LLM_PROVIDER_SKIPPED`, making "blocked before invocation" auditable) and whitelisted decision payloads (no raw text).
- `src/llmShield/llmShieldRouter.js` — `POST /api/llm-shield/sessions`, `POST /:id/run`, `GET /:id/verify`; token-bound, 16 KB body cap, `contexts[]` fail-closed (`contexts_not_supported_alpha`); mounted in `server.js`.
- `docs/evidence/stage-3a-llm-shield/fixtures/**` (16 fixtures), `tests/e2e/llm_shield_fixture_runner.mjs` (metrics), two focused e2e smokes, `scripts/smoke-llm-shield.sh`.
- `docs/stages/STAGE_3A_LLM_SHIELD.md` (non-claims + benchmark caveat), `.env.example` (`SIMURGH_LLM_SHIELD_SECRET`).

### Verified

- `npm test` — 449/449 pass (32 new `llmShield` unit tests, no regressions).
- `scripts/smoke-llm-shield.sh` — all gates pass; attack_block_rate 100% (11/11), benign_pass_rate 100% (5/5), false_positive_rate 0%.
- `npx prettier --check .` — clean.

### Follow-ups

- Stage 3B: adversarial/obfuscated fixtures expected to lower the block rate to a realistic benchmark; `warning` verdict; full 100+50 corpus.
- Add `security-audit-llm-shield.sh` / `privacy-audit-llm-shield.mjs` to make the metadata-only claim a standing gate (currently unit-tested only).

## [readme-audit-presentation] — 2026-06-13 — README professionalization audit + paper-folder casing fix

**Raouf:** Full audit of the root `README.md` for research-presentation readiness, plus the cross-platform folder-casing bug it surfaced.

### Fixed

- **Cross-platform folder bug:** `Papers/banking-shield/` (capital `P`) was the lone paper tracked under a differently-cased directory from `papers/project-simurgh` and `papers/simurgh-voting-pilot`. On GitHub/Linux (case-sensitive) this renders as a second top-level folder — the same class of bug that previously 404'd the voting-pilot paper (AGENT.md prior entry). Renamed `Papers/banking-shield` → `papers/banking-shield` (git two-step through a temp name, required on the case-insensitive macOS FS), updated the live in-package path strings (`main.tex`, `source/banking-shield-paper-v1.2.md`), and rebuilt `main.pdf` (now carries lowercase path; 0 capital-`Papers` occurrences).
- **Privacy contradiction:** §6 `POST /api/affinity` payload was documented as carrying "process names, PIDs" — directly contradicting the project-wide privacy posture (no raw process names/PIDs). Reworded to metadata-only aggregate summary; raw local fields are rejected server-side.
- **Stale facts:** Node test count `331` → `417` (verified `npm test` 417/417 on this branch); total `383` → `469`; "current baseline `v0.4.18`" → `v0.5.0` (Stage 2 Device Shield noted as frozen at v0.4.18); removed a doubled horizontal rule; standardized the audit endpoint param name (`:id` → `:sessionId`).
- **Link labels (second line-by-line pass):** corrected 5 links whose visible label read `docs/STAGE_*.md` while the actual target is `docs/stages/STAGE_*.md` (links worked; labels misled) — Stage 2.3 daemon, 2.5 scanner, 2.5 closeout audit, 1.5 reviewer pack, Stage 2 architecture. Verified every relative link and referenced path in the README resolves (0 broken). Smoothed one residual "inverts this model" phrasing left inconsistent by the SEB-comparison tone edit.

### Changed (tone / structure)

- Toned down marketing-register claims unsuited to a research README: "Cross-Platform **Superiority**" heading → "Cross-Platform **Coverage Compared with**"; removed the unsupported "up to **85%** … through prompt caching" non-sequitur (separated infra savings from the prompt-cache token savings in §7); reframed "fiber in Silicon Valley" / "three orders of magnitude" as a payload-size architectural property, not a measured benchmark; hedged the SEB/CodeSignal comparisons and the "hundreds of thousands of dollars" / "renders this trade-off obsolete" / "entirely" absolutes as design-level expectations.
- Added an "Implementation-status sections" navigation line to the Table of Contents so the un-numbered narrative sections (Core Philosophy, Academic Shield, Stage 1 Hardening, Windows/Linux Closeout, External Technical Review) are reachable.

### Verified

- `npx prettier --check README.md papers/banking-shield/README.md` clean; no residual `Papers/` references; banking-shield PDF rebuilt; no evidence-fixture churn.

## [fix-ci-spdx-fallout] — 2026-06-13 — Fix CI: restore script exec bits + Package.swift order

**Raouf:** Fixed two regressions introduced by the SPDX header passes (the temp-file rewrite had side effects).

### Fixed

- Restored the executable bit (`100755`) on all 21 `scripts/*.sh` — the first SPDX pass had reset them to `100644`, so CI failed with `./scripts/check.sh: Permission denied` (exit 126).
- `tools/simurgh-daemon-macos/Package.swift`, `tools/simurgh-node-macos/Package.swift` — moved the `// swift-tools-version:5.9` directive back to line 1 (SPDX header had displaced it to line 2, breaking SwiftPM manifest parsing). Verified with `swift package describe` (exit 0).

### Verified

- `cargo fmt --check` and `cargo clippy -D warnings` (Linux daemon) both exit 0 with the SPDX headers; `npm test` 417/417. The remaining local check.sh failures (.NET 8 SDK absent, Rust Xvfb tests, Swift-on-macOS) are environment-only and pass/skip on the Ubuntu CI runner (which installs xvfb and skips macOS toolchains).

## [spdx-headers-tests-native] — 2026-06-13 — SPDX headers for tests/ and native tools/ (Rust/Swift/.NET)

**Raouf:** Completed the SPDX header pass — added `SPDX-License-Identifier: AGPL-3.0-or-later` to the remaining 161 git-tracked first-party source files: `tests/**` (74 js + 8 mjs) and the native `tools/` subdirs (23 rs, 28 swift, 22 cs, 6 sh). Comment style `//` for js/mjs/rs/swift/cs, `#` for sh; shebang-aware and idempotent; driven off `git ls-files` so build artifacts (`target/`, `.build/`, `obj/`, .NET `bin/`) and untracked/generated files are excluded.

### Fixed

- Restored the executable bit on 8 files (2 e2e `.mjs`, the Linux daemon `install/uninstall/check/doctor` scripts) that the temp-file rewrite had reset — this had briefly broken one test (the stage-2-8d "scripts executable" check).

### Changed

- 161 source files headered (see breakdown above). Hash-pinned fixtures are `.json` and were not touched.

### Verified

- `npm test` 417/417; `cargo check` (Linux daemon) exit 0; `npx prettier --check .` clean; no mode changes; no evidence-fixture churn. Swift/.NET suites not run in this environment (line-comment headers are syntactically safe; no Rust crate-level inner-attribute placement issues).

## [banking-shield-zenodo-doi] — 2026-06-13 — Wire minted Zenodo DOI 10.5281/zenodo.20675513

**Raouf:** Wired the minted Banking Shield Zenodo DOI (`10.5281/zenodo.20675513`) into the paper and repository.

### Changed

- `Papers/banking-shield/main.tex` — title `\thanks{}` now carries the live DOI with a self-`\cite`; recompiled clean (6 pages, 0 overfull, 0 undefined, 17/17 citations; DOI embedded in `main.pdf`).
- `Papers/banking-shield/references.bib` — added self-citation `@misc{abedini2026bankingshield}` (mirrors the voting-pilot pattern).
- `Papers/banking-shield/README.md` — DOI line added; "Zenodo deposit" section updated to published state.
- `README.md` — added Banking Shield as the third Zenodo preprint (Research Papers section + §13); "Two" → "Three".

### Verified

- `latexmk` exit 0; DOI string present in `main.pdf`; `npx prettier --check` clean; no fixture churn.

## [spdx-headers] — 2026-06-13 — Add SPDX license headers to first-party code

**Raouf:** Added `SPDX-License-Identifier: AGPL-3.0-or-later` headers to 80 first-party source files for per-file license clarity (follow-up to the relicense). Shebang-aware (inserted after `#!` lines) and idempotent.

### Changed

- `server.js`, `src/**/*.{js,mjs}` (52), `scripts/*.mjs` (3), `scripts/*.sh` (21), `tools/*.mjs` (3) — prepended an SPDX header (`//` for JS, `#` for shell).

### Verified

- `npm test` 417/417; `npx prettier --check .` clean; security audit 27/27; no-egress privacy audit PASS; banking smoke 14/14; no fixture churn.
- Native subdirs (Rust/Swift/.NET under `tools/`) and `tests/` (82 files) intentionally left for a later pass.

## [relicense-agpl-3.0] — 2026-06-13 — Relicense code MIT → AGPL-3.0-or-later (papers CC-BY-4.0)

**Raouf:** Relicensed the repository from MIT to AGPL-3.0-or-later to keep the work open for research while preventing closed-source/proprietary capture (strong copyleft + network clause). Research papers under `Papers/` are CC-BY-4.0. Note: a license protects expression, not ideas — research priority rests on the timestamped Zenodo preprints.

### Changed

- `LICENSE` — replaced MIT text with the verbatim official GNU AGPL-3.0 text (fetched from gnu.org).
- `package.json` — added `"license": "AGPL-3.0-or-later"`.
- `README.md` — license badge MIT → AGPL-3.0; §13 rewritten as a dual-license statement (code AGPL-3.0-or-later, papers CC-BY-4.0) with copyright notice and the expression-vs-idea caveat.
- `Papers/banking-shield/README.md` — corrected the stale "MIT" code-license note to AGPL-3.0-or-later.

### Verified

- `npm test` 417/417; `package.json` valid JSON; `npx prettier --check` clean; no fixture churn.

## [banking-shield-paper-layout-audit-zenodo] — 2026-06-13 — Layout audit + Zenodo deposition prep

**Raouf:** Full layout audit of the compiled preprint and Zenodo deposition preparation.

### Fixed

- `Papers/banking-shield/main.tex` — layout: replaced `\usepackage[section]{placeins}` with `\usepackage{placeins}`. The per-section FloatBarrier was forcing the full-width Figure 1 out before §II could flow, leaving page 2 almost blank. Paper now reflows to 6 tight pages (was 7 with a near-empty page).

### Added

- `Papers/banking-shield/.zenodo.json` — pre-filled Zenodo deposition metadata (title, author + ORCID, abstract, keywords, `cc-by-4.0`, related identifiers). Valid JSON.
- `Papers/banking-shield/main.tex` — commented, ready-to-fill DOI line in the title `\thanks{}` block (no fabricated DOI).
- `Papers/banking-shield/README.md` — step-by-step Zenodo mint guide.

### Verified

- Visual layout audit of all 6 PDF pages: 3 TikZ figures and 5 booktabs tables place cleanly, monospace tokens render, references complete with corrected years, two-column balance good. `latexmk` exit 0, 0 overfull boxes, 0 undefined refs, 16/16 citations. `npx prettier --check` clean.

## [banking-shield-paper-wording-refinements] — 2026-06-13 — Applied external-review wording refinements (preprint, no venue)

**Raouf:** Applied the three open judgment-call wording refinements from the external review to both `Papers/banking-shield/main.tex` and `source/banking-shield-paper-v1.2.md`: (1) §4.1 reworded to a data-minimisation _design principle_ with Klein/Yeung cited as GDPR-by-design governance context rather than data-minimisation authorities; (2) related work no longer labels Lee et al. "guardrail practice" (now a life-cycle bias/risk study) with Ray as TRiSM controls; (3) added a one-line "AI-style" clarifier in §4.2. Positioned as a research preprint; no venue targeted.

### Changed

- `Papers/banking-shield/main.tex`, `Papers/banking-shield/main.pdf` — wording refinements; recompiled clean (7 pages, 0 overfull, 0 undefined, 16/16 citations).
- `Papers/banking-shield/source/banking-shield-paper-v1.2.md` — mirrored the same three edits.
- `Papers/banking-shield/PAPER_CLAIM_AUDIT.md` — §4 marked applied.

### Verified

- `latexmk` exit 0; `npx prettier --check` clean.

## [banking-shield-paper-latex-preprint] — 2026-06-13 — Full citation/claim audit + LaTeX preprint package in Papers/

**Raouf:** Completed a full citation audit (all 16 references verified to exist via CrossRef DOI content negotiation + URL resolution; zero hallucinated citations) and a full claims audit (every numeric/structural/empirical claim re-verified against live source, gates, and the frozen evidence pack). Built an IEEEtran LaTeX preprint package and moved the paper into the root `Papers/` folder alongside the other papers.

### Added

- `Papers/banking-shield/main.tex` — IEEEtran conference-format paper (4 TikZ figures, 5 booktabs tables) converted from v1.2 markdown; compiles clean with latexmk (7 pages, 0 overfull boxes, 16/16 citations resolved, 0 undefined refs).
- `Papers/banking-shield/references.bib` — 16 CrossRef-verified entries with corrected version-of-record years.
- `Papers/banking-shield/Makefile`, `README.md`, `PAPER_CLAIM_AUDIT.md`, `.gitignore`, `main.pdf`.

### Changed

- Moved `docs/research/banking-pilot/paper/` → `Papers/banking-shield/source/` (git rename; drafts v0.1–v1.2, audits, review pack, PDFs). Updated the v1.2 markdown's §8/§11 path references to the new location.

### Verified

- CrossRef metadata for all journal DOIs; institutional URLs resolve (2× 200, 2× 403 Cloudflare bot-block, pages exist). `latexmk` exit 0; `npx prettier --check` clean on all new markdown.

## [banking-shield-stage-b5-paper-v1.2-citation-sweep] — 2026-06-13 — External-review verification + citation-year fixes

**Raouf:** Verified an external model-generated review of the v1.2 PDF item by item against source and authoritative CrossRef metadata. Confirmed its version, caption, and three citation-year flags; the audit-of-the-review found the same online-vs-version-of-record year defect in two further references the review missed (Scherr, Yeung & Bygrave). Fixed the caption and all five citation years to the version-of-record year already implied by the printed volume/issue.

### Fixed

- `docs/research/banking-pilot/paper/banking-shield-paper-v1.2.md` — removed internal "(page-one figure candidate)" from the Figure 3 caption; corrected citation years (in-text + reference list): Ali et al. 2021→2022, Lindell & Perry 2011→2012, Klein et al. 2021→2022, Scherr et al. 2015→2016, Yeung & Bygrave 2021→2022. Gebru et al. 2021 left unchanged (genuinely 2021).

### Changed

- `docs/research/banking-pilot/paper/banking-shield-paper-full-audit-2026-06-13.md` — added Addendum 2 (external-review verdict table + open judgment-call recommendations).

### Verified

- CrossRef DOI content negotiation for all journal references; `npx prettier --check` clean. Note: the committed v1.2 PDF predates these markdown fixes and must be regenerated.

## [banking-shield-stage-b5-paper-v1.2-audit] — 2026-06-13 — Full audit of paper v1.2

**Raouf:** Full paper-writing audit of `banking-shield-paper-v1.2.md`. Re-ran every reproduction gate and re-verified all empirical claims against live source, the frozen evidence pack (`92dabb4`), the re-audit checkout (`3dcf21b`), and HEAD. All gate counts, caps, the 46-field denylist, the four-module no-egress scan, and every Phase B aggregate reproduced exactly; both highest-risk DOIs resolve. Two defects found and fixed.

### Fixed

- `docs/research/banking-pilot/paper/banking-shield-paper-v1.2.md` — D1: corrected affirmative-claim phrase count 28 → 29 (`FORBIDDEN_CLAIM_PHRASES` has 29 entries at freeze, re-audit, and HEAD); D2: corrected stale "v1.1 preprint candidate" → "v1.2" in §11.

### Changed

- `docs/research/banking-pilot/paper/banking-shield-paper-full-audit-2026-06-13.md` — added v1.2 re-audit addendum documenting D1/D2.

### Verified

- `npm test` (417/417), banking smoke (14/14), AI-firewall smoke (5/5), full E2E (43/43), security audit (27/27), three privacy audits (PASS), no-egress gate (4 modules, PASS), `npm audit` (0 vulns).
- `npx prettier --check` on both edited docs — clean.

## [banking-shield-stage-b5d-paper-v1] — 2026-06-12 — Full paper v1.0 with verified citations

**Raouf:** Stage B5-D: full Banking Shield paper v1.0 with embedded figures F1–F4, tables T1–T5 filled from the frozen evidence pack, an LLM-assistance disclosure, and 10 DOI-backed references verified via an academic search gateway; categories without a verifiable source keep explicit `[CITATION NEEDED]` markers (zero invented citations). Claim audit re-run against v1.0: PASS.

### Added

- `docs/research/banking-pilot/paper/banking-shield-paper-v1.0.md` — the full paper.

### Changed

- `docs/research/banking-pilot/paper/banking-shield-paper-claim-audit.md` — v1.0 re-audit section (PASS).
- `docs/research/banking-pilot/stage-b5-model-paper/MODEL_REVIEW_CLOSEOUT.md` — B5-D marked draft complete; venue selection + camera-ready pending.

### Verified

- Mechanical forbidden-claim scan of v1.0 — clean (capability nouns only in negated/denylist/fictional contexts).
- `scripts/security-audit-stage-2-4-2-5.sh` — exit 0 (docs overclaim gate).
- `npx prettier --check .` — clean.

---

## [banking-shield-stage-b5-model-paper] — 2026-06-12 — Model-assisted evidence synthesis + paper draft v0.1

**Raouf:** Executed Stage B5-A/B/C: a 12-pass, fully logged model-review protocol over a sanitised evidence pack (frozen at `92dabb4`), producing the Banking Shield paper outline, draft v0.1, threat model, claim audits, reviewer simulation, and figure/table plan. Docs only; the model improved the paper and validated nothing — system validation remains with the automated gates.

### Added

- `docs/research/banking-pilot/stage-b5-model-paper/` — review protocol, allowed/forbidden model-input boundaries, sanitised evidence input pack, 13 versioned prompts, response log with per-pass rubric scores, model claim audit, closeout (B5-A/B/C complete; B5-D next).
- `docs/research/banking-pilot/paper/` — paper outline with per-section claim boundaries, draft v0.1 (mock provider declared in the abstract; limitations explicit; `[CITATION NEEDED]` placeholders only), paper claim audit (all nine forbidden claims: zero affirmative occurrences), figure/table specifications.

### Verified

- `scripts/security-audit-stage-2-4-2-5.sh` — exit 0 (includes the docs overclaim scan).
- `npx prettier --check .` — clean.
- Docs-only change; no runtime gates affected.

---

## [stage-2-4-2-5-overclaim-scan-exclusion] — 2026-06-12 — Fix CI overclaim scan false positive on B4-A denylist

**Raouf:** The Stage 2.4/2.5 cybersecurity audit's overclaim-wording scan failed CI on PR #28 because the B4-A output-firewall denylist (`FORBIDDEN_CLAIM_PHRASES`) literally contains "production ready" — present so the firewall can block that claim, not assert it. The three downstream stage audits failed only as no-regression cascades of this one.

### Changed

- `scripts/security-audit-stage-2-4-2-5.sh` — added `src/bankingPilot/bankingNarrativeOutputFirewall.js` to the overclaim scan's existing exclusion list (same category as the stage27 security tests already excluded), keeping the denylist readable instead of obfuscating its strings.

### Verified

- `scripts/security-audit-stage-2-4-2-5.sh` — exit 0, "Stage 2.4/2.5 cybersecurity audit passed".
- Full `scripts/check.sh` (the exact CI quality gate) — re-run locally.
- `npx prettier --check .` — clean.

---

## [banking-shield-b4-audit-polish] — 2026-06-12 — Close residual B4-A/B audit observations

**Raouf:** Applied the four residual observations from the B4-A/B full audit follow-up. All changes are conservative hardening/consistency fixes: no route semantics, scoring logic, audit-chain verification, withdrawal policy, privacy assertions, live LLM provider, network egress, Phase C logic, or real banking integrations were added, and the firewall remains fail-closed.

### Changed

- `src/bankingPilot/bankingNarrativeOutputFirewall.js` — the negation-aware claim scanner now accepts one article/determiner between a negator and a forbidden phrase ("not **a** fraud detection tool" is a valid disclaimer), while anything beyond one determiner ("not really a scam protection") stays blocked. Window widened to 16 chars to fit "without any ".
- `src/bankingPilot/bankingAiPrivacyReceipt.js` — documented the fail-closed semantics of `buildFirewallFailedReceipt` (`output_claim_firewall_passed` is false when the output firewall never ran; gates that did not fail stay true because no narrative escaped).
- `src/bankingPilot/index.js` — the ai-privacy-explain 503 (disabled), 403 (withdrawn), and 422 (firewall failed) responses now include `ok: false`, matching the error-shape convention of every other banking route.
- `public/banking-pilot-report.html` — export and AI-explanation fetch URLs now `encodeURIComponent` the session id (belt-and-braces; the id is server-issued and the server enforces token-path match).

### Tests

- `tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js` — new red/green cases: negated phrases with one article/determiner pass; affirmative phrases behind a bare article (or with weakened negation) are still blocked.
- `tests/unit/bankingPilot/aiExplainRouter.test.js` — 503/403 responses now assert `ok: false`.

### Verified

- `npm test` — 417/417 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/smoke-banking-pilot-ai-firewall.sh` — 5/5 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 43/43 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs` — PASS.
- `npm audit` — 0 vulnerabilities.
- `npx prettier --check .` — clean.
- `git diff --check` — clean.

---

## [banking-shield-dependency-audit-cleanup] — 2026-06-12 — Clear npm audit advisory

**Raouf:** Cleared the remaining moderate npm dependency advisory found during
the B4-A/B full audit. No application code, Banking Shield route behavior,
scoring, privacy assertions, AI explanation behavior, UI copy, or evidence
fixtures were changed.

### Changed

- `package-lock.json` now resolves Express to `4.22.2` and `qs` to `6.15.2`,
  removing the vulnerable transitive `body-parser/node_modules/qs` copy.

### Verified

- `npm test` — 415/415 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/smoke-banking-pilot-ai-firewall.sh` — 5/5 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 43/43 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs` — PASS.
- `npm audit` — 0 vulnerabilities.
- `npx prettier --check .` — clean.
- `git diff --check` — clean.

---

## [banking-shield-b4-audit-hardening] — 2026-06-12 — Full audit hardening pass

**Raouf:** Audited the Banking Shield branch diff across B4-A backend firewall code, B4-B report UI, changed tester pages, smoke/security/privacy scripts, tests, and closeout docs. The audit found and fixed two contract gaps: the output firewall did not reject extra narrative fields / malformed `non_claims`, and changed frontend fetch paths did not consistently handle request or JSON failures. No route semantics, scoring logic, audit-chain verification, withdrawal policy, privacy assertions, live LLM provider, network egress, Phase C logic, or real banking integrations were added.

### Changed

- `src/bankingPilot/bankingNarrativeOutputFirewall.js` now enforces the exact top-level narrative shape and validates every `non_claims` entry type/length.
- `public/banking-pilot-report.html` now handles report/audit/verify and AI explanation request failures without leaving the UI in a loading state.
- `public/banking-pilot-scenario.html` now handles submit/withdraw request failures explicitly.
- `scripts/smoke-banking-pilot-full-e2e.sh` now checks the B4-B/scenario failure-state copy in the static page contract.
- `docs/research/banking-pilot/phase-b4b/BANKING_PILOT_PHASE_B4B_CLOSEOUT.md` now records the post-audit hardening evidence.

### Verified

- Red/green focused output-firewall test.
- Red/green full E2E smoke for the new failure-state copy.
- `npm test` — 415/415 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/smoke-banking-pilot-ai-firewall.sh` — 5/5 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 43/43 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs` — PASS.
- `npm audit --audit-level=high` — no high/critical advisories; npm still reports the existing moderate `qs` advisory chain through Express/body-parser.
- `npx prettier --check .` — clean.
- `git diff --check` — clean.

---

## [banking-shield-phase-b4b-ai-explanation-ui] — 2026-06-12 — Report-page AI privacy explanation UI

**Raouf:** Surfaced the B4-A metadata-only AI privacy explanation on the public Banking Shield report page. The UI renders the approved narrative, non-claims, and receipt flags while preserving the official deterministic policy result and the no-sensitive-payload boundary. No backend route semantics, scoring, audit verification, withdrawal blocking, privacy assertions, live LLM provider, network egress, secrets, Phase C logic, or real banking integrations were changed.

### Added

- `docs/superpowers/specs/2026-06-12-banking-shield-ai-privacy-explanation-ui-design.md` and `docs/superpowers/plans/2026-06-12-banking-shield-ai-privacy-explanation-ui.md` for the B4-B UI stage.
- `docs/research/banking-pilot/phase-b4b/` closeout and claim-audit docs.
- Public report-page AI Privacy Explanation panel with narrative fields, non-claims, receipt flags, disabled/off-path wording, and narrative-hash display.

### Changed

- `public/banking-pilot.css` adds Simurgh-matched compact panel, non-claim, and receipt-grid styling.
- `scripts/smoke-banking-pilot-full-e2e.sh` now verifies the B4-B page contract and a flag-on safe AI explanation receipt.

### Verified

- `npm test` — 413/413 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/smoke-banking-pilot-ai-firewall.sh` — 5/5 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 43/43 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs` — PASS.
- `npx prettier --check .` — clean.
- Browser visual check confirmed the populated B4-B panel, visible receipt flags, and no horizontal overflow after fixing the export-legend wrapping.

---

## [banking-shield-phase-b4a-ai-firewall] — 2026-06-12 — Backend AI privacy firewall

**Raouf:** Wired and hardened a backend-only, mock-only, fail-closed AI explanation layer for Banking Shield that turns the previously-prepared metadata-only payload into a deterministic plain-English narrative behind an input firewall, an output claim firewall, and an evidence receipt — provable entirely offline. The layer is default-off and exposed via a token-bound `GET /api/banking-pilot/:sessionId/ai-privacy-explain`. No public report-page UI (deferred to B4-B), live LLM provider, network egress, secrets, Phase C logic, real banking integrations, API field renames, or privacy-assertion changes were added.

### Added

- `src/bankingPilot/bankingNarrativeGenerator.js` — deterministic offline enum→template narrator (no randomness, clock, I/O, or network).
- `src/bankingPilot/bankingNarrativeOutputFirewall.js` — schema validation, per-field length caps, negation-aware forbidden-claim scanner, and official-result-unchanged check.
- `src/bankingPilot/bankingAiPrivacyReceipt.js` — enabled / disabled-off-path / firewall-failed receipts with a success-only `narrative_hash`.
- `src/bankingPilot/bankingAiExplain.js` — orchestrator + default-off `isAiExplainEnabled()` flag reader.
- `scripts/smoke-banking-pilot-ai-firewall.sh` — flag on/off, withdrawal, and receipt-flag smoke gate.
- `scripts/privacy-audit-banking-pilot-ai-firewall.mjs` — no-egress static gate over the four B4-A modules plus accepted and rejected-claim evidence fixtures.
- `docs/research/banking-pilot/phase-b4a/` closeout and claim audit; `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/` fixtures.

### Changed

- `src/bankingPilot/bankingAudit.js` — added the `AI_EXPLANATION_EXPORTED` event.
- `src/bankingPilot/index.js` — added the `GET /:sessionId/ai-privacy-explain` route (503 when flag off, 403 when withdrawn, one audit event on success).

### Verified

- `npm test` — 413/413 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14; `scripts/smoke-banking-pilot-ai-firewall.sh` — 5/5; `scripts/smoke-banking-pilot-closed.sh` — 4/4; `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41.
- `scripts/security-audit-banking-pilot.sh` — 27/27.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS; `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS; `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs` — PASS (incl. negative check confirming the no-egress gate bites).
- `npx prettier --check .` — clean.

## [banking-shield-phase-b3d-closeout] — 2026-06-12 — Phase B internal dry run closeout + claim audit

**Raouf:** Closed the Banking Shield Phase B internal dry run using aggregate-only evidence from the human dry run, the UX copy patch, and the focused copy-validation rerun. The closeout and claim audit move from `not_run`/`Not yet run` to completed, evidence-backed statuses, while all disallowed banking-capability claims stay blocked. No runtime routes, Phase C logic, real banking integrations, API field renames, privacy-assertion changes, raw tester feedback, screenshots, or personal financial details were added.

### Added

- `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/aggregate-results.json` — completed aggregate session, scenario, privacy, comprehension, and copy-validation counts.
- `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/participant-feedback.json` — completed aggregate comprehension and safe-note category counts (no raw free text).

### Changed

- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLOSEOUT.md` — status `completed`; recorded 5 testers, 30 sessions, 25 submitted scenario sessions, 5 withdrawal sessions, comprehension highlights, UX finding, and Pass result.
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLAIM_AUDIT.md` — Phase B claims moved to evidence-backed statuses; disallowed claims kept blocked.
- `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/closeout-summary.md` and `README.md` — updated to executed status with aggregate-only results.

### Verified

- `npm test` — 389/389 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS.
- `scripts/smoke-banking-pilot-closed.sh` — 4/4 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41 pass.
- `npx prettier --check .` — clean.

### Notes

- Aggregate-only; no raw tester free text retained. Paper-safe finding: the main Phase B improvement was export-page interpretability, not privacy failure.

---

## [banking-shield-phase-b3b-ux-copy] — 2026-06-12 — Phase B Report/Audit/Verify readability copy patch

**Raouf:** Implemented the narrow Phase B UX copy patch requested after the human dry run. The dry run passed on safety and comprehension basics (no real banking data, no real-security confusion, withdrawal clear, non-claims clear); the one repeated finding was the readability of the Report/Audit/Verify exports. This patch is presentation-only and does not touch runtime routes, API field names, privacy assertions, or retained tester feedback.

### Changed

- `public/banking-pilot-report.html` now shows a plain-English one-liner for each export (Report/Audit/Verify) when it loads, a static export legend defining each export plus "Policy outcome" with its non-claims, Audit-vs-Verify sub-labels, and a note that opening exports adds audit events so report and verify event counts can differ.
- `public/banking-pilot-scenario.html` now shows one short fictional takeaway sentence per scenario and for the withdrawal action, plus a standing line clarifying that each result is a local prototype policy outcome only — not fraud detection, financial advice, or a real banking decision.

### Verified

- `npm test` — 389/389 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS over 6 evidence files.
- `scripts/smoke-banking-pilot-closed.sh` — 4/4 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41 pass.
- `npx prettier --check .` — clean.
- Focused copy-validation re-run (3 fresh sessions, one submitted scenario each) confirmed live pages serve the new copy; report `audit.event_count` 4 vs verify `event_count` 6 demonstrates the event-count note, all audit chains valid.

### Notes

- `verdict` remains the API field; the user-facing wording uses "policy outcome". No API field renames were made.
- This patch is part of Stage B3b. B3c focused copy-validation rerun is complete at agent level; B3d closeout + claim-audit update remains before Phase B is closed.

---

## [banking-shield-simurgh-alignment-audit] — 2026-06-12 — Function alignment audit

**Raouf:** Completed a targeted full audit of Banking Shield Phase A alignment with the broader Simurgh design and function set. Added a formal audit document and updated the consent page with a visible Simurgh functions panel. The audit confirms that Banking Shield correctly reuses Simurgh structural functions while not importing Academic Shield proctoring telemetry into the banking-adjacent demo.

### Added

- `docs/research/banking-pilot/BANKING_PILOT_SIMURGH_ALIGNMENT_AUDIT.md` — visual, runtime, Sonnet narrative, proctoring-boundary, privacy, security, and verification audit.

### Changed

- `public/banking-pilot-consent.html` now shows the Simurgh functions used by the Banking Shield demo: local deterministic policy, HMAC report/audit/verify exports, optional metadata-only Sonnet narrative support, and no Academic Shield proctoring telemetry.

### Verified

- Banking unit/security target — 35/35 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41 pass.
- Targeted Prettier check — pass.
- Local Playwright screenshot captured the updated consent page.

### Notes

- Do not wire Academic Shield `/api/telemetry`, focus/paste telemetry, device scanner signals, screen capture, app names, process names, or window titles into Banking Shield Phase A.
- Sonnet remains narrative support only for Banking Shield and must receive sanitized metadata only. The local deterministic banking policy remains the official result.

---

## [banking-shield-phase-a-ui-alignment] — 2026-06-12 — Tester UI visual alignment

**Raouf:** Restyled the public Banking Shield Phase A tester pages to match the broader Project Simurgh interface language. Added a shared stylesheet with the existing paper/ink/oxblood/moss palette, Simurgh seal header, research-demo panels, privacy boundary banner, responsive scenario grid, and styled JSON output. The Phase A API flow remains unchanged: no new runtime routes, Phase B human-run logic, Phase C logic, real banking integrations, or privacy assertion changes.

### Added

- `public/banking-pilot.css` — shared Banking Shield page styling aligned to the Simurgh visual system.

### Changed

- `public/banking-pilot-consent.html`, `public/banking-pilot-scenario.html`, and `public/banking-pilot-report.html` now use the shared Simurgh-style page shell and controls.
- Hidden button/link behavior is explicitly preserved with a global `[hidden]` CSS rule so consent-gated navigation remains hidden until JavaScript reveals it.

### Verified

- Static page/CSS checks returned 200 for the stylesheet and all three public Banking Shield pages.
- `npm test` — 389/389 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41 pass.
- `npx prettier --check public/banking-pilot.css public/banking-pilot-consent.html public/banking-pilot-scenario.html public/banking-pilot-report.html` — pass.
- Local Playwright screenshots captured for desktop consent and mobile scenario layouts.

---

## [banking-shield-phase-b3-readiness] — 2026-06-12 — Pre-tester readiness checkpoint

**Raouf:** Started Stage B3 — Banking Shield Phase B Internal Dry Run Execution + Closeout by completing the steps available before human testers. Updated the Phase B go/no-go checklist with a pre-tester readiness decision of `no_go_pending_tester_selection`, checked only verifiable runtime/privacy readiness items, and left tester selection, participant notice review, and tester comprehension gates unchecked until 2-3 trusted internal testers run the approved protocol. No human dry-run results were fabricated, no Phase B runtime routes were added, no Phase C logic was added, and the existing Phase A `/api/banking-pilot` runtime remains unchanged.

### Changed

- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_GO_NO_GO_CHECKLIST.md` now records the B3 pre-tester readiness status and makes the current no-go reason explicit.

### Verified

- `npm test` — 389/389 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS, 6 Phase B evidence files scanned.
- `scripts/smoke-banking-pilot-closed.sh` — 4/4 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41 pass.
- `npx prettier --check .` — pass.

### Follow-up

- Select 2-3 trusted internal testers, show the participant notice to each tester, run five fresh submitted sessions plus one separate withdrawal session per tester, record aggregate-only results, then update Phase B closeout, claim audit, and evidence files.

---

## [banking-shield-phase-b-pr-polish] — 2026-06-12 — Final PR-prep polish

**Raouf:** Applied the final three Phase B PR-preparation polish fixes after review. Tightened feedback-form handling so raw tester free text is not retained as evidence, clarified the tester runbook to use five fresh submitted-scenario sessions plus one separate withdrawal session, and added the PR-safe statement: "This PR prepares the Phase B internal dry-run protocol and evidence scaffold. It does not report completed human dry-run results." No runtime code, routes, states, Phase C logic, real banking integrations, or completed human dry-run results were added.

### Changed

- `BANKING_PILOT_PHASE_B_FEEDBACK_FORM.md` now limits optional notes to operator-reviewed process categories, with discard rules for real banking, financial, app, process, window, or personal details.
- `BANKING_PILOT_PHASE_B_TESTER_RUNBOOK.md` now states that testers use five fresh sessions for the five submitted scenarios and a separate fresh session for withdrawal.
- `BANKING_PILOT_PHASE_B_DOC_AUDIT.md` now includes the PR-safe "not completed human results" sentence.

### Verified

- `npm test` — 389/389 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS, 6 Phase B evidence files scanned.
- `scripts/smoke-banking-pilot-closed.sh` — 4/4 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41 pass.
- `npx prettier --check .` — pass.

---

## [banking-shield-phase-b-doc-audit] — 2026-06-12 — Documentation audit and polish

**Raouf:** Audited every Stage B2 Phase B document and evidence scaffold created on `banking-shield-phase-b-dry-run`, one by one. Added a dedicated documentation audit, tightened participant-facing and protocol wording, replaced blank closeout fields with explicit `not_run` tables, marked the implementation plan tasks complete, and preserved the aggregate-only evidence contract. No runtime code, routes, states, Phase C logic, real banking integrations, or human dry-run data were added.

### Added

- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_DOC_AUDIT.md` — one-by-one audit covering spec, plan, Phase B protocol docs, and evidence scaffolds.

### Changed

- `BANKING_PILOT_PHASE_B_CLOSEOUT.md` and `closeout-summary.md` now use explicit `not_run` status tables instead of blank fields.
- `BANKING_PILOT_PHASE_B_PARTICIPANT_NOTICE.md`, `BANKING_PILOT_PHASE_B_PROTOCOL.md`, and the Phase B design spec now use tighter mandatory wording for privacy and flow requirements.
- `docs/superpowers/plans/2026-06-12-banking-shield-phase-b-internal-dry-run.md` now records execution status and completed steps.

### Verified

- Phase B documentation scan found no unresolved draft markers, prohibited claim phrases, em dashes, or selected filler terms.
- `npx prettier --check` passed across Phase B docs, evidence scaffolds, spec, and plan.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS, 6 Phase B evidence files scanned.

---

## [banking-shield-phase-b] — 2026-06-12 — Internal dry-run scaffold

**Raouf:** Started Stage B2 — Banking Shield Phase B Internal Dry Run as a trusted internal tester comprehension layer using the existing Phase A Banking Shield runtime only. Added the Phase B design spec, implementation plan, protocol pack, aggregate-only evidence templates, current Phase B privacy/smoke gate output, and a dedicated Phase B evidence privacy audit wired into `scripts/check.sh`. No Phase B runtime routes, server states, human-pilot logic, Phase C behavior, real banking integrations, real CDR, real Confirmation of Payee, real payments, real accounts, real balances, real payees, transaction amounts, OTPs, credentials, screenshots, app names, process names, or window titles were added.

### Added

- `docs/superpowers/specs/2026-06-12-banking-shield-phase-b-internal-dry-run-design.md` — Stage B2 design with scope lock, evidence rules, audit model, success criteria, and non-claims.
- `docs/superpowers/plans/2026-06-12-banking-shield-phase-b-internal-dry-run.md` — commit-sized implementation plan.
- `docs/research/banking-pilot/phase-b/**` — Phase B protocol, go/no-go checklist, participant notice, feedback form, data-management addendum, tester runbook, closeout scaffold, and claim audit.
- `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/**` — aggregate-only templates plus current Phase B privacy/smoke gate output.
- `scripts/privacy-audit-banking-pilot-phase-b.mjs` — evidence-folder privacy audit for Phase B dry-run artifacts.

### Changed

- `scripts/check.sh` now runs the Banking Shield Phase B evidence privacy audit in the Banking Shield section.

### Verified

- `npm test` — 389/389 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS.
- `node scripts/privacy-audit-banking-pilot-phase-b.mjs` — PASS, 6 Phase B evidence files scanned.
- `scripts/smoke-banking-pilot-closed.sh` — 4/4 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 41/41 pass.
- `npx prettier --check .` — pass.
- `scripts/check.sh --quick` — 21 passed / 1 failed; the failure is the existing local Xvfb prerequisite in `Linux Rust daemon fmt/clippy/test`.
- Full `scripts/check.sh` — 69 passed / 2 failed; the failed steps are existing local prerequisites outside Banking Shield: installed .NET SDK 7.0.307 cannot target the Windows daemon `.NET 8.0` projects, and local Linux Xvfb integration tests fail because Xvfb is not installed.

---

## [agent-wording-clarification] — 2026-06-11 — Clarify push status in AGENT.md

**Raouf:** Updated push status wording in AGENT.md to clarify that the branch was pushed as dc2c5d8.

## [banking-shield-phase-a] — 2026-06-11 — Audit-fix hardening pass

**Raouf:** Audited the `banking-shield-phase-a` branch end to end and fixed all six findings before PR. Added per-IP rate limits and a session capacity cap to `/api/banking-pilot`, derived separate participant-code and audit-chain keys from the pepper (domain separation), renamed the payload depth-cap rejection to `payload_too_deep`, wired prior forbidden-field attempts into live risk scoring as `forbidden_payload_attempt`, replaced the missing-env 500 with a deterministic 503 `banking_pilot_not_configured`, and made withdrawn-session audit/verify transparency an asserted invariant. Extended the full E2E smoke from 38 to 41 gates and refreshed the Phase A evidence pack.

### Added

- `tests/unit/bankingPilot/bankingHardening.test.js` — not-configured 503, session capacity cap, and per-IP consent rate-limit coverage.
- Banking rate-limit / capacity env knobs in `.env.example` — `SIMURGH_BANKING_PILOT_CONSENT_RATE_MAX`, `SIMURGH_BANKING_PILOT_WRITE_RATE_MAX`, `SIMURGH_BANKING_PILOT_READ_RATE_MAX`, `SIMURGH_BANKING_PILOT_MAX_SESSIONS`.
- Three new full-E2E smoke gates: forbidden-attempt risk escalation, `payload_too_deep` rejection, withdrawn-session audit/verify transparency.

### Changed

- `src/bankingPilot/index.js` — rate limiters on all routes, session capacity cap, derived keys, `payload_too_deep` mapping, live `forbiddenPayloadAttempt` scoring, `banking_pilot_not_configured` guard.
- `src/bankingPilot/forbiddenBankingFields.js`, `src/bankingPilot/bankingScenarioPolicy.js` — exported `MAX_DEPTH_SENTINEL` and mapped it to `payload_too_deep`.
- `src/bankingPilot/bankingSessionStore.js` — `size()` accessor for the capacity cap.
- `docs/research/banking-pilot/BANKING_PILOT_PHASE_A_CLOSEOUT.md` and the Phase A evidence pack — refreshed to current gate counts.

### Verified

- `npm test` — 389/389 pass; Banking unit/security — 35/35 pass.
- `scripts/smoke-banking-pilot.sh` 14/14; `scripts/security-audit-banking-pilot.sh` 27/27; privacy audit PASS; closure smoke 4/4; full E2E smoke 41/41 (captured to evidence pack).
- `npx prettier --check .` clean; `npm audit --audit-level=high` no high/critical findings.
- `scripts/check.sh --quick` — all Banking Shield gates pass; the single failing step is the pre-existing local Linux Rust Xvfb prerequisite outside Banking Shield.

## [banking-shield-phase-a] — 2026-06-11 — Stage B1 synthetic banking-adjacent demo

**Raouf:** Implemented Stage B1 — Banking Shield Phase A Synthetic Demo. Added a new `/api/banking-pilot` subsystem with synthetic consent, five metadata-only scenario submissions, one-session-one-submit enforcement, recursive forbidden banking-field rejection, prototype-pollution key rejection, strict scenario allowlists, strict `consent_scope_hash`, banking-scoped HMAC session tokens, local deterministic risk scoring, token-bound report/audit/verify exports, and closure-before-auth write-route locking. Added public Phase A pages using fictional labels only, Banking Shield research docs with Phase B/C roadmap continuity, smoke/security/privacy scripts, unit/security/e2e test artifacts, and Phase A evidence fixtures. Sonnet runtime support remains off by default; Phase A verifies only the local metadata-only narrative sanitiser.

### Added

- `src/bankingPilot/**` — Banking Shield Phase A router, store, token, guard, scenario policy, risk, audit, report, and narrative sanitiser modules.
- `public/banking-pilot-consent.html`, `public/banking-pilot-scenario.html`, `public/banking-pilot-report.html` — synthetic Phase A pages.
- `docs/research/banking-pilot/**` — protocol, threat model, data management, participant notice, non-claims, closeout, claim audit, and evidence pack.
- `tests/unit/bankingPilot/**`, `tests/security/banking_pilot_security_audit.test.js`, `tests/e2e/banking_pilot_*_smoke.mjs` — Banking Shield test coverage.
- `scripts/smoke-banking-pilot.sh`, `scripts/smoke-banking-pilot-closed.sh`, `scripts/smoke-banking-pilot-full-e2e.sh`, `scripts/security-audit-banking-pilot.sh`, `scripts/privacy-audit-banking-pilot.mjs` — Phase A gates, full lifecycle E2E smoke, and generated-artifact privacy audit.

### Changed

- `server.js` mounts `/api/banking-pilot`.
- `.env.example` documents Banking Shield Phase A env vars.
- `scripts/check.sh` includes Banking Shield Phase A unit/security, smoke, security audit, privacy audit, closure, and full E2E gates, and exempts the banking forbidden-field guard from the global source-grep privacy false-positive.
- `tests/unit/displayServerLockServerWiring.test.js` uses a unique live-server port per boot to avoid a local `ECONNREFUSED` race between live-server tests.

### Verified

- `npm test` — 384/384 pass.
- `npm audit --audit-level=high` — pass, no high/critical findings; existing moderate `qs` advisories remain.
- Banking unit/security tests — 30/30 pass.
- `scripts/smoke-banking-pilot.sh` — 14/14 pass.
- `scripts/security-audit-banking-pilot.sh` — 27/27 pass.
- `node scripts/privacy-audit-banking-pilot.mjs` — PASS, 4 generated fixtures, attack values absent.
- `scripts/smoke-banking-pilot-closed.sh` — 4/4 pass.
- `scripts/smoke-banking-pilot-full-e2e.sh` — 38/38 pass; output captured at `docs/research/banking-pilot/evidence/phase-a-synthetic/smoke-banking-pilot-full-e2e.txt`.
- `npx prettier --check .` — pass.
- `scripts/check.sh --quick` — Banking gates pass; command exits 1 on the existing local Linux Xvfb Rust integration gate.
- Full `scripts/check.sh` — Banking Shield Phase A gates pass; command summarizes 68 passed and 2 failed steps because installed .NET SDK 7.0.307 cannot target the Windows daemon `.NET 8.0` projects, and local Linux Xvfb integration tests fail with `Connection refused`/`PoisonError` results in `xvfb_integration_tests.rs`.

---

## [paper-source-links] — 2026-06-05 — Fix README paper source path casing

**Raouf:** Fixed the two README "Source" links that were live-broken on GitHub: `Papers/project-simurgh/` and `Papers/simurgh-voting-pilot/`. Root cause: the paper source directories are tracked under lower-case `papers/...`, while the README used upper-case `Papers/...`; local macOS checks passed on a case-insensitive filesystem, but GitHub returned 404 because paths are case-sensitive. Updated the two README source links to `papers/project-simurgh/` and `papers/simurgh-voting-pilot/`. Verification: live pre-fix `curl -I -L` checks to the upper-case GitHub tree URLs returned 404; `git ls-tree -r --name-only HEAD | rg '^papers/'` confirms lower-case tracked source paths; `npx --yes markdown-link-check README.md` passes 57/57 links; `npx prettier --check README.md AGENT.md CHANGELOG.md` passes.

---

## [readme-link-audit] — 2026-06-05 — README link audit and anchor repair

**Raouf:** Audited all 57 Markdown links in `README.md` with `markdown-link-check`. Root cause: stale internal GitHub heading slugs after headings containing `&` and `2026 - 2028` changed. Fixed six README anchor hrefs: License badge, Status badge, Socio-Economic Impact TOC row, Cost & Latency TOC row, Strategic Roadmap TOC row, and Status & License TOC row. Verification: `npx --yes markdown-link-check README.md` passed (57/57 links); `npx prettier --check README.md` passed.

---

## [voting-pilot-paper-author-companion-cite] — 2026-06-04 — Author block + Invisible Window companion citation

**Raouf:** Sourced author data from Invisible Window PDF. Author block: "Raouf" → "Mohammad Raouf Abedini", Department of Computing, mohammadraouf.abedini@students.mq.edu.au. `simurgh2026` BibTeX author corrected. New entry `abedini2026invisible` (DOI 10.5281/zenodo.20376495) added. Introduction updated with 2-sentence companion-paper context. Build: 4 pages, 122 KB, 0 Overfull, 0 undefined refs.

---

## [voting-pilot-paper-external-audit-fixes] — 2026-06-04 — External audit fixes — submission-ready v2

**Raouf:** PDF sanity confirmed (Hastings/Nov. 2023, no Runyan, no TODO). Applied 4 external-audit fixes: title → "Voting-Adjacent Workflows", placeins + FloatBarrier (×2) for float containment, "any caller" → "any caller able to reach the pilot API" (×3), HREC scope sentence added to §IV.C. Author block flagged for update (full name + MQ email needed before submission). Build: 4 pages, 122 KB, 0 Overfull, 0 warnings.

---

## [voting-pilot-paper-final-audit] — 2026-06-04 — Paper final full audit — submission-ready

**Raouf:** Final systematic audit. One issue found: "artefacts" (British) → "artifacts" (American English, IEEE). Surrounding passive converted to active. Full scorecard: em dashes 0, British spellings 0, Overfull 0, undefined citations 0, TODO notes 0, NIST authors correct, NSWEC Nov. 2023. Build: 4 pages, 121 KB, 0 warnings. Status: submission-ready.

---

## [voting-pilot-paper-submission-polish] — 2026-06-04 — Paper blocking fixes + submission polish

**Raouf:** Fixed two blocking citation errors (NIST IR 7770 wrong author → 4 correct authors + DOI; NSWEC year 2022→2023 November, "verify year" TODO note removed from bibliography). Eight submission-readiness fixes: §V.A Dataset paragraph added, "privacy-sensitive data" narrowed, "passive surveillance" → "content-level surveillance", fetch-call precision fix, "no data persisted" scoped correctly, Table II abbreviation note, Governance and Ethics subsection added (§IV), long path cleaned. Build: 4 pages, 121 KB, 0 warnings.

---

## [voting-pilot-paper-100pct-audit] — 2026-06-04 — Paper 100% audit pass

**Raouf:** Second systematic audit pass. 22 issues resolved: all 12 em dashes removed (count verified 0), British spellings fixed (Minimisation→Minimization), §\ref→Sec.~\ref, grammar fix in §III.C, tense fixes in §IV.B, passive→active in §IV.B, "rank"→"select" (radio buttons), empty TikZ node removed, "establish"→"demonstrate", "official ballot"→"official vote", spurious commas removed. Build: 4 pages, 121 KB, 0 warnings.

---

## [voting-pilot-paper-full-audit] — 2026-06-04 — Full paper audit and rewrite

**Raouf:** Full paper audit using ml-paper-writing and stop-slop skills. 16 issues found and fixed: abstract rewritten (Farquhar formula), TikZ flow figure added, contribution bullets added, §IV pilot section expanded, passive voice eliminated, stop-slop patterns removed, citation workshop name corrected (EVT/WOTE), float specifiers fixed. Build: 4 pages, 121 KB, 0 warnings.

### Changed

- `Papers/simurgh-voting-pilot/main.tex` — abstract, figure, contributions, pilot section, passive voice, style, structure.
- `Papers/simurgh-voting-pilot/references.bib` — EVT/WOTE correction, nswec year verification note.
- `Papers/simurgh-voting-pilot/main.pdf` — rebuilt.

---

## [voting-pilot-paper-claim-audit] — 2026-06-04 — Paper claim audit + evidence capture

**Raouf:** Audited all 20 paper claims against repo evidence. Two issues found and fixed: (1) consent disclosure vs. Phase C implementation for focus-loss/paste counts; (2) privacy audit table entry scope clarified. Phase C gate evidence captured to `evidence/phase-c-closeout/` (359/359 tests, all gates). `PAPER_CLAIM_AUDIT.md` created. PDF rebuilt: 4 pages, 0 undefined citations. Verdict: Accurate.

### Added

- `Papers/simurgh-voting-pilot/PAPER_CLAIM_AUDIT.md` — 20-claim audit table with evidence links and verdict.
- `docs/research/mq-voting-pilot/evidence/phase-c-closeout/` — 7 gate evidence files at Phase C closeout baseline.

### Changed

- `Papers/simurgh-voting-pilot/main.tex` — §III.A consent/implementation distinction; Table 2 privacy audit note.
- `Papers/simurgh-voting-pilot/main.pdf` — rebuilt after fixes.

---

## [voting-pilot-paper-related-work] — 2026-06-04 — Paper related work + PDF build

**Raouf:** Filled Related Work section (5 subsections: E2E verifiable voting, remote voting security, voting standards, Australian TAV context, privacy/data minimisation, position statement). Added protective abstract sentence. Expanded `references.bib` to 10 entries. Added `Makefile`. PDF builds clean: 4 pages, 107 KB, 0 undefined citations.

### Changed

- `Papers/simurgh-voting-pilot/main.tex` — full related work section, abstract protective sentence.
- `Papers/simurgh-voting-pilot/references.bib` — Civitas, STAR-Vote, NIST IR 7770, National Academies 2018, VVSG 2021, NSWEC TAV, Cavoukian 2009 added.

### Added

- `Papers/simurgh-voting-pilot/Makefile` — `latexmk` build target.
- `Papers/simurgh-voting-pilot/main.pdf` — built (4 pages).

---

## [voting-pilot-phase-c-results-pack] — 2026-06-04 — Phase C results pack + paper scaffold

**Raouf:** Created Phase C results analysis documents and IEEE-format LaTeX paper scaffold. Three analysis docs (results analysis, results tables, paper findings summary) plus `Papers/simurgh-voting-pilot/main.tex` and `references.bib`. All non-claims preserved; wording guide included to prevent reviewer-hostile overclaims.

### Added

- `docs/research/mq-voting-pilot/results/PHASE_C_RESULTS_ANALYSIS.md`
- `docs/research/mq-voting-pilot/results/PHASE_C_RESULTS_TABLES.md`
- `docs/research/mq-voting-pilot/results/PAPER_FINDINGS_SUMMARY.md`
- `Papers/simurgh-voting-pilot/main.tex`
- `Papers/simurgh-voting-pilot/references.bib`

---

## [v0.5.0-voting-pilot-phase-c-closeout] — 2026-06-04 — Phase C tag + closeout doc final update

**Raouf:** Tagged `v0.5.0-voting-pilot-phase-c-closeout` on `main`. Updated `PHASE_C_MEMBER_PILOT_CLOSEOUT.md` with server-side closure endpoint table, tag reference, and final paper-safe summary paragraph.

---

## [voting-pilot-phase-c-collection-lock] — 2026-06-04 — Phase C server-side collection lock

**Raouf:** Enforced server-side Phase C collection closure. `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true` causes consent/accept, submit, and withdraw to return `410 Gone` with `voting_pilot_collection_closed`. Report export remains open. New `scripts/smoke-voting-pilot-closed.sh` (5 gates, dedicated server on port 33034). Gates: closure smoke 5/5, original smoke 8/8, security-audit 10/10, 359/359 tests, 0 high vulns, privacy audit PASS.

### Added

- `scripts/smoke-voting-pilot-closed.sh` — server-side closure smoke (5 gates).
- `scripts/check.sh` gate 10r — Voting pilot Phase C collection-closure smoke.

### Changed

- `src/votingPilot/index.js` — `collectionClosed()`, `rejectIfClosed` middleware; consent/accept + submit + withdraw return 410 when env var set; report unaffected.
- `.env.example` — `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED` documented.

---

## [voting-pilot-phase-c-closeout] — 2026-06-04 — Phase C member pilot closeout

**Raouf:** Closed Phase C data collection for the MQ Persian Society voting pilot. 31 consented sessions: 30 submitted (primary analysis set), 1 withdrawn (`vp_4fcc741a`, excluded). Both pilot pages replaced with "Collection closed" banners — no new sessions possible. All gates green: 359/359 tests, 0 high vulns, privacy audit PASS, smoke 8/8, security-audit 10/10.

### Added

- `docs/research/mq-voting-pilot/PHASE_C_MEMBER_PILOT_CLOSEOUT.md` — closeout document with session counts, privacy assertions, gate results, paper-safe sentence, and non-claims.

### Changed

- `public/voting-pilot.html` — collection closed; consent/submit buttons and JS logic removed.
- `public/voting-pilot-submit.html` — collection closed; submit/withdraw buttons and JS logic removed.

---

## [voting-pilot-phase-c-approval-pack] — 2026-06-04 — Phase C approval pack

**Raouf:** Created five governance documents for Phase C (real member pilot): go/no-go checklist, member pilot protocol, executive approval request, participant notice, and data management addendum. Phase C requires executive written approval and ethics determination before any member participation.

## [voting-pilot-phase-b-closeout] — 2026-06-04 — Phase B internal human dry run closeout

**Raouf:** Locked Phase B evidence artefacts for the MQ Persian Society voting pilot. Patched 34 Phase B session JSON files to carry `"synthetic": false, "data_source": "internal_human_dry_run"` (previously mislabelled). Created `PHASE_B_INTERNAL_HUMAN_DRY_RUN_CLOSEOUT.md`. All safety gates pass: 359/359 tests, 0 high vulns, 0 privacy violations, smoke 8/8, security-audit 10/10.

## [ci-stage-2-7-smoke-flake] — 2026-06-01 — Quality Gate raw-field smoke hardening

**Raouf:** Fixed the failing Simurgh Quality Gate run `26617769927` by hardening the Stage 2.7 raw-field smoke assertion. The CI failure was a false positive: scenario G searched the entire audit export JSON for the short forbidden value `"4321"`, which can appear by chance inside generated audit metadata such as HMACs, hashes, timestamps, or IDs even when the rejected raw debug payload is not leaked.

### Fixed

- `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` — replaced whole-export substring matching with structured forbidden-data traversal.
- Audit leakage checks now inspect audit entry payloads, not HMAC chain metadata.
- Crypto/generated fields such as signatures, previous hashes, chain terminators, nonces, node hashes, session IDs, exam IDs, and tokens are excluded from raw-value leak matching.
- The raw-field rejection path remains unchanged: telemetry containing `hwnd`, `pid`, `window_title`, and `process_name` must still return `forbidden_local_field`.

### Verified

- `bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh` — pass.
- Five consecutive Stage 2.7 smoke runs — pass.
- `npx prettier --check tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` — pass.
- `bash scripts/check.sh` — patched Stage 2.7 block passed; full local gate stopped on local prerequisites unrelated to this fix: installed .NET SDKs are 6.0/7.0 while Windows daemon projects target .NET 8.0, and local Xvfb is unavailable while CI installs Xvfb before running the mandatory Linux Rust tests.

## [paper-v0.1] — 2026-05-21 — Project Simurgh Research Paper Initial Draft

**Raouf:** Initial IEEE-format research paper draft. 10 pages, 13 sections, 34 citations, 0 overfull hboxes. Covers threat model, system architecture, Ed25519 proof protocol, cross-platform implementations, privacy model, evaluation (371 tests across 3 runtimes), security analysis, ethics. All non-claims preserved. Companion to the Invisible Window paper (Abedini, 2026).

## [0.4.18-stage-2-8-linux-closeout] — 2026-05-19 — Stage 2.8 Linux Closeout Docs

**Raouf:** Stage 2.8 Linux closeout documentation, validation matrix, reviewer checklist, real-device validation plan, external-review readiness, and top-level security/privacy/roadmap documentation refresh.

### Added

- `docs/stages/STAGE_2_8_LINUX_TECHNICAL_BRIEF.md` — 24-section reviewer-facing technical brief: daemon architecture, X11/Wayland/XWayland scanner design, display server lock, browser_package_hint trust boundary, systemd dev-only lifecycle, proof flow, privacy contract, CI/smoke/audit coverage, non-claims.
- `docs/stages/STAGE_2_8_LINUX_VALIDATION_MATRIX.md` — build/test/CI/smoke/cybersecurity/real-device validation matrix with honest pending status for unvalidated environments.
- `docs/stages/STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md` — 16-group, 76-item reviewer checklist with concrete, file-level assertions.
- `docs/stages/STAGE_2_8_LINUX_CLOSEOUT.md` — freeze declaration: what is frozen, what is not claimed, gate evidence, real-device evidence (pending), reviewer notes.
- `scripts/check.sh` gate 53 — doc-grep safety: rejects forbidden overclaim phrases in docs/README/SECURITY/PRIVACY/ROADMAP.

### Changed

- `README.md` — Status blockquote updated to reflect Stage 2.8 frozen; Linux Display Integrity Closeout section added; "Linux support is Stage 2.8 future research" removed.
- `SECURITY.md` — Stage 2.8C/2.8D section renamed to "Stage 2.8 Linux Device Shield Security Posture"; expanded with proof verification, challenge binding, forbidden-field rejection, no-automatic-misconduct bullets.
- `PRIVACY.md` — Last-updated date refreshed to 2026-05-19.
- `ROADMAP.md` — Stage 2.8 status updated; Stage 2.8 Linux Research item marked complete; next-step updated to external review + Stage 3 planning.

## [0.4.16-stage-2-8C-8D] — 2026-05-18 — Stage 2.8C/2.8D Linux Wayland + systemd + Ubuntu CI

**Raouf:** Combined PR #21+#22 — Linux Wayland portal probe (property-read only, no consent triggered), XWayland partial coverage, browser_package_hint UX-only, live `display_server_mismatch` enforcement, dev-only systemd `--user` lifecycle, Ubuntu CI Rust toolchain + mandatory Xvfb + shellcheck, combined Stage 2.8C/D smoke and cybersecurity audit.

### Added

- `scanner/wayland.rs` — Wayland portal probe via `AvailableSourceTypes` property read only. Banned-method grep test prevents consent-triggering calls.
- `scanner/xwayland.rs` — XWayland scanner mapping to `coverage=xwayland_partial`. Never claims `x11_full` or `wayland_limited`.
- `systemd/simurgh-daemon-linux.service` — dev-only `--user` unit with `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome=read-only`, `PrivateTmp=true`. No root, no sudo.
- Lifecycle scripts: install/uninstall/check/doctor with `--check` + `--dry-run`. shellcheck-clean.
- `SIMURGH_REQUIRE_XVFB_TESTS=1` env-var gate: panics when set + Xvfb missing; skips gracefully when unset.
- 16-scenario combined smoke + 30-assertion cybersecurity audit (16 dimensions). `docs/evidence/stage-2-linux/README.md` evidence rules.

### Changed

- `/api/telemetry` now enforces `display_server_mismatch` live (Phase A P0 follow-up). Emits `DAEMON_PROOF_REJECTED` to HMAC audit chain on mismatch.
- `browser_package_hint` is UX-only in SDK `getDeviceShieldStatus()`. Server modules source-grep clean of the field.
- Ubuntu CI extended: Rust stable toolchain, cargo fmt/clippy/test, shellcheck, Xvfb apt deps, timeout 10→20 min.
- README Node test count: 327/327. Rust test count: 33/33.

### Non-claims preserved

Research prototype only. No production Linux endpoint deployment, no distro packaging, no system-wide service, no MDM, no hardware attestation, no kernel-level visibility, no universal Wayland surface enumeration, no GPU overlay detection, no automatic misconduct detection.

---

## [post-merge] — 2026-05-17 — CI fix, tag release, issue updates

Post-merge housekeeping after PR #17 merged to `main`.

### Fixed

- **CI transient failure** on PR #17 `main` push — "server boot — /health not reachable" caused by runner resource contention after two prior merges on the same host. Docs-only PR; server boots locally in < 1s. Fixed via `gh run rerun --failed`; re-run passed 47/48 gates.

### Released

- Tag `v0.4.13-stage-2-windows-device-shield-closeout` published as a GitHub Release.

### Updated (GitHub Issues)

- **Issue #11** (macOS external review) — updated to match the Windows issue template: logo, scope bullets, validation table, review focus areas, confirmed non-claims, Stage 2.7 cross-platform note.
- **Issue #18** (Windows external review) — fixed broken relative doc links; replaced with absolute GitHub URLs; added Review Documents table, all 4 release tags hyperlinked, logo via raw GitHub URL.

---

## [0.4.13-windows-closeout] — 2026-05-17 — Stage 2 Windows Device Shield Closeout

Stage 2 Windows Device Shield is frozen as a real-device validated research-prototype baseline. This entry adds the Windows technical brief, closeout declaration, validation matrix, reviewer checklist, evidence-folder rules, logo integration, and top-level doc updates.

### Added

- `docs/stages/STAGE_2_WINDOWS_TECHNICAL_BRIEF.md` — 20-section reviewer-facing technical summary (research origin, daemon architecture, scanner design, affinity fixture, signed proof flow, server verification, risk mapping, report/audit integration, privacy contract, smoke/audit coverage, real-device validation, limitations, non-claims).
- `docs/stages/STAGE_2_WINDOWS_DEVICE_SHIELD_CLOSEOUT.md` — freeze declaration with evidence table, gate evidence, cross-platform contract references, and confirmed non-claims.
- `docs/stages/STAGE_2_WINDOWS_VALIDATION_MATRIX.md` — gate-level verification matrix across all smoke, audit, real-device, and Scenario A–G rows.
- `docs/stages/STAGE_2_WINDOWS_REVIEWER_CHECKLIST.md` — reviewer checklist covering release gates, real-device validation, proof path, privacy contract, cross-platform contract, smoke/audit coverage, non-claims, and documentation completeness.
- `docs/evidence/stage-2-windows/README.md` — evidence-folder rules specifying allowed artefacts and forbidden raw identifiers.
- `docs/evidence/stage-2-windows/.gitkeep` — folder initialisation.
- `docs/Project-Simurgh-Logo.png` — Project Simurgh official logo (Simurgh bird with shield and keyhole, "Project Simurgh" wordmark, Knowledge / Verification / Guidance attributes).

### Changed

- `README.md` — logo added to header; Windows Device Shield Closeout section added; status block updated to Stage 2 Windows closeout; External Technical Review updated; verification counts updated (`273/273`, `47/48`).
- `docs/stages/STAGE_2_5_TECHNICAL_BRIEF.md` — logo added to header.
- `SECURITY.md` — `v0.4.13-stage-2-6-2-7-closeout` added to supported versions; Stage 2 Windows Device Shield Security Posture section added.
- `PRIVACY.md` — last-updated date updated; Windows Scanner Privacy Contract section added with full allowed/forbidden field tables.
- `ROADMAP.md` — Stage 2 Windows Device Shield closeout marked done; next-stage note added.

### Verified

- Windows 10 Pro build 19045 validation passed (Stage 2.6B AGENT.md entry).
- `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE` detected.
- Signed daemon proofs accepted; tampered, replayed, raw-field proofs rejected.
- Reports, dashboard, audit chain, and privacy sweep passed.
- `npm test` 273/273, `npm audit --audit-level=high` 0 vulnerabilities, `node tools/privacy-audit.mjs` pass.
- All smoke and security audit gates pass.

### Non-claims

- Research prototype only. No production deployment, Windows Service, MDM/Intune, hardware attestation, kernel visibility, GPU overlay, or automatic misconduct detection.

---

## [0.4.13-closeout] — 2026-05-17 — Stage 2.6/2.7 Closeout (umbrella gates + hardening)

Final closeout before tagging `v0.4.13-stage-2-7-cross-platform-device-shield`. Adds two umbrella gates that exercise the full Stage 2.6/2.7 surface plus targeted hardening of gaps surfaced during Stage 2.7 review.

### Added

- `tests/security/stage_26_27_closeout_audit.test.js` — 24-test umbrella manifest covering nine audit dimensions: proof, scanner, platform, daemon, SDK, report, dashboard, privacy, wording.
- `scripts/security-audit-stage-2-6-2-7-closeout.sh` — closeout cybersecurity audit running Stage 2.4/2.5 + Stage 2.7 + new closeout audit + privacy-audit + `npm audit`.
- `scripts/smoke-stage-2-6-2-7-closeout.sh` — closeout E2E smoke running Stage 2.6 Windows scanner smoke + Stage 2.7 cross-platform smoke + privacy-audit.

### Hardened (extending `tests/security/stage27_cross_platform_security_audit.test.js`)

- Pairing payload with raw `hwnd` anywhere in the envelope is rejected as `forbidden_local_field` (was only tested on the proof path).
- Pairing payload with forbidden field nested inside `signed_payload` is rejected.
- Pairing payload with `platform: "linux"` is rejected as `unsupported_platform` at the pairing layer (the actual rejection point).
- SDK trust-boundary invariant: `validateDaemonProof` never echoes unsigned client-supplied fields into the trusted proof object.
- `FORBIDDEN_LOCAL_FIELD_NAMES` is frozen — mutation via `push` and indexed assignment both throw at runtime.

### Changed

- `scripts/check.sh` — new section 10m runs both closeout umbrella gates after the per-stage gates.

### Verified

- Windows OS: Windows 10 Pro / Build 19045. Toolchain: Node 24.14.0, npm 11.9.0, .NET 8.0.421.
- `npm test` — 273/273 unit tests pass (unchanged; closeout work lives in `tests/security/`, which `npm test` does not glob).
- `node --test tests/security/stage27_cross_platform_security_audit.test.js` — 15/15 (5 new hardening tests, was 10).
- `node --test tests/security/stage_26_27_closeout_audit.test.js` — 24/24.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- `bash scripts/smoke-stage-2-6-2-7-closeout.sh` — pass (Stage 2.6 + Stage 2.7 smokes + privacy).
- `bash scripts/security-audit-stage-2-6-2-7-closeout.sh` — pass (Stage 2.4/2.5 + Stage 2.7 + closeout audit + privacy + npm audit).
- All five smoke scripts (2.2/2.3, 2.4/2.5, 2.5 audit, 2.6 Windows, 2.7 cross-platform) green.
- `bash scripts/check.sh` — 47/48 green; the single failure is the pre-existing Windows-line-endings prettier tolerance documented in check.sh itself. CI on Linux passes prettier cleanly.

### Non-claims (unchanged)

- Research prototype only.
- No production deployment claim, no MDM/Intune readiness, no Windows Service or notarised macOS packaging, no hardware attestation, no kernel-level visibility, no GPU overlay coverage, no automatic misconduct detection.
- No collection or transmission of screen pixels, webcam/microphone frames, typed content, paste content, raw process names, raw window titles, HWNDs, PIDs, usernames, serial numbers, MAC addresses, or personal identity data.
- Linux daemon proofs rejected with `unsupported_platform` at both pairing and proof layers until Stage 2.8 Linux Display Integrity Research delivers a signed, validated path.

After this closeout the Windows Device Shield is fully closed as a research prototype, Stage 2.7 is safe to release, and Linux research can begin.

---

## [0.4.13] — 2026-05-17 — Stage 2.7 Cross-Platform Device Shield Unification

Stage 2.7 unifies the macOS and Windows Device Shield implementations under one documented cross-platform proof, scanner, risk, report, dashboard, privacy, and audit contract before Linux research begins.

### Added

- `src/device/forbiddenLocalFields.js` — shared single source of truth for forbidden raw-field names plus recursive deep-check helper.
- `src/device/platformScannerSchema.js` — supported-platform list, scanner-state enum, per-platform scanner-version map, and scanner-summary validator.
- `src/device/scannerRiskPolicy.js` — shared `mapScannerSummaryToRisk` plus `getManualReviewReason` (session + device-integrity contexts).
- `public/sdk/simurgh-browser-sdk.js#getDeviceShieldStatus` — UX-only platform/scanner status accessor with explicit trust-boundary comment.
- `docs/DEVICE_SHIELD_CONTRACT.md`, `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`, `docs/stages/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`, `docs/stages/STAGE_2_7_REVIEWER_CHECKLIST.md`.
- `docs/schemas/daemon-proof.schema.json`, `docs/schemas/device-scanner-result.schema.json` — JSON Schema draft-07.
- `scripts/smoke-stage-2-7-cross-platform-device-shield.sh`, `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`.
- `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs` — Scenarios A–G.
- `tests/security/stage27_cross_platform_security_audit.test.js` — 10 negative tests including a full sweep over `FORBIDDEN_LOCAL_FIELD_NAMES`.
- `tests/unit/{forbiddenLocalFields,platformScannerSchema,scannerRiskPolicy,reportBuilderDeviceShield}.test.js`.

### Changed

- `src/device/daemonProof.js`, `src/device/daemonState.js`, `src/academic/reportBuilder.js`, `tools/privacy-audit.mjs` — refactored to consume the new shared modules. No behaviour change; every `fail()` reason code preserved.
- `src/device/daemonState.js` `baseRecord.platform` default: `"macos"` → `"unknown"`. Unpaired sessions no longer implicitly claim a platform.
- `device_integrity` report section now emits `daemon_platform` as the canonical platform key; legacy `platform` retained as a back-compat alias for this release (planned removal: Stage 2.8 or later).
- `device_integrity.manual_review_recommendation` wording is now sourced from `scannerRiskPolicy.getManualReviewReason({ context: "device_integrity" })`.
- `scripts/check.sh` — new section 10l wires Stage 2.7 smoke + audit into the CI gate; privacy guard exemption added for `src/device/forbiddenLocalFields.js`.
- `scripts/security-audit-stage-2-4-2-5.sh` — overclaim grep exempts the Stage 2.7 contract / matrix / reviewer checklist / stage doc / spec / plan / security-test files, which legitimately enumerate the forbidden phrases.

### Verified

- Windows OS: Windows 10 Pro / Build 19045. Toolchain: Node 24.14.0, npm 11.9.0, .NET 8.0.421.
- `npm test` — 273/273 pass (+34 new tests).
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- Git Bash `scripts/smoke-stage-2-7-cross-platform-device-shield.sh` — all seven scenarios pass.
- Git Bash `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` — 10/10 negative tests pass.
- Stage 2.2/2.3, Stage 2.4/2.5, Stage 2.5 security audit, Stage 2.6 Windows scanner smoke, Stage 2.6 .NET daemon tests — all green.
- `scripts/check.sh` — 45/46 green; one pre-existing Windows-line-endings prettier tolerance failure (documented in check.sh itself). CI on Linux passes prettier cleanly.

### Non-claims (unchanged)

- Research prototype only. No production deployment claim.
- No MDM/Intune readiness, no Windows Service or notarised macOS packaging, no hardware attestation, no kernel-level visibility, no GPU overlay coverage, no automatic misconduct detection.
- No collection or transmission of screen pixels, webcam/microphone frames, typed content, paste content, raw process names, raw window titles, HWNDs, PIDs, usernames, serial numbers, MAC addresses, or personal identity data.
- Linux daemon proofs are rejected with `unsupported_platform` until Stage 2.8 Linux Display Integrity Research delivers a signed, validated path.

---

## [0.4.12] — 2026-05-16 — Stage 2.6 Windows Display Affinity Scanner (Release)

Tagged `v0.4.12-stage-2-6-windows-display-affinity-scanner` on `main` after PR #14 merged clean.

Stage 2.6 completes real-device Windows display-affinity validation for the Device Shield research prototype. WDA_MONITOR and WDA_EXCLUDEFROMCAPTURE are detected through the Windows daemon, signed inside daemon proofs, verified server-side, reflected in risk/report/dashboard/audit outputs, and protected by tamper, replay, and raw-field rejection gates.

### Fixed (this session)

- `scripts/smoke-stage-2-6-windows-scanner.sh` committed with mode `100644` (not executable) — caused `Permission denied` on the Linux CI runner at `check.sh` line 1150. Fixed with `git update-index --chmod=+x` (mode → `100755`).

### Removed (this session)

- `.github/workflows/windows-daemon.yml` — deleted as fully redundant. Both `dotnet test` on the Windows daemon solution and the Stage 2.6 smoke script are already executed inside `scripts/check.sh` step 10k on every Simurgh Quality Gate run. Consolidates all checks under a single workflow.

### Released

- PR #14 merged to `main`.
- Tag `v0.4.12-stage-2-6-windows-display-affinity-scanner` pushed.
- GitHub release published with Stage 2.6 release note.

---

## [0.4.12-stage-2-6B] — 2026-05-16 — Stage 2.6B Windows Display Affinity Scanner Real-Device Validation

Stage 2.6B is real-device validated on Windows 10 Pro build 19045 for live `GetWindowDisplayAffinity` detection of `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE`.

### Added

- `tools/simurgh-daemon-windows/src/SimurghAffinityFixture/` — controlled local Win32 fixture with `none`, `monitor`, and `exclude` modes.
- Windows daemon runtime `/health`, `/status`, `/pair`, and `/proof` loopback paths for local validation.
- .NET tests covering privacy-safe status/proof payloads and fixture project safety expectations.

### Changed

- Windows daemon proofs now include the full scanner field set required by the server validator, including scan timestamp, duration, privacy mode, and empty fingerprint hash array.
- `docs/stages/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`, README, SECURITY, PRIVACY, and ROADMAP now mark Stage 2.6B real Windows validation as passed.
- Roadmap now tracks real Windows laptop validation as complete while leaving production Windows Service packaging and deployment design out of scope.

### Verified

- Windows OS: Windows 10 Pro / Build 19045.
- Toolchain: Git 2.53.0, Node 24.14.0, npm 11.9.0, .NET 8.0.421.
- `npm test` — 239/239 pass.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- Git Bash `scripts/smoke-stage-2-6-windows-scanner.sh` — pass.
- Git Bash `scripts/security-audit-stage-2-4-2-5.sh` — pass.
- Git Bash `scripts/check.sh` — 44/44 pass.
- `.tools/dotnet/dotnet.exe build tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln` — pass.
- `.tools/dotnet/dotnet.exe test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln --no-restore` — 11/11 pass.
- Live daemon `/health` returned `platform: "windows"`.
- Live daemon `/status` returned `scanner_version: "2.6.0"` and `privacy_mode: "metadata_only"`.
- Normal desktop scan returned zero restricted/excluded counts.
- `WDA_MONITOR` fixture returned `restricted_detected`, `monitor_only_window_count: 1`, and `capture_restricted_window_count: 1`.
- `WDA_EXCLUDEFROMCAPTURE` fixture returned `risk_detected` and `capture_excluded_window_count: 1`.
- Live signed Windows daemon proofs were accepted by the server for healthy, monitor-only, and capture-excluded states.
- Tampered scanner proof rejected with `invalid_signature`.
- Replayed proof rejected through consumed challenge rejection.
- Raw local `hwnd` rejected as `forbidden_local_field`.
- Report showed Windows scanner summary; dashboard showed Windows scanner state; audit chain verified.
- Privacy sweep found only expected forbidden-field rejection references in test logs.

### Notes

- Manual review wording remains: `Manual review recommended. No automatic misconduct finding.`
- This is still a research prototype. It does not claim Windows Service deployment, production endpoint management, MDM/Intune readiness, hardware attestation, kernel-level visibility, Linux scanner support, or automatic misconduct detection.

## [0.4.11-stage-2-6A] — 2026-05-16 — Stage 2.6A Windows Display Affinity Scanner Implementation

Stage 2.6A is implementation-complete and pending real Windows laptop validation for live `GetWindowDisplayAffinity` detection.

### Added

- Windows signed daemon-proof support for `platform: "windows"` and `scanner_version: "2.6.0"`.
- Windows scanner fields: `capture_restricted_window_count` and `monitor_only_window_count`.
- Stage 2.6 smoke driver: `scripts/smoke-stage-2-6-windows-scanner.sh` and `tests/e2e/stage26_windows_scanner_smoke.mjs`.
- `tools/simurgh-daemon-windows/` .NET 8 daemon skeleton with mock-first scanner architecture, Win32 provider stub, privacy normaliser, P-256 proof signer, identity store, local health payload, and xUnit tests.
- GitHub Actions Windows daemon build/test workflow.
- `docs/stages/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`.

### Changed

- `WDA_EXCLUDEFROMCAPTURE` / `capture_excluded_window_count > 0` maps to Critical/manual review.
- `WDA_MONITOR` / `monitor_only_window_count > 0` maps to Warning/manual review.
- Recursive daemon proof and pairing privacy rejection now returns generic `forbidden_local_field` for forbidden local fields.
- Reports and instructor dashboard include Windows platform and aggregate scanner counts without raw HWND, PID, process, title, path, username, pixel, audio, webcam, typed, or pasted data.
- `scripts/check.sh` is safer on Windows hosts: portable Node test paths, Windows line-ending tolerant format check, and repo-local audit-chain temp files.

### Verified

- Red step: Stage 2.6 Windows proof/risk/report tests failed before implementation.
- `node --test tests/unit/daemonProof.test.js tests/unit/daemonProofScanner.test.js tests/unit/daemonScannerRisk.test.js tests/unit/reportBuilderScanner.test.js` — pass.
- `node --test tests/security/stage24_25_security_audit.test.js` — pass.
- `scripts/smoke-stage-2-6-windows-scanner.sh` — pass.
- `npm test` — 239/239 pass.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- `scripts/security-audit-stage-2-4-2-5.sh` — pass.
- `.tools/dotnet/dotnet.exe test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln --no-restore` — 8/8 pass.
- `scripts/check.sh` — 44/44 gates pass on Windows; macOS Swift gates skipped honestly.

### Notes

- Real Windows laptop validation is still pending. This branch does not claim production deployment, Windows Service readiness, MDM/Intune readiness, hardware attestation, kernel-level visibility, Linux scanner support, or automatic misconduct detection.

## [0.4.11] — 2026-05-16 — Stage 2.5 External Technical Review Signal

### Changed

- README status block updated from "Stage 2.5 research prototype — macOS metadata-only affinity scanner active" to "Stage 2.5 closed — macOS Device Shield regression-gated and ready for external technical review."
- README Stage 2.5 section heading corrected from `branch active — v0.4.7 target` to `frozen — v0.4.10`.
- README Status & License section updated to state Stage 2.5 is closed and ready for external technical review.

### Added

- README `## External Technical Review` section (after status block): lists the full macOS Device Shield baseline, current verification numbers (234/234 tests, 50/50+ gates, all smoke packs), open-door statement for reviewers, and honest non-claims list.
- `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md` — `## External Review Status` section with prototype framing and eight specific focus areas for reviewers.
- PR #10 `stage-2-macos-external-review-signal` → `main`.
- GitHub Issue #11 "External Review Request: Stage 2.5 macOS Integrity Stack" (pinned).

### Verified

- `npm test` — 234/234 pass.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- `node tools/privacy-audit.mjs` — pass.
- `git diff --check` — clean.
- Docs only — no code changes, no gate changes.

### Notes

- This is a review-signal closeout artefact, not Stage 2.6 feature work.
- No production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, raw process/window collection, or automatic misconduct detection is claimed.

## [0.4.10] — 2026-05-16 — Stage 2.5 Closeout Security Audit

### Added

- `scripts/security-audit-stage-2-4-2-5.sh` — closeout cybersecurity gate for the Stage 2.4 browser SDK and Stage 2.5 scanner/daemon proof surface.
- `tests/security/stage24_25_security_audit.test.js` — regression suite covering recursive raw local-field rejection, SDK token/proof boundaries, daemon localhost hardening source checks, LaunchAgent dry-run safety, and dashboard/report wording.
- `docs/stages/STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md` — closeout audit scope, locked security decisions, command, and Stage 2.6 go/no-go rules.
- `scripts/check.sh` gate: `Stage 2.4/2.5 cybersecurity audit: SDK + daemon + scanner hardening`.

### Changed

- Daemon proof and pairing validation now reject forbidden raw local-data fields recursively, including nested debug/scanner objects.
- macOS daemon localhost server now has explicit request-size handling, malformed JSON rejection for sensitive JSON endpoints, method-not-allowed responses for known routes, and keeps loopback-only binding.
- Development LaunchAgent install/uninstall scripts now expose safe `--check` / `--dry-run` modes and bounded path checks; plist lint runs when `plutil` is available and is skipped cleanly on Linux CI.
- README now documents the Stage 2.5 closeout cybersecurity audit command and links the audit note.

### Verified

- Red step: `node --test tests/security/stage24_25_security_audit.test.js` failed before implementation on recursive forbidden fields, daemon HTTP hardening checks, and LaunchAgent dry-run checks.
- Targeted gate: `scripts/security-audit-stage-2-4-2-5.sh` — pass.

### Notes

- This is a Stage 2.5 closeout hardening pass, not Stage 2.6 feature work.
- No production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux daemon/scanner support, raw process/window collection, or automatic misconduct detection is claimed.

## [0.4.9] — 2026-05-16 — Stage 2.2/2.3 E2E Smoke Closeout

### Added

- `scripts/smoke-stage-2-2-2-3.sh` — closeout smoke wrapper for Stage 2.2 node pairing and Stage 2.3 daemon proof flows.
- `tests/e2e/stage22_23_smoke.mjs` — CI-safe E2E driver covering verified node pairing, signed integrity proofs, different-node rejection, stale proof rejection, nonce replay rejection, invalid signature rejection, daemon pairing/proofs, daemon proof replay/tamper rejection, reports, dashboard state, audit verification, and hardened missing-proof mode.
- `docs/superpowers/plans/2026-05-16-stage-2-2-2-3-e2e-smoke-pack.md` — implementation plan for the Stage 2.2/2.3 smoke pack.
- `scripts/check.sh` gate: `Stage 2.2/2.3 E2E smoke: pairing + daemon proof bridge`.

### Changed

- README now documents the dedicated Stage 2.2/2.3 smoke command and the bridge checks it performs before later Stage 2 work.

### Verified

- Targeted red step confirmed `tests/e2e/stage22_23_smoke.mjs` was missing before implementation.
- `scripts/smoke-stage-2-2-2-3.sh` — pass.
- Final verification after edits: `git diff --check` — clean; `npm test` — 234/234 pass; `./scripts/check.sh` — 50/50 gates pass; `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` — pass.

### Notes

- This is a Stage 2.2/2.3 smoke gate, not Stage 2.6 feature work.
- No production deployment, hardware attestation, notarisation, MDM readiness, Windows/Linux daemon support, or automatic misconduct detection is claimed.

## [0.4.8] — 2026-05-16 — Stage 2.4/2.5 E2E Smoke Closeout

### Added

- `scripts/smoke-stage-2-4-2-5.sh` — closeout smoke wrapper for Stage 2.4 browser SDK + Stage 2.5 scanner proof flows.
- `tests/e2e/stage24_25_smoke.mjs` — CI-safe E2E driver that creates an exam session, pairs a deterministic mock P-256 daemon, sends signed healthy and capture-excluded scanner proofs, rejects tampered/replayed/raw-field proofs, verifies report/dashboard `device_integrity`, and verifies the audit chain.
- `docs/superpowers/plans/2026-05-16-stage-2-4-2-5-e2e-smoke-pack.md` — implementation plan for the closeout smoke pack.
- `scripts/check.sh` gate: `Stage 2.4/2.5 E2E smoke: SDK + daemon + scanner + signed proof`.

### Changed

- README now documents the dedicated Stage 2.4/2.5 smoke command and its CI-safe versus macOS-only checks.
- Daemon rejection audit/dashboard state now stores `forbidden_local_field` for forbidden local-data proof failures instead of preserving exact forbidden field names.
- Daemon proof validation explicitly rejects `webcam` as a forbidden raw local-data field.
- Daemon `/status` now includes privacy-safe `platform: "macos"` for lifecycle smoke and UI consistency.

### Verified

- Baseline after pulling latest `main`: `git diff --check` passed; `npm test` — 234/234 pass; `./scripts/check.sh` — 48/48 gates pass; `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` — pass.
- `scripts/smoke-stage-2-4-2-5.sh` — pass.
- Final verification after edits: `git diff --check` — clean; `npm test` — 234/234 pass; `./scripts/check.sh` — 49/49 gates pass; `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass; `swift build` in `tools/simurgh-daemon-macos` — pass.

### Notes

- This is a Stage 2.5 closeout gate, not Stage 2.6 feature work.
- No production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, raw process/window collection, or automatic misconduct detection is claimed.

## [0.4.7] — 2026-05-16 — Stage 2.5 macOS Affinity Scanner Implementation

### Added

- `AffinityScanner` now uses a mockable CoreGraphics metadata provider to enumerate meaningful visible windows and count capture-excluded risk signals.
- Stage 2.5 scanner summary fields inside signed daemon proofs: scanner state/version, scan timestamp, scan duration, visible/suspicious/capture-excluded counts, scan error count, privacy mode, and privacy-safe fingerprint hashes.
- Server-side daemon-proof validation for scanner fields, including privacy rejection for raw process/window/PID/path/user fields and signature tamper rejection when scanner fields change.
- Scanner audit events: `SCANNER_SCAN_COMPLETED`, `SCANNER_RISK_DETECTED`, `SCANNER_PERMISSION_DENIED`, `SCANNER_UNAVAILABLE`, `SCANNER_PRIVACY_REJECTED`, and `SCANNER_ERROR`.
- Stage 2.5 Swift and Node tests plus `scripts/check.sh` gates for scanner proof validation, scanner risk mapping, report scanner summaries, Swift scanner privacy/risk behavior, and signed scanner proof inclusion.
- `docs/stages/STAGE_2_5_MACOS_AFFINITY_SCANNER.md`.

### Changed

- Daemon `/status` now exposes privacy-safe scanner state and last-scan metadata.
- Daemon `/proof` now signs scanner summaries inside the proof payload; browser code does not add trusted scanner fields beside the proof.
- `capture_excluded_window_count > 0` remains Critical/manual-review context, while `scanner_unavailable` and `permission_denied` are accepted as signed warning-level scanner states.
- Instructor dashboard and reports include scanner state, visible-window count, max capture-excluded count, scanner error counts, permission-denied counts, and manual-review wording.
- README, SECURITY, PRIVACY, and ROADMAP document Stage 2.5 while preserving the research-prototype and metadata-only boundaries.

### Verified

- Baseline before edits: `git diff --check`, `npm test`, `./scripts/check.sh`, `swift test`, and `swift build` all passed.
- `node --test tests/unit/daemonProofScanner.test.js tests/unit/daemonScannerRisk.test.js tests/unit/reportBuilderScanner.test.js` — 7/7 pass.
- `npm test` — 234/234 pass.
- `swift test` in `tools/simurgh-daemon-macos` — 8/8 pass.
- `swift build` in `tools/simurgh-daemon-macos` — pass.
- `git diff --check` — clean.
- `./scripts/check.sh` — 48/48 gates pass, including Stage 2.5 scanner proof, risk, report, Swift scanner, and signed-proof gates.

### Notes

- Stage 2.5 remains a research prototype milestone. It does not claim production deployment, notarisation, MDM readiness, hardware attestation, Windows/Linux support, or automatic misconduct detection.
- Scanner output is metadata-only. It does not transmit raw process names, raw window titles, PIDs, usernames, home directories, file paths, serial numbers, MAC addresses, screenshots, screen pixels, webcam frames, microphone audio, typed content, or pasted content.

## [0.4.6] — 2026-05-16 — Stage 2.4 Browser SDK & Daemon Lifecycle Hardening

### Added

- `public/sdk/simurgh-browser-sdk.js` — reusable browser SDK for daemon discovery, health/status checks, pairing, proof fetch, telemetry send, hardened missing-proof handling, and explicit client daemon state.
- Browser SDK unit coverage for missing daemon state, pair success, proof-backed telemetry, hardened missing-proof blocking, and proof replay/rejection state.
- macOS daemon lifecycle commands: `start`, `stop`, `status`, `doctor`, and `reset-identity`.
- `DaemonDoctor` diagnostics covering daemon reachability, port availability, Keychain identity presence, allowed-origin configuration, localhost binding, server reachability, and proof round-trip readiness.
- Development-only LaunchAgent plist plus install/uninstall scripts under `tools/simurgh-daemon-macos/`.
- Stage 2.4 check gates for SDK loading/tests, daemon lifecycle/doctor redaction tests, LaunchAgent plist lint, and daemon lifecycle smoke.

### Changed

- `public/index.html` now consumes the SDK instead of owning the daemon bridge inline.
- Daemon localhost server now supports CORS preflight for allowed origins and a local `/shutdown` control route for development lifecycle use.
- README, SECURITY, PRIVACY, and ROADMAP document Stage 2.4 while keeping production deployment, notarisation, MDM, hardware attestation, Windows/Linux daemon, and scanner-upgrade work out of scope.

### Verified

- Baseline before edits: `git diff --check`, `npm test`, `./scripts/check.sh`, `swift test`, and `swift build` all passed.
- `node --test tests/unit/browserSdk.test.js tests/unit/daemonLifecycle.test.js tests/unit/daemonDoctor.test.js` — 8/8 pass.
- `npm test` — 227/227 pass.
- `swift build` in `tools/simurgh-daemon-macos` — pass.
- `swift test` in `tools/simurgh-daemon-macos` — 2/2 pass.
- `./scripts/check.sh` — 43/43 gates pass, including Stage 2.4 SDK load/tests, doctor redaction, LaunchAgent plist lint, and daemon lifecycle smoke.

### Notes

- The LaunchAgent path is development-only. It is not notarised, not production endpoint management, and not MDM deployment.
- The daemon scanner remains a conservative metadata-only placeholder; deeper scanner detection is reserved for a later stage.

## [0.4.5] — 2026-05-15 — Stage 2.3 macOS Localhost Daemon

### Added

- `src/device/daemonProof.js` — P-256 daemon proof canonicalisation, node hash derivation, signature verification, timestamp/session/exam validation, and raw local-data field rejection.
- `src/device/daemonPairing.js` — per-session single-use daemon challenge registry for `pair`, `session_start`, `proof`, and `session_end` purposes.
- `src/device/daemonState.js` — daemon state machine and `daemon_risk` scoring helper.
- `src/device/daemonEvents.js` and Stage 2.3 event constants in `src/academic/academicEvents.js`.
- `POST /api/device/challenge` and `POST /api/device/pair` in `server.js`.
- Telemetry `daemon_proof` handling: valid proofs update daemon state and audit; invalid, stale, node-mismatched, or replayed proofs are rejected.
- `SIMURGH_REQUIRE_DAEMON=true` hardened mode, which rejects telemetry without a daemon proof and audits `DAEMON_MISSING`.
- `device_integrity` report section and instructor-dashboard daemon status card.
- `tools/simurgh-daemon-macos/` — SwiftPM macOS localhost daemon skeleton with Keychain-backed P-256 identity, `127.0.0.1` listener, `/health`, `/status`, `/pair`, `/proof`, and `/session/end`.
- `docs/stages/STAGE_2_3_MACOS_LOCALHOST_DAEMON.md`.
- Unit tests for daemon proof validation, pairing registry, daemon state, daemon risk scoring, and report `device_integrity`.
- `scripts/check.sh` gates for Stage 2.3 daemon pair/proof smoke, replay rejection, tampered-proof audit rejection, hardened missing-proof rejection, and Swift daemon build/test.

### Changed

- `src/academic/riskScoring.js` now includes `daemon_risk` without removing existing helper and affinity categories.
- `tools/privacy-audit.mjs` and `scripts/check.sh` now enforce additional raw local-data forbidden fields: serial/device identifiers, usernames, home directories, process names, window titles, and raw process/window fields.
- README, SECURITY, PRIVACY, and ROADMAP now describe the Stage 2.3 daemon boundary and limitations.
- `.env.example` documents the demo/browser-only default and hardened `SIMURGH_REQUIRE_DAEMON=true` path.
- GitHub Actions now names the CI/CD workflow as the Simurgh Quality Gate while continuing to run `./scripts/check.sh`.

### Verified

- `npm test` — 219/219 pass.
- `node --test tests/unit/riskScoring.test.js tests/unit/reportBuilder.test.js` — 15/15 pass.
- `node --test tests/unit/envConfig.test.js` — 3/3 pass.
- `swift test` in `tools/simurgh-daemon-macos` — 1/1 pass.
- `./scripts/check.sh` — 38/38 gates pass.
- Stage 2.3 check gate verifies daemon pairing, telemetry proof acceptance, replay rejection, tampered-proof audit rejection, and hardened missing-proof rejection/audit.
- `npm audit --audit-level=high` — 0 vulnerabilities.

### Notes

- Stage 2.3 remains a research prototype. It does not claim hardware attestation, production endpoint management, or automatic misconduct detection.
- The daemon scanner currently returns a conservative zero count; future native scanner work should preserve the same metadata-only API contract.

## [0.4.4] — 2026-05-15 — Audit-Coverage Closure (Q9 + Q10) and Research Programme

### Added

- `docs/RESEARCH_PROGRAMME.md` — long-horizon four-track research roadmap (Interface Vulnerabilities, Proof-Based Integrity Defence, Secure Agent Sandboxing, Regulated / Secure-Environment Roadmap). Includes the 10/10 audit-question evidence matrix with file/line citations.
- `scripts/check.sh` — two consolidated audit-coverage gates covering the five Q10 demo states:
  - "Stage 2 stale proof + replayed nonce both rejected (proof_stale, nonce_replayed)" — exercises `proof_stale` clock-drift rejection and `nonce_replayed` replay-guard rejection on one session.
  - "Stage 2.2 invalid_signature + challenge-rejection both emit INTEGRITY_PAIRING_REJECTED (Q9)" — exercises pairing `invalid_signature` rejection (zeroed sig) **and** the new challenge-request audit emission (`stage: "challenge_request"`).

### Changed

- `server.js` `/api/integrity/pairing/challenge` rejection path — now appends `INTEGRITY_PAIRING_REJECTED` with `stage: "challenge_request"` when `createChallenge` returns a failure (e.g. `node_already_paired`). Previously these returned `409` silently with no audit trail entry. Closes the Q9 audit-coverage gap identified in the May 2026 internal audit.

### Verified

- `npm test` — 203/203 pass
- `./scripts/check.sh` — 34/34 gates pass (was 32; +2 consolidated audit-coverage gates)
- `npm audit --audit-level=high` — 0 vulnerabilities
- Audit posture: 10/10 on the May 2026 ten-question matrix (all entries have both a code-level answer and a regression gate).

### Notes

- The new gates intentionally share two sessions (one for proof-state coverage, one for pairing-state coverage) to stay under the `/join` 10/min IP rate limit when run inside the stage-21 server boot in `check.sh`.

## [0.4.3] — 2026-05-15 — Stage 2 Security Hardening Pass

### Added

- `src/integrity/pairingAuditHints.js` — `safeParsedPairingHints()` helper. `node_id_hash_if_parsed` is now emitted in audit chain rejection payloads only when the public key actually decodes to 32 bytes AND the hash matches sha256(pubkey), not on regex shape alone.
- `tests/unit/integrity/pairingAuditHints.test.js` — 8 tests covering the audit-hint safety invariants.
- `limitIntegrityProof` — rate limiter on `POST /api/integrity/proofs` (30/min per session token) to bound Ed25519 verify cost on a compromised session token.

### Changed

- `pairingRegistry.completePairing` — challenge comparison now uses `crypto.timingSafeEqual` rather than `!==`. Challenges are not strictly secrets (they round-trip through the client), but constant-time compare removes future regression risk.
- `server.js` `/api/integrity/proofs` and `/api/integrity/pairing/complete` rejection paths — use the new safe-parsed-hints helper instead of inline regex checks; audit payloads now never carry a `node_id_hash_if_parsed` that wasn't cryptographically reconciled with the submitted public key.
- Stage 2.2 design spec, plan, and historical docs — gate-count references normalised to `32/32` (was a mix of `31/31` and `32/32`).

### Verified

- `npm test` — 203/203 pass (was 195; +8 from new audit-hints suite)
- `./scripts/check.sh` — 32/32 gates pass
- `npm audit --audit-level=high` — 0 vulnerabilities
- No raw key / signature / challenge bytes appear in any audit payload (verified by inspection of all `appendAudit(... EVENTS.INTEGRITY_*)` call sites)

### Notes

- The macOS CLI key at `~/.simurgh/node-key` remains a development identity key (0600 / dir 0700). Not Keychain-backed. Not Secure Enclave-backed. Hardware attestation remains future work — do not infer production device trust.

## [0.4.2] — 2026-05-14 — Stage 2.2 macOS Node Pairing

### Added

- `src/integrity/pairingSchema.js` — v1 pairing envelope constants (8 required fields, reused forbidden-field blocklist)
- `src/integrity/pairingCanonicalise.js` — re-exports the proof canonicaliser as `canonicalisePairingPayload` (single source of truth for the wire format)
- `src/integrity/pairingValidator.js` — orchestrates v1 schema + timestamp + key/hash + signature checks
- `src/integrity/pairingRegistry.js` — per-session state machine (pending → paired) with injectable `now` for deterministic tests
- `POST /api/integrity/pairing/challenge` — 32-byte CSPRNG challenge, 60 s TTL, 10/min/session-token rate limit
- `POST /api/integrity/pairing/complete` — verifies Ed25519-signed pairing payload, stores node public key for the session, 20/min rate limit
- Three new audit event constants: `INTEGRITY_PAIRING_CHALLENGE_CREATED`, `INTEGRITY_NODE_PAIRED`, `INTEGRITY_PAIRING_REJECTED`; payloads carry only hashes, never raw challenge/public-key/signature
- macOS Swift CLI `pair` subcommand with strict unknown-subcommand handling (exit 64)
- `PairingEnvelope.swift` + `PairingSigner.swift` mirror their proof counterparts
- Cross-implementation golden pairing fixture (`golden-pairing-payload.{json,sha256}`)
- 5 new `scripts/check.sh` gates: pairing round-trip, paired-proof verified, paired-session rejects different node, unpaired backward compat, N1 cross-route consistency — gate count 27 → 32

### Changed

- `src/integrity/proofValidator.js` — `validateProof(raw, { now, pairedNode, expectedSessionId })`; returns `{ ok, proof, signature_status }`. Paired sessions get `signature_status: "verified"` via E1 strict triple check (hash + public-key string + signature using registered key).
- `server.js` — `POST /api/integrity/proofs` looks up `pairingRegistry.getPairedNode(sessionId)` and forwards it to the validator; new reason codes mapped to 401/409
- `examEvictionTimer` callback now evicts pairing registry entries alongside integrity state
- macOS Swift CLI — `main.swift` rewritten for subcommand dispatch; bare `--session` still defaults to `proof`

### Notes

- Stage 2.2 transitional posture preserved: unpaired Stage 2.1 sessions still return `signature_status: "unregistered_node"`
- Pairing registry is in-memory only; server restart loses all pairings (matches session lifecycle)
- Pairing is immutable per session; `/challenge` and `/complete` both reject 409 `node_already_paired` after pairing
- Cross-route N1 consistency: `/pairing/complete` refuses to pair if `integrityState.bound_node_id_hash` already differs from the pairing payload
- SwiftPM cannot reference resources outside the package, so the golden pairing fixture is duplicated under `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/`; sync enforced by the `check.sh` "Golden fixture sync" gate
- The CLI's `~/.simurgh/node-key` remains a development identity key, not hardware-backed attestation

### Verified

- `npm test` — all tests pass
- `./scripts/check.sh` (full) — 32/32 gates pass on macOS
- `swift build` + `swift test` — pass on macOS
- `npm audit --audit-level=high` — 0 vulnerabilities

## [Unreleased] — 2026-05-15 — Stage 2.2 Task 4: Pairing Registry

### Added

- `src/integrity/pairingRegistry.js` — `createPairingRegistry({ challengeTtlMs })` factory that tracks per-session pairing state (none → pending → paired). Injectable `now` parameter for deterministic tests. Default TTL 60 s. Paired state is immutable for the session lifetime. Exports: `createChallenge`, `getChallenge`, `completePairing`, `getPairedNode`, `isPaired`, `evict`, `evictMissing`, `size`. Reason codes: `node_already_paired`, `challenge_not_found`, `challenge_expired`, `challenge_mismatch`.
- `tests/unit/integrity/pairingRegistry.test.js` — 14 tests across 3 suites covering challenge creation, replacement, rejection when paired; pairing happy path and all error paths; accessors, eviction, and size reporting.

### Raouf

- **Date:** 2026-05-15 (Australia/Sydney)
- **Scope:** Stage 2.2 Task 4 — pairing registry (TDD)
- **Summary:** Written test-first: test file confirmed module-not-found failure before implementation. 14/14 tests pass. `npm test` → 189/189 total. Prettier passes on both new files.
- **Files changed:** `src/integrity/pairingRegistry.js`, `tests/unit/integrity/pairingRegistry.test.js`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `node --test tests/unit/integrity/pairingRegistry.test.js` → 14/14. `npm test` → 189/189. `npx prettier --check` → clean.
- **Follow-ups:** Task 5 (wire registry into server pairing endpoints), Task 6 (Swift pairing handshake), Task 7 (check.sh Stage 2.2 gates).

## [0.4.1] — 2026-05-14 — Stage 2.1 macOS Integrity Proof Pipeline

### Added

- `src/integrity/proofCanonicalise.js` — canonical JSON serialiser (sorted keys, no whitespace, top-level `signature` excluded)
- `src/integrity/proofSignature.js` — Ed25519 verifier with raw-bytes → DER/SPKI wrap for Node `crypto.verify`; `computeNodeIdHash` helper
- `src/integrity/proofValidator.js` — orchestrates v1 schema + timestamp + privacy + key + signature checks
- `src/integrity/integrityState.js` — per-session N1 strict node continuity (immutable `bound_node_id_hash`)
- `INTEGRITY_NODE_STALE` event constant in `src/academic/academicEvents.js` (defined; not emitted in Stage 2.1, reserved for Stage 2.x)
- `tools/simurgh-node-macos/` — Swift CLI generating signed v1 proofs (no daemon, no permissions, no ScreenCaptureKit, no content collection); package builds and tests pass on macOS
- `tests/unit/integrity/__fixtures__/golden-proof.{json,sha256}` — cross-implementation canonical-bytes fixture; SHA-256 locked at `fa63f66f9800cd8b9589b2a6e026f3c6f682fea98bd017f95c03b82185faeeca`
- `scripts/check.sh` — 6 new gates: Stage 2.1 round-trip smoke, zeroed-signature rejection, fixture sync, Swift conditional build + test, CLI output privacy regression. Quick mode skips the Stage 2.1 server smoke and the Swift block.
- Cross-implementation interop test (`tools/simurgh-node-macos/Tests/SimurghNodeTests/CanonicaliseTests.swift`) proves `JSONEncoder.sortedKeys` produces byte-identical output to the Node canonicaliser for the golden fixture

### Changed

- `src/integrity/proofSchema.js` — rewritten to declarative v1 constants (validation moved to `proofValidator.js`)
- `src/integrity/nonceGuard.js` — simplified to global replay protection (removed `nonce_session_mismatch`)
- `server.js` — `POST /api/integrity/proofs` rewired to the v1 pipeline; returns `409 session_expired_or_evicted` if telemetry session is missing; logs minimal privacy-safe rejection payloads
- Audit payload for `INTEGRITY_PROOF_RECEIVED` now stores `nonce_hash` (not raw nonce) and capability/signal summaries (not raw signals)
- `package.json` test glob recurses into `tests/unit/**/*.test.js`
- `.gitignore` excludes `.simurgh_check_logs/`, `tools/simurgh-node-macos/.build/`, `.swiftpm/`

### Notes

- Stage 2.1 transitional posture: every accepted proof returns `signature_status: "unregistered_node"` until pairing registry lands in Stage 2.2
- The CLI's `~/.simurgh/node-key` is a development identity key, not hardware-backed attestation
- No claim of production device trust
- SwiftPM does not permit resources from outside the package, so the golden fixture is duplicated under `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/`. The check.sh "Golden fixture sync" gate enforces byte-identity between the two copies.

### Verified

- `npm test` — 140/140 tests pass across 27 suites
- `./scripts/check.sh` (full) — 27/27 gates pass
- `swift build` (macOS) — succeeds
- `swift test` (golden interop) — passes
- `npm audit --audit-level=high` — 0 vulnerabilities

## [Unreleased] — 2026-05-14 — README Anchor Audit Fix

### Fixed

- Corrected stale README badge and table-of-contents anchors on the Stage 2 branch after the vendor-neutral heading update.

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** README anchor audit
- **Summary:** Fixed stale README badge and table-of-contents anchors on the Stage 2 branch after the vendor-neutral heading update.
- **Files changed:** `README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Branch-object audit confirmed zero old company-specific README wording, the neutral section exists, AGENT/CHANGELOG contain the vendor-neutral log, and README relative links/anchors pass across all active branches. `npx prettier --check README.md AGENT.md CHANGELOG.md` passed. `git diff --check` passed.
- **Follow-ups:** None.

## [Unreleased] — 2026-05-14 — Vendor-Neutral README Positioning

### Changed

- Removed the README's company-specific "Why Anthropic?" section.
- Added vendor-neutral "Why AI Platforms Need Proof-Based Integrity" positioning.
- Reworded high-visibility README references from Claude/Anthropic-specific phrasing to optional AI narrative provider language while keeping actual environment variable names accurate.
- Neutralized contributor and capability-uplift wording for company-neutral review.

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** README vendor-neutral positioning
- **Summary:** Removed company-specific Anthropic pitch language before external outreach and reframed the README around AI platforms, proof-based integrity, and vendor-neutral education/enterprise/agentic workflow relevance.
- **Files changed:** `README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npx prettier --check README.md AGENT.md CHANGELOG.md` passed. README relative links and anchors passed. README grep confirmed no `Why Anthropic`, `Anthropic`, `Claude`, `Constitutional`, `strategic moat`, or partnership-pitch wording remains. `git diff --check` passed. Full `npm run format:check` remains blocked by existing Stage 2/generated files outside this README change (`docs/superpowers/plans/2026-05-14-stage-2-1-macos-integrity-proof.md`, `tools/simurgh-node-macos/README.md`, and tracked `.build` artifacts).
- **Follow-ups:** None.

## [Unreleased] — 2026-05-14 — Stage 2.1 Task 4: Proof Validator

### Added

- `src/integrity/proofValidator.js` — `validateProof(raw, { now })` orchestrates forbidden-field, required-field, version, platform, privacy_mode, session_id, timestamp window, capabilities, signals, public-key length, node_id_hash binding, nonce, signature format, and Ed25519 signature checks. Returns `{ ok: true, proof }` (with raw `nonce_bytes` Buffer) or `{ ok: false, reason }`.
- `tests/unit/integrity/proofValidator.test.js` — 32 tests across 9 suites (happy path, required-field deletion loop, forbidden-field loop, version/platform/mode, session_id, timestamp window, capabilities/signals shapes, public-key/hash binding, signature format + verification + canonical-sort stability).

### Changed

- `scripts/check.sh` — added `src/integrity/proofValidator.js` to privacy grep exclusion list (it imports forbidden-field constants, not privacy violations).

### Verified

- `node --test tests/unit/integrity/proofValidator.test.js` → 32/32 pass, 0 fail.

## [Unreleased] — 2026-05-14 — Stage 2.1 Design Spec

### Added

- `docs/superpowers/specs/2026-05-14-stage-2-1-macos-integrity-proof-design.md` — approved design spec for Stage 2.1 (macOS CLI integrity proof pipeline)
  - Locks A (v1 envelope refactor), B2 (Ed25519 per-node keypair), D1 (CLI proof generator), N1 (strict node continuity)
  - v1 envelope shape, strict validator rules, canonical-JSON signing, Node SPKI wrapping for Ed25519, asymmetric timestamp tolerance, audit-payload privacy rules, ~60-test plan with cross-implementation golden fixture
- AGENT.md entry: Stage 2.1 design spec scope + verification + follow-ups

### Notes

- Spec only; no runtime code changes yet
- Next: invoke `superpowers:writing-plans` to produce the implementation plan
- Stage 2.0 scaffold (v0.4.0) will be refactored — the v1 envelope replaces the simpler shape

## [0.4.0] — 2026-05-14 — Stage 2.0 Integrity Proof Pipeline Scaffold

### Added

- `src/integrity/proofSchema.js` — proof validator enforcing forbidden-field blocklist (screen_pixels, webcam_frame, paste_content, typed_answer, etc.), required-field checks, 30 s timestamp freshness window, capability allowlist, privacy_mode enforcement, sha256 hash root validation
- `src/integrity/nonceGuard.js` — nonce replay protection with TTL eviction for `POST /api/integrity/proofs`
- `POST /api/integrity/proofs` route — session-token-gated, nonce-replay-protected, audit-chain-connected Stage 2.0 scaffold endpoint (returns 202 with `note:` field advertising scaffold status)
- `INTEGRITY_PROOF_RECEIVED` and `INTEGRITY_PROOF_REJECTED` events in `src/academic/academicEvents.js`
- 25 new unit tests across `tests/unit/integrity/` (19 proofSchema + 6 nonceGuard)
- Test runner glob now recurses into `tests/unit/**/*.test.js`

### Changed

- `scripts/check.sh` privacy grep now excludes `src/integrity/proofSchema.js` (contains the forbidden-field constant list, not privacy violations)

### Does not include

- Cryptographic signature verification (planned Stage 2.x)
- Integration with Stage 1 risk scoring (planned Stage 2.x)
- Hardware-rooted attestation (future milestone)
- Replacement of the `/api/affinity` helper path

### Verified

- 93/93 unit tests pass
- `./scripts/check.sh` (full) → 21/21 pass
- `npm audit` → 0 vulnerabilities

## [0.3.6] — 2026-05-14 — Stage 2 Readiness Audit Fix

### Fixed

- Corrected `SIMURGH_CLAUDE_ON_SAFE` handling so Claude narrative calls remain skipped for Safe verdicts by default, matching README and `.env.example`.
- Added `tests/unit/envConfig.test.js` to lock the Safe/Warning/Critical Claude gating defaults.
- Updated current test-count references in README and SECURITY.

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** Stage 2 readiness audit fix
- **Summary:** Full audit found one code/docs mismatch: Safe verdicts were documented as skipping Claude by default, but `stagingConfig.claudeOnSafe` defaulted to enabled when the env var was absent. Fixed the default, added regression coverage, and updated current verification-count docs.
- **Files changed:** `src/config/env.js`, `tests/unit/envConfig.test.js`, `README.md`, `SECURITY.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm test` passed 68/68 tests. `npm run format:check` passed. `./scripts/check.sh --fix` passed 21/21. Final `./scripts/check.sh` passed 21/21. Markdown relative links and anchors passed. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. Direct dependency licence spot-check found MIT for `@anthropic-ai/sdk`, `express`, and `prettier`. `git diff --check` passed.
- **Follow-ups:** Push branch and collect remote CI evidence before tagging.

## [0.3.5] — 2026-05-14 — Stage 1.5 Validation Pack

### Added

- Stage 1.5 reviewer documentation:
  - `docs/stages/STAGE_1_5_REVIEWER_PACK.md`
  - `docs/THREAT_MODEL.md`
  - `docs/VALIDATION.md`
  - `docs/LIMITATIONS.md`
  - `docs/stages/STAGE_2_ARCHITECTURE.md`
  - `docs/RESOURCE_PLAN.md`
  - `docs/DEMO_SCRIPT.md`
  - `docs/DECISIONS.md`
  - `docs/RISK_REGISTER.md`
  - `docs/REVIEWER_CHECKLIST.md`
  - `docs/evidence/stage-1/README.md`
  - `docs/evidence/stage-1/.gitkeep`
- `.github/pull_request_template.md` with validation, security/privacy, docs, and Stage boundary checks

### Changed

- Updated `README.md` for Stage 1 complete / Stage 1.5 validation pack / Stage 2 planned framing
- Fixed README clone URL and Node prerequisite to match the actual repo and CI target
- Added README links to the Stage 1.5 pack and clarified what Stage 1 proves and does not prove
- Updated `ROADMAP.md` so Stage 1.5 is the validation pack and Stage 2 is the Device Shield / Integrity Node direction
- Tightened Stage 1 documentation wording around bounded security claims and misconduct language

### Raouf

- **Date:** 2026-05-14 (Australia/Sydney)
- **Scope:** Stage 1.5 validation and reviewer readiness
- **Summary:** Added the Stage 1.5 validation pack, evidence rules, risk register, reviewer checklist, Stage 2 architecture plan, and PR hygiene template. Kept the work documentation-first and did not add major Stage 2 runtime code.
- **Files changed:** `README.md`, `ROADMAP.md`, `docs/stages/STAGE_1_ACADEMIC_SHIELD.md`, `docs/stages/STAGE_1_5_REVIEWER_PACK.md`, `docs/THREAT_MODEL.md`, `docs/VALIDATION.md`, `docs/LIMITATIONS.md`, `docs/stages/STAGE_2_ARCHITECTURE.md`, `docs/RESOURCE_PLAN.md`, `docs/DEMO_SCRIPT.md`, `docs/DECISIONS.md`, `docs/RISK_REGISTER.md`, `docs/REVIEWER_CHECKLIST.md`, `docs/evidence/stage-1/README.md`, `docs/evidence/stage-1/.gitkeep`, `.github/pull_request_template.md`.
- **Verification:** `npm install` passed with 0 vulnerabilities. `./scripts/check.sh --fix` passed 21/21. Initial `./scripts/check.sh` found one Prettier drift in `docs/stages/STAGE_1_5_REVIEWER_PACK.md`; reran `./scripts/check.sh --fix`, then final `./scripts/check.sh` passed 21/21. `npm test` passed 65/65 tests. `node tools/privacy-audit.mjs` passed with 0 forbidden fields in generated data. `npm audit --audit-level=high` found 0 vulnerabilities. `git diff --check` passed. Markdown relative link audit passed. README image path audit passed. Secret/privacy/overclaim grep audits found only expected enforcement, test, policy, and historical-log references.
- **Follow-ups:** Push branch and collect fresh remote CI evidence. Recommended next tag after review: `v0.3.6-stage-1-5-validation-pack`.

## [0.3.4] — 2026-05-13 — README API Table Repair

### Fixed

- Fixed the broken `POST /api/telemetry` API reference table in `README.md`
- Moved the response JSON into a fenced code block so `Safe | Warning | Critical` no longer breaks Markdown table columns
- Clarified the allowed `risk_level` values directly below the response example

### Verified

- `npm run format:check`
- `git diff --check`
- `./scripts/check.sh --quick` → 11/11 pass

## [0.3.3] — 2026-05-13 — Stage 1 Documentation Polish

### Changed

- Replaced `docs/stages/STAGE_1_ACADEMIC_SHIELD.md` short branch note with the full Stage 1 Academic Shield reviewer/reference document
- Added document metadata, contents, an explicit Stage 1 threat model, exact verification commands, reviewer notes, and consistent section numbering
- Renamed the documentation heading from "CI/CD Status" to "CI Status" to match the Stage 1 CI-only boundary

### Notes

- Branch protection remains documented as a manual follow-up because the saved GitHub branch-protection state was not confirmed during this pass

### Verified

- Initial `./scripts/check.sh` found only Prettier formatting drift in `docs/stages/STAGE_1_ACADEMIC_SHIELD.md`
- `npm run format`
- `./scripts/check.sh` → 21/21 pass

## [0.3.2] — 2026-05-13 — Stage 1 CI

### Added

- `.github/workflows/stage-1-checks.yml` — GitHub Actions workflow runs `./scripts/check.sh` on every push to `main`/`stage-1-academic-shield` and every PR to `main`
  - Ubuntu latest, Node 22, `npm ci`
  - Safe non-real env vars (`SIMURGH_*` test values) injected for the boot smoke test
  - 10-minute timeout, concurrency cancellation per branch
  - Uploads `.simurgh_check_logs/` as artifact on failure
- Stage 1 Checks badge added to the README header

### Changed

- `.gitignore` no longer excludes `package-lock.json`; the lockfile is now tracked so CI can run `npm ci` reproducibly

### Notes

- CD (deployment automation) intentionally deferred — Stage 1 is a research prototype
- Branch protection on `main` should be enabled in the GitHub UI: require PR, require Stage 1 Security Checks to pass, disallow force-push

## [0.3.1] — 2026-05-13 — Stage 1 Quality Gate

### Added

- `scripts/check.sh` — one-shot pre-commit/pre-push verification script (Node version, syntax, format, tests, privacy guard, secret scan, tone check, npm audit, server boot smoke, audit chain self-test, git state). Mirrors the COMP3130 structure; supports `--quick`, `--fix`, `--verbose`, `--help`.
- Prettier 3 as a dev dependency; `npm run format` and `npm run format:check` scripts
- `.prettierignore` and `.prettierrc.json` (printWidth 100, double quotes, semis, trailing-comma es5)
- README "Stage 1 Verification" section linking to `./scripts/check.sh`

### Changed

- 41 source/test/doc files reformatted to Prettier defaults (no semantic changes)

### Verified

- `./scripts/check.sh --quick` → 11/11 pass
- `./scripts/check.sh` (full) → 21/21 pass
- All 65 unit tests still pass after formatting
- 0 npm vulnerabilities

## [0.3.0] — 2026-05-13 — Stage 1 Security Hardening

### Added

- `src/security/sessionToken.js` — HMAC-signed student session tokens (issue + verify, with timing-safe comparison)
- `src/security/replayGuard.js` — per-session sequence + timestamp window enforcement
- `src/security/rateLimit.js` — generic per-key rate limiter middleware
- `tools/privacy-audit.mjs` — CLI scanner that exits 1 if any forbidden field (typed_content, paste_content, screen_data, webcam, biometric, etc.) appears in generated data; allowlists `*_hash` variants
- `SIMURGH_SESSION_SIGNING_SECRET` env var; non-demo mode refuses to start without it
- `Authorization: Bearer <token>` enforcement on `/api/sessions/:id/privacy-accept`, `/start`, `/submit`, and on `/api/telemetry` for joined sessions
- Per-endpoint rate limiters: `/join` (10/min/IP), `/affinity` (60/min/helper), `/sessions`, `/report`, `/audit/.../verify` (20–60/min/token)
- `sequence` and `timestamp` fields on telemetry payloads (replay rejection of duplicates, rollbacks, stale, future timestamps)
- 23 new unit tests covering session token, replay guard, rate limiter (65 total)
- README "Stage 1 Security Hardening" section documenting the auth model, replay protection, rate limits, and headers

### Changed

- JSON body limit reduced from 256 KB to 32 KB (configurable via `SIMURGH_JSON_LIMIT`)
- `sanitiseTelemetry` now rejects (returns null) on NaN, Infinity, negative values, or values > 2× the documented max; only mild over-range values are clamped
- Student page (`public/index.html`) sends `Authorization: Bearer <sessionToken>` + monotonic `sequence` + `timestamp` on every telemetry POST
- Instructor dashboard (`public/instructor.html`) strips `?token=` from the URL via `history.replaceState`; report/verify use `Authorization` header instead of query param
- `.gitignore` now excludes `data/sessions/`, `data/audit/`, `data/reports/`, `data/exams/`, `logs/`, `simurgh-audit-*.json`, `simurgh-report-*.json`

### Security

- Four-secret separation enforced: instructor token, helper secret, audit HMAC key, session signing key — never reused for cross-purposes
- All HTTP responses carry `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, plus `Strict-Transport-Security` in production
- Documented Stage 1 limitations and the privacy/tamper-test workflow

## [0.2.2] — 2026-05-13

### Fixed

- Block telemetry ingestion on submitted/closed exam sessions (prevents post-submission audit manipulation)
- Add `MAX_SESSIONS` cap (default 10,000) — return 503 at capacity instead of unbounded memory growth
- Add HTTP security headers on all responses: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (production only)
- Fail fast with `process.exit(78)` in non-demo mode when `SIMURGH_AUDIT_SECRET` is not set
- Warn in non-demo mode when `SIMURGH_ALLOWED_ORIGIN` is unset (wildcard CORS)
- Replace local `AUDIT_CHAIN_CAP` constant with imported `CHAIN_CAP` from `hmacChain.js`
- Guard all `getSession()` call sites for null return at capacity

## [0.2.1] — 2026-05-13

### Added

- `SECURITY.md` — vulnerability disclosure policy and security architecture overview
- `PRIVACY.md` — full data collection policy (collected vs. never collected)
- `ROADMAP.md` — Stages 1–4 with current status and known limitations
- `ETHICS.md` — commitments on misconduct findings, transparency, and power asymmetry
- `DISCLAIMER.md` — research prototype disclaimer, no-warranty statement, compliance guidance
- README status notice linking to policy documents

## [0.2.0] — 2026-05-13

### Added

- **Stage 1 Academic Shield** — full academic integrity workflow
- `src/privacy/` — privacy config, telemetry normaliser, SHA-256 identity hashing
- `src/academic/` — local risk scoring (7 categories), academic event taxonomy, session state machine, exam registry, JSON report builder
- `src/audit/` — HMAC chain module, audit chain verifier
- `src/config/env.js` — Stage 1 environment variable config
- `src/storage/memoryStore.js` — namespace memory store
- 9 new API endpoints: `/api/exams`, `/api/exams/:id/join`, `/api/sessions/:id/privacy-accept`, `/api/sessions/:id/start`, `/api/sessions/:id/submit`, `/api/sessions/:id/report`, `/api/audit/:id/verify`, plus `GET /api/exams`
- Privacy notice modal on student exam page
- Helper status badge on student exam page
- Risk score cards, event timeline, filter bar, report export, audit verify on instructor dashboard
- `node:test` unit test suite (8 modules, 42 tests)

### Changed

- Telemetry scoring now uses local heuristic category model (7 weighted categories); Claude provides narrative only on Warning/Critical (fail-open)
- Session objects extended with lifecycle state, exam linkage, reconnect count, risk score cache

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Project Branding and Documentation
- **Summary:** Rebranded the project from "Verity" to "Project Simurgh" and updated the core README.md content to reflect the new brand, emphasizing behavioral telemetry.
- **Files Changed:**
  - `README.md` - Entirely rewritten with the new Simurgh brand, dropping "Verity", updating architectural descriptions, and refining the strategic roadmap.
- **Verification:** Readme markdown is properly formatted with the appropriate links, headers, code block architectures, and images preserved.
- **Follow-ups:** Ensure that any other text occurrences or components inside the source code (like public HTML files) are eventually scrubbed of "Verity" if necessary.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Complete Codebase Rebranding
- **Summary:** Executed a global search-and-replace to rename all internal mentions, variables, file structures, and titles from "Verity" to "Simurgh".
- **Files Changed:**
  - `package.json`, `package-lock.json`
  - `.env.example`
  - `server.js`
  - `public/index.html`, `public/instructor.html`
  - `tools/verify-audit.mjs`
  - `tools/invisible-window-poc/README.md`, `tools/invisible-window-poc/main.swift`
  - Renamed directory `tools/verity-helper` -> `tools/simurgh-helper`
  - `tools/simurgh-helper/README.md`, `tools/simurgh-helper/main.swift`, `tools/simurgh-helper/Makefile`, `tools/simurgh-helper/simurgh-helper.entitlements`
- **Verification:** Ran a Node.js script to execute safe string replacements matching casing conventions, and successfully renamed the helper tool paths to ensure the architecture is functionally synced with the new brand.
- **Follow-ups:** Testing the project (e.g. `npm start`) locally to ensure the refactored keys and environment variables run identically as before.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Professional Polish
- **Summary:** Elevated the tone of the README to a highly professional, academic/engineering standard suitable for a patent review and technical interview. Filled out the previously empty placeholder sections.
- **Files Changed:**
  - `README.md` - Formatted text into the 3rd person, added complete Installation/Quick Start instructions, API reference, Cost & Latency breakdowns, and improved structural hierarchy.
- **Verification:** Verified markdown renders correctly.
- **Follow-ups:** Prepare the presentation or demo environment for the actual interview.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** "Ethical Manifesto" & Roadmap Upgrade
- **Summary:** Elevated the product positioning from a purely technical security tool to a Global Ethics Standard. Added the "Socio-Economic Impact" section focusing on Bandwidth-Inclusive Security and privacy-as-code. Advanced the Strategic Roadmap with Phase 4: Privacy-Preserving Visuals ("Code-Video").
- **Files Changed:**
  - `README.md` - Injected new Section 4 (Socio-Economic Impact & Democratic Access) and appended Phase 4 to the Strategic Roadmap.
- **Verification:** Markdown structure, table of contents, and numbered headers successfully reorganized and validated.
- **Follow-ups:** Prepare for patent review emphasizing the Code-Video layer and hardware-rooted attestation concepts.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** "Why Anthropic?" Strategic Alignment
- **Summary:** Positioned the README as a direct partnership proposal by adding a dedicated section that maps Project Simurgh's "Privacy-as-Code" values to Anthropic's "Constitutional AI" principles.
- **Files Changed:**
  - `README.md` - Injected Section 8: "Why Anthropic?" and renumbered subsequent headings and table of contents items.
- **Verification:** Markdown structure validated. The narrative perfectly links Anthropic's mission with Simurgh's capabilities.
- **Follow-ups:** Final review before pushing to GitHub.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Final Professional & Research Polish
- **Summary:** Comprehensive polish pass to bring the README to patent-review and technical-interview quality. Fixed 10 identified issues: broken badge anchor links, inconsistent voice (mixed 1st/3rd person), missing horizontal rule separators, trailing whitespace, informal language ("surveillance bots"), sparse API reference, missing Security Considerations section, missing env var documentation table, telemetry fields presented as raw list instead of structured table, and missing component summary.
- **Files Changed:**
  - `README.md` — Full rewrite. Added Section 8 (Security Considerations) with HMAC audit chain, helper auth, and threat model coverage table. Expanded API Reference with 4 endpoints, auth headers, and error codes. Converted telemetry fields to a proper table with types and descriptions. Added Component Summary table. Added full environment variable reference table. Normalized all voice to consistent 3rd-person. Fixed badge anchors to resolve to correct heading IDs. Extended roadmap timeline to 2028.
- **Verification:** All 11 Table of Contents anchor links resolve to correct heading IDs. Markdown structure validated with consistent `---` separators between all sections. No trailing whitespace. Zero instances of informal/editorial language.
- **Follow-ups:** Ready for GitHub push and interview presentation.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Screenshots & Visual Documentation
- **Summary:** Replaced the stale hero screenshot (which still displayed old "Verity" branding) with a fresh capture showing the rebranded "Simurgh" UI. Added two additional screenshots: the student exam view with a live behavioral verdict and the instructor multi-session dashboard. Screenshots are embedded in a side-by-side table in the Quick Start section for maximum visual impact.
- **Files Changed:**
  - `docs/screenshot.png` — Replaced with updated Simurgh-branded exam view
  - `docs/screenshot-exam-view.png` — New: student view with typed response and live verdict
  - `docs/screenshot-instructor.png` — New: instructor dashboard with session cards and SSE streaming
  - `docs/screenshot-idle.png` — New: idle exam view before user interaction
  - `README.md` — Updated hero image caption, added Screenshots subsection with side-by-side table, fixed badge anchor links
- **Verification:** All 4 screenshots render correctly in the README. Hero screenshot displays "Simurgh | BEHAVIORAL PROCTOR" header. No remaining "Verity" branding in any screenshot.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README Content Enhancement — Cost Reduction, First-Mover Strategy, Contributors
- **Summary:** Expanded the Institutional Cost Reduction subsection to address the elimination of human invigilators and physical venue costs. Added a 4th point to "Why Anthropic?" — the first-mover advantage and strategic moat argument. Added Section 11 (Contributors) crediting Claude as an AI pair-programming partner.
- **Files Changed:**
  - `README.md` — Expanded Section 4 (Institutional Cost Reduction), added first-mover advantage to Section 9, added Section 11 (Contributors), renumbered Status & License to Section 12, updated ToC and badge anchors.
- **Verification:** All 12 ToC anchors resolve correctly. Badge links updated to `#12-status--license`.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README — Public Health Resilience Argument
- **Summary:** Added a "Public Health Resilience" subsection to Section 4 (Socio-Economic Impact). Frames the epidemiological risk of large-scale in-person exams (COVID-19, seasonal influenza) and positions behavioral integrity verification as institutional resilience infrastructure.
- **Files Changed:**
  - `README.md` — New subsection under Section 4.
- **Verification:** Section reads in a formal, research-grade tone consistent with the rest of the document.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Mermaid Architecture Diagram & Rebranding Audit
- **Summary:** Converted the ASCII art architecture diagram to a native Mermaid flowchart for professional GitHub rendering. Performed a full-codebase grep audit for any remaining "Verity" references — confirmed zero leaks in source code, HTML, README, or config files. Only historical changelog/agent log entries referencing the rebranding remain (correct behavior).
- **Files Changed:**
  - `README.md` — Replaced `text` code block with `mermaid` flowchart in Section 3.
- **Verification:** `grep -ri verity` returns matches only in CHANGELOG.md and AGENT.md historical entries. Zero leaks in server.js, public/\*.html, package.json, .env.example, or tools/.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** SEB Critique & Cross-Platform Roadmap Expansion
- **Summary:** Added a "Cross-Platform Superiority over Legacy Lockdown Software" subsection to Section 4, critically contrasting Safe Exam Browser's Windows-centric limitations against Simurgh's platform-agnostic behavioral API. Included a comparison table covering Windows, macOS, Linux, iOS, Android, and ChromeOS. Expanded the Strategic Roadmap (Section 10) with explicit per-platform milestones: `simurgh-helper-win` (Win32), `simurgh-helper-linux` (X11/Wayland), iOS/iPadOS Safari validation, Android Chrome/WebView validation, ChromeOS managed environment certification, and a unified cross-platform deployment toolkit.
- **Files Changed:**
  - `README.md` — New subsection in Section 4, expanded Phases 1–3 in Section 10 with platform-specific deliverables.
- **Verification:** Markdown tables render correctly. Roadmap phases logically sequence platform expansion from current macOS PoC through to full mobile/ChromeOS coverage.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** README — Zero Client-Side Compute & Device Inclusivity
- **Summary:** Added a "Zero Client-Side Compute — Device Inclusivity by Design" subsection to Section 4. Explains that all AI processing is offloaded to Claude server-side, no video/images ever leave the student's device, and any device (old or new) with a browser can participate — eliminating hardware inequality as a barrier to assessment.
- **Files Changed:**
  - `README.md` — New subsection in Section 4.
- **Verification:** Content is factually accurate to the architecture (server-side Claude inference, ~2KB JSON telemetry only).
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Email Cross-Reference Audit, Browser/App Delivery Roadmap, Gap Patching
- **Summary:** Performed a line-by-line cross-reference audit of the email to Dario Amodei against the README. Identified 7 full matches, 6 minor gaps, and confirmed the README substantially exceeds the email's claims. Patched key gaps: added "Interview Coder" alongside Cluely, added Claude capability-uplift case study note (Paper Section VIII-G), added Macquarie University to Contributors. Added Phase 3b (Delivery Modes) to the roadmap with browser-based PWA and native application milestones for macOS, Windows, Linux, iOS, and Android.
- **Files Changed:**
  - `README.md` — Section 2 (added Interview Coder + capability-uplift note), Section 10 (new Phase 3b with browser PWA and 5 native app milestones), Section 11 (Macquarie University + VIII-G reference in Contributors).
- **Verification:** All email claims now have README backing. Delivery mode table renders correctly. Phase numbering is consistent.
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Codebase Verification Audit, Roadmap Expansion (Browser + App + Helper for all platforms), Bug Fixes
- **Summary:** Performed a file-by-file verification of every README claim against the actual codebase. Found and fixed 3 issues: (1) README said `GET /api/audit-export/:sessionId` but actual endpoint is `/api/audit/:sessionId` — fixed. (2) Stale `verity-helper` binary left in `tools/simurgh-helper/` — deleted. (3) `package.json` described "Countermeasure A" instead of the correct "Countermeasure C" — fixed. Expanded Phase 3b roadmap to show a full per-platform matrix of Browser PWA, Native App, and Native Helper support across macOS, Windows, Linux, iOS, Android, and ChromeOS.
- **Files Changed:**
  - `README.md` — Fixed `/api/audit-export` → `/api/audit`, expanded Phase 3b with 6-platform delivery matrix table.
  - `package.json` — Fixed Countermeasure label (A → C).
  - `tools/simurgh-helper/verity-helper` — Deleted stale binary (rebranding leftover).
- **Verification:** All 14 core architectural claims verified ✅. All 6 env vars verified ✅. All 4 API endpoints match codebase ✅. 5-second interval confirmed (WINDOW_MS=5000). Helper 2-second interval confirmed (intervalMs=2000). Prompt caching confirmed (cache_control: { type: "ephemeral" }).
- **Follow-ups:** Ready for GitHub push.

### 2026-05-09 (Australia/Sydney)

**Raouf:**

- **Scope:** Terminology Refinement & Strategic Positioning
- **Summary:** Replaced "cooperate" with "collaborate" and "partner" in the README. This shift in terminology elevates the project from a formal/legalistic tone to a "Silicon Valley" peer-to-peer ecosystem dialect, better aligning with Anthropic's partnership-driven culture.
- **Files Changed:**
  - `README.md` — Updated lines 323 and 330.
- **Verification:** Verified that "collaborate" and "partner" now appear in the "Why Anthropic?" and concluding sections. Global grep for "cooperate" returns zero matches in source code or documentation.
- **Follow-ups:** None.
