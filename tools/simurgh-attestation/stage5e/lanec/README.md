# Stage 5E VDA — Lane C capture + BYO adapter (non-CI, digest-only)

> Motto: **AnthropicSafe First, then ReviewerSafe.**

## `capture.py` — the offline Prompt Guard 2 capture (executed)

Loads `meta-llama/Llama-Prompt-Guard-2-86M` at a pinned revision, **offline, zero vendor cooperation**
(open weights we downloaded), and scores the published corpus. Deterministic runtime: `cpu` / `float32`
/ 1 thread / `max_length=512`. The **positive class index is derived empirically from the model** (its
`config.json` has no `id2label`): the index that scores higher for a clearly-malicious probe than a
benign one. Emits `capture-result.json`, consumed by `../node/build-vda-evidence.mjs`.

Prerequisite: an HF token that has accepted the Llama license (the model is gated). Run:

```bash
python3 tools/simurgh-attestation/stage5e/lanec/capture.py
node   tools/simurgh-attestation/stage5e/node/build-vda-evidence.mjs
```

Executed grounding (committed): **4 of 8 published bases flagged at baseline; all 4 slip** under
invisible combining-mark obfuscation (evasion scores 0.003–0.030), and **de-obfuscation recovers the
original score exactly** — a clean, real monotonicity-inversion. The other 4 bases are recorded as
`baseline_missed` (full census, no cherry-pick).

## `byoAdapter.mjs` — bring-your-own detector (the path to a real external party)

A richer `capture(text) → {score:"0.####", label_map, positive_class_index, detector_revision,
runtime_digest, input_digest}` contract (not a bare `score→float`), so a foreign guardrail team points
VDA at **their** detector. This is the artifact a **real external party** runs — the reserved path to a
10 on the founder's ledger. VDA is scoped to a **binary two-logit detector**; a multi-class panel is
minted `multi_detector_panel_deferred`.

**Honesty:** the offline capture attests the **shipped open-weights artifact at a pinned revision**, not
a live hosted endpoint (signed limitation, spec §5). A slip is a chosen-threshold miss on that
revision — **not** a defeat, and not proof of downstream harm.
