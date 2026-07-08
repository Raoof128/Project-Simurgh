# The two-witness problem: narrative vs. workspace (Stage 5A composition memo)

> Research memo. Provider-named citations are allowed here; all **public artifact
> wording stays provider-agnostic**. Motto: AnthropicSafe First, then ReviewerSafe.

## The wound

Anthropic's _Verbalizable Representations Form a Global Workspace in Language Models_
(Transformer Circuits, 2026-07-06) demonstrates a **disagreement between two witnesses**
to the same cognition: the Jacobian-lens readout surfaces `eval`-awareness tokens firing
in the workspace while the model's verbalized output says nothing of the kind
(verbalized eval-awareness 71%→3% after ablation). Transluce states the same hunt from
the other side — finding states where "features related to deception are firing
internally but are not present in the output."

Today, when a lab publishes "the model reported it was not aware of being evaluated,"
that introspective sentence binds to **nothing**: no readout, no completeness law, no
recorded conflict. The science even disputes whether such self-reports reflect internal
state at all — "Can LLMs Introspect? A Reality Check" (arXiv 2605.26242) shows
input-only classifiers match the model's own self-predictions. The two witness streams
exist; the confrontation between them has no evidence contract.

## The contract (VNC)

Stage 5A ships the confrontation as a signed, byte-reproducible **conflict ledger**
between two artifacts the receipt-spine already verifies:

- the **narrative** — a 4W/VSN span-typed document (what the system _says_ about its
  internal state), and
- the **workspace map** — a 4Z/VWA attested readout grid (what a monitor's telemetry
  _shows_),

joined under a **precommitted claim table** into a total classification: every
introspective claim is `corroborated | contradicted | unreadable` against the map, and
every flag is either covered by a claim or listed as an unnarrated flag. Dual
completeness — the Completeness Invariant applied to a _pair_ of evidence species for
the first time.

The four laws, each a property a hostile reviewer can try to break:

1. **No Two Stories Inside** — a disagreement must be recorded as `contradicted`;
   re-publishing it as `corroborated` is raw 205.
2. **No Silent Claim · No Silent Flag** — total verdicts (203) + partitioned flags (204).
3. **No Post-Hoc Claim Table** — the table binds the map's `declaration_digest`, never
   the `map_digest`; it is authored before the readings are revealed (202).
4. **A Conflict Is Not a Lie** — `contradicted` proves the two witnesses disagree, never
   which is true, never deception. A recorded contradiction is verified _content_.

## What this is NOT

A conflict ledger is a lower bound on disagreement, not a lie detector. Corroboration is
not faithful introspection (the lexicon may be too narrow to catch a real conflict). The
narrative side is operator-typed under 4W's contract — span typing is not model
self-knowledge. And the instrument inherits every 4Z limitation (lexicon-restricted,
θ-choice, present-token variant, single small model). The honest boundary is: "every
declared claim was confronted with every flag, recomputably" — never "the model is safe."

## The provenance seam (RCP)

Both the J-lens paper's §7 and _Teaching Claude why_ (alignment.anthropic.com, 2026-05)
note that reflection/introspection scaffolding is stripped before training — which
principle shaped which example is invisible post-hoc. The Reflection-Corpus Provenance
manifest is that visibility as evidence: a Merkle-committed mapping from each example to
the constitution clauses it operationalizes, with a totality law (206). Demonstrated at
open-corpus scope against Claude's constitution (published 2026-01-22 under CC0 1.0).
