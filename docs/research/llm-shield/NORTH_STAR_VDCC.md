# NORTH STAR — VDCC: Verifiable Delegation-Chain Completeness

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

- **Date:** 2026-07-05
- **Status:** DIRECTION DOCUMENT — not a stage. Defines the destination the
  post-4Q rungs climb toward, the way `NORTH_STAR_*` (VCA) defined 3M→3X before
  3M existed.
- **Roadmap position:** unchanged shipping order — 4Q VFR next, PCCC second
  (pays 4P's `private_custody_corroboration_deferred`), VDCC becomes the 4R-and-
  beyond banner. Stages between now and VDCC are designed AIMING at this doc.
- **Provenance note:** committed and dated 2026-07-05 to freeze articulation
  time.
- **Status update (2026-07-06):** the first rung, **Stage 4S — VDCC-Core**, is
  shipped (`v2.28.0-stage-4s-vdcc-core`): the delegation-chain completeness
  invariant + No Ghost Hop law, enforced at the Capability Kernel, with a real
  two-process MCP hop and machine-checked `inclusionNotCompleteness`.
- **Status update (2026-07-06b):** **Stage 4U — VRTA** (`v2.29.0-stage-4u-vrta`)
  hardens the chain by red-teaming the VDCC verifier itself under the **No Silent
  Bypass** law — a charter-bound 58-fixture adversarial corpus (honest ASR 0/58),
  a precommitted attack manifest so the red-team cannot hide its own wins, and a
  two-tier signed attestation. Red-teaming the verifier **before** projecting it
  into a regulator-style report is the right order; the Incident Capsule (Art-73
  projection) remains the next rung (Stage 4T), now built on a hardened chain.
- **Status update (2026-07-07):** the **wedge artifact is shipped** — **Stage 4T —
  VIC** (`v2.30.0-stage-4t-vic`): the **Verifiable Incident Capsule** under the **No
  Hearsay** law, bound to BOTH pinned Commission templates (GPAI Art-55 published +
  Art-73 high-risk draft, real transcriptions of record). Every template section
  recomputes from a Merkle-sealed epoch census or signs its absence
  (`not_derivable` / `requires_human_input`); **suppression detection** (143/144)
  makes hiding derivable evidence a failure, not just fabricating it; and the **No
  Two Stories** law binds regulator / insurer / public audience views to one capsule
  root (redact, never contradict; every redaction ledgered). Honest published
  finding: only 6 of 22 template sections are machine-derivable from the spine — the
  capsule states on its face which fields a machine may fill. Four Lean theorems,
  live two-process MCP Lane B, byte-stable reproduce. The 4S consent IOU is retired
  as a field group. This is the first serious-incident report a regulator can rerun.
- **Status update (2026-07-07b):** the wedge grows a **right of reply** — **Stage
  4V — VDP** (`v2.31.0-stage-4v-vdp`): **Verifiable Due Process**, the first
  regulator-rerunnable incident report the accused can answer in a rerunnable way,
  under **No Trial in Absentia** / **Same Rules for the Defence** / **No Strawman**.
  A signed counter-capsule binds the exact sealed capsule and contests each section
  by agree / dispute-by-recomputation (carrying its own census under the operator's
  identical laws) / dispute-as-judgment; the verifier derives a five-status conflict
  map and never declares a winner. Inventions: **absence rebuttal** (contesting what
  was NOT said — the respondent-side dual of 4T suppression detection), the **anchor
  contest** + `filed_at_beat` (a two-sided recomputable clock over the 4N heartbeat),
  the **Mirror Test** (self-contest → all-`AGREED`, no party-bias term, Lean-twinned),
  and **contest-as-subpoena** (filing forces the capsule to re-prove itself). Raw
  codes 151–161, five Lean theorems, two-process respondent-blind Lane B,
  JS↔Python↔browser parity, read-only kernel. Honest finding: only 6 of 22 template
  sections are contestable by recomputation; the other 16 by signed judgment only.
  The declared **4W** socket (`narrative_claim_contest_deferred`) and the **4X**
  novel-attack hook (`lane_a_both_parties_built_by_us`) are signed into the stage.

---

## 1. The gap, in the industry's own words (surveyed 2026-07-05)

Four independent fronts, one missing layer:

1. **Recorders exist — evidence does not.** The "flight recorder for agents"
   category exploded in spring 2026 (Vorlon Flight Recorder, Microsoft AgentRx,
   AIR Blackbox, Causality). Every product is telemetry that trusts the system
   writing it. From the A2A ecosystem analysis: _"Audit trails depend on
   trusting the systems that write them, not cryptographic evidence."_ None has
   a completeness invariant; none can prove nothing was omitted.
2. **Identity exists — the execution story does not.** A2A v1.0.0 (2026-03-12)
   agent cards are self-declared with no attestation binding; the spec "solves
   communication only." OAuth on-behalf-of chains prove who originated a
   request but give _"zero indication of how many autonomous loops occurred
   during execution."_
3. **Regulators are publicly unarmed.** EU AI Act Article 73 guidance becomes
   legally binding August 2026. TechPolicy.press on the draft: the EU has _"no
   tools to pin accountability of multi-agent incidents"_; guidelines assume
   single-agent, single-occurrence failures.
4. **Insurers price blind.** Lloyd's-backed Testudo began underwriting AI
   liability in early 2026; market's own admission: pricing is "qualitative
   rather than purely actuarial" — no recomputable loss-evidence format exists.

Anthropic-specific: after the February 2026 shift away from universal
pre-release verification, Anthropic's stated bet is a third-party evaluation
ecosystem plus an Advanced AI Framework with mandatory third-party testing. A
third-party ecosystem is only as strong as its evidence substrate; today that
substrate is prose and trusted logs.

**The common shape:** every front needs proof of the NEGATIVE SPACE — that a
record is complete — across MULTIPLE parties. Identity proves who. Recorders
log what (trusted). SCITT/in-toto notarize artifacts. Nobody proves "this is
everything that happened in the delegation chain, nothing omitted, verifiable
by someone who trusts no participant." That is the Completeness Invariant —
Simurgh's stated moat — aimed at the multi-agent world.

## 2. The invention

### 2.1 VDCC — Verifiable Delegation-Chain Completeness

Every delegation hop (agent A → agent B → agent C, across org boundaries) mints
a **hop receipt** composing the shipped spine: custody (4P), consent (4O),
friction (4Q), budgets (4K/4L), provenance (4C). The chain commits its own
**hop cardinality** — the 4L move, lifted to delegation: the liar must ledger
the lie. Privilege attenuation is machine-checked hop-to-hop. The whole chain
is offline-recomputable by a verifier who trusts no participant.

### 2.2 The No Ghost Hop Law (ghost-trilemma echo)

4P killed the ghost provider; VDCC kills the ghost hop:

> A hidden hop requires both neighbours to collude off-ledger; the ghost's
> outputs then carry no valid hop receipts and are caught at the guarded egress
> boundary. Either a hop is on the chain, or its absence is detectable at the
> edges.

Named for what construction proves (4P `CpcEmissionBounded` lesson): the law is
about detectability at guarded boundaries, never omniscience.

### 2.3 The wedge artifact — the Incident Capsule

One signed capsule per run/incident that projects the spine's evidence onto the
European Commission's actual Article 73 reporting template: **the first
serious-incident report a regulator can rerun.** The same capsule is the
actuarial input an AI-liability underwriter lacks and the evidence substrate a
third-party evaluation ecosystem needs. Three buyers, one artifact; the
regulatory clock (binding August 2026) sets the timing.

## 3. Prior art — and the exact difference

| Prior art                                              | What it does                                                      | What it does NOT do                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Vorlon / AgentRx / AIR Blackbox / Causality            | Agent telemetry, replay, forensics UX                             | Trust-the-writer; no completeness invariant; not offline-recomputable by a hostile verifier |
| A2A v1.0.0 / MCP                                       | Inter-agent communication                                         | Self-declared identity; no attestation binding; no execution evidence                       |
| Entra Agent ID / agentic IAM / OAuth OBO               | Runtime identity + authz                                          | Session-level; no per-hop evidence; zero visibility into autonomous loops                   |
| SentinelAgent / AIP / Authenticated Delegation (arXiv) | Formal delegation policy, non-escalation, identity across MCP/A2A | Runtime enforcement, not recomputable incident evidence with completeness                   |
| SCITT / in-toto / AIVS draft                           | Artifact notarization, supply-chain statements                    | Artifacts, not delegation chains; no hop cardinality; no negative-space proof               |
| Notarized Agents (arXiv 2606.04193)                    | Receiver-attested confidential receipts per action                | Per-action; no chain completeness; no cross-org census                                      |
| Governing Actions, Not Agents (arXiv 2606.26298)       | Institutional attestation as governance model                     | Philosophy/model; no recomputation machinery                                                |

Closest kin: Notarized Agents + SCITT. The difference is always the same
sentence: **they attest what was recorded; VDCC proves the record is complete.**

## 4. Honesty rails (from birth, spec-time, never retrofitted)

```text
completeness_is_over_declared_participants_and_guarded_boundaries
capsule_proves_record_completeness_not_harm_causation
chain_held_verifiable_never_agents_safe
hop_receipts_are_recorded_evidence_not_physical_time_truth
article73_projection_is_template_mapping_not_legal_compliance_claim
actuarial_input_is_evidence_format_not_pricing_advice
```

No live internet probes; no provider attribution; local / legal / recorded /
digest-only / machine-checkable — all standing rails carry over.

## 5. Pre-score (four axes, honest; each future stage re-scores)

- **Novelty 9** — completeness-invariant, cross-party delegation evidence has
  no occupant (§3); held from 10 until a VDCC-stage source-map survives contact.
- **Frontier 9** — the multi-agent accountability gap is named by regulators
  and unsolved by the identity, recorder, and notarization communities.
- **Good-for-Anthropic 9** — the missing substrate under Anthropic's own
  third-party-ecosystem bet; makes "boundary held, verifiable" composable
  across organizations.
- **Constitution 9** — oversight and accountability clauses become
  machine-checkable across delegation, not just within one run.

**What falsifies this doc:** a shipped system (not paper) providing offline-
recomputable delegation-chain evidence with an explicit completeness
commitment, verifiable by a party trusting no participant. If found, cite it,
re-score, and narrow the claim — same discipline as the 4Q novelty source-map.

## 6. Sources (surveyed 2026-07-05)

- https://www.techpolicy.press/eu-regulations-are-not-ready-for-multiagent-ai-incidents/
- https://artificialintelligenceact.eu/article/73/
- https://digital-strategy.ec.europa.eu/en/consultations/ai-act-commission-issues-draft-guidance-and-reporting-template-serious-ai-incidents-and-seeks
- https://vorlon.io/ai-security/ai-agent-flight-recorder-action-center/
- https://airblackbox.ai/
- https://quirkylabs.ai/
- https://a2a-protocol.org/latest/specification/
- https://authzed.com/learn/agent-to-agent-communication-guide-google-a2a-protocol
- https://workos.com/blog/oauth-multi-hop-delegation-ai-agents
- https://arxiv.org/pdf/2604.02767 (SentinelAgent)
- https://arxiv.org/pdf/2603.24775 (AIP)
- https://arxiv.org/html/2501.09674v1 (Authenticated Delegation)
- https://arxiv.org/pdf/2606.04193 (Notarized Agents)
- https://arxiv.org/html/2606.26298v1 (Governing Actions, Not Agents)
- https://datatracker.ietf.org/doc/draft-ietf-scitt-architecture/
- https://ftp.sjtu.edu.cn/pub/internet-drafts/draft-stone-aivs-00.html (AIVS)
- https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-agent-governance-framework-gap-20260403/
- https://www.theinsurer.com/program-manager/news/standalone-ai-liability-market-takes-shape-with-underwriting-discipline-key-to-2026-04-24/
- https://www.anthropic.com/responsible-scaling-policy/roadmap
