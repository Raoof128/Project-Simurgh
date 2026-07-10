# Stage 5E VDA — Lane B ceremony (non-CI, digest-only)

> Motto: **AnthropicSafe First, then ReviewerSafe.**

Lane B is a two-role ceremony that proposes _new_ obfuscation recipes against the real detector:

- **Attacker** — a spawned Claude subagent proposes a recipe (from the frozen op-set) over a published
  base.
- **Watcher** — scores the proposed recipe by a **real offline model call** (`lanec/capture.py`'s
  scoring path), never a frozen-table lookup (a newly proposed recipe has no committed score). Accepted
  evasions are then **frozen into the score table** for Lane A.

**Honest label (external-review correction):** Lane B is independent of the _runner's knowledge_, not
of the _runner's identity_. It strengthens the internal test; it is **not** an external-party claim.
The independent-party path is the BYO adapter (`lanec/byoAdapter.mjs`) run by someone who is not us.

The committed Lane A evidence (`docs/research/llm-shield/evidence/stage-5e/`) already contains the
executed grounding: **4/8 published bases flagged at baseline, all 4 slip** under invisible
combining-mark obfuscation, with de-obfuscation recovering the original score. Lane B is the mechanism
for _extending_ that corpus with adaptively-proposed recipes; it is non-CI and digest-only because it
requires a live model call.
