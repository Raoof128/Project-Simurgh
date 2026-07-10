# Stage 5G — VFC: Verifiable Foreign Capture (closeout)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-10-stage-5g-vfc-foreign-capture-design.md` ·
> Plan: `docs/superpowers/plans/2026-07-10-stage-5g-vfc-foreign-capture.md`.
> Version **v2.42.0-stage-5g-vfc** · raw codes **283–299** · branch `stage-5g-vfc`.

## What shipped

The verifier extends the Completeness Invariant to the **provenance of production**: every foreign capture
carries a typed producer identity and verifier identity, and the verifier computes the strongest
**Separation Strength rung** the evidence supports and **rejects unsupported upgrades** (raw **296**).

- **Monotonic rung lattice** `distinct_key_only → challenge_bound → externally_anchored`, computed by the
  verifier from verified predicates; `claimed > proven` fails closed (Law 3).
- **Three signed objects, none signs itself, domain-separated** signatures + digests; **SPKI-DER**
  fingerprints (robust to PEM wrapping, cert-key compatible).
- **External verifier pin** binds all three of `{key_fingerprint, identity_subject, identity_digest}`,
  supplied from outside the pack, checked first (raw 284).
- **Precommitted challenge receipt** → substitution-resistance (raw 285/290/291), explicitly **not**
  wall-clock freshness.
- **Offline Sigstore rung-2 cross-binding** (raw 292–295): the Fulcio-certified key (any algorithm) signs
  a DSSE statement binding the producer key — ECDSA-Fulcio ≠ Ed25519-producer, so it is a cross-binding,
  not key identity; frozen integrated time, never `Date.now()`.
- **Presence-driven conditional model**: challenge/anchor checks run only when their evidence is present,
  so a truthful rung-0 record is reachable and rejected only by **policy** (298), never mislabelled as
  malformed. Env/kernel-unavailable is **299** (own family), never misreported as tampering.
- **Lanes:** A (byte-stable synthetic evidence, verifies raw 0 public+audit), B (blind-recompute sidecar
  ceremony), **C (real foreign capture — EXECUTED by an independent party, verify raw 0 both tiers, see
  below)**. **JS↔Python parity**, a **portable browser verifier** (raw:null, CSP no-egress), **10 Lean
  theorems + 1 lemma** (zero `sorry`).
- **Beast inventions:** A Anchored-Subject Diversity Index (surfaces producer monoculture), B Anchoring
  Trilemma (**signed design observation, not a theorem**), C Homework Corpus (289 / 296 / retained_auditor),
  D Reflexive Mirror Capture (staged for Lane C).

**Tests:** 105 stage5g (unit + e2e K7) + the ledger ripple (283–299 additive, both `exit-map.json`
regenerated under Node 26, exitWrapper map updated). Reproduce script: **ALL PASS** under Node 26; the
prior 5F reproduce still passes (sealed history undisturbed).

## Real independent-party foreign capture (executed 2026-07-10)

**An unaffiliated team** (the same group that reproduced 5F) ran `foreign-capture-pack/` on **their own
machines with their own Ed25519 keys** — a local host **and** the droplet `170.64.167.95` — over the
Simurgh-issued challenge. Both runs completed and **agree** (identical `detector_snapshot_digest`,
`corpus_digest`, `challenge_record_digest`, and per-case labels: `c1 benign`, `c2 malicious` — PG2 flags
the injection). We ingested their returned `capture-package.json` (`lanec/build-real-evidence.mjs`) into a
rung-1 attestation that **verifies raw 0 public + audit**, with the **producer key
(`sha256:0d14cafc…`) cryptographically distinct from the Simurgh verifier key (`sha256:7105485f…`)**.
Evidence: `docs/research/llm-shield/evidence/stage-5g/real-capture/` (verify-only in reproduce — **not
rebuildable by us**, since we do not hold the foreign key; that non-possession is the point). This is the
first evidence Simurgh **did not generate** — genuine independent-party **evidence generation**, the → 10
lever, at **rung-1**. Honest operational note: the droplet has ~960 MB RAM/no swap and OOM-killed the first
attempt; the team added a temporary 2 GB swap, reran, and removed it (left the droplet as found). Rung-2
(real keyless Sigstore) remains pending.

## Positioning (the honest statement of record)

VFC is **not category-creating.** OVERT already defines a broad, tiered architecture for increasingly
verifiable AI-runtime governance evidence, including independent third-party cryptographic attestation at
AAL-4, with a pinned Protocol Profile. VFC addresses a narrower object: the **provenance of evaluation
captures**. It ships an executable, byte-reproducible, formally-modelled verifier that computes the
strongest producer/verifier separation rung a capture supports and rejects unsupported upgrades. VFC is
complementary to OVERT, Attestable Audits, and CAP-SRP, and does **not** claim conformance or direct
equivalence to their assurance levels or receipt models (`overt_vfc_crosswalk_deferred`,
`cap_srp_receipt_bridge_deferred`).

## Signed limitations (admit irregularity over overclaim)

1. **The real foreign capture IS executed** by an independent party (see the section above), verify raw 0
   both tiers, producer key distinct from the verifier — so the **"foreign" claim is substantiated at
   rung-1**. Two remaining honesty bounds: the CI-byte-stable Lane-A evidence is still a **synthetic**
   demonstration (the real capture is verify-only, not rebuildable by us); and the **verifier** identity is
   a committed fixture key (the _producer_ is genuinely external, which is what rung-1 separation requires).
2. **Rung-2 real keyless Sigstore is not executed** — v1 proves the rung-2 verifier on offline fixtures
   (`real_sigstore_anchor_execution_deferred`).
3. **Rung-2 proves the key is bound to an external subject, not human/organisational non-collusion**
   (`producer_affiliation_deferred` → VPC).
4. **Challenge-binding ≠ wall-clock freshness ≠ rerun-absence** (`undisclosed_rerun_detection_deferred`);
   process/key separation ≠ institution-independent.
5. **The Anchoring Trilemma is a design observation, not a theorem** — pre-issued credentials falsify the
   naive statement.

## Socket ledger

**Narrows** the standing non-claim `not_proof_of_operator_independence_beyond_process_and_key_separation`
(4R) into a typed rung. **Mints:** `real_sigstore_anchor_execution_deferred`, `foreign_panel_capture_deferred`,
`dns_anchor_backend_deferred`, `undisclosed_rerun_detection_deferred`,
`reflexive_foreign_capture_execution_deferred`, `producer_affiliation_deferred` (→ VPC),
`overt_vfc_crosswalk_deferred`, `cap_srp_receipt_bridge_deferred`. **Carries:**
`live_endpoint_attestation_deferred`.

## Four-axis scorecard — re-scored at closeout

| Axis               | Spec-time | Closeout | Why the closeout value                                                                                                                                                                                                      |
| ------------------ | --------: | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            |       8.7 |  **8.7** | executable + Lean + parity + browser instantiation shipped; OVERT remains the acknowledged neighbour (not category creation)                                                                                                |
| Frontier           |       8.3 |  **9.3** | **real independent-party foreign capture EXECUTED** (unaffiliated team, own keys, local + droplet, two runs agree, verify raw 0) — the named → 10 lever landed at rung-1; short of 9.5 only on real keyless-Sigstore rung-2 |
| Good-for-Anthropic |       8.8 |  **8.8** | self-serve verifier + ready foreign-capture pack; no external pilot has run it; OVERT/CAP-SRP crosswalk pending                                                                                                             |
| Constitution       |       9.3 |  **9.3** | mechanises producer≠verifier with typed honesty; strict defaults + signed non-claims shipped; the honest-title rule is enforced                                                                                             |

_"Good-for-Anthropic" measures potential usefulness to assurance teams; it does not imply Anthropic
review, adoption, or endorsement._

## Post-release confirmations (2026-07-10)

- reproduce-on-main (Node 26): **ALL PASS** (incl. the real-capture verify-only step + byte-stability).
- tag commit == reproduced HEAD: **MATCH** — `v2.42.0-stage-5g-vfc` @ `fc8754a1ee13f0447bb13c6f8b78f03d6793982b`.
- GitHub Release published + marked **Latest**: **CONFIRMED** (verified via `gh release list`).

## Next

The real rung-1 foreign capture is **done** (above). Remaining lever: **real keyless-Sigstore rung-2**
(`real_sigstore_anchor_execution_deferred`). Then **VPC** (panel/anchor contest — pays
`producer_affiliation_deferred`) and **VUC** (external universe commitment), completing the External
Accountability arc; then the penciled VML/VDE.
