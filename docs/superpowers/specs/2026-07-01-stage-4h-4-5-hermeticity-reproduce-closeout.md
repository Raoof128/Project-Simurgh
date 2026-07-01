# Stage 4H.4 + 4H.5 - Hermeticity, Typed Reproduce, And Closeout Design

Status: design approved for implementation planning
Owner: Raouf
Date: 2026-07-01
Depends on: merged Stage 4H.0, 4H.1, 4H.2, and 4H.3

## Goal

Stage 4H.4 + 4H.5 closes Stage 4H by adding the final missing gate and the reviewer-facing closeout path.

Part A, 4H.4, flips Q3 from `not_in_scope` to `pass` by adding an offline-hermeticity harness and a total fail-closed exit wrapper. Part B, 4H.5, finalizes the one-command reproduce path, byte-stable evidence, anti-theatre deletion checks, reviewer appendix, validation matrix, and Stage 4H closeout.

The milestone proves deterministic offline checker reproduction over signed, bounded Stage 4H evidence. It does not change the committed Q0/Q1/Q2/Q4/Q5/Q6/Q7 verifier semantics from Stage 4H.3.

## Architecture

The final 4H design extends the existing `tools/simurgh-attestation/stage4h/` modules from merged 4H.3. The inner verifier keeps the committed first-failing diagnosis path and preserves all existing Q0/Q1/Q2/Q4/Q5/Q6/Q7 semantics. Q3 is added only as an outer preflight layer: install offline denials before checker execution, run the verifier under that harness, record `clean_run_hits: 0`, and separately prove the egress double is caught as raw `28 / checker_not_offline`.

The run-level wrapper is the only exit adapter. Internal raw codes `{0,19,20..29}` map deterministically to typed exits `{0,1,2,3}`, and any unknown raw value fails closed to `3`. Part B consumes this wrapper unchanged in `scripts/reproduce-llm-shield-stage4h.sh`, so the one-command reproduce path never exits through ad-hoc shell codes.

## Locked Exit Wrapper

The wrapper is a total function from internal raw verifier or harness codes to reviewer-facing run-level exits.

| Internal raw code | Meaning | Run-level exit |
| --- | --- | --- |
| `0` | verifier accepted an expected-good certificate | `0` |
| `19` | `clean_run_falsely_rejected` | `1` |
| `20` | `schema_invalid` | `1` |
| `21` | `proof_system_unsupported` | `1` |
| `22` | `premise_digest_mismatch` | `1` |
| `23` | `policy_digest_mismatch` | `1` |
| `24` | `explicit_flow_integrity_violation` | `1` |
| `25` | `pack_binding_mismatch` | `1` |
| `26` | `proof_structure_invalid` | `1` |
| `27` | `privacy_leak_detected` | `1` |
| `28` | `checker_not_offline` | `2` |
| `29` | `internal_error_fail_closed` | `3` |
| any other value | unmapped or exhaustiveness breach | `3` |

Locked rule: `0 -> 0`; `{19,20,21,22,23,24,25,26,27} -> 1`; `28 -> 2`; `29 -> 3`; unknown values -> `3`.

## Q3 Offline-Hermeticity Harness

Q3 is enforced by an in-process capability-denial harness, not by an advisory environment variable. The harness installs denials before the checker path executes, records all hits, restores patched primitives in `finally`, and treats any clean-run hit as raw `28`.

The denied surfaces are:

| Capability class | Surface | Breach reason |
| --- | --- | --- |
| HTTP(S) fetch | `globalThis.fetch` | `fetch_invoked` |
| Node HTTP client | `node:http`, `node:https` `request` and `get` | `http_client_invoked` |
| Raw sockets | `node:net`, `node:tls` connect paths | `socket_connect_invoked` |
| DNS | `node:dns`, `node:dns/promises` lookup and resolve paths | `dns_invoked` |
| UDP | `node:dgram` socket creation | `udp_invoked` |
| Subprocess | `node:child_process` spawn, exec, execFile, fork | `subprocess_invoked` |
| Provider/model clients | checker dependency-path imports of provider/model packages | `model_client_present` or `forbidden_builtin_imported` |

Runtime interception catches calls. Static dependency-path scanning catches pre-captured imports. The scan is limited to the checker dependency path and excludes the harness, the egress-double fixture, and tests that intentionally import denied surfaces.

Q3 pass is a conjunction:

```json
{
  "clean_run_hits": 0,
  "egress_double_caught": true,
  "egress_double_raw_code": 28,
  "q3_status": "pass"
}
```

Caught egress is success for the negative self-proof, not evidence that the clean run used the network. A clean run must have zero hits.

## Data Flow & Evidence

The reproduce path rebuilds Stage 4H fixtures from source, verifies the signed base pack and manifest, runs the Q3 offline audit, replays Q0-Q7, performs byte-stable golden checks, runs the derivation-deletion anti-theatre check, and emits the final run-level result only through `stage4CodeForRawCode`.

Evidence under `docs/research/llm-shield/evidence/stage-4h/` is finalized with `offline-report.json`, `hermeticity-attestation.json`, `exit-map.json`, `reproduce-summary.json`, and updated Q-gate, verifier, tamper, privacy, and README evidence files.

The hermeticity attestation is acyclic: `hermeticity-attestation.json` excludes its own digest and the manifest signature. The manifest binds only `hermeticity_attestation_digest`, recomputed from the reviewer's local offline-audit output. The checker never trusts the committed attestation without recomputation.

## One-Command Reproduce Pipeline

`scripts/reproduce-llm-shield-stage4h.sh` becomes the authoritative reviewer command.

The pipeline order is fixed:

1. Scrub provider/browser/API environment variables and set determinism pins.
2. Rebuild fixtures and digests from source.
3. Verify the Ed25519-signed base pack, signed manifest, and Merkle root.
4. Run the Q3 offline audit: clean run has zero hits and egress double is caught.
5. Replay Q0-Q7 over clean, dirty, tamper, privacy, and offline fixtures.
6. Run byte-stable golden checks by rebuilding canonical evidence twice and diffing the results.
7. Run anti-theatre derivation deletion: deleting proof material must flip to a rejecting raw code, preferably `26 / proof_structure_invalid` or otherwise `24`; never `0`.
8. Emit `reproduce-summary.json` and exit through `stage4CodeForRawCode`.

The optional OS namespace ring may run with `unshare -rn` when available. If unavailable, it is recorded as skipped, not failed; the in-process harness remains authoritative.

## Error Handling & Typed Exits

Every verifier and reproduce failure reduces to an internal raw code first, then passes through the total wrapper. Clean success maps to typed exit `0`; verifier/gate rejection maps to typed exit `1`; Q3 offline-environment breach maps to typed exit `2`; internal errors, determinism drift, unknown raw codes, and wrapper exhaustiveness breaches map to typed exit `3`.

The shell reproduce script must be `set -e` safe. Each step runs through a helper that captures the intended raw code before routing through `stage4CodeForRawCode`. No failing command may bypass the wrapper with a bare shell exit, and the final process exit must always be produced by the wrapper.

Implementation must preserve this helper pattern:

```bash
exit_via_wrapper() {
  local raw="$1"
  node -e "import('./tools/simurgh-attestation/stage4h/exitCodes.mjs').then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))" "$raw"
}

run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    exit_via_wrapper "$raw"
  fi
}
```

## Testing & Reviewer Checks

The design requires tests at three layers.

Unit tests cover the total exit wrapper, offline harness interception and restoration, static egress import scanning, and the Q3 negative self-proof.

Integration tests cover verifier behaviour under the Q3 preflight while proving that Q0/Q1/Q2/Q4/Q5/Q6/Q7 raw outcomes are not perturbed.

Reproduce and closeout tests cover the one-command script, byte-stable evidence, anti-theatre derivation deletion, metadata-only evidence, and reviewer T1-T6 checks.

Acceptance is strict: Q0-Q7 all pass; Q3 pass is recorded as the conjunction of `clean_run_hits: 0` and `egress_double_caught: true`; Q4a, Q4b, and Q4c remain unchanged; and no out-of-scope claim becomes green.

Any test that observes Q3 changing an existing Q0/Q1/Q2/Q4/Q5/Q6/Q7 raw result must fail.

The reviewer checklist will include:

| Test | Action | Expected typed exit |
| --- | --- | --- |
| T1 clean reproduces | run the one command | `0` |
| T2 tamper caught | flip one premise digest byte | `1` via raw `22` |
| T3 signature load-bearing | corrupt the pack signature | `1` via raw `25` |
| T4 offline enforced | run egress double | `2` via raw `28` |
| T5 gate not theatre | delete derivation/proof material | `1` via raw `26` or `24`, never `0` |
| T6 privacy holds | exceed Q7 bounded-capacity budget | `1` via raw `27` |

## Closeout Documents

The closeout adds:

- `docs/research/llm-shield/STAGE_4H_CLOSEOUT.md`
- `docs/research/llm-shield/STAGE_4H_REVIEWER_CHECKLIST.md`
- finalized `docs/research/llm-shield/STAGE_4H_VALIDATION_MATRIX.md`
- finalized `docs/research/llm-shield/STAGE_4H_THREAT_MODEL.md`
- updated `docs/research/llm-shield/evidence/stage-4h/README.md`

The closeout ledger must cover Stage 4H.0 through Stage 4H.5, Q0-Q7 status, falsifier per gate, evidence file per gate, raw code per negative, typed exit per negative, and deferred work.

## Non-Claims & Release Boundary

The spec states the honesty ceiling up front. Q3 provides process/interpreter-bound hermeticity for the checker path, not kernel sandboxing, non-bypassable enforcement, or hardware-backed isolation. R6/4M remains the place for kernel, TEE, LSM, eBPF, or namespace-backed isolation.

The closeout proves deterministic offline checker reproduction over signed, bounded Stage 4H evidence. It does not prove model safety, execution truth, implicit-flow security, multi-field collusion closure, statistical robustness, future-run guarantees, regulatory compliance, or real-world deployment safety.

The release decision is recorded but not executed by this spec. Default wording: after implementation verification, the code may be tagged as "Stage 4H proof-carrying containment v0", while public-priority "first ..." wording remains frozen unless explicitly approved later.

## Scope Guard

Do implement:

- Total, fail-closed `stage4CodeForRawCode()` over `{0,19,20..29}` with unknown values mapping to `3`.
- Q3 offline harness, negative egress self-proof, and dependency-path static scan.
- Q3 preflight around the existing verifier path, without changing the inner first-failing verifier semantics.
- `offline-report.json`, `hermeticity-attestation.json`, `exit-map.json`, and `reproduce-summary.json`.
- One-command reproduce pipeline with typed exits, byte-stable golden diff, anti-theatre deletion, metadata-only evidence, and reviewer T1-T6 checks.
- Stage 4H closeout, reviewer checklist, validation matrix, threat model, and evidence README.

Do not implement:

- A new Q gate beyond Q3.
- Any change to `canonicalPremises.mjs` digest semantics or the committed Q0/Q1/Q2/Q4/Q5/Q6/Q7 expected outcomes.
- Kernel, TEE, LSM, eBPF, or non-bypassable isolation.
- Multi-field collusion closure, implicit-flow claims, model safety, execution truth, or future-run guarantees.
- Public-priority "first ..." wording or release tagging without explicit later approval.

## Implementation Notes

Implementation should happen in two parts:

1. Part A: wrapper totality, offline harness, Q3 verifier preflight, offline audit, and exit-map/offline evidence.
2. Part B: one-command reproduce finalization, golden diff, anti-theatre deletion, closeout docs, validation matrix, and final verification.

Part B consumes the Part A harness and wrapper unchanged. If Part B reveals a wrapper or Q3 harness issue, the implementation should fix Part A first rather than adding local shell-script exceptions.

## Acceptance Criteria

- `q-gate-results.json` reports Q0-Q7 `pass`.
- Q3 pass includes `clean_run_hits: 0`, `egress_double_caught: true`, and `egress_double_raw_code: 28`.
- Q4a remains raw `22`; Q4b remains raw `24`; Q4c remains raw `26 / derivation_scope_incomplete`.
- Q6 remains single-delta tamper closure; Q7 remains bounded-capacity privacy.
- `stage4CodeForRawCode()` maps every frozen raw code correctly and maps unknown values to `3`.
- The reproduce script exits only through the wrapper.
- Byte-stable evidence checks fail closed on drift.
- Deleting derivation/proof material cannot be accepted as clean.
- Evidence remains metadata-only.
- Overclaim scans match only explicit non-claims, not positive claims.

