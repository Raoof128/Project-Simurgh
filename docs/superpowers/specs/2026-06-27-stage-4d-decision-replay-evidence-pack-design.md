# Stage 4D — Decision-Replay Evidence Pack (design / spec)

**Date:** 2026-06-27
**Status:** Approved for implementation planning
**Track:** LLM-Shield / VCA evidence architecture
**Builds on:** frozen Stage 4A / 4B / 4C authority chain

---

## Thesis

Stage 4D produces a metadata-only Evidence Pack for gateway-mediated high-risk
agent actions. A third party can verify offline that the pack is tamper-evident,
complete with respect to observed mediated actions, decision-replayable against
the committed policy, and protected against receipt omission, key substitution,
signature-domain replay, and raw-content export.

It does not prove model safety, policy correctness, or coverage of unmediated
actions.

Required scope line:

> Completeness is proven with respect to gateway-mediated high-risk actions
> observed by the mediator. Actions that bypass the gateway are out of scope
> until non-bypassable enforcement lands in R6 / 4M.

---

## Chosen Approach

**Chosen: repo-native Stage 4D extension.**

The design contract's top-level `simurgh/` tree is a logical architecture map,
not a required filesystem layout. In this repository, Stage 4D will be
implemented inside the existing Stage-4 structure:

- Python fixture and gateway logic under
  `tools/agentdojo-simurgh-adapter/stage4d`.
- Node attestation, receipt, pack, signer, and verifier logic under
  `tools/simurgh-attestation/stage4d`.
- Committed evidence under
  `docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack`.
- Root reproducibility harness at `scripts/reproduce-stage4d.sh`.

This keeps Stage 4D aligned with Stage 4A / 4B / 4C and avoids a parallel
architecture tree.

Rejected alternatives:

- **Literal contract tree:** creating a new top-level `simurgh/` tree would be
  clean in isolation, but it would split Stage 4D away from the existing
  Stage-4 evidence chain and make review harder.
- **Minimal add-on to current 4A / 4B / 4C files:** adding 4D into existing
  files without a dedicated `stage4d` namespace would reduce scaffolding, but
  the receipt spine is large enough that this would blur verifier and test
  ownership.

---

## Architecture

Stage 4D is a bounded recorded-fixture evidence stage. It implements the
contract's gateway, policy, receipt, signer, ledger, pack, and verifier roles as
repo-native modules rather than as a new top-level application.

Python owns fixture execution and mediation: loading `browser_inject_01`,
observing high-risk actions, assigning `action_id` and contiguous `step_index`,
deriving metadata-only replay material, invoking the pure committed `decide()`
path, and simulating dispatch with receipt-before-dispatch enforcement.

Node owns canonical JSON, observation hashes, receipt hashes, Ed25519
signatures, hash-chain validation, Merkle roots, evidence pack building, privacy
checks, and stable verifier results.

The signer is an out-of-process boundary even in recorded fixture mode. The
gateway side cannot hold or read the private key, and the signer accepts only
domain-specific Stage 4D receipt and pack payloads. The verifier trusts the
external public key path, not any embedded key in the pack.

---

## Components And Data Flow

The Stage 4D flow will be:

1. `recorded_fixture` loads four metadata-only actions: trusted egress allow,
   untrusted authority escalation block, untrusted secret export block, and
   trusted destructive mutation allow.
2. The Python mediator assigns `act_000...act_003`, writes structured
   observation events, derives metadata-only replay material, and calls the pure
   committed `decide()` path for run-time decisions.
3. Node canonicalises the observation events, computes `observation_event_hash`
   values, and maintains the observation-log binding.
4. The receipt emitter builds receipt payloads with policy, sink, lattice, and
   replay-material digests, plus `observation_event_hash` and
   `prev_receipt_hash`.
5. The gateway asks the Node signer process/client to sign each receipt. The
   signer validates the payload schema, domain, run id, and payload type, then
   signs `SIMURGH_RECEIPT_V1\0 || jcs(receipt_payload)`.
6. The dispatch controller records blocked actions as non-dispatched. For
   allowed actions, it records simulated dispatch only after a valid signed
   receipt exists. If signing fails, the allowed dispatch is not recorded and
   the run fails closed.
7. The pack builder assembles the observation log, replay material, receipts,
   completeness manifest, non-claims, policy bundle, sink registry, consequence
   lattice, embedded public-key fingerprint, and pack hash.
8. The pack signer signs
   `SIMURGH_EVIDENCE_PACK_V1\0 || jcs(pack_without_pack_hash)`.
9. The offline verifier validates pack signature, external public-key trust,
   receipt hashes, signatures, hash chain, Merkle root, observation binding,
   completeness, decision replay, privacy, size limits, and stable failure
   taxonomy.

The main implementation boundary is that Python may generate candidate evidence
inputs and fixture-side mediation records, but Node is authoritative for
canonical bytes, receipt hashes, observation hashes, signatures, pack hash, and
verification. The verifier must be able to recompute every signed or hashed
claim from committed pack material.

---

## Data Model Requirements

The receipt structure is:

```json
{
  "receipt_payload": {},
  "receipt_hash": "64 hex chars",
  "signature": "base64"
}
```

`receipt_hash` is `sha256(jcs(receipt_payload))`.

Receipt signatures use:

```text
ed25519_sign("SIMURGH_RECEIPT_V1\0" || jcs(receipt_payload))
```

Pack signatures use:

```text
ed25519_sign("SIMURGH_EVIDENCE_PACK_V1\0" || jcs(evidence_pack_without_pack_hash))
```

Receipt payloads include `receipt_version`, `run_id`, `parent_session`,
`action_id`, `step_index`, `observation_event_hash`, `action_type`, `sink_id`,
`consequence_class`, `boundary_id`, `input_integrity_summary`, `decision`,
`decision_reason_code`, `decision_input`, `model_identity_committed`,
`model_identity_origin`, and `prev_receipt_hash`.

The session Merkle root is stored in the completeness manifest only. It must not
be stored inside any receipt payload.

The evidence pack includes:

- `pack_version`
- `run_manifest`
- `policy_bundle`
- `sink_registry`
- `consequence_lattice`
- `action_observation_log`
- `observation_log_root`
- `replay_material`
- `receipts`
- `completeness_manifest`
- `non_claims`
- `signer_public_key`
- `signer_key_id`
- `signer_public_key_fingerprint`
- `pack_hash`

The embedded public key is not a trust anchor. It must match the fingerprint of
the external `--pubkey`, and verification fails if it does not.

---

## Policy And Replay

The policy bundle is committed in the pack. Version `policy.v1` supports
`permissive`, `balanced`, and `strict` modes. The recorded fixture uses
`balanced`.

The pure `decide()` path must be deterministic. It may not read wall-clock time,
randomness, network, provider APIs, environment variables, hidden global state,
or mutable global counters. Anything used by a decision must appear in one of:

- `decision_input`
- `replay_material`
- `policy_bundle`
- `sink_registry`
- `consequence_lattice`

During verification, policy features and taint state are derived from replay
material. The verifier must not trust precomputed policy features in the pack.

Decision replay proves:

```text
recorded decision == committed policy decision
```

It does not prove:

```text
the action really did or did not execute outside the mediated executor
```

Stage 4D implements receipt-before-dispatch for the mediated recorded fixture.
Executor binding, independent witnessing, and non-bypassable enforcement remain
future work.

---

## Verification, Security, And Failure Handling

Stage 4D verification is fail-closed and layered. Every verifier run writes a
stable `verify-results.json`; malformed input returns a structured failure, not
a raw stack trace. Exit codes are:

- `0` verified
- `1` verification failure
- `2` environment/setup error
- `3` golden mismatch or nondeterminism

Before deep parsing, the verifier enforces bounded input handling: maximum pack
size, maximum receipt size, maximum replay-material size, maximum string length,
and no network, model, or provider access.

The verifier layers are:

1. **Pack signature and trust anchor:** validate pack schema, `pack_hash`,
   external public-key fingerprint, embedded-key match, and domain-separated
   pack signature. The verifier trusts the external `--pubkey`, not the
   embedded key alone.
2. **Receipt tamper evidence:** validate each receipt schema, `receipt_hash`,
   receipt signature using the external trusted public key, receipt signature
   domain, `prev_receipt_hash`, ordered receipt hashes, and session Merkle root.
3. **Observation binding and completeness:** recompute observation hashes and
   observation root, require one receipt per observed high-risk action, reject
   missing, duplicate, extra, reordered, or non-contiguous actions, and require
   every receipt to reference a real observed event.
4. **Decision replay:** recompute policy, sink registry, lattice, resolved args,
   context, derived policy features, derived taint state, and derived authority
   state from committed pack material. Then replay `decide()` from the committed
   policy inputs and compare the replayed decision plus reason code against the
   recorded receipt.
5. **Privacy and resource limits:** reject forbidden raw content classes,
   private keys, oversized packs, oversized receipts, oversized replay material,
   and any evidence path that requires network, model, provider, or live API
   access.

Security-sensitive falsifiers are first-class acceptance gates: signer failure
before allowed dispatch, arbitrary signer payload, embedded-key swap,
signature-domain replay, policy drift, taint mismatch, fake policy features,
observation-log edit, raw secret injection, oversized replay material, and
malformed-pack verifier stability.

The verifier must fail closed. Any failed layer produces `verify-results.json`
with `ok: false`, a stable failure reason, the failed layer, and the first
relevant `action_id` when available.

---

## Privacy And Non-Claims

Evidence must be metadata-only.

Forbidden classes:

- raw secrets
- raw credentials
- raw hidden prompts
- raw model outputs
- raw webpage text
- raw email body
- raw private user content
- provider API keys
- private signing keys

Allowed classes:

- hashes
- redacted policy features
- enumerated sink ids
- enumerated taint labels
- reason codes
- counts
- metadata-only replay material

Machine-readable non-claims:

```json
{
  "not_model_safety": true,
  "not_jailbreak_immunity": true,
  "not_policy_correctness": true,
  "not_complete_for_unmediated_actions": true,
  "not_kernel_enforced": true,
  "not_live_model_identity_proof": true,
  "not_production_certification": true,
  "not_ground_truth_outside_mediated_surface": true
}
```

Required README wording:

> Stage 4D verifies the containment record for a bounded gateway-mediated run.
> It does not prove model safety, policy correctness, or coverage of unmediated
> actions.

---

## Testing, Artifacts, And Closeout

Stage 4D is accepted only through the reproduce harness, not by isolated green
tests. The root closeout command is `scripts/reproduce-stage4d.sh`. Success
means the recorded fixture can run, pack, verify offline, reject every required
falsifier, pass privacy checks, and prove byte stability across repeated runs.

The reproduce harness must run without network, model access, provider access,
browser automation, GPU, Claude access, OpenAI access, Anthropic access, or live
API keys. Any dependency on live services is a Stage 4D failure.

The committed evidence folder is:

```text
docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack
```

It contains:

- `evidence-pack.json`
- `evidence-pack.sig`
- `signer.pub`
- `run-manifest.json`
- `completeness-manifest.json`
- `non-claims.json`
- `verify-results.json`
- `expected-roots.json`
- `tamper-results.json`
- `adversarial-results.json`
- `privacy-results.json`
- `golden-results.json`
- `stage4d-closeout.json` or `reproduce-log.txt`
- reviewer-facing `README.md`

Test coverage is organised around the contract gates:

1. **Unit tests** for canonicalisation, hashing, Ed25519 signature domains,
   Merkle roots, schemas, hash chain, policy derivation, taint derivation,
   `decide()`, size limits, and failure taxonomy.
2. **Integration tests** for recorded fixture `run -> pack -> verify`, external
   public-key trust, embedded-key mismatch, non-claims emission,
   observation-log binding, replay-material inclusion, receipt-before-dispatch,
   and offline verification.
3. **Adversarial and tamper tests** for missing receipt, fake receipt, duplicate
   `action_id`, reordered receipts, policy drift, taint mismatch, decision
   mismatch, signature-domain replay, signer abuse, signer failure before
   allowed dispatch, observation-log edit, malformed-pack stability, oversized
   replay material, and raw-content injection.
4. **Privacy tests** for rejecting raw secrets, credentials, hidden prompts,
   system prompts, email bodies, raw page text, raw model outputs, private
   signing keys, provider API keys, and private user content.
5. **Golden tests** for stable JCS bytes, receipt hashes, observation root,
   session Merkle root, pack hash, and success-shaped `verify-results.json`.

Golden artifacts must not contain unstable timestamps, absolute local paths,
random IDs, machine-specific values, or environment-dependent output. Re-running
the same recorded fixture must produce byte-identical canonical evidence bytes
and identical roots.

Falsifier tests are considered successful only when they fail in the expected
way. For example, deleting a receipt must produce `VERIFY_FAIL` with
`missing_receipt_for_observed_action`; changing a recorded decision must produce
`replayed_decision_mismatch`; swapping the embedded key must produce
`embedded_key_mismatch`; injecting raw content must produce
`privacy_leak_detected`.

Stage 4D is complete only when `scripts/reproduce-stage4d.sh` exits `0`, every
falsifier fails as expected, every privacy gate passes, offline verification
succeeds with network disabled, and the golden outputs remain byte-stable across
repeated recorded-fixture runs.

---

## Acceptance Gates

The implementation must preserve every Stage 4D gate:

| Gate | Requirement                  | Falsifier that must fail                                        |
| ---- | ---------------------------- | --------------------------------------------------------------- |
| G1   | Schema-valid receipts        | Remove required field                                           |
| G2   | Emission completeness        | Drop one receipt                                                |
| G3   | Extra fake receipts rejected | Add receipt not in observation log                              |
| G4   | Duplicate receipts rejected  | Duplicate `action_id`                                           |
| G5   | Receipt tamper evidence      | Flip byte in receipt payload                                    |
| G6   | Hash-chain linkage           | Reorder receipts                                                |
| G7   | Merkle root correctness      | Replace one receipt hash                                        |
| G8   | Decision replay              | Change recorded decision                                        |
| G9   | Policy hash binding          | Change policy bundle                                            |
| G10  | Taint re-derivation          | Change taint label or authority bit                             |
| G11  | Out-of-process signing       | Agent direct signing attempt fails                              |
| G12  | Byte stability               | Two fixture runs produce identical canonical bytes              |
| G13  | Offline verification         | Disable network and verify still passes                         |
| G14  | Non-claims emitted           | Remove `non_claims`                                             |
| G15  | Receipt-before-dispatch      | Signer unavailable before allowed action, action not dispatched |
| G16  | External pubkey trust anchor | Embedded key swapped, verify fails                              |
| G17  | Signature domain separation  | Reuse receipt signature as pack signature                       |
| G18  | Policy feature derivation    | Fake policy features, replay fails                              |
| G19  | Metadata-only evidence       | Inject raw secret/content into evidence                         |
| G20  | Size limits                  | Oversized replay material fails closed                          |
| G21  | Stable failure taxonomy      | Every failure writes `verify-results.json`                      |
| G22  | Observation log binding      | Edit observation log after run                                  |
| G23  | Signer IPC restriction       | Signer rejects arbitrary/malformed payload                      |
| G24  | Fail-closed verifier         | Malformed pack returns stable failure, not crash                |

---

## Build Milestones

Implementation should proceed in contract order:

1. `4D.0` Scaffold, schemas, JCS, SHA-256, Ed25519, domain separation, Merkle
   known-answer tests.
2. `4D.1` Receipt payload builder, receipt hash, hash chain.
3. `4D.2` Observation log, observation hash chain/root.
4. `4D.3` Out-of-process signer and IPC boundary tests.
5. `4D.4` Receipt-before-dispatch controller.
6. `4D.5` Completeness manifest.
7. `4D.6` Pure `decide()`, policy bundle, feature derivation.
8. `4D.7` Replay material and decision-replay verifier.
9. `4D.8` Evidence pack builder and external key trust anchor.
10. `4D.9` Privacy audit, size limits, failure taxonomy.
11. `4D.10` Full offline verifier.
12. `4D.11` Adversarial, tamper, privacy, and golden suites.
13. `4D.12` Reproduce harness closeout.

---

## Final Reviewer Claim

Use this exact claim:

> Stage 4D produces a metadata-only Evidence Pack for gateway-mediated high-risk
> agent actions. A third party can verify offline that the pack is
> tamper-evident, complete with respect to observed mediated actions,
> decision-replayable against the committed policy, and protected against
> receipt omission, key substitution, signature-domain replay, and raw-content
> export. It does not prove model safety, policy correctness, or coverage of
> unmediated actions.
