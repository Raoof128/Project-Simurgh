# Stage 5N — VTC-Delay: verifiable non-instant finalisation of a decision artifact (design)

**Status:** FROZEN (four-section gauntlet + bounded beast-mode pass + invention pass + self-gauntlet complete; amendments A1–A4 folded). Next phase: TDD implementation plan.
**Release target:** `v2.49.0-stage-5n-vtc-delay`
**Motto:** _ClaimSafe first, then ReviewerSafe._
**Pays:** signed IOU **I4 `minimum_elapsed_review_binding`** — in full, **on release acceptance** (not on spec approval).
**Mints:** nothing (no socket hoarding; the capstone 5S composes frozen sub-evidence).
**Reuses (frozen, unmodified):** the Stage 5M three-ecology external-anchor quorum, run independently over each of the two endpoints.

**Amendments folded:** A1 (bounded adversarial hardening — beacon precommit scope, uncertainty floor, same-authority TSA, non-vacuous 397, whole-envelope adequacy scan, interp binding) and A2 (beast-mode inventions I-A…I-F, all zero-new-raw-code, saturation declared). Next phase: TDD implementation plan.

---

## Section 1 — identity, laws, honest core

### Blade (one)

A **fresh-input-bound dependent hash chain** binds an input commitment `D_in` to a final decision commitment `D_out`, such that `D_out` is provably an exact `T`-step dependent descendant of `D_in` + a validated fresh start token. The verifier **re-runs all `T` steps** (no fast-verify, no trusted setup, no algebraic hardness assumption — deliberately **not** a VDF). Both endpoints are externally time-anchored by the reused 5M three-ecology quorum; the two RFC-3161 genTimes establish a conservative elapsed-time lower bound.

```
start_request = { stage_id, run_id, D_in, delay_policy_digest, nonce }
start_request_digest = H_DS("simurgh.vtc_delay.start_request.v1", canonical(start_request))
start_token_digest   = H_DS("simurgh.vtc_delay.tsa_token.v1", exact_start_token_DER_bytes)

seed = H_DS("simurgh.vtc_delay.seed.v1",
            canonical({ run_id, D_in, start_token_digest, delay_policy_digest }))
x_0  = H_DS("simurgh.vtc_delay.x0.v1", seed)
x_i  = H_DS("simurgh.vtc_delay.step.v1", uint64_be(i) || x_(i-1))   for i = 1..T
terminal_value = x_T

decision_body   = canonical({ decision_schema, verdict, reason_codes, decision_scope_digest })
decision_digest = H_DS("simurgh.vtc_delay.decision.v1", decision_body)   // verifier RECOMPUTES

D_out = H_DS("simurgh.vtc_delay.output.v1",
             canonical({ run_id, D_in, decision_digest, delay_policy_digest,
                         start_token_digest, iteration_count: T, terminal_value }))
```

Explicit domain separation, fixed-width `uint64_be` iteration encoding, canonical structured objects for every hash. RFC-3161 is the **load-bearing wall-clock source**; OTS and Rekor corroborate endpoint existence/publication only — they are not precision clocks.

Successful Stage 5N **release acceptance** retires I4 in full.

### Laws (falsifiable)

- **No Instant Finalisation** — the conservative lower bound between the input-bound start token and the final decision commitment must meet or exceed the precommitted minimum: `elapsed_lower_bound_ms ≥ minimum_elapsed_ms`. Never computed as a naive `end - start`; always with committed uncertainty subtracted (see §2). Missing TSA accuracy is never silently zero.
- **No Pre-Input Final Commitment** — `D_out` must be the exact declared `T`-step descendant of `D_in`, the validated fresh start token, the committed policy, and the (verifier-recomputed) decision digest. A `D_out` prepared before the fresh input-bound start evidence fails full-chain recomputation.

### Honesty boundary (verbatim, load-bearing — belongs here, not an appendix)

> Proves that the final decision commitment was produced after fresh input-bound start evidence, incorporates the exact result of the declared dependent `T`-step hash chain, and was externally time-anchored no earlier than the precommitted conservative elapsed-time floor. It does not prove human attention, deliberation, decision-formation time, review quality, work exclusivity, hardware-independent delay, universal non-parallelisability, decision correctness or regulatory compliance. The interpretability channel is corroborating only and is never required for a green verdict.

> The measured 157-second execution came from a pre-specification gate using the same 20-million-step chain length but a **different seed derivation**; it is neither the shipped Lane B measurement nor a portable timing guarantee. The frozen-formula Lane B ceremony reports its own measured interval separately. The portable elapsed-time claim comes only from the validated endpoint timestamps and committed uncertainty policy.

The four-step attack this survives honestly: a reviewer may (1) choose the decision immediately, (2) run/wait through the delay, (3) bind that already-chosen decision to `x_T`, (4) anchor `D_out`. That still verifies. The stage proves **delayed finalisation and input-descendant commitment**, never delayed cognition. Receipt, not passport.

### Threat reference (Simurgh spine)

Following a Fable-5-style input-filter failure, 5N prevents an operator from presenting an immediately finalised, pre-input approval commitment as temporally reviewed. It does not detect or prevent the jailbreak itself; it strengthens the downstream oversight-evidence lane.

### Wedge (source-precise)

- **Regulation.** EU AI Act Art. 14 requires effective human oversight (understand limitations, avoid automation bias, interpret outputs, override, stop) but does not specify how effectiveness is achieved (Fink, _Human Oversight under Art. 14_). Implementation commentary has _proposed_ override rates and deliberate friction as indicators, but neither is a statutory or sufficient test. 5N supplies one **recomputable necessary condition** for non-instant finalisation — it does not operationalise "effective human oversight" as a whole.
- **Incident.** Robo-signing: Jeffrey Stephan (GMAC), June 2010 deposition, Maine, testified he signed "6,000 to 8,000 — possibly even 10,000" foreclosure affidavits per month, neither he nor his team verifying the contents (reported via ProPublica; primary = the June 2010 Stephan deposition it hosts — pin the exact transcript page at build). The **Stephan test** fixture models high-volume attestation without content verification: a final approval commitment cannot be issued before the precommitted temporal floor and fresh-input dependency are satisfied.
- **Prior-art seam.** VDFs are defined by fast verification (O(polylog t)) and typically need trusted setup; 5N deliberately re-runs the whole chain — no fast-verify, no trusted setup — trading verification cost for transparency and honestly conceding it does not prove universal non-parallelisability.

---

## Section 2 — artifact schema, raw-code band, frozen check order

### Committed `delay_policy` (its digest binds delay rules + uncertainty + interpretability + limits — nothing floats)

```
delay_policy {
  profile_id: "simurgh.vtc_delay.profile.5n.v1",
  delay_algorithm_id: "simurgh.stage5n.dependent-sha256-chain.v1",   // profile ==
  hash_algorithm: "sha256",                                          // profile ==
  iteration_count_T: 20_000_000,                                     // profile ==
  checkpoint_cadence: 2_000_000,                                     // profile ==
  canonical_encoding: "simurgh_canonical_json_v1",                   // profile ==
  implementation_digest,
  precommitted_minimum_elapsed_ms,          // profile: >= STAGE_5N_FLOOR_MS = 60_000 (hard-frozen v1)
  accepted_freshness_modes: ["issuer_signed"],                       // profile == (A4 #1)
  uncertainty_policy   { mode, per_authority_bounds, policy_signer_key_id },
  interpretability_policy { channel },      // profile: channel ∈ {"optional","not_in_scope"} (A4 #9); "required" OUTSIDE v1
  verifier_limits { max_envelope_bytes, max_checkpoint_count, maximum_supported_T }
}
delay_policy_digest = H_DS("simurgh.vtc_delay.policy.v1", canonical(delay_policy))
```

`STAGE_5N_FLOOR_MS = 60_000` is hard-frozen for v1 ("provisional-frozen" is not a valid spec state). A later change requires an explicit profile revision or a pre-implementation spec amendment. All time values are integer **milliseconds** represented as safe-integer JSON numbers (< 2⁵³) — **not `BigInt`** (`canonicalJson` throws on `BigInt`; receipt from 5M/4Z). No floats; no unsigned subtraction.

### Envelope (unknown fields fail closed → `delay_envelope_malformed`; `reserved_slots` removed entirely)

- `input_reference { artifact_digest, canonicalisation_profile }` → verifier derives `D_in` (or takes `--expected-input-commitment <digest>`) and compares; mismatch = `input_commitment_mismatch`.
- `freshness_challenge` — **tagged union** (see below).
- `start_request { stage_id, run_id, D_in, delay_policy_digest, nonce }`; `start_request_signature` signs `start_request_digest` **before** the start TSA request (proves precommit adoption); bound also to `request_commitment_digest` (freshness).
- **Endpoint subjects pinned exactly.** Start: TSA imprint = OTS subject = Rekor committed subject = `start_request_digest`. End: TSA imprint = OTS subject = Rekor committed subject = `D_out`. Acyclic (`start_request → TSA(start_request) → seed → chain → D_out → TSA(D_out)`). Start OTS/Rekor corroborate the already-fixed `start_request_digest` and are **not** inputs to `D_out`; the chain begins as soon as the start TSA token exists, without awaiting start-side Bitcoin confirmation.
- `execution_declaration { iteration_count, implementation_digest }` — compared to committed policy **before** recompute.
- `delay_proof { seed, x_0, checkpoint_ladder@cadence, terminal_value }` — checkpoints are diagnostic / fault-localising, cross-checked against a full recompute from `x_0`, never a substitute for it.
- `decision_body { decision_schema, verdict, reason_codes, decision_scope_digest }`; `decision_digest` **recomputed by the verifier** (never trust a supplied digest).
- `D_out` as derived above.
- `final_envelope_signature` signs `H_DS("simurgh.vtc_delay.envelope.v1", canonical(envelope_without_final_signature))`; signer roles pinned by policy / verifier configuration.
- Non-claim recorded in-artifact: `not_runtime_binary_attestation` (the implementation digest binds the _declared_ artifact, not the executed binary).

### Freshness — tagged union (code `401` in both modes; detail carries the mode)

```
freshness_challenge = issuer_signed_challenge | public_beacon_challenge

issuer_signed_challenge {
  mode: "issuer_signed", challenge_schema, run_id, nonce, issued_at, expires_at,
  issuer_key_id, request_commitment_digest, signature   // signature verifiably binds
}                                                       // (request_commitment_digest, run_id, nonce) — A4 #3

freshness_request {                 // the pre-challenge committed object — BOTH modes (A4 #3)
  stage_id, run_id, D_in, delay_policy_digest, issuer_key_id            // issuer mode
  // beacon mode instead carries: beacon_source, selection_rule, requested_after
}
request_commitment_digest = H_DS("simurgh.vtc_delay.freshness_request.v1", canonical(freshness_request))

public_beacon_challenge {
  mode: "public_beacon", beacon_source, selection_rule, request_commitment_digest,
  requested_after, round_or_block_height, beacon_value, publication_time,
  authenticity_proof, precommit_proof
}
nonce = H_DS("simurgh.vtc_delay.beacon_nonce.v1",
             canonical({ request_commitment_digest, beacon_source, round_or_block_height, beacon_value }))
```

Beacon `selection_rule` must be fixed **before** the value exists (e.g. "first drand round whose publication_time > requested_after"; "first Bitcoin block at height > reference"). `precommit_proof` must establish that `request_commitment_digest` was committed **before** the selected beacon value was published (e.g. an RFC-3161 token over `request_commitment_digest` with genTime < beacon publication_time) — otherwise the producer observes values first and manufactures a "precommitted" selection afterwards. `start_request.nonce` equals the issuer nonce (issuer mode) or the derived beacon `nonce` (beacon mode).

**v1 shipping rule:** `issuer_signed` is the **mandatory** real Lane B mode. `public_beacon` is fully specified here but **ships only if its `precommit_proof` is fully exercised** in Lane B/Lane D; otherwise it is deferred to a later revision. The exotic path must not delay the core release. "No single challenge-issuer trust root" is the honest claim for beacon mode — freshness then relies on declared public-beacon authenticity, the frozen selection rule, consensus/finality assumptions, and correct verification material. It is **not** a zero-trust-root claim.

### Frozen raw-code band + first-failure order (396→419; fail-closed last)

| Code | Reason                                  | Code | Reason                                         |
| ---: | --------------------------------------- | ---: | ---------------------------------------------- |
|  396 | `delay_envelope_malformed`              |  408 | `implementation_commitment_mismatch`           |
|  397 | `final_envelope_signature_invalid`      |  409 | `seed_derivation_mismatch`                     |
|  398 | `input_commitment_mismatch`             |  410 | `checkpoint_ladder_mismatch`                   |
|  399 | `delay_policy_digest_mismatch`          |  411 | `delay_recomputation_failure`                  |
|  400 | `delay_policy_not_accepted`             |  412 | `decision_binding_mismatch`                    |
|  401 | `freshness_challenge_invalid_or_reused` |  413 | `output_commitment_mismatch`                   |
|  402 | `start_request_binding_invalid`         |  414 | `end_endpoint_subject_mismatch`                |
|  403 | `start_request_signature_invalid`       |  415 | `end_endpoint_anchor_incomplete`               |
|  404 | `start_endpoint_subject_mismatch`       |  416 | `tsa_uncertainty_unresolved`                   |
|  405 | `start_token_invalid`                   |  417 | `insufficient_timestamp_separation`            |
|  406 | `start_endpoint_anchor_incomplete`      |  418 | `interpretability_evidence_invalid_or_unbound` |
|  407 | `iteration_count_mismatch`              |  419 | `internal_or_env_unavailable`                  |

First-failure order = numeric order; `419` is the outer fail-closed boundary. Deliberate placements: 401 detail `{ freshness_mode, failure: selection_rule_not_satisfied | signature_invalid | expired | reused }`; 407/408 (pre-recompute declaration lies) precede 411 (fabricated `x_T`); 406 precedes 417 (elapsed is meaningful only once both endpoints validate & anchor).

**Code 418 (interpretability, non-load-bearing):** `optional + absent → pass`; `optional + present + correctly bound → pass`; `optional + present + malformed/mismatched/unbound → 418`. Prevents decorative or tampered telemetry riding inside a green artifact while keeping the channel never green-_gating_. `required` is outside the v1 profile.

### 5M child-code handling (codes 406 / 415)

Stage-local wrapper; underlying 5M code retained as structured detail:

```json
{
  "raw_code": 406,
  "reason": "start_endpoint_anchor_incomplete",
  "detail": {
    "endpoint_role": "start",
    "child_stage": "5M",
    "child_raw_code": 389,
    "child_reason": "..."
  }
}
```

Stable 5N surface, frozen 5M taxonomy preserved, endpoint-role explicit, deterministic first-failure. Directly propagating 385–395 would make the 5N order ambiguous and hide which endpoint failed.

---

## Section 3 — evidence lanes, attestation tiers, tri-runtime parity, Lane D

### Lane A — two hard layers

- **A1 (hermetic):** small-`T`, test-only functions; branch-complete over canonical encoding, domain separation, chain transitions, checkpoint comparison, uncertainty arithmetic, and every code 396–419. Not exported; **never receives a normative raw `0`**.
- **A2 (production-verifier fixtures):** everything passes through the real public verifier — small-`T` negatives that correctly return `400`, tampered normative-envelope fixtures for 396–419, and **one frozen real-profile green imported from Lane B**. No public `ci.v1` profile the production verifier accepts as green. Any unavoidable test-only override lives outside the public CLI, requires explicit test injection, emits `non_normative_test_result`, is unreachable in packaged release builds, and never generates signed release evidence.

### Lane B — one real full-profile ceremony (deterministic, not CI-gated)

`T = 20_000_000`, precommitted floor ≥ 60_000 ms, both endpoints receive RFC-3161 + OTS + Rekor, two overlapping Bitcoin waits (the chain does not wait on start-side OTS), verified offline to raw `0`. Freshness = `issuer_signed` (mandatory v1). Reproducibility split into two honest claims (the envelope's live external artifacts are **inputs**, not regenerated):

- **Deterministic-core equality** — two machines derive identical `start_request_digest, start_token_digest, seed, x_0, every checkpoint, x_T, decision_digest, D_out, delay_policy_digest, final_envelope_digest`.
- **Cross-machine verdict equality** — identical `raw_code, reason, elapsed_lower_bound_ms, derived digests, checkpoint results, child-5M verdicts, overall verdict`.
- Plus the modest true claim: the captured envelope re-serialises byte-identically under canonical re-emit (serialisation stability, not live-ceremony reproduction).

### Lane C — typed decision through a metadata-only normaliser (digest-only, never CI-gated)

```
model_observation { provider_id, model_revision, model_route_digest, prompt_digest, context_digest,
                    generation_policy_digest, raw_output_digest, normaliser_implementation_digest }   // no raw prompt/output
adapter → decision_body { decision_schema, verdict: enum, reason_codes: sorted enum[], decision_scope_digest }
unusable model output → verdict: "model_output_unusable"
refusal → signed abort capsule  simurgh.vtc_delay.ceremony_abort.v1
          { abort_reason: "model_refused", last_completed_phase, start_request_digest,
            start_endpoint_verdict, no_D_out_created: true }        // NOT raw 0
```

A jailbroken model cannot inject prose/authority into the signed decision — the trusted adapter, not the model, constructs `decision_body`. Lane C carries ≥3 outcomes: (1) valid post-input final commitment → raw `0`; (2) a stale/pre-input commitment that fails a _typed_ check — precisely `401` (reused freshness) or `413` (`D_out` not bound to the fresh `start_token_digest`) or `417` (insufficient separation), never a claim that the verifier detected decision-_formation_ timing; (3) model refusal → signed abort capsule.

### Attestation — recomputable, not receipt

- **Tier 1 — portable verifier pack.** Everything an outsider needs to obtain raw `0` offline **without trusting the producer**: full committed policy, freshness evidence, `start_request` + signature, exact start TSA DER, complete start 5M bundle, `execution_declaration`, `seed`, `x_0`, checkpoint ladder, `terminal_value`, `decision_body`, `D_out`, exact end TSA DER, complete end 5M bundle, uncertainty inputs, final signature, committed trust material + verifier config. May omit commentary/verbose traces — never law-bearing evidence.
- **Tier 2 — audit pack.** Adds child-5M raw-code diagnostics, live-capture metadata, provenance manifests, implementation artifacts + digests, cross-machine reproduction outputs, failure traces, fixture ancestry, source-map + limitation records.

Distinct 5N signing domains (separate from 5M).

### Offline trust materials (Lane B pack carries/commits; auditor verifies, does not regenerate)

- **RFC-3161:** exact DER token, signer certificate chain, pinned trust anchor/policy, message-imprint algorithm, validated accuracy or committed uncertainty bound, revocation material required by the frozen verification policy.
- **OTS:** detached proof, calendar attestations, Bitcoin transaction + Merkle material, block header / frozen material required by 5M, confirmation-depth policy.
- **Rekor:** canonical entry body, inclusion proof, signed tree head/checkpoint, log key + identity, tree size + indexes.

### Parity — narrowed honestly

- **Node ↔ Python:** full audit decision parity (schema/dispatch, all digest derivations, chain recomputation, checkpoint validation, decision binding, endpoint subject binding, uncertainty arithmetic, 5M child-result mapping, all codes 396–419).
- **Browser:** portable-**core** parity only (canonical encoding, domain-separated hashes, policy validation, seed + chain recomputation, checkpoint validation, decision + output commitment, uncertainty arithmetic, deterministic raw-code ordering). **External-anchor validation = Option 3: browser tier is core-only; Node/Python required for full 5M anchor crypto** (consistent with every prior stage's deterministic-surface parity). A committed reproducible WASM verifier is deferred.

### Lane D — producer-independent cross-machine verification (explicit contract)

≥2 machines; ≥2 operators or one external operator; one Node run + one Python run; no network after dependency/evidence acquisition; identical deterministic-core digests; identical raw code + verdict; environment manifest recorded; wall-clock verification-duration differences **reported, never** treated as an evidence failure. Verifies the frozen Lane B pack — it is **verification, not a second live ceremony** (a genuinely second generated ceremony would be a future Lane B2).

---

## Section 4 — Lean theorems, theorem projection, non-claims, limitations, founder ledger, scorecard

### Lean theorems (core Lean 4.15, no mathlib, zero `sorry`)

Lean treats each domain-separated hash as a **deterministic function**; it proves verifier _conformance_, not cryptographic collision resistance, injectivity, or preimage resistance.

1. **Deterministic descendant conformance.**

   ```
   verify(bundle) = 0
   → terminal_value = recompute_T(seed, T)
   ∧ D_out = derive_output_commitment(run_id, D_in, decision_digest, delay_policy_digest,
                                       start_token_digest, T, terminal_value)
   ```

   Failure-code claims carry first-failure prefixes:
   `checks 396..410 pass ∧ terminal_value ≠ recompute_T(seed, T) → verify = 411`;
   `checks 396..412 pass ∧ D_out ≠ derive_output_commitment(...) → verify = 413`.

2. **Conservative elapsed soundness (conditional) + monotonicity.** All integer ms.

   ```
   elapsed_lower_bound_ms = (end_time_ms - end_uncertainty_ms) - (start_time_ms + start_uncertainty_ms)
   Assuming |actual_start_ms - start_time_ms| ≤ start_uncertainty_ms
        and |actual_end_ms   - end_time_ms|   ≤ end_uncertainty_ms:
     elapsed_lower_bound_ms ≥ minimum_elapsed_ms → actual_end_ms - actual_start_ms ≥ minimum_elapsed_ms
   Monotonicity: increasing either committed uncertainty bound never increases elapsed_lower_bound_ms.
   ```

   Missing accuracy with no signed policy ⇒ `416`, never silent-zero.

3. **Core verifier totality + wrapper closure (two theorems).**
   Core: for every schema-bounded, parsed verifier input within the committed resource model, `verify_core` returns exactly one code in `396..418`.
   Wrapper: every modelled parser / dependency / environment-unavailable error handled by the wrapper maps to `419`. (No claim about `SIGKILL`, OOM, kernel fault, machine loss, or nontermination.)

4. **No green without accepted child-anchor verification.**

   ```
   verify5N(bundle) = 0
   → verify5M(bundle.start_endpoint) = 0 ∧ verify5M(bundle.end_endpoint) = 0
   ∧ start_endpoint.subject_digest = start_request_digest ∧ end_endpoint.subject_digest = D_out
   ```

   Lean establishes composition with the modelled 5M verifier — not that Bitcoin/DigiCert/Rekor existed. The real anchor checks are established by the frozen external evidence + runtime verifier.

5. **Freshness — two theorems.**
   Issuer replay: `checks 396..400 pass ∧ issuer_census_key ∈ seen → verify = 401`, where `issuer_census_key = H(mode || issuer_key_id || run_id || nonce)`.
   Beacon admissibility: `checks 396..400 pass ∧ selected beacon does not satisfy the precommitted selection_rule → verify = 401`. Beacon replay key = `H(mode || beacon_source || round_or_block_height || request_commitment_digest)` — a public round may serve multiple distinct requests; the rejected object is the same request commitment reusing the same selected beacon, not every reuse of the round.

### Anti-theatre gate — theorem projection (build-failing)

```
theorem_projection { theorem_name, lean_predicates, runtime_functions, raw_codes, domain_strings, fixture_ids }
```

The build MUST fail if: Lean and runtime raw-code numbers differ; domain-separation strings drift; check order differs; a theorem references a predicate not exercised by runtime fixtures; or Node and Python disagree with the Lean model vectors. `zero sorry` is necessary but insufficient — the projection prevents proving a gorgeous miniature universe while production runs next door in sunglasses.

### Signed non-claims (shipped in-artifact)

not human attention · not deliberation · not decision-formation time · not review quality · not work exclusivity · not hardware-independent delay · not universal non-parallelisability · not decision correctness · not regulatory compliance · not runtime binary attestation · **not jailbreak detection or prevention** · **not proof of TSA clock correctness** · **not proof of beacon unbiasability or finality** · **not proof of human identity** · **not proof of continuous human presence** · **not process totality under unmodelled host failure** · **not cryptographic injectivity proof** · interpretability channel corroborating-only, never green-gating.

### Signed limitations (into `known_limitations`)

- The 157 s gate figure used a different seed derivation; it is neither the shipped Lane B measurement nor a portable guarantee.
- Freshness has **no single challenge-issuer trust root** in beacon mode, but relies on public-beacon authenticity + finality assumptions; the _delay primitive itself_ is trusted-setup-free.
- The 60 000 ms floor is a policy floor, not a sufficiency threshold.
- The browser tier is core-only for anchors; Node/Python required for full 5M anchor validation.
- A valid chain around a pre-decided verdict still verifies (finalisation ≠ cognition).
- Beacon mode ships only if its `precommit_proof` is fully exercised; otherwise deferred.

### Founder ledger (one external actor)

**Target external actor:** an independent AI-assurance or EU AI Act conformity-assessment professional. A notified-body affiliation is recorded only if the participating actor genuinely holds that status and the relevant assessment context requires it (the AI Act is provider-led assessment in general; third-party involvement applies only in particular circumstances). The actor runs the **Tier-1 pack** offline under the Lane-D contract and reports the observed raw code and verdict; the release may claim independent raw `0` only if that is the result actually obtained — any non-zero result becomes a release blocker or an honestly published negative result. Single blocker: the `delay_policy` (incl. floor + freshness mode) must be committed **before** the review begins, which the ceremony enforces.

### Four-axis scorecard (MARKED at spec-freeze 2026-07-14, A1–A4 folded; re-scored at closeout)

Discriminated against neighbours (5K 9.0/9.0/9.4/9.4 · 5L 9.2/9.3/9.6/9.6 · 5M 9.3/9.5/9.6/9.5); every
booster is a named buildable artifact tracked as a roadmap debt.

- **Novelty 9.2 (HOLD)** — the _composition_ is new (unpredictable-TSA-token-seeded chain × decision
  binding × dual-quorum endpoints × the Stephan census, the repo's first cross-artifact species), but the
  primitives have lineage (time-lock puzzles, proofs of sequential work, RFC-3161) and the **signed
  prior-art map is open**. Map must cover: VDFs & time-lock puzzles; sequential proofs / proofs of elapsed
  time; RFC-3161 dual-timestamp workflows; proof-of-history; timestamped approvals & workflow/
  process-mining controls; human-oversight evidence systems; transparency-log & witness ceremonies.
  **Boosters:** close the signed prior-art map; run the Stephan-census tool over ≥3 real envelopes.
- **Frontier 9.4 (HOLD)** — already real: 3-machine byte-identical 20M chain, both endpoints banked
  through the real 5M quorum (raw 0, real Bitcoin blocks), 14 s full recompute measured. Held below
  banked-5M because the **frozen-formula Lane B has not executed** (the 157 s figure is the old seed
  derivation, §1). **Boosters:** execute the frozen-formula Lane B (two Bitcoin waits); one
  external-operator Lane D run (a second generated ceremony would be a separate Lane B2 — do not merge).
- **Anthropic/regulator usefulness 9.6 (RAISED from 9.5)** — A3 upgraded the evidence class: the wedge
  names a **shipped product surface** (an audit feed whose `accessed_at` is an instant, not an interval;
  producer-attested, non-recomputable) and a **live July 2026 event** (a redeployment review evidenced by
  prose). 5N supplies the missing duration species without claiming to measure attention, quality, or
  Art. 14 compliance. **Boosters:** emit I-E against a real activity-feed record shape; a named assessor
  runs the Tier-1 pack.
- **Constitution 9.5 (RAISED from 9.4)** — the honesty engineering became structural: I-C makes the
  overclaim unassertable (code + Lean lemma, 5C lineage); the four-step pre-decided-verdict attack lives
  in §1; refusal is an honest signed outcome; census-relative replay is a signed limitation; 18 non-claims;
  interp corroborating-only. Not 9.7 (5D's bar required a live multi-round adversarial ledger; ours pends
  Lane C). **Boosters:** 5R real interp telemetry; publish the negative-result path verbatim if the
  external actor reports non-zero.

**Dual-safety check:** motto in header; Lane C exports digests only; provider-agnostic public wording;
Tier-1 pack reaches raw 0 offline without trusting the producer. **One-blade check:** the chain-binding is
the single rejectable mechanism. **K7:** mandated before tag.

---

## Amendment A1 — bounded beast-mode hardening (2026-07-14)

Strict tightenings only (the verifier gets stricter, never looser), bounded to the five reviewed surfaces. Held without change: child-verifier laundering (wrapper runs `verify5M`; 404/414 subject binding is preimage-hard and role/run-distinct).

1. **Beacon precommit scope.** `public_beacon_challenge.precommit_proof` structure is frozen **at beacon-mode activation**, explicitly out of v1 scope (v1 mandatory freshness = `issuer_signed`). No floating TBD on the shipped v1 surface.
2. **Minimum uncertainty floor (profile / code 400).** `delay_policy_not_accepted` additionally rejects an `uncertainty_policy` whose `per_authority_bounds` for any authority is below that authority's inherent timestamp granularity when accuracy is unspecified (≥ `1000 ms` for second-precision genTime). Closes the `uncertainty = 0` precision overclaim near the floor.
3. **Same-authority elapsed (code 416/400).** Both endpoint RFC-3161 tokens must be issued by the **same committed TSA authority**, unless the committed `uncertainty_policy` carries a signed cross-authority synchronisation bound that is added into `start_uncertainty_ms`/`end_uncertainty_ms`. Mixed unsynchronised clocks otherwise make the interval meaningless.
4. **Non-vacuous final signature (code 397).** The `final_envelope_signature` signer key fingerprint is committed in `delay_policy` (pre-execution); `397` fails when the actual signer ≠ committed fingerprint (mirrors 5M's non-vacuous 390). `envelope_without_final_signature` = the `final_envelope_signature` field **removed, not set to null** (canonical `{x:null}` ≠ `{}`).
5. **Adequacy scan over whole envelope (code 396).** `delay_envelope_malformed` includes the frozen `ADEQUACY_FORBIDDEN_KEYS` scan across the entire envelope, including the interpretability object — a present-but-optional interp payload cannot smuggle an adequacy/`model_safe` claim into a green artifact.
6. **Interpretability binding (code 418).** Interpretability evidence, when present, must commit `run_id + D_out`; missing or mismatched binding (or a malformed payload) → `418`. Absent-and-optional still passes; the channel remains never green-_gating_.

These fold into the frozen sections above (§2 codes 396/397/400/416/418; §4 non-claims unchanged). Theorem projection (§4) must include the new profile predicates (uncertainty floor, same-authority, committed signer fingerprint) so Lean and runtime cannot drift on them.

## Amendment A2 — beast-mode inventions (2026-07-14; all six approved)

All zero-new-raw-code by construction: projections, fixture families, theorems, census rules, emit-only
bridges. The sealed 396–419 band and frozen check order are untouched. Each invention ships with its
anti-gaming non-claim in the same breath. Invention space is declared **saturated at I-F**; no sockets minted.

- **I-A Provable Review Concurrency ("the Stephan census").** A derived, never-filed projection over a
  PORTFOLIO of green envelopes: per signer identity, interval algebra over the verified
  `[start_upper_ms, end_lower_ms]` windows yields the maximum provable number of simultaneously in-flight
  finalisations; within a declared census, decisions lacking an envelope are the auditable absence.
  First cross-artifact (multi-ceremony) evidence species in the repo. Fixture family named the
  **Stephan census** (June 2010 GMAC deposition lineage, §1 wedge). **Non-claims:** concurrency is not
  inattention (a team may legitimately operate behind one signer identity); absence of an envelope is not
  guilt outside a declared census. Measures exposure, never intent.
- **I-B The Instant-Verdict Trilemma (Lean theorem `instantVerdictTrilemma`).** An adversary wanting an
  instant verdict presented as reviewed has exactly three branches, each costed: **comply** (run the chain
  → pays ≥T sequential steps after the start token), **forge** (shorten/skip/fabricate → typed
  407/409/410/411), or **predict** (precompute the seed → requires predicting the TSA token bytes —
  serial + signature — before the TSA emits them). Proven over the existing checks; wired into the
  theorem-projection gate. **Non-claim:** holds in the modelled-hash world (§4 deterministic-function
  model); asserts no parallel-hardware wall-clock bound.
- **I-C The Delay-Overclaim hard gate.** The strongest false reading of a 5N artifact — "the human
  reviewed carefully" — becomes structurally unassertable: the whole-envelope adequacy scan (A1 #5)
  additionally rejects `DELAY_OVERCLAIM_FORBIDDEN_KEYS = { human_reviewed, attention_verified,
review_duration_claimed, careful_review, cognition_time, review_effort }` at 396, plus a Lean lemma
  (green ⇒ none present) in the theorem projection. 5C lineage: the anti-overclaim is a code, not a
  disclaimer. **Non-claim:** a lexical key-scan, not semantic — blocks the structured overclaim, not every
  prose paraphrase (that seam stays signed; 4X lineage).
- **I-D No Silent Re-Finalisation (census rule).** The evidence census (which already tracks freshness
  reuse) additionally flags two green envelopes over the same `(D_in, delay_policy_digest)` with differing
  `decision_digest` as typed `double_finalisation`. **Non-claim:** re-finalisation is legitimate (reopened
  cases); the rule makes it visible, never criminal.
- **I-E Oversight-log projection (emit-only).** A projection template mapping envelope fields onto an
  Art-14-style oversight record — turns a compliance log from prose into a protocol; distribution move
  toward the founder-ledger actor. **Non-claim:** a projection of 5N evidence, not a claim of Art-14
  compliance (the §1 necessary-not-sufficient bound carries over verbatim).
- **I-F Interval predicate bridge (emit-only).** An in-toto predicate `simurgh.vtc_delay.interval.v1`
  whose subject is `D_out`, carrying the conservative elapsed lower bound; rides the 5M bridge machinery.
  Seam: the TSA ecosystem itself ships `Accuracy: unspecified` (DigiCert receipts in hand) and no standard
  composes two RFC-3161 tokens into a signed duration claim. **Non-claim:** the predicate asserts the
  bound, not review quality; consumers inherit every §4 non-claim.

Generators that missed (recorded so the pass is auditable): G5 (filing-forces — inherent in the
start-token precommit), G8 (missing voice — 4V contest machinery already reaches capsules), G9 (the stage
IS the clock), G10 (the chain is already trustless-outsourceable — one sentence in the plan, not an
invention), G11 (Lane C outcome 2 already seals the adversarial-user case).

## Amendment A3 — wedge refresh from the 2026-07-14 sweep (citations + one Lane C note; zero mechanism changes)

Sweep of the research hub (anthropic.com/research) and platform docs (platform.claude.com/docs) per the
standing gap-hunt rule. Public wording remains provider-agnostic; primary receipts pinned here.

1. **Incumbent concession (G3-grade, current to July 10 2026).** A leading provider's Access Transparency
   feature ships an audit feed of human-access events (`anthropic_access` / `cmek_preserve`) with reason
   codes and an `accessed_at` timestamp. Seams, in its own documentation: (a) `accessed_at` is an
   **instant, not an interval** — no duration evidence species exists (a 200 ms `safety_review` view is
   indistinguishable from an hour); (b) the feed is **producer-attested JSON** — no signatures, inclusion
   proofs, or recomputable evidence — while the same page concedes the customer's KMS log "independently
   confirms key usage patterns" but is non-per-read; (c) the docs draw 5N's own distinction verbatim:
   "the record reflects that your content's retention state changed, independent of who changed it."
   5N supplies exactly the missing species: a recomputable, externally anchored **duration lower bound**
   on a decision artifact. The I-E oversight-log projection gains a second concrete target shape
   (activity-feed records) alongside the Art-14-style record.
2. **Threat reference grounded in a live 2026 event.** A frontier model released 9 June 2026 had a
   safeguard bypass demonstrated by external researchers; access was suspended 12 June; a two-week
   government-collaborated review preceded redeployment on 1 July. The public evidence that the review
   occurred is prose ("extraordinarily strong", "over 99% of cases") — not recomputable. A redeployment
   decision carrying a 5N envelope would make its non-instant review floor provable rather than asserted.
   Non-accusatory: the absence of duration evidence is industry-wide; this is the wound test passing in
   the stage's own month.
3. **Lane C operational note.** Current frontier APIs return `stop_reason: "refusal"` from request-level
   safety classifiers (with an optional fallbacks mechanism). The Lane C ceremony maps that stop reason
   onto the signed abort capsule (`abort_reason: "model_refused"`, A1/§3) — the exact API surface the
   capsule was designed to catch. Live-lane plumbing: such models may enforce non-ZDR retention and
   always-on adaptive thinking; capture configs pin these at ceremony time.
4. **5R rider pointer.** The July 2026 interpretability result on an emergent internal workspace (thoughts
   not present in output) strengthens the case that the interpretability channel stays corroborating-only
   (§1): internal state is not output, and 5N never claims to observe cognition. Feeds the optional 5R
   stage, not 5N.

## Amendment A4 — self-gauntlet corrections (2026-07-14; hostile-reviewer pass over the complete spec, verified against the repo)

**P0 — contradictions between frozen sections and amendments (each would have broken the build under our own gates):**

1. **Freshness mode is now committed in the policy.** `delay_policy` gains
   `accepted_freshness_modes: ["issuer_signed"]` (profile `==` for v1). Consequences: a beacon-mode
   envelope under the v1 profile fails **400** deterministically; the founder-ledger sentence ("the
   delay_policy incl. floor + freshness mode must be committed before the review") is now true of the
   actual schema — previously the schema had no freshness field and the claim was unbacked.
2. **Theorem 5's beacon half defers with beacon mode.** The theorem-projection gate fails the build when
   a theorem references predicates not exercised by runtime fixtures; beacon mode is deferred in v1, so
   shipping the beacon-admissibility theorem in v1 would trip our own gate. v1 Lean set = issuer-replay
   theorem only; the beacon-admissibility theorem, its fixtures, and its runtime code land **together**
   at beacon-mode activation (same rule as the precommit_proof structure, A1 #1).
3. **`freshness_request` exists in BOTH modes; the issuer challenge carries `request_commitment_digest`.**
   §2 as frozen had the issuer signature bound to `request_commitment_digest` while (a) the
   `issuer_signed_challenge` object had no such field and (b) `freshness_request` was described as
   beacon-only — an unverifiable signature. Fixed: issuer-mode
   `freshness_request = { stage_id, run_id, D_in, delay_policy_digest, issuer_key_id }` (beacon mode adds
   `beacon_source, selection_rule, requested_after`); `issuer_signed_challenge` carries
   `request_commitment_digest` as a field; the challenge signature verifiably binds it.

**P1 — ambiguities pinned (each readable two ways before; one way now):**

4. **The freshness census is an explicit verifier input** (like `pinned`); replay rejection is
   **census-relative**. Signed limitation added: an omitted or partial census detects no reuse — the
   Tier-1 pack states which census (if any) was supplied. Single-envelope offline verification makes no
   replay claim.
5. **A1 #3's "code 416/400" split pinned.** Policy-**structure** violations (authority not committed; no
   sync-bound structure where required) → **400** at policy acceptance. Evidence-**time** violations
   (tokens from different authorities under a same-authority policy; accuracy missing with no signed
   bound) → **416** with a bounded detail enum `{ accuracy_missing_no_policy,
authority_mismatch_no_sync_bound }`. The 416 reason string stays `tsa_uncertainty_unresolved`; the
   detail enum carries the distinction (5M bounded-detail pattern).
6. **Missing input provenance fails closed.** Neither `input_reference` nor
   `--expected-input-commitment` present → **396** (`delay_envelope_malformed`, detail
   `input_provenance_absent`). 398 remains the mismatch-after-derivation code.
7. **Unparseable tokens.** Subject checks (404/414) fail with bounded detail `subject_unextractable`
   when a token cannot be parsed far enough to yield an imprint (fail-closed, frozen order preserved).
   Token _cryptographic_ validity stays at 405 (start) and inside the 415 child verification (end) —
   there is deliberately no separate `end_token_invalid` code; the end token's validity is owned by the
   end endpoint's 5M child run.
8. **Browser chain hashing pinned.** Measured: prior browser verifiers hash via `crypto.subtle`
   (async per call) — unusable for a 20M-step chain. The browser tier bundles a **synchronous JS sha256**
   for chain recomputation; expected duration documented. Node native measured **≈14 s for the full 20M
   steps** (2M in 1.37 s, this machine) — Lane A2's real-green fixture is affordable in Node/Python CI;
   the browser full-green run is measured at plan time and, if over budget, executes in the recorded
   parity run while browser CI covers the production verifier on negative + hermetic fixtures (no toy
   profile in either case).
9. **Interpretability channel accepts `not_in_scope`.** Per the LOCKED federated-roadmap policy the
   committed field supports `required | optional | not_in_scope`; the v1 profile accepts
   `{ "optional", "not_in_scope" }` (`required` stays outside v1). `not_in_scope` + any interpretability
   evidence present → **418** (incoherent commitment); `optional` rules unchanged (A1 #6).

**P2 — verified, no change:** the I-A census interval `[start_upper_ms, end_lower_ms]` is the _minimal
provable busy window_ — correct for provable-concurrency overlap; `ADEQUACY_FORBIDDEN_KEYS` scan is exact
key equality (`Set.has`) — no collision with any 5N field name (checked against the shipped 5L/5M scan);
`DELAY_OVERCLAIM_FORBIDDEN_KEYS` likewise collision-free; the exit-map ripple surface is
`tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` (+ the four sibling goldens from the 4M
lesson); Lane C's `verdict` enum values are a plan-time pin (schema shape is frozen here).

## Amendment A5 — score-raising pass: booster debts paid early + new buildable weight (2026-07-14)

Web-sourced receipts; no mechanism changes, no new raw codes; the 396–419 band and check order stay sealed.

1. **Prior-art map CLOSED at spec level (Novelty booster #1 paid).** All seven named families now carry
   pinned seams: VDFs (fast-verify + trusted setup); time-lock puzzles (decryption delay, no decision
   binding, no external anchor); **PoET / proof-of-elapsed-time (requires Intel SGX trusted enclaves; the
   non-SGX simulation is crash-fault-tolerant only — 5N requires no trusted hardware)**; proof-of-history
   (ledger ordering, not decision artifacts); RFC-3161 dual-timestamp workflows (no standard composes two
   tokens into a duration claim; production TSAs ship `Accuracy: unspecified`); human-oversight evidence
   systems (instant-not-interval, producer-attested — A3); transparency logs (inclusion, not duration).
   The **signed prior-art map artifact** ships at build.
2. **eIDAS qualified-timestamp authority class (regulator axis).** `uncertainty_policy.per_authority_bounds`
   entries support an optional authority class `eidas_qualified`: under eIDAS Art. 41 a qualified
   electronic timestamp enjoys a **legal presumption of accuracy** with burden-of-proof reversal,
   recognised in all EU member states. Optional profile support in v1 (verification identical); an actual
   QTSP capture is a Lane B2-class booster, not claimed for v1. Non-claim: legal presumption attaches to
   the timestamp, not to any 5N law.
3. **EU AI Act Art. 12 wedge (stronger than Art. 14).** High-risk AI systems must automatically log
   events; Annex III 1(a) systems must record "the period of each use (start date and time and end date
   and time of each use)", retained ≥6 months. Seam: **the statute mandates start/end logs; nothing
   mandates the logs be recomputable or tamper-evident.** A 5N envelope is a recomputable start/end
   record. I-E gains a third target shape: the Art-12 log record (alongside Art-14 oversight records and
   activity-feed records).
4. **MiFID II RTS 25 precedent (grounds A1 #2/#3).** Financial regulation already mandates committed
   maximum clock divergence from UTC (100 µs–1 ms by entity class), fixed timestamp granularity, and a
   documented, consistent timestamp-application point — the exact structure of 5N's `per_authority_bounds`
   - same-authority rule. Cited as precedent that committed uncertainty bounds are an operating regulatory
     pattern, not an invention of convenience.
5. **The Standing Falsification Challenge (Constitution).** The release ships a signed, versioned public
   challenge: produce a green envelope that violates either law ("No Instant Finalisation" / "No Pre-Input
   Final Commitment"); any verified counterexample is published verbatim, becomes a named fixture, and
   blocks the next release until typed. **Non-claim:** absence of counterexamples is not proof of
   security. (Lineage: the honesty guardrail made adversarially load-bearing.)
6. **CVP live adversarial Lane C-adv (Frontier ceiling).** Under the approved Cyber Verification Program,
   Lane C gains an adversarial variant: a live frontier model, under the signed non-malice charter,
   attempts temporal fraud within the rules (justify/produce a pre-input commitment, forge envelope
   structure). Both outcomes sealed: a typed catch is a verifier demonstration; a refusal is
   `model_refused`. Raises the closeout Frontier ceiling (to 9.6), not the spec-time score.

**Scorecard re-marked (A5):** Novelty **9.2 → 9.4** (map closed with seven seams; signed artifact at
build). Frontier **9.4 HOLD** (nothing newly banked; the frozen-formula Lane B remains the toll — the hold
is the proof the scale discriminates). Anthropic/regulator **9.6 → 9.7** (three regulatory regimes —
Art. 12 record shape, eIDAS clock presumption, RTS 25 uncertainty structure — converge on the mechanism).
Constitution **9.5 → 9.6** (Standing Falsification Challenge + committed C-adv). Remaining boosters:
frozen-formula Lane B + external Lane D (Frontier); named assessor run + real activity-feed emission
(Anthropic); 5R telemetry + any published negative result (Constitution); Stephan census over ≥3 real
envelopes (Novelty → 9.5 ceiling).

## Next steps (do not reopen the cathedral)

1. **Done:** frozen spec (this document), amendments A1–A5 folded.
2. TDD implementation plan (zero-context engineer; full code per task; K7 all-functions E2E net; additive exit-map golden ripple + Node-26 e2e + all prior reproduce scripts before tag).
