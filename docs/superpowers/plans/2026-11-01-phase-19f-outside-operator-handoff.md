# Phase 19f implementation plan — outside-operator handoff package

**Date:** 1 November 2026 · **Design:** [Phase 19 v2.1](../specs/2026-11-01-phase-19-authority-provenance-design.md) §6 row 19f, §12 `IOU-19-OPERATOR` ·
**Baseline:** branch `phase-19/authority-provenance` @ `e6cbf41b`.

19f is the first custody evidence: an outside operator (the owner-arranged classmate) replays the
Phase 19 packs on their own machine from a published commit and returns a receipt with
discrepancies. The replay needs a person; this plan builds the **package** so that the replay is a
run of named commands against named expectations, and so that the returned receipt is compared
mechanically rather than read.

## Files

```
tools/assurance-provenance/
  handoff19.py            # renders HANDOFF.md from the committed receipts; expected fields per phase;
                          # compares an operator's receipt; discrepancy template; IOU status
  tests/test_handoff19.py
docs/research/provenance-phase-19f/
  README.md               # status: IOU-19-OPERATOR owed
  HANDOFF.md              # generated; the test asserts it equals handoff19.render()
  discrepancy-template.json
  operator-receipts/README.md   # where returned receipts go; none yet
```

## The package

1. **Expected fields.** For each executed phase (19a, 19b, 19c, 19d, 19e, 19g), the committed
   `receipt.json` minus the host-dependent fields (`tree_state`, `host`, `replay`). Everything else,
   including `manifest_sha256`, must match on the operator's machine.
2. **Commands.** The exact verify command per phase, the expected run time, the host requirement
   (19d is Linux with user and network namespaces), and the tests command.
3. **Custody rules.** The operator clones the published commit, receives no file from the author,
   edits nothing, and returns the receipt JSON as the verifier printed it plus a short signed note
   naming the machine, OS, Python and the commit.
4. **Comparator.** `handoff19.check(phase, receipt)` lists every field that differs or is missing;
   an empty list is "no discrepancy". The committed receipt compares to itself as empty.
5. **Status.** `IOU-19-OPERATOR` is `owed` until a receipt file exists under `operator-receipts/`;
   the status function counts them and never marks the IOU paid by itself.

## Gate for 19f-package

`HANDOFF.md` recomputable from the receipts; comparator detects a changed root and a missing field
and returns empty on the committed receipts; status reads `owed`. No pack: nothing ran that a pack
could bind. The replay itself is owed.
