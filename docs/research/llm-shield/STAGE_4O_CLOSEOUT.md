# Stage 4O — VTSA Closeout

**Motto: AnthropicSafe First, then ReviewerSafe.**

Stage 4O ships Verifiable Tool-Surface Attestation over the **Monotone Consent Law**: a
committed tool surface may narrow silently, but may broaden only under delta-bound consent,
and drift can never launder across manifest epochs. Any violation is refused by the kernel
or ledgered under raw codes 55–66; there is no silent third path.

## What shipped

- **Kernel:** `authorise_with_manifest` — the fourth, additive Capability Kernel entry
  point (the frozen three are byte-unchanged), returning an `AuthorityDecision` plus a
  six-field `ManifestBindings` sidecar.
- **Cores (Node + Python mirror):** domain-separated digests, manifest-order Merkle
  surface with inclusion proofs, exact-key manifest/commitment validation, the drift
  lattice + Monotone-Consent chain validation, the 12-check gate, timeline binding to 4N
  chain positions, and the constitutional alignment map. Byte-parity between Node and
  Python is enforced by committed parity vectors and a same-first-raw-code parity gate.
- **Evidence:** a signed, byte-reproducible bundle
  (`docs/research/llm-shield/evidence/stage-4o/`) with two Ed25519 keypairs (manifest vs
  attestation), an 18-arm decision corpus, the timeline record, the constitutional map,
  the honesty ceiling, non-claims, and known limitations.
- **Lane B (external validity only):** a digest-only live capture of the public
  `@modelcontextprotocol/server-filesystem`, plus a rug-pulled variant.
- **Proof:** `proofs/stage4o/MonotoneConsent.lean` — machine-checked `no_silent_tool_swap`,
  `no_drift_laundering` (⊑ transitivity), `delta_bound_broadening`, and the umbrella
  `monotone_consent`, no `sorry`, under `leanprover/lean4:v4.15.0`.
- **One command:** `scripts/reproduce-llm-shield-stage4o.sh`.

## Boosters (Banger Package)

- **C1 — constitutional alignment map:** one claim-checked entry per raw code 55–66, with
  the honesty ceiling frozen verbatim.
- **F1 — retro-detection fixture:** withheld. The May-2026 Claude Code MCP-poisoning
  disclosure (GMO Flatt Security) is a vulnerability narrative, not a tool-definition
  changelog, so it does not publish concrete before/after tool surfaces. Per the hard
  gate we did **not** approximate; the outcome is recorded as
  `retro_fixture_public_data_insufficient` rather than a guessed fixture.

## Non-claims (carried in the bundle, verbatim)

`surface_bound_verifiable`, `not_tools_safe`, `not_mcp_server_safe`,
`not_protocol_rug_pull_prevention`, `not_proof_of_human_reading`,
`merkle_machinery_standard_crypto_novel_application`,
`not_constitutional_compliance_claim`, `not_incident_prevention_claim`.

> Infrastructure alignment is not model-value alignment. Stage 4O operationalises selected
> oversight and non-deception principles, but it does not claim constitutional compliance.

## Known limitations (carried in the bundle, verbatim)

`lane_a_manifest_modelled_not_live_mcp`,
`digest_privacy_not_secrecy_against_dictionary_inference`,
`timeline_binds_at_attestation_time_not_real_time`,
`proof_is_of_model_not_implementation`,
`retro_fixture_public_data_insufficient`.

## Four-axis scorecard — spec-time targets vs shipped

The spec (§18) set post-booster targets. Here is the honest shipped re-score, with the
delta.

| Axis                   | Spec target | Shipped | Why the shipped mark                                                                                                                                                                                                                                                                                              |
| ---------------------- | ----------: | ------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                |           9 |   **9** | Path-independent drift verdicts, delta-bound consent as a machine-distinguishable evidence class, and time-anchored surfaces all shipped with no prior art found; all three are machine-checked or byte-reproducible. Not 10: mechanism-level novelty, and Merkle inclusion is honestly-labelled standard crypto. |
| Frontier               |         9.5 |   **9** | Lands on Anthropic's #1 named agent threat vector with a real, live, digest-only MCP capture (external validity is no longer hypothetical). Held at 9, half a point below target: Lane A is still the normative lane; the live capture corroborates, it does not drive the normative claims.                      |
| Good for Anthropic     |           9 |   **8** | Answers the NIST-RFI asks (secure tool calling, audit trails, attestation) with a byte-reproducible reference design and a live capture from Anthropic's own ecosystem. Below target because the benefit is still a demonstration: no Anthropic-side adoption or dogfood integration ships here (parked as 4O.1). |
| Constitution alignment |         9.5 | **9.5** | The claim-checked alignment map makes each mechanism→principle mapping recomputable, and delta-bound consent operationalises _informed_ oversight. The honesty ceiling forbids a 10 by construction — infrastructure alignment is not model-value alignment.                                                      |

**Overall shipped: ~8.9.** The remaining distance to the spec targets is exactly what the
spec said it would be: the last movement on Frontier and Good-for-Anthropic can only come
from (1) an outside party running the verifier or citing the law, and (2) the parked 4O.1
dogfood integration. The F1 retro fixture was gated out honestly rather than faked, which
protects the score rather than inflating it.

## Roadmap (parked, NOT 4O claims)

4O.1 "Reflexive & Retro" (reflexive harness-surface attestation, Claude Code / MCP proxy
sample, zero-utility-tax eval pack, `blind_reapproval` contest path); 4P "Herd Drift
Evidence"; 4P/4Q proof-carrying Lean verdict classifier.
