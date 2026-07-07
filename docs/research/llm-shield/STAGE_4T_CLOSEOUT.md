# Stage 4T — VIC (Verifiable Incident Capsule) Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.** (Standing convention since 4M:
safe for the lab audience in content AND structural egress, then recomputable by any
reviewer — a design-order tie-break, not an endorsement claim.)

- **Date:** 2026-07-07 · **Target tag:** `v2.30.0-stage-4t-vic`
- **Law:** **No Hearsay** (+ **No Two Stories** for audience views).
- **Banner:** the VDCC north star's wedge artifact — the first serious-incident report
  a regulator can rerun, bound to the Commission's own reporting templates.
- **Spec:** `docs/superpowers/specs/2026-07-07-stage-4t-vic-incident-capsule-design.md`
- **Plan:** `docs/superpowers/plans/2026-07-07-stage-4t-vic-incident-capsule.md`

## Core claim (frozen)

> For a declared incident epoch and pinned reporting-template snapshots, the signed
> Incident Capsule binds every template section of each bound regime to either
> digest-linked recomputable evidence or an explicit `not_derivable` /
> `requires_human_input` marker, and commits a closed evidence census for that epoch.
> An unbacked field, tampered or mis-recomputing evidence artifact, omitted census
> item, smuggled census item, or template-partition gap produces an offline-verifiable
> raw-code failure. Any derived audience view commits to the same capsule root; a view
> that contradicts the capsule, or redacts a section without declaring the redaction,
> produces an offline-verifiable raw-code failure.

## What shipped

- **Dual pinned Commission templates (real transcriptions of record).** The actual
  GPAI Art-55 systemic-risk template (10 sections, published 2025-11-04) and the
  Art-73 high-risk draft template v1.0.0 / SB-10407 (12 sections), downloaded from the
  Commission DOCX/PDF and committed with digests. The capsule binds genuine field
  structure, not a guessed schema.
- **Five laws → code clusters** (`tools/simurgh-attestation/stage4t/`): field-binding
  (141/142), suppression (143/144), census (138/139/140/145), template-pinning
  (135/136/137), No Two Stories views (148/149). Frozen check order
  `133→134→135→136→137→138→139→140→145→146→141→142→143→144→147→148→149→150`.
- **Three inventions beyond the spec baseline:** the normative exhaustive partition
  with machine-checkable **suppression detection** (hiding derivable evidence fails,
  not just fabricating it); the closed Merkle-sealed epoch **census**; and **No Two
  Stories** salted-commitment audience views (regulator / insurer / public) that may
  redact but never contradict, with a redaction ledger.
- **Anchored knowability** (`evidence_anchored_at_beat`): the first recomputable input
  an Article-73 deadline argument has ever had, over the 4N heartbeat.
- **Two-tier attestation** (public structural / audit engine-rerun) sealing all 18
  Lane A fixtures; **byte-stable under Node 26**; CLI `--tier public|audit`.
- **Lane A**: deterministic 18-case corpus (honest capsule + one per code 133–149;
  the honest incident embeds a REAL Stage-4S over-scoped crossing → verdict 108).
- **Lane B**: a genuine **two-OS-process MCP stdio ceremony** (reusing the 4S
  delegatee server), projected into a dual-template capsule with three consistent
  views; ephemeral keys, verify-only capture.
- **JS↔Python parity** over the public-tier decision core (16 non-signature fixtures);
  **four machine-checked Lean theorems** (`noHearsay`, `suppressionDetectable`,
  `censusExactness`, `noTwoStories`), zero `sorry`; a **static single-file browser
  verifier** with a CLI parity gate; one-command reproduce.
- **Reserved (signed) slots** for future rungs: `counter_capsule_contest_deferred`
  (adversarial due process) and `verified_slot_narrative_deferred` (3S-lineage).
- **No Capability Kernel entry, no `src/llmShield` diff** — 4A–4U byte-frozen
  (K7 committed-state assertion green).

## Honest results

| raw | reason                           | how exercised                                                      |
| --- | -------------------------------- | ------------------------------------------------------------------ |
| 0   | green                            | honest capsule (real 108 chain); live Lane B hop (verdict 0)       |
| 133 | vic_capsule_malformed            | bad bundle schema / duplicate regime / unknown recompute kind      |
| 134 | vic_signature_invalid            | tampered inner signature / wrong public key                        |
| 135 | template_digest_mismatch         | binding snapshot digest ≠ pinned digest                            |
| 136 | template_partition_incomplete    | partition key set ≠ snapshot section set (missing OR extra)        |
| 137 | template_section_unmapped        | capsule projects a section absent from the snapshot                |
| 138 | evidence_census_missing_item     | manifest lists an item the bundle lacks                            |
| 139 | evidence_census_smuggled_item    | bundle carries an artifact the manifest omits                      |
| 140 | census_merkle_mismatch           | tampered census root                                               |
| 141 | field_unbacked                   | evidence_backed field with unresolvable evidence digest            |
| 142 | field_recompute_mismatch         | recompute ≠ projected value (incl. chain verdict)                  |
| 143 | not_derivable_unjustified        | SUPPRESSION: derivable section hidden while evidence sealed        |
| 144 | requires_human_input_unjustified | SUPPRESSION: derivable section laundered behind human-input marker |
| 145 | incident_epoch_mismatch          | census item bound to a different epoch                             |
| 146 | cross_stage_reference_invalid    | recorded chain verdict falsified over a real 108 bundle            |
| 147 | attestation_digest_mismatch      | two-stage seal tampered (valid signature, wrong digest)            |
| 148 | view_inconsistent_with_capsule   | a view discloses a value contradicting the capsule                 |
| 149 | redaction_undeclared             | undeclared omission / count mismatch / fabricated redaction        |
| 150 | internal_fail_closed             | **defensive** — typed wrapper, exercised via a poisoned getter     |

**Published finding — the honest partition.** Of the 22 pinned template sections
across both regimes, only **6 (27%)** are machine-derivable from the Simurgh spine
(3 per regime: dates, chain/response, users/remedial); **13** are
`requires_human_input`; **3** are `not_derivable`. The capsule states on its face
exactly which fields a machine may fill and which a human must — that honest partition
is itself a result of this stage, not a limitation buried in prose.

Test totals: stage4t unit **50** + e2e **15** (K7 9 + Lane B 4 + browser parity 2);
full `npm test` **1809** green; reproduce byte-stable under Node 26; both stage-3M/3O
key audits pass; Lean 4 theorems, zero `sorry`.

## Four-axis re-score (closeout)

| Axis               | Pre | Closeout | Note                                                                                                                                                                                                                                                                 |
| ------------------ | --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 9.5 | **9.5**  | Closest occupant (VeritasChain CAP-SRP) is count-based completeness over a single system's own log; VIC adds real regulator-template binding, per-field recompute, suppression detection, and contradiction-proof multi-audience views. Source map survived contact. |
| Frontier           | 9.4 | **9.4**  | Article-73 obligations live in the near-term window (AI Act applies 2 Aug 2026); the named regulator gap answered with a shipped, rerunnable artifact.                                                                                                               |
| Good-for-Anthropic | 9.4 | **9.4**  | Evidence substrate under the third-party-ecosystem bet, in the exact shape regulators/insurers consume; No Two Stories defends "one public story = one filing."                                                                                                      |
| Constitution       | 9.3 | **9.3**  | Oversight/accountability projected into a rerunnable regulator surface; 4S consent IOU retired as a field group; `requires_human_input` is human oversight by construction.                                                                                          |

**Reviewer-hardness (commentary):** high — every raw code is a distinct, reachable,
tested failure species; suppression (143/144) and view-contradiction (148/149) are
the unoccupied halves the field's recorders and GRC tools do not check.

## Consent IOU (4S) — retired

The 4S closeout deferred "consent-broadening end-to-end" to 4T. It is retired here as
the **VIC consent field group**: consent-relevant sections bind to 4O consent
manifests in the sealed census; a consent-scope mismatch surfaces as 142 (cited
artifact recomputes to a different value) or 146 (cited artifact fails its own
verifier). Not a second enforcement blade — one projected field group.

## Reviewer instructions (one command)

```
bash scripts/reproduce-llm-shield-stage4t.sh
```

Verify-only for Lane B (ephemeral keys → the committed capture is re-verified, never
regenerated). Lane A corpus + attestation are deterministic and byte-compared. No
network, no wall clock. Requires Node ≥ 26 for byte-stability; the Lean proof builds
only if `lean` is on PATH (otherwise the dedicated `lean-check` CI job covers it).

## Gotchas recorded

- Additive codes 133–150 rippled into the 4H `exit-map.json` (both copies) and the
  `stage4h/exitWrapper.test.js` inline `RUN_LEVEL_BY_RAW` literal — regenerated.
- Any mutation to signed capsule content breaks the inner Ed25519 signature (134),
  which is checked before every other code — fixtures targeting 135–149 must be
  **re-signed** (`resignBundle`); only the 134 fixture leaves a broken signature.
- The `.pub.pem` fixture files are public keys (BEGIN PUBLIC KEY) and are not flagged
  by the 3M/3O private-key audits; only the `.pem` private keys needed allowlisting.
- Python parity is public-tier: it excludes 134 (Ed25519) and 146 (engine rerun),
  which the stdlib mirror does not implement — documented in the parity contract.
- `node --test <bare-dir>` reports the directory as one failing unit; use explicit
  `*.test.js` globs (standing 4K gotcha).
- Next: the reserved slots (counter-capsule contest; verified-slot narrative).
