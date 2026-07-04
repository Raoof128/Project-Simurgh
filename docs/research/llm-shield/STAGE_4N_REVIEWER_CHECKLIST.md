# Stage 4N — Extraction Seismograph: Reviewer Checklist

> **Motto.** AnthropicSafe First, then ReviewerSafe.

Three commands, no private key, fully offline (network is used only to `npm ci`).

## 1. One-command reproduce

```bash
bash scripts/reproduce-llm-shield-stage4n.sh
```

Expected final line: `[stage4n] ALL GREEN` (exit 0). This regenerates the fixtures into a
temp dir and byte-compares them against the committed tree, runs the unit suite and the
all-functions e2e net, verifies the committed public feed, and asserts the working tree is
unchanged. Requires Node ≥ 26 (byte-stable reproduce; the script gates on this at step 1
and exits raw 28 otherwise).

## 2. All-functions e2e net (tamper matrix + anti-theatre + offline attestation)

```bash
node --test tests/e2e/llmShield/stage4n/*.test.js
```

Expected: 8 tests pass. Every tamper arm hits its exact raw code and run-level, the
committed attestation recomputes byte-for-byte, and the manifest verifies offline against
the committed public key.

## 3. Verify the committed public feed directly

```bash
node tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs \
  --feed docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl \
  --policy docs/research/llm-shield/evidence/stage-4n/genesis-policy.json \
  --as-of synthetic-0006 --out /tmp/stage4n-report.json
```

Expected: exit 0, and `/tmp/stage4n-report.json` shows `"rawCode": 0, "runLevel": 0`. The
verifier is total and fail-closed: any internal error exits raw 29 (run-level 3), never a
bare crash. `as_of_window` is an explicit committed input — the verdict is a pure function
of the feed, policy, and as-of, with no wall clock anywhere.

## What to look for

- **Silence is an event.** Feed `tests/fixtures/llmShield/stage4n/tamper/t1-drop-heartbeat/`
  to the verifier and confirm it reports raw 47 (`heartbeat_absent_for_expected_window`),
  not a chain error.
- **Bilateral material stays bilateral.** Grep the public evidence dir for `proof_path`,
  `bundle_tier`, `respondent_id_digest` — there should be none (Q16 enforces this).
- **The Lean lemma.** `lean proofs/stage4n/TemporalCompleteness.lean` type-checks with exit
  0 and no `sorry` (also gated in `.github/workflows/stage-4-lean-proofs.yml`).
