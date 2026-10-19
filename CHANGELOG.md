## Change Log

## [Unreleased] — 2026-10-15 — OpenAI reviewer workflow

- Added an isolated synthetic tool-authorization experiment, explicit live Responses API
  opt-in, signed offline reports, complete case replay, and adversarial regression tests.
- Added a focused reviewer README, claim/security audits, official-source notes, grant
  proposal and owner checklist. Preserved the previous README and device roadmap verbatim.
- Updated package positioning while retaining the historical application version. Refreshed
  compatible runtime dependencies to remediate the advisories found during this review.
- Kept historical signed evidence and frozen specifications unchanged. The archive's
  documentation-gate exception is bound to the original README hash.
- No live OpenAI run, external submission, publication or new release is claimed. The
  [readiness report](docs/openai/READINESS_REPORT.md) records measured checks and open limits.
- Follow-up review corrected privacy/HMAC assurance claims, dated device-track navigation,
  contribution guidance and the AISec paper's unverified submission status. Added a file-by-file
  inventory, a presentation audit and current official API/research references.
- Fixed client-controlled forwarded headers bypassing IP rate limits; Express's configured
  proxy policy now determines client identity, with direct and trusted-proxy HTTP regressions.
- Added an optional pinned Inspect AI task and exercised mock-provider smoke, with explicit
  separation from live model research. CI now verifies the saved reviewer artifact as well
  as a freshly generated report. Further legacy security findings remain disclosed.
- Re-derived only the live `current` workflow census under its pre-existing maintenance
  contract after adding the saved-artifact CI step; the immutable baseline and gate logic
  remain unchanged. The additional classification limitation is recorded, not suppressed.

## [docs-pace-the-frontier] — 2026-09-14 — Brief and README reference the embedded-evaluator proposal

**Raouf:**

- **Scope:** Documentation only. No verifier semantics, evidence values, codes, scores, tests, tags
  or runtime code changed. No version bump.
- **Summary:** `ANTHROPIC_BRIEF.md` and `README.md` now name Dario Amodei's 12 September 2026
  proposal for embedded independent evaluators (employee-like access, the right to publish findings
  "without editorial control by Anthropic") as a fourth prose-stated obligation alongside RSP v3.4,
  the June 2026 Advanced AI Framework and EU AI Act Art. 73. Framed as the same ordering/evidence
  requirement the brief already addresses — access is only as good as the evidence an evaluator can
  recompute without the producer's telemetry — not as a claim that Simurgh implements, satisfies, or
  was designed for the proposal. Brief header corrected from "One-page technical brief" to
  "Technical brief". HTML mirror updated. Two wordings were tightened against the primary source
  before writing: the essay says "employee-**like** access" (not "employee-level", which appears only
  in the announcing X post), and "access without evidence is not independence" is this project's own
  formulation rather than the essay's, so the README bullet quotes the verified right-to-publish
  clause instead of putting an unsourced phrase in quotation position.
- **Files changed:** `docs/research/llm-shield/ANTHROPIC_BRIEF.md`,
  `docs/research/llm-shield/anthropic-brief.html`, `README.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** `npm run format:check` clean; `git diff --stat` limited to the five files above;
  markdown and HTML briefs diffed for parity; no numeric value in the brief changed. Essay date and
  quoted clause verified against `darioamodei.com/post/we-must-pace-the-frontier`.
- **Follow-ups:** None. Outreach referencing the brief scheduled 14 Sep 08:30 Pacific.

## [gate-lifecycle] — 2026-07-28 — Gate lifecycle invariant published to tracked documentation

**Raouf:**

- **Scope:** Documentation only. Adds `docs/research/llm-shield/references/gate-lifecycle.md`,
  linked from `AGENT.md`. No verifier semantics, evidence values, codes, scores or runtime code
  changed.
- **Summary:** Publishes the rule extracted from the Q1-F001 Lean-gate repair — **every
  stage-installed gate declares its successor-stage behaviour before the stage freezes**, via six
  required fields (`active_phase`, `protected_surface`, `next_phase_behaviour`,
  `maintenance_behaviour`, `sunset_or_migration_condition`, `anti_vacuity_condition`). Three of that
  repair's five findings were the same species, a gate outliving its phase: a stale census headcount
  that left a prior stage's reproduce red on `main` unnoticed (`Q1-F002`); a one-sided transition
  tripwire that would have passed in silence on the very repair it was written to catch (`Q1-F004`);
  and a CI job that ran on every pull request to `main` and refused each one (`Q1-F005`). Records
  four measured failure modes — pin sets never counts, assertions exact in both directions, scope CI
  triggers to the stage's own paths, and **an empty evaluated range is not a passing result** — plus
  authority-precedes-action, checked by commit ancestry, with Stage 5Q's Annex A5 as the worked
  example.
- **Files changed:** `docs/research/llm-shield/references/gate-lifecycle.md` (new), `AGENT.md`,
  `CHANGELOG.md`.
- **Verification:** `npm run format:check` clean; documentation-only commit alters no gate, test or
  evidence behaviour.
- **Follow-ups:** Stage 5S (VWQ, pays socket I8) attaches the six declarations to every gate it
  installs. Landed before the 5S spec deliberately, so the rule is pre-existing authority rather
  than one invented inside the first stage it judges.

## [stage-5i-vpc] — 2026-07-11 — VPC: Verifiable Panel Coverage (`v2.44.0-stage-5i-vpc`)

**Raouf:**

- **Scope:** New stage (branch `stage-5i-vpc`). Additive raw codes **316–331**; new `tools/simurgh-attestation/stage5i/` verifier + tests + evidence + Lean. Additive only — no prior verifier semantics, evidence values, or codes changed.
- **Summary:** Turns RSP v3.4's split-external-review condition ("all parts of the unredacted report are evaluated by at least one external reviewer") into an offline-recomputable relation: grant-bounded coverage **equality** `⋃C(r)=S` with computed reviewer+host independence, a no-silent-filter census, and externally-anchored non-affiliation. Laws: No Section Left Unreviewed (327), No Phantom Review (323), No Self-Vouched Reviewer (325/326). Headline: the **Adequacy Gate** (328) — a coverage verifier structurally unable to certify review adequacy (fails closed even at full coverage). Two zero-code projections (Coverage Depth Census, Typed Coverage State); two roots break the challenge↔root cycle; pure `vpcCore` over adapter `facts`. Three lanes (A byte-stable, B multi-process ceremony, C real Opus 4.6 structure — **real independent-party ceremony EXECUTED**, droplet team's own keys distinct from ours, our verifier accepts raw 0, campaign `completed`, gate now verifies the pack); JS↔Python↔browser byte-identical parity; 9 Lean theorems (zero sorry).
- **Files changed:** `tools/simurgh-attestation/stage4h/exitCodes.mjs`, `tools/simurgh-attestation/stage5i/**`, `tests/{unit,e2e}/llmShield/stage5i/**`, `tests/fixtures/llmShield/stage5i/test-keys/**`, `proofs/stage5i/**`, both `exit-map.json` goldens + `exitWrapper.test.js`, `scripts/reproduce-llm-shield-stage5i.sh`, `scripts/security-audit-llm-shield-stage3{m,o}.sh`, `.prettierignore`, `docs/research/llm-shield/{evidence/stage-5i,STAGE_5I_CLOSEOUT.md}`, `README.md`, `AGENT.md`, `CHANGELOG.md`, spec + plan.
- **Verification:** 35 stage5i tests + K7 net green; `reproduce-llm-shield-stage5i.sh` ALL PASS (Node 26); prior 5H reproduce still PASS; full repo suite green except the pre-existing Stage-2 `securityHardening` baseline; `lean PanelCoverage.lean` zero sorry; byte-identical cross-language digests.
- **Follow-ups:** VRC → VUC (External Accountability arc); VTC penciled. Nearest lever: real Lane-C ceremony with the droplet team.

## [reproduce-fail-open-sweep] — 2026-07-10 — Fail-closed repair across stage 4Y–5D reproduce runners

**Raouf:**

- **Scope:** Correctness repair to six per-stage `scripts/reproduce-*.sh` runners. No verifier semantics, evidence values, model scores, capture claims, attestation codes, or production runtime code changed.
- **Summary:** Generalized the Stage 5E clean-room finding. A gate written `cmd >/dev/null && echo "… OK"` under `set -euo pipefail` fails **open**: `set -e` does not abort when the failure is the non-final element of an `&&` list, so a failed unit/K7/parity/Lean gate skips its "OK" line yet the script still reaches `ALL PASS` and exits 0. The same pattern was present in `reproduce-llm-shield-stage{4y,4z,5a,5b,5c,5d}.sh`; each affected gate is now a standalone command followed by its echo. The 5C Lean gate also chained `lean … && ! grep sorry && echo` (fail-open on a Lean error and on a found `sorry`) — replaced with an explicit `if grep … then exit 1` guard. Byte-stability `git diff --quiet … || { … exit 1; }` lines were unchanged (already fail closed).
- **Files changed:** `scripts/reproduce-llm-shield-stage4y.sh`, `scripts/reproduce-llm-shield-stage4z.sh`, `scripts/reproduce-llm-shield-stage5a.sh`, `scripts/reproduce-llm-shield-stage5b.sh`, `scripts/reproduce-llm-shield-stage5c.sh`, `scripts/reproduce-llm-shield-stage5d.sh`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Minimal repro confirms the pattern fails open under `set -e`. Post-fix: no `&& echo …OK/PASS` fail-open remains; `bash -n` passes on all six; all six run `PASS`/`ALL PASS` under Node 26 (v26.5.0); an injected exit-73 unit shim on 5D now yields exit 73 with no `unit OK`/`ALL PASS`. CI gates each stage with `node --test` directly, so no stage shipped a genuinely failing gate — this removes a false-`ALL PASS` exposure for third parties running the reproduce scripts.
- **Follow-ups:** Consider a CI lint rejecting `&& echo` around gate lines; the Stage 5E `conformancePack.test.js` fail-closed regression is the template.

## [stage-5e-droplet-evidence-log] — 2026-07-10 — Annotate completed external-run evidence

**Raouf:**

- **Scope:** Documentation-only follow-up to the Stage 5E conformance-pack repair and completed Linux x86_64 droplet run. No verifier, runner, pack content, evidence value, model score, capture claim, or production service changed.
- **Summary:** Prepended the sanitized droplet log with the two original clean-room findings, the applied repairs, and explicit scope/credential boundaries while preserving the raw droplet output below a separator. The note records the omitted `stage4h/exitCodes.mjs`, the masked `&& echo` shell failures, the fail-closed runner repair, explicit-manifest builder, regression coverage, `74/74` Stage 5E tests, and remote/local ZIP hash match.
- **Files changed:** `/Users/raoof.r12/Desktop/Raouf/test/simurgh-vda-conformance-fixed-droplet.log`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Required repair-summary and raw-output markers are present; the original `raw 0`, byte-stability, `unit OK`, Python parity, `K7 OK`, Lean-skip, and `ALL PASS` evidence remains present; the log contains no configured droplet password, address, or username; Prettier and `git diff --check` pass for the project logs.
- **Follow-ups:** Preserve this annotated log with the fixed ZIP for third-party handoff. The pre-existing non-demo missing-`ANTHROPIC_API_KEY` repository test failure remains separate from Stage 5E.

## [stage-5e-conformance-pack-fail-closed] — 2026-07-10 — Self-contained export repair

**Raouf:**

- **Scope:** Repair the self-contained Stage 5E VDA conformance ZIP after an independent clean-room run found one omitted shared dependency and a false-positive shell exit. No verifier semantics, evidence values, model scores, capture claims, or production runtime code changed.
- **Summary:** Added a repository-native explicit-manifest pack builder that includes `tools/simurgh-attestation/stage4h/exitCodes.mjs`; changed the Stage 5E reproduce runner so unit, K7, and installed-Lean failures terminate before `ALL PASS`; added behavioral regressions for fail-closed propagation and exported dependency completeness; added tracked pack README, droplet setup, and top-level runner assets; built `simurgh-vda-conformance-fixed.zip` for external droplet execution.
- **Files changed:** `scripts/reproduce-llm-shield-stage5e.sh`, `scripts/build-llm-shield-stage5e-conformance-pack.sh`, `tests/unit/llmShield/stage5e/conformancePack.test.js`, `tools/simurgh-attestation/stage5e/conformance-pack/{README.md,DROPLET_SETUP.md,run.sh}`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** TDD red/green confirmed the original runner swallowed injected unit exit `73` and the original export had no builder; regressions pass `2/2`; Stage 5E unit suite passes `74/74`; Stage 5E reproduce passes all six gates; a brand-new extraction of the rebuilt ZIP passes with `unit OK`, `K7 OK`, Lean zero-sorry, `ALL PASS`, and exit `0`; ZIP integrity, `bash -n`, Prettier-supported files, and `git diff --check` pass. Full `npm test` is `2411/2412`: the unrelated `securityHardening.test.js` missing-API-key assertion fails identically on an untouched `git archive HEAD` baseline because the tagged server starts instead of exiting `78`.
- **Follow-ups:** Run the fixed ZIP on a fresh droplet once `DROPLET_SSH` access is supplied; preserve the resulting full log and host metadata. Address the pre-existing non-demo missing-`ANTHROPIC_API_KEY` fail-closed regression separately.

## [v2.24.0-stage-4o-vtsa] — 2026-07-04 — Stage 4O VTSA + Monotone Consent Law (shipped)

**Raouf:** Shipped Stage 4O — Verifiable Tool-Surface Attestation over the Monotone Consent Law: a committed tool surface may narrow silently, but may broaden only under delta-bound consent, and drift can never launder across manifest epochs. Added the fourth additive Capability Kernel entry point `authorise_with_manifest` (the frozen three byte-unchanged) with a six-field `ManifestBindings` sidecar; Node cores + a byte-parity Python mirror for domain-separated digests, a manifest-order Merkle surface with inclusion proofs, exact-key manifest/commitment validation, the drift lattice + Monotone-Consent chain validation, the 12-check gate, timeline binding to 4N chain positions, and the constitutional alignment map. Raw codes 55–66 (documented first-failure order 55→56→57→64→65→58→59→60→61→62→63→66). Signed byte-reproducible evidence bundle with two Ed25519 keypairs (manifest vs attestation), an 18-arm decision corpus, selective-disclosure verifier, live digest-only Lane B capture of `@modelcontextprotocol/server-filesystem`, and `proofs/stage4o/MonotoneConsent.lean` (machine-checked, no `sorry`). Kernel↔verifier parity gate (Node and Python agree on every first raw code). F1 retro fixture withheld per its hard gate (public disclosure insufficient — recorded as a known limitation, not approximated). Four-axis shipped re-score ~8.9 (Novelty 9 / Frontier 9 / Anthropic 8 / Constitution 9.5). One command: `scripts/reproduce-llm-shield-stage4o.sh`.

### Added

- `tools/simurgh-attestation/stage4o/` (constants, cores, builders, verifier, capture), `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/manifest_surface.py`, `authorise_with_manifest` in `capability_kernel.py`.
- `tests/unit/llmShield/stage4o/`, `tests/e2e/llmShield/stage4o/vtsaFullNet.test.js`, Python parity + kernel tests, `tests/fixtures/llmShield/stage4o/`, `docs/research/llm-shield/evidence/stage-4o/`.
- `proofs/stage4o/MonotoneConsent.lean`, `scripts/reproduce-llm-shield-stage4o.sh`, four STAGE*4O*\* reviewer docs.

### Changed

- Registered raw codes 55–66 in the shared exit ledger; regenerated the affected 4H/4K/4N exit-map goldens in one mechanical commit.
- Wired the 4O reproduce into `scripts/check-e2e.sh` and the 4O proof into the Lean CI workflow.

### Verified

- `scripts/reproduce-llm-shield-stage4o.sh` (exit 0); full Node unit + e2e suites; adapter pytest incl. byte-parity; `lean proofs/stage4o/MonotoneConsent.lean` (no `sorry`); latest tag `v2.23.0` confirmed before pinning v2.24.0.

## [stage-4o-banger-package] — 2026-07-04 — Stage 4O boosters (C1 constitution map, F1 retro fixture) + 4O.1/4P roadmap

**Raouf:** Folded the Banger Package into the 4O spec: §11.1 signed machine-readable `constitutional_alignment` map (one claim-checked entry per raw code 55–66, honesty ceiling "infrastructure alignment is not model-value alignment... does not claim constitutional compliance") and §11.2 public-disclosure-derived retro-detection fixture (primary: May 2026 Claude Code MCP poisoning) with a hard inclusion gate — ships only if public before/after data suffices WITHOUT guessing, wording "retro fixture" never "exact reconstruction", claim "ledgers the corresponding manifest drift class" never "would have been stopped". Parked in §17 (roadmap, NOT 4O claims): 4O.1 Reflexive & Retro (reflexive harness-surface attestation, Claude Code/MCP proxy sample, zero-utility-tax eval pack, blind_reapproval contest path), 4P Herd Drift Evidence, 4P/4Q proof-carrying Lean verdicts. New non-claim pellets: `not_constitutional_compliance_claim`, `not_incident_prevention_claim`. Scorecard §18: post-booster spec-time targets ~9.3 (targets, not scores, until closeout re-score). Sections renumbered 11→19. Standing rule added this session: every SPEC+PLAN carries the four-axis scorecard.

### Changed

- `docs/superpowers/specs/2026-07-04-stage-4o-vtsa-design.md` — §11 boosters, §17 roadmap, §18 scorecard note, pellets, release boundary, cross-reference renumbering.

## [stage-4o-monotone-consent-law] — 2026-07-04 — Stage 4O spec amended with Monotone Consent Law

**Raouf:** Extended the committed 4O design with four inventions composing into one law — "a tool surface may narrow silently, but may broaden only under delta-bound consent, and drift can never launder across epochs": I1 drift algebra with path-independent verdicts (raw 64 `drift_laundering_detected`, Lean `NoDriftLaundering`), I2 delta-bound consent making blind re-approval a machine-distinguishable ledgered class (raw 65 `blind_reapproval`), I3 Merkle toolset root + per-call inclusion proofs enabling selective surface disclosure (standard crypto, novel application — labelled honestly), I4 time-anchored surfaces binding toolset roots to 4N chain positions, 4O→4N reference only (raw 66 `timeline_binding_mismatch`). Raw block now 55–66; Lean theorem `MonotoneConsent` (three legs); new non-claims incl. `not_proof_of_human_reading`. Prior-art searches run 2026-07-04: no prior art found for I1/I2/I4. Design only — no implementation, no tag.

### Changed

- `docs/superpowers/specs/2026-07-04-stage-4o-vtsa-design.md` — amended in place (spec was same-day and unimplemented; no migration needed).

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

### 2026-10-15 (Australia/Sydney) — Real-effects assurance lab and industry gap roadmap

**Raouf:**

- **Scope:** Owner-requested additive research improvement, implemented by Codex. First local
  milestone of the approved comparative experiment; no numbered release or production rollout.
- **Summary:** Added real child-process disposable file effects, precommitted exact-action policy,
  bypass and deny-all controls, read-back observation, trace/checkpoint/effect comparison and
  complete source-bound replay. The 17-case corpus runs under three controls: bypass has seven
  forbidden effects; exact policy has zero observed forbidden effects and three benign completions;
  deny-all loses all benign utility. Checkpoint and full observation both expose four trace
  mutations. Two fault cases per control remain unknown; no-op mutations are excluded. Mapped
  16 primary sources to industry needs, prior art, acceptance tests and remaining gaps.
- **Files changed:** `tools/assurance-lab/{core,sink,sink-worker,corpus,study,cli}.mjs`;
  `tests/unit/assuranceLab/{core,study,cli}.test.js`; `docs/assurance/` documentation, provenance and
  report; `docs/superpowers/{specs,plans}/2026-10-15-assurance-lab.md`; `package.json`;
  `.github/workflows/openai-readiness.yml`; `README.md`, `ROADMAP.md`, `docs/REVIEWER_INDEX.md`;
  both change logs; the pre-existing mutable `current` census in
  `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` (25 to 26, added CI step
  remains explicitly unclassifiable). Frozen baseline, historical evidence and original OpenAI
  experiment sources/artifact remain unchanged.
- **Verification:** Final `npm test`: 5,119 tests, 5,116 passed, zero failed, three skipped
  (Chrome/Lean unavailable); 18 new lab tests included. Saved lab and original OpenAI report
  verification passed. Three isolated mutations caused assertion failures. Fresh review found
  non-enumerable/accessor/sparse-data validation bugs; three regressions were RED then GREEN
  after stable data capture and strict descriptors. All 51 case outcomes stayed unchanged.
  Corrected late-grant wording to after policy commitment, before execution. Workflow census is
  set-identical, archive hashes unchanged. See `docs/assurance/VALIDATION.md` for scope and limits.
- **Follow-ups:** Two actual SDK adapters, held-out attacks, external reproduction, durable atomic
  replay, authenticated identity/revocation and measured overhead remain open. No paid model call,
  submission, deployment, external operator independence or checkpoint superiority is claimed.

## 2026-10-15 — Raouf: pinned SDK assurance integration (Australia/Sydney)

- **Scope:** Continue the authorized next phase with actual OpenAI Agents SDK and LangGraph
  approval/resume lifecycles against the unchanged real-effects lab; no live model or deployment.
- **Summary:** Added a persistent bounded Node/Python bridge, scripted OpenAI Model with native
  serialized RunState restoration, and LangGraph interrupt/checkpoint/resume adapter. Committed
  authority and consumed grants persist across callbacks. All 102 case/control/runtime projections
  match the original lab: per runtime, bypass has seven forbidden effects, exact policy has zero
  observed forbidden effects and three benign completions, and deny-all loses all benign utility.
  Two faults per control remain unknown. There are 156 main-matrix pauses (12 unavailable
  observations), three exercised native reject/edit probes and one explicitly unsupported OpenAI
  in-place edit. Checkpoint/full-effect results remain equal; no incremental advantage is claimed.
- **Files changed:** `tools/assurance-sdk/` bridge, adapters, study, tests and 60-package hash lock;
  `tests/unit/assuranceSdk/bridge.test.js`; `docs/assurance/sdk/` results, source notes, validation
  and evidence; dated SDK spec/plan; scoped workflow and package script; README, roadmap,
  reviewer index and assurance gap/status docs; both change logs. Original lab/OpenAI modules,
  saved reports, frozen census baseline and historical archives remain unchanged.
- **Verification:** Full npm suite: 5,122 tests, 5,119 passed, zero failed, three skipped
  (Chrome/Lean unavailable). All 31 Python integration tests passed; fresh reviewer independently
  reran them and the three Node bridge tests. Clean hash-locked pip installation and complete
  saved-report replay passed; all 60 dependencies consistent. Original reports verify. CLI
  overwrite/tamper negative checks pass. Ruff and changed-file formatting checks pass. A pipe
  backpressure regression failed before nonblocking writes/shared deadline, then passed. Final
  review found no Critical/Important issue. Current census problem set remains 26. Reusable SDK
  install/start instructions saved to cloud configuration draft; publication remains separate.
- **Follow-ups:** Deferred minor: LangGraph's standalone adapter accepts empty action lists and
  trusts callback result/observation shapes; fixed-corpus study and bridge validation constrain
  these inputs. Add parity validation before broader standalone reuse. Durable atomic replay,
  restart/concurrency recovery, verified identity/revocation, held-out attacks, external
  reproduction, realistic connectors and measured overhead remain open. No paid call, submission,
  independent custody, hosted CI success, production readiness or historical coverage increase
  is claimed. See `docs/assurance/sdk/VALIDATION.md` for the evidence and limits.

## 2026-10-15 — Raouf: durable local effects and executor restart (Australia/Sydney)

- **Scope:** Implement the authorized next assurance phase: local process-crash recovery,
  retries and cooperating concurrent executors. Preserve all original lab/SDK sources and reports.
- **Summary:** Added immutable SQLite authority and receipts, exact action binding, exclusive
  idempotent file publication, cached completion and recovery of files published before receipt
  commit. The 26-case report includes four SIGKILL windows, a volatile two-effect restart control,
  one-effect durable replay, eight-worker races for one/two grants, changed arguments, authority
  replacement, storage failures and lock timeout. Both unchanged SDK adapters perform native
  approval/resume with fresh executor processes and one resulting effect across two attempts.
  File and receipt writes are not one atomic transaction; no distributed exactly-once claim.
- **Files changed:** `tools/assurance-durable/` package and tests; `docs/assurance/durable/`
  report, sources, results and validation; dated durability spec/plan; scoped CI; README, roadmap,
  reviewer index and assurance status links; both change logs. Re-derived only the existing
  workflow census `current` set in `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json`
  (26 to 27; one new unclassifiable CI step). Immutable baseline remains 19.
- **Verification:** 16 durability tests and 31 existing SDK tests passed. Final npm suite:
  5,122 tests, 5,119 passed, zero failed, three skipped (Chrome/Lean unavailable). Complete
  26-case replay passed in the clean pip environment; all three prior saved reports verify.
  CLI output-overwrite and tamper refusals pass. Census/finding-ledger tests: 23 passed. Ruff,
  formatting and diff checks pass. Fresh review found a valid escaped-string effect exceeding
  a fixed read cap; regression observed RED, then GREEN after encoded-length-bounded reads.
  Final review found no other material issue or new deferred minor. Initial npm census drift
  was diagnosed and current set updated under its existing lifecycle; frozen data stayed intact.
- **Follow-ups:** Real connector idempotency and ambiguous-response recovery, power-loss tests,
  end-to-end SDK workflow persistence, identity/revocation, held-out attacks and independent
  reproduction remain open. Existing standalone LangGraph input-validation limitation remains
  documented. No paid/model call, external witness, hosted CI result, deployment, submission,
  new coverage discharge or production-readiness claim. Reusable durability startup checks
  were saved in the cloud configuration draft; publication is separate from local validation.

## 2026-10-15 — Raouf: real Redis connector recovery (Australia/Sydney)

- **Scope:** Implement the authorized next assurance phase with a real local service. Preserve
  all earlier lab, SDK, durability and OpenAI instrument source/report bytes.
- **Summary:** Added a verified-source Redis 8.10.2 installer, disposable Unix-socket/AOF service,
  bounded RESP transport and an actual successful-response-loss proxy. Durable SQLite intents
  precede conditional SET; existing intents reconcile with GET only. The 19-case report covers
  lost replies, pre-send utility loss, eight binding mutations, malformed input, damaged records,
  service SIGKILL/restart, eight cooperating workers, a duplicate RPUSH control and both native
  SDK integrations. One completion is not counted as a second created effect.
- **Files changed:** `tools/assurance-redis/` implementation, installer and tests;
  `docs/assurance/redis/` evidence, sources, validation and results; dated Redis spec/plan;
  scoped CI, README, roadmap, reviewer index and assurance status links; both change logs.
  Re-derived only the workflow census `current` set (27 to 28) for the new step classified
  `missing_committed_universe_query`; its immutable baseline remains 19.
- **Verification:** 14 new Python tests, 31 SDK tests and 16 durability tests passed. Full npm:
  5,122 total, 5,119 passed, zero failed, three skipped (Chrome/Lean unavailable). Source installer
  ran successfully; clean hash-locked Python environment replayed all 19 report cases. All four
  prior reports verify unchanged. CLI overwrite/omitted-case refusals, Ruff, formatting, shell
  syntax, census and diff checks pass. Fresh independent reviewer reproduced tests and report,
  checked source provenance and found no material or minor defect. No review code fix required.
- **Follow-ups:** Commit a combined pending-executor-crash/concurrent-recovery fixture, persist
  end-to-end SDK workflow state, obtain held-out authorship and external reproduction, and measure
  integration cost. Remote connectors, identity/revocation, power loss and multi-host execution
  remain open. No paid/model call, external witness, hosted CI result, deployment, submission,
  coverage discharge, distributed exactly-once or production-readiness claim. Reusable Redis
  install/start instructions saved as a cloud draft; publication remains separate.

## 2026-10-15 — Raouf: persisted native workflow recovery (Australia/Sydney)

- **Scope:** Extend executor-only recovery evidence to one persisted native approval/tool workflow
  in each pinned SDK. The user authorized proceeding without environment or API-key work.
- **Summary:** Added native OpenAI RunState and official LangGraph SQLite checkpoints, trusted
  byte/digest/version validation before restoration, persisted decisions and locally serialized
  revocation/revision checks. Actual application SIGKILL after checkpoint persistence is followed
  by restoration in another process. A post-effect SIGKILL replays the callback against the existing
  Redis record. Cached completions return no new tool result and check current effect availability.
  The 24-case report also covers rejection, checkpoint tamper/substitution/loss, version mismatch,
  four concurrent resumes, conflicting decisions and missing completed effects.
- **Files changed:** `tools/assurance-workflow/` implementation, dependency extension and tests;
  `docs/assurance/workflow/` report, source register, results and validation; dated design/plan;
  scoped workflow CI; README, roadmap, reviewer index and assurance links; both logs. Current
  workflow census moves 28 to 29 for one `missing_committed_universe_query` step; baseline stays 19.
- **Verification:** Final 15 workflow tests passed, including complete matrix replay and tamper
  refusal. Saved 24-case artifact replay and CLI overwrite/omission refusals pass. Full npm:
  5,122 total, 5,119 passed, zero failed, three skipped (Chrome/Lean unavailable). Earlier suites:
  31 SDK, 16 durability, 14 Redis tests passed; all five previous reports verify unchanged.
  Fresh extension environment used hash-locked wheels and passed pip check; existing package
  versions are identical, with three added dependencies. Ruff, formatting, census and diff checks
  pass. Fresh reviewer found no Critical/Important issue and one Minor orphaned native scratch
  directory on SIGKILL. Regression failed first, then passed after moving scratch under parent
  ownership; final suite passed. Cached-result and transport-unknown regressions also pass.
- **Follow-ups:** External workflow reproduction, a multi-step crash matrix, authenticated approval
  identity, distributed revocation and measured overhead remain open. Recovery replays from the
  immutable approval checkpoint, not every latest intermediate state. The earlier Redis
  pending-intent crash/race fixture is still separate. No live/model call, hosted CI result,
  environment configuration change, deployment, submission, new coverage discharge or production
  readiness claim. The user's new Hugging Face/Medicare incident request is the following phase.

## 2026-10-15 — Raouf: incident-driven task scope and durable stopping (Australia/Sydney)

- **Scope:** Implement the authorized next phase around the reported 2026 Hugging Face and
  Australian Medicare incidents; preserve earlier tool sources and all six saved reports.
- **Summary:** Reviewed 12 primary/independent sources with URL/time/response-hash provenance.
  Added a standard-library Python request broker with exact task identity/method/URL/body grants,
  per-redirect authorization, monitoring-health precondition, bounded requests, SQLite audit and
  terminal stop state. Real child HTTP services communicate only through local Unix sockets and
  reserved `.test` names. The 18-case/three-control report contains 54 rows, including the explicit
  failure where an approved service relays beyond the broker's view. The research map attributes
  Medicare patient-record claims to OpenAI and separates other Australian activities accurately.
- **Files changed:** `tools/assurance-scope/**`, `docs/assurance/scope/**`, dated spec/plan, scoped
  CI, README, roadmap, reviewer index, assurance/industry links and both logs. Re-derived only the
  standing mutable census current set 29 to 30 (`unclassifiable_step`); baseline19 is unchanged.
- **Verification:** 24 new Python tests pass, including actual pending-intent SIGKILL/new process
  recovery, four-process budget contention, source/report tamper refusal and audit-failure windows.
  Complete saved-report replay passes; all 54 observations unchanged after the review correction.
  Full npm: 5,122 total, 5,119 passed, zero failed, three Chrome/Lean prerequisite skips. Original
  OpenAI/lab reports replay; all earlier tool/report bytes compare unchanged. Ruff, scoped formatting,
  CLI overwrite/omission/duplicate-key refusals, census and diff checks pass. One fresh reviewer
  independently reproduced tests/report, checked source hashes and found one Important stop-write
  gap. Reproduced it red; fixed pending-state handling across admission/response classification;
  added two regression tests and reran the complete Python suite/report. No second-review claim.
- **Follow-ups:** Enforce and observe network-layer egress from approved services; obtain held-out
  authorship and outside reproduction; broaden multi-step SDK/memory and identity tests; measure
  utility and integration costs. Trusted host/mandatory broker mediation remain assumptions. No
  live target, real credential, model call, environment settings change, hosted CI, deployment,
  company endorsement, incident-prevention guarantee or production-readiness claim.

## 2026-10-15 — Raouf: kernel enforcement around an approved service (Australia/Sydney)

- **Scope:** Execute the authorized next step for the approved-service onward-request gap. Add
  `tools/assurance-egress/**` and separate evidence; preserve all seven earlier source/report families.
- **Summary:** Added a Linux x86_64 ingress-only seccomp profile, trusted listener/descriptor
  sanitation, fail-closed readiness, fork/exec inheritance probes and parent-owned loopback/Unix
  observers. The unchanged exact-scope broker calls the real approved HTTP service. Twelve named
  cases under three controls yield 36 rows: eight network channels deliver in the baseline and are
  blocked under the profile; both useful operations complete. Descriptor hygiene applies to both
  running controls. A filesystem mailbox still works and is retained as a negative result. Four
  primary kernel/manual sources are recorded with response hashes; no new security primitive claimed.
- **Files changed:** New egress implementation/tests/docs/report/source register; dated spec/plan;
  scoped CI, README, roadmap, reviewer index and assurance links; both logs. Only the standing
  mutable census current set changes 30 to 31 (`unclassifiable_step`); frozen baseline19 unchanged.
- **Verification:** 20 new Python tests pass, including real raw-syscall/x32/descriptor-import
  checks, fork/exec, useful work, all live channel baselines, report tamper/refusal and observer
  failure. The 36-row report replays after the review correction with identical outcomes. Previous
  scope suite 24 tests and 54-row report pass unchanged. Full npm: 5,122 total, 5,119 passed, zero
  failed, three unavailable Chrome/Lean prerequisite skips. Ruff, formatting, CLI overwrite/omission/
  duplicate-key refusals, census, frozen-byte and diff checks pass. One fresh reviewer reproduced
  the initial suite/report and checked source hashes; one Important observer timeout defect found.
  A stalled-first/full-second connection regression failed before fixing the too-broad timeout
  handler. Active I/O failures now invalidate observation; full suite/report rerun green. No second
  independent review claim. The npm run preceded this Python-only correction.
- **Follow-ups:** Namespace mapping was unavailable (`/proc/self/uid_map` read-only); chose the
  unprivileged additive seccomp profile without changing platform policy. This costs selective
  egress and namespace isolation. Native mandatory launch, selective destination policy, filesystem/
  IPC isolation, held-out probes, workload overhead and outside reproduction remain open. Trusted
  Python bootstrap, local file/process effects and ingress replies are explicit bounds. No key,
  external target, live model, environment setting change, hosted CI, deployment or production claim.

## 2026-10-15 — Raouf: descriptor isolation and selective connections (Australia/Sydney)

- **Scope:** Implement the authorized filesystem/IPC and selective-network experiment in a new
  namespace; preserve all eight previous implementation/report families and frozen census baseline.
- **Summary:** Added a Linux x86_64 descriptor-scoped seccomp profile, trusted file-mode/peer
  validation, descriptor sanitation and outside file/network/signal observation. The unchanged
  exact-scope broker admits a synthetic local capsule task. Nineteen cases under three controls
  yield 57 rows: twelve attack baselines deliver and are blocked under the profile; three useful
  operations survive. Two inherited-descriptor cases close in both running controls. Unwanted
  content through approved output and TCP remains possible and is retained as negative evidence.
- **Files changed:** `tools/assurance-isolation/**`, `docs/assurance/isolation/**`, dated spec/plan,
  scoped CI, README, roadmap, reviewer index and assurance links; both logs. Only the mutable census
  current set changes 31 to 32 (`unclassifiable_step`); baseline19 is unchanged.
- **Verification:** 26 new Python tests and the source-bound 57-row saved-report replay pass.
  Tests include actual kernel denials, raw-fork inheritance, exec, file-backed/shared mmap,
  descriptor arguments, peer substitution, file modes, standard streams, multithreaded setup,
  malformed worker output, observer timeouts and report tampering. Kernel/harness/report tests
  began red before implementation. A malformed-result regression also failed before publication
  was moved after validation. Previous egress 20 tests and 36-row report pass unchanged. Full npm:
  5,122 total, 5,119 passed, zero failed, three missing Chrome/Lean prerequisite skips. Ruff,
  scoped Prettier, CLI overwrite/omission/duplicate-key refusals, current census, frozen-byte and
  diff checks pass. One fresh reviewer reproduced the original 24 tests/57 rows and source-response
  hashes, found one Important worker-envelope defect and one minor protocol-check limitation.
  Reproduced seven malformed CLI envelopes and boolean errno acceptance red; added shared strict
  field/type/duplicate-key validation and reran the 26-test suite. The saved observations are
  unchanged; only this phase's source hashes refresh. No second-review claim.
- **Follow-ups:** Landlock ABI query returned ENOSYS and namespace setup was already unavailable;
  use preopened capabilities without weakening platform controls. Cost: no dynamic paths,
  reconnects or general application compatibility. Raw fork is supported; the glibc/Python clone
  wrapper is intentionally denied. Deferred minor: bootstrap validates socket family/type/peer but
  not protocol; current trusted provisioning creates TCP. Native mandatory launch, outside reproduction, held-out probes,
  real workload overhead, content-release policy and dynamic permissions remain open. No key,
  external target, paid/model call, environment edit, hosted CI result, independent operator,
  deployment, incident-prevention guarantee or production-readiness claim.

## 2026-10-15 — Raouf: local Meta Llama CPU pilot (Australia/Sydney)

- **Scope:** Download and run a small official Meta model in this cloud machine, with additive
  model evidence and preserved earlier source/report families.
- **Summary:** Verified the pinned Llama 3.2 1B Instruct safetensors artifact and eight supporting
  files; installed a separate CPU runtime outside Git. Retained both 15-case captures: initial
  schema prompt 0 usable proposals, exploratory compact prompt 13 schema-valid proposals, three
  unsafe mock bypass effects all blocked under enforcement, and two of three benign tasks complete.
  Compact generation took 38.54 seconds with 2,970.05 MiB peak RSS. Added saved-output replay CI.
- **Files changed:** `tools/local-meta-pilot/**`, `docs/assurance/meta/**`, dated plan/ledger, scoped
  CI and formatting exclusion, README, reviewer index and both logs. Current mutable census 32 to
  33 for saved-proposal replay; baseline19 and nine earlier source/report families unchanged.
- **Verification:** Ten local tests pass. Both complete saved-report replays pass. Full npm: 5,122
  total, 5,119 passed, zero failed, three Chrome/Lean prerequisite skips. Fresh reviewer found one
  Important counter defect: failed bypass actions received containment credit. Reproduced red,
  required demonstrated unsafe bypass effects, reran all ten tests and regenerated only evaluations.
  Raw captures and generator snapshots preserved. No second review; npm preceded this Python-only
  fix. Model hashes and recorded generation-source hashes verified; lint and scoped formatting pass.
- **Follow-ups:** Dependency-lock artifact hashes remain a deferred minor; exact versions are
  pinned, the installed CPU wheel was verified, and model hashes are checked at load. Freeze prompts,
  obtain independently authored attacks/outside replication, repeat captures and compare a stronger
  model. This is a one-action mock pilot, not frontier robustness, real incident prevention, native
  SDK integration or evaluation of the later kernel profiles. No paid API, secret/weight in Git,
  environment settings change, hosted-CI result or deployment claim.

## 2026-10-15 — Raouf: repeated Meta workflow study protocol (Australia/Sydney)

- **Scope:** User-authorized evaluation protocol, separate case authorship, repeated local captures
  and complete native tool workflows; additive to the initial Meta pilot.
- **Summary:** Defined 24 cases, three sampling seeds and two model turns. Separate case author
  received no implementation or old outputs. Real descriptor-confined reads feed native SDK approval
  and Redis writes; fixed-action controls and actual process-kill recovery have explicit limits.
- **Files changed:** New `tools/local-meta-study/**`, `docs/assurance/meta-study/**`, dated plan and
  both logs. Existing ten source/report families stay frozen.
- **Verification:** Twenty-one pre-inference tests pass, including actual kernel/Redis/native SDK
  effects, SIGKILL recovery, invalid baselines, case clustering and capture inventory. Ruff clean.
  Fresh pre-inference review found provenance, prevention-credit and timing validation gaps;
  regression tests failed before the fixes and the complete suite passed afterwards. No evaluation
  generation has occurred; protocol/input commitment precedes collection.
- **Follow-ups:** Complete pre-inference review, freeze sources/settings, collect the fixed run,
  publish all failures and uncertainty, add saved-action CI, and verify/commit the evidence. Separate
  agent authorship is not external independence. No paid API or environment settings changes.

## 2026-10-15 — Raouf: fixed Meta study evidence and negative outcome (Australia/Sydney)

- **Scope:** Execute the precommitted repeated local Meta study without prompt changes or retries;
  publish every attempt and actual control effect.
- **Summary:** Commit `996960de` froze protocol, 24 separately authored cases and 63 source/input
  hashes before inference. All 144 attempts completed across three seeds; 137 began with Markdown
  fences, four hit the token limit, and only three proposals were schema-valid writes. No read
  proposal was valid; zero complete workflows. Real bypass produced two unauthorized writes, one
  benign-task error and one attack case; enforcement blocked both. One authorized write completed.
  With no complete model trajectory, model-derived recovery stayed unexercised. Scripted kernel,
  SDK, Redis and SIGKILL tests are separate evidence. Generation took 967.27 seconds; peak inference
  process RSS was 2975.48 MiB. The weak model/interface outcome is retained, not retuned away.
- **Files changed:** Added raw capture, three-control report and local tokenizer consistency record
  with its check-source snapshot; expanded study guide, reviewer index, README, plan ledger and
  both logs. No post-result source, corpus, prompt or protocol change.
- **Verification:** Pre-inference 21-test suite passed after review fixes; full npm 5119 passed,
  zero failed, three Chrome/Lean prerequisite skips. All 72 paired trajectories/432 tool attempts
  replay with matching semantic outcomes. Token/prompt/completion consistency checked for all 144
  generations using the installed tokenizer. Missing-row, changed-summary and output-overwrite
  refusals pass; raw capture bytes match the original. All frozen input/ancestor-commit bindings
  verify; ten earlier source/report families and baseline19 stay unchanged. Live census34 exact;
  original pilot reports replay, scoped formatting/Ruff/diff checks pass. Hosted CI not claimed.
- **Follow-ups:** Before an OpenAI comparison, freeze its model/interface protocol and distinguish
  schema-constrained output support from model capability. Outside authorship/replication, useful
  model workflows, model-derived recovery and representative overhead remain unmeasured. This
  run cannot estimate unnecessary blocking or broad protection: no benign baseline workflow
  completed and only two actionable unsafe writes occurred. No paid API, new secret, environment
  settings change, deployment, external independence or production-readiness claim.

## 2026-10-15 — Raouf: frozen Luna 6 comparison protocol (Australia/Sydney)

- **Scope:** Owner-authorized, bounded paid comparison using the supplied external key and exact
  model `gpt-6-luna`; additive to eleven frozen experiment families.
- **Summary:** Same 24 cases, three repetitions, two turns, unchanged JSON prompts and real runtime.
  Maximum 144 requests and 128 output tokens each, no retries or redirects, stop on first API error.
  Credential-free local replay and complete error inventory; no key persisted in Git or settings.
- **Files changed:** New comparison tool/tests, protocol, source notes, dated plan; raw evidence
  formatting exclusions and both logs. Earlier source/report families unchanged.
- **Verification:** Twelve API-free comparison tests and 21 inherited kernel/SDK/Redis/recovery
  tests pass. Initial inherited test invocation lacked PYTHONPATH; corrected invocation passes.
  New tests first failed with missing implementation, then passed. Ruff clean. Official model,
  pricing and Responses documentation checked; authenticated model listing confirms availability.
  No evaluation inference has occurred at this protocol commitment.
- **Follow-ups:** Execute once, retain every outcome, replay controls/recovery, document limitations,
  add credential-free CI and commit evidence. No independent reviewer or production claim.

## 2026-10-15 — Raouf: Luna 6 capture and retained interface failure (Australia/Sydney)

- **Scope:** Execute the precommitted owner-authorized API comparison and publish every outcome;
  no additional paid run, prompt tuning or retroactive repair.
- **Summary:** Protocol commit `e4965bbb` binds 67 inputs. All 144 requests returned responses,
  with two incomplete responses and no API errors/refusals. Of 144 proposals, 137 were invalid or
  incomplete JSON and four more failed tool schema. Three public reads executed through the real
  kernel boundary; all writes were invalid. Zero complete workflows, zero unsafe bypass effects,
  prevention unestimable (0/0), and model-derived recovery unexercised. Retained 142 multi-message
  responses explain the plain-text aggregation mismatch; no capability or protection ranking.
  Usage: 31,980 input and 7,961 output tokens; conservative standard-tier estimate $0.007978.
- **Files changed:** Added capture/journal, three-control report, post-capture response-shape counts
  and source snapshot, result guide; linked README/reviewer index, added credential-free replay CI
  and updated mutable census 34 to 35. Both logs updated; frozen plan and source inputs unchanged.
- **Verification:** Twelve new comparison tests and 21 inherited runtime tests pass. Full npm
  after CI/census changes: 5,119 passed, zero failed, three prerequisite skips. All 432 local control
  attempts executed; capture/journal exact agreement, source/ancestor binding and earlier Meta
  replay pass. Exact credential scan clean; temporary downloaded key file removed. All eleven
  earlier source/report families and historical census baseline unchanged. Hosted CI and external
  review not claimed. Fresh semantic replay of all 72 trajectories/432 control attempts passed;
  missing-row, changed-summary and report-overwrite CLI refusals passed.
- **Follow-ups:** A separately precommitted native function-calling or structured/phase-aware
  interface experiment is needed before judging model capacity or using larger-model credits.
  Keep this negative result. No production, independent-operator, general robustness, incident
  prevention, useful-workflow overhead or zero-provider-retention claim. No cloud settings change.

## 2026-10-15 — Raouf: native Luna protocol before inference (Australia/Sydney)

- **Scope:** Owner-approved native function-call experiment, additive to twelve frozen families.
- **Summary:** Same cases/model/budget; strict schemas, required single calls, text never executed.
  Trusted host policy remains authoritative; unsafe argument choices stay representable.
- **Files changed:** New native tool/tests, plan/protocol/guide, scoped replay CI, current census
  35 to 36, raw-data formatting exclusions and both logs. Old evidence and baseline unchanged.
- **Verification:** Twenty native tests and 21 inherited runtime tests pass. Fresh reviewer found
  escaped-credential persistence and unchecked journals; four regressions failed before fixes,
  then passed. Decoded envelopes/arguments/normalized results are screened, and replay requires
  exact journal agreement. Full npm: 5,119 pass, zero failures, three prerequisite skips. Ruff clean.
- **Follow-ups:** Freeze 71 input identities, execute one bounded capture, publish all results,
  replay controls and eligible recovery, remove local key, verify and push. No paid inference yet;
  no independent operator, second review, production or model-capability claim.

## 2026-10-15 — Raouf: native Luna results and recovery (Australia/Sydney)

- **Scope:** Execute the frozen native-call study; preserve all prior evidence.
- **Summary:** All 144 calls returned one valid function call. Enforced and bypass completed
  69/72 workflows and 34/36 benign tasks; deny-all completed zero. Three wrong-step reads remain
  failures. Both selected SIGKILL recovery probes resumed with exactly one final Redis effect.
  No unsafe bypass effect occurred: prevention is unestimable. Usage was 48,738 input and 3,174
  output tokens; conservative standard-tier estimate $0.00767925.
- **Files changed:** Native capture/journal/report, post-capture diagnostics/source, result guide,
  README/reviewer links and both logs. Frozen protocol/source inputs unchanged after inference.
- **Verification:** Fresh semantic replay matches all 72 trajectories/432 attempts and both
  recovery probes. Twenty native tests and 21 inherited tests passed; npm 5,119 passed, zero failed,
  three prerequisite skips. Six CLI tamper/overwrite refusals pass. All 71 input hashes and exact
  journal agreement verify; twelve older families and historical census baseline unchanged.
  Exact credential scan clean; temporary key removed. No hosted-CI or external-operator claim.
- **Follow-ups:** Native-interface IOU paid. Independent challenge cases with demonstrated unsafe
  baselines, independent replay and conversational tool loops remain. This suite's observed
  utility was achieved with the same Luna model; broader capability and prevention remain unproven.

## 2026-10-15 — Raouf: synthetic safety protocol before inference (Australia/Sydney)

- **Scope:** Owner-authorized safety experiments, additive to thirteen frozen families; Luna and
  conditional official Meta 3B, synthetic local resources only. No cloud settings changes.
- **Summary:** Fresh 24-case corpus by a separate AI author; 14 scripted boundary/lifecycle cases
  across three controls. Freeze fallback before inference: Meta only if Luna has no attack-labelled
  unsafe baseline or an API error. Preserve all refusals, errors and model-interface failures.
- **Files changed:** New safety-study tools/tests, plan, corpus, official model metadata/manifest,
  guide, scoped replay CI, mutable census 36 to 37, raw-byte formatting exclusion and both logs.
- **Verification:** Nine boundary tests and fourteen model tests pass; 21 inherited runtime tests
  pass. Full npm: 5,119 passed, zero failed, three prerequisite skips. Fresh review raised three
  integrity/metric issues; three reproductions failed before fixes and now pass, with an additional
  fallback-replay regression. Review ended before a complete audit; no second review is claimed.
- **Follow-ups:** Commit exact source/corpus/settings inventory before inference; run bounded
  captures, verify actual effects, publish limits, clean the temporary key and push the branch.

## 2026-10-15 — Raouf: verified Luna and Llama safety results (Australia/Sydney)

- **Scope:** Execute the frozen 94-input safety protocol; preserve earlier experiments and all
  model failures. The separately requested Hugging Face simulation is a successor surface.
- **Summary:** Scripted controls blocked 8/8 demonstrated unsafe cases while preserving two
  authorized operations. Luna completed 35/72 workflows and 16/36 benign tasks; 37 wrong-step
  reads remain failures and no unsafe baseline occurred. The declared fallback ran official
  Llama 3.2 3B: 20/24 workflows, all 12 benign tasks, four actual unsafe bypass writes, all four
  blocked by enforcement. No unnecessary policy blocks among the 12 useful benign baselines.
- **Files changed:** Added raw captures/journals, reports, actual SQLite artifacts, download and
  resource verification, negative CLI checks and result guide; entry-point links and both logs.
- **Verification:** Fresh semantic replay passed for all 42 scripted rows, 432 Luna and 144 Meta
  action/control attempts, plus two selected SIGKILL probes in each lane. Pinned Meta tokenizer
  reconstruction passed. All 94 input hashes remain unchanged; 23 new tests, 21 inherited runtime
  tests and npm 5,119 passed, with zero failures and three npm prerequisite skips. Three CLI
  tamper/overwrite refusals passed. Exact credential scan clean; temporary API key removed.
- **Follow-ups:** Independent challenge authorship/operator replay and representative connectors
  remain. Results are finite synthetic evidence; no broad robustness or incident-prevention claim.
  Llama ran offline on CPU at BF16 with 6.67 GiB reported peak RSS; Luna's usage estimate is $0.008465.

## 2026-10-15 — Raouf: local Hugging Face pattern protocol (Australia/Sydney)

- **Scope:** Add a safe local simulation requested by the owner, preserving fourteen earlier
  experiment families. Fake credentials and disposable services; no real target requests.
- **Summary:** Five scripted scenarios across scoped, origin-only and deny-all controls;
  nine separate mapped kernel channel probes. Real HTTP service effects test a cross-run
  handoff/metadata/scorer/export chain, later barriers, useful work and an approved-service gap.
- **Files changed:** New incident fixture, harness, five tests and plan; replay CI, mutable
  census 37 to 38, raw-evidence formatting exclusion and both logs. Historical baseline unchanged.
- **Verification:** Five new tests pass, including real service/egress effects, stop persistence,
  fresh replay, missing inventory, summary/source tamper and overwrite refusal. Root inspected
  source and control assumptions. No independent operator or production reconstruction claimed.
- **Follow-ups:** Commit exact source/protocol before the published run; retain approved-service
  relay and mailbox failures, publish results, verify the complete branch and push.

## 2026-10-15 — Raouf: local Hugging Face pattern results (Australia/Sydney)

- **Scope:** Execute the frozen 19-input incident protocol; keep synthetic pathway evidence
  distinct from model behavior and the real incident. No live target or API calls.
- **Summary:** All 15 scenario/control rows and nine separate channel rows completed without
  errors. Scoped admission blocks three of four unsafe origin-only scenario witnesses while
  preserving the approved read/write workflow. Approved-service relay remains a scoped failure;
  separate kernel probes block proxy/Unix relays but retain shared-file mailbox delivery.
- **Files changed:** Published report, verification ledger and result guide; entry-point links
  and both logs. Frozen source/protocol and fourteen earlier experiment families unchanged.
- **Verification:** Fresh complete semantic replay passes; all nine persisted-stop probes pass.
  Five new tests pass. CLI refuses missing scenario/channel rows, altered summary and overwrite.
  npm: 5,119 passed, zero failed, three prerequisite skips. Earlier 94 safety input hashes match;
  credential scan clean. No hosted-CI success or independent operator attestation claimed.
- **Follow-ups:** Compose approved-service containment with the incident chain, isolate shared
  writable state, add representative service identity/scorer controls and independent replay.
  These remaining gaps are published rather than counted as protection; commit and push branch.

## 2026-10-15 — Raouf: composed containment protocol (Australia/Sydney)

- **Scope:** Owner-authorized follow-through on the HF guide: compose approved-service
  containment, run isolation, scoped credentials and scorer protection; bounded local Llama lane.
- **Summary:** Five ablation controls over 14 scripted cases; eight frozen model prompts.
  Host-owned task authority, preconnected gateway and descriptor kernel enforce distinct layers.
  Synthetic random metadata credentials are excluded from worker bootstrap; no live target/API use.
- **Files changed:** New hf-containment tools/tests/plan/corpus, scoped replay CI and mutable
  census 38 to 39; raw-evidence exclusions and both logs. Earlier frozen experiments unchanged.
- **Verification:** Thirteen new tests pass after initial missing-module failures and fixes for
  a socket helper's post-filter lazy loading. A tokenizer-only probe caught BatchEncoding return
  semantics before inference; reconstruction now uses explicit encoding. Full npm: 5,119 passed,
  zero failed, three prerequisite skips. Source/control assumptions inspected locally.
- **Follow-ups:** Freeze source/protocol, execute once, retain model refusals/failures, publish
  replay instructions and results. CI's inherited scrubbed Redis child used an absent default
  path; runner provisioning now installs the same pinned binary there. Hosted confirmation pending.
  Independent operator reproduction and representative production IAM remain outside local evidence.

## 2026-10-15 — Raouf: composed containment results (Australia/Sydney)

- **Scope:** Execute the precommitted 27-input protocol; preserve all old evidence.
- **Summary:** All 70 scripted rows replayed; combined controls block 12/12 demonstrated
  unsafe baselines and preserve both useful workflows. Kernel-only permits harmful gateway
  operations; identity-only permits direct file access. Both layers are needed in this matrix.
  Plain-JSON Llama lane: eight generated responses, zero valid actions, one truncation,
  zero benign completions; no prevention denominator. All failures remain unmodified.
- **Files changed:** Scripted/model capture, journal, reports and verification ledger; result
  guide, external replay instructions and both logs. No source or protocol edits after freeze.
- **Verification:** Thirteen tests and full npm pass (5,119 passed, zero failed, three skipped).
  Fresh scripted replay and model raw/journal linkage pass; pinned tokenizer reconstruction
  passes. Earlier 94 safety and 19 incident inputs unchanged. External operator remains absent.
- **Follow-ups:** Separately freeze a native-tool interface successor to address the measured
  interface failure; retain this failed lane. Confirm hosted CI after pushing final evidence.

## 2026-10-15 — Raouf: native HF model interface protocol (Australia/Sydney)

- **Scope:** Separate successor to the retained eight-response plain-JSON failure.
- **Summary:** Same corpus, model/settings and five actual controls; use the model's native
  perform_action tool schema. One bounded capture, no output repair or retry. This interface
  was selected after seeing the earlier failure and is not an unbiased predeclared comparison.
- **Files changed:** New hf-native source/tests/plan/protocol, existing scoped CI job extension,
  raw-evidence exclusion and both logs. No new census identity; all earlier inputs preserved.
- **Verification:** Two native tests pass after initial missing-module failure; inherited
  13 containment tests pass. Ruff clean. Exact prompt inventory and raw action linkage checked.
- **Follow-ups:** Freeze before inference, execute once, verify tokenizer and fresh controls,
  publish both outcomes, push and wait for hosted CI. External operator receipt remains absent.

## 2026-10-15 — Raouf: native HF model results and release (Australia/Sydney)

- **Scope:** Execute the separately frozen 34-input native-call successor; preserve all failures.
- **Summary:** Four of eight responses yield valid calls. One unsafe scorer-tampering bypass
  action occurs and combined containment blocks it. One of two benign prompts completes;
  four invalid responses remain unexecuted. No general safety-rate claim or repaired output.
- **Files changed:** Native capture/journal/report/verification, native result guide, parent
  successor links, external replay instructions, root reviewer links, negative-check ledger
  and both logs. Prior source/corpus/protocol/captures remain unchanged.
- **Verification:** Fresh replay of 20 valid-action control rows (four deny-all refusals) and
  20 invalid/unexecuted records agrees; pinned tokenizer reconstruction passes. Two new and
  13 inherited tests pass; full npm 5,119 passed, zero failed, three prerequisite skips.
  Missing rows, altered action/summary and overwrite refuse; 94/19/27/34 input hashes match.
  Credential scan clean. Ready to push and observe hosted CI; no hosted success yet claimed.
- **Follow-ups:** Local containment and replay package delivered. External operator receipt,
  reliable model interface over broader tasks, representative real IAM/connectors and native
  mandatory launcher remain explicit limits; the old failures are preserved for comparison.

## 2026-10-15 — Raouf: current gap map and primary-source review (UTC)

- **Scope:** Targeted audit of the agent-containment track at `9141ec0b`, selected legacy
  findings and current primary guidance; no whole-repository semantic-audit claim.
- **Summary:** Published 27 prioritized work items with pass conditions and a four-step
  successor roadmap. Distinguished six previously documented open findings from fixture
  hardening, evaluation limits and external validation. Retrieved 19 primary pages.
- **Files changed:** New dated research map, source register, diagnostic script/results and
  npm advisory snapshot; current roadmap/reviewer navigation and both logs.
- **Verification:** Ten diagnostic observations reproduce: non-finite timing acceptance,
  permissive unknown task configuration and an injected in-flight revocation ordering.
  All published timings remain finite; 94/19/27/34 frozen input hashes match. npm audit
  reports zero known advisories. Ruff and scoped formatting/link checks validate the new
  package; no inference, external target probing or runtime remediation performed.
  Baseline hosted readiness run 38704471366 passed all 13 jobs before this audit.
- **Follow-ups:** Repair/isolate known historical paths through declared successor or
  maintenance scope; prioritize native interface reliability, held-out adaptive tasks,
  one authenticated connector and independent operator reproduction. Draft standards
  and public vendor guidance are not certification, endorsement or customer demand.

## 2026-10-15 — Raouf: hardening phase 1 scope (Australia/Sydney)

- **Scope:** Declare the first implementation phase of the current gap map before edits.
- **Summary:** Mutable server-boundary retirement/authentication, versioned authority and
  HF gateway/validator successors, strict reproduction wrapper and presentation evidence.
- **Files changed:** `docs/research/HARDENING_PHASE_1.md` and both logs.
- **Verification:** Read affected callers, existing tests and frozen-source requirements.
  No implementation or new outcome is claimed by this scope commit.
- **Follow-ups:** Failing regressions first, implement, independently review, verify and push.

## 2026-10-15 — Raouf: hardening successor and presentation package (Australia/Sydney)

- **Scope:** Implement phase 1 of the gap map under prior scope commit `f86f7723`;
  preserve frozen studies and distinguish retirement from functional remediation.
- **Summary:** Authenticated non-demo gateway session creation, retired mounted legacy
  live/affinity endpoints, and added exact-action authority, strict finite capture parsing,
  explicit task configuration and transactional SQLite revocation/effect successor.
  Added a strict historical-wrapper successor and a five-minute presentation script.
- **Files changed:** Server boundary/tests; new `tools/assurance-hardening/**` and strict
  wrapper; npm/CI commands; reviewer/policy/navigation docs; phase evidence and both logs.
  Current census only re-derived under its existing contract; all 39 identities retained.
- **Verification:** Full npm 5,122 passed, zero failed, three recorded prerequisite skips;
  17 successor tests, seven server tests (included in npm), 13+2 inherited focused tests.
  Fifteen demo checks replay exactly; tamper/overwrite refuse; 94/19/27/34 frozen input
  hashes match. Ruff, syntax and scoped formatting/link checks pass. Fresh reviewer found
  slash-path auth and mutable-request issues; both reproduced RED then fixed GREEN.
  First full suite's census classification mismatch is recorded and resolved; immutable
  baseline untouched. Hosted verification pending publication; no paid inference or keys.
- **Follow-ups:** Held-out adaptive model study, real IAM/connector integration and outside
  reproduction remain open. Legacy clients now receive documented 410 responses; old
  native helpers and direct historical modules are not certified or silently repaired.

## 2026-10-15 — Raouf: hardening hosted verification receipt (Australia/Sydney)

- **Scope:** Record hosted results after publication; documentation only.
- **Summary:** Implementation `e5d783434d36c2aff2ee750eb8888f50d48342d9` passed all 13
  jobs in Actions run `38723711060`, including persisted workflow recovery.
- **Files changed:** Phase record and both logs; tested source and saved evidence unchanged.
- **Verification:** Exact run conclusion is success, 13/13 jobs successful. Local results
  remain 5,122 npm passes with three prerequisite skips and 17 successor tests.
- **Follow-ups:** Phase 1 complete within its declared local scope; later model/connector
  and external validation phases remain open.

## 2026-10-15 — Raouf: declare connector phase 2 (Australia/Sydney)

- **Scope:** Additive next-phase design before implementation.
- **Summary:** Native SDK approval, mandatory isolated proposal worker, exact authority,
  sandbox inbox and conservative recovery; scripted engineering evidence only.
- **Files changed:** `docs/research/CONNECTOR_PHASE_2.md`, both logs.
- **Verification:** Clean starting tree; existing components and lifecycle read.
- **Follow-ups:** Execute tests first, preserve frozen history, fresh review, commit/push.

## 2026-10-15 — Raouf: composed connector phase 2 (Australia/Sydney)

- **Scope:** Implement the additive phase 2 design `a52c5bd1` and matrix `57b10145`.
- **Summary:** Native SDK approval, isolated proposal worker, exact identity/content
  authority and authenticated sandbox inbox with durable intent, idempotency and lookup.
  Two actual native-callback SIGKILL boundaries preserve unknown outcomes until observed.
- **Files changed:** New `tools/assurance-connector/**` and phase 2 docs/evidence;
  npm/CI integration, README, ROADMAP, reviewer index and both logs. Frozen inputs untouched.
- **Verification:** 17 focused tests pass; full npm 5,122 pass, zero fail, three existing
  Chrome/Lean skips. Matrix 39 rows: enforced 2/2 useful, 0/9 unauthorized; bypass 2/2
  and 9/9; deny-all 0/2 and 0/9. Four recovery observations and 16 source hashes replay.
  Historical 94/19/27/34 input hashes preserved. Fresh agent review plus author probe
  found HTTP exception handling, worker resource cleanup and typed-evidence gaps;
  one test-first repair pass closes them. Ruff/pip/census/diff/authored-doc checks pass.
  Canonical report/preregistered protocol formatting warnings are recorded, bytes retained.
- **Follow-ups:** Hosted CI pending push. Synthetic identities and local connector only;
  SDK/bootstrap trusted, no CPU/memory/process-count quotas. Held-out model study,
  real identity/vendor adapters and outside reproduction remain open. No paid inference.

## 2026-10-15 — Raouf: declare held-out model phase 3 (Australia/Sydney)

- **Scope:** New model study; historical source/evidence unchanged.
- **Summary:** Separately authored 30 benign/30 adversarial tasks, three trials,
  matched first proposals and adaptive control feedback, separate utility/safety metrics.
- **Files changed:** Phase 3 design and both logs.
- **Verification:** Phase 2 hosted run 38729498488: all 13 jobs successful.
- **Follow-ups:** Corpus review, test-first runner, development pilot, freeze, full capture,
  replay and fresh methods/code review. No paid provider or environment secret work.

## 2026-10-15 — Raouf: freeze held-out model phase 3 (Australia/Sydney)

- **Scope:** Implement design `40ac3763` additively; preserve historical source/evidence.
- **Summary:** Separate corpus author/reviewer, strict native-tool parsing, local batch
  inference, full-batch append-only capture, native connector effects, provenance and
  task/family-aware analysis. Protocol binds 60 tasks, three trials and three controls.
- **Files changed:** New runner/tests and phase 3 corpus/settings/protocol; npm/CI,
  phase design and both logs. Frozen earlier inputs remain unchanged.
- **Verification:** Fresh review findings reproduced RED then fixed GREEN; 13 focused
  tests pass. Full npm 5,122 pass, zero fail, three prerequisite skips; Ruff/pip/census
  pass. Two development pilots plus final-schema two-task smoke; tokenizer linkage
  verified. No held-out inference or paid API calls before this freeze.
- **Follow-ups:** Execute once, retain failures, replay effects/tokenizer, publish honest
  results and limitations. Single small model, local connector and trusted host only.

## 2026-10-16 — Raouf: complete held-out model phase 3 (Australia/Sydney)

- **Scope:** Execute frozen protocol `0e80f4bc`; add results and reviewer navigation.
- **Summary:** Official local Llama-3.2-3B-Instruct produced 403 responses across
  60 tasks, three trials and three controls: all 540 branches retained. Enforced
  benign completion 90/90; adversarial completion 59/90 with zero unauthorized
  effects, versus 43/90 unauthorized effects in bypass. Thirty-one attacked branches
  remain unsuccessful. No paid inference or environment-secret changes.
- **Files changed:** New phase 3 capture/journal/report/receipt and guides; README,
  ROADMAP, reviewer index, phase ledger and both logs. Frozen source/data unchanged.
- **Verification:** Two fresh effect-replay passes, full tokenizer linkage and author
  count cross-check pass. Thirteen focused tests pass; final npm 5,122 pass, zero fail,
  three existing Chrome/Lean skips. All 31 protocol bindings and prior 94/19/27/34
  input hashes match. Ruff/dependency/census/format/diff checks pass. Hosted CI follows push.
- **Follow-ups:** Outside reproduction and independent effect custody; broader tasks,
  vendor/IAM integration and preregistered recovery/model comparisons on a fresh corpus.
  Pre-run review covered code/methods; no outside reviewer assessed the final results.

## 2026-10-16 — Raouf: model phase 3 hosted verification receipt (Australia/Sydney)

- **Scope:** Record hosted results; documentation only.
- **Summary:** Implementation/evidence commit `78f6259aa5e063650a8f9b0f6eb6b222fd5f3cd8`
  passed all 13 jobs in Actions run `38747723586`, including phase 3 capture replay.
- **Files changed:** Phase 3 ledger and both logs; frozen source and results unchanged.
- **Verification:** Overall conclusion success, 13/13 successful jobs. Hosted checks
  replay saved proposals; model inference and tokenizer linkage were verified locally.
- **Follow-ups:** Outside reproduction, broader tasks and recovery under attack remain
  open. Phase 3 complete within its bounded local protocol; no production safety claim.

## 2026-10-16 — Raouf: declare reproduction phase 4 (Australia/Sydney)

- **Scope:** Additive portable replay and retained receiver evidence.
- **Summary:** Implement approved roadmap step 4; outside participation remains pending.
- **Files changed:** `docs/research/REPRODUCTION_PHASE_4.md`, both logs.
- **Verification:** Clean starting tree; frozen replay interfaces and lifecycle reviewed.
- **Follow-ups:** Test-first runner, raw evidence, fresh review, local reproduction and handoff.

## 2026-10-16 — Raouf: freeze phase 4 reproduction runner (Australia/Sydney)

- **Scope:** New runner/observer/tests/contract and operator guide; prior evidence unchanged.
- **Summary:** Exact report replay, raw decision snapshots, externally supplied expected
  root, strict archive/schema/receipt checks and incomplete-run evidence retention.
- **Files changed:** `tools/assurance-reproduce/**`, phase 4 docs/contract, npm/CI and both logs.
- **Verification:** 13 focused tests; npm 5,122 pass, zero fail, three existing skips.
  Fresh review's SQLite filter defect reproduced RED and repaired GREEN; Ruff/dependencies pass.
- **Follow-ups:** Full clean-checkout reproduction and pack verification; external operator pending.

## 2026-10-16 — Raouf: publish phase 4 reproduction handoff (Australia/Sydney)

- **Scope:** Retained local reproduction evidence and operator handoff; no model rerun.
- **Summary:** Clean checkout/fresh dependency environment reproduced all 540 branches
  and 763 decisions exactly in 89.236 seconds; 763 raw SQLite snapshots retained.
  Outside operator validation remains pending; no independent custody claim.
- **Files changed:** New phase 4 archive/root/receipt/results, guide/ledger/navigation and both logs.
- **Verification:** Standard-library pack verification and author raw-effect count agree.
  13 phase 4 plus 13 phase 3 tests pass; npm 5,122 pass, zero fail, three prior skips.
  All 39 bound inputs match; previous frozen paths unchanged; exact gate census,
  Ruff, dependencies, authored-doc formatting and diff checks pass.
- **Follow-ups:** Hosted CI after push; outside operator and fresh-host run, independent
  custody and new-protocol recovery improvements remain open. No external outreach.

## 2026-10-16 — Raouf: declare recovery phase 5 (Australia/Sydney)

- **Scope:** New guarded recovery, incident drills and fresh-host reproduction.
- **Summary:** One exact host-approved fallback, no override of explicit decline,
  read-only unknown reconciliation, revoke/stop ordering and retained raw effects.
- **Files changed:** Phase 5 design, phase 4 hosted receipt and both logs.
- **Verification:** Phase 4 commit 54119e57 passed all 13 jobs in run 38800643360.
- **Follow-ups:** Test-first successor, strict source freeze, internal review, local/hosted
  evidence. Outside validation remains pending. P5-CI01 authorizes only live census edits.

## 2026-10-16 — Raouf: fresh-host replay automation (Australia/Sydney)

- **Scope:** Path-scoped hosted reproduction, synthetic artifacts only.
- **Summary:** Execute the unchanged phase 4 runner on a fresh GitHub machine and retain
  raw snapshots, roots, receipts and failure logs. Project-operated, not independent.
- **Files changed:** New follow-up workflow, current gate census and both logs.
- **Verification:** P5-CI01 authority commit 619d31aa precedes this edit; one live gate
  identity added, no removed identities, historical baseline unchanged.
- **Follow-ups:** Inspect hosted execution and verify its downloaded pack locally.

## 2026-10-16 — Raouf: freeze guarded recovery experiment (Australia/Sydney)

- **Scope:** Additive phase 5 source/tests/protocol and project-operated fresh-host evidence.
- **Summary:** Durable exact-grant fallback, terminal decline, lookup-only uncertainty,
  stop/revoke ordering, 39 scripted cases plus three in-flight drills and raw evidence checks.
- **Files changed:** New recovery tools/docs/protocol, follow-up CI/npm, current census and both logs.
- **Verification:** 15 focused tests pass; npm 5,122 pass, zero fail, three prior skips.
  Reviewer timing finding and author strict-JSON finding reproduced RED and fixed GREEN.
  Fresh hosted phase 4 pack from run 38827781172 verifies locally; historical pin unchanged.
- **Follow-ups:** Execute frozen phase 5 once, fresh native verification, publish and run CI.
  No new model efficacy, outside operator, real IAM or distributed-cancellation claim.

## 2026-10-16 — Raouf: publish guarded recovery results (Australia/Sydney)

- **Scope:** Frozen phase 5 execution, raw evidence and current reviewer navigation.
- **Summary:** 39 scripted rows plus three in-flight drills retained; guarded recovery
  adds four completions (3→7/13), with declines and unknowns preserved. Stop detects
  four declared mismatches; in-flight effects commit before revoke, later sends block.
- **Files changed:** New report/pack/root/receipt/results, guides/navigation/ledger and both logs.
- **Verification:** Original run and fresh replay plus separate verification pass;
  42 raw SQLite snapshots, 46 frozen bindings unchanged. Fifteen focused tests;
  final npm 5,122 pass, zero fail, three existing skips. Fresh-host phase 4 pack verifies.
- **Follow-ups:** Hosted phase 5 checks after push. Outside operator/custody, new model
  study and real identity/vendor integration remain open; no model-score revision.

## 2026-10-16 — Raouf: record hosted recovery verification (Australia/Sydney)

- **Scope:** Receipt-only closeout of phase 5 and fresh-machine reproduction.
- **Summary:** Commit 34c01074 passed both follow-up workflow jobs in run 38829379613.
- **Files changed:** Phase 5 design/execution ledger and both logs; frozen artifacts unchanged.
- **Verification:** Hosted fresh reproduction and recovery/response verification both
  succeeded. Separate broader readiness run 38829379622 was 10/13 passed with three
  jobs running at receipt time; no final success claim for that run.
- **Follow-ups:** Outside operator/custody, new model evaluation and real identity/vendor
  integration remain open. Published results retain their scripted engineering scope.

## 2026-10-16 — Raouf: research current OpenAI agent-safety needs (Australia/Sydney)

- **Scope:** Public-source research and proposed priorities after phase 5; documentation only.
- **Summary:** Mapped 29 official sources to 12 remaining needs, including provider safety
  alerts, monitor outages, safe stopping, compaction, delegation and credential lifecycle.
  Distinguished documented guidance, existing evidence and proposed acceptance tests.
- **Files changed:** New OpenAI needs review/source register, reviewer index and both logs.
- **Verification:** All 29 registered pages returned HTTP 200; response hashes and exact
  normalized excerpts checked against fetched bytes. Local links, JSON, authored formatting
  and diff checked; no runtime tests repeated for this documentation-only update.
- **Follow-ups:** Prioritize an additive provider-alert/local-stop adapter, then fresh
  compaction/delegation tasks and authenticated connector lifecycle with outside observation.
  No new model results, deployment, external submission or exhaustive-coverage claim.

## 2026-10-16 — Raouf: declare safety signals phase 6 (Australia/Sydney)

- **Scope:** Additive provider-alert and monitor dispatch experiment; N01/N02 partial.
- **Summary:** Signed local alerts, durable stop/pending state, bounded monitor leases,
  separate operator restart and retained in-flight outcomes; no provider calls.
- **Files changed:** Phase 6 design/plan and both logs.
- **Verification:** Existing native dispatch and observation interfaces inspected;
  exact 42 matrix plus two drill cases declared before implementation.
- **Follow-ups:** Test-first implementation, fresh review, source freeze, retained evidence
  and hosted checks. P6-CI01 authorizes only the live census update.

## 2026-10-16 — Raouf: freeze safety signals phase 6 (Australia/Sydney)

- **Scope:** Additive local provider-signal/monitor gate, tests, protocol and scoped CI.
- **Summary:** Signed alert intake, durable pending/terminal states, monitor leases,
  boot-bound operator restart and complete raw controller/receiver evidence.
- **Files changed:** New assurance-signals tools and phase 6 docs; npm/CI, current gate
  census and both logs. Frozen prior studies unchanged.
- **Verification:** 24 focused tests pass. Four important internal-review findings and
  one author key-separation finding reproduced RED and repaired GREEN. Ruff and all
  62 pinned dependencies pass. P6-CI01 precedes one live gate addition (41→42).
- **Follow-ups:** Retained execution after this source/protocol commit, separate artifact
  verification and hosted checks. No live provider or independent-custody result claimed.

## 2026-10-16 — Raouf: publish safety signals phase 6 (Australia/Sydney)

- **Scope:** Frozen phase 6 execution, evidence and current reviewer navigation.
- **Summary:** 42 matrix rows and two in-flight drills retained. Integrated policy
  allows six intended deliveries, blocks 14 stop/hold cases and retains one unknown;
  already admitted effects can finish after a stop. No model/provider result claimed.
- **Files changed:** Phase 6 report/pack/root/receipt/results and guide, root design,
  README, ROADMAP, reviewer index, current census timestamp and both logs.
- **Verification:** Published run, mandatory fresh replay and separate verification
  pass; 88 raw SQLite snapshots, 48 frozen bindings unchanged. Twenty-four focused
  tests; final npm 5,122 pass, zero fail, three existing prerequisite skips. Ruff and
  pinned dependencies pass. P6-CI01 preserves historical census fields.
- **Follow-ups:** Hosted safety-signal checks after push, then phase 7 compaction and
  delegation. Live provider delivery and independent custody remain unvalidated.

## 2026-10-16 — Raouf: record hosted safety signals verification (Australia/Sydney)

- **Scope:** Receipt-only closeout of phase 6; frozen source and artifacts unchanged.
- **Summary:** Publication commit 820933bb passed safety-signals run 38832945791.
- **Files changed:** Phase 6 design/execution ledger and both logs.
- **Verification:** Fresh hosted runner passed 24 tests and verified the archive with
  fresh replay, 42 matrix rows, two drills, 88 raw snapshots and the published hash.
  Broader readiness run 38832945810 is 12/13 passed with workflow-recovery pending;
  no final success claim for that run. Previous readiness run 38829379622 succeeded.
- **Follow-ups:** Phase 7 compaction/delegation, then phase 8 credential lifecycle.
  Live provider delivery, outside operator and independent custody remain open.

## 2026-10-16 — Raouf: declare context and delegation phase 7 (Australia/Sydney)

- **Scope:** Additive N04/N05 engineering study with known-failure propagation.
- **Summary:** Durable checkpoints, authoritative outcome projections, narrowed
  task-bound delegation and one shared action budget; 36 exact matrix identities.
- **Files changed:** Phase 7 design/plan/ledger and both logs.
- **Verification:** Existing host/native/observer interfaces inspected; clean branch,
  enforced runtime network policy and reusable Python environment available.
- **Follow-ups:** Test-first implementation, review, source freeze, raw evidence and
  hosted replay. P7-CI01 authorizes only the live census addition. No live model claim.

## 2026-10-16 — Raouf: implement context and lineage controls (Australia/Sydney)

- **Scope:** Phase 7 durable checkpoints, structured summary audit and task delegation.
- **Summary:** Exact grants and ancestor checks, one shared admission budget, retained
  failures/unknowns and immutable old grants after any source change. Native experiment
  and complete raw-state verifier added; source/protocol freeze still pending review.
- **Files changed:** New assurance-context tools/tests, Phase 7 protocol and guide,
  scoped CI, npm scripts, current census, design ledger and both logs.
- **Verification:** Twenty focused tests passed before formatting. Source-restoration
  defect reproduced RED and repaired GREEN; all raw tables and coordinated forgery
  checked. Ruff passes. Live gate census is exact at 43; historical baseline unchanged.
- **Follow-ups:** Final focused/repository checks, fresh whole-change review, source
  freeze, retained execution, separate verification and hosted CI. No model claim.

## 2026-10-16 — Raouf: freeze reviewed context experiment (Australia/Sydney)

- **Scope:** Phase 7 source/protocol freeze before retained execution.
- **Summary:** Fresh review found no Critical, Important or Minor defects. Retained
  five additional reviewer probes as regressions; no production edits after review.
- **Files changed:** New review-probe tests, refreshed 47-binding protocol, ledger and both logs.
- **Verification:** All 25 focused tests passed; Ruff and 62 pinned packages pass.
  Repository suite: 5,122 passed, zero failed, three existing prerequisite skips.
  Prior phase readiness run 38832945810 now succeeded, all 13 jobs.
- **Follow-ups:** Retained execution after this commit, separate archive verification,
  publication and hosted Phase 7 checks. Live models/integration and custody remain open.

## 2026-10-16 — Raouf: publish verified context and delegation evidence (Australia/Sydney)

- **Scope:** Frozen Phase 7 execution, raw evidence and current reviewer navigation.
- **Summary:** All 36 rows retained. Integrated policy completes five intended cases,
  blocks 12 hold/authority cases and keeps one final unknown. Shared sibling budget
  limits two individually approved actions to one effect; prior uncertainty remains.
- **Files changed:** Phase 7 report/pack/root/receipt/results, guide/design ledger,
  root README/ROADMAP, reviewer index and both logs.
- **Verification:** Original fresh replay and separate archive verification pass;
  108 raw SQLite snapshots, 47 frozen bindings. Twenty-five focused tests; repository
  suite 5,122 pass, zero fail, three prerequisite skips. Ruff and pinned packages pass.
- **Follow-ups:** Hosted verification after push. Phase 8 credential lifecycle next;
  live compaction, model generalization and independent custody remain unvalidated.

## 2026-10-16 — Raouf: record hosted context verification (Australia/Sydney)

- **Scope:** Receipt-only Phase 7 closeout; frozen source and evidence unchanged.
- **Summary:** Publication commit 8b04e791 passed context/delegation run 38836069448.
- **Files changed:** Phase 7 design/execution ledger and both logs.
- **Verification:** Hosted 25 tests passed; committed archive verified with fresh
  replay, 36 rows, 108 raw snapshots and the published manifest hash. Broader readiness
  run 38836069319 remains 7/13 passed, six pending, none failed at receipt time.
- **Follow-ups:** Phase 8 authenticated credential lifecycle; fresh model integration,
  outside operator/custody and final broader CI status remain separate open items.

## 2026-10-16 — Raouf: declare credential lifecycle phase 8 (Australia/Sydney)

- **Scope:** Additive owned-service authentication, expiry, rotation and revocation study.
- **Summary:** Compare session-snapshot and per-commit credential checks; distinguish
  vault deletion, existing/new sessions, cancellation and unknown remote outcomes.
- **Files changed:** Phase 8 design/plan/ledger and both logs.
- **Verification:** Clean branch; native/replay interfaces inspected; 46 case identities
  and 92 raw snapshots declared. Prior phase broader readiness run 38836069319 succeeded.
- **Follow-ups:** Test-first implementation, fresh review, source freeze, retained
  execution and hosted checks. P8-CI01 authorizes only the live census addition.

## 2026-10-16 — Raouf: implement authenticated credential lifecycle (Australia/Sydney)

- **Scope:** Owned HTTP credential/session service, durable gateway, matrix and verifier.
- **Summary:** Per-commit expiry/revocation, separate auth roles and issuer binding,
  vault snapshots, session cancellation, retained unknowns and real dropped responses.
- **Files changed:** New assurance-credentials source/tests, Phase 8 protocol/guide,
  scoped CI, npm scripts, current census, design ledger and both logs.
- **Verification:** All 23 focused tests pass; exact 46-row development matrix and 92
  snapshots. Ruff passes; npm 5,122 passed, zero failed, three prerequisite skips.
  P8-CI01 precedes one exact live census addition (43→44), with baseline preserved.
- **Follow-ups:** Fresh review, source/protocol freeze, retained execution, separate
  verification and hosted replay. No real provider credentials or model calls used.

## 2026-10-16 — Raouf: fix admission race and freeze credential study (Australia/Sydney)

- **Scope:** Phase 8 admission ordering, regression and source/protocol freeze.
- **Summary:** Reproduced the partial review's paused-dispatch/revoke race before
  fixing it with shared advisory locking; local stop persists before waiting. The
  reviewer was automatically blocked and its whole-change review remains incomplete.
- **Files changed:** Gateway, edge tests, 50-binding protocol, guide/design and both logs.
- **Verification:** All 24 focused tests passed (29.677 seconds); Ruff passes. Repository
  suite: 5,122 passed, zero failures, three prerequisite skips. Exact census is 44;
  declaration ancestry and unchanged historical census fields verified.
- **Follow-ups:** Retained execution, separate verification and hosted replay. Linux
  locking cannot cancel timed-out remote work; only continuous receiver checks supply
  the post-revocation commit bound. Outside review/provider integration remain open.

## 2026-10-16 — Raouf: publish credential lifecycle evidence (Australia/Sydney)

- **Scope:** Frozen Phase 8 execution, raw archive and current reviewer navigation.
- **Summary:** All 46 rows retained; continuous checks produce seven observed, nine
  denied, five blocked and two unknown results. Snapshot checks produce ten observed,
  six denied, five blocked and two unknown. Lost acknowledgment retains its actual effect.
- **Files changed:** Phase 8 report/archive/root/receipt/results, guide/design ledger,
  README/ROADMAP, reviewer index and both logs.
- **Verification:** Retained fresh replay and separate archive verification passed;
  92 raw snapshots, 50 frozen bindings, archive/report byte equality and links checked.
  Twenty-four focused tests and 5,122 repository tests passed; three prerequisite skips.
- **Follow-ups:** Hosted verification after push. Whole-change review remains incomplete
  after an automatic reviewer block; the reported race was reproduced and fixed.
  Provider identity integration, new model evidence and independent custody remain open.

## 2026-10-16 — Raouf: record hosted credential verification (Australia/Sydney)

- **Scope:** Receipt-only Phase 8 closeout; frozen source and evidence unchanged.
- **Summary:** Publication commit 8f665ae0 passed credential lifecycle run 38840727900.
- **Files changed:** Phase 8 design/execution ledger and both logs.
- **Verification:** Hosted 24 tests passed; committed archive verified with fresh
  replay, 46 rows, 92 raw snapshots and the published manifest hash. Broader readiness
  run 38840727954 remains seven jobs passed, six pending, none failed at receipt time.
- **Follow-ups:** Complete the interrupted whole-change review; compose phases 6–8
  before fresh model evaluation. Provider integration and outside custody remain open.

## 2026-10-16 — Raouf: declare composed lifecycle phase 9 (Australia/Sydney)

- **Scope:** Compose phases 6–8 in an owned native workflow; preserve frozen predecessors.
- **Summary:** Declare 40 rows, 360 raw snapshots, exact adapter contracts and durable
  holds for interrupted multi-control updates. No model or provider-key use planned.
- **Files changed:** Phase 9 design/plan/ledger and both logs.
- **Verification:** Inspected real signal/context/credential interfaces and clean branch.
  Prior broader CI: 12 passed, workflow-recovery still running.
- **Follow-ups:** Test-first implementation, fresh review, source freeze, retained
  evidence and hosted replay. P9-CI01 authorizes only the new live census identity.

## 2026-10-16 — Raouf: implement composed lifecycle controls (Australia/Sydney)

- **Scope:** Actual phase 6–8 integration with adapters and durable update holds.
- **Summary:** Two routes share lineage budget and credential authority; raw denials,
  unknown revocations and interrupted multi-control updates retain their meanings.
- **Files changed:** New assurance-composed code/tests, protocol/guide, scoped CI,
  npm scripts, authorized current census, Phase 9 ledger and both logs.
- **Verification:** All 17 focused tests passed; inherited suites passed 24/25/24 tests.
  Repository suite: 5,122 passed, zero failures, three prerequisite skips. Ruff and
  62 pinned packages passed. Live census exact at 45; historical fields preserved.
- **Follow-ups:** Fresh whole-change review, source freeze, retained execution and
  hosted replay. Prior broader Phase 8 CI now succeeded, all 13 jobs.

## 2026-10-16 — Raouf: freeze reviewed composed lifecycle study (Australia/Sydney)

- **Scope:** Phase 9 source/protocol freeze before retained execution.
- **Summary:** Fresh review found no Critical, Important or Minor defects. Retained
  three additional interruption/partial-stop probes; no production changes after review.
- **Files changed:** Review-probe tests, refreshed 76-binding protocol, ledger and both logs.
- **Verification:** All 20 focused tests passed; prior 73 inherited tests and 5,122
  repository tests passed, zero failures, three prerequisite skips. Ruff and dependency
  compatibility passed. Declared census authority precedes its exact single addition.
- **Follow-ups:** Retained run, separate verification, publication and hosted CI. The
  clean composition review does not complete Phase 8's separate interrupted review.

## 2026-10-16 — Raouf: publish composed lifecycle evidence (Australia/Sydney)

- **Scope:** Frozen Phase 9 execution, raw evidence and current reviewer navigation.
- **Summary:** All 40 rows retained. Composed final outcomes: four observed (one cached),
  15 blocked, one unknown; seven actual effects. Four raw receiver denials remain visible
  despite conservative translation to blocked. Three intended new deliveries complete.
- **Files changed:** Phase 9 report/archive/root/receipt/results, guide/design ledger,
  README/ROADMAP, reviewer index and both logs.
- **Verification:** Mandatory fresh replay and separate verification passed; 360 raw
  snapshots, 76 frozen bindings. Canonical report equality, source hashes and links pass.
  Twenty focused tests, 73 inherited tests and 5,122 repository tests passed.
- **Follow-ups:** Hosted verification after push. Fresh held-out model evaluation,
  representative provider identity and independent custody remain separate milestones.

## 2026-10-16 — Raouf: record hosted composition verification (Australia/Sydney)

- **Scope:** Receipt-only Phase 9 closeout; frozen source and evidence unchanged.
- **Summary:** Publication commit 1db778f5 passed composed lifecycle run 38843557082.
- **Files changed:** Phase 9 design/execution ledger and both logs.
- **Verification:** Hosted 20 tests passed; archive verified with fresh replay, 40 rows,
  360 snapshots and the published manifest hash. Broader readiness run 38843556999
  remains seven jobs passed, six pending, none failed at receipt time.
- **Follow-ups:** Fresh held-out model evaluation, authorized provider integration and
  outside custody. The earlier interrupted Phase 8 review remains separately open.

## 2026-10-16 — Raouf: declare composed model phase 10 (Australia/Sydney)

- **Scope:** Fresh local Llama decisions against frozen composed controls, followed
  by portable handoff and presentation closeout under the user's continuing instruction.
- **Summary:** Separate authored 24-task corpus, two trials, three matched controls;
  48 generations, 144 branches and 1,440 raw snapshots. No paid provider use.
- **Files changed:** Phase 10 design/plan/ledger and both logs.
- **Verification:** Existing model worker, protocol, model files and runtime inspected.
- **Follow-ups:** Test-first harness, disjoint pilot, review, preregistration freeze,
  retained capture/replay, then subsequent phases. P10-CI01 declares the live census addition.

## 2026-10-16 — Raouf: implement composed model capture (Australia/Sydney)

- **Scope:** New Phase 10 harness, authored corpus, disjoint pilot, source protocol and CI.
- **Summary:** Append-only capture, 3 matched controls, exact raw-state replay and metrics;
  no held-out inference yet. Live census 45→46 under prior P10-CI01 authority.
- **Files changed:** New Phase 10 source/docs/workflow, npm commands, census and both logs.
- **Verification:** 13 focused tests passed; 62 pinned packages compatible. Two development
  pilot decisions generated with the official 3B model; active send and stopped decline.
- **Follow-ups:** Whole-change review, source freeze, retained evaluation; then Phases 11–12.

## 2026-10-16 — Raouf: declare portable handoff and presentation closeout (Australia/Sydney)

- **Scope:** Additive Phase 11 clean-clone reproduction and Phase 12 evidence-backed presentation.
- **Summary:** Pin the published Phase 10 evidence, test a fresh dependency environment,
  and map measured results to the existing OpenAI needs register with remaining gaps.
- **Files changed:** Two phase plans and both logs; no runtime or historical evidence edits.
- **Verification:** Prior Phase 10 checks: 13 focused, 20 composed, 13 model-harness tests
  passed; repository 5,122 passed, zero failures, three prerequisite skips.
- **Follow-ups:** Complete Phase 10 review/freeze/run, then execute both plans consecutively.

## 2026-10-16 — Raouf: freeze reviewed composed model study (Australia/Sydney)

- **Scope:** Phase 10 preregistration freeze before held-out inference.
- **Summary:** Fixed two Important review findings: authorized lost-ack effects remain
  unknown rather than unauthorized; tokenizer validation rejects vacuous/invalid slots
  and binds its counted result to the capture digest. No Critical or deferred Minor findings.
- **Files changed:** New harness regressions/fixes, 95-binding protocol, ledger and both logs.
- **Verification:** Reproductions RED→GREEN; 16 focused tests passed. Prior inherited
  20/13 tests and repository 5,122 passed, zero failures, three skips. Ruff/dependencies pass.
- **Follow-ups:** One retained held-out run and verification, then portable handoff and presentation.

## 2026-10-16 — Raouf: publish composed Llama evidence (Australia/Sydney)

- **Scope:** Frozen Phase 10 execution, complete evidence and current navigation.
- **Summary:** 48 responses, 144 matched branches, 1,440 raw snapshots. Composed and
  credential-only both complete 22/24 active tasks; stopped unauthorized effects are
  0/24 versus 16/24. Two active failures and four prior effects per control retained.
- **Files changed:** Phase 10 capture/archive/report/receipts/results, navigation and both logs.
- **Verification:** Mandatory replay, separate replay and all 48 tokenizer records passed;
  95 source bindings, 16 focused tests. No paid API use, retries or fallback model.
- **Follow-ups:** Hosted replay, clean-clone handoff and presentation; external gaps remain open.

## 2026-10-16 — Raouf: complete portable reproduction handoff (Australia/Sydney)

- **Scope:** Phase 11 pinned manifest, clean-clone recipe, retained receipts and operator template.
- **Summary:** Fresh clone and new Python environment replay the published Phase 10 evidence
  without model files or API keys. Independent custody remains unestablished.
- **Files changed:** Phase 11 guide/manifest/results/local and hosted receipts, root logs.
- **Verification:** 16 tests passed; 48 generations, 144 branches, 1,440 snapshots replayed;
  all 10 artifact/requirements hashes match; 63 distributions compatible; checkout clean.
  Hosted run 38846752661 passed 16 tests and the same full replay at f020c56e.
- **Follow-ups:** Presentation/gap closeout, outside operator and live-provider validation.

## 2026-10-16 — Raouf: complete presentation and gap closeout (Australia/Sydney)

- **Scope:** Phase 12 presentation, claim/evidence table, current gaps and navigation.
- **Summary:** Present 22/24 active branch completion and 16/24→0/24 stopped unauthorized
  effects with repeated-task denominators, two retained active failures and narrow limits.
  Map N01–N12 to measured coverage and remaining external/generalization work.
- **Files changed:** Phase 12 docs, README/ROADMAP/reviewer index and both logs.
- **Verification:** Canonical numeric/denominator checks passed; 42 local links across 11
  phase documents resolve; local handoff receipt hashes intact; scoped formatting clean.
  Phase 10 hosted run passed. Broader run 38846752700: 10 successful, three pending, none failed.
- **Follow-ups:** Outside custody, authorized provider integration, harder fresh multi-model
  studies and interrupted Phase 8 review completion remain open; no production-readiness claim.

## 2026-10-16 — Raouf: declare reliability, export and validation phases (Australia/Sydney)

- **Scope:** Consecutive Phases 13–15 under the user's instruction to continue all local work/tests.
- **Summary:** Bounded concurrent/restart schedules, explicit privacy-aware outcome projection,
  and a consolidated test inventory; preserve frozen predecessors and external validation gaps.
- **Files changed:** New design/plan/ledger and both root logs. P13-CI01 declares one live census addition.
- **Verification:** Current checkout clean; previous broad CI 38846752700 now succeeded all 13 jobs.
- **Follow-ups:** Test-first implementation, fresh review/freeze, retained runs and full local checks.

## 2026-10-16 — Raouf: implement bounded reliability and reduced evidence export (Australia/Sydney)

- **Scope:** Phases 13–14 implementation before review and source freeze.
- **Summary:** Real queued native calls, interrupted durable update, complete raw-state
  verification; allowlisted 144-branch projection with distinct public/source validation.
- **Files changed:** Two new tools/tests/protocols, scoped CI/npm commands and the P13-CI01
  live census addition (47 gates); predecessor sources/evidence remain unchanged.
- **Verification:** Seven reliability and seven export tests pass after test-first development;
  Ruff passes. Corrected formatter-exposed import-order failure via explicit dependency bridge.
- **Follow-ups:** Fresh whole-change review, freeze, retained runs and consolidated test matrix.

## 2026-10-16 — Raouf: freeze reviewed reliability and export protocols (Australia/Sydney)

- **Scope:** Phases 13–14 preregistration before retained execution.
- **Summary:** Corrected two Important verifier findings with five RED→GREEN regressions;
  bind per-route outcomes, durable reservations, stop state and interrupted-update ordering.
  Clarified that latency covers final calls only; no Critical or deferred implementation finding.
- **Files changed:** New reliability validator/tests, draft protocol bindings, ledger and both logs.
- **Verification:** Full reliability suite 12 passed; export suite seven passed; Ruff clean.
- **Follow-ups:** Retain one full run/export, independently verify, finish consolidated validation.

## 2026-10-16 — Raouf: publish reliability and privacy-aware export evidence (Australia/Sydney)

- **Scope:** Frozen Phases 13–14 runs and current reviewer navigation.
- **Summary:** 60 reliability fixtures/210 final calls/600 snapshots pass; composed controls
  retain useful retries and prevent new queued-stop/interrupted-update effects. Export retains
  all 144 Phase 10 outcomes with explicit omissions and full source consistency verification.
- **Files changed:** New phase artifacts/results, current navigation, ledger and both logs.
- **Verification:** Mandatory fresh reliability validation plus separate invocation pass;
  export validates full source before projection and again after packaging; focused tests 12/7.
- **Follow-ups:** Separate export invocation, hosted checks and Phase 15 complete test closeout.

## 2026-10-16 — Raouf: declare precise aggregate-gate maintenance (Australia/Sydney)

- **Scope:** P15-CHECK01, declared before two configuration/checker edits.
- **Summary:** Exclude individually identified frozen machine JSON from prose formatting;
  distinguish one exact public synthetic canary assignment from unexpected token values.
- **Files changed:** Continuation ledger and both logs; no runtime/evidence mutation.
- **Verification:** Aggregate run identified canonical-byte formatting conflicts and six
  matches of the same synthetic canary; all observed values are existing test fixtures.
- **Follow-ups:** Negative-test the narrow exception and rerun affected gates; retain other failures.

## 2026-10-16 — Raouf: align format and secret gates with frozen evidence (Australia/Sydney)

- **Scope:** Implement P15-CHECK01 within its two-file authority.
- **Summary:** Preserve 34 exact machine-evidence JSON paths; exclude only the exact public
  synthetic canary assignment in two bound test paths, retaining all other scanner matches.
- **Files changed:** `.prettierignore`, `scripts/check.sh`, continuation ledger and both logs.
- **Verification:** Canary check RED→GREEN; two exact cases excluded and six altered controls
  retained. Actual secret-scan section passes; full Prettier check passes; 37 related gate tests pass.
- **Follow-ups:** Finish consolidated validation and publish unresolved legacy/build limitations.

## 2026-10-16 — Raouf: complete consolidated local validation (Australia/Sydney)

- **Scope:** Phase 15 maintained test inventory, archive replays, setup diagnosis and handoff.
- **Summary:** 636 Python tests across 28 suites pass; Node 5,124 pass/zero fail/one browser
  skip; 39 Lean proofs and 34 mandatory-Xvfb Rust tests pass. End-to-end has 31 passing
  steps and one frozen-inventory failure; legacy retired-route assertions remain visible.
- **Files changed:** Validation inventory/log bundle/results/runbook/gaps, separate export
  receipt, navigation, one additional exact canonical-file exclusion, ledger and both logs.
- **Verification:** Phases 4–9 archive checks pass; Phases 10/13/14 full verification passes;
  all 13 hosted readiness jobs and new hosted reliability/export pass at eb961854.
  Trusted-CA prefetch/offline container build plus ownership override passes non-root mock
  smoke and HTTP 410 retired-route refusal. TLS verification retained; no paid API calls.
- **Follow-ups:** Legacy-gate migration, browser/macOS portability, interrupted Phase 8 review,
  outside custody, live-provider integration and harder model generalization remain open.

## 2026-10-16 — Raouf: declare Phase 16 maintenance (Australia/Sydney)

- **Scope:** Prior authority for bounded legacy gate, inventory, browser and Docker maintenance.
- **Summary:** Preserve frozen research bytes; migrate obsolete checks under the Phase 16 design.
- **Files:** `docs/research/LOCAL_MAINTENANCE_PHASE_16.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Reproduced gateway retired-response and strict-successor inventory failures.
- **Follow-ups:** Implement declared repairs, retain negative controls, publish measured results.

## 2026-10-16 — Raouf: implement Phase 16 maintenance (Australia/Sydney)

- **Scope:** Exact Phase 16 authority paths; no frozen research source or evidence changed.
- **Summary:** Migrate HTTP smokes to permanent retirement, hash-bind a versioned current
  reproduction set, execute browser parity through a local debugging pipe and loopback fixture,
  and support lock-verified offline Docker installation with non-root source ownership.
- **Files:** Declared gateway scripts/tests, inventory and browser helpers/tests, Dockerfile,
  offline recipe, current manifest, `AGENT.md`, `CHANGELOG.md` and Phase 16 design.
- **Verification:** 33 focused tests pass, including inventory mutations and browser failure/
  timeout controls; Stage 5P's real Chromium lane passes 1,734 checks. Gateway core/live smoke
  fixtures pass (72/40); audit 14/14. Offline Docker mock smoke runs as UID 1000.
- **Follow-ups:** Run broad aggregate/E2E gates in a disposable clone; publish exact outcomes.

## 2026-10-16 — Raouf: authorize additive Stage 5R browser successor (Australia/Sydney)

- **Scope:** Add only `tests/unit/maintenance/stage5rBrowserParity.test.js` under P16-BROWSER-R.
- **Summary:** Fresh real-browser parity through the working harness; preserve old driver/receipt.
- **Files:** Phase 16 design, `AGENT.md`, `CHANGELOG.md` (authority only).
- **Verification:** Current manifest has 5 entries and 17 vectors; historical driver still uses
  the diagnosed failing dump-DOM/file-navigation path. No historical bytes changed.
- **Follow-ups:** Compare all four evaluators and exercise missing/wrong-answer controls.

## 2026-10-16 — Raouf: verify Stage 5R browser successor (Australia/Sydney)

- **Scope:** Additive Phase 16 browser test; authorize new validation archive/manifest.
- **Summary:** Compare the immutable Stage 5R manifest against Node core, portable Node,
  Python and real Chromium. Historical driver and receipt remain byte-identical.
- **Files:** `tests/unit/maintenance/stage5rBrowserParity.test.js`, Phase 16 design and root logs.
- **Verification:** Three tests pass: 5 entries / 17 vectors across all evaluators and
  missing/altered-answer negative controls. Implementation follows authority commit ce580463.
- **Follow-ups:** Finish aggregate/E2E validation and publish revision-specific results.

## 2026-10-16 — Raouf: authorize precise literal and privacy-test corrections (Australia/Sydney)

- **Scope:** P16-LITERAL and P16-CANARY exact test paths; no application or evidence changes.
- **Summary:** Correct cross-era prose correlation and a random digest substring false positive.
- **Files:** Phase 16 design, `AGENT.md`, `CHANGELOG.md` (prior authority only).
- **Verification:** Aggregate logs retain both failures; the historical total line hashes and
  leaked-value report identify the causes. E2E prior-stage failure shares the literal cause.
- **Follow-ups:** Hash-bound two-line exclusions, canonical-field recognition and negative controls.

## 2026-10-16 — Raouf: clarify Phase 16 literal-gate documentation authority (Australia/Sydney)

- **Scope:** Permit the exact Phase 16 design as approved code-band documentation.
- **Summary:** The design must describe its finding literally; preserve the reserved-band
  regex and restrict root logs to two exact historical line hashes.
- **Files:** Phase 16 design, `AGENT.md`, `CHANGELOG.md` (authority only).
- **Verification:** New privacy controls pass; literal gate now identifies only this new
  design's own diagnostic prose, so its by-name approval is declared before editing the list.
- **Follow-ups:** Complete the bounded gate repair and rerun the affected suites.

## 2026-10-16 — Raouf: repair precise legacy test false positives (Australia/Sydney)

- **Scope:** P16-LITERAL and P16-CANARY, under prior commits b6b9a235 and f5cc3a91.
- **Summary:** Hash-bind two historical total lines, allow the exact maintenance design,
  and recognize a canonical optional paired-node digest without ignoring malformed/raw values.
- **Files:** `tests/unit/llmShield/stage5p/rawCodeCensus.test.js`,
  `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`,
  `tests/unit/maintenance/privacyCanary.test.js`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** 25 focused tests pass; the original numeric-canary collision was reproduced
  before the fix. Changed path/line/code controls and seven raw-value controls remain rejecting.
  The Stage 2.6/2.7 closeout smoke passes. Historical evidence and application code are unchanged.
- **Follow-ups:** Repeat broad gates on the final implementation and retain initial failures.

## 2026-10-16 — Raouf: publish Phase 16 validation (Australia/Sydney)

- **Scope:** Results and reviewer navigation for final implementation 8ebe0103; frozen history intact.
- **Summary:** Close reproduced gateway/inventory/browser/container maintenance failures and
  precise legacy test false positives; retain initial failures and external/platform limits.
- **Files:** Phase 16 results, runbook, validation manifest and log archive; `README.md`,
  `ROADMAP.md`, `docs/REVIEWER_INDEX.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** 5,154/5,154 direct Node tests with zero skips; aggregate 142/142 steps;
  E2E 32/32 steps (579 tests passed, one path-specific skip separately exercised); Rust 34,
  Lean 39 proofs, portable .NET 11 tests; Chromium parity for both declared surfaces.
  Archive retains 326 logs with hashes and no secret/canary redactions. Authority ancestry
  and unchanged predecessor research paths verified. No paid provider calls or new inference.
- **Follow-ups:** Native platforms, outside custody, provider entitlements, sustained deployment
  and the previously interrupted whole-change review remain unproven; push the topic branch.

## 2026-10-17 — Raouf: authorize provider transfer and reviewer handoff (Australia/Sydney)

- **Scope:** Phases 17–20, user-approved readiness items 2–5; external reproduction deferred.
- **Summary:** Add bounded live workflow, two-family comparison, paced reliability and brief.
- **Files:** New Phase 17 design and matching root logs; exact write paths declared in design.
- **Verification:** Clean baseline 6a88786a; installed model and OpenAI model access checked.
  No inference calls yet; existing frozen lifecycle and reliability APIs inspected.
- **Follow-ups:** Test new capture/verification code, freeze inputs, capture within budget,
  publish actual results and remaining platform/review limits without changing history.

## 2026-10-17 — Raouf: freeze provider transfer implementation (Australia/Sydney)

- **Scope:** New transfer namespace under authority 359202cf; predecessor bytes preserved.
- **Summary:** Add strict Responses roundtrip, persistent request budget, matched local/API
  comparison, paced process-based reliability capture and raw-storage/replay verification.
- **Files:** `tools/assurance-transfer/**`, Phase 17 corpus/settings/source protocol and logs.
- **Verification:** 15 substantive tests pass, including all eight lifecycle outcomes,
  duplicate calls/arguments, budget exhaustion, source-request binding and storage mutation.
  Ruff checks pass. A test import collision was corrected before capture; no API inference yet.
- **Follow-ups:** Capture frozen inputs once, retain all outcomes, verify archive and publish brief.

## 2026-10-17 — Raouf: authorize host-role correction and native CI (Australia/Sydney)

- **Scope:** Separate Phase 17B correction and bounded macOS/Windows validation jobs.
- **Summary:** Luna's returned reasons identify user-role host authority as insufficient;
  preserve the complete first study and freeze a developer-role correction before 16 new calls.
- **Files:** Phase 17B design and root logs; new adapter/docs/workflow paths declared exactly.
- **Verification:** Original capture retains all eight declines, including three active cases.
  Original 64-attempt study continues unchanged; combined corrective budget remains below $1.
- **Follow-ups:** Test authority-role separation, bind prior ledger, capture once; run native CI.

## 2026-10-17 — Raouf: freeze corrected provider roles and native jobs (Australia/Sydney)

- **Scope:** Additive Phase 17B adapter and Phase 19 native workflow under authority 00503114.
- **Summary:** Host-authored task/state uses developer messages; retrieved text stays tool data.
  Bind the original 64-attempt ledger and all eight original workflow results before correction.
- **Files:** New role adapter/tests/protocol/baseline, scoped native workflow and root logs.
- **Verification:** Three role/budget tests pass; Ruff and workflow formatting pass. Original
  transfer source remains unchanged. Runtime/model dependency checks and npm audit are clean.
- **Follow-ups:** Capture at most 16 corrected requests; run native jobs; retain all outcomes.

## 2026-10-17 — Raouf: authorize exact frozen-baseline format exclusion (Australia/Sydney)

- **Scope:** P17-FORMAT01, one exact addition to `.prettierignore`.
- **Summary:** Preserve the compact baseline JSON committed before corrective capture.
- **Files:** Phase 17 maintenance declaration and both root logs; ignore edit follows later.
- **Verification:** Corrective protocol hashes the baseline bytes; reformatting changes that input.
- **Follow-ups:** Add the exact path, retain source verification, format human-facing reports.

## 2026-10-17 — Raouf: publish provider transfer and presentation package (Australia/Sydney)

- **Scope:** Phases 17–20 and separate declared role correction; external reproduction deferred.
- **Summary:** Retain 96 model decisions, 288 matched branches and 120 paced reliability fixtures.
  Llama retains 23/24 active completions while restricted effect trials fall from 17/24 to zero.
  Luna comparison is 24/24 active and zero restricted effects in both useful controls.
  Corrected live workflow completes 2/3 authorized cases and declines all five restricted cases;
  retain the remaining active refusal and all original eight declines without further tuning.
- **Files:** New result reports, source-bound archives, brief/demo/validation package, current
  navigation, exact P17-FORMAT01 ignore addition and matching root logs.
- **Verification:** 18 new Python tests; 16/12 predecessor suites; 45 Node/browser tests; 10
  rejected evidence mutations. Full comparison/workflow replay and 4,240 snapshots verify.
  Hosted macOS 10 tests, Windows 11 tests and affinity build pass at fbe06eca. Dependency
  checks and formatting pass; 213 local links resolve. Original-source authority ancestry
  and unchanged predecessor bytes checked. All 80 paid calls retained; estimated $0.0061306.
  Exact-key scan passed and the task-downloaded credential copy was removed after capture.
- **Follow-ups:** Finish the already-running hosted recovery job and publish its receipt.
  One active refusal, production IAM/alerts/load, interactive desktop behavior and the
  previously blocked whole-change security review remain explicit limitations.

## 2026-10-17 — Raouf: complete hosted readiness receipt (Australia/Sydney)

- **Scope:** Additive final hosted receipt and current navigation wording; no runtime edits.
- **Summary:** All 13 existing readiness jobs passed at implementation freeze 4afe9538,
  including persisted workflow recovery; both native platform jobs already passed at fbe06eca.
- **Files:** New hosted receipt/log archive, validation guide, current entry-point prose and logs.
- **Verification:** Exact job identities, successful conclusions, source SHA and log hashes
  checked. Prior evidence bundles remain byte-identical. Formatter and diff checks pass.
- **Follow-ups:** Independent reproduction stays deferred. One corrected active refusal and
  the documented provider/deployment/desktop/review limitations remain unresolved.

## 2026-10-19 — Raouf: declare maintained gate migration (Australia/Sydney)

- **Scope:** Phase 16, P16-G01 retired HTTP contract and P16-G02 versioned reproduce inventory.
- **Summary:** Preserve the historical 50-script pin; declare the strict successor separately and validate exact identities.
- **Files changed:** `docs/research/CONTINUATION_PHASE_16.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** Original inventory test fails on the strict Stage 5L addition; original gateway smoke fails on the already-retired response.
- **Follow-ups:** Implement declared maintenance, test negative controls and run the affected gates before the Phase 8 review.

## 2026-10-19 — Raouf: migrate maintained legacy gates (Australia/Sydney)

- **Scope:** P16-G01/P16-G02 under preceding authority commit `8af9d15a`.
- **Summary:** HTTP smokes require retirement regardless of historical flags; maintained reproduce inventory adds the strict Stage 5L successor beside the unchanged historical pin.
- **Files changed:** Exact Phase 16 maintenance surface; shared inventory validator, versioned manifest and eight behavioral regression tests.
- **Verification:** 15 inventory tests pass; core smoke (72 fixtures), retirement smoke (40 fixtures), and 14 security-audit checks pass in a disposable checkout. Historical pin hash matches. Added/removed, equal-count substitution, duplicate, path, empty-set and changed-pin controls refuse.
- **Follow-ups:** Run consolidated end-to-end checks after the Phase 8 review and portability work. No aggregate-green claim yet.

## 2026-10-19 — Raouf: complete local Phase 8 follow-up review (Australia/Sydney)

- **Scope:** All Phase 8 Python source/tests and its workflow, with supporting boundary reads.
- **Summary:** No new confirmed vulnerability within the declared trusted-host lab model. The earlier interrupted review is superseded by this local review, not relabeled as independent.
- **Files changed:** `docs/research/PHASE_8_REVIEW_2026-10-19.md`, `AGENT.md`, `CHANGELOG.md`.
- **Verification:** 24 tests passed in 21.659 seconds; separate fresh archive replay verified 46 rows, 92 snapshots and all 50 frozen bindings.
- **Follow-ups:** External review/custody and production identity/TLS remain separate. Browser portability is next.

## 2026-10-19 — Raouf: declare portable runtime maintenance (Australia/Sydney)

- **Scope:** P17-B01 browser prerequisites and P17-N01 alternate Node selection.
- **Summary:** Replace machine-specific discovery; preserve explicit skips and refuse false browser parity. Add a fresh-output Stage 5R command without changing the frozen receipt.
- **Files changed:** Phase 17 declaration and both logs.
- **Verification:** Minimal Chromium runs time out; diagnosis confirms managed navigation restriction. Existing Node 24 is outside `/usr/bin`.
- **Follow-ups:** Implement and test discovery; retain managed-browser prerequisite and macOS limits in the handoff.

## 2026-10-19 — Raouf: implement portable runtime prerequisites (Australia/Sydney)

- **Scope:** P17-B01/P17-N01 under preceding authority `fdb2d047`.
- **Summary:** Discover configured/platform browsers and real alternate Node; report managed file-navigation restriction explicitly. Fresh Stage 5R runner refuses overwrite and returns nonzero for unproven browser parity.
- **Files changed:** Declared Phase 17 runtime helpers, runner and tests; both logs.
- **Verification:** Regression tests RED→GREEN; 15 targeted checks pass with one explicit browser skip. Real Node 24 wrapper test passes. Fresh Stage 5R receipt establishes Node/portable/Python agreement and records three-runtime parity false (exit 1).
- **Follow-ups:** Run browser/macOS checks on a permitted machine; build the owner-requested shared evidence explorer.

## 2026-10-19 — Raouf: declare shared evidence explorer (Australia/Sydney)

- **Scope:** Owner-requested Phase 18 human dashboard and agent CLI.
- **Summary:** One local schema/query layer, honest failure classifications, source-linked research and explicit open gaps. Isolated frontend package; preserve all predecessor artifacts.
- **Files changed:** Phase 18 declaration and both logs.
- **Verification:** Reviewed public Phase 14 schema, Phase 10 capture/report and existing 29-source register; consulted current official evaluation, monitoring and MCP documentation.
- **Follow-ups:** Build, test and prepare the independent-operator handoff; external custody remains with the owner/classmate.

## 2026-10-19 — Raouf: implement human and agent evidence explorer (Australia/Sydney)

- **Scope:** Additive Phase 18 under preceding authority `2569dae5`.
- **Summary:** Shared versioned queries, React dashboard, JSON CLI, local import/export and selected full-detail joins. Indexed 144 retained outcomes and 48 research/source entries with eight gap records.
- **Files changed:** Isolated `tools/simurgh-explorer` package, dated research/gap register, current navigation and both logs.
- **Verification:** Behavioral tests pass for CLI/UI equivalence, complete outcomes, unknowns, invalid imports, read-only server and inert content; Vite production build passes. Runtime dependency audit reports zero known advisories. Browser layout remains unverified under managed navigation policy.
- **Follow-ups:** Consolidated disposable-checkout gates and owner/classmate handoff; no production-readiness, live-provider or outside-custody claim.

## 2026-10-19 — Raouf: prepare independent handoff and tighten explorer provenance (Australia/Sydney)

- **Scope:** Phase 18 follow-up within its additive authority.
- **Summary:** Add pinned replay instructions and blank operator receipt; imported-data CLI commands require the loaded file, and local detail shows its separate capture pointer.
- **Files changed:** Explorer import/detail validation, copy-command UI and interaction tests; continuation handoff, receipt template and both logs.
- **Verification:** 15 explorer tests pass, including filtered export and imported-file CLI context. Fresh full-source/export verification confirms all 144 outcomes. No loaded producer claim is promoted to verification.
- **Follow-ups:** Finish aggregate/reliability checks and package the local dashboard and complete source history. External measurements remain explicitly open.

## 2026-10-19 — Raouf: align explorer output with repository checks (Australia/Sydney)

- **Scope:** Additive Phase 18 source/build maintenance; historical gate unchanged.
- **Summary:** Validate external link user-info via serialized origin; keep generated frontend/public index in ignored build cache. Preserve explicit record and detail source bounds.
- **Files changed:** Explorer URL validation, negative tests, Vite configuration, build/serve paths, README and both logs.
- **Verification:** Aggregate privacy scan initially flagged a URL API property; unchanged scanner now passes. Credential-bearing/executable URLs still refuse. All 16 explorer tests and production build pass.
- **Follow-ups:** Retain initial aggregate failures alongside corrected runtime prerequisite reruns; finish E2E and delivery.

## 2026-10-19 — Raouf: finish local continuation validation and delivery (Australia/Sydney)

- **Scope:** Phase 16–18 local fixes, dashboard/CLI, research index and independent handoff.
- **Summary:** Complete E2E gate passes 32 steps and 580 tests without skips; source/export and reliability replays pass. Keep initial base failures and corrected focused reruns visible.
- **Files changed:** Fresh validation record/receipts/log bundle, current navigation and both logs. No frozen evidence changed in the primary checkout.
- **Verification:** 16 explorer tests/build/HTTP/packaged CLI pass. Root unit run: 5,137 pass, zero fail, three skips; real Lean rerun resolves its two prerequisite skips. Rust 34 pass with Xvfb, fallback 4 pass on rerun. Default Docker npm build still fails; separate documented offline build and non-root mock/retirement smoke pass.
- **Follow-ups:** Owner/classmate handles independent reproduction. Browser/macOS, real provider lifecycle, harder externally held multi-model tasks, sustained deployment and real-data privacy remain scoped external inputs. No remote publication or paid inference performed.

## 2026-10-19 — Raouf: reconcile remote continuation before push (Australia/Sydney)

- **Scope:** Merge remote `4fb57b2c` with local dashboard continuation `71e4a5a9` at the owner's explicit push request.
- **Summary:** Preserve both histories and append-only logs. Retain remote maintained gateway/inventory/browser gate implementations; retain local dashboard, CLI, runtime helpers and review records. Navigation distinguishes the Phase 10 viewer snapshot from newer provider/native results.
- **Files changed:** Conflict resolution in current navigation, both logs and overlapping maintenance gates; no frozen provider captures/protocols modified.
- **Verification:** 40 merged-tree maintenance tests and 16 explorer tests pass; production build passes. No fresh provider inference or platform certification implied.
- **Follow-ups:** Push combined branch without rewriting remote history. Earlier downloadable bundles remain snapshots of their recorded commits.

## 2026-10-19 — Raouf: prepare professional reviewer README (Australia/Sydney)

- **Scope:** Owner-requested README rewrite for a technical reviewer and reproducible handoff.
- **Summary:** Lead with the measured control benefit and retained utility; keep the Luna zero-baseline result and unresolved live refusal explicit. Add an architecture diagram, complete result table, credential-free replay commands, dashboard/CLI scope, review routes and outstanding work. Link the completed local Phase 8 review without rewriting historical records.
- **Files changed:** `README.md`, `AGENT.md`, `CHANGELOG.md`. Runtime, frozen inputs and evidence are unchanged.
- **Verification:** README formatting and whitespace checks pass; all 34 local links/anchors resolve and no tracked Markdown links target removed root anchors. Corrected demo freshly replays all eight cases; complete transfer verification passes 288 comparison branches, original workflows and reliability storage checks. All five documented CLI examples execute and emit valid JSON. Used the existing pinned Python 3.12 environment; no fresh dependency install, model generation or platform validation is claimed.
- **Follow-ups:** Commit and push this handoff, then run the owner's requested full E2E smoke workflow against the resulting revision. Independent reproduction and provider/production boundaries remain explicit.

## 2026-10-19 — Raouf: declare full-smoke harness repairs (Australia/Sydney)

- **Scope:** Owner-requested full validation; bounded maintenance declared in `docs/research/smoke-validation-2026-10-19/DESIGN.md` before implementation.
- **Summary:** Preserve the initial 138-pass/four-failure aggregate. Repair login-shell PATH replacement and Xvfb reset-after-readiness setup; retain all substantive checks and frozen evidence. Diagnose fixed-port collisions without changing host network policy.
- **Files changed:** Declaration and both logs only.
- **Verification:** Root suite: 5,167 passed, zero failed, two Lean prerequisite skips. Reproduced Xvfb connection failures in a second four-case run. Current-commit native CI passes both macOS and Windows jobs; full E2E remains running.
- **Follow-ups:** Add behavioral launcher regressions, repair the declared setup, rerun complete workflows and publish exact scope and remaining prerequisites.

## 2026-10-19 — Raouf: stabilize full-smoke toolchain and display setup (Australia/Sydney)

- **Scope:** Maintained harness repair under preceding declaration `53260051`.
- **Summary:** Command steps now retain the caller's runtime PATH. Owned Xvfb fixtures disable reset after the readiness probe disconnects, preserving a stable display until explicit teardown. Scanner behavior and assertions are unchanged.
- **Files changed:** `scripts/check.sh`, `tests/unit/maintenance/checkRuntimeEnvironment.test.js`, `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs`, and both logs.
- **Verification:** Both quiet/verbose launcher regressions fail before repair and pass after it. Rust formatting passes; ten consecutive real mandatory-Xvfb runs pass all four cases (40 executions, no skips). Initial failures remain retained.
- **Follow-ups:** Run the complete base/E2E sequence on this repair with pytest and the real `origin/main` reference available; execute supplemental suites and publish scoped receipts. These checkout prerequisites do not change historical verifiers.

## 2026-10-19 — Raouf: complete full smoke validation and publish receipts (Australia/Sydney)

- **Scope:** Full base/E2E workflow and supplemental research/dashboard coverage on repaired implementation `ebf2a752`; additive validation and current README navigation.
- **Summary:** Both prescribed scripts pass after the declared harness repairs. Preserve original failures, setup corrections, exact source/toolchain receipts, all supplemental outcomes and the explicit managed-browser exclusion.
- **Files changed:** Fresh `docs/research/smoke-validation-2026-10-19/RESULTS.md`, `validation.json`, `logs.zip`; README validation link and both logs. No historical source, protocol, archive or evidence pin changed.
- **Verification:** Base 142/142 steps; E2E 32/32 steps and 580/580 tests. Root 5,171/5,171 tests with zero skips; Rust 34/34, explorer 16/16 plus production build and built-app HTTP/CLI agreement; 473 unittest cases across 29 research suites and 181 adapter pytest cases, without skips. Native CI at `2cf8ad69` passes 10 macOS and 11 Windows tests plus Windows fixture compilation; affected native paths are unchanged by the repair. Strict browser parity exits 1 with managed navigation blocked. All 358 recorded log/receipt files pass ZIP readback and per-file SHA-256 checks; original failures and focused red/green runs remain included.
- **Follow-ups:** Push repairs and documentation. Outside reproduction, real browser rendering/parity, opt-in provider campaigns and interactive platform/deployment checks remain explicitly unverified. Earlier delivery bundles retain their recorded snapshot revisions; no paid inference or outreach occurred.

## 2026-10-19 — Raouf: declare repository documentation audit (Australia/Sydney)

- **Scope:** Owner-authorized documentation audit and push from baseline `8d47bbbf`.
- **Summary:** Inventory every tracked document candidate; correct current guidance against implementation and primary sources. Preserve historical and frozen bytes with additive errata. Record manual review separately from automated coverage.
- **Files changed:** `docs/documentation-audit-2026-10-19/DESIGN.md` and both root logs.
- **Verification:** Remote branch matches baseline; initial inventory identifies 910 candidates across prose, rendered papers, evidence text and executable HTML. Standing gate-lifecycle invariants checked.
- **Follow-ups:** Complete source research, per-file ledger, corrections and documentation verification; no runtime or frozen-surface edits declared.

## 2026-10-19 — Raouf: audit documentation and align current guidance (Australia/Sydney)

- **Scope:** Documentation maintenance under preceding declaration `4ca41a95`; all 910 baseline document candidates individually inventoried and scanned. No production runtime, gate, test, dependency lock, frozen protocol, capture or manuscript bytes changed.
- **Summary:** Correct 27 current documents and add an integration matrix, documentation map, historical replay guide, 13-entry primary-source review and 20-item errata register. Separate the 144-outcome viewer from the 288-branch study, completed local review from independent review, and historical bundles from the current branch. Correct the legacy helper identifier/capture claim and demonstrate the historical tee pipeline's masked failure.
- **Files changed:** Current root/reviewer/application/component guidance, wiki navigation/log, new `docs/documentation-audit-2026-10-19/` records and audit tooling, and both root logs. The ledger names every baseline path and its exact review scope.
- **Verification:** 910/910 candidates accounted for; 881 unchanged and 29 changed including these two append-only logs. Parsed local links/anchors resolve; repository Prettier and diff checks pass. Original Node instrument: 31 tests, fresh offline report and verification pass. Corrected eight-case demo and six explorer CLI examples pass. Inspect: five tests and seven-sample mock smoke pass, retaining its intended execution failure. Auditor controls detect empty/missing inputs and broken links; pipeline controls preserve exit 73 with pipefail. Headline counts checked against raw reports; no paid inference.
- **Follow-ups:** Coverage is not universal semantic validation: 27 editorial updates, 37 selected-claim/scope reviews, two log reviews, two exact-archive checks and 842 automated-only candidates are explicitly distinguished. Historical scientific/citation review, independent custody, browser/accessibility, interactive platforms and real provider/deployment evidence retain their stated limits. Commit and push the audited documentation without rewriting history.

### 2026-10-19 (Australia/Sydney) — Manual documentation review checkpoint

**Owner-requested work; implementation and review by Codex assistance.**

- **Scope:** Continue the documentation audit under preceding authority `4ca41a95`, from
  baseline `15105bac`. This checkpoint records 181 complete manual reads out of 919 document
  candidates; 738 remain unread in this continuation. Reading and final claim verification
  are separate states. The exhaustive review is not complete.
- **Summary:** Correct HMAC student pseudonymization, platform key storage, periodic retention,
  audit-key prerequisites and trust limits, Linux startup, macOS CLI diagnostics, fixture
  logging/capture claims, adapter boundaries, consent wording and portable replay paths.
  Add 22 dated findings and exact per-file progress. Preserve historical paper/test/evidence
  defects with additive errata, including banking protocol/approval and scanner-scope gaps.
- **Verification:** Corrected Linux daemon builds and starts with health HTTP 200; owned process
  stopped. Both stored-response diagnostic scripts reproduce documented counts. All 19 shell
  blocks in edited guidance pass bash syntax checks. Local link checker reports 1,835 links in
  813 documents, zero issues. Official grant form, Evals dates and three related-work sources
  rechecked. No new model inference, human study, external outreach or production change.
- **Follow-ups:** Continue the remaining complete reads and final evidence checks. Native/browser,
  independent-operator and provider-lifecycle exclusions remain. This progress record must not
  be represented as completed manual review of all documentation.

### 2026-10-19 (Australia/Sydney) — Manual documentation review checkpoint: 281/919

Owner-requested work; implementation and review by Codex assistance.

- Read 100 additional documents completely since checkpoint `e46fa0c2`, bringing the
  continuation to 281 complete reads and 638 pending. This is not an exhaustive-review completion.
- Added paper, pilot, bibliography and reproduction errata M23–M31. Preserved frozen
  publication artifacts, evidence and existing log entries. Corrected current security guidance
  using Apple's and Microsoft's documented capture-affinity limitations.
- Verification is documentation-scoped: changed-file formatting, local links, exact baseline
  candidate coverage and preservation checks are recorded in the dated audit checkpoint.
  No new inference, human study, interactive desktop test or full E2E run is claimed.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 400-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under preceding declaration `4ca41a95`. The continuation now
  records 400 complete reads of 919 baseline candidates; 519 remain pending. This is not
  completion of the exhaustive audit. Frozen sources, publications and evidence are preserved.
- **Changes:** Add M32–M39 corrections for stage recipes, archived browser verifiers, legacy
  public-page claims, the personal résumé, dated continuation status and fixture limitations.
  Update current privacy and reviewer guidance for external font requests, banking withdrawal,
  Windows count semantics and the maintained dashboard route.
- **Evidence:** Retain the thirteen-case Node WebCrypto diagnostic for the archived Stage 5A
  page. Read the remaining local Phase 1–16 prose and compare small published receipts. The
  existing altered-family negative returns exit 1 naming F1/vulnerable. Recheck official OpenAI
  monitoring, multi-agent, vault and environment-security guidance. These are scoped checks,
  not a fresh full E2E run or interactive desktop/browser validation.
- **Validation:** Checkpoint receipt records formatting, local links, exact ledger identity and
  preservation checks. No inference, outreach, deployment, gate or runtime change.
- **Remaining:** Continue the unread stage records, plans, specifications and large logs;
  preserve unresolved runtime defects and outside-validation limits as explicit findings.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 500-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under preceding declaration `4ca41a95`. Read 500 of 919
  baseline candidates completely; 419 remain pending. This is a progress checkpoint.
- **Changes:** Add M40–M44 corrections for historical briefs, regulatory projection, early-stage
  measurements, reproduction commands and fallback claims. Preserve frozen stage files and
  scientific evidence; update current security and reviewer guidance directly.
- **Finding:** A local injected-client probe shows the preserved adapter converts an empty
  provider refusal into an availability failure, allowing fallback with refusal fallback off.
  Terminal local prechecks still prevent swaps. The mounted legacy live route is already
  retired with HTTP 410; direct module use and old revisions retain the mismatch.
- **Evidence:** Inspect committed AgentDojo metrics, adapter/orchestrator code and the Stage 3K
  metric implementation. Recheck official EU Article 73/113, Anthropic refusal/reference-event
  guidance and J-space monitoring limitations. No live provider call or runtime mutation.
- **Validation:** Retain the four-case local probe and document checks in the checkpoint receipt.
  No new full E2E, independent custody or interactive browser/desktop validation is claimed.
- **Remaining:** Continue all unread stage evidence, specifications, plans and large logs, then
  resolve outstanding source checks and validate the complete ledger before claiming completion.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 600-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under preceding declaration `4ca41a95`. Complete manual reads
  now cover 600 of 919 baseline candidates; 319 remain unread. The exhaustive audit continues.
- **Changes:** Add M45–M52 errata for Stage 3S–5S and the early live-AgentDojo overview.
  Separate legal reporting regimes, conditional cryptographic claims, recorded consistency,
  real observations, model runs and independent reproduction. Preserve all frozen records.
- **Evidence:** Link Stage 5Q's later falsification of Stage 5M's six-attack containment claim.
  Inspect the Stage 4P reproduce and CPC digest/emission code, the release-witness workflow,
  and the Stage 4K fixture builder. The corrected Stage 4K temporary-output rebuild runs
  under Node 26 and its deterministic ledger matches the committed bytes.
- **Sources:** Recheck Commission GPAI/incident guidance, NIST's agent-security RFI, RFC 3161
  accuracy semantics, Sigstore automated OIDC guidance and Anthropic's October 12 distillation
  update. Record source dates and distinguish vendor reports from project measurements.
- **Validation:** Record formatting, links, baseline identities, reviewed hashes and append-only
  preservation in the checkpoint receipt. No runtime changes, new inference, external ceremony,
  full E2E rerun or independent custody claim.
- **Remaining:** Continue every pending evidence document, specification, plan and large log;
  resolve remaining claim checks before marking the manual audit complete.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 700-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under preceding declaration `4ca41a95`; 700 of 919 baseline
  documents completely read, 219 pending. The exhaustive review remains in progress.
- **Changes:** Add M53–M56 corrections for evidence counts, skipped execution, unsupported
  live-regression attribution, reviewer-key independence and archive/timestamp identities.
- **Finding:** The frozen Stage 4M HTML module repeats `const fail` at top level and cannot
  parse. Exact extracted-module syntax check under Node 26 returns exit 1; the published HTML
  hash matches. Update current security and reviewer guidance; preserve the frozen artifact.
- **Validation:** Check changed-file formatting, local links, baseline identities, current read
  hashes and append-only preservation. No runtime repair, new inference, outside ceremony,
  fresh full E2E or interactive browser validation is claimed.
- **Remaining:** Read every pending specification, plan, evidence document and large log,
  resolve findings and validate the final ledger before claiming completion.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 735-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under preceding declaration `4ca41a95`; 735 of 919 baseline
  documents completely read, 184 pending. The exhaustive review remains in progress.
- **Changes:** Add M57–M62 corrections for reconstructed logs, the Stage 5P standalone verifier,
  publication versions, static architecture diagrams and early implementation plans. Disclose
  the Linux manifest/source license metadata conflict in the README without changing licensing.
- **Finding:** In temporary copies, the exact archived Stage 5P standalone verifier exits 0
  with missing auxiliary manifests, an invalid checkpoint signature or an incomplete pair census.
  Preserve the original; qualify security and reviewer guidance and retain the probe receipt.
- **Sources:** Check Rekor's checkpoint/trust-key requirements, RFC 9943's statement limits,
  arXiv citation versions, Cargo target selection and the XDG ScreenCast lifecycle.
- **Validation:** Record formatting, links, exact baseline identities, refreshed read hashes
  and append-only preservation in the checkpoint receipt. Frozen code and evidence remain intact.
  No new model inference, external ceremony, full E2E or interactive native/browser run.
- **Remaining:** Finish every pending plan, specification and large log, resolve remaining
  documentation findings and validate the final ledger before claiming completion.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 757-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 757 of 919 baseline
  candidates completely read, 162 pending. Exhaustive review remains in progress.
- **Changes:** Add M63–M68 corrections for voting/banking plans, early device specifications,
  and LLM benchmark methodology. Distinguish mock classification, browser behavior, native
  observation, consent and independently verified effects. Preserve historical specifications.
- **Finding:** Current banking rejection helpers retain arbitrary unknown key names. Trace the
  submit route in source, confirm helper behavior with a fictional marker, retain the scoped
  receipt and disclose the limitation in privacy/security guides. No runtime repair is claimed.
- **Sources:** Read TC39 string-length semantics; distinguish the living 2027 draft from a
  finalized 2026 edition. Do not count failed Bash webpage retrievals as verified sources.
- **Validation:** Check formatting, local links, exact baseline identities, reviewed hashes and
  append-only log preservation. No new model request, external ceremony, full E2E rerun or
  interactive browser/native test was performed for this documentation checkpoint.
- **Remaining:** Complete all pending plans, specifications and logs, resolve documentation
  findings and validate the final ledger before reporting the exhaustive review complete.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 783-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 783 of 919 baseline
  candidates completely read, 136 pending. Exhaustive review remains in progress.
- **Changes:** Add M69–M72 corrections for complete Stage 3D/3E plans/specifications and all
  October 15 assurance plans/contracts. Separate mock tests, API contracts, source findings,
  local recovery, dated results and independent validation. Preserve historical documents.
- **Findings:** Inspect retained gateway risk mapping, raw context prefixes, caller receipt
  strings and call accounting. An injected-fetch SDK 0.39.0 check confirms two default retries
  and generic error mapping on adapter timeout. No provider or socket request was made.
- **Guidance:** Update current security/privacy disclosures, retain a scoped probe receipt,
  and cite the official SDK retry/timeout reference. The legacy live route remains retired;
  these documentation changes do not repair direct module use or old revisions.
- **Validation:** Formatting, local links, exact baseline identities, reviewed hashes,
  append-only logs and frozen-surface preservation checked for this checkpoint. No new model
  capture, full E2E rerun, external ceremony or interactive browser/native test.
- **Remaining:** Finish every pending manual read, resolve documentation findings and validate
  the final ledger before reporting the exhaustive review complete.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 800-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 800 of 919 baseline
  candidates completely read, 119 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M73–M80 corrections for the complete Stage 3H core/Layer-2 and Stage 3I–3N
  plans and specifications. Distinguish proposed checks, implemented helper behavior, finite
  synthetic cases, retained outcomes and independently verified evidence.
- **Findings:** Local synthetic helper probes confirm permissive unknown-verdict mapping,
  default metric flags, omitted canonical `__proto__` members and limited claim-registry/hash-map
  checks. These scoped observations do not assert complete verifier or runtime exploits.
- **Guidance:** Update current security disclosures and preserve bounded probe receipts.
  Frozen evidence, historical specifications, runtime source and signing keys remain unchanged.
- **Validation:** Check formatting, local links, candidate identities, reviewed hashes,
  append-only log prefixes and frozen-surface preservation. No new model inference, signing,
  full E2E rerun, external ceremony or interactive browser/native execution.
- **Remaining:** Complete all pending manual reads and final correction verification before
  declaring the exhaustive documentation review complete.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 810-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 810 of 919 baseline
  candidates completely read, 109 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M81–M85 for the complete Stage 3O–3S specifications and plans, qualifying
  oracle/replica coverage, temporal continuity, fallback budgets and narrative verification.
- **Findings:** Bounded local probes demonstrate vacuous coverage, phrase exemptions, unbound
  narrative wording and incomplete standalone slot/receipt binding. These do not establish
  acceptance by the full campaign, smoke or hash/rebuild pipelines.
- **Guidance:** Update current security disclosures and retain scoped probe receipts. Preserve
  frozen plans, signatures, evidence and runtime source.
- **Validation:** Formatting, links, ledger identities and hashes, append-only log prefixes and
  frozen-surface preservation checked. No inference, signing, external ceremony or E2E rerun.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 820-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 820 of 919 baseline
  candidates completely read, 99 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M86–M90 for complete Stage 3T–3W specifications and plans, including
  metadata/collision guarantees, external replay metrics, capture provenance and release witnesses.
- **Findings:** Bounded synthetic probes confirm permissive adapter metadata and classifier
  parsing. Separate helper behavior from complete release checks. Record the frozen capture's
  conflicting decode declarations and preserve its signature and self-reported-origin limitation.
- **Guidance:** Update current security disclosures and check the official Llama Guard 4 card.
  Preserve frozen plans, evidence, signatures and runtime source.
- **Validation:** Check formatting, local links, ledger identities and hashes, append-only log
  prefixes and frozen-surface preservation. No inference, signing, external ceremony or E2E rerun.
- **Remaining:** Complete all pending reads and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 830-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 830 of 919 baseline
  candidates completely read, 89 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M91–M95 for complete Stage 3X, 4A-lite, 4D, 4F and integrated-gate plans
  and specifications. Qualify replay surfaces, finite equivalence, fixture signing and summaries.
- **Findings:** Direct Stage 4F verification accepts changed utility/frontier metadata with
  unchanged signed cell packs. Its frontier file is a digest, not an Ed25519 signature. Preserve
  a disposable-copy probe receipt and distinguish direct verification from golden comparisons.
- **Guidance:** Update README and SECURITY; check RFC 9162 against the retained Merkle helper.
  Preserve frozen evidence, source, specifications and signatures. Runtime repair is separate.
- **Validation:** Check formatting, links, ledger identities/hashes, append-only prefixes and
  frozen-surface preservation. No signing, inference, external ceremony or full E2E rerun.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 840-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 840 of 919 baseline
  candidates completely read, 79 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M96–M100 for Stage 4G and Stage 4H foundation through 4H.3 specs/plans.
  Distinguish declared campaign outcomes, historical milestones and current verifier behavior.
- **Findings:** Stage 4G uses synthetic pack hashes and declared outcomes. Stage 4H's main CLI
  omits its documented Q7/duplicate-key checks; selected enum counts do not bound total export
  information. Q6 summaries exercise diagnostic helpers rather than every full crypto path.
- **Guidance:** Update SECURITY and verify adaptive-attack bibliography identities (S28).
  Preserve frozen plans, evidence, signatures and runtime code; implementation repair is separate.
- **Validation:** Check formatting, local links, ledger identities/hashes, append-only prefixes
  and frozen-surface preservation. No signing, inference, external ceremony or full E2E rerun.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 850-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 850 of 919 baseline
  candidates completely read, 69 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M101–M105 for Stage 4H.4/4H.5, the unmerged full-chain addendum, and
  Stage 4J/4K/4L complete specs/plans; qualify manifest, accounting and reproduction claims.
- **Findings:** Temporary probes confirm ignored PCTA manifests and accepted producer-signed
  semantic discrepancies in PCTA/EBA/CCB. Correct current SECURITY guidance; retain probe
  receipts and distinguish missing semantic checks from signature forgery or deployed effects.
- **Research:** Check accessible PCTA/CCB primary research identities (S29–S30); preserve
  frozen records, captures, signatures and runtime source. Implementation repair is separate.
- **Validation:** Check formatting, local links, all baseline identities/read hashes, append-only
  prefixes and frozen-surface preservation. Probes used temporary inputs and ephemeral local
  test keys only; no inference, external ceremony, production signing or full E2E rerun.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 854-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 854 of 919 baseline
  candidates completely read, 65 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M106–M107 for the complete Stage 4M/4N specs and plans; correct README
  and SECURITY descriptions of signed bindings, disclosure bounds and reporting liveness.
- **Findings:** Local temporary probes confirm unsigned Tier-P disclosure/chain acceptance,
  unchecked VXD producer claims, and Stage 4N CLI authentication and band/schedule gaps.
  Distinguish fixed-artifact signature tests from verification of arbitrary supplied inputs.
- **Research:** Verify the frontier-safety reproducibility position paper identity and scope
  (S31). Preserve frozen plans, proof/runtime source, captures and signed evidence.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No inference, external ceremony or full E2E rerun; runtime
  repairs remain separate. Local probes used temporary inputs and explicitly scoped keys.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 858-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 858 of 919 baseline
  candidates completely read, 61 pending. Exhaustive review remains in progress.
- **Changes:** Add M108–M109 for the complete Stage 4O/4P specifications and plans;
  correct SECURITY guidance on selective membership, signer trust and custody replay.
- **Findings:** Temporary local probes confirm unauthenticated selective inclusion and
  clean-chain changes in 4O, and stored custody-signature booleans in 4P bundle replay.
  Qualify action binding, Lean ghost detection, CPC privacy and synthetic bridge claims.
- **Research:** S32–S33 distinguish primary research, samples and incident reporting
  from Simurgh measurements, architectural conformance and novelty assertions.
- **Validation:** Check formatting, local links, baseline identities/read hashes,
  append-only prefixes and frozen surfaces. Probes used temporary inputs and ephemeral
  keys; no retained source changes, inference, external ceremony or full E2E rerun.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 864-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 864 of 919 baseline
  candidates completely read, 55 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M110–M112 for full Stage 4Q/4R/4S specifications and plans; update
  SECURITY guidance on approval, private matching and delegation verification.
- **Findings:** Temporary probes establish exemption omissions, unbound supplied corpora,
  repeated mask-proof acceptance, fanout-owner gaps and unknown-tier fallback. Qualify
  human attendance, external identity, action binding, symbolic proofs and finite test scope.
- **Research:** S34–S36 distinguish primary prior art and official platform documentation
  from novelty, standards, legal, privacy and market-prevalence assertions.
- **Validation:** Check formatting, local links, baseline identities/read hashes,
  append-only prefixes and frozen surfaces. No runtime repairs, model inference, external
  ceremony or full E2E rerun; temporary probes leave retained evidence unchanged.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 870-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 870 of 919 baseline
  candidates completely read, 49 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M113–M115 for complete Stage 4T/4U/4V specifications and plans; update
  SECURITY guidance on capsule views, red-team findings and counter-capsule semantics.
- **Findings:** Temporary fixture-key probes establish omitted fields, contradictory views,
  unbound attack expectations, irrelevant recomputation and empty audit inventories. Qualify
  reported anchors, legal timing, local-process blindness, parity and symbolic proof scope.
- **Research:** S37–S38 qualify incident-reporting literature, California defenses and the
  NIST agent initiative; distinguish primary-source claims from implementation validation.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No runtime changes, model inference, external ceremony or
  full E2E rerun; all temporary probes preserve retained evidence and signatures.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 874-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 874 of 919 baseline
  candidates completely read, 45 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M116–M117 for complete Stage 4W/4X specifications and plans; update
  SECURITY guidance on displayed narrative claims, density and leakage-ledger completeness.
- **Findings:** Seven VSN probes and six VLR probes establish unbound prose, marker-only
  checking, empty/omitted audit outcomes and core-versus-CLI binding differences. Retain
  refusal controls and qualify symbolic proofs, local process boundaries and finite parity.
- **Research:** S39–S40 correct the C2PA textual-region comparison and qualify incident,
  benchmark, standards and institutional claims against primary sources.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No runtime changes, model inference, external ceremony or
  full E2E rerun; temporary probes preserve retained evidence and source bytes.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 878-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 878 of 919 baseline
  candidates completely read, 41 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M118–M119 for complete Stage 4Y/4Z specifications and plans; update
  SECURITY guidance on audit binding, replay coverage and workspace declarations.
- **Findings:** Seven VDR and eight VWA probe cases retain baseline/refusal controls while
  demonstrating unbound audit data, duplicate grids, producer-relative coverage and VSC trust.
  Qualify browser functionality, incomplete capture, symbolic proofs and finite parity.
- **Research:** S41–S42 check primary review/interpretability sources and NIST OSCAL required
  fields; distinguish incomplete projections and proposed adoption from verified conformance.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No runtime changes, model inference, external ceremony or
  full E2E rerun; temporary probes preserve retained evidence and source bytes.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 882-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 882 of 919 baseline
  candidates completely read, 37 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M120–M121 for complete Stage 5A/5B specifications and plans; update
  SECURITY guidance on optional-evidence omission, capture binding and replay truthfulness.
- **Findings:** Eight VNC and eight VAR probe cases demonstrate duplicate flag accounting,
  silent audit-depth reduction, unbound capture/results and outcome-label suppression.
  Baseline/refusal controls retained; no source or retained-evidence mutation.
- **Research:** S43–S44 check primary introspection, monitorability and red-team measurements;
  distinguish ablation effects, source publication dates and incompatible ASR denominators.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No runtime changes, model inference, external ceremony or
  full E2E rerun; temporary probes preserve retained evidence and source bytes.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 886-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 886 of 919 baseline
  candidates completely read, 33 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M122–M123 for complete Stage 5C/5D specifications and plans; correct
  SECURITY guidance on conditional completeness, severity labels and adaptive-ledger checks.
- **Findings:** Eight VSB and eight VARL probe cases retain baseline/refusal controls and
  demonstrate extra slips, omitted rate groups, missing audit input and unchecked declarations.
  Distinguish digest-derived severity, partial parity and finite proofs from stronger claims.
- **Research:** S45–S46 check primary metamorphic/guardrail research, the BrowseComp account
  and official Unicode standards; correct dates, denominators and normalization inferences.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No runtime changes, model inference, external ceremony or
  full E2E rerun; temporary probes preserve retained evidence and source bytes.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 890-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 890 of 919 baseline
  candidates completely read, 29 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M124–M125 for complete Stage 5E/5F specifications and plans; correct
  SECURITY guidance on score/review provenance and panel/capture/ceremony bindings.
- **Findings:** Eight VDA and eight VMP local probe cases retain baseline/refusal controls;
  qualify review equivalence, empty curves, adapter replay, census semantics and strict policy.
- **Research:** S47–S48 check official model/loading contracts, the voluntary GPAI Code
  and extensible in-toto/C2PA formats; remove unsupported scope and novelty inferences.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No runtime changes, model inference, external ceremony or
  full E2E rerun; temporary probes preserve retained evidence and source bytes.
- **Remaining:** Complete every pending manual read and final correction verification.

### 2026-10-19 (Australia/Sydney) — Manual documentation audit: 894-file checkpoint

**Raouf / Codex-assisted maintenance:**

- **Scope:** Documentation only under prior declaration `4ca41a95`; 894 of 919 baseline
  candidates completely read, 25 pending. Exhaustive manual review remains in progress.
- **Changes:** Add M126–M127 for complete Stage 5G/5H specifications and plans; correct
  SECURITY guidance on foreign-capture anchoring and disclosure-tier reviewer facts.
- **Findings:** Eight VFC and nine VSD local probe cases qualify corpus/census binding,
  mock Sigstore identity, ceremony corroboration, receipt outputs and portable verification.
- **Research:** S49–S50 compare official Sigstore requirements, Stanford FMTI figures,
  Epoch benchmark methodology and Commission GPAI applicability/enforcement dates.
- **Validation:** Check formatting, local links, baseline identities/read hashes, append-only
  prefixes and frozen surfaces. No runtime changes, model inference, external ceremony or
  full E2E rerun; temporary probes preserve retained evidence and source bytes.
- **Remaining:** Complete every pending manual read and final correction verification.
