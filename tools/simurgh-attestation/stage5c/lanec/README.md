# Stage 5C VSB — Lane C (real-detector grounding)

**NEVER CI-gated. Keyed, offline, digest-only public artifact.** Lane C runs the identical
`(MR × base)` mutation engine against a **real shipped guardrail** expressed as `flagged(text)`, so
the ledger reads "we beat a deployed detector," not only "we beat our own gates."

- **`detectorAdapter.mjs`** (CI-safe) — the BYO `flagged(text)` interface + `lane_c_binding` shape
  validation. Imports **no** torch/transformers, so it is safe in `node --test`.
- **`promptguard-adapter.py`** (NON-CI) — a worked Prompt Guard (86M) example, pinned threshold.
  Requires `torch`/`transformers`; excluded from pytest and `scripts/check.sh`.
- **`run-vsb-lanec.py --dry-run`** (NON-CI) — orchestrates a capture into an `external_detector`
  bundle; the raw flagged-prompt base texts + mutated texts live in an **audit-private** artifact
  (never public, never CI). The public artifact is digest-only.

## Honest scope

- Base corpus is **different** from Lane A: Prompt Guard is an input-prompt classifier, so Lane C's
  bases are flagged *prompts* — same engine, different bases (spec §4 honest wrinkle).
- A slip here measures that detector's meaning-blindness **at the pinned version and threshold** —
  never a claim about the provider's underlying model, and never a kernel breach (Law 3).
- Public tier verifies digest binding + shape only; the audit tier, given the audit-private log,
  recomputes `applyMR5C` and the partition — Prompt Guard is not re-invoked in CI (P0-5).
- This lane does **not** retire `live_adversary_capture_lane_deferred` (a defensive detector is a
  different species from a live adversarial model). **Not executed this build** — mechanism +
  adapter only; a real Prompt Guard capture is the honest next increment.
