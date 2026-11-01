# Phase 19f: outside-operator replay (owed)

`IOU-19-OPERATOR`: no outside operator has run any Phase 19 pack. This directory holds the package
that makes the replay a run of named commands against named expectations:

- [HANDOFF.md](HANDOFF.md): generated from the committed receipts; custody rules, one command per
  phase, the expected fields, how to return the receipt.
- [discrepancy-template.json](discrepancy-template.json): what the operator fills in.
- `operator-receipts/`: returned receipts, committed unchanged. Empty.

Status (recomputable):

```sh
python -B tools/assurance-provenance/handoff19.py status
```

There is no pack here. Nothing ran that a pack could bind; the first operator receipt is the
evidence, and its review with every discrepancy published is what pays the IOU.
