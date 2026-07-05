# Simurgh — a recomputable evidence layer for Anthropic's assurance stack

**Project Simurgh · one-page brief for an Anthropic reviewer**

_We do not claim a model is safe. We make one specific, verifiable claim recomputable by an
outsider: that a declared boundary held, that oversight preceded a consequential action, and that
the record is complete — with no selective omission._

---

## Why this is Anthropic-shaped

Anthropic's public direction names problems that need an evidence substrate none of the current
tools provide: the Responsible Scaling Policy and the June 2026 Advanced AI Framework lean on
**independent third-party verification**; the framework proposes mandatory third-party testing with
governments able to block deployments that fail; and after the February 2026 move away from
universal pre-release verification, the stated bet is a **robust third-party evaluation ecosystem**.
That ecosystem is only as strong as its evidence format. Today that format is prose and
trusted logs. Simurgh is the missing layer: **an outsider with only a public key re-derives the
verdict byte-for-byte, with no model, no network, and no producer access.**

## The one moat: completeness (no selective omission)

Every other agent "flight recorder" (Vorlon, Microsoft AgentRx, AIR Blackbox) is **trust-the-writer
telemetry** — it logs what the system chose to log. The property none of them have is the one a
dishonest or careless operator exploits: **proof that nothing was quietly dropped.** Simurgh's
spine is built around a Completeness Invariant, and each stage adds one anti-laundering blade so an
operator cannot make a bad run _look_ clean:

| Laundering move                                 | Simurgh blade                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| Drop an inconvenient action / reorder events    | anti-laundering lattice (3Q), run-chain order + census (4Q raw 89) |
| Backdate the audit clock                        | temporal-completeness heartbeat (4N)                               |
| Hide the real model/route behind a proxy        | No-Ghost-Provider custody (4P)                                     |
| Quietly skip approval on a consequential action | **No Silent Exemption (4Q)**                                       |

## Four problem → mechanism mappings

1. **"Human oversight before consequential action" — asserted today, verifiable with 4Q.** Stage 4Q
   (Verifiable Friction Receipts) is a signed, epoch-bound, ordered proof that an approval-gate
   checkpoint _preceded_ a protected authority crossing (tool execution, unsafe export, privilege
   expansion, consent broadening, disclosure escalation). A **two-key pincer** — the crossing embeds
   the approval digest, the approval is earlier in the run chain, and it is signed by a key **distinct
   from the tool/harness signer** — means an operator cannot backdate, reorder, or self-approve. A
   signed `constitution_projection` maps each boundary to the constitution clause it operationalizes.

2. **No quiet gaps — No Silent Exemption.** An operator may leave a consequential action _unbound_
   only by embedding a **signed, policy-falsifiable exemption**, judged against an affirmative
   allowlist that is **empty (refuse) by default**. Even the absence of approval leaves a signed
   feather in the ledger. Prior art has proof-of-non-execution and proof-that-oversight-ran; making
   an _unbound_ action sign a policy-falsifiable exemption appears to be new — and we ship that as a
   **signed, attackable novelty source-map**, not an assertion.

3. **The third-party ecosystem needs a substrate — be your own verifier.** The verifier is
   producer-independent and fully offline. A reviewer runs one command; for 4Q they can **be their
   own approver** — mint a fresh key and confirm the evidence is decision-equivalent, proving the
   machinery has no hidden dependence on our key. This is the concrete answer to "why should an
   evaluator trust the producer": they don't have to.

4. **Multi-agent accountability the regulators lack — the forward wedge.** EU AI Act Article 73
   guidance (binding August 2026) gives, in its own critics' words, "no tools to pin accountability
   of multi-agent incidents." Our post-4Q north star (delegation-chain completeness + an **Incident
   Capsule**) aims to be the first serious-incident report a regulator can _rerun_. A working,
   independent verification layer strengthens Anthropic's hand when governments ask for one.

## What we actually shipped (Stage 4Q, this release)

15-case normative corpus + a 10-arm live approval-gated capture over a **genuinely separate approver
process** (with a human-at-terminal ceremony arm); **JS↔Python byte-parity**; **five machine-checked
Lean theorems** (`frictionPrecedence`, `failClosed`, `sameKeyFails`, `frictionCoverage`,
`noSilentExemption`); a signed offline attestation with a two-tier verifier; a one-command reproduce
across ten gates. Current baseline: **1559 automated tests**, byte-stable reproduction, private
keys never committed.

```bash
git clone https://github.com/Raoof128/Project-Simurgh.git && cd Project-Simurgh && npm ci
scripts/reproduce-llm-shield-stage4q.sh            # ten friction gates, fully offline (Node >= 26)
```

## The discipline that should earn the reviewer's trust

Every claim is **"boundary held / oversight preceded / record is complete — verifiable,"** never
**"the model is safe."** Simurgh is the infrastructure side of the constitution, not a competing
safety claim. Limitations are **signed into the artifacts** as machine-readable non-claims:
recorded-run order, not physical time; a cryptographic key ceremony and process separation, not
proof a human deliberated; enforcement evidence, not proof that friction prevented harm; measured
on a synthetic reference corpus, not production traffic; and no vendor is ranked or labelled unsafe.

---

Research prototype and technical demonstrator, AGPL-3.0. Methodology is LLM-assisted and disclosed.
Repository: https://github.com/Raoof128/Project-Simurgh · Author: Mohammad Raouf Abedini.
Technical feedback on the attestation contract and the reproduction packet is welcome.
