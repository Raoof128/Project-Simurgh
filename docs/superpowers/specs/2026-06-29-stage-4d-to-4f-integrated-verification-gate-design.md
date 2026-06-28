# Stage 4D-4F Integrated Verification Gate Design

**Date:** 2026-06-29
**Status:** Approved for implementation planning
**Track:** LLM-Shield / cross-stage release-readiness verification
**Builds on:** Stage 4D decision-replay evidence pack, Stage 4E browser-agent
containment run, and Stage 4F containment-utility Pareto frontier

## Thesis

Stage 4D-4F integration adds one reviewer-facing offline gate above the released
Stage 4D, Stage 4E, and Stage 4F machinery.

It does not create a new containment stage, does not reopen Stage 4F closeout,
and does not create new containment evidence. It verifies that the already
shipped 4D, 4E, and 4F evidence layers compose correctly under one deterministic
offline command.

The boundary is:

```text
4D = receipts and decision replay
4E = one browser-agent containment scene
4F = containment-utility frontier sweep
4D-4F wrapper = ladder-level verification and release-readiness oracle
```

The wrapper proves the ladder, not a new curve.

## Chosen Approach

**Chosen: cross-stage wrapper gate.**

The integration design defines a future command:

```bash
scripts/reproduce-stage4d-to-4f.sh
```

That command orchestrates existing released stage commands:

```bash
scripts/reproduce-stage4d.sh
scripts/reproduce-stage4e.sh
scripts/reproduce-stage4f.sh
SIMURGH_RUN_STAGE4F_FULL=1 scripts/reproduce-stage4f.sh
```

The full-suite Stage 4F lane is optional for default reviewer runs, but
mandatory when the integrated report claims full-suite Stage 4F coverage.

Stable integration artifacts live under:

```text
docs/research/llm-shield/evidence/stage-4d-to-4f-integration/
```

Rejected alternatives:

- **Fold into Stage 4F:** this would blur the released Stage 4F boundary. Stage
  4F remains the Pareto frontier stage with suite/grid anchors, packs-only
  metrics, and `verify-frontier`.
- **Docs-only checklist:** this would be easy to review but too weak as a
  release-readiness gate because it would not establish a machine-verifiable
  command contract.
- **Online CI-first gate:** this would make release hygiene visible but would
  conflate offline VCA verification with network-dependent release checks.

## Architecture

The integrated gate is a repo-native wrapper over existing stage gates.

It must be read-only over Stage 4D, Stage 4E, and Stage 4F evidence artifacts.
It may write only integration-level summaries, expected-result oracle outputs,
privacy summaries, golden summaries, Definition-of-Done coverage matrices,
falsifier coverage matrices, and release-readiness reports under the integration
evidence directory.

The wrapper must not mutate stage evidence, stage goldens, frontier artifacts,
or stage closeout files during verification.

The wrapper must fail if any Stage 4D, Stage 4E, or Stage 4F evidence artifact
is modified during integration verification.

Online release hygiene belongs in a separate command, such as:

```bash
scripts/preflight-stage4-release-online.sh
```

That command may check origin sync, tags, GitHub release state, package audit
state, or live registry state. Those checks are not part of the offline VCA
verification contract.

## Components And Data Flow

The wrapper has four responsibilities.

1. **Command orchestrator**

   Run the released stage commands in order: 4D, 4E, 4F canary, and optionally
   4F full-suite. Record deterministic command labels, environment pins, exit
   codes, status, stable reason codes, and log hashes when logs are produced.
   Wall-clock durations may be written only to volatile local logs.

2. **Expected-result oracle**

   Read stage-level structured result files and integration-level oracle
   definitions. Clean artifacts pass only when they are green. Red arms pass
   only when their direct verifier path exits non-zero for the pre-registered
   reason.

   Stage reproduce commands exit `0` when clean arms are green and registered
   red arms fail for expected reasons. Direct red-arm verifier calls exit
   non-zero. The integration gate must never infer red-arm success from a stage
   harness exit code alone; it must inspect the stage's structured red-arm or
   tamper result files.

3. **Cross-stage coverage checker**

   Build matrices proving that every reviewer-facing requirement is covered by
   at least one stage artifact or red arm: receipt integrity, completeness,
   decision replay, external-key trust, key-substitution resistance, offline
   verification, golden byte stability, privacy, packs-only frontier metrics,
   and explicit non-claims.

4. **Integration reporter**

   Write only stable integration-level outputs. Stable artifacts must not
   include wall-clock durations, raw stdout or stderr, absolute paths, volatile
   command logs, timestamps, machine identifiers, raw prompts, raw model
   outputs, secrets, private signing keys, or private user content. If command
   logs are needed for debugging, they are written to ignored temporary paths
   and represented in committed artifacts only by status and hash.

## Integration Artifacts

The integration evidence directory contains stable reviewer-facing summaries:

```text
integration-manifest.json
environment-pins.json
offline-enforcement-results.json
expected-result-oracle.json
stage-command-results.json
dod-coverage-matrix.json
falsifier-coverage-matrix.json
key-substitution-results.json
privacy-scan-results.json
golden-stability-summary.json
non-claims-audit.json
release-readiness-report.json
README.md
```

These artifacts are summaries and verdicts. They must not copy raw stage
evidence payloads into the integration directory.

## Verification, Security, And Failure Handling

The integrated gate is fail-closed and deterministic.

### Offline Enforcement

`scripts/reproduce-stage4d-to-4f.sh` runs with network, model, provider, browser,
live API, and hidden local service access disabled for the offline gate.

The wrapper runs with provider and browser environment variables scrubbed. If a
verifier attempts to read or require them, the gate fails with
`forbidden_provider_env`, `forbidden_browser_automation`, or
`forbidden_live_api_access`.

Environment flags alone are not sufficient proof of offline enforcement. The
implementation must either run verifier paths inside a no-network sandbox,
container, or profile, or install test-time guards that fail any attempted use of
`net`, `tls`, `http`, `https`, DNS, `fetch`, WebSocket, browser automation,
provider SDKs, or child-process network commands.

The offline acceptance command must not run `git fetch`, origin sync, GitHub
release checks, package registry checks, `npm audit`, or any live
registry/provider/network check. Those belong only to a separate online
release-hygiene pre-flight.

### Expected-Result Oracle

The oracle records clean and red-arm expectations in a stable schema:

```json
{
  "stage": "4F",
  "arm": "arm-b-lying-decision",
  "artifact_kind": "red_arm",
  "expected_exit": 1,
  "expected_reason": "replayed_decision_mismatch",
  "observed_exit": 1,
  "observed_reason": "replayed_decision_mismatch",
  "pass": true
}
```

A clean arm passes only when:

```text
expected_exit == 0
observed_exit == 0
observed_reason == null
verify ok == true
```

A red arm passes only when:

```text
expected_exit != 0
observed_exit == expected_exit
observed_reason == expected_reason
verify ok == false
```

The integrated gate fails when a clean artifact exits non-zero, a red arm exits
zero, a red arm fails for the wrong reason, a red-arm result is missing, or a
stage result schema is missing or unreadable.

### Key-Substitution Coverage

Key-substitution checks must not rewrite stage evidence. They may either verify
existing stage falsifier artifacts or create temporary integration-only wrong-key
verification attempts and record only stable result summaries under the
integration evidence directory.

The integration report must contain key-substitution coverage for Stage 4D pack
verification, Stage 4E scenario pack verification, and Stage 4F cell/frontier
verification. If any class is missing, the gate fails with
`key_substitution_not_tested`.

### Privacy Scanning

The integration privacy scan covers integration artifacts and referenced stage
summary artifacts. It may scan stage evidence packs only through bounded,
allowlisted files and must not copy raw stage content into integration outputs.

The scanner inspects JSON keys and JSON values for provider keys, private
signing keys, raw prompts, raw model outputs, raw transcripts, unredacted
secrets, and private user content. It uses bounded file sizes and stable failure
codes.

### Non-Claims Audit

The gate requires explicit non-claims that the ladder does not prove:

- model safety
- policy correctness
- production readiness
- live inference integrity
- statistical robustness
- real-world exhaustiveness
- unmediated action coverage
- lying-executor truth
- bypass-proof enforcement

It must also state:

```text
Determinism is not statistical robustness.
```

## Stable Failure Taxonomy

Integration-level stable failure reasons are:

```text
network_required_error
forbidden_provider_env
forbidden_browser_automation
forbidden_live_api_access
hidden_local_service_required
unexpected_clean_failure
unexpected_red_arm_success
unexpected_red_arm_reason
missing_red_arm_result
stage_result_schema_missing
stage_artifact_mutation_attempted
key_substitution_not_tested
external_pubkey_mismatch
privacy_leak_detected
non_claim_missing
volatile_artifact_field
raw_log_in_stable_artifact
full_suite_claim_without_full_suite
```

Stage-specific failure reasons such as `replayed_decision_mismatch`,
`missing_cell`, `grid_hash_mismatch`, `frontier_signature_invalid`, and
`golden_mismatch` remain owned by the relevant stage verifier. The integration
oracle records and checks them; it does not rename them.

## Testing And Acceptance

The default reviewer command is:

```bash
scripts/reproduce-stage4d-to-4f.sh
```

Default mode must prove:

```text
4D reproduce: green
4E reproduce: green
4F canary reproduce: green
integration oracle: green
offline enforcement: green
privacy scan: green
key-substitution coverage: green
non-claims audit: green
stable artifact audit: green
```

Full-suite mode is required when the integration report claims full-suite Stage
4F coverage:

```bash
SIMURGH_RUN_STAGE4F_FULL=1 scripts/reproduce-stage4d-to-4f.sh
```

If a report claims full-suite Stage 4F coverage without this mode, the gate
fails with `full_suite_claim_without_full_suite`.

The wrapper must scrub provider and browser environment variables before running
offline verification. It fails only if the verifier attempts to require those
variables or live services.

The gate must inspect structured red-arm/tamper result files and must never
infer red-arm success from a stage harness exit code alone. Key-substitution
coverage must exist for Stage 4D pack verification, Stage 4E scenario pack
verification, and Stage 4F cell/frontier verification.

The privacy scan covers integration artifacts and referenced stage summary
artifacts. It may scan stage evidence packs only through bounded, allowlisted
files and must not copy raw stage content into integration outputs.

## Implementation Planning Notes

The implementation plan should keep the work small and cross-stage only:

- add `scripts/reproduce-stage4d-to-4f.sh`
- add integration helpers only where needed for stable summaries and oracle
  evaluation
- add the integration evidence directory and README
- add tests for stable artifact auditing, expected-result oracle semantics,
  full-suite claim handling, privacy scanning, key-substitution coverage, and
  environment scrubbing
- avoid modifying Stage 4D, Stage 4E, or Stage 4F evidence unless a stage-level
  structured summary is genuinely missing and the change is explicitly scoped
  as a compatibility output

No online release-hygiene checks belong in the offline implementation.
