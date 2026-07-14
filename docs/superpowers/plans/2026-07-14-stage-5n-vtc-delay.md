# Stage 5N — VTC-Delay: implementation plan (TDD, self-contained) — v2 (gauntlet-hardened)

## Header

- **Goal.** A `stage5n/` verifier for verifiable non-instant _finalisation_: a fresh-input-bound dependent hash chain binds `D_in → D_out`; both endpoints are anchored by the reused (frozen) Stage-5M quorum-**extension** functions wrapped in a new 5N endpoint verifier; the two RFC-3161 genTimes give a conservative elapsed lower bound. Pays I4. Codes **396–419**.
- **Honesty spine (never weaken).** Proves delayed finalisation + input-descendant commitment. NEVER cognition, attention, physical elapsed execution, or clock correctness. Receipt, not passport.
- **Architecture.** Pure core over injected facts (B11); node adapter does real crypto. Reuses the frozen **5M quorum-extension** functions (`makeVtcQuorumFacts`, `checkRekorSeat`, `checkCrossSeat`, `checkDistinctEcologies`, `checkState`) — labelled honestly as `child_component: "stage5m_quorum_extension"`, NOT a full 5M verdict (P0-4). Adds a real offline **OTS/Bitcoin verifier** (P0-11) and real **TSA cert-at-genTime** validation the extension does not do.
- **Tech stack.** Node ESM (repo Node unit; Node 26 `/opt/homebrew/opt/node@26/bin` for reproduce/K7). Node-native `crypto`. Shared **`canonicalJson`/`sha256Bytes` from `tools/simurgh-attestation/canonicalise.mjs`** (verified exports; do NOT add a new export). Python parity via stdlib `hashlib` + `openssl` CLI (no pip). Lean 4.15, no mathlib. OTS via `py-opentimestamps 0.4.5` **`DetachedTimestampFile(OpSHA256(), Timestamp(D))`** (full detached construction, not a bare `Timestamp` — P0-11). TSA via `openssl ts` subprocess with `-attime`.
- **Execution.** Strict TDD. Read `references/gotcha-ledger.md` before Task 1. Read the frozen spec (`docs/superpowers/specs/2026-07-14-stage-5n-vtc-delay-design.md`, §1–§4 + A1–A5) before Task 0.
- **Motto.** Doc wording: _ClaimSafe First, then ReviewerSafe._ Code: SPDX + `// Stage 5N — …` only.

## DEPENDENCY SPINE (gauntlet P0-1 — capture NEVER precedes the tested kernel)

```
0  codes + trusted verifier_config schema + keys
1  encoding (shared canonicalJson) + strict digest contract + canonical known-answer vectors
2  strict hostile-safe envelope + input derivation + signature core (396/397/398)
3  policy + EXTERNAL hard resource limits (399/400)
4  fully-signed freshness challenge (401)
5  start-authorisation + chain + decision + D_out (402/403/407–413) + FROZEN known-answer vectors
── kernel tested; ONLY NOW spend Bitcoin ──
6  (1A) real start/end ceremony over the tested frozen bytes
7  TSA(+attime) + real OTS/Bitcoin + Rekor endpoint verifier (404/405/406/414/415)
8  elapsed + interp + dispatch + 419 (416/417/418/419)
9  portable Tier-1 pack + attestations (verifier_config bound)
10 census + projections (I-A/I-D/I-E)
11 Python independent-audit parity + browser core-only
12 Lean + theorem projection
13 A2 fixtures + deterministic Lane C + live Lane C/C-adv (mutation DSL)
14 (1B) OTS Bitcoin confirmation close
15 Lane D + signed prior-art map + falsification charter
16 reproduce + K7 + full exit-map ripple
17 docs + evidence-derived re-score + release
```

## Normative digest contract (P0-8 — the Rekor bug's root cause; frozen)

```
DigestHex   := exactly 64 lowercase hex chars                (all envelope digest fields)
DigestId    := "sha256:" + DigestHex                         (ONLY where a 5M child bundle requires it)
DigestBytes := strict hex-decode(DigestHex) → exactly 32 bytes
```

Rules (uppercase / `0x` / colon / wrong length → **396**): TSA `-digest` = bare `DigestHex`; OTS `Timestamp` = `DigestBytes`; chain state = raw 32-byte buffers; **each step consumes raw `x[i-1]` bytes, not its hex**; checkpoints serialise as `DigestHex`; **Rekor canonical anchor bytes = `utf8(role_subject_hex)`**, `expected_rekor_artifact_hash = sha256(that)`. Envelope digest fields are all bare `DigestHex` (the `sha256:` prefix appears only inside the constructed 5M child bundle).

## Endpoint subject mapping (P0-3 — verified against the banked capture; role-specific, NOT universal equality)

```
expected_tsa_imprint          = role_subject_hex            # 404/414 level 1
expected_ots_leaf             = role_subject_hex            # 404/414 level 2
canonical_anchor_bytes        = utf8(role_subject_hex)
expected_rekor_artifact_hash  = sha256(canonical_anchor_bytes)   # 404/414 level 3  (NOT === role_subject)
role_subject(start) = start_authorisation_digest           # P0-2
role_subject(end)   = D_out
```

## Global constraints (verified against `main` THIS session — do not re-derive)

- **Shared canonicaliser (P0-9):** import `canonicalJson`, `sha256Bytes`, `sha256Hex`, `fingerprintPublicKey` from `canonicalise.mjs` (exports verified). `encoding.mjs` adds ONLY `H_DS`, `hdsObject`, `uint64be`, digest-contract validators — never a second canonicaliser (parity), never a new export on `canonicalise.mjs` (3M coverage gate).
- **5M reuse is EXTENSION-ONLY (P0-4/P0-11):** `makeVtcQuorumFacts` (`facts.mjs:12`) counts the `bitcoin` ecology present because the OTS **anchor object exists**, does **no** TSA crypto and **does not parse the `.ots`** (verified: no OTS/BitcoinBlockHeader parser anywhere in 5L/5M node code). The 5N endpoint child therefore ADDS, per endpoint: (a) real TSA validation with `-attime` (Task 7); (b) a real offline **OTS→Bitcoin** verifier (Task 7); (c) the four extension checks. Naming: `child_component:"stage5m_quorum_extension"`.
- **Hostile-input + external limits (P0-9/P0-10):** raw-byte cap, JSON depth/keys/array/string caps come from **`verifier_config.hard_resource_limits`** and apply BEFORE and DURING parse; the committed policy may only tighten. Preflight: strict UTF-8 parse → canonical re-emit → **raw bytes must equal canonical re-emission** → reject duplicate keys, `__proto__`/`prototype`/`constructor` (recursively, before the canonicaliser builds `{}`), non-safe integers, exact-key schemas at EVERY object level.
- **Mandatory external trust (P0-6):** `verifier_config { expected_final_signer_fpr, expected_producer_fpr, expected_issuer_fpr, expected_tsa_verifier_fpr, expected_rekor_submitter_fpr, trusted_tsa_roots, trusted_rekor_log_keys, authority_registry, hard_resource_limits }` — **all required role pins present for normative raw 0**; `verifier_config_digest`, `census_scope_digest`, `expected_input_source_digest` are bound into the public attestation.
- **Chain cost measured:** Node 2M steps = 1.37 s → 20M ≈ **14 s**; e2e-tier only. Browser: **synchronous JS sha256 in a Web Worker** (`crypto.subtle` async-per-call unusable; main-thread sync loop freezes the page — P0-8/Task8).
- **Integer ms, safe-integer `Number`, never `BigInt`.** `uint64be(i)` 8-byte BE, `Number.isSafeInteger` guard.
- **Exit-map ripple (verified full consumer list):** `stage4h/{exitWrapper,closeout,reproduce}.test.js`, `stage4hFullSmoke.test.js`, `exitCodeProbeHygiene.test.js`, BOTH `exit-map.json` (regenerate via `build-stage4h-digest-fixtures.mjs`), `stage4m/vxdFullNet`, `stage4s/4t k7`, every `stageXX/exitCodes*.test.js`. **Repo-search every consumer of `RUN_LEVEL_BY_RAW` + both exit maps before editing the ledger.** `UNKNOWN_RAW_PROBE` (999).
- Frozen profile: `T=20_000_000`, cadence `2_000_000`, `STAGE_5N_FLOOR_MS=60_000`, `MIN_AUTHORITY_UNCERTAINTY_MS=1000`, `accepted_freshness_modes=["issuer_signed"]` (beacon deferred: schema frozen, code+fixtures+Lean land together at activation), interp channel ∈ `{"optional","not_in_scope"}`.
- Keys `INSECURE_FIXTURE_ONLY_[A-Za-z-]+.pem`; allowlist in BOTH `security-audit-…stage3{m,o}.sh`. Evidence prettier-ignored + byte-stable via **manifest+git-diff**, never `cmp` on directories (Task 16). Neutral messages, no trailers. `npm test`=unit only.

## Elapsed contract (frozen; identical in core/attestation/Lean)

```
start_upper_ms = start_time_ms + start_uncertainty_ms ; end_lower_ms = end_time_ms - end_uncertainty_ms
elapsed_lower_bound_ms = end_lower_ms - start_upper_ms                    # Int; may be negative
400: policy-STRUCTURE (authority not in registry; bound < MIN; limits absent)
416: evidence-TIME, detail ∈ { accuracy_missing_no_policy, authority_mismatch_no_sync_bound }
417: elapsed_lower_bound_ms < precommitted_minimum_elapsed_ms
authority id comes from the VALIDATED cert chain + policy OID (authority_registry), NOT an envelope string (P0/TSA)
```

## Frozen first-failure order (396→419; 419 outer wrapper)

```
396 delay_envelope_malformed        (hostile-safe schema; ADEQUACY∪DELAY_OVERCLAIM scan; input_provenance_absent; digest-contract violations)
397 final_envelope_signature_invalid (signer fpr committed AND == verifier_config.expected_final_signer_fpr; field REMOVED not nulled; signs raw 32-byte final_envelope_digest)
398 input_commitment_mismatch       (D_in = H_DS("…input.v1", canonical(input_reference)) ≠ envelope D_in)
399 delay_policy_digest_mismatch → 400 delay_policy_not_accepted (profile ==; external hard-limit conformance)
401 freshness_challenge_invalid_or_reused (FULL challenge signed; census explicit; detail {freshness_mode, failure})
402 start_request_binding_invalid → 403 start_request_signature_invalid (signs raw 32-byte start_request_digest)
404 start_endpoint_subject_mismatch  (role-specific mapping; subject = start_authorisation_digest; parse-fail → subject_unextractable)
405 start_token_invalid              (openssl ts -verify -attime <genTime>; nonce match; TS EKU; LTV)
406 start_endpoint_anchor_incomplete (extension + real OTS/Bitcoin; detail {child_raw_code, ots_unconfirmed, tsa_invalid})
407 iteration_count_mismatch → 408 implementation_commitment_mismatch
409 seed_derivation_mismatch → 410 checkpoint_ladder_mismatch → 411 delay_recomputation_failure (full 20M)
412 decision_binding_mismatch → 413 output_commitment_mismatch
414 end_endpoint_subject_mismatch → 415 end_endpoint_anchor_incomplete (extension + real OTS/Bitcoin; end-token crypto lives HERE; detail enums incl ots_unconfirmed, tsa_invalid)
416 tsa_uncertainty_unresolved → 417 insufficient_timestamp_separation
418 interpretability_evidence_invalid_or_unbound
419 internal_or_env_unavailable      (outer; injected-throw route only)
```

**Interim (pending Bitcoin) matrix (first-failure defect):** `start pending → 406`; `start confirmed, end pending → 415`; `both confirmed → continue`. `406` and `415` BOTH carry `{ots_unconfirmed, tsa_invalid}` details.

## File map

```
tools/simurgh-attestation/stage4h/exitCodes.mjs                      # +VTCDELAY_RAW_CODES 396-419 (additive)
tools/simurgh-attestation/stage5n/
  constants.mjs
  core/{result,encoding,preflight,schema,input,policy,freshness,startAuth,chain,decision,elapsed,interp,dispatch}.mjs
  node/{tsaTime,otsVerify,endpointQuorum,facts,verify,attestation,intoto,portablePack,census,projections,capture}.mjs
  python/vtc_delay_parity.py            browser/{sha256-sync.mjs,worker.mjs,vtc-delay-portable.mjs}
proofs/stage5n/{VtcDelay.lean,lean-toolchain,lakefile.toml}
tools/simurgh-attestation/stage5n/{theoremProjection.mjs,theorem-projection.json}
tests/unit/llmShield/stage5n/*.test.js + _valid.mjs      tests/e2e/llmShield/stage5n/{k7AllFunctions,realGreen}.test.js
tests/fixtures/llmShield/stage5n/test-keys/INSECURE_FIXTURE_ONLY_<suffix>.pem
docs/research/llm-shield/evidence/stage-5n/{lane-a,real-laneb,real-lanec,real-laned}/ (+EVIDENCE_MANIFEST.json,PRIOR_ART_MAP.md,FALSIFICATION_CHARTER.md)
docs/research/llm-shield/STAGE_5N_CLOSEOUT.md    scripts/reproduce-llm-shield-stage5n.sh
# MODIFY: .prettierignore; check.sh + check-e2e.sh; both security-audit scripts; Lean workflow; README; AGENT.md; CHANGELOG.md
```

---

## Task 0 — exit codes + `verifier_config` schema + constants + keys

**Interfaces.** `VTCDELAY_RAW_CODES`(0,396–419); `VTCDELAY_CHECK_ORDER=[396..418]`; `VTCDELAY_WRAPPER=419`; `RUN_LEVEL_BY_RAW` 396–419→1.

1. `exitCodes.test.js`: uniqueness, disjoint from ≤395, order, RUN_LEVEL. Then the **full ripple** — repo-search every consumer of `RUN_LEVEL_BY_RAW`/`MAX_RAW`/both exit maps (verified list above), update each, regenerate both `exit-map.json`. Run the affected suites + `exitCodeProbeHygiene`.
2. `constants.mjs`: schema/profile/T/cadence/floor/`MIN_AUTHORITY_UNCERTAINTY_MS`/accepted modes/channels; `DECISION_VERDICTS=["delay_policy_satisfied","delay_policy_violated","model_output_unusable"]` (scoped, NOT "boundary_held" — collides with containment meaning); `DELAY_OVERCLAIM_FORBIDDEN_KEYS`(6); re-export 5L `ADEQUACY_FORBIDDEN_KEYS`; `DS` domain map (incl. `input`, `start_authorisation`, `issuer_challenge`); `NON_CLAIMS`; bounded detail enums for 401/404/414/406/415/416; `VERIFIER_CONFIG_REQUIRED_KEYS`. Freeze-tests each.
3. Keys: Lane-A `INSECURE_FIXTURE_ONLY_{issuer,producer,tsaverifier,submitter,finalsigner,interp}.pem` + loader; allowlist in BOTH audit scripts. Real keys scratchpad-only. Commit.

## Task 1 — encoding + digest contract + canonical vectors

`encoding.mjs`: reuse shared `canonicalJson`; add `H_DS(tag, bytes)=sha256(utf8(tag)||0x00||bytes)`, `hdsObject(tag,obj)=H_DS(tag, utf8(canonicalJson(obj)))`, `hdsStep(i,x)=sha256(utf8(DS.step)||0x00||uint64be(i)||x)`, `uint64be`, and digest-contract validators (`isDigestHex`, `hexToBytes32`, `digestId`). Tests: canonical parity vs prior stages; domain separation; step vectors; digest-contract accept/reject (uppercase/0x/colon/len→reject); BigInt→throw; **frozen known-answer vectors** file (seed, x_0, x_10, a 2M checkpoint) committed for cross-runtime parity.

## Task 2 — hostile-safe envelope + input + signatures (396/397/398)

`preflight.mjs runPreflight(rawBytes, verifier_config)`: byte cap → strict parse → canonical re-emit equality → duplicate-key/`__proto__`/`prototype`/`constructor` rejection → depth/key/array/string caps → safe-int → exact-key nested schemas. Any violation → `R(396, …, {detail})`.
`schema.mjs`: whole-envelope recursive `ADEQUACY ∪ DELAY_OVERCLAIM` scan → 396; neither `input_reference` nor `verifier_config.expected_input_source` → 396 `input_provenance_absent`.
`input.mjs`: `input_reference={reference_schema, artifact_digest, canonicalisation_profile, artifact_type}`; `D_in = H_DS(DS.input, canonicalJson(input_reference))`; ≠ envelope D_in → 398 (P0-7 formula frozen; profile is bound in the digest).
`checkFinalSignature`: canonicalise envelope with `final_envelope_signature` **removed**; `final_envelope_digest=hdsObject(DS.envelope, env')`; Ed25519 over the raw 32-byte digest vs the fpr committed in policy AND `=== verifier_config.expected_final_signer_fpr` (mandatory) → else 397. Tests: nested `{human_reviewed:true}`→396; `__proto__`→396; uncommitted signer→397; wrong `expected_final_signer_fpr`→397.

## Task 3 — policy 399/400 + external hard limits

`policy.mjs`: 399 iff `hdsObject(DS.policy, delay_policy)!==delay_policy_digest`. 400 iff any: wrong profile field; `min_elapsed_ms<FLOOR`; `accepted_freshness_modes!==["issuer_signed"]`; interp channel ∉ set; **committed limits looser than `verifier_config.hard_resource_limits`** (P0-10 — envelope may only tighten); authority used but absent from `verifier_config.authority_registry`, or its bound `< MIN` when accuracy unspecified. `per_authority_bounds` entries may carry `declared_authority_class:"eidas_qualified"` — **declared\_**, surfaced with a signed non-claim, never asserted factual (P0/Task4). Tests: `T=1`→400, `floor=0`→400, beacon mode→400, envelope limit > config limit→400, eidas class declared+non-claim present.

## Task 4 — freshness 401 (fully-signed issuer challenge; census-relative)

`freshness.mjs`: `issuer_challenge_content={challenge_schema,mode,request_commitment_digest,run_id,nonce,issued_at_ms,expires_at_ms,issuer_key_id}`; `issuer_challenge_digest=hdsObject(DS.issuer_challenge, content)`; signature over the **raw 32-byte digest** vs `verifier_config.expected_issuer_fpr` (every decision field inside the signed content — P0-5) → else 401 `signature_invalid`; `request_commitment_digest` rebuilt from `freshness_request` and matched; `issued_at_ms ≤ start_genTime_ms ≤ expires_at_ms` → else `expired`; `start_request.nonce===nonce`; census key `H_DS(DS.census, canonicalJson({mode,issuer_key_id,run_id,nonce}))`. **Census semantics (P0/Task5):** `census.prior_seen_keys` EXCLUDES the current envelope; reuse iff key ∈ prior; `{prior_seen_keys:[]}` → verdict carries `replay_scope:"not_evaluated"` (no global claim). Order note: expiry uses the token's _claimed_ genTime; 405 later validates it cryptographically (green needs both). Tests: extended-expiry attack→401; self-appearance not replay; forged-genTime dodges 401 but dies at 405.

## Task 5 — start-authorisation + chain + decision + D_out (402/403/407–413) + frozen vectors

`startAuth.mjs` (P0-2): `start_request_digest=hdsObject(DS.start_request, start_request)`; `start_authorisation={start_request_digest, producer_key_fingerprint, start_request_signature}` where the signature (raw 32-byte digest, vs `verifier_config.expected_producer_fpr`) is **inside** the timestamped subject; `start_authorisation_digest=hdsObject(DS.start_authorisation, start_authorisation)` = the start role subject. 402 iff start_request omits/alters a committed field; 403 iff signature invalid.
`chain.mjs`: `deriveSeed(run_id,D_in,start_token_digest,delay_policy_digest)`; `runChain(seed,T,cadence)` raw-buffer loop → `{x0,checkpoints,xT}`; 407/408 execution_declaration vs policy; 409 seed; 410 ladder; 411 terminal (full 20M in e2e).
`decision.mjs`: 412 iff `hdsObject(DS.decision, decision_body)!==decision_digest` (recomputed); 413 iff `D_out!==hdsObject(DS.output,{run_id,D_in,decision_digest,delay_policy_digest,start_token_digest,iteration_count,terminal_value})`. Tests use small-T hermetic params (`_valid.mjs`); verdict-swap→412; stale x_T (396..410 pass)→411. **Freeze the frozen-formula known-answer vectors here — capture (Task 6) MUST NOT begin until these pass.**

## Task 6 (1A) — real ceremony over the TESTED frozen bytes (LONG POLE)

Only after Task 5 vectors pass. Freeze the exact `delay_policy` + `verifier_config` + issuer challenge + `start_authorisation`; then: DigiCert TSA over `start_authorisation_digest` (bare hex); `start_token_digest` over exact DER; **full detached OTS** `DetachedTimestampFile(OpSHA256(), Timestamp(DigestBytes))` (P0-11) submitted to calendars; Rekor over `sha256(utf8(start_authorisation_digest))`. Run the tested chain (~14 s). Build `decision_body` (`delay_policy_satisfied`) → `D_out`; end TSA/OTS/Rekor over `D_out`. **90-second hold from start-token RECEIPT via a local monotonic scheduler** (P0-3: 61 s − 2000 ms uncertainty = 59 000 < floor → 417; 90 s clears with margin; TSA genTimes remain the only evidentiary clocks). Preserve `start.pending.ots`/`end.pending.ots` (never upgrade in place; upgrade a copy at 1B). If the first end token yields 417, keep it as a failed attempt and request another over the unchanged `D_out`. Freeze `EVIDENCE_MANIFEST.json` + continuity manifest (every digest/len/sha256, tool+openssl versions). Boundaries: Tasks 7–13 on Lane-A synthetic; no release/I4-paid claim while pending.

## Task 7 — endpoint verifier: TSA(+attime) + real OTS/Bitcoin + Rekor (404/405/406/414/415)

`node/tsaTime.mjs`: `openssl ts -verify -queryfile <tsq> -in <tsr> -CAfile root -untrusted chain **-attime <genTime_epoch>**` (P0/TSA — historical validity at the token's own genTime); nonce match; TS-EKU; parse genTime (seconds→ms); unparseable→`subject_unextractable`. `authority_id` derived from the validated cert chain + policy OID via `verifier_config.authority_registry` (never an envelope string).
`node/otsVerify.mjs` (P0-11, real offline): parse the detached `.ots` → starting leaf == `DigestBytes` → op path → `BitcoinBlockHeaderAttestation` → block merkle root → verify tx/merkle inclusion → block header PoW → header hash == a height/hash pinned in `verifier_config` (the residual canonical-chain pin, stated explicitly). Confirmation/finality per committed policy. Typed failures, never throw.
`node/endpointQuorum.mjs runEndpointChild(role, ev, pinnedEp, verifier_config)`: (a) tsaTime; (b) otsVerify; (c) the four extension checks over the banked epBundle shape — **wrap `makeVtcQuorumFacts` in try/catch → typed child failure, never outer 419** (P0/Task7). 404/414 via the role-specific mapping (digest contract). 405 = start-token crypto; end-token crypto surfaces as 415. 406/415 detail `{endpoint_role, child_component:"stage5m_quorum_extension", child_raw_code, ots_unconfirmed?, tsa_invalid?}`. Truth data = the banked gate capture (both endpoints green). Interim matrix enforced.

## Task 8 — elapsed 416/417 + interp 418 + dispatch + 419

`elapsed.mjs`: per-endpoint uncertainty from `authority_registry` (validated accuracy or committed bound; neither→416 `accuracy_missing_no_policy`); differing authorities w/o committed sync bound→416 `authority_mismatch_no_sync_bound`; Int arithmetic→417. `interp.mjs`: 418 per frozen table (present must bind `{run_id,D_out}`; `not_in_scope`+present→418). `dispatch.mjs verifyCore`: 396→418 spine. `node/verify.mjs verifyVtcDelay(rawBytes, verifier_config, {census, _factsAdapter})`: preflight → parse → core; outer try→419; `_factsAdapter` injection = the only 419 route.

## Task 9 — attestation + Tier-1 portable pack + in-toto

`attestation.mjs`: `SIG5N.public`/`SIG5N.audit` (distinct from all 5L/5M `SIG.*`); public payload binds structure+verdict+four digests+`elapsed_lower_bound_ms`+`verifier_config_digest`+`census_scope_digest`+`expected_input_source_digest`+`NON_CLAIMS`; audit adds injected facts + `public_attestation_digest` + **signed `known_limitations`** (3U lineage). `portablePack.mjs`: emits the §3 Tier-1 list + **hash-bound `PACK_MANIFEST.json` signed by SIG5N.public** (P0/Task9 — a mere file list is replaceable). Test: verify from the pack alone in a temp dir (no repo evidence) → raw 0; delete any listed file → fail (law-bearing). `intoto.mjs`: subject `{name:"vtc-delay-envelope.json", digest:{sha256:<sha256 of exact envelope bytes>}}` (P0/Task9 — NOT `D_out`, which is a domain-separated commitment); predicate carries `{D_out, delay_policy_digest, elapsed_lower_bound_ms, portable_pack_manifest_digest}` + non-claim. predicateType `https://simurgh.dev/attestation/vtc-delay-interval/v0`.

## Task 10 — census + projections (I-A/I-D/I-E; zero new codes)

`census.mjs`: `buildCensus` freshness keys + `double_finalisation` on **`(run_id, D_in, delay_policy_digest, decision_slot_id)`** (P0/Task10 — the coarse `(D_in,policy)` key flagged legitimate re-reviews); `stephanCensus` sweep-line max overlap of `[start_upper_ms,end_lower_ms]` per committed signer fpr → `{max_provable_concurrency, windows, absences}` (absences only within a declared census). `projections.mjs`: emit-only, THREE target shapes with fields `commitment_start_time`/`commitment_finalisation_time` (NOT `use_start`/`use_end` — not bound to real system use, P0/Task10), each carrying the necessary-not-sufficient non-claim. Tests: 3-envelope portfolio concurrency; touching-not-overlapping edge; double_finalisation on differing decision_slot only; non-claims present.

## Task 11 — Python INDEPENDENT-audit parity + browser core-only

`python/vtc_delay_parity.py` (stdlib + openssl CLI, no pip): (a) core parity over shared vectors; (b) Lane-D over the raw `real-laneb/` pack **independently verifying every anchor leg in Python** — RFC-3161 (openssl `ts -verify -attime`), OTS/Bitcoin (Python detached-proof + header parse), Rekor RFC6962 inclusion + checkpoint + SET + submitter (hashlib + openssl) — NOT consuming Node facts (P0/Task11: this is independent audit, not result-mirroring). Exact commands + exit 0 in the header.
`browser/`: `sha256-sync.mjs` (FIPS 180-4, NIST KAT + 10k cross-check + 2M chain equality vs Node); `worker.mjs` runs the 20M chain off the main thread; `vtc-delay-portable.mjs` = core only and **NEVER emits raw 0** — returns `{status:"portable_core_verified", normative_verdict_available:false, requires_anchor_verifier:"node_or_python"}` (P0/Task8). Signed non-claim: no RFC-3161/OTS/Rekor crypto in browser.

## Task 12 — Lean + theorem projection (build-failing)

`VtcDelay.lean` (4.15, no mathlib, zero sorry): hash = uninterpreted deterministic fn; time = `Int`. Theorems (v1 — beacon EXCLUDED): 1 `descendantConformance` + prefix `wrongTerminal411`/`wrongOutput413`; 2 `elapsedSoundness`(conditional)+`uncertaintyMonotone`; 3 `coreTotality`(396..418)+`wrapperClosure419`; 4 `noGreenWithoutChildAnchors`; 5 `issuerReplay401`; 6 **`startTokenDependencyConformance`** (renamed from instantVerdictTrilemma — P0/Task12): green → accepted terminal is produced by the declared recurrence ∧ D_out includes the accepted `start_token_digest` ∧ deviations map to {407,409,410,411}. **NOT** physical postdating / preimage / collision / sequentiality / elapsed time (those are §4 non-claims — do NOT reintroduce "chain postdates the token"); 7 `overclaimUnassertable`. `theoremProjection.mjs` + `.json`: build FAILS on raw-code/domain/order drift, a predicate with no fixture, or Node/Python/Lean vector disagreement. Wire into `check.sh` with the Lean compile.

## Task 13 — A2 fixtures + deterministic Lane C + live Lane C/C-adv (mutation DSL)

A2 (production verifier, committed): one tamper fixture per 396–418 (recompute earlier bindings so the target fires first) + small-T toy profile→400 + imported real green (`realGreen.test.js`, full 20M, Node 26, byte-stable via manifest). Deterministic Lane C (CI-gated unit): reused freshness→401; D_out re-bound to stale start token→413; floor shaved→417. **Live Lane C/C-adv via a frozen mutation DSL** (P0/Task13 — reconciles "bounded proposal" vs "forgery"): the model selects `mutation_id ∈ {reuse_freshness, replace_start_token_digest, alter_D_out, shave_elapsed_floor, swap_endpoint_subject}` + bounded params; the trusted harness applies it to a cloned envelope and runs the REAL verifier — contained iff typed non-zero; the model never receives keys or file-write authority; `stop_reason:"refusal"`→signed abort capsule `simurgh.vtc_delay.ceremony_abort.v1`. Default `SIMURGH_PROBE_MODEL=claude-fable-5`; C-adv under CVP + non-malice charter; respect `SIMURGH_SKIP_DOTENV`. Digest-only.

## Task 14 (1B) — OTS Bitcoin confirmation close

After both confirmations, `ots upgrade` COPIES (`start.confirmed.ots`/`end.confirmed.ots`; hash all four); verify vs the real `otsVerify.mjs` (not just declared_finality); assemble the full envelope; `verifyVtcDelay` → 0 ∧ `elapsed_lower_bound_ms ≥ 60_000`; freeze `real-laneb/` (public material). No regeneration between 1A/1B.

## Task 15 — Lane D droplet pack + prior-art map + falsification charter

`~/Desktop/Raouf/test/stage5n-vtc-delay-droplet/` per the Lane-D contract (≥2 machines, Node+Python **independent** verify, no post-acquisition network, env manifest, durations reported-never-failed) via ssh1/ssh2 distinct keys → `real-laned/laned-outcome.json`. Sign `PRIOR_ART_MAP.md` (7 families with verbatim seams + primary sources: VDF/time-lock/PoH/dual-TSA/workflow-evidence/RFC-3161; search BOTH the Anthropic research page AND the Claude platform docs as complementary sources). `FALSIFICATION_CHARTER.md`: scope = the two laws; pledge = **"faithful publication of the technical finding and verifier outcome, subject only to privacy, secret-removal, abuse-safety and coordinated-disclosure redactions"** (P0/Task14 — NOT unconditional verbatim; a submission may carry credentials/PII/exploit material); non-claim: absence ≠ proof; signed with SIG5N.audit.

## Task 16 — reproduce + K7 + full ripple

`k7AllFunctions.test.js`: every export + tamper matrix + cross-stage invariants (5I–5M reproduce undisturbed) + 419 via `_factsAdapter`. `reproduce-llm-shield-stage5n.sh` (Node 26; `set -e`; one command per line): unit → parity → browser vectors → Lane-A **manifest-diff** stability (build into two clean temp dirs → sorted path+sha256 manifests → diff → `git diff --exit-code` on committed evidence; measured durations kept OUT of byte-stable evidence — P0/Task15) → real-green → pack offline verify → attestation verify → census/projection determinism → theorem projection + Lean → privacy scan → key audits → K7. Wire `check.sh` + `check-e2e.sh` + Lean workflow. Run ALL prior reproduce scripts (ripple proof).

## Task 17 — docs + evidence-derived re-score + release

`STAGE_5N_CLOSEOUT.md`: threat model; validation matrix (raw code → named test); reviewer checklist; signed prior-art map + falsification charter linked; non-claim audit; known-limitations verbatim from spec §4/A4 (census-relative replay, browser core-only, finalisation≠cognition, OTS residual canonical-chain pin, TSA clock not proven). **Re-score all four axes from shipped evidence — no floor, no mandatory increase, no precommitted closeout value** (P0/Task16 — a declared ceiling becomes a target; Frontier moves only if Lane B actually banked). README banner; AGENT.md + CHANGELOG.md (`Raouf:`). Docs-accuracy pass.

## Closeout

K7 + full reproduce green (+5I–5M undisturbed) → `check.sh`+`check-e2e.sh` → PR (honest scope) → CI green → rebase-merge → `git fetch && git reset --hard origin/main` → tag `v2.49.0-stage-5n-vtc-delay` (check `git tag --sort=-creatordate`) → reproduce ON MAIN → evidence-derived re-score → memory + Zurvan (dupes first + ADR). I4 **PAID on release acceptance**.
