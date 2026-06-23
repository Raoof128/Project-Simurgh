# Verifiable Containment Attestation After Guardrail Failure

**A one-page technical brief — Project Simurgh**

---

## The problem

Input guardrails and content classifiers are the dominant first line of defence for LLM and agentic
systems. They are necessary, and they will sometimes miss. When one does, two questions follow that
current tooling answers poorly:

1. **What actually happened downstream** once the bad input was through?
2. **Can a third party verify that answer** without trusting the vendor who produced it?

Most defences optimise the first line (stop the input). Project Simurgh assumes that line will
occasionally fail and instead produces **signed, offline-reproducible evidence of the
consequences** — a receipt, not a passport.

## The claim, stated precisely

After a guardrail misses, did untrusted context gain authority, did an unauthorised tool execute, was
unsafe output exported? Simurgh's gateway boundaries (context-provenance guard, tool-invocation gate,
output-leakage firewall) are designed to contain those consequences, and every evaluation run is
sealed into an **Ed25519-signed, metadata-only evidence bundle that re-derives byte-for-byte
offline**. The evidence is the deliverable; the model is not.

## The concrete result

A real, live **Llama Guard 4 12B** was run once as an input-only content-safety classifier over a
synthetic 180-case reference set, captured, frozen, and signed (the model is **not** re-executed in
CI):

| Measure                                                      | Result                        |
| ------------------------------------------------------------ | ----------------------------- |
| Llama Guard 4 allowed / blocked                              | 168 / 12                      |
| Malicious cases it **missed** → **contained by Simurgh**     | **138 / 138**                 |
| External-guardrail-plus-Simurgh targeted attack-success rate | **0 / 150**                   |
| Unsafe tool execution / output export / context escalation   | 0 / 0 / 0                     |
| Capture determinism                                          | 3 greedy runs, byte-identical |

An input-only guardrail can only judge the user turn. In the 120 downstream-injection cases the
attack lives in untrusted context, tool requests, or provider output — which it structurally cannot
see. Simurgh's downstream boundaries contained every case it missed. This is a **boundary claim**,
not a statement that Llama Guard 4 is weak.

## Why it is credible: one-command external reproduction

The entire 12-rung release chain is tag-and-commit pinned and replayable by a reviewer with no prior
context, fully offline after dependency install:

```bash
git clone https://github.com/Raoof128/Project-Simurgh.git
cd Project-Simurgh && npm ci
scripts/reproduce-vca-chain.sh        # -> Stage 3X VCA chain reproduction: PASS (12/12)
```

The chain is honest about its own unevenness: 12/12 tag-and-commit pinned, 10/12 evidence-root
chain-checked, 5/12 deep per-file re-walked, 3/12 fully reproduced, 2/12 index-only with signed
reasons. It does **not** claim uniform 12/12 reproduction.

## What this is not

- Not a jailbreak detector and not a claim of jailbreak immunity or general jailbreak resistance.
- Not a model-level guardrail or a replacement for one — it is complementary, post-filter.
- Not validated on production traffic — the corpus is a synthetic 180-case reference set.
- Not production-ready, and it does not rank or label any vendor as unsafe.
- The origin of a live capture is self-reported; signed evidence is reproducible, not ground truth.

## Status & contact

Research prototype and technical demonstrator, AGPL-3.0. Methodology is LLM-assisted and disclosed in
the write-ups; all claims are bounded by the signed evidence, verifier outputs, and documented
non-claims. Technical feedback on the attestation contract and the reproduction packet is welcome.

Repository: https://github.com/Raoof128/Project-Simurgh · Author: Mohammad Raouf Abedini
