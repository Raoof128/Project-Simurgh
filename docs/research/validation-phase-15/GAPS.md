# Current gaps after Phases 13–15

16 October 2026. These are engineering/evaluation conclusions from published sources
and local evidence, not private OpenAI requirements or an exhaustive industry survey.
The [29-source needs review](../OPENAI_NEEDS_2026-10-16.md) remains the source register.

| Need                                     | Additional evidence                                                                                                   | Still open                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| N02: operational reliability             | Phase 13: 60 repeated concurrent/restart fixtures; preserved retries, shared reservations and interrupted-update hold | Sustained realistic load, wall-clock monitor expiry, live queues and interruption of already admitted work |
| N11: privacy-aware evidence              | Phase 14: allowlisted outcomes, synthetic secret canaries, explicit omission contract                                 | Real-data access control, retention/deletion, anonymity and external audit of omission honesty             |
| N12: portable evaluation                 | Versioned JSON and metadata + JSONL preserve all 144 outcomes; full-source verification remains available             | Vendor compatibility, live API version migration and independently operated integration                    |
| N09–N10: credible evaluation and custody | Complete retained matrices, protocol/source bindings, local/hosted replay and wider test inventory                    | Outside task/receiver custody, harder fresh multi-model/multi-turn studies and honest-host completeness    |
| N01, N03–N08                             | Earlier alert, credential, delegation, context and HF-inspired owned simulations remain reproducible                  | Real provider entitlements/identity lifecycle, real compaction and cross-service incidents                 |

## Repository maintenance findings

The new research components pass their focused and hosted checks, but the whole
repository is not fully green. Preserve these distinctions in presentations:

- Older Stage 3E live-gateway smoke/audit assertions expect a disabled-provider response.
  The current server deliberately returns HTTP 410 with `legacy_live_gateway_retired`.
  Migrate the legacy tests to the retired endpoint contract; do not restore the old live route
  just to make an obsolete assertion pass. Direct adapter history is not a live deployment.
- Stage 5S's frozen prior-reproduce inventory does not include the subsequently added
  `reproduce-llm-shield-stage5l-strict.sh`. A versioned migration must distinguish the
  historical pinned set from today's maintained set. Do not silently rewrite frozen pins
  or delete the stricter successor to obtain a green result.
- The previously interrupted Phase 8 whole-change security review remains incomplete.
  This validation did not retry or replace that review.
- Native macOS/CryptoKit and real external-provider/AgentDojo campaigns were not run here.
  This Linux validation cannot establish those platform or paid-provider outcomes.
- Browser checks have platform-path assumptions and local Chromium execution did not
  complete. The Stage 5R receipt explicitly records two-runtime parity and unproven browser
  parity; a successful enclosing reproduce script does not establish three-runtime parity.

Prettier's canonical-evidence conflict and the exact public synthetic-canary false positive
were corrected under P15-CHECK01 without changing source-bound test or artifact bytes.
Docker trust/build diagnostics and exact test counts are recorded in the validation results.

## Next evidence that changes the assessment

1. An outside operator reproduces pinned evidence under their own custody and reports failures.
2. An owned provider test project with the necessary alert/identity entitlements exercises
   actual lifecycle behavior using benign fixtures. An API key alone is insufficient.
3. A new externally held task set tests multi-step recovery and usefulness across several
   model families with a fixed budget, matched baselines and retained failures.
4. A representative deployment tests sustained concurrency, timing and service failure.
5. Explicit legacy-gate and browser-portability migrations close the maintenance findings
   above while keeping historical evidence independently verifiable.

These gaps prevent a production-readiness or broad safety-effectiveness claim. The current
work supports a bounded, reproducible research presentation.
