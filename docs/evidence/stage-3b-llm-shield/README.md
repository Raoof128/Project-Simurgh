# Stage 3B LLM Shield — Adversarial Benchmark Evidence

A frozen, style-diverse adversarial corpus measured against the UNCHANGED
Stage 3A-alpha detector. The benchmark records exactly which attacks are blocked
and which are missed — it does not claim jailbreak immunity.

- `fixtures/adversarial/` — 30 malicious fixtures across 10 attack styles.
- `fixtures/benign/` — 15 benign fixtures (normal tasks, AI-safety questions,
  and hard-negatives that resemble attacks but should stay safe).
- `metrics.json` — committed, deterministic: detection rate, miss rate by attack
  style, clean-benign pass rate, hard-negative false-positive rate.
- `detector-digests.json` — frozen detector hashes; the security audit fails if the
  detector changes.

Reproduce (read-only, asserts the frozen baseline):

    bash scripts/smoke-llm-shield-bench.sh

Re-seed after an intentional detector change (the only writer):

    node tests/e2e/llm_shield_bench_runner.mjs --update-baseline <base-url>

The benchmark separates two facts per case: `ground_truth` (what the case is) and
`baseline_verdict` (what the unchanged detector does). A malicious prompt with
`baseline_verdict: safe` is not a CI failure — it is the benchmark recording a real
miss. The gate only fails on drift from the committed baseline.

`multi-step-softening` fixtures are single-input proxies for gradual erosion; the
detector is stateless, so true multi-turn defence is out of scope and these are
expected to bypass.
