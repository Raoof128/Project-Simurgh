# Stage 4H Full-Chain E2E Audit

## Purpose

This spec defines a released-artifact audit for Stage 4H before Stage 4J/PCTA work begins. The audit cold-replays the released Stage 4H artifact from 4H.0 through 4H.5 and adds reusable function-path exercise for the public Stage 4H checker surface.

The goal is replay confidence, not a new security claim. The audit must show that the released Stage 4H evidence can be exercised through real builders, real verifier CLI paths, signed evidence, offline replay, tamper fixtures, typed exits, byte-stable reproduction, and anti-theatre deletion. It does not broaden Stage 4H beyond its bounded released-artifact claim.

The audit gives the harshest attention to 4H.1 because Stage 4J/PCTA depends on the DFI certificate and derivation proof contract.

## Base

The audit starts from the released Stage 4H tag:

```txt
base_tag: v2.18.0-stage-4h-proof-carrying-containment
base_commit: 7a2039136d44cf179cca5836a33596a7620c87e5
audit_branch: stage-4h-full-chain-e2e-audit
```

Work must happen in a separate audit worktree or equivalent clean checkout rooted at the released tag. The dirty local `main` checkout must not be used as the implementation base and must not be mixed into the audit branch.

## Scope

The audit adds only audit harnesses, targeted tests, evidence, and documentation unless a real bug is found. If a real bug is found, it must be reported and fixed deliberately with a narrow regression test; otherwise the Stage 4H verifier semantics remain unchanged.

Required additions:

- `scripts/e2e-llm-shield-stage4h-full-chain.sh`
- `tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js`
- Any minimal E2E smoke extension needed to make the 4H.0 through 4H.5 assertions explicit
- `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/`
- `docs/research/llm-shield/STAGE_4H_FULL_E2E_AUDIT.md`

The function-path tests should import and exercise every exported Stage 4H verifier/helper path that is public to the Stage 4H checker surface. This deliberately avoids over-promising coverage of private implementation details, CLI-only branches, or unrelated repository code.

## Audit Matrix

### 4H.0 Signed Digest And Binding Foundation

The audit must exercise the signed digest and manifest binding path through real Stage 4H fixtures and verifier code. A clean signed digest path must accept as raw `0`. Digest or manifest-binding tampering must reject and must not be laundered by changing unrelated signed fields.

### 4H.1 DFI Certificate And Derivation Proof

The audit must exercise the DFI certificate and derivation proof path under the strongest lens. It must record that a clean DFI certificate accepts, canonical premises recompute, forged premise digest rejects, dirty derivation cannot be presented as clean, untrusted source flow cannot disappear, and partial proof omission remains rejected.

Expected raw outcomes:

```txt
clean DFI -> 0
forged premise -> 22
bad flow or unsound derivation -> 24
partial derivation omission -> 26
```

### 4H.2 Q0/Q4 Discrimination

The audit must replay the Q0/Q4 discrimination matrix so the verifier is shown to be neither reject-all nor accept-all.

Expected raw outcomes:

```txt
q0-clean-disconnected-untrusted -> 0
q4a-forged-premise-digest -> 22
q4b-clean-derivation-over-dirty-replay -> 24
q4c-derivation-scope-omission -> 26
```

### 4H.3 Q6/Q7

The audit must replay Q6 tamper closure and Q7 bounded-capacity privacy checks. All Q6 mutation arms must reject through the intended first-failing layer. Q7 must pass the clean certificate and reject unsafe evidence shape, value smuggling, duplicate keys, and schema-owned unknown fields through the existing Stage 4H contracts.

### 4H.4 Q3 Offline Preflight And Typed Exits

The audit must exercise Q3 as an outer offline-hermeticity preflight, not as a change to the inner verifier order. Egress attempts must return raw `28` and typed exit `2`. Internal fail-closed code `29` and unknown raw values must map to typed exit `3`.

`unshare` is optional. If it is unavailable in the audit environment, the evidence must record that the OS namespace ring was skipped and that the in-process Q3 harness remains authoritative for this environment.

### 4H.5 Reproduce, Byte Stability, And Anti-Theatre

The audit must run the one-command Stage 4H reproduce path, verify byte-stable evidence, run anti-theatre deletion, and pass reviewer smoke checks. Deleting required proof material must flip acceptance to rejection.

## Evidence

The audit evidence lives under:

```txt
docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/
```

Required files:

- `README.md`
- `release-input.json`
- `full-e2e-summary.json`
- `function-coverage-summary.json`
- `command-output.txt`

`release-input.json` must include:

```json
{
  "base_tag": "v2.18.0-stage-4h-proof-carrying-containment",
  "base_commit": "7a2039136d44cf179cca5836a33596a7620c87e5",
  "audit_scope": "stage_4h_full_chain_e2e",
  "runtime_logic_changes": false
}
```

Evidence should be deterministic and reviewer-readable. Command output may be summarized only when the summary preserves the command names, pass/fail status, important raw codes, typed exit observations, and the `unshare` note.

## Error Handling

The audit script must be `set -euo pipefail` safe and must fail on the first unexpected command failure. It should set deterministic environment pins before running checks:

```bash
export TZ=UTC
export LC_ALL=C
export LANG=C
export SOURCE_DATE_EPOCH=0
export PYTHONHASHSEED=0
export NO_NETWORK=1
```

The script should call the real reproduce script and targeted tests rather than duplicating verifier logic. It must not create ad-hoc verdict remapping. If a command fails, the failure is evidence of an audit or verifier issue and should be fixed at the source.

## Testing And Acceptance

Acceptance requires all of the following from the audit branch:

```txt
scripts/e2e-llm-shield-stage4h-full-chain.sh PASS
scripts/reproduce-llm-shield-stage4h.sh PASS
npm test PASS
npm run format:check PASS
git diff --check PASS
worktree clean after committed audit files
```

The full-chain script must run:

- `scripts/reproduce-llm-shield-stage4h.sh`
- targeted Stage 4H unit tests
- Stage 4H E2E smoke tests
- `npm run format:check`
- `git diff --check`

The committed tests must explicitly cover the released Stage 4H levels, with 4H.1 DFI certificate and derivation proof coverage called out in the function coverage summary.

## Non-Scope

This audit does not implement PCTA or Stage 4J work. It does not create a new release tag unless separately approved later. It does not change Stage 4H verifier semantics, broaden Stage 4H claims, or alter public release wording. It does not add claims about runtime isolation, model behaviour, hidden-flow coverage, collusion coverage, statistical robustness, regulatory status, deployment safety, or future runs.

## Risk Controls

- Use a released-tag audit branch to isolate from dirty local `main`.
- Keep runtime logic unchanged unless a real bug is found.
- Prefer existing Stage 4H builders, verifier CLI, fixture helpers, and reproduce script over parallel audit-only logic.
- Use deterministic environment pins in the full-chain script.
- Record optional `unshare` skip clearly when unavailable.
- Keep evidence bounded to function-path exercise and cold replay over the released Stage 4H artifact.
- Do not modify existing released Stage 4H evidence files outside `docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/` unless a real bug is found and explicitly documented.
