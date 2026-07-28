# The gate lifecycle invariant

**Authoritative version.** A copy exists in the local agent skill for convenience; this file is the
source of truth, and the copy follows it rather than the other way round.

> **Every stage-installed gate must declare its successor-stage behaviour before the stage freezes.**

## Why the rule exists

A gate is written for one phase and then outlives it. The Q1-F001 repair — retiring the by-name Lean
proof list — surfaced five findings, and **three were the same species**: a check still enforcing a
frozen moment against a moving repository, long after the phase it was written for had ended.

| finding     | the gate                             | what it did after its phase ended                                                                                                                                                                                                  |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1-F002** | Stage 5Q's gate-census pin           | Pinned a headcount of 12. Stage 5R added seven CI steps, and 5Q's reproduce went red on `main` and stayed red unnoticed, because nobody re-runs a prior stage's script.                                                            |
| **Q1-F004** | Stage 5Q's Q0→Q1 transition tripwire | Asserted `named < existing`. A repaired gate naming **zero** proofs satisfies that, so the assertion written to "fail loudly when the fix lands" passed in silence.                                                                |
| **Q1-F005** | Stage 5R's CI job                    | Declared `pull_request: branches: ["main"]` with no `paths:` filter, so it judged every pull request against a surface its own spec calls exhaustive over 5R-owned files. Every pull request after 5R merged was destined to fail. |

None of these was a subtle bug. Each was a correct gate outliving its context, and each was found by
accident rather than by a check — which is precisely why the declaration below is mandatory at spec
time rather than advisory afterwards.

## The six required declaration fields

Every stage's spec declares, for each gate the stage installs:

```text
active_phase                   the phase this gate governs
protected_surface              what it protects, by path or by set
next_phase_behaviour           what it does to the NEXT stage's branch
maintenance_behaviour          how a bounded repair is authorised
sunset_or_migration_condition  when it stops applying, or what replaces it
anti_vacuity_condition         what makes a pass impossible to fake
```

A gate whose `next_phase_behaviour` is "blocks everything" is not shippable. A gate with no
`anti_vacuity_condition` is not a gate — it is a green light with no wire behind it.

## The four measured failure modes

1. **Pin sets, never counts.** A count launders: repair one problem, introduce another, and 19 stays
   19 while the landscape moves. Pin `{id, reason_code}` pairs, compare by identity, and report
   `added` and `removed` **independently** so a repaired entry can never mask a new one. Stage 5Q had
   already written this rule for its write-surface ledger — "declared by SET, never by COUNT" — and
   did not apply it to its own census pin.

2. **Assertions must be exact in both directions.** A one-sided bound is a countdown, not an
   invariant: it detects drift one way and is satisfied by the extreme of the other. An assertion
   that the named count is _less than_ the existing count is satisfied by a fully repaired gate that
   names nothing at all.

3. **Scope a CI trigger to the stage's own paths.** A stage's write surface governs that stage's
   branch. Enforced against the whole repository it stops measuring the stage's discipline and starts
   measuring whether anyone has done anything since. Compare Stage 5Q's workflow, which carries a
   `paths:` filter listing its own files, with Stage 5R's, which did not.

4. **An empty evaluated range is not a passing result.** These gates diff `MERGE_BASE..HEAD`. Run
   with the work uncommitted, they examine nothing and print green — which is how the Q1-F001 repair
   was first reported as "21/21 gates passed" when two of those gates had evaluated an empty range.
   **An empty range while the working tree carries relevant changes is a refusal**
   (`uncommitted_changes_not_evaluated`), never a pass.

## Authority precedes action

A bounded repair inside a frozen surface is authorised only by a declaration that **already exists**
when the repair lands:

- the exact paths are named in the spec **first** — "obviously intended" is not a permission;
- each path carries a permitted operation (`add` / `modify`), a purpose and a finding id, because an
  allowlist of files alone would permit unrelated edits inside an authorised file;
- the commit carrying the authority is a **strict ancestor** of the commit performing the repair, and
  this is **checked by commit ancestry rather than asserted**. A permission written after the
  crossing is not a permission, and a checker that cannot tell the difference is not a gate.

### Worked example — Stage 5Q, Annex A5

Three correct statements formed a deadlock. §14.2 assigned finding 5Q-F001's repair to Q1; §6.1
refused the file with the words _"repairing it is Q1's job"_; and the Q0→Q1 transition validator
refused Q1 (T3 failing with 2 522 members carrying no coverage status). The repair was authorised in
prose and forbidden by every gate.

The two exits that needed no annex — disabling the gate that had correctly caught the change, or
filing authorised work as a violation — were both worse than the deadlock. Annex A5 instead declared
a second, narrower `maintenance` surface beside the Q0 one: eight exact paths, each with an
operation, a purpose and a finding id, parsed **from the spec** rather than re-declared in code, and
admitted only when the annex commit precedes the repair commit. It claims no transition — Q1 remains
refused, T1–T7 untouched, the freeze digest unmoved, no published number changed.

## Related failure worth naming

**A premise recomputed against the live tree dies the moment its finding is fixed.** Stage 5Q's
finding ledger recomputed F001's claim digest by reading the live workflow, so repairing the finding
invalidated the record of it — the ledger would have punished the repair it existed to demand.
Historical premises must recompute against **captured bytes**, pinned by a digest the frozen record
already committed, so the capture is verified rather than trusted.

## Sources

- `Q1-F002`, `Q1-F004`, `Q1-F005` — `docs/research/llm-shield/evidence/stage-5q-q1/q1-finding-ledger.json`
- Annex A5 — `docs/superpowers/specs/2026-07-26-stage-5q-vsr-stage-wide-red-team-design.md`
- The repair that surfaced them — `scripts/check-lean-proofs.mjs`, `scripts/lib/leanProofGate.mjs`
