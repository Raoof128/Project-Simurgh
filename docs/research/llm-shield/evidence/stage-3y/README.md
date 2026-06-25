# Stage 3Y — Third-party injection corpus, boundary evaluation

Component-level **external validity**: independently-authored attacks (not ours) driven
through the real Simurgh boundaries. This breaks the Stage 3L self-authored-corpus
circularity — we wrote the defense, the AgentDojo authors wrote the attacks.

## Corpus

Rendered from the **AgentDojo** benchmark (Debenedetti et al., NeurIPS 2024,
`v1.2`): 35 injection-task goals (workspace 14, travel 7, banking 9, slack 5) ×
5 published attack envelopes (`ignore_previous`, `system_message`, `injecagent`,
`important_instructions`, `direct`) = **175 attack payloads**.

The attack goals and envelopes are authored by the AgentDojo team and are not
redistributed here. **Evidence is metadata-only**: the committed files carry per-case
SHA-256 digests and boundary verdicts but no raw payload text. Raw payloads exist
only as transient harness input during reproduction.

## Result (honest, and it includes misses)

| Boundary           | Metric                     | Result (95% CI)          | Reading                                                                           |
| ------------------ | -------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| Input firewall     | Content detection          | **35/175** [0.14, 0.27]  | Only the `injecagent` family trips the denylist.                                  |
| Input firewall     | **Missed**                 | **140/175** [0.73, 0.86] | `ignore_previous`, `system_message`, `important_instructions`, `direct` evade it. |
| Context provenance | Structural containment     | **175/175** [0.98, 1.0]  | Untrusted context is demoted (170) or rejected (5); content-agnostic.             |
| Context provenance | Untrusted gained authority | **0**                    | The core invariant holds on third-party attacks.                                  |
| Combined           | Input-missed-but-contained | **140**                  | The paper's thesis, shown with external attacks.                                  |

The headline is deliberately unflattering to the input layer: a denylist/heuristic
input firewall detects only ~20% of independently-authored agent-injection envelopes
(even `ignore_previous` evades it, due to a `"your"` insertion and an `iunstructions`
typo in AgentDojo's own string). That is the point: input guardrails miss, and the
value is the downstream structural containment, which holds for all 175.

## Non-claims

- This evaluates **boundary functions against external attack text**, not a live LLM agent loop.
- Structural containment is **content-agnostic** (provenance demotion), reported as such — not as detection.
- No real-world / production claim; no vendor or benchmark ranking.

## Reproduce

```bash
scripts/reproduce-llm-shield-stage3y.sh   # needs the Stage 3I AgentDojo venv
node --test tests/unit/llmShield/stage3yBoundaryRunner.test.js
```
