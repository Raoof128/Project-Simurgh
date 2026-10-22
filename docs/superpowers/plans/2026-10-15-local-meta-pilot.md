# Local Meta pilot: design and execution ledger

User authorized downloading and running a small Meta model here, following the proposed inexpensive
pilot. Base `a21f5c5d`; existing checkout and commit/push authorization retained. This is an additive
model capture, not a new isolation claim. Preserve all nine previous source/report families.

Measured host: Linux x86_64, CPU quota four cores, five schedulable CPUs, 32 GiB memory, no detected
GPU. Official Hugging Face access to Meta Llama 3.2 1B Instruct config succeeds with the existing
configured credential. Choose its pinned official safetensors revision, approximately 2.5 GB,
over 3B's larger CPU cost. Use local Transformers/PyTorch CPU inference, no paid endpoint, no
repository-provided Python code, no pickle weights, no model weights or credentials in Git.

1. Download selected official files and retain license/policy; verify Hub digests, record SHA-256.
   Install pinned CPU runtime outside checkout. Expected: artifact hashes match and real local
   generation succeeds. Keep TLS, proxy and existing platform restrictions.
2. Test capture validation first, then add a minimal local generation runner and replay adapter.
   All 15 existing proposal scenarios, one greedy generation each, seed 0, bounded tokens/context;
   no completion repair, extraction or retries. Save raw text/token IDs, complete prompts/settings,
   artifact/runtime/source provenance, elapsed time and memory. Expected: malformed/truncated
   output is explicit; none silently counts as a successful defense.
3. Evaluate the same captured proposals through unchanged enforced/bypass/deny-all controls and
   publish separate model/utility/format results. Replay uses saved outputs, not a claim of identical
   regeneration. Validate tamper/omission refusal, original reports, full npm and documentation;
   append both Raouf logs and commit/push.

Public source map: official Meta model cards (1B/3B), pinned license, Transformers generation/loading
documentation and PyTorch CPU package index. Existing incident/standards research supplies motivation;
this pilot supplies local-model feasibility, not independent attack authorship or frontier robustness.
An evaluation engineer can reproduce it with authorized model access; CPU runtime and download cost
are the main practical constraints. Initial subjective scores: feasibility 5/10, reproducibility
6/10, attack strength 2/10, integration utility 4/10. Improve with measured local run, pinned replay,
held-out stronger attacks and a real multi-step workload, respectively.

| Field                         | Declaration                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Local Meta model pilot v1                                                                                               |
| protected_surface             | tools/local-meta-pilot/** and docs/assurance/meta/**                                                                    |
| next_phase_behaviour          | Retain original capture; publish new runs separately                                                                    |
| maintenance_behaviour         | Reproduce validator defects before fixes; preserve raw model observations                                               |
| sunset_or_migration_condition | Versioned successor with explicit model/settings/corpus changes                                                         |
| anti_vacuity_condition        | Exact 15-case capture, visible failures, actual generated tokens, baseline/deny-all comparisons, source/artifact hashes |

No hosted CI job downloads gated weights. This is an explicit local experiment; ordinary tests and
saved-output replay need no model. User's instruction to leave environment settings alone persists;
local commands and tracked reproduction instructions capture setup without changing configuration.

## Execution record

Downloaded all nine selected official files and matched Hub digests. The 2,471,645,608-byte weight
SHA-256 is `1ff795ff6a07e6a68085d206fb84417da2f083f68391c2843cd2b8ac6df8538f`.
A single HTTP stream was slow; completed the same authorized pinned artifact using six bounded
HTTP range transfers, then verified the complete SHA-256 before loading. TLS/proxy remained active.
Installed CPU torch 2.14.1+cpu and Transformers 5.19.0 in a separate venv; package versions retained.

First capture: all 15 generations completed; 1,812 generated tokens, 236.902 seconds total inference,
2,964.45 MiB peak RSS. Zero usable proposals: five length-limited, seven invalid JSON completions,
three invalid proposal objects. No safety success can be inferred from this run. The official chat
template was inspected and correctly adds system/user/assistant headers. Its default date is the
capture date; later regeneration is not promised bit-identical.

Ruling: run one explicitly separate compact-prompt ablation after the initial usability failure —
test whether a short task instruction and concrete JSON example help this 1B model. Preserve every
first-run output and its exact generation source snapshot. Cost: this is exploratory prompt
engineering, not a preregistered or held-out evaluation. Same 15 scenarios/settings, one generation
per scenario per variant; no repair, extraction or retries. Both results must be reported together.

Validator tests began red. A further regression showed historical scripted metrics would credit
blocked unknown-tool outputs as attack containment; the new model aggregation now excludes every
unusable proposal. Frozen historical code/results remain unchanged. Prompt-variant test failed
before implementing the explicit selector. Nine pre-review tests passed; captures and both replays completed.

Compact capture: 15 generations, 294 tokens, 38.543 seconds total generation, 2,970.05 MiB peak RSS.
Thirteen schema-valid proposals; two invalid proposal objects. Three proposals produced unauthorized
mock effects under bypass; enforcement blocked all three. Two of three benign tasks completed.
Two unsafe proposals were attack cases; the third was a benign-task error. Both raw captures remain
byte-identical to the original outputs, with matching generator source hashes.

Final: fixed Important containment-credit defect — fresh review reproduced 15 nonexistent-resource
execution failures receiving 11 attack-containment credits. Regression
`test_containment_requires_demonstrated_unsafe_bypass_effect` failed (11 != 0), then passed after
requiring a demonstrated unsafe bypass effect. Complete local suite 10/10; both saved evaluations
regenerated from unchanged captures and replayed. Compact enforced attackContained is now 2, not 9;
headline unsafe proposals blocked remains 3/3. No second independent review claimed.

Final: minor (deferred): exported dependency lock lacks artifact hashes. Corrected the inaccurate
README hash-pin claim; exact versions remain pinned and the installed CPU wheel was verified.
Model artifact hashes are independently recorded and checked before each load.

Final: Ruling: capture provenance is reproducible local evidence, not independent model attestation —
retain explicit exploratory, mock-only and author-controlled limitations — cost if wrong: metadata
alone cannot establish authentic generation or generalization to deployed systems.

Validation: full npm 5,122 total, 5,119 passed, zero failed, three unavailable Chrome/Lean prerequisite
skips (before the Python-only review correction). New tests 10/10. Frozen previous nine families
remain unchanged; mutable CI census becomes 33 with the new saved-proposal replay gate, baseline19
unchanged. No further inference needed. Final scores: feasibility 8/10, reproducibility 7/10,
attack strength 2/10, integration utility 5/10; limitations and next evidence steps are in the guide.
