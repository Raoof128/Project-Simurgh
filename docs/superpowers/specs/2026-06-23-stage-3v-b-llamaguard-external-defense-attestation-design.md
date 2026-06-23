# Stage 3V-B — Live Llama Guard 4 External-Defence Containment Attestation — Design Spec

> Status: APPROVED (2026-06-23). Next step: writing-plans.
> Builds on Stage 3V-A (recorded external-signal attestation, v2.5.0). 3V-A proved the
> instrument with a recorded fixture; 3V-B points that same instrument at a real **live**
> Llama Guard 4 capture, then freezes and attests the evidence.

## Crown sentence

**Stage 3V-B does not claim Llama Guard 4 is reproducible. It claims the evidence is reproducible,
the live capture is provenance-bound, and the committed frozen-capture replay artifact lets
reviewers reproduce the signed attestation offline.**

## Steel thread (boundary claim, NOT an anti-Llama-Guard claim)

**An input-only guardrail can only judge the user turn. In the 120 input-miss cases the user
task is benign and the attack lives downstream in untrusted context, tool requests, or provider
output. Stage 3V-B measures that limitation honestly, then verifies whether Simurgh's
consequence boundaries contain the unsafe path anyway.**

## Locked claim wording

Stage 3V-B is live-capture, replay-reproducible. Llama Guard 4 is executed once in a controlled
GPU capture environment. The resulting verdict observations are frozen, hash-bound, and
accompanied by a signed capture-provenance manifest recording the model identifier, model
revision, weights digest, tokenizer/chat-template digest, decode parameters, runtime versions,
hardware class, and capture timestamp. Offline verification replays the frozen capture and
reproduces the signed attestation byte-identically. It does not re-execute Llama Guard 4 in CI.

---

## 1. Decisions (all locked during brainstorming)

| #                     | Decision               | Choice                                                                                                                                                                                                  |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model + stack         | What external defence  | `meta-llama/Llama-Guard-4-12B` via HF `transformers` (gated; text-only surface; greedy decode)                                                                                                          |
| Input surface         | What we feed LG4       | Option A — the case's real `user_task` string, wrapped as a single `user` turn in LG4's official chat template. Preflight-gated 180/180 feedable.                                                       |
| Reproducibility claim | What 3V-B attests      | Option A — replay-reproducible attestation over the frozen capture + signed capture-provenance. `model_reexecuted_in_ci: false`. Re-running the model in CI (B) and capturing logits (C) both rejected. |
| Topology              | Where each step runs   | Option A — RunPod Python = transport-only (inference + raw outputs + self-reported provenance). Mac JS trusted harness = normalise + hash + build + sign. Private key never leaves the Mac.             |
| Sequencing            | Build vs capture order | Option 1 — build+test the full machine against a small CI-safe sample capture; run the real 180-case RunPod capture as the final controlled act. **Release v2.6.0 only from the real capture.**         |

## 2. Decode parameters (frozen)

```json
{ "do_sample": false, "temperature": 0, "max_new_tokens": 64 }
```

## 3. Topology (locked)

```
RunPod Python  = inference transport only
Mac JS harness = normalise, hash, build bundle, verify, sign
Private key     = Mac only (~/.simurgh/3v-b-ed25519.pem, mode 0600)
Raw LG4 output  = local transient capture input, never signed/exported as raw text
```

**On RunPod (transport-only):** load LG4 → apply chat template → greedy decode → write raw
per-case LG4 output → write self-reported capture provenance. No signing, no normalisation,
no trusted hashes, no authority.

**Bring back to Mac:** the unsanitised raw capture lands local + gitignored under
`.simurgh/captures/stage-3v-b/lg4-raw-capture.json` (NOT under `tests/fixtures/`). The trusted
harness then transforms it into a **committed, privacy-audited frozen-capture replay artifact**
(see §4) so reviewers and CI can reproduce the signed attestation offline.

**On Mac (trusted harness):** read raw capture → parse LG4 grammar → normalise to
`allow|block|warn|abstain|error` → reject any adapter-supplied `hash`/`digest` field
(`adapter_supplied_hash_forbidden`) → compute all hashes → build VCA bundle → sign locally
with the 3V-B Ed25519 key.

## 4. Privacy rule + committed frozen-capture replay artifact (Fix-2 carried, reproducibility restored)

**The contradiction this resolves:** a raw capture that is gitignored-only makes the signed
bundle _verifiable_ but not _reproducible_ by reviewers (they could check the signature but never
recompute `external_raw_output_hash` from the capture). 3V-B therefore commits a sanitised replay
artifact so the full offline reproduce path works for everyone — without exporting any prompt.

**Committed replay artifact:**
`docs/research/llm-shield/evidence/stage-3v-b/capture-replay/lg4-frozen-capture.json`

```json
{
  "schema": "simurgh.stage3vb.frozen_lg4_capture.v1",
  "contains_raw_prompts": false,
  "contains_hf_token": false,
  "contains_secrets": false,
  "cases": [{ "case_id": "...", "raw_lg4_output": "safe" }],
  "capture_provenance": {}
}
```

It contains ONLY `case_id` + raw LG4 _classifier_ output (`safe` / `unsafe\n<S-codes>`) +
provenance. LG4 classifier text is not the prompt, so it is safe to commit **once the privacy
audit confirms it**.

**Privacy-audit fail-closed rule (locked):** the frozen-capture replay artifact may contain raw
LG4 classifier text only if the privacy audit confirms it contains no prompt text, no secrets, no
HF token, no email, and no copied `user_task` content. If any LG4 output echoes the prompt or
contains sensitive text, the build fails closed and the capture must be redacted/re-run.

**The signed bundle still inlines no raw output.** It references and hashes the committed replay
artifact via `capture_file_hash`; raw LG4 output is an audited _replay input_, not bundle
content. Prompt binding stays hash-only:

```json
{ "input_surface": "user_task", "input_cases": 180, "input_manifest_hash": "sha256:..." }
```

The unsanitised `.simurgh/captures/...` file remains gitignored and local; it is the source the
harness sanitises _from_, never a published artifact.

## 5. Bundle schema additions (over the 3V-A `simurgh.vca.external_defense_run.v1` shape)

Stage `3V-B`; `target_defense.live: true`.

```json
{
  "capture_mode": "live_capture_frozen_replay",
  "model_reexecuted_in_ci": false,
  "target_defense": {
    "name": "llama_guard_4",
    "model_id": "meta-llama/Llama-Guard-4-12B",
    "surface": "input_only",
    "live": true,
    "decode": { "do_sample": false, "temperature": 0, "max_new_tokens": 64 }
  },
  "run_set": {
    "stage3l_corpus_manifest_hash": "sha256:...",
    "input_surface": "user_task",
    "input_cases": 180,
    "input_manifest_hash": "sha256:..."
  },
  "capture_provenance": {
    "model_revision": "...",
    "weights_digest": "sha256:...",
    "tokenizer_digest": "sha256:...",
    "chat_template_hash": "sha256:...",
    "transformers_version": "...",
    "torch_version": "...",
    "cuda_version": "...",
    "gpu": "...",
    "python_version": "...",
    "captured_at_utc": "...",
    "capture_origin": "self_reported_capture_environment",
    "model_weights_digest_source": "capture_environment_self_reported",
    "model_weights_recomputed_by_verifier": false
  },
  "gateway_computed_hashes": {
    "external_raw_output_hash": "sha256:...",
    "external_normalised_verdict_hash": "sha256:...",
    "adapter_config_hash": "sha256:...",
    "capture_provenance_hash": "sha256:...",
    "capture_file_hash": "sha256:...",
    "capture_script_hash": "sha256:...",
    "prompt_rendering_hash": "sha256:..."
  }
}
```

### Amendment bolts (locked)

1. **`capture_file_hash`** — binds the committed frozen-capture replay artifact (§4) (proves the
   signed evidence was built from a specific frozen capture and that reviewers replay the same one).
2. **`capture_script_hash`** — binds the RunPod Python capture harness (proves "this exact
   capture harness produced the raw outputs", not just "model X ran").
3. **`prompt_rendering_hash`** — binds the chat-template rendering logic + `input_manifest_hash`
   binds the exact input strings (answers "how do I know what exact string LG4 saw?").
4. **`capture_integrity_preflight`** — see §7.

All seven hashes are **harness-computed** (trusted Simurgh path), never adapter-supplied.

## 6. Known limitations (signed into the bundle)

- `live_capture_origin_self_reported` — Offline verification can prove the signed attestation
  reproduces over the frozen capture and that the capture is hash-bound to the provenance
  manifest. It cannot independently prove that the rented GPU actually executed Llama Guard 4
  exactly as self-reported.
- Input-only surface: LG4 sees only the `user_task` turn; downstream-injection cases are
  structurally invisible to it (this is the steel thread, stated as a limitation not a defect).

## 7. Preflight gates (fail-closed)

**(a) Feedable-input preflight** (corpus side, before capture). Verified passing during
brainstorming: 180/180 `user_task` non-empty, field `user_task`.

```json
{
  "stage3l_cases": 180,
  "feedable_input_cases": 180,
  "missing_input_cases": 0,
  "input_surface": "user_task",
  "synthetic_render_used": false
}
```

If any fixture lacks feedable input text: do NOT silently synthesize — stop and report.

**(b) Capture-integrity preflight** (capture side, before normalisation/signing).

```json
{
  "raw_capture_cases": 180,
  "unique_case_ids": 180,
  "matches_stage3l_case_ids": true,
  "missing_outputs": 0,
  "duplicate_outputs": 0,
  "raw_prompts_exported": false
}
```

## 8. Components / files

**Reused unchanged from 3V-A:** `externalDefenseAdapterContract.mjs`,
`harnessHashExternalOutput.mjs`, `tools/simurgh-attestation/canonicalise.mjs`, read-only
`evaluateStage3lCase` / `buildStage3lCorpus`.

**Extended:** `normaliseExternalVerdict.mjs` — map extended for LG4 labels if needed (LG4 emits
`safe` / `unsafe`; category codes route via the grammar parser). Additive only.

**New:**

- `tools/external-defense-adapters/llamaGuard4OutputGrammar.mjs` — pure parser for LG4
  `safe` / `unsafe\n<S-codes>` output → `{ label, categories }`. Handles malformed/empty/
  whitespace → error.
- `tools/external-defense-adapters/llamaGuard4Adapter.mjs` — `ADAPTER_CONFIG`
  (`target: "llama_guard_4_12b"`, `surface: "input_only"`, decode params), reads raw capture
  from `.simurgh/captures/...`, produces validated observations via the contract.
- `tools/capture/stage3vb_llama_guard4_capture.py` — RunPod transport-only capture harness.
- `tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs` — bundle builder + CLI.
- `tests/e2e/llm_shield_stage3vb_metrics_lib.mjs` — external + containment + comparative metrics.
- `tests/e2e/llm_shield_stage3vb_tamper_runner.mjs` — self-proof suite.
- `tests/fixtures/stage-3v-b/sample-lg4-capture.json` — small CI-safe real-grammar sample.
- `tests/unit/llmShield/stage3vb/*.test.js` — unit + branch tests.
- `tools/simurgh-attestation/{sign-3vb-attestation,verify-stage3vb-external-defense}.mjs`.
- `scripts/{smoke,security-audit,privacy-audit,consistency-audit,policy-drift-guard,reproduce}-llm-shield-stage3vb.*`
  - `scripts/assert-stage3l-feedable-inputs.*` preflight, wired into `scripts/check.sh` after 3V-A.
- `docs/research/llm-shield/evidence/stage-3v-b/capture-replay/lg4-frozen-capture.json` —
  committed, privacy-audited sanitised replay artifact (§4); the reproduce path's raw-output source.
- `docs/research/llm-shield/evidence/stage-3v-b/` + reviewer docs
  (writeup, threat model, validation matrix, reviewer checklist, closeout, evidence README) +
  `keys/stage3vb-public-key.json`.

## 9. Testing & gates

- Pure libs (grammar parser, adapter, metrics lib, normaliser extension) → 100% function
  coverage + branch tests on malformed-grammar throw paths (never claim "100% coverage"
  unqualified; verifier/runner CLIs are subprocess-covered by smoke, excluded from the function
  gate per 3T/3U/3V-A precedent).
- LG4 grammar parser tests: `safe`, `unsafe`, `unsafe` + category, malformed, empty, weird
  whitespace.
- Smoke replays the small frozen **sample** capture on reserved port `33200` via `boot_server`
  (no GPU, no weights).
- Tamper suite (≥8 cases) all rejected, counters zero: verdict flip, provenance edit,
  `weights_digest` edit, `input_manifest_hash` edit, `capture_file_hash` edit, wrong public key,
  raw injection, adapter-supplied hash, file removal.
- Tooling-only: **zero `src/llmShield` change**; policy-drift guard fail-closed three-dot
  (`origin/main...HEAD` with real-base fallback).
- Two-tier verifier (portable + `--reproduce`); fails closed (`ok:false`, never throws).
  `--reproduce` recomputes the seven harness hashes (incl. `external_raw_output_hash` from the
  committed frozen-capture replay artifact) + the stage3l-corpus + input manifests and emits
  explicit `*_recomputed` booleans. The verifier does NOT download or rehash LG4 weights
  (`model_weights_recomputed_by_verifier: false`); it verifies the evidence and the
  provenance/replay binding, not the model.

## 10. Sequencing (locked — Option 1)

1. Build 3V-B machine with the small frozen sample capture.
2. Test LG4 grammar parser (safe, unsafe, unsafe+category, malformed, empty, whitespace).
3. Test the raw-capture integrity preflight.
4. Test replay verifier, tamper suite, privacy audit, consistency audit.
5. Only then run the RunPod 180-case capture.
6. Bring raw capture to Mac under `.simurgh/captures/stage-3v-b/`.
7. JS harness normalises, hashes, builds bundle, signs locally.
8. Run reproduce + audits + tamper.
9. Tag v2.6.0 only after the signed **live** bundle exists.

### Release rule (locked)

Do NOT tag v2.6.0 from the sample capture. Sample capture is machinery-only. The real release
requires: `target_defense.live: true`, `capture_mode: live_capture_frozen_replay`,
`model_reexecuted_in_ci: false`, `capture_provenance` present, `capture_file_hash` present,
signed live bundle present. **Build with sample, release with real capture.**

## 11. Conventions

- Branch `main-stage-3v-b-llamaguard-external-defense-attestation`; tag **v2.6.0**.
- Own key `~/.simurgh/3v-b-ed25519.pem` (mode 0600, never committed); only public key committed.
- Neutral commit messages, no Co-Authored-By trailer (all Project-Simurgh commits).
- Carry 3T/3U/3V-A lessons: `sha256Hex` already prefixes (never double); run `npm run
format:check` then `write-hashes` AFTER prettier; security-audit accusatory-word scan scoped
  to machine `.json` artifacts (README may negate); deep-freeze enums; verifier fails closed.
- No reproduction of jailbreak payloads; no named third-party labs in machine JSON artifacts.
- Sacred non-claim: an external verdict is an advisory observation, not an accusation, and the
  capture origin is self-reported.
