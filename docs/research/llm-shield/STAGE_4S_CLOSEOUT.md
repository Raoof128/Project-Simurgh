# Stage 4S — VDCC-Core Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.** (Standing convention since 4M:
safe for the lab audience in content AND structural egress, then recomputable by
any reviewer — a design-order tie-break, not an endorsement claim.)

- **Date:** 2026-07-06 · **Tag:** `v2.28.0-stage-4s-vdcc-core`
- **Law:** **No Ghost Hop.** · **Banner:** first rung of the VDCC north star.
- **Spec:** `docs/superpowers/specs/2026-07-06-stage-4s-vdcc-core-design.md`
- **Plan:** `docs/superpowers/plans/2026-07-06-stage-4s-vdcc-core.md`

## Core claim (frozen)

> A delegated agentic authority tree cannot omit, invent, replay, over-spend,
> over-scope, or ghost-hop authority without producing an offline-verifiable
> verifier failure.

## What shipped

- **Four schemas** (`tools/simurgh-attestation/stage4s/`): dual-signed hop
  receipts, window-close fan-out commitments (exact child set), authority-crossing
  artifacts, and a four-array chain bundle sealed under one Merkle root, carrying a
  `public_key_index` so the verifier trusts no participant.
- **Decision engine** (`core/chainCore.mjs`) running the frozen first-failure order
  `100→101→102→103→113→104→105→106→107→108→110→109→112→111→114→115→116→117→118`,
  with the **binding-deferral rule** keeping 112/111 distinct and reachable.
- **Four laws**: tree invariants (root/parent/split-brain/cycle/reachability),
  window-close fan-out completeness, lattice scope attenuation, and budget flux
  (`local_spend + Σ child_budgets ≤ budget`, no double-dipping).
- **Capability Kernel** entry `authorise_with_chain` (sixth additive family member;
  the five predecessors are byte-frozen — differential-equivalence gate green).
- **Lane A**: an 18-fixture deterministic corpus (committed keys, byte-stable).
- **Lane B**: a genuine two-OS-process ceremony over a real **MCP stdio** hop, with
  ephemeral keys, offline-verifiable.
- **JS↔Python parity**, a **two-tier signed attestation** (public structural + audit
  engine-rerun), **six machine-checked Lean theorems**, and a one-command reproduce.

## Honest results

| raw | reason                         | how exercised                                                              |
| --- | ------------------------------ | -------------------------------------------------------------------------- |
| 0   | green                          | honest tree; Lane B live MCP hop                                           |
| 100 | malformed_chain_bundle         | missing signature field / malformed key index / duplicate declared digests |
| 101 | signature_invalid              | single-signature hop; wrong-key crossing; unresolvable key digest          |
| 102 | root_missing_or_multiple       | dual sentinel root                                                         |
| 103 | parent_digest_mismatch         | unresolvable parent digest                                                 |
| 104 | cycle_detected                 | **defensive** — see note below (unit-tested, treeCore)                     |
| 105 | unreachable_node               | null-parent non-sentinel island                                            |
| 106 | fanout_count_mismatch          | hidden/uncounted child; missing leaf commitment; wrong-window commitment   |
| 107 | fanout_child_set_mismatch      | right count, swapped child digest                                          |
| 108 | scope_attenuation_violation    | forged child scope; crossing outside path intersection                     |
| 109 | budget_flux_violation          | amplification / double-dipping / structuring                               |
| 110 | local_spend_overflow           | leaf overspend                                                             |
| 111 | ghost_hop_detected             | crossing bound to a detached (orphan) receipt                              |
| 112 | receiptless_authority_crossing | empty bound digest                                                         |
| 113 | split_brain_child              | one delegatee claimed under two parents                                    |
| 114 | epoch_replay                   | receipt epoch ≠ bundle epoch                                               |
| 115 | root_replay                    | wrong root digest, right epoch                                             |
| 116 | spine_ref_mismatch             | tampered spine ref not in spine_index                                      |
| 117 | merkle_bundle_mismatch         | detached receipt appended after seal                                       |
| 118 | internal_fail_closed           | **defensive** — typed wrapper, unit-tested (chainCore)                     |

**Two honest structural findings (documented, not gaps):**

1. **104 (cycle) and a resolving-parent island are impossible to forge in a
   well-formed content-addressed bundle** — a child's digest depends on its
   parent's, so a parent-pointer loop has no fixed point. This is a _strengthening_
   of No Ghost Hop (you cannot even construct a cyclic delegation graph with valid
   digests). 104 is exercised as real detection code via a hand-crafted index in
   `treeCore.test.js`; the Lane A corpus therefore covers 0 and 100–117 except 104.
2. **118 is typed-wrapper only** by construction (an internal exception path),
   exercised via a BigInt-poisoned bundle in `chainCore.test.js`.

Test totals: stage4s unit **59** + K7 e2e **7** + Lane B e2e **1**; adapter suite
**181** (five frozen predecessors + the new entry); Lean **6 headline theorems**
(plus supporting lemmas — 10 checked statements total), **zero sorry**. JS↔Python
parity holds on all 17 non-signature fixtures. `npm test` and `check-e2e.sh` green;
reproduce byte-stable under Node 26.

## Four-axis re-score (closeout)

| Axis               | Pre | Closeout | Note                                                                                                                                                           |
| ------------------ | --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 9.4 | **9.4**  | fan-out-over-trees + flux conservation + machine-checked No Ghost Hop trilemma remain unoccupied (APS-verified); content-addressing-forbids-cycles is a bonus. |
| Frontier           | 9.3 | **9.4**  | the real two-process **MCP** hop lands the frontier sentence: first offline-recomputable completeness evidence over a genuine agent-to-agent hop.              |
| Good-for-Anthropic | 9.3 | **9.3**  | evidence substrate under the third-party-ecosystem bet; subagent oversight made recomputable.                                                                  |
| Constitution       | 9.1 | **9.1**  | oversight/accountability made machine-checkable across delegation; consent-broadening end-to-end is deferred to 4T.                                            |

**Reviewer-hardness (commentary, not an axis):** high — every raw code is a distinct,
reachable, tested failure species; the stage attacks omission/replay/over-delegation/
false-completeness rather than signing another log.

## Reviewer instructions (one command)

```
bash scripts/reproduce-llm-shield-stage4s.sh
```

Verify-only for Lane B (the committed capture is re-verified, never regenerated —
ephemeral keys); Lane A corpus + attestation are deterministic and byte-compared.
No network, no wall clock. Requires Node ≥ 26 for byte-stability; the Lean proof is
built only if `lean` is on PATH (otherwise the dedicated `lean-check` CI job covers
it).

## Gotchas recorded

- Additive codes 100–118 broke **9** unknown-code probes across 4H/4K/4L/4M/4N/4O/4P/4R
  plus the 4H `exit-map.json` evidence; the permanent unknown-probe value is now **999**.
- `buildHopReceipt` forces `root_receipt_digest = ROOT_SENTINEL` for any null-parent
  receipt — hand-build island fixtures to reach 105.
- The committed `capability_kernel.py` is not black-clean; do **not** run black on it
  (it would reformat frozen predecessors). Format only new files.
- Next rung: Stage 4T — the Incident Capsule (Art-73 projection over a real chain).
