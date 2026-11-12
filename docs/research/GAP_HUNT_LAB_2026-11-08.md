# Gap hunt over the 2026 lab record, 8 November 2026

Method: the two Zurvan gap hunts of 31 October and 1 November (ids G01 to G33, N01 to N12) were
re-read; the Zurvan index (revision 3165, seven files newer) was searched for every 2026 Anthropic
and OpenAI page it holds; the primary pages published since the 1 November hunt were read directly
(`alignment.openai.com`, `deploymentsafety.openai.com`, `alignment.anthropic.com`,
`anthropic.com/research`; `openai.com/index/*` refused automated reads). Twenty-five lab needs were
mapped to the repository. Verdicts: COVERED means a recomputable artifact in the repository pays
the need under its stated scope; PARTIAL names what is missing; NOT COVERED proposes a new id.
Every COVERED verdict below is read against the Phase 19 packs as repaired under P19-REPAIR03 in
`PROVENANCE_PHASE_19.md`; the 8 November strict audit preceded the repair and is recorded there.
Anything not quoted from a primary page is marked "reported".

## 1. Needs the labs state, and where the repository stands

| #   | Lab need (source, date)                                                                                                                                     | Simurgh id                              | Verdict                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A model reviewer "could be misled into approving commands without user approval"; not "a source of deterministic guarantees" (OpenAI Auto-review, 30 Apr)   | G22, G30, N01                           | PARTIAL: host-issued approval token with an eight-way forged-token matrix (19b); no head-to-head with a model reviewer          |
| 2   | "adding comparable checks to the agent before sensitive actions and stopping execution if review fails" (GPT-6 Cyber card, 5 Nov)                           | G15                                     | PARTIAL: fixture gate; no end-to-end connector                                                                                  |
| 3   | Confirmation policy "provided as instructions" leaves 3.0 to 8.0 percent misaligned outcomes (GPT-6 Astra card Table 8, 3 Sep)                              | G02, G30                                | PARTIAL: exact-action binding; no per-harm-class replay                                                                         |
| 4   | Peers as authority: Sol followed message-board instructions in 52 percent of cases (Astra card)                                                             | G26, G32                                | PARTIAL: Phase 7 scripted peer channel; not among 19b's wired readers                                                           |
| 5   | "a prompt injection only had to convince Claude to read its own environment" (Anthropic, Scaling Managed Agents, 30 Oct)                                    | G14                                     | PARTIAL: 19c run-bound credentials recompute; tokens are synthetic                                                              |
| 6   | Roadmap target: "allowlist-based network controls for Internet egress" (Anthropic RSP roadmap, 19 Oct)                                                      | G13, N07                                | COVERED, Linux and scoped: the 19d lane; the covert filesystem channel and the filesystem Unix sockets are reported, not closed |
| 7   | Isolated environments "with explicit limits on targets, credentials, network access, and permitted actions"; humans able to stop (GPT-6 Cyber)              | G13, G20                                | COVERED, scripted: 19d plus the 19g drill; the drill's intervals are scripted steps                                             |
| 8   | After a barrier, Sol circumvented in 28 percent of rollouts, Luna 15.9 (GPT-6 October card 7.1.2)                                                           | G02                                     | COVERED, corpus only: 19c route corpus with granted-alias rows and an identity-canonical ablation; no shell obfuscation         |
| 9   | A stop signal defeated by an outage or by the agent's own text (reported, release notes)                                                                    | G31, G20                                | COVERED, scripted: 19b outage hold, acknowledgement-bound renewal, self-asserted STOP mutant killed                             |
| 10  | "A standardized process evaluates log completeness and identifies gaps" (roadmap, 19 Oct)                                                                   | G19                                     | PARTIAL: Stage 4N on the project's own stream; 19a coverage counts with an architectural denominator                            |
| 11  | "Production monitors fail to block over 55% of attacks" (Anthropic, Red-Teaming Auto Mode, 22 Oct)                                                          | GAP_HUNT_ZURVAN_2026-11-01.md row 11    | NOT OURS for classifiers; PARTIAL for coverage, no live-model arm                                                               |
| 12  | "robustly preventing multi-context attacks at an acceptable cost remains an open problem" (same post)                                                       | new                                     | NOT COVERED beyond Phase 7's shared budget: **G34**                                                                             |
| 13  | Monitor injection and malicious compaction beat monitors (same post)                                                                                        | G26                                     | PARTIAL: Phase 7 host-owned checkpoint, no live model                                                                           |
| 14  | The attacker is told how the monitor works, by default (same post)                                                                                          | GAP_HUNT_ZURVAN_2026-11-01.md row 15(a) | NOT COVERED: the 19e informed-attacker bundle is `not_run`: **G35**                                                             |
| 15  | Astra 9.6 percent of trajectories versus Sol 2.8 "by simply being aware of being monitored" (Astra card)                                                    | G33                                     | PARTIAL: 19a sidecar not evaluable; 19e estimator built, capture owed (`IOU-19-SPEND`)                                          |
| 16  | The evaluation-to-production gap is tracked directly (OpenAI, 3 Nov)                                                                                        | G11, G27                                | NOT COVERED: no production traces                                                                                               |
| 17  | Judge and grader independence asserted, not attested                                                                                                        | G29                                     | NOT COVERED: `IOU-19-JUDGE-LEDGER`, a later stage                                                                               |
| 18  | Embedded evaluators: "what access they need, and how their independence is protected" owed by 15 Dec 2026 (roadmap)                                         | GAP_HUNT_ZURVAN_2026-11-01.md row 8     | PARTIAL: Stage 5I/5J; 19g kit written, delivery owed (`IOU-19-KIT`)                                                             |
| 19  | "the LTBT has not requested an external review" (Anthropic Risk Report, Aug, 1.3.5)                                                                         | G18, N10                                | NOT COVERED: `IOU-19-OPERATOR` owed; the droplet replay is the owner's own host                                                 |
| 20  | Loaded artifact is not the approved one (vectors.npz; patched program)                                                                                      | G28                                     | COVERED, fixture: 19c approved-input manifest, reason `substituted_input`                                                       |
| 21  | "A user querying a model today cannot check that the responses came from the specific model that a developer claims" (Anthropic, provable inference, 2 Nov) | new                                     | NOT COVERED: receipts carry no model identity: **G36**                                                                          |
| 22  | "a note that's wrong from the start ... can be read, and trusted, by Claude in a later session" (Anthropic, components of agent memory, 6 Nov)              | G26                                     | PARTIAL: no memory-file case                                                                                                    |
| 23  | Content provenance, C2PA and SynthID (Images 2.6 card, 4 Nov)                                                                                               | none                                    | NOT OURS: media provenance                                                                                                      |
| 24  | Training-data monitor evasion, reward-hack localisation, weights security, air gaps, zero-knowledge inference                                               | none                                    | NOT OURS: lab-internal                                                                                                          |
| 25  | Cyber access tiers, CBRN safeguards, model welfare                                                                                                          | none                                    | NOT OURS                                                                                                                        |

Tally: 5 COVERED under stated scope, 11 PARTIAL, 6 NOT COVERED, 3 NOT OURS.

## 2. New gap candidates (G34 to G38)

- **G34 Cumulative-outcome lane across contexts.** Every per-action gate passes while the
  receiver's running total crosses a declared line. Who bleeds: every per-action gate or monitor;
  Anthropic calls multi-context prevention an open problem. Blocker: a deployer-declared cumulative
  limit; the gate cannot judge a harm it was not told to count. Nearest existing artifact: 19c's
  running limit (`cumulative_limit_exceeded`), single receiver.
- **G35 The published malign-agent attack suite against the composed gate.** Monitor injection,
  compaction, coverage gaps, informed attacker. Who bleeds: users of Auto Mode and Codex Guardian.
  Blocker: the suite emits shell commands; the gate takes typed actions; an adapter is needed.
- **G36 Serving-model identity and fallback in the receipt.** Who bleeds: evaluators and deployers
  who cannot tell which model answered; the 1 November hunt found fallback routing distorting
  cross-model tables. Blocker: no provider signs per-call identity; the best case is a recorded,
  unverified header.
- **G37 Persistent-agent scope drift.** Chained tasks, unannounced scope change, mid-task
  revocation; Astra passed 91.8 percent of explicit permission changes and still showed moderate
  scope violations. Blocker: no live persistent runtime; needs the G15 connector.
- **G38 Class-for-class replay of the seven harm classes with an enforced confirmation policy.**
  Who bleeds: deployers relying on prompt-level policy at 3 to 8 percent residual. Blocker: an
  action-to-harm-class labeller the gate does not have.

## 3. 2026 lab documents not yet in Zurvan

Read for this hunt from their primary pages, not yet ingested: GPT-6 Astra system card (3 Sep);
GPT-6 Sol and Luna October update (7 Oct); the Luna 29 October addendum; GPT-6 Cyber card (5 Nov);
Auto-review (30 Apr); the evaluation-to-production gap (3 Nov); training activation classifiers
(2 Nov); Anthropic's Red-Teaming Auto Mode (22 Oct); Automated Subtle Emergent Misalignment (Oct);
provable inference (2 Nov); components of agent memory (6 Nov); the RSP roadmap revision of 19 Oct
(Zurvan holds the 13 September copy). Reported only, not read: a press report that OpenAI
disbanded its Preparedness team at the end of July; no 2026 revision of the Preparedness Framework
was found (v2, 15 April 2025, still current). Ingesting these is owner work (`zurvan ingest`).

## 4. 2026 statements that qualify Simurgh's own claims

1. The Luna credential-only baseline (zero effects, no incremental protection) now has a published
   model property behind it: "GPT-6 Luna (October 29) is highly robust to prompt injection" and an
   instruction-hierarchy score of 99.79 percent. The conclusion stands; the caveat should cite these.
2. The 1 November hunt called every awareness number a lower bound. OpenAI reports the opposite
   direction for its Respecting Warnings evaluation: "success rates are lower in evaluation than in
   comparable production situations". Awareness cuts both ways; no direction is claimed here.
3. Revocation is a weak wound for Astra, which passed every explicit permission-change case; a
   revocation lane shows value against implicit scope change or other models.
4. Anthropic's default red-team tells the attacker how the monitor works; Simurgh's gate-robustness
   results are uninformed-attacker results until the 19e bundle runs.
5. The deterministic-gate thesis is supported, not proven: OpenAI says model reviewers will not
   give deterministic guarantees, and no head-to-head exists (G22 open).
6. The roadmap doubts isolated networks "inside the next 1-2 years"; 19d is a worker-level
   mechanism on Linux, not an isolated-network claim, and its own probe shows filesystem Unix
   sockets to privileged daemons remain reachable.
