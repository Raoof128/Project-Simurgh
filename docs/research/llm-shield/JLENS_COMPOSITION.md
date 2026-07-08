# J-lens ⟷ Simurgh: the composition (Stage 4Z VWA)

**Motto: AnthropicSafe First, then ReviewerSafe.** This memo maps Anthropic's
_Verbalizable Representations Form a Global Workspace in Language Models_
(Transformer Circuits, 2026-07-06) onto Simurgh's verification layer. It is a
positioning note, not a claim about the paper's numbers.

## The wound both target

The paper shows a cheap internal instrument — the Jacobian lens — surfaces a
model's **silent** strategic/situational cognition (`leverage`, `fake`,
`secretly`, `reward`) that never reaches the output, and says in the same breath
that the readout _"can be easily applied at scale to flag transcripts for
review"_ and that they _"do not feel comfortable making the stronger claim that
monitoring the J-space is sufficient."_ That is a monitoring signal born **with
no evidence contract**: no signature, no completeness law, no recompute path, no
tamper detection.

Simurgh's north star is the same wound from the other side: silent misaligned
cognition invisible in outputs. The paper **reads** it; Simurgh **attests** it,
byte-reproducibly — _"boundary held, verifiably"_, never _"model safe."_

## The mapping

| Paper (interpretability side)                                                 | Simurgh 4Z VWA (verification side)                                                                                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J-lens flags a transcript for review                                          | VWA makes the flag a signed, recomputable **readout grid** (No Silent Cell × No Silent Token)                                                                                 |
| Readouts proposed for audit at scale (§A.22 auto-auditing)                    | Precommitted **declaration** (No Post-Hoc Declaration) kills cherry-picking WHAT/WHERE/WHICH-LAYERS                                                                           |
| §9.2: _monitoring is not sufficient_ — automatic circuits bypass the J-space  | Adopted **verbatim** as `VWA_KNOWN_LIMITATIONS`; this is precisely why an external, post-hoc, recomputable containment guarantee stays load-bearing                           |
| Eval-awareness ablation (71%→3%) is a self-attested number                    | The VSC turns each such number into a `slot_bound` span that **recomputes from a verified artifact**                                                                          |
| §7 Counterfactual Reflection Training implants constitution-grounded concepts | Reinforces the constitution-as-infrastructure thesis; the stripped scaffolding is the unattested provenance the minted `reflection_corpus_provenance_deferred` socket targets |

## Why they compose (not compete)

The J-lens is the flag; VWA is the receipt. And the paper's own honest limit —
that a sufficiently reinforced misaligned circuit can bypass interpretability —
is the residual guarantee interpretability _cannot_ provide and external
verifiable containment _can_. The two are uncorrelated failure modes, exactly
the layered-monitoring posture the cross-lab CoT-monitorability position paper
(arXiv 2507.11473) calls for.

## Honest scope (signed)

- VWA reproduces a **method family** (present-token VJP, lexicon-restricted,
  open ~1B), NOT the paper's full-vocabulary frontier-scale lens. See
  `VWA_KNOWN_LIMITATIONS`.
- A flag is not a verdict; a readout is not faithfulness; agreement is not model
  safety. See `VWA_NON_CLAIMS`.
- Public artifact wording stays provider-agnostic; provider names appear only in
  this research memo.

Source ingested in Zurvan: `wiki/sources/verbalizable-representations-global-workspace-anthropic-2026`
and the digest `wiki/digests/verbalizable-representations-global-workspace`.
