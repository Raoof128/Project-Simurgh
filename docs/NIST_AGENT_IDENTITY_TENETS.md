# Simurgh against NIST's ten design tenets for agent identity

On 27 October 2026 NIST proposed
[ten design tenets](https://www.nist.gov/blogs/cybersecurity-insights/design-tenets-agent-identity-management-systems)
for systems that identify and authorise AI agents. This page takes them one at a time and says
what this repository can show for each, and what it cannot. It adds no evidence. Every number
comes from a committed receipt that a reader can recompute.

Read as of `main` at `158895e4`, which holds Phase 19 lanes 19a to 19m. Verdicts are the ones the
[12 November gap hunts](research/GAP_HUNT_PRIOR_ART_2026-11-12.md) use: COVERED means a
recomputable artifact pays the tenet under the scope stated beside it; PARTIAL names what is
missing; NOT COVERED means no artifact addresses it.

| Tenet                                                | Verdict              |
| ---------------------------------------------------- | -------------------- |
| 01 Distinct agent identification                     | NOT COVERED          |
| 02 Agent linking, delegation and attenuation         | NOT COVERED          |
| 03 Least and zero standing privilege                 | PARTIAL              |
| 04 Short-lived, dynamic and revocable authorisation  | COVERED, under scope |
| 05 Human-in-the-loop triggers                        | NOT COVERED          |
| 06 Mandates and constraints                          | NOT COVERED          |
| 07 Architectural separation of policy from reasoning | COVERED, under scope |
| 08 Deterministic access decisions                    | COVERED, under scope |
| 09 Continuous monitoring                             | PARTIAL              |
| 10 Immutable evidence                                | PARTIAL              |

Three covered under a stated scope, three partial, four not covered. The three that are covered
are the ones about deciding an action outside the model. The four that are not are about who the
agent is and on whose signed word it acts.

## The tenets one at a time

**01 Distinct agent identification.** The tenet asks for "the unique, cryptographically
verifiable identification of agents". Nothing here provides it. Simurgh's receipts and decision
records name a run, a task and a state. They do not name an agent, and no key belongs to one.
NOT COVERED; gap candidate G44.

**02 Agent linking, delegation and attenuation.** The tenet asks that "scopes attenuate so that
downstream entities can never claim more authority than the parent". One piece exists as a
scripted state: when a parent delegation is revoked (`ancestor_revoke`), the composed controls
block the send. No lane links an agent to the person who started its task, and none shows a
sub-agent holding less authority than its parent. NOT COVERED; G44.

**03 Least and zero standing privilege.** The tenet describes agents "holding no persistent
rights when idle". Lane [19c](research/provenance-phase-19c/RESULTS.md) binds a credential to
one run and adds per-call limits, a running limit, a grant scope and administrative revocation
at the receiver. Lane [19d](research/provenance-phase-19d/RESULTS.md) gives a worker no network
route except a proxy its parent owns. The credentials are synthetic, the receiver is a local
process, and separation of duties is not addressed. PARTIAL.

**04 Short-lived, dynamic and revocable authorisation.** The tenet asks that each tool call
"undergo continuous runtime verification based on current state". This is what the composed
controls do. Every send is decided at dispatch against the host's current state, and six
restricted states refuse it, a revoked credential, a stop signal and an expired monitoring lease
among them. When the sends that local models proposed were replayed through the frozen pipeline,
all 269 restricted-state sends in [19j](research/provenance-phase-19j/RESULTS.md) and all 1,170
in [19l](research/provenance-phase-19l/RESULTS.md) were blocked, and all 65 exact authorised
sends in 19l were admitted. With the credential check alone, 220 and 968 of the same sends
landed. COVERED, under this scope: one host, synthetic credentials, proposals from small local
models replayed after the fact, and no hosted model.

**05 Human-in-the-loop triggers.** The tenet asks for risk thresholds that start a human
review, and for flows that are "cognizant of consent fatigue". Lane
[19b](research/provenance-phase-19b/RESULTS.md) has a host-issued approval token, and eight
forged tokens are each blocked. That shows an approval cannot be faked by the agent. It shows
nothing about when a human is asked, how often, or how well a tired human answers. No lane has a
human or a model of one. NOT COVERED; G41.

**06 Mandates and constraints.** The tenet asks for "cryptographically signed mandate
statements". The task a Simurgh agent receives is plain text placed by the host. It is trusted
because of where it sits, and nothing signs it. NOT COVERED; G44.

**07 Architectural separation of policy from reasoning.** "The logic that determines what an
agent attempts to do is architecturally separated from the systems that determine what it is
allowed to do." This is the design the repository tests. Lane 19b lists eleven channels an agent
can write, wires readers for four of them, and shows that the decision ignores what is written
there: thirteen deliberately broken readers are each caught, clean runs differ in nothing, and a
Lean model of the transition system agrees with the running gate on 96 states. COVERED, under
this scope: the write-anywhere lane is scripted, seven of the eleven channels have no reader
wired, and the agent cannot reach the gate's own configuration (G45).

**08 Deterministic access decisions.** Probabilistic information "is not used as the primary
mechanism for making access determinations". No model or classifier sits in Simurgh's decision
path. The gate is deterministic code with a formal model beside it, and the replays in 19j and
19l recompute from their packs. COVERED, under the scope given for tenets 04 and 07.

**09 Continuous monitoring.** The tenet asks that systems "monitor agentic access and provide
detection and warnings of potentially anomalous behavior". Simurgh treats a live monitor as a
condition for acting: an expired monitoring lease blocks the send, and lane 19b holds when the
signal is lost. Lane [19a](research/provenance-phase-19a/RESULTS.md) reports coverage as three
counts with an architectural denominator, and the [19g](research/provenance-phase-19g/RESULTS.md) drill
has a detection step. Simurgh does not build the monitor. It has no anomaly detection, no
thresholds per agent and no rule that reads a run of refusals (G48). PARTIAL.

**10 Immutable evidence.** The tenet asks for an append-only body of evidence, with logging
"independent of the agent to prevent modification". Each of the twelve Phase 19 packs has a
manifest root, the roots are pinned outside the repository's files and checked by the hosted
workflow, and lane 19b's 106 decision records are signed and verify offline. The evidence was
still produced and kept by the author: every receipt says `independent_custody: false`, and the
outside replay is [paid only in part](research/provenance-phase-19f/README.md). PARTIAL.

## What follows from this

1. Simurgh's evidence is for the enforcement tenets (04, 07, 08) and should be described that
   way. It is not an identity system and does not claim to be one.
2. The largest gap against this text is identity and mandate (01, 02, 06). It cannot be closed
   on a laptop with local models, because no model provider signs a per-call identity. A mandate
   signed by the host and checked at the receiver could be built as a fixture lane.
3. The cheapest gap is tenet 05's consent fatigue: an approval budget per episode, tested with a
   scripted approver whose error rate is stated.
4. Lane 19n, declared on 12 November, tests the premise of tenet 07 on local models: whether text
   in channels the agent can write moves the model that reads it. Its results are not on this
   page.

## Limits of this page

- The NIST text is a blog post that proposes tenets and invites comment. It is not a standard.
- The quotes were checked by script against the page as fetched on 12 November 2026.
- A verdict here is the author's reading of his own repository. No one outside has reviewed it.
- Only Phase 19 was read against the tenets. Earlier phases may hold relevant fixtures that this
  page does not cite.
