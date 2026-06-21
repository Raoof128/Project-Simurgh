# Stage 3T — Offline Capability-Extraction Pattern Attestation

> **Crown.** Stage 3T proves that capability-extraction-shaped traffic can be attested
> without live traffic or intent claims: a frozen detector is re-run over a committed
> synthetic metadata-only set, distinct signal-family decisions reproduce byte-for-byte,
> and benign-silence fixtures prove the detector has brakes, not just a horn.

> **Final sign-off.** Stage 3T does not detect attackers, prove intent, or confirm
> distillation. It proves that a frozen detector can be re-run over a committed synthetic
> metadata-only set to reproduce extraction-pattern decisions byte-for-byte, while
> benign-silence fixtures show that single phenomena do not escalate into findings.

## Why this stage

In February 2026 Anthropic disclosed industrial-scale **capability-extraction /
distillation-abuse** campaigns against Claude (reference threat: DeepSeek / Moonshot /
MiniMax; ~24,000 fraudulent accounts; >16M exchanges; detection via behavioural
fingerprints and coordinated-traffic patterns). Anthropic shipped detection as a closed
capability **plus an accusation**.

Simurgh asks a different question — the VCA question:

> Can a gateway produce privacy-preserving, machine-verifiable evidence that
> extraction-shaped traffic occurred, **without** trusting raw logs, exposing user
> content, or claiming intent?

3T answers it. The inversion is the whole point: not "we detected attackers", but
**"here is the frozen recipe — re-run it yourself."**

## Reference threat vs attested claim (kept distinct)

- **Reference threat:** Anthropic-style capability-extraction / distillation-abuse campaigns.
- **Attested claim:** a deterministic extraction-pattern match over a metadata-only
  reference set, reproducible byte-for-byte by any third party.

3T uses "distillation-style" only as the reference threat, never as the claim.

## Where 3T sits on the ladder

```
3R: fallback suspicion cannot become bypass        (deliberate gateway-security-path change)
3S: narrative generation cannot become unsupported claims
3T: extraction suspicion cannot become unverifiable accusation
```

3T returns to the tooling-only attestation pattern of 3M / 3N / 3O / 3P / 3Q / 3S, while
3R remains the deliberate gateway-security-path exception.

## What 3T is (and is not)

Stage 3T is a **tooling-only, offline** attestation stage. It does not process live
traffic and does not modify the gateway (zero `src/llmShield` change, policy-drift
guarded). It uses a **committed synthetic metadata-only reference set** to prove that a
**frozen detector** and a **total decision function** can be re-run by third parties to
reproduce capability-extraction-pattern decisions exactly. In production, equivalent
metadata fields could be emitted by gateway telemetry, but that deployment integration is
**explicitly out of scope** (deferred by design — the contract is proven offline first).

## The sacred non-claim

> A detector match is not an accusation. It is a reproducible metadata-pattern result for
> manual review.

This sentence is embedded in the renderer output, the attestation `non_claims[]`, and the
reviewer checklist, and is enforced by the security audit.

## Architecture

```
committed synthetic meta-set (hash-bound, provenance=synthetic_reference)
  → validateMetaSet → metaSetDigest (binds full header + sorted rows)
  → runDetector (matchSignals → distinct FAMILIES → total decision)
  → expected-detector-result.json
  → render attestation prose (+ sacred non-claim, throws on accusatory wording)
  → Ed25519-signed attestation (dedicated 3T key; only public key committed)
  → two-tier verifier:
       portable   = signature + digest/identity bindings + non-claim wall
       --reproduce = portable + detector result byte-match + attestation byte-match + self-proof
```

### Signal families (frozen; `family_map_digest` part of detector identity)

| Family       | Member signals                              |
| ------------ | ------------------------------------------- |
| structural   | repetition_cluster, template_prefix_cluster |
| behavioural  | cot_elicitation                             |
| targeting    | capability_targeting, task_taxonomy_repeat  |
| coordination | hydra_cluster                               |
| volume       | volume_burst, high_request_count            |

The decision counts **distinct families**, never raw booleans — so one phenomenon cannot
masquerade as corroboration.

### Total decision function (frozen, versioned — `stage3t_frozen_detector_v1`)

```
0 distinct families  → no_pattern_observed          (attestation_claim: none)
1 distinct family    → single_signal_observed       (attestation_claim: manual_review_only)
≥2 distinct families → extraction_pattern_observed  (attestation_claim: manual_review_recommended)
```

The threshold and family map are part of the detector identity. Changing either requires a
new `detector_id` — no post-hoc tuning.

## Verification

- `npm test` — full suite green, including the 6 new extraction test files.
- Pure libs (`metaSet`, `signalFamilies`, `detector`, `renderer`, `selfProof`) at **100%
  function coverage**.
- `scripts/smoke-llm-shield-stage3t.sh` — build / verify / verify-hashes /
  verify-attestation `--reproduce` / policy-drift / privacy / consistency / security, all PASS.
- The committed reference set lands on `extraction_pattern_observed` across 3 families;
  the benign-silence self-proof shows single phenomena do not escalate.

Stage 3T public key fingerprint:
`sha256:886c2d2ae116da0a0d80a0242057462fc38b1187c6d241679244507c04228033`.
