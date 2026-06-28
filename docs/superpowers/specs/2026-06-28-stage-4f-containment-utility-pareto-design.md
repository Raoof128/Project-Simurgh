# Stage 4F - Containment-Utility Pareto Design

**Date:** 2026-06-28
**Status:** Approved for implementation planning
**Track:** LLM-Shield / Stage 4 verifiable containment evaluation
**Builds on:** Stage 4D decision-replay evidence pack and Stage 4E browser-agent containment run

## Thesis

Stage 4F turns the Stage 4E single-scenario containment demo into a deterministic
containment-utility sweep. It evaluates committed policy operating points over a
committed scenario suite, seals every cell into signed Stage 4D evidence, and
builds an offline-verifiable Pareto frontier from those packs only.

The research claim is not that the model is safe, that the frontier is good, or
that the suite is exhaustive. The claim is that the reported frontier is
honestly computed from externally anchored suite/grid inputs and signed,
decision-replayable evidence packs, even under a dishonest-evaluator threat
model.

## Chosen Approach

**Chosen: two-step Stage 4F path.**

Stage 4F will be implemented first against `suite_canary_v1`, a small
deterministic representative subset. That canary is the machinery gate for
external `--suite` / `--grid` anchors, exact cell-set equality, signed frontier
roots, red arms, byte-stable goldens, and `verify-frontier` semantics.

Final Stage 4F closeout uses `suite_full_v1`, the full existing Stage 3F fixture
corpus, for the full release claim. The canary is development scaffolding; the
full suite is the release claim unless a release explicitly documents a bounded
subset claim. If full-suite runtime or repository size is not acceptable, the
release must be labelled as a bounded subset release and must not claim full
Stage 3F corpus coverage.

Rejected alternatives:

- **Full suite from day one:** strongest immediate claim, but slower iteration
  and more churn while frontier certificate and golden semantics are still
  being hardened.
- **Canary-only 4F:** fast and clean, but too weak for the final 4F evaluation
  claim unless every public statement is explicitly bounded to the subset.

## Architecture

Stage 4F will be a repo-native evaluation layer over the existing Stage 4D/4E
spine. It adds a deterministic sweep driver, an externally anchored suite/grid
manifest layer, a packs-only aggregator, a frontier certificate builder, and an
offline `verify-frontier` path. It must not fork the signer, pack, gateway, or
verification trust model.

The implementation layout follows the established Stage-4 pattern:

- `tools/agentdojo-simurgh-adapter/stage4f` owns suite selection, fixture-side
  run generation, and orchestration of the existing recorded-fixture runner.
- `tools/simurgh-attestation/stage4f` owns canonical suite/grid hashing, cell
  binding, packs-only aggregation, frontier construction, frontier certificate
  signing, `verify-frontier`, red arms, and golden generation.
- `docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto`
  stores committed artifacts, separated into canary and full-suite outputs.
- `scripts/reproduce-stage4f.sh` is the release closeout harness.
  `scripts/check.sh` should run the Stage 4F canary gate by default, while the
  full-suite closeout runs behind an explicit release flag such as
  `SIMURGH_RUN_STAGE4F_FULL=1`.

The load-bearing rule is that every reported cell is backed by a signed Stage 4D
evidence pack, and every frontier metric is recomputed from those packs only.
The verifier trusts external `--suite`, `--grid`, and `--pubkey` inputs, not
producer-supplied hashes embedded in `frontier.json`.

## Components And Data Flow

The Stage 4F flow is:

1. `suite_canary_v1` selects a small deterministic representative subset from
   the existing Stage 3F fixture corpus. `suite_full_v1` resolves the full
   committed Stage 3F corpus for release closeout. Both suites are materialized
   as ordered manifests with stable scenario IDs, fixture paths, fixture hashes,
   labels (`attack`, `benign`, `hard_negative`), and expected utility/security
   classification.
2. `grid.json` defines three initial operating points: `P0` permissive, `P2`
   balanced, and `P4` strict. Each point expands to a complete canonical policy
   bundle before hashing; hidden defaults are forbidden.
3. The sweep driver computes the exact cross-product of the external suite
   manifest and external grid. For each `(point_id, scenario_id)`, it derives:

   ```text
   cell_id = SHA256(JCS({
     point_id,
     scenario_id,
     suite_hash,
     grid_hash,
     policy_bundle_hash
   }))
   ```

4. Fixture-side Python orchestration generates deterministic run records using
   the existing Stage 4D/4E recorded-fixture path, with the selected operating
   point applied to the committed policy bundle.
5. Node builds one signed Stage 4D evidence pack per cell. The Stage 4D verifier
   must continue to pass unchanged. Stage 4F binds each cell through a separate
   `cell-manifest.json` rather than by changing the Stage 4D pack schema. The
   cell manifest records `cell_id`, `point_id`, `scenario_id`, `suite_hash`,
   `grid_hash`, `policy_bundle_hash`, `evidence_pack_hash`, and
   `evidence_pack_sig_hash`.
6. The aggregator reads only signed cell packs plus their cell manifests. It
   verifies every pack with the external public key, recomputes each cell
   binding, rejects missing/extra/duplicate cells, recomputes per-cell outcomes
   from receipts and ledgers, and then derives per-point metrics: ASR, benign
   utility, utility-under-attack, over-block, consequence counts, Wilson
   intervals, and verify coverage.
7. The frontier builder computes `all_points`, `plotted_frontier`, and
   `excluded_points`. Dominance is deterministic over `{ASR down, over_block
down, benign_utility up, utility_under_attack up}`. Equal vectors are
   retained and ordered by ascending `point_id`. Only green dominated points may
   be excluded with `reason == "dominated"`.
8. The certificate builder computes point Merkle roots over ascending `cell_id`,
   the frontier Merkle root over ascending `point_id`, and:

   ```text
   frontier_hash = SHA256(JCS(frontier_certificate_payload))
   ```

   It signs the canonical certificate payload out-of-process with domain
   separation:

   ```text
   Ed25519_sign("SIMURGH_FRONTIER_V1\0" || JCS(frontier_certificate_payload))
   ```

9. `verify-frontier` recomputes suite/grid hashes from external inputs,
   recomputes expected cell IDs, verifies every pack, recomputes cell manifests,
   checks aggregate roots, rebuilds metrics and dominance, verifies the frontier
   certificate, and writes stable `verify-frontier-results.json`.
10. Red arms reuse the same sweep machinery:
    - Arm B creates a validly signed lying-decision cell and must fail at
      `replayed_decision_mismatch`.
    - Arm C drops a scenario from one point and must fail at `cell_set_mismatch`
      or `missing_cell`.
    - Arm D byte-tampers an aggregate and must fail at hash, signature, or root
      validation.

Falsifiers are successful only when direct `verify-frontier` calls fail in the
expected way and force non-zero exit. Python may select fixtures and produce
candidate run records, but Node remains authoritative for canonical bytes,
hashes, pack verification, aggregation, frontier roots, signatures, and verifier
verdicts.

## Verification, Security, And Failure Handling

Stage 4F verification is fail-closed and producer-adversarial. The evaluator is
not trusted to choose the suite honestly, report metrics honestly, or exclude
bad cells honestly. The verifier treats external `--suite`, `--grid`, and
`--pubkey` as trust anchors, then recomputes every cell, metric, root, and
frontier claim from signed pack material.

Before deep parsing, `verify-frontier` enforces bounded input handling: maximum
frontier size, maximum cell manifest size, maximum pack size, maximum receipt
size, maximum string length, maximum expected cells, and no network, model,
provider, browser automation, or live API access. Malformed inputs return
structured failures, not raw stack traces.

For reproduce and release closeout, the harness or verifier checks that each
fixture path in the external suite manifest resolves within the allowed fixture
root and matches its declared `fixture_hash`.

Verification layers:

1. **External anchors:** canonicalise and hash the externally supplied suite
   manifest and grid. Reject if `frontier.json`, cell manifests, or certificate
   payloads claim different `suite_hash` or `grid_hash`.
2. **Cell-set completeness:** derive expected cells from the exact external
   suite/grid cross-product. Require sealed cell IDs to equal expected cell IDs
   exactly: no missing, extra, duplicate, swapped, or producer-derived cells.
3. **Per-cell 4D verification:** verify every referenced Stage 4D pack and pack
   signature using the external public key. The embedded key is not a trust
   anchor. A failed pack does not silently disappear; it becomes an invalid cell
   and forces non-zero `verify-frontier`.
4. **Cell binding:** recompute `cell_id`, `policy_bundle_hash`,
   `evidence_pack_hash`, and `evidence_pack_sig_hash` from committed material and
   reject any mismatch between the cell manifest, pack, suite, grid, and
   operating point. Each operating point in the external grid must expand to a
   complete canonical policy bundle. If the expanded bundle hash differs from
   the cell binding, verification fails.
5. **Packs-only metric derivation:** recompute ASR, benign utility,
   utility-under-attack, over-block, consequence counts, Wilson intervals, and
   verify coverage from verified packs only. Producer-supplied metric summaries
   are ignored except as values to compare against recomputed results.
6. **Frontier reconstruction:** rebuild `all_points`, `plotted_frontier`, and
   `excluded_points` from recomputed point metrics. A point may be excluded with
   exit `0` only when `reason == "dominated"` and all its cells are green. Any
   `unverifiable`, `incomplete`, `tampered`, `policy_mismatch`,
   `cell_set_mismatch`, or metric mismatch exclusion forces exit `1`.
7. **Certificate verification:** recompute point Merkle roots, frontier Merkle
   root, `frontier_hash`, and the canonical frontier certificate payload. Verify
   `frontier.sig` over
   `SIMURGH_FRONTIER_V1\0 || JCS(frontier_certificate_payload)` using the
   external public key. The signature is over the canonical payload, not over
   `frontier_hash` alone.
8. **Golden and determinism:** the reproduce harness builds the canary twice and
   compares generated file sets and bytes. Release mode repeats the same guard
   for `suite_full_v1`. Any drift exits `3`.

Stable failure reasons include:

- `suite_hash_mismatch`
- `grid_hash_mismatch`
- `missing_cell`
- `extra_cell`
- `duplicate_cell`
- `cell_binding_mismatch`
- `policy_bundle_hash_mismatch`
- `pack_verify_failed`
- `metric_digest_mismatch`
- `frontier_hash_mismatch`
- `frontier_signature_invalid`
- `fixture_hash_mismatch`
- `fixture_path_escape`
- `unexpected_exclusion_reason`
- `network_required_error`
- `privacy_leak_detected`
- `golden_mismatch`

A direct `verify-frontier` invocation over a malformed, incomplete, laundered,
or tampered artifact exits `1`. The reproduce harness exits `0` only when the
clean artifact verifies green and each red-arm artifact fails with the
pre-registered failure reason. Exit `2` is reserved for environment or setup
errors; exit `3` is reserved for golden or nondeterminism mismatch.

Security-sensitive falsifiers are first-class gates: signed lying-decision cell,
dropped scenario, duplicate cell, extra cell, swapped suite manifest, swapped
grid, embedded-key swap, frontier signature replay, aggregate metric edit, byte
tamper, producer-supplied metric laundering, oversized material, malformed input
stability, and network dependency.

## Testing, Artifacts, And Closeout

Stage 4F is accepted only through `scripts/reproduce-stage4f.sh`. Isolated tests
can support development, but the stage is complete only when the harness proves
the clean sweep, the red arms, offline verification, exact cell-set completeness,
packs-only metrics, privacy, and byte stability.

The committed evidence directory is:

```text
docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto
```

It has two explicit artifact lanes:

```text
canary/
  clean/
  red-arms/
  golden/
full-suite/
  clean/
  red-arms/
  golden/
```

The canary lane is for `suite_canary_v1` development and default CI. It must not
be described as the final 4F evaluation result. The full-suite lane is the
release claim unless the release explicitly documents a bounded subset claim.

Each lane contains:

- `suite-manifest.json`
- `grid.json`
- `signer.pub`
- `cells/<cell_id>/evidence-pack.json`
- `cells/<cell_id>/evidence-pack.sig`
- `cells/<cell_id>/cell-manifest.json`
- `cell-set-manifest.json`
- `metrics.json`
- `frontier.json`
- `frontier-certificate.json`
- `frontier.sig`
- `verify-frontier-results.json`
- `tamper-results.json`
- `privacy-results.json`
- `golden-results.json`
- `stage4f-closeout.json`
- reviewer-facing `README.md`

`signer.pub` is included for reviewer convenience, but `verify-frontier` trusts
only the external `--pubkey` argument.

`cell-set-manifest.json` records `suite_hash`, `grid_hash`,
`expected_cell_ids`, `sealed_cell_ids`, `missing_cell_ids`, `extra_cell_ids`,
and `duplicate_cell_ids`. Clean artifacts require exact expected/sealed equality
with no missing, extra, or duplicate cells.

The reproduce harness runs with network, model, provider, browser automation,
GPU, Claude, OpenAI, Anthropic, and live API access disabled. `scripts/check.sh`
runs the canary gate by default. The full-suite closeout runs only when
`SIMURGH_RUN_STAGE4F_FULL=1` is set, and release/tagging requires that
full-suite mode has exited `0` unless the release is explicitly scoped to
canary.

Test coverage maps directly to gates:

1. **Unit tests** for suite/grid canonicalisation, fixture hashing, policy
   bundle expansion, cell ID derivation, cell manifest validation, Wilson
   intervals, dominance, Merkle roots, frontier certificate signatures, size
   limits, and failure taxonomy.
2. **Integration tests** for `sweep -> per-cell 4D packs -> aggregate ->
verify-frontier`, external suite/grid/pubkey trust, exact cell-set equality,
   packs-only metric derivation, dominated-point exclusion, and
   ugly-but-honest frontier acceptance.
3. **Adversarial tests** for signed lying-decision cell, dropped scenario,
   duplicate cell, extra cell, swapped suite manifest, swapped grid,
   embedded-key swap, aggregate metric edit, byte tamper, frontier signature
   replay, producer-supplied metric laundering, malformed input stability, and
   oversized material.
4. **Offline tests** proving `verify-frontier` and the reproduce harness require
   no network, model, provider, browser automation, live API keys, or hidden
   local services.
5. **Privacy tests** proving generated Stage 4F artifacts contain no raw
   prompts, raw model outputs, secrets, API keys, hidden instructions, private
   keys, raw page text, raw email bodies, private user content, or content
   classes disallowed by the Stage 4D/4E metadata-only contract.
6. **Golden tests** proving two canary recorded-fixture runs produce
   byte-identical generated file sets and bytes. Release mode repeats this for
   `suite_full_v1`.

Golden artifacts must not contain unstable timestamps, absolute local paths,
random IDs, locale-dependent output, machine-specific values, unordered arrays,
unsorted file listings, or producer-supplied metrics that cannot be recomputed
from packs.

Falsifier tests are successful only when direct `verify-frontier` calls fail
with the pre-registered reason. The reproduce harness exits `0` only when the
clean artifact verifies green and every red-arm artifact exits `1` for the
expected reason.

The harness must not fail because the frontier is unattractive. High over-block,
low utility, or poor ASR are valid Stage 4F results if they are honestly
computed and verifiable. The harness fails only on verification, completeness,
determinism, schema, privacy, or tamper failures.

Stage 4F closeout requires:

- canary harness exits `0`
- full-suite harness exits `0` for release claim
- Arm A green
- Arms B/C/D red with expected reasons
- all expected cells present exactly once
- every plotted point backed by green packs
- metrics recomputed from packs only
- dominated-only exclusions allowed on green runs
- frontier certificate verifies against external public key
- offline verification succeeds with network disabled
- golden outputs are byte-stable across repeated runs
- privacy audit passes for generated artifacts
- README includes the required non-claims

Required README non-claim:

> Stage 4F certifies the evaluation record and committed-suite frontier. It does
> not prove model safety, model-inference integrity, real-world exhaustiveness,
> policy correctness, a good frontier, or unmediated action coverage.

## Security Review

Primary security risks and controls:

- **Producer laundering:** mitigated by packs-only metric derivation,
  exact cell-set equality, direct red-arm verification, and non-zero exits for
  unverifiable or incomplete points.
- **Suite or fixture swapping:** mitigated by external suite/grid trust anchors,
  fixture path root checks, declared `fixture_hash` validation, and
  `suite_hash` / `grid_hash` recomputation.
- **Policy ambiguity:** mitigated by complete canonical policy-bundle expansion
  per operating point and `policy_bundle_hash` binding in each cell.
- **Signature/key substitution:** mitigated by external `--pubkey` trust,
  embedded-key non-trust, domain-separated frontier signatures, and reuse of the
  out-of-process signer boundary.
- **Resource exhaustion or malformed input crashes:** mitigated by bounded input
  limits before deep parsing and structured failure taxonomy.
- **Privacy leakage in aggregates:** mitigated by a Stage 4F privacy gate over
  generated artifacts and continued reliance on Stage 4D/4E metadata-only packs.
- **Result tuning pressure:** mitigated by the no-quality-gate rule; unattractive
  but honestly computed frontiers pass.

## Non-Goals

Stage 4F does not implement adaptive red-team search, proof-carrying execution,
live Claude Computer Use as a shipping requirement, executor-truth attestation,
model-inference integrity, or unmediated action coverage. Tier B/C live-model
sweeps can be added later as `4F-LIVE`, but they must not block the Tier A
recorded-fixture release gate.
