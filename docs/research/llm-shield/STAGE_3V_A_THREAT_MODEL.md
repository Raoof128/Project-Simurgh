# Stage 3V-A — Threat Model

## In scope

- External defence **misses** malicious prompt-injection cases (recorded as a non-`block` verdict).
- External defence **over-blocks** benign / hard-negative cases.
- External defence returns **malformed or ambiguous** labels (normalised to `error`).
- External output attempts to **smuggle metadata** via the verdict.
- Adapter attempts to **alter verdict labels** or **inject a hash** (`adapter_supplied_hash_forbidden`).
- Evidence bundle is **edited after signing** (signature fails).
- A **harness-computed hash is tampered** with.
- The **Stage 3L corpus manifest hash** is edited.
- Simurgh downstream containment is **bypass-attempted** via the advisory signal.

Each is exercised by `llm_shield_stage3v_tamper_runner.mjs` / the unit suite and must be rejected.

## Out of scope

- Claiming Llama Guard, NeMo, or Guardrails AI is unsafe.
- Full benchmark of all external configurations.
- Live-provider safety claim.
- Model-alignment claim.
- Production-deployment claim.
- Complete adaptive-robustness claim.
- Vendor performance ranking.
- **3V-A-specific:** any claim that this wraps a real live defence — the backing is a recorded fixture (`recorded_fixture_not_live_external_defence`).

## Trust boundaries

- The external verdict is **advisory only**; it has no authority over context, tools, output
  scanning, denial, evidence, or hashing. Containment is computed by the real 3L boundary
  driver, which never reads the external verdict.
- All hashes are **harness-computed**; the adapter may supply raw output (fixtures only) but
  never an authoritative hash.
- The private signing key lives outside the repo (mode 0600); only the public key is committed.
