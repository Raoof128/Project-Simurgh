# Stage 4L / CCB — Evidence Pack

Frozen summary artifacts for the Q9 cluster-commitment budget gate. These are synthetic — no real
company, lab, account, or incident figure appears anywhere in this stage. Regenerate and verify
everything with `bash scripts/reproduce-llm-shield-stage4l.sh` (Node 26).

## Contents

- `cluster-matrix.json` — the expected Q9 verdict for every committed bundle (the reproduce
  script checks the live verifier against this).
- `structuring-ccb-attestation.json` / `structuring-cluster-cardinality.json` — the crown
  negative: 100 accounts × 1 request in one shared cluster. Per-account budgets pass (F8 control);
  Q9 records `q9_status: "over_budget"` at cluster level (raw 41). The cardinality commitment shows
  one cluster of 100.
- `singleton-evasion-ccb-attestation.json` / `singleton-evasion-cluster-cardinality.json` — the
  honest hole: the same 100 accounts placed in 100 singleton clusters. Q9 passes (F9,
  expected-green), and the cardinality commitment records `"1": 100` — the evasion is not detected,
  it is **ledgered**.

## What this proves, and what it does not

CCB proves budget enforcement *given* a provider-supplied cluster commitment, replayably and
offline, without exporting raw identity. It does not solve Sybil (`not_sybil_closure`), does not
close structuring without provider binding (`not_structuring_closure_without_provider_binding`),
does not prove identity truth, assumes the provider cluster graph, and does not replace prevention
credentials or provider fraud detection. See `../../STAGE_4L_THREAT_MODEL.md` for the full signed
non-claims list and the adjacent-lanes comparison.
