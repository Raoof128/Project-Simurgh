# Stage 4L / CCB — Reviewer Checklist

Run every command from the repository root on Node 26 (`nvm use 26`). All should be green.

```bash
bash scripts/reproduce-llm-shield-stage4l.sh
node --test tests/unit/llmShield/stage4l/*.test.js
node --test tests/e2e/llmShield/stage4l/*.test.js
npm test
npx prettier --check .
git diff --check
```

## What each command proves

- **reproduce script** — offline, one command: regenerates fixtures into a temp dir, runs the
  unit suite, byte-compares committed deterministic artifacts against a fresh build, checks the
  full Q9 verdict matrix, runs the F8 per-account control, exercises the F5/F6/F7/F10 + signature
  falsifier arms, replays Q8 unchanged, confirms byte-stable golden across two builds, and asserts
  the committed tree is untouched. Exits only through `stage4CodeForRawCode`.
- **stage4l unit tests** — commitment schema + privacy guard, assignment-ledger completeness,
  cardinality commitment, Q9 aggregation gate, attestation/manifest binding, the offline verifier,
  and this closeout guard.
- **stage4l e2e net** — composes every export through the real pipeline, a per-file tamper matrix
  over all seven artifacts, and cross-stage invariants (Q8 byte-unchanged, zero `src/llmShield`
  diff, wrapper exhaustiveness, export-surface lock).
- **npm test** — the whole repository suite stays green.
- **prettier / git diff --check** — formatting and whitespace clean (deterministic fixtures and
  evidence JSON are `.prettierignore`d by design).

## Falsifier matrix (expected outcomes)

| #           | Falsifier                                     | Expected                                                                   |
| ----------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| F1          | clean bundle                                  | exit 0                                                                     |
| F-STRUCTURE | 100 × 1 in one cluster over B_cluster         | raw 41                                                                     |
| F2b         | single fat account over budget                | raw 41                                                                     |
| F2c         | boundary total == B_cluster                   | exit 0                                                                     |
| F3          | missing assignment                            | raw 40                                                                     |
| F4          | duplicate assignment                          | raw 42                                                                     |
| F5          | cluster commitment byte-flip                  | raw 42                                                                     |
| F6          | budget lowered after signing                  | raw 22 (digest failure, never 41)                                          |
| F7          | raw-identity key injected                     | raw 42                                                                     |
| F8          | per-account checker on the structuring bundle | PASSES (negative control)                                                  |
| F9          | singleton-cluster evasion                     | PASSES (expected-green; signed limitation; cardinality records `"1": 100`) |
| F10         | cardinality histogram tamper                  | raw 42                                                                     |

## Overclaim guard

```bash
rg -n "sybil.*(solved|closed)|structuring.*(solved|closed|prevented)|identity.*(proven|truth)|prevents distillation|capability transfer proven|raw identity exported|non-bypassable|model safe|first .*sybil" \
  docs/research/llm-shield tools/simurgh-attestation/stage4l tests/fixtures/llmShield/stage4l scripts/reproduce-llm-shield-stage4l.sh
```

Expected: matches only inside explicit non-claims / out-of-scope warnings. The closeout test
`tests/unit/llmShield/stage4l/closeout.test.js` enforces a stricter subset automatically.

## Non-claims to keep in view

CCB proves budget enforcement _given_ a provider-supplied cluster commitment. It does not close
Sybil (`not_sybil_closure`), does not close structuring without provider binding
(`not_structuring_closure_without_provider_binding`), does not prove identity truth, assumes the
provider cluster graph, and exports no raw identity. See `STAGE_4L_THREAT_MODEL.md` §2 for the
full signed list.
