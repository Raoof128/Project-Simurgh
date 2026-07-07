# Stage 4T — VIC: Verifiable Incident Capsule

**MOTTO: AnthropicSafe First, then ReviewerSafe.** (Standing project
convention since Stage 4M: "safe for the lab audience in content AND structural
egress, then recomputable by any reviewer" — a design-order tie-break, not an
endorsement claim.)

- **Date:** 2026-07-07
- **Law:** **No Hearsay.**
- **Banner:** the VDCC north star's **wedge artifact** (`NORTH_STAR_VDCC.md`
  §2.3) — one signed capsule per incident epoch that projects the receipt
  spine's evidence onto the European Commission's pinned Article-73
  serious-incident reporting template: the first serious-incident report a
  regulator can rerun. Built on a chain that 4S proved complete and 4U
  red-teamed.
- **Branch:** `stage-4t-vic` · **Target tag:** `v2.30.0-stage-4t-vic`
  (plan verifies against `git tag --sort=-creatordate` before versioning —
  standing 4J gotcha).
- **Raw codes:** 133–148 (additive in
  `tools/simurgh-attestation/stage4h/exitCodes.mjs`; probe hygiene is
  permanent — `UNKNOWN_RAW_PROBE=999` + `exitCodeProbeHygiene.test.js` — but
  the golden ripple is expected and enumerated in §8).
- **Kernel posture:** **no new Capability Kernel entry.** 4T is an
  evidence-projection layer; the six frozen `authorise_*` families are
  untouched (differential-equivalence holds trivially).

**Core claim (verbatim, frozen):**

> For a declared incident epoch and pinned reporting-template snapshot, the
> signed Incident Capsule binds every template section to either digest-linked
> recomputable evidence or an explicit `not_derivable` / `requires_human_input`
> marker, and commits a closed evidence census for that epoch. An unbacked
> field, tampered or mis-recomputing evidence artifact, omitted census item,
> smuggled census item, or template-partition gap produces an
> offline-verifiable raw-code failure. A reviewer who trusts no participant can
> rerun the capsule end-to-end from pinned inputs.

**The four laws of 4T** (each maps to a code cluster, 4S-style):

1. **Field-binding law** (No Hearsay, fabrication side) — every
   `evidence_backed` section carries `{ value, evidence_digest,
   recompute_kind }` and the audit tier recomputes the value from the cited
   artifact. Codes 137 / 141 / 142.
2. **Suppression law** (No Hearsay, hiding side) — the pinned partition is
   normative; downgrading a derivable section while the sealed census holds
   matching evidence is a failure. Codes 143 / 144.
3. **Census law** (closed world) — the epoch's evidence set is Merkle-sealed
   and exact: nothing missing, nothing smuggled, nothing from another epoch.
   Codes 138 / 139 / 140 / 145.
4. **Template-pinning law** — the capsule binds to exactly one template
   snapshot digest and the three-way partition over its sections is
   exhaustive. Codes 135 / 136.

---

## 0. Why this stage — the wedge, the clock, the three buyers

The EU AI Act applies from **2 August 2026** (with exceptions); the Commission
issued draft Article-73 guidance and a serious-incident **reporting template**
for consultation in September 2025
(https://digital-strategy.ec.europa.eu/en/consultations/ai-act-commission-issues-draft-guidance-and-reporting-template-serious-ai-incidents-and-seeks,
https://artificialintelligenceact.eu/article/73/). TechPolicy.press, on the
draft guidance: the EU has _"no tools to pin accountability of multi-agent
incidents"_
(https://www.techpolicy.press/eu-regulations-are-not-ready-for-multiagent-ai-incidents/).
Every incident-report generator in the field emits prose over trusted logs;
none is closed-world recomputable.

The north star names three buyers for one artifact: the **regulator** (a
report it can rerun), the **insurer** (the actuarial evidence format Lloyd's
Testudo admits it lacks), and the **third-party evaluation ecosystem**
(Anthropic's stated post-February-2026 bet, which is only as strong as its
evidence substrate). 4T ships that artifact over the chain 4S proved complete
and 4U hardened.

The one-sentence moat: **others generate incident reports; VIC proves every
field of one, and proves nothing was left out of its evidence — or says, in a
signed marker, exactly what a machine cannot derive.**

## 1. Problem — an incident report today is hearsay all the way down

Stages 4A–4S built recomputable containment evidence; 4U proved the verifier
survives its own red-team. But the artifact a regulator, insurer, or external
evaluator actually consumes — the incident report — remains hand-written
prose: unfalsifiable, selectively sourced, silently incomplete. Three specific
failure modes, none detectable in any shipped tool:

1. **Fabrication** — a report field states a value no evidence supports.
2. **Suppression** — a report omits a field (or marks it "unknown") although
   the operator holds evidence that derives it.
3. **Open-world evidence** — nothing bounds the report's evidence set, so
   omitting an inconvenient artifact is undetectable.

4M shipped a 25-line projection surface (`article73Projection.mjs`) proving
the shape: fields are `{ value, source_digest }` or `not_projected`, no free
text synthesized. 4T is that idea grown into a stage: the full pinned
template, a real 4S chain underneath, a closed census around the evidence, a
suppression check, and a verifier a non-engineer can run.

## 2. Non-claims, known limitations, honesty rails (from birth)

### 2.1 Non-claims (signed into the attestation, in this order)

```text
not_a_legal_compliance_certification
not_a_serious_incident_classification
not_a_harm_causation_finding
not_a_legal_filing_or_submission
not_a_cross_run_or_fleet_completeness_claim
not_pricing_or_actuarial_advice
not_a_claim_the_incident_was_prevented_by_this_stage
```

### 2.2 Known limitations (signed, in this order)

```text
census_completeness_is_relative_to_declared_epoch_and_guarded_evidence_sources
template_partition_reflects_the_pinned_draft_snapshot_not_future_guidance
requires_human_input_sections_are_left_unfilled_by_design_the_capsule_is_not_a_complete_filing
lane_b_incident_is_a_staged_contained_near_incident_not_a_field_incident
```

### 2.3 Honesty rails (spec-time, in this order)

```text
capsule_proves_record_completeness_not_harm_causation
article73_projection_is_template_mapping_not_legal_compliance_claim
actuarial_input_is_evidence_format_not_pricing_advice
census_is_per_epoch_not_cross_run
incident_classification_requires_human_input_not_machine_claimed
browser_verifier_is_a_convenience_view_not_the_authoritative_verifier
template_snapshot_is_pinned_by_digest_not_claimed_current_guidance
no_free_text_is_ever_synthesized_into_a_projected_field
chain_held_verifiable_never_agents_safe
```

**Outcome semantics (mirror of 4G/4U, frozen):** the incident itself — a chain
bundle whose 4S verdict is a red raw code — is a **valid recorded outcome**,
not a VIC failure. VIC _fails_ only when the capsule misreports, fabricates,
suppresses, omits, smuggles, or won't recompute. This is what lets the capsule
report a real contained violation honestly instead of requiring a green world.

## 3. Invention 1 — the normative pinned-template partition

`core/templateMap.mjs` commits a snapshot of the Commission's draft Article-73
reporting template (fetched once at plan time, committed under
`tools/simurgh-attestation/stage4t/template/`, digest =
`template_snapshot_digest`) and a **three-way partition over its sections**:

```text
evidence_backed        machine-derivable from spine artifacts; carries a recompute_kind
not_derivable          no guarded evidence source can derive it for this epoch
requires_human_input   narrative / legal judgment; a machine must never fill it
```

Three properties make the partition a blade rather than a config file:

- **Exhaustive** — every section of the pinned snapshot is assigned exactly
  one class; an unassigned section is code **136**, so template churn is
  detected, never absorbed. A capsule projecting a section absent from the
  snapshot is code **137** (an invented section is fabrication).
- **Normative** — the partition, not the capsule author, decides what is
  derivable. That is what gives the suppression law (§5) teeth.
- **Honest** — the `requires_human_input` class is a first-class signed
  marker, not an empty string: the capsule states on its face which sections a
  machine must never fill (rail
  `incident_classification_requires_human_input_not_machine_claimed`). The
  honest partition of the template is itself a published finding of this
  stage.

If the Commission's final guidance changes the template, VIC does not silently
absorb the change: a new mapping requires a new pinned snapshot digest and a
visible diff (rail
`template_snapshot_is_pinned_by_digest_not_claimed_current_guidance`). The
exact section list is frozen at plan time from the committed snapshot; the
spec-level expectation is section groups covering reporting-entity and
AI-system identification, incident dates and description, affected
persons/impact, measures taken, and root-cause/risk context — with narrative
description and legal seriousness qualification expected to land in
`requires_human_input`.

## 4. Invention 2 — the closed epoch evidence census

`core/censusCore.mjs` seals the capsule's entire evidence universe for one
declared incident epoch into a signed `evidence_manifest`:

```json
{
  "epoch": "<incident epoch id>",
  "items": [
    { "kind": "stage4s_chain_bundle", "digest": "sha256:..." },
    { "kind": "kernel_decision_records", "digest": "sha256:..." },
    { "kind": "stage4u_attestation_ref", "digest": "sha256:..." },
    { "kind": "stage4o_consent_manifests", "digest": "sha256:..." },
    { "kind": "stage4n_temporal_anchor", "digest": "sha256:..." }
  ],
  "census_root": "sha256:<merkle root over items>"
}
```

Census checks (frozen):

```text
manifest lists an item the bundle lacks            → 138 EVIDENCE_CENSUS_MISSING_ITEM
bundle carries an artifact the manifest omits      → 139 EVIDENCE_CENSUS_SMUGGLED_ITEM
recomputed merkle root ≠ census_root               → 140 CENSUS_MERKLE_MISMATCH
census artifact bound to a different epoch         → 145 INCIDENT_EPOCH_MISMATCH
```

Completeness here is **relative to declared epoch boundaries and guarded
evidence sources** (limitation 2.2.1) — detectability at a sealed boundary,
never omniscience (the 4P `CpcEmissionBounded` naming lesson). Cross-run and
fleet-level census is 4N's job and an explicit non-claim; the capsule carries
a 4N temporal anchor so the incident is time-positioned without claiming
cross-run completeness (`census_is_per_epoch_not_cross_run`).

## 5. Invention 3 — suppression detection (No Hearsay cuts both ways)

Fabrication has been checkable since 4M. The unoccupied half is
**suppression**: a report that hides what its own evidence derives. Because
the partition (§3) is normative and the census (§4) is closed, suppression is
machine-checkable for the first time:

```text
143 NOT_DERIVABLE_UNJUSTIFIED       a section the partition classes evidence_backed is marked
                                    not_derivable while the sealed census contains an artifact
                                    of that section's declared recompute_kind — you had the
                                    evidence and hid it
144 REQUIRES_HUMAN_INPUT_UNJUSTIFIED the same masquerade over a machine-derivable section —
                                    laundering a derivable value behind a human-input marker
```

The pairing is the heart of VIC: **141 catches invented evidence; 143/144
catch hidden evidence.** A capsule can only be GREEN when it says everything
its evidence supports — no more, no less.

## 6. The capsule — schema and field binding

`incident_capsule.v1` (canonical JSON; two-stage digest signs
`canonicalJson(parse(bundle))` — the 4P/3M lesson):

- `template_binding` — `template_snapshot_digest` + partition digest.
- `epoch` — declared incident epoch id.
- `evidence_manifest` — §4, with `census_root`.
- `projected_sections[]` — one entry per template section:
  - `evidence_backed` → `{ section_id, value, evidence_digest,
    recompute_kind }`. The audit tier recomputes `value` from the cited
    census artifact via a **closed `recompute_kind` registry** (one pure
    recompute function per kind; unknown kind is schema-invalid → 133).
    Expected kinds include `stage4s_chain_verdict` (rerun the 4S verifier;
    the chain verdict is just another field — a mismatch is **142**, no
    bespoke code), `kernel_block_record`, `epoch_range`,
    `participant_count`, `consent_manifest_scope`, `stage4u_asr`,
    `stage4n_beat_index`.
  - `not_derivable` → bare signed marker (subject to 143).
  - `requires_human_input` → bare signed marker (subject to 144); **never**
    carries a machine value. No free text is ever synthesized.
- `non_claims` / `known_limitations` — §2, verbatim, in order.
- Signature: Lane A uses committed
  `test-keys/INSECURE_FIXTURE_ONLY_vic.pem` (path-regex allowlisted in both
  `security-audit-llm-shield-stage3{m,o}.sh` — standing 4O/4P gotcha); Lane B
  uses ephemeral keys.

Cross-stage reference check (one species, typed detail):

```json
{
  "raw": 146,
  "reason": "cross_stage_reference_invalid",
  "detail": {
    "ref_kind": "stage4s_chain | stage4u_vrta | stage4o_consent | stage4n_temporal_anchor",
    "ref_digest": "sha256:..."
  }
}
```

**146 semantics (frozen):** the referenced artifact fails to reproduce its
**recorded** verdict under its own stage verifier. A red recorded verdict that
reproduces red is a valid outcome (§2 outcome semantics) — the incident bundle
in Lane B is exactly that; 146 fires only on misreproduction.

**Consent IOU (4S closeout, retired here):** the 4S constitution row deferred
"consent-broadening end-to-end" to 4T. It is paid as the **consent field
group**, not a second blade: the capsule's consent-relevant sections bind to
the 4O consent manifests included in the sealed census. A consent-scope
mismatch surfaces as **142** (cited artifact recomputes to a different value)
or **146** (cited artifact fails its own verifier), depending on where it
breaks. The closeout states the IOU retired in exactly these terms.

## 7. The two lanes

- **Lane A — deterministic incident-capsule corpus.** One honest capsule
  (raw 0) over a synthetic-but-real chain (built with 4S machinery and
  committed fixture keys), plus **one fixture per reachable code 133–147**.
  148 is defensive, typed-wrapper-only, exercised in unit tests via the
  BigInt-poison pattern (4S precedent) and declared as such in the closeout —
  never smuggled into the corpus count. Byte-stable, no wall clock, no
  network.
- **Lane B — live staged incident ceremony.** Two OS processes over **MCP
  stdio**, reusing the 4S `delegatee-mcp-server`: the delegatee genuinely
  attempts an **over-scoped authority crossing**; the kernel/verifier blocks
  it (a real 4S code — expected **108** — fires in-process); 4T mints the
  capsule over the contained event, folding the failing chain bundle, kernel
  decision records, 4U attestation reference, 4O consent manifests, and 4N
  temporal anchor into the sealed census. Ephemeral keys; the committed
  capture is **re-verified, never regenerated**. Signed framing: this is a
  **staged contained near-incident** (limitation 2.2.4); the seriousness
  classification section is `requires_human_input` — the capsule refusing to
  invent a legal classification is the rail demonstrated in the flagship
  artifact itself. No live model call is required for this lane; it is a
  process-level ceremony (any future model-driven variant would inherit the
  4U Lane-B safeguard-legibility discipline).

## 8. Raw codes 133–148 + frozen check order + ripple discipline

```text
133 VIC_CAPSULE_MALFORMED            capsule/manifest/section schema invalid (incl. unknown recompute_kind)
134 VIC_SIGNATURE_INVALID            capsule or attestation signature does not verify
135 TEMPLATE_DIGEST_MISMATCH         capsule's template_snapshot_digest ≠ pinned snapshot
136 TEMPLATE_PARTITION_INCOMPLETE    a snapshot section is unassigned in the partition
137 TEMPLATE_SECTION_UNMAPPED        capsule projects a section absent from the pinned snapshot
138 EVIDENCE_CENSUS_MISSING_ITEM     manifest lists an item the bundle lacks
139 EVIDENCE_CENSUS_SMUGGLED_ITEM    bundle carries an artifact the manifest omits
140 CENSUS_MERKLE_MISMATCH           recomputed census root ≠ census_root
141 FIELD_UNBACKED                   evidence_backed section without resolvable evidence digest
142 FIELD_RECOMPUTE_MISMATCH         recomputed value ≠ projected value (incl. chain verdict)
143 NOT_DERIVABLE_UNJUSTIFIED        suppression: derivable section hidden while evidence sealed in census
144 REQUIRES_HUMAN_INPUT_UNJUSTIFIED suppression: derivable section laundered behind human-input marker
145 INCIDENT_EPOCH_MISMATCH          census artifact bound to a different epoch
146 CROSS_STAGE_REFERENCE_INVALID    referenced attestation fails to reproduce its recorded verdict (typed ref_kind)
147 ATTESTATION_DIGEST_MISMATCH      two-stage bundle digest ≠ signed digest
148 INTERNAL_FAIL_CLOSED             typed-wrapper catch-all (mirror of 4S 118 / 4U 132)
```

**Frozen check order** (parse → signatures → template pinning → census → epoch
→ cross-stage truth → field truth → suppression → attestation seal →
fail-closed):

```text
133 → 134 → 135 → 136 → 137 → 138 → 139 → 140 → 145 → 146 → 141 → 142 → 143 → 144 → 147 → 148
```

All rows map to `RUN_LEVEL_BY_RAW` level 1 (a capsule-integrity failure is a
structural failure, not a security outcome). **Additive-code discipline
(the 4U lesson, four red CI rounds — explicit here):** regenerate the 4H
`exit-map.json` goldens (both copies) and evidence-pack digests, update the
`stage4h/exitWrapper.test.js` literal and any inline map, extend
`.prettierignore` (all of `evidence/stage-4t/` and deterministic fixtures),
extend both stage-3M/3O key-audit allowlists, the lean-proofs workflow, and
`scripts/check-e2e.sh`. Run **`bash check.sh` locally as we build** — full
Node-26 e2e nets plus every prior reproduce script, never `npm test`-only.
Known pre-existing flake: Stage 2.7 `stage27` smoke "4321 leaked"
hash-collision — rerun clears.

## 9. Two-tier attestation + browser verifier

`vic_attestation.v1`, one Merkle root over **four** sealed groups
(`template_snapshot` / `capsule` / `census_artifacts` / `lane_b_capture`),
signed with `INSECURE_FIXTURE_ONLY_vic.pem`; two-stage digest over
`canonicalJson(parse(bundle))` (prettier/merge-safe).

- **Public tier:** structural — signatures, template digest, partition
  exhaustiveness, census Merkle, manifest/bundle set-equality, section schema.
  No engine re-run.
- **Audit tier:** re-runs the closed `recompute_kind` registry over every
  `evidence_backed` section (including rerunning the 4S chain verifier and
  re-verifying the 4U/4O/4N references), and evaluates the suppression law.
  Catches 141–146.
- **Browser verifier** (`browser/vic-verifier.html`, reusing the 4M browser
  pattern): one static HTML file, **no network calls, no remote dependency,
  same canonical digest rules**; drop a capsule, get green/red per template
  section, export a verification summary. It is a convenience view — the CLI
  two-tier verifier remains authoritative (rail 2.3.6). Browser↔CLI **parity
  over the full Lane A corpus is a CI/reproduce gate that blocks the tag**,
  not a runtime raw code.

## 10. Reproduce + hermeticity

`scripts/reproduce-llm-shield-stage4t.sh` — verify-only: rebuild the Lane A
corpus byte-stably (Node ≥ 26), recompute the capsule + attestation digests,
verify both tiers, run the browser↔CLI parity gate, re-verify (never
regenerate) the Lane B capture, tamper one census item → expect a census-law
failure. Guarded Lean step (built only if `lean` is on PATH; CI `lean-check`
covers it otherwise — and `check.sh` must not require lean, the 4R lesson). No
network, no wall clock.

## 11. Lean obligations (`proofs/stage4t/NoHearsay.lean`)

Three headline theorems, zero `sorry`, Lean 4.15.0, no mathlib:

1. **`noHearsay`** — in a verified capsule, every projected field is
   evidence-backed or explicitly declared absent: the three-way partition is
   exhaustive over the pinned section set and no fourth state is
   representable.
2. **`suppressionDetectable`** — if the census contains matching-kind evidence
   for a section marked `not_derivable` (or `requires_human_input` over a
   derivable section), the checker rejects — the 143/144 law as a
   machine-checked statement.
3. **`censusExactness`** — under the declared census and Merkle construction,
   omission or addition of a committed item changes the recomputed root:
   exactness relative to declared epoch boundaries and guarded evidence
   sources, never omniscience.

Plus supporting lemmas as needed (e.g., `redVerdictIsOutcomeNotFailure`
mirroring 4U's `bypassIsOutcomeNotFailure`).

## 12. Kernel touch

**None.** No new `authorise_*` entry, no frozen-predecessor edit, no
`src/llmShield` diff. 4T projects evidence the spine already produces; it adds
no enforcement. Stated so reviewers see the boundary is deliberate.

## 13. Prior-art / field scan (pinned at plan time)

To be recorded in the plan's citation block with URLs checked on 2026-07-07:
the Commission draft template + consultation page, artificialintelligenceact.eu
Article-73 text, TechPolicy.press multi-agent-incidents piece (all already in
`NORTH_STAR_VDCC.md` §6), the flight-recorder cohort (Vorlon / AgentRx / AIR
Blackbox / Causality — telemetry, trust-the-writer, no census), SCITT /
in-toto (artifact notarization, no field recompute, no suppression check), GRC
incident-reporting tooling (OneTrust-class — workflow, zero recomputability),
and the project's own 4M projection (25-line surface, one disclosure, no
census, no suppression law — differentiated in §1). Every citation pinned or
dropped; the Novelty score is conditional on this sweep surviving contact.

## 14. Four-axis scorecard (pre-score only — re-score at closeout after the prior-art sweep and shipped evidence)

| Axis               | Score | What moves it higher                                                                                                                                                     |
| ------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Novelty            | 9.3   | Closed-world recomputable incident report bound to a regulator's own pinned template, with suppression detection (143/144) as the unoccupied half. Survive the §13 sweep. |
| Frontier           | 9.4   | Article-73 obligations live in the near-term window (AI Act applies 2 Aug 2026); the named regulator gap answered with a shipped artifact, not a paper.                    |
| Good-for-Anthropic | 9.2   | The evidence substrate under the third-party-ecosystem bet, in the exact shape regulators/insurers consume. A genuinely non-engineer-usable browser verifier raises it.    |
| Constitution       | 9.3   | Oversight/accountability projected into a rerunnable regulator surface; 4S consent IOU retired; `requires_human_input` is human oversight by construction.                 |

## 15. Comprehensive E2E net + docs-accuracy pass (mandatory before tag)

- `tests/e2e/llmShield/stage4t/k7AllFunctions.test.js` — composes every
  stage4t export; **full tamper matrix for 133–147, plus a typed-wrapper-only
  148 fail-closed fixture**; cross-stage invariants (a capsule over a tampered
  4S bundle must fail 146/142, never false-GREEN; suppression pair 141↔143
  exercised as a duel); the no-kernel-touch assertion (4A–4S byte-frozen,
  committed-state git check `git show origin/main:file` vs HEAD — the 4U K7
  lesson).
- `tests/e2e/llmShield/stage4t/laneb.test.js` — verify-only Lane B ceremony.
- Browser↔CLI parity gate over the full Lane A corpus.
- Docs-accuracy pass: every claim in the spec, closeout, README row, and the
  NORTH_STAR_VDCC status update checked against shipped code before tag.

## 16. File structure (locked at plan time)

```text
tools/simurgh-attestation/stage4t/
  constants.mjs                 schemas, codes 133–148, non-claims, limitations, rails, recompute_kind registry
  template/                     committed Commission template snapshot + digest
  core/templateMap.mjs          pinned snapshot binding + three-way partition, 135/136/137
  core/censusCore.mjs           evidence manifest + merkle seal + epoch binding, 138/139/140/145
  core/projectionCore.mjs       field binding + recompute registry + suppression law, 141/142/143/144
  core/capsuleCore.mjs          frozen check order + evaluateCapsule / evaluateCapsuleSafe (148), 146/147
  node/build-stage4t-fixtures.mjs       Lane A corpus (honest + one per code)
  node/build-stage4t-attestation.mjs    two-stage digest + sign
  node/verify-stage4t-attestation.mjs   --tier public|audit
  browser/vic-verifier.html     static single-file convenience verifier
  laneb/run-laneb-incident-ceremony.mjs reuses stage4s delegatee-mcp-server
  python/vic_parity.py          stdlib parity for the non-signature decision core
proofs/stage4t/NoHearsay.lean
scripts/reproduce-llm-shield-stage4t.sh
docs/research/llm-shield/STAGE_4T_CLOSEOUT.md
tests/unit/llmShield/stage4t/*.test.js
tests/e2e/llmShield/stage4t/{k7AllFunctions,laneb}.test.js
evidence/stage-4t/              (fully prettier-ignored)
```

## 17. Closeout obligations

Re-score the four axes with evidence; publish the honest template partition
(how many sections landed in each class — the partition itself is a finding);
retire the 4S consent IOU in the exact §6 wording; update `NORTH_STAR_VDCC.md`
status; write `project_stage-4t-vic.md` + update `MEMORY.md`; verify main CI
green; neutral commit/PR/release copy (no co-author trailer, no "Claude Code"
tag anywhere).
