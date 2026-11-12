# Gap hunt over new papers, standards and lab posts, 12 November 2026

The three earlier hunts (31 October, 1 November, 8 November; ids G01 to G38 and N01 to N12) read
what the labs publish. This one reads three fronts they left out: papers posted in the last three
weeks, a standards text, and incident reports. It also reads the one lab post published since the
last hunt that bears on authority.

Method and limits:

- **Papers.** The arXiv API was queried for abstracts containing "prompt injection" and "agent",
  newest first (40 results, 22 October to 9 November 2026), and for 14 further ids that a web
  search surfaced. 53 abstracts were read. None is in the literature survey of 11 November.
  **Only abstracts were read.** Every number below is the abstract's own and is quoted from it.
- **Standards.** The NIST post of 27 October 2026 that proposes ten design tenets for agent
  identity was read in full from `nist.gov`. A Cloud Security Alliance note of 9 November was read
  as a secondary source.
- **Lab posts.** Anthropic's research index and Alignment Science index were read on 12 November.
  One new post bears on authority ("Worse Together", 11 November) and was read in full. No OpenAI
  page dated November was found by search; OpenAI's pages were not read directly.
- **Incidents.** Only secondary trackers were found. Anything from them is marked "reported".
- Verdicts: KNOWN means the source already did what a Simurgh claim might present as new. SUPPORTS
  means it corroborates a Simurgh result. EXTENDS means it measures an axis Simurgh holds fixed.
  NOT COVERED proposes a new id.

Simurgh's side is read as of `main` at `defc3dc4` plus the 12 November documentation check: lanes
19a to 19m, the gate replays 19j and 19l (1,439 wrong sends replayed, none landed, 217 of 217
exact authorised sends admitted), and the open IOUs.

## 1. What the last three weeks published, against Simurgh's claims

| #   | Source (arXiv id, date)                                                         | What it reports, in its own words                                                                                                                                                              | Nearest Simurgh artifact                                                                                           | Verdict                                                                                                |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 1   | Treating the Model as an Untrusted Component (2611.11571, 8 Nov)                | On Qwen2.5-1.5B and Qwen2.5-7B, "the models proposed the attacker's call in 64% and 84% of attack episodes behind the task-bound monitor, which admitted 1.3% and 7.7%"                        | 19j, 19l gate replay; 19m captured both of these models                                                            | KNOWN: enforcement outside the model, validated on the same open-weights models, with an effect oracle |
| 2   | same paper                                                                      | "a naive monitor admits 18 of 33 effective attack variants, a hardened one 6 and a capability-bound one 1"                                                                                     | 19c route corpus, 19b forged-token matrix                                                                          | EXTENDS: argument-fuzzing attackers; Simurgh's attacks are fixed texts                                 |
| 3   | same paper                                                                      | "a human layer without a deterministic monitor fails against approval spamming unless each episode has a deterministic approval budget"                                                        | 19b approval token                                                                                                 | NOT COVERED: no approval budget and no approval-spam case: **G41**                                     |
| 4   | LeanGuard (2611.02332, 2 Nov)                                                   | A runtime "checks every proposed tool call against a policy written in Lean4"; "the decision procedure is proved equivalent to a LeanLTL semantics"; five Qwen models, 0.8B to 27B             | 19b Lean differential over the gate's state space                                                                  | KNOWN: a Lean-verified guardrail for tool calls exists; Simurgh's Lean checks a model, not the runtime |
| 5   | Understanding and Mitigating Role Spoofing (2610.40396, 29 Oct)                 | Models "attribute the source of text based on its style instead of its labeled role"; training against content-based injection "leaves the model susceptible to structure-based attacks"       | 19i, 19k, 19m styles `host_block` and `tool_result`                                                                | SUPPORTS, and names it: the spoofed host block and tool result are role spoofing by structure          |
| 6   | Where You Inject Matters (2610.38867, 28 Oct)                                   | "agent susceptibility varies across injection placements"; a README or TODO placement is followed "2.6 times more often on average than the same instruction placed in a code or data file"    | Every 19i to 19m injection sits in one place, the untrusted source field                                           | EXTENDS: placement is a variable Simurgh holds fixed: **G42**                                          |
| 7   | Beyond Instruction Override (2611.07640, 5 Nov)                                 | An attack is content that "attempts to influence a decision that its source is not authorized to determine"; a tool-policy defence "still allows 15.4% attack success, close to 17.0%"         | `unknown_prior` is the state most moved on every eligible model (62, 46 and 93 of 120)                             | SUPPORTS the state reading; EXTENDS: attacks on decision rules, actions and state beliefs: **G43**     |
| 8   | PCM: Proof-Carrying Messages (2610.39109, 29 Oct)                               | "A claim that rests only on the agent's own report is never proven"; authority travels as "grant chains rooted in a recorded human approval, and the chains can only narrow"                   | Phase 19 laws on agent-writable text; 19b host-issued approval                                                     | KNOWN: G30 and G32 now have direct prior art with a 926-message benchmark                              |
| 9   | CapLease (2608.01710, 3 Aug)                                                    | "semantic replay: exceeding the execution budget of a token-independent authorization instance"; the fix is "durable authorization state"                                                      | Phase 17 retry and sibling budget; 19b outage hold with the budget kept reserved                                   | KNOWN: cite it; Simurgh's `unknown_prior` budget is an instance                                        |
| 10  | AgentCap (2611.00729), ScopeGate (2606.28679), OAP (2603.20953), six others     | "agent security requires authorization of model-proposed effects at the tool boundary, independently of the model's reasoning" (AgentCap)                                                      | The composed gate                                                                                                  | KNOWN: at least ten papers build the same kind of gate; the gate is an instance, not a contribution    |
| 11  | Adaptive Evaluation of Out-of-Band Defenses (2606.26479, 25 Jun)                | "every one of them is validated only on static benchmarks"; on Qwen2.5-7B a hand-written adaptive attack did not raise success, and "a stronger optimized (white-box GCG) attack remains open" | 19e informed-attacker bundle, `not_run`                                                                            | NOT COVERED: G35 stands, and static-only is now named a weakness by the field                          |
| 12  | Scaling Adaptive Prompt Injection Attacks with Agent Swarms (2611.11861, 9 Nov) | "an agentic attacker of increased capabilities can reliably trick model to follow instructions in tool output"                                                                                 | none                                                                                                               | NOT COVERED: G35                                                                                       |
| 13  | Harness Matters (2611.11971, 9 Nov)                                             | "both harness and backend model significantly affect security outcomes"                                                                                                                        | 19m stopped `qwen2.5-3b-4bit` because the reader could not read 21 of its 24 sends                                 | NOT COVERED as a reported quantity: **G40**                                                            |
| 14  | Scope-Gap Injection (2610.34777, 26 Oct)                                        | A judge "appears to inspect the task instruction and skill definition without inspecting attachment contents, while the agent reads attachments"                                               | 19a census of what the gate reads; 19m reader                                                                      | SUPPORTS the non-reading design; the same gap exists in Simurgh's own measuring reader: G40            |
| 15  | NetInjectBench (2607.10490, 11 Jul)                                             | On Qwen2.5-7B, Llama3.1-8B and Mistral-7B "naive execution reached an 82.50% unsafe tool-action rate"; static allowlisting "blocked all approved changes"; a policy gate gave "0/240"          | 19m: `llama-3.1-8b-4bit` sent in 115 of 120 control cases; 19j and 19l cost on authorised                          | SUPPORTS: same models, same shape, and the same cost-on-authorised measure                             |
| 16  | Thought Injection (2611.08811, 6 Nov)                                           | "the effects of thinking tags and payload styles are all properties of the specific target model"                                                                                              | H2 held on 0 of 2 eligible models in 19m; styles reorder between builds                                            | SUPPORTS: the ordering of styles is a property of the model                                            |
| 17  | Instrumental Monitor Evasion (2609.30217, 24 Sep)                               | Agents "retry until relevant context leaves the monitor's history"; "Effective oversight must therefore remain robust against repeated attempts"                                               | 19c cumulative limit, one receiver                                                                                 | PARTIAL: no repeated-attempt lane with a live model: G34                                               |
| 18  | MemHarmBench (2611.01700), ErosionBench (2611.11266)                            | "cross-session attacks can remain behaviorally stealthy"; "Perimeter defenses suppress attacks only by over-refusing 54-92% of legitimate work"                                                | Phase 7 host-owned checkpoint                                                                                      | PARTIAL: G34 and G37 stand; over-refusal is the number to report beside any block rate                 |
| 19  | Right Tool, Wrong Parameters (2611.04673, 3 Nov)                                | "the attacker preserves the intended action but manipulates one or more tool arguments"                                                                                                        | The contract admits only the exact report; the credential gateway alone stopped 50 wrong sends for altered content | COVERED for the fixed contract only; open-ended arguments are not modelled                             |
| 20  | Redefining AI Security Incident Reporting for Agents (2609.24515, 21 Sep)       | Reporting elements "include, for example, agent memory and memory accesses, actual and potential levels of autonomy, and tool usage"                                                           | 19g incident record schema                                                                                         | PARTIAL: the schema has not been compared with these elements                                          |
| 21  | NIST, design tenets for agent identity (27 Oct), tenets 07 and 08               | "Guardrails alone are insufficient"; "Organizations maintain deterministic capabilities as the primary mechanism for making access decisions"                                                  | The gate thesis                                                                                                    | SUPPORTS: the thesis is now a proposed federal design tenet                                            |
| 22  | NIST tenets 01, 02 and 06                                                       | "unique, cryptographically verifiable identification of agents"; "scopes attenuate"; "cryptographically signed mandate statements"                                                             | Receipts carry no agent identity and no signed mandate; delegation is a fixture state                              | NOT COVERED: **G44**, which absorbs G36                                                                |
| 23  | NIST tenet 05                                                                   | Escalation must be "cognizant of consent fatigue where human escalation becomes so frequent that agentic actions are approved habitually"                                                      | 19b approval token                                                                                                 | NOT COVERED: G41                                                                                       |
| 24  | NIST tenet 10                                                                   | "This logging infrastructure is independent of the agent to prevent modification"                                                                                                              | Packs and audit chains; 19a manifest of agent-writable channels                                                    | PARTIAL: evidence is produced in the author's custody; `IOU-19-OPERATOR` is paid in part               |
| 25  | Anthropic, Worse Together (11 Nov)                                              | "65–77% of team episodes included at least one edit against the ask"; "blocking agents from placing an order until they had read their messages rescued more failed group orders"              | Every Simurgh gate has one principal                                                                               | NOT COVERED: authority between principals on a shared resource: **G39**                                |
| 26  | Reported incidents (secondary trackers, November)                               | Reported: one prompt to an exposed agent service pulled metadata-service credentials; reported: an injection made a coding assistant register a malicious tool server                          | 19d egress lane; 19c run-bound credentials                                                                         | PARTIAL for the credential route (G14); NOT COVERED for changing the tool catalogue: **G45**           |

Tally over 26 rows: 5 KNOWN, 6 SUPPORTS, 2 EXTENDS, 7 NOT COVERED, 5 PARTIAL, 1 COVERED under
scope. Rows 7 and 26 carry two verdicts and are counted under the first.

## 2. What this changes in how Simurgh's results should be stated

1. **The gate is not the contribution.** Deterministic enforcement outside the model is what NIST
   now proposes as a tenet and what at least ten papers build. One of them (row 1) validated it on
   two of the models lane 19m captured, with an oracle that judges effects. The manuscript already
   calls the replay a correctness check; it should also cite rows 1, 10, 11 and 15.
2. **Small open-weights models are not new ground.** Qwen2.5-7B appears in rows 1, 11 and 15, and
   Llama 3.1 8B in row 15. What Simurgh still has that these abstracts do not claim: hypotheses
   and stopping rules fixed before the run, packs a stranger can recompute, counts by restricted
   state, and five wordings per style.
3. **"Lean-checked" needs its scope said.** LeanGuard checks each call at run time against a Lean
   policy. Simurgh's Lean result is a differential check of a model of the gate. The two are
   different claims and the manuscript should say which one it makes.
4. **Static attacks are now a named weakness.** Rows 11 and 12 say so, and row 1 simulates an
   adaptive attacker driving every guardrail stack to 100.0% while a task-bound monitor holds.
   Simurgh has no adaptive or informed attacker run. Until G35 is paid, every Simurgh result is an
   uninformed, static-attacker result and should carry that phrase.
5. **Three Simurgh findings are corroborated, not first.** Style and wording effects belong to the
   model (rows 5 and 16). The state the model believes it is in is an attack surface that
   defences miss (row 7), which is what `unknown_prior` shows. Cost on authorised actions is the
   number to report beside any block rate (rows 15 and 18).
6. **The measuring instrument is part of the result.** Row 13 measures harness effects directly.
   Simurgh met one by accident: a model was stopped at the positive control because the reader did
   not accept its call syntax. That is a finding about the instrument and should be reported as
   one.

## 3. New gap candidates (G39 to G45)

- **G39 Authority between principals on a shared resource.** Several users' agents edit one
  order, booking or budget, and one agent overrides another user's request. Who bleeds: every
  product row 25 names (group carts, shared channels, shared compute). Tomorrow test: MAMUBench is
  released; a gate that knows who owns each item could be run on its order and booking
  environments. Blocker: an ownership model for items, and an adapter from the benchmark's actions
  to typed actions.
- **G40 Reader coverage as a reported quantity.** For each model, the share of outputs the strict
  reader cannot classify, measured on a wire-form census before the model enters a study, with the
  decoder set declared first. Who bleeds: any study that reads tool calls with a fixed parser,
  Simurgh's own included. Blocker: none; it is free on the local models and turns the
  `qwen2.5-3b-4bit` stop into a method.
- **G41 Approval budget and approval spam.** A deterministic limit on approval requests per
  episode, and a case where an injected agent floods the approver. Who bleeds: deployers relying
  on human approval (NIST tenet 05). Blocker: a simulated approver with a stated error model; no
  human study is proposed.
- **G42 Placement as a controlled variable.** The same injected text placed in a tool result, a
  document the task reads, and a field next to the trusted state. Who bleeds: anyone reading a
  style ranking as a property of the text. Blocker: none; it reuses 19k's schedule and is free.
- **G43 State-belief tampering lane.** Injections that do not ask for the send but misstate the
  state, the decision rule or the available actions. Who bleeds: defences that pass tool-policy
  checks (row 7). Blocker: new cases written before any model sees them; free on local models.
- **G44 Agent identity and signed mandate in the receipt.** Which agent, on whose mandate, under
  which approved configuration. Who bleeds: evaluators and deployers who must attribute an action
  (NIST tenets 01, 02, 06). Blocker: no provider signs per-call identity; a mandate signed by the
  host is buildable, an identity the provider attests is not. Absorbs G36.
- **G45 Changing the tool catalogue as a gated action.** Registering, replacing or re-describing a
  tool is treated as an action the gate must admit. Who bleeds: users of assistants that can add
  tool servers. Blocker: the gate takes typed actions on a fixed catalogue; the catalogue itself
  is not modelled. Source is a reported incident and one paper on tool-metadata injection
  (2610.36108), so this is the weakest-sourced candidate.

Priority, with the reason for each:

1. **G40**, then **G42** and **G43**. All three are free, run on the machine that ran 19m, and
   extend the pre-registered design along axes the field named this month.
2. **G35.** Three sources now treat an adaptive attacker as the standard. It needs the API key
   and spending cap that `IOU-19-SPEND` waits on.
3. **A tenet-by-tenet statement against the NIST post.** One page, no new evidence: which of the
   ten tenets a Simurgh artifact meets under its stated scope, and which it does not.
4. **G39.** The newest lab need and the only one with a released benchmark, and also the largest
   build.

## 4. What the manuscript's related work owes

Not in the 11 November survey and bearing on a claim the manuscript makes: 2611.11571,
2611.02332, 2610.40396, 2610.38867, 2611.07640, 2610.39109, 2608.01710, 2611.00729, 2606.28679,
2603.20953, 2606.26479, 2611.11861, 2611.11971, 2607.10490, 2611.08811, 2609.30217, and the NIST
post of 27 October. The manuscript is on hold; this list is for when it is taken up.

## 5. Not yet in Zurvan

The 53 abstracts, the NIST post and "Worse Together" were saved outside the repository and are
being ingested into Zurvan with this hunt. Full texts of the papers were not fetched.

## 6. Limits of this hunt

- Abstracts only. A paper's abstract can overstate or omit; no verdict above was checked against a
  paper's body, its code or its data.
- The search was one arXiv query and one web search per front. Papers that do not use the words
  "prompt injection" and "agent" in the abstract were missed unless the web search found them.
- KNOWN is a statement about novelty, not about quality. It does not say the other work is right.
- Incidents come from secondary trackers and were not checked against vendor advisories.
- OpenAI's own pages were not read for this hunt.
