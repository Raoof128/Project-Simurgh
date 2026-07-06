# Stage 4S — VDCC-Core: Verifiable Delegation-Chain Completeness

**MOTTO: AnthropicSafe First, then ReviewerSafe.** (Standing project
convention since Stage 4M: "safe for the lab audience in content AND
structural egress, then recomputable by any reviewer" — a design-order
tie-break, not an endorsement claim.)

- **Date:** 2026-07-06
- **Law:** **No Ghost Hop.**
- **Banner:** first rung of the VDCC north star
  (`docs/research/llm-shield/NORTH_STAR_VDCC.md`); the Incident Capsule is
  deliberately **deferred to Stage 4T** so it can project real chain evidence.
- **Branch:** `stage-4s-vdcc-core` · **Target tag:** `v2.28.0-stage-4s-vdcc-core`
- **Raw codes:** 100–118 (first three-digit block; registry additive in
  `tools/simurgh-attestation/stage4h/exitCodes.mjs`).

**Core claim (verbatim, frozen):**

> A delegated agentic authority tree cannot omit, invent, replay, over-spend,
> over-scope, or ghost-hop authority without producing an offline-verifiable
> verifier failure.

---

## 1. Problem — delegation trees launder authority through omission

Agent A delegates to B, B to C and D, across window and process boundaries.
Every recorder, passport, and token system shipped by July 2026 can attest
**what was recorded**; none can prove **the record is complete**. Auditors "can
see token exchanges but cannot determine whether Agent C's actions were within
the human's original authorization"; traces "capture the immediate executor,
not the full upstream delegation chain." The laundering classes are all
omission-shaped: the hidden hop, the uncounted child, the orphan receipt, the
split-brain child, the replayed receipt, the budget split across twenty
sub-agents. 4S makes each class an offline-verifiable verifier failure over a
delegation **tree** whose every node commits to its own children.

The one-sentence moat, unchanged from the north star and re-verified against
the July-2026 field (§17): **they attest what was recorded; 4S proves the
record is complete.**

## 2. Non-claims, known limitations, honesty rails (from birth)

### 2.1 Non-claims (signed into the bundle, in this order)

```text
not_an_agent_identity_system
not_runtime_policy_enforcement_beyond_the_kernel_boundary
not_a_harm_causation_proof
not_an_a2a_or_mcp_protocol_extension
not_a_legal_compliance_claim
not_omniscience_outside_guarded_boundaries
not_cross_epoch_linkability_claim
```

### 2.2 Known limitations (signed, in this order)

```text
lane_b_is_single_host_two_process_plus_one_mcp_hop_not_cross_org_network
scopes_and_budgets_are_modelled_capability_labels
completeness_is_relative_to_declared_participants_and_co_signature_discipline
incident_capsule_deferred_to_stage_4t
curve_and_signature_reuse_is_reference_grade_not_production_deployment
```

### 2.3 Honesty rails (spec-time, never retrofitted)

```text
completeness_is_over_declared_participants_and_guarded_boundaries
chain_held_verifiable_never_agents_safe
hop_receipts_are_recorded_evidence_not_physical_time_truth
merkle_inclusion_is_presence_not_completeness
attenuation_enforcement_is_prior_art_our_claim_is_offline_recomputable_proof
fanout_commitment_binds_at_window_close_not_realtime
hidden_hop_detection_assumes_dual_signature_discipline_at_every_hop
scopes_and_budgets_are_modelled_labels_enforced_at_kernel_boundary_only
lane_b_mcp_hop_is_one_real_capture_not_ecosystem_scale
non_matches_and_refusals_are_first_class_evidence_no_selective_omission
lane_a_uses_insecure_fixture_only_keys_for_byte_reproducibility
friction_gates_export_not_delegation
```

The north-star capsule rails
(`capsule_proves_record_completeness_not_harm_causation`,
`article73_projection_is_template_mapping_not_legal_compliance_claim`,
`actuarial_input_is_evidence_format_not_pricing_advice`) are **reserved for
4T** and intentionally absent here.

## 3. Receipt schemas

All schemas versioned `.v1`; all digests via `stage4m` `canonicalJson` /
`recordDigest`; all signatures Ed25519 over `canonicalJson(parse(...))`
(3M/4P discipline). Scope = sorted array of lowercase capability strings
(meet = set intersection). Budget = non-negative integer units.

### 3.1 Hop receipt — `simurgh.vdcc_hop_receipt.v1`

One per delegation edge. **Dual-signed**: delegator and delegatee both sign
the identical payload — this is the mechanical heart of No Ghost Hop (a hidden
hop requires BOTH neighbours to withhold their signatures off-ledger).

```json
{
  "schema": "simurgh.vdcc_hop_receipt.v1",
  "epoch": "<4N window anchor>",
  "run_id": "<run identifier>",
  "window_id": "<delegation window identifier>",
  "root_receipt_digest": "sha256:<digest of the root receipt>",
  "parent_receipt_digest": "sha256:<digest of parent hop receipt>",
  "delegator_key_digest": "sha256:<...>",
  "delegatee_key_digest": "sha256:<...>",
  "scope": ["mail.read", "calendar.read"],
  "budget_allocated": 6,
  "spine_refs": {
    "custody_4p": "sha256:<...> | null",
    "consent_4o": "sha256:<...> | null",
    "friction_4q": "sha256:<...> | null"
  },
  "signature_delegator": "<ed25519 hex>",
  "signature_delegatee": "<ed25519 hex>"
}
```

The **root receipt** is the same schema with
`parent_receipt_digest: null` and `root_receipt_digest` equal to the fixed
sentinel string `"self"` inside the signed payload (its concrete digest is
computed over that sentinel form; every descendant then carries the concrete
root digest). Exactly one root per bundle.

### 3.2 Fan-out commitment — `simurgh.vdcc_fanout_commitment.v1`

One per **delegator node** per window, signed by the delegator alone, minted
**only at delegation-window close** (§4).

```json
{
  "schema": "simurgh.vdcc_fanout_commitment.v1",
  "epoch": "<4N window anchor>",
  "run_id": "<run identifier>",
  "window_id": "<window identifier>",
  "delegator_key_digest": "sha256:<...>",
  "node_receipt_digest": "sha256:<digest of this node's own hop receipt, or root>",
  "declared_child_count": 2,
  "declared_child_receipt_digests": ["sha256:<...>", "sha256:<...>"],
  "declared_child_set_root": "sha256:<merkle root over sorted child digests>",
  "signature_delegator": "<ed25519 hex>"
}
```

Leaf nodes commit `declared_child_count: 0` with an empty digest list — a
zero fan-out is a first-class commitment, not an absence (no-selective-omission
rail).

### 3.3 Authority-crossing artifact — `simurgh.vdcc_crossing_artifact.v1`

Every protected authority crossing binds to a **verified node receipt** —
ANY node on the tree, not only leaves, and egress is not special. If the same
node also delegates children, its local spend and delegated child budgets
compose under the flux law (§6) — this is precisely what keeps the
double-dipping attack alive and testable:

```json
{
  "schema": "simurgh.vdcc_crossing_artifact.v1",
  "epoch": "<4N window anchor>",
  "run_id": "<run identifier>",
  "crossing_kind": "tool_execution | export | privilege_expansion | consent_broadening | disclosure_escalation | destructive_mutation",
  "bound_receipt_digest": "sha256:<hop receipt this crossing acts under>",
  "requested_scope": ["mail.read"],
  "spend": 1,
  "payload_digest": "sha256:<digest of the crossing payload>",
  "signature_actor": "<ed25519 hex, key of the delegatee acting>"
}
```

The crossing carries NO `actor_key_digest` — the actor key is INFERRED from
the bound receipt's `delegatee_key_digest` (the delegatee is the party
acting). `signature_actor` is verified against that key via
`public_key_index`. This keeps one authoritative key per node and removes a
field that could disagree with the receipt.

### 3.4 Chain bundle — `simurgh.vdcc_chain_bundle.v1`

Four sealed artifact arrays plus key material — the structure is normative:

```json
{
  "schema": "simurgh.vdcc_chain_bundle.v1",
  "epoch": "<4N window anchor>",
  "run_id": "<run identifier>",
  "tree_receipts": ["<hop receipts forming the delegation tree>"],
  "detached_receipts": ["<validly signed receipts NOT claimed into the tree>"],
  "fanout_commitments": ["<one per delegator node per window>"],
  "crossing_artifacts": ["<authority crossings>"],
  "public_key_index": {
    "sha256:<key_digest>": "-----BEGIN PUBLIC KEY-----\n..."
  },
  "spine_index": ["<declared 4P/4O/4Q digests>"],
  "bundle_merkle_root": "sha256:<...>",
  "non_claims": ["..."],
  "known_limitations": ["..."],
  "rails": ["..."],
  "signature": "<stage signature>"
}
```

- **`public_key_index` (offline-verifier requirement):** every key digest
  referenced by any receipt or crossing MUST resolve to PEM material in the
  index. A missing or malformed index ⇒ raw 100
  (`public_key_index_missing_or_malformed`); a referenced digest absent from
  the index makes that signature UNVERIFIABLE ⇒ raw 101 fail-closed
  (`referenced_public_key_unverifiable`). Without this the
  producer-independent offline verifier has no key material — the index IS the
  trust-no-participant story.
- **`detached_receipts` are sealed:** `bundle_merkle_root` covers
  `tree_receipts + detached_receipts + fanout_commitments +
crossing_artifacts` — a producer cannot add or remove a detached receipt
  without breaking the root. Tree invariants (§5) run ONLY over
  `tree_receipts`; raw 111 checks `detached_receipts`. This keeps 111
  reachable AND sealed.
- Stage signature: stage4s Ed25519 key, own keypair per standing practice;
  fixture keys under `test-keys/INSECURE_FIXTURE_ONLY_stage4s_*.pem`,
  path-allowlisted in BOTH the 3M and 3O private-key audits.

## 4. Window-close fan-out commitment (the 4L move, lifted to trees)

> A delegator signs its fan-out commitment only at delegation-window close,
> after all child receipts for that window have been minted. Pre-child
> fan-out commitments are invalid because they cannot bind concrete child
> receipt digests.

The verifier groups observed children by **`(parent_receipt_digest,
window_id)`** — hop receipts carry `window_id` precisely so that multi-window
delegation inside one epoch stays crisp — and recomputes, for EVERY node and
window:

```text
observed_child_count      == declared_child_count            (else raw 106)
merkle(sorted(observed))  == declared_child_set_root
  AND observed set        == declared set                    (else raw 107)
```

`declared_child_receipt_digests` MUST be sorted, unique, and canonical;
duplicate declared digests are malformed commitment structure ⇒ **raw 100**
(not 107 — the commitment itself is structurally invalid before comparison).

This is the completeness invariant made local-then-global: each parent commits
its exact child universe; composition over the tree (§5) makes global
omission impossible without a local, signed lie — **the liar must ledger the
lie**, now with the exact child set, not just a count.

## 5. Tree verifier invariants

Recomputed bottom-up by a verifier that trusts no participant:

```text
exactly one root; root has parent_receipt_digest == null      (else raw 102)
every child.parent_receipt_digest == parent receipt digest    (else raw 103)
in_degree(root) == 0; in_degree(non_root) == 1                (else raw 113)
no cycles                                                     (else raw 104)
every node reachable from root                                (else raw 105)
```

Split-brain (raw 113) is first-class, never buried under "malformed": same
child claimed by two parents, same delegatee receipt under two roots, or one
receipt digest with conflicting parents.

## 6. Budget flux law (4K lifted to trees — no double-dipping)

Per node, with `local_spend` = Σ `spend` of the node's own crossing artifacts:

```text
local_spend <= budget_allocated                               (else raw 110)
local_spend + Σ child.budget_allocated <= budget_allocated    (else raw 109)
```

110 is checked before 109 (more specific first). Lean corollary (§15): total
tree spend ≤ root budget **for any tree shape** — structuring-by-delegation
(splitting one task across twenty sub-agents to dilute budgets) is
arithmetically undisguisable.

## 7. Scope attenuation law (lattice + path intersection)

Scopes form a meet-semilattice under set intersection. **For scope sets,
`A ⊑ B` iff `A ⊆ B`** (narrower = subset; no other reading is admitted):

```text
child_scope   ⊑ parent_scope        per edge                  (else raw 108)
path_scope(n) = root_scope ∩ edge₁ ∩ … ∩ edgeₙ
requested_scope(crossing) ⊑ path_scope(bound node)            (else raw 108)
```

**Narrowed novelty claim (source-mapped, §17):** runtime attenuation is
occupied prior art (Biscuit tokens, IBCT, APS "monotonic narrowing"). 4S's
contribution is attenuation as **offline-recomputable recorded evidence with a
machine-checked composition theorem** — they enforce narrowing at runtime and
ask you to trust it; we recompute and prove it from the receipts alone.

## 8. Authority-crossing binding — `authorise_with_chain`

Additive Capability Kernel entry, frozen-predecessor pattern (proven 4×:
4A `authorise` → 4B intent → 4C provenance → 4O manifest, all byte-frozen):

```python
authorise_with_chain(crossing_kind, crossing_artifact, chain_bundle, ...)
```

Refuses (fail-closed) any crossing whose receipt binding is absent, orphan,
out-of-scope, over-budget, or on a broken path — **No Ghost Hop is enforced
law at the guarded boundary, not described law.** Differential-equivalence
tests prove every frozen predecessor byte-identical on the full shipped
corpus. The reference corpus exercises a representative crossing set
(`tool_execution`, `export`, `privilege_expansion` at minimum), not a
re-implementation of all six kinds' runtime semantics — modelled-labels rail.

## 9. Replay binding

Every receipt binds `run_id + root_receipt_digest + epoch(4N anchor) +
delegator_key_digest + delegatee_key_digest + scope + budget` inside the
signed payload. The verifier cross-checks:

```text
receipt.epoch   == bundle.epoch          (else raw 114)
receipt.run_id + receipt.root_receipt_digest == bundle's root identity
                                         (else raw 115)
```

Wrong epoch is caught (114); wrong root with the RIGHT epoch — the real
laundering move, importing a validly-signed receipt from a sibling run — is
caught separately (115).

## 10. Merkle bundle commitment — inclusion is not completeness

`bundle_merkle_root` = Merkle root (4O machinery, reused verbatim) over all
receipt digests + fan-out commitments + crossing artifacts. Mismatch ⇒ raw 117.

**An inclusion proof proves "this was included." It does NOT prove "nothing
was excluded." Completeness comes ONLY from per-node fan-out commitments
composing over the verified tree (§4–§5). The Merkle root seals the bundle;
it never excuses omission.**

This line is machine-checked: Lean theorem `inclusionNotCompleteness` (§15)
exhibits a model where inclusion holds and completeness fails.

## 11. Raw codes 100–118 (closed block, no ornaments)

| raw | reason                           |
| --- | -------------------------------- |
| 100 | `malformed_chain_bundle`         |
| 101 | `signature_invalid`              |
| 102 | `root_missing_or_multiple`       |
| 103 | `parent_digest_mismatch`         |
| 104 | `cycle_detected`                 |
| 105 | `unreachable_node`               |
| 106 | `fanout_count_mismatch`          |
| 107 | `fanout_child_set_mismatch`      |
| 108 | `scope_attenuation_violation`    |
| 109 | `budget_flux_violation`          |
| 110 | `local_spend_overflow`           |
| 111 | `ghost_hop_detected`             |
| 112 | `receiptless_authority_crossing` |
| 113 | `split_brain_child`              |
| 114 | `epoch_replay`                   |
| 115 | `root_replay`                    |
| 116 | `spine_ref_mismatch`             |
| 117 | `merkle_bundle_mismatch`         |
| 118 | `internal_fail_closed`           |

**Frozen check order** (earlier failures mask later; tamper tests must
`reSign` mutated content to reach codes after 101 — 4R lesson):

```text
100 → 101 → 102 → 103 → 113 → 104 → 105 → 106 → 107 → 108 → 110 → 109
    → 112 → 111 → 114 → 115 → 116 → 117 → 118
```

**Reachability contract:** every code has at least one fixture that reaches
it (unreachable-code audit). The three ghost species are distinct and each
reachable:

- **106/107** — the _uncounted child_: a hop exists whose parent never
  committed it.
- **111 `ghost_hop_detected`** — the _orphan receipt_: an authority crossing
  binds to a digest that exists as a **validly signed receipt** but appears in
  NO committed child set and NOT in the bundle tree.
- **112 `receiptless_authority_crossing`** — no receipt binding at all.

**Signature semantics (fixture-honesty rule):** a present-but-empty, null, or
unverifiable required signature reaches **raw 101**, never 100; a MISSING
signature field is schema-malformed and reaches **raw 100**. The
single-signature-hop fixture (one neighbour withholds) therefore carries an
empty-string second signature to honestly reach 101. A referenced key digest
absent from `public_key_index` is unverifiable ⇒ **raw 101**
(`referenced_public_key_unverifiable`); a missing/malformed index itself ⇒
**raw 100** (`public_key_index_missing_or_malformed`).

**Binding-deferral rule (keeps 112/111 reachable, never masked):** the scope
(108) and flux (110/109) phases evaluate ONLY crossings whose
`bound_receipt_digest` resolves to a verified tree node. Receiptless,
unknown, or detached-bound crossings are deferred UNTOUCHED to the binding
phase, where:

- **112** = empty, missing, or unknown `bound_receipt_digest`;
- **111** = the digest exists as a validly signed receipt in
  `detached_receipts` but is absent from the verified tree and from every
  committed child set.

Without this rule a ghost-bound crossing would crash the scope/flux
arithmetic first and 112/111 would go flaky or dead.

**Crossing-signature rule (preserves check order + 112 reachability):** for a
crossing whose `bound_receipt_digest` resolves to a tree OR detached receipt,
`signature_actor` MUST verify against the public key for that
receipt's `delegatee_key_digest`; if it resolves and verification fails ⇒ raw 101. If the bound digest is empty or unknown, do NOT attempt crossing-signature
verification — defer to the binding phase so 112 stays reachable. When the
bound digest resolves into `detached_receipts`, that detached receipt's own
dual signatures are verified first (101), then `signature_actor` against its
`delegatee_key_digest`, before the crossing surfaces at 111.

**118 reachability:** `internal_fail_closed` is reached only by a
typed-wrapper fixture that injects an internal verifier exception / unknown
raw outcome and proves the fail-closed mapping — never by any well-formed
input.

**Dropped by design:** runtime `verifier_parity_mismatch`. JS↔Python parity
is a CI/reproduce/golden gate, not a verifier verdict — a verifier cannot
detect disagreement with a mirror that is not running.

**Golden sweep (spec-time list — the additive-code gremlin dies here).**
Adding 100–118 breaks, at minimum:

1. `tests/e2e/llmShield/stage4l/fullChain.e2e.test.js` unknown-code probe —
   **4R just moved it to `[100, 3]`; it must move to `[999, 3]`** (999 is
   permanently outside every planned block).
2. Stage-4H `exit-map.json` golden.
3. Stage-4H exitWrapper inline map + snapshots.
4. Stage-4K exitWrapper snapshots.
5. Any `[9x, 3]`-style **data-array** probes (4R lesson: sweep BOTH
   call-syntax and data-array forms with two grep passes).
6. Stage-4R e2e nets that enumerate the registry tail.

Task 1 of the plan performs the sweep with both grep forms before any new
code lands.

## 12. Adversarial matrix (Lane A fixtures, every row → expected raw)

| attack                                               | expected    |
| ---------------------------------------------------- | ----------- |
| hidden hop (child minted, never committed)           | 106/107     |
| orphan signed receipt used for a crossing            | 111         |
| crossing with no receipt binding                     | 112         |
| split-brain (two parents claim one child)            | 113         |
| forged attenuation (child scope ⊋ parent)            | 108         |
| crossing scope outside path intersection             | 108         |
| budget amplification (Σ children > parent)           | 109         |
| double-dipping (spend + delegate same budget)        | 109         |
| local overspend                                      | 110         |
| structuring (20 children, each under-threshold)      | 109         |
| replayed receipt, wrong epoch                        | 114         |
| replayed receipt, right epoch wrong root             | 115         |
| tampered spine ref                                   | 116         |
| receipt dropped after Merkle seal                    | 117         |
| single-signature hop (one neighbour withheld)        | 101         |
| cycle / unreachable node / dual root                 | 104/105/102 |
| expected-GREEN honest tree (deep + wide + zero-leaf) | 0           |

Plus two F9-style commitment probes: (a) a delegator who honestly LEDGERS an
over-budget delegation still fails 109 — committing the lie does not launder
it; (b) expected-GREEN — an honest zero-fan-out leaf commits its empty child
set and the whole tree passes 0.

## 13. Lanes

- **Lane A (deterministic):** fixture trees (depth ≥ 3, fan-out ≥ 3,
  zero-fan-out leaves) with `INSECURE_FIXTURE_ONLY` keys; byte-stable
  reproduce; full adversarial matrix.
- **Lane B (live):** two OS processes (4R ceremony machinery reused) form a
  real cross-process delegation A→B; one hop is a **genuine MCP client→server
  call** (4O live-capture machinery reused), receipted end-to-end with
  ephemeral keys; harness-computed hashes (3V-A discipline); ports in the
  reserved 33xxx CI range (3V-A flake lesson).

## 14. Two-tier verifier

- **Public tier:** digest-level — bundle structure, signatures, Merkle root,
  tree invariants, commitments, flux/scope laws recomputed from published
  digests. Raw evidence never required.
- **Audit tier:** full recomputation including crossing payload digests and
  spine-ref resolution against the shipped 4P/4O/4Q bundles, unilateral (no
  operator cooperation needed).

**Verifier key hygiene:** the attestation is signed with the stage4s PRIVATE
key, but verification NEVER needs it. Commit the matching public key
`test-keys/INSECURE_FIXTURE_ONLY_stage4s_root.pub.pem`; the build CLI takes
`--key` (private), the verify CLI takes `--pubkey` defaulting to the committed
public key. The private-key audits scan private PEMs only — the `.pub.pem` is
public material and outside their scope.

Verify-only reproduce script `scripts/reproduce-llm-shield-stage4s.sh`
(Node 26 byte-stability gotcha; guarded `lean` call exactly as 4R's).

## 15. Lean theorems — `proofs/stage4s/NoGhostHop.lean`

Single file, Lean 4 v4.15.0, no mathlib, zero `sorry`, added to BOTH the
lean-check job and the guarded reproduce call (4R CI lesson):

1. `noGhostHop` — the trilemma: in the symbolic model, a hop off the
   committed tree either breaks a fan-out commitment, yields an orphan
   binding, or leaves the crossing receipt-less — detectable at the guarded
   boundary in all three branches.
2. `attenuationComposes` — `path_scope(n) ⊑ root_scope` for every path
   (transitivity of ⊑ over intersections).
3. `fluxConservation` — total tree spend ≤ root budget for ANY tree
   satisfying the per-node law (structural induction).
4. `fanoutSound` — per-node committed set = observed set over a verified
   tree ⇒ no omitted node (completeness over declared participants).
5. `splitBrainExcluded` — single root + in-degree ≤ 1 + reachability ⇒ the
   receipt graph is a tree.
6. `inclusionNotCompleteness` — a constructed model where Merkle inclusion
   holds and completeness fails: the §10 bold line, machine-checked.

## 16. Python parity kernel

`tools/simurgh-attestation/stage4s/python/vdcc_kernel.py` — pure stdlib
reimplementation of tree verification, fan-out recomputation, flux and scope
laws; byte-parity on verdicts + raw codes against the JS core over the full
Lane-A corpus (4R pattern, CI-gated as tests, not a runtime code).

## 17. Prior-art source map (surveyed 2026-07-06)

| Prior art                                                                 | Has                                                                          | Lacks (the 4S blade)                                                                                                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| APS (aaif proposal #14, verified directly)                                | Ed25519 passports, six receipt types, Merkle settlement, monotonic narrowing | **No completeness proofs, no cardinality/fan-out commitments, no hostile-verifier offline recomputation, no budget conservation, no machine-checked proofs** |
| Biscuit / IBCT (arXiv 2603.24775 AIP)                                     | Attenuated capability token chains across MCP/A2A                            | Runtime trust; no recorded-evidence recomputation; no completeness                                                                                           |
| Notarized Agents (arXiv 2606.04193)                                       | Receiver-attested per-action receipts                                        | No chain completeness; no fan-out; no tree                                                                                                                   |
| Vorlon / AgentRx / AIR / Causality                                        | Telemetry, replay UX                                                         | Trust-the-writer; no negative-space proof                                                                                                                    |
| SCITT / in-toto / AIVS                                                    | Artifact notarization                                                        | Artifacts, not delegation trees; inclusion ≠ completeness                                                                                                    |
| SentinelAgent (2604.02767), Decision Evidence Maturity Model (2605.04093) | Policy verification / maturity taxonomy                                      | No recomputable chain evidence                                                                                                                               |

Falsifier (inherited from the north star): a shipped system providing
offline-recomputable delegation-chain evidence with an explicit completeness
commitment, verifiable by a party trusting no participant → cite, re-score,
narrow.

## 18. Four-axis scorecard (honest; re-score at closeout)

| Axis               | Pre-score |
| ------------------ | --------: |
| Novelty            |   **9.4** |
| Frontier           |   **9.3** |
| Good-for-Anthropic |   **9.3** |
| Constitution       |   **9.1** |

- **Novelty 9.4** — fan-out commitment over trees, flux conservation, and
  the machine-checked No Ghost Hop trilemma are unoccupied (APS-verified);
  held from higher because attenuation and receipts individually are occupied
  and the claim is narrowed accordingly.
- **Frontier 9.3** — the multi-agent audit gap is named by regulators,
  insurers, and Anthropic itself ("no longer neatly visible as a single
  thread of actions"); 84% of security professionals can't pass an
  agent-behavior audit.
- **Good-for-Anthropic 9.3** — the evidence substrate under the third-party
  ecosystem bet; subagent oversight made recomputable.
- **Constitution 9.1** — oversight/accountability clauses become
  machine-checkable ACROSS delegation, not within one run.

**What moves each higher:** Novelty → a cross-org Lane B (real second
organization) or an adopted schema; Frontier → 4T's Incident Capsule landing
before the Aug-2026 Art-73 date; Good-for-Anthropic → receipting a real
production subagent framework hop; Constitution → extending the Lean model to
cover consent broadening end-to-end.

**Reviewer-hardness commentary (not a fifth axis):** high — the stage attacks
omission, replay, over-delegation, and false completeness rather than signing
another log; every failure mode is a distinct reachable code with a fixture.

**Closeout re-score (2026-07-06, shipped):** Novelty **9.4** (unchanged; the
content-addressing-forbids-cycles finding is a bonus strengthening); Frontier
**9.4** (+0.1 — the real two-process MCP hop lands the frontier sentence);
Good-for-Anthropic **9.3** (unchanged); Constitution **9.1** (unchanged;
consent-broadening end-to-end deferred to 4T). See
`docs/research/llm-shield/STAGE_4S_CLOSEOUT.md`.

## 19. Standing requirements (MANDATORY before tag)

- **K7-style all-functions E2E net**: composes every stage4s export, full
  tamper matrix (§12), cross-stage invariants (4N anchor, 4P/4O/4Q spine
  refs, registry integrity 0–118), Lane A ↔ Lane B ↔ packet ↔ two-tier
  verifier — the plan ENDS with this plus a comprehensive docs-accuracy pass
  (every doc claim verified against shipped code).
- Overclaim scan (honest negations phrased to survive it — 4N lesson).
- `.prettierignore` for `evidence/stage-4s` deterministic fixtures (4K/4N
  lesson); split CLI write-hashes AFTER prettier (3T lesson).
- Private-key audit allowlist by path regex in BOTH 3M and 3O scripts (4P
  lesson).
- `npm test` gates `tests/unit` only — stage4s e2e must be wired into
  `check-e2e.sh` explicitly (4L lesson); explicit `*.test.js` globs, never
  bare dirs (4K lesson); never shell `rg` in a unit test (4L lesson).
- Version check against `git tag --sort=-creatordate` before tagging (4J
  lesson).
