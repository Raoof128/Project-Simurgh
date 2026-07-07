# Stage 4Y — VDR: Verifiable Document Residue (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.** (Internal tie-break order;
> public wording stays provider-agnostic.)

**Date:** 2026-07-08 · **Branch:** `stage-4y-vdr` · **Prev:**
v2.33.0-stage-4x-vlr (main 63a1ea45) · **Target tag:** `v2.34.0-stage-4y-vdr`
(verified against `git tag --sort=-creatordate`)

---

## 1. Identity, laws, blade

**Stage 4Y — VDR: Verifiable Document Residue.** The ladder:

```text
4X = residue over an authored corpus
4Y = residue over submitted bytes
4Z = cross-gate / broader benchmark debt (reserved)
```

**The wound it attacks.** 4X's founder ledger named four external actors and
gave every one of them the **same single blocker**: VLR measures the gate's
residue over a _frozen corpus we authored_, not the _arbitrary submitted
document_ each actor actually holds. Meanwhile the world's reviewers audit
submitted narratives **by hand**: METR's review of the Anthropic February 2026
Risk Report hand-caught a miscounted survey response; Barrett et al.'s external
review of DeepMind's scheming-inability safety case reports — verbatim — _"if
the associated artifacts exist, we did not have access to them, since they were
not published along with GDM's paper."_ Six experts, ~4 person-months, no
instrument. 4Y is the instrument.

**Thesis line:**

```text
4X: here is the exact miss set of our gate, over a corpus we authored.
4Y: hand us ANY document — an Art-73 filing, a redacted Risk Report,
    a consulting deliverable — and get back a signed, byte-reproducible,
    content-free structural residue map of what the gate reaches,
    what is redacted, and how fragile the catches are. Without
    publishing a word of the document.
```

**The blade (one per stage): a signed, byte-reproducible, content-free
structural residue map over an arbitrary submitted document.** Given any UTF-8
document, VDR emits a map that:

1. **Totally partitions** the document: every byte lands in exactly one region
   of class `caught_v1` / `caught_v2_only` / `redacted` / `unflagged`, and
   region lengths MUST sum to the document byte-length. Caught spans are
   located by a **stage-4y span extractor** running the _frozen imported
   lexicons_ (4W `LEAKAGE_*` tables, 4X `V2_LEXICON`) at match granularity —
   necessary because the 4W gate itself reports at region granularity (one
   hit per uncovered region, first rule wins; verified against
   `leakageGate.mjs`). The extractor is bound by the **gate-agreement
   invariant**, machine-checked and never assumed: for any document, the
   extractor finds ≥1 v1 span **iff** the unmodified 4W gate
   (`scanLeakage(body, [], [])`) fires. The real gate runs as the agreement
   oracle in every audit-tier verification and in K7.
2. Replays every caught **region** (the gate-native unit — the metamorphic
   transforms are sentence-designed, so the shadow's replay unit is the caught
   region's text, not a bare token match; the match-granular extractor above
   is only for partition _coloring_) through **all six** transforms of 4X's
   frozen signed metamorphic table (`vlr.metamorphic.v1`, imported read-only —
   no new transforms, no search). Slip outcomes come from re-running the
   frozen gates over each transformed region as a standalone body
   (`scanLeakage(variant, [], [])`). A transform that leaves the region
   byte-identical is recorded `not_applicable`; slips are counted over
   **applicable** variants only, so the denominator cannot be gamed with
   no-ops. The headline is per-document gate fragility: _"of N caught regions
   with A applicable shadow variants, K slip v1, K′ slip v2."_
3. Is **content-free at the public tier**: the public map carries offsets,
   lengths, region classes, reconciliation ids, and aggregate counts — never
   raw text and never per-span digests. The map is designed for publication
   without republishing document text, **subject to submitter approval and the
   public/private tier boundary**. Public maps expose structure, not content;
   audit-tier evidence carries stronger byte commitments for reviewers who
   hold the document bytes.

**Falsifiability of the blade.** A hostile reviewer rejects the stage by
attacking exactly one mechanism: produce a document where the map is not a
pure function of (bytes, signed rulesets, signed MR table) — different bytes
from the same inputs, a region omitted, a length that does not conserve, or a
shadow outcome that does not replay.

**Laws:**

1. **No Silent Region** — the map is a total partition with length
   conservation: an operator cannot crop the embarrassing paragraph. _A
   redaction is a region, not an absence_ — **redaction is counted, not
   erased**: redacted spans carry their length and position in the arithmetic.
   If candidate spans overlap, VDR resolves regions by fixed precedence:
   `redacted > caught_v1 > caught_v2_only > unflagged`; a v2 hit overlapping a
   v1 hit is classified `caught_v1`, never double-counted. Omission is a
   number, not a suspicion. (Incident grounding: the December 2025 DOJ
   Epstein-files release, where "redactions" were paint over live text and
   ~100 victims' information was exposed — see §4 wedge.)
2. **Same Bytes, Same Map** — the map is deterministic over document bytes.
   All emitted offsets and lengths are **original UTF-8 byte offsets**, never
   normalised-string offsets. Invalid UTF-8 is rejected before mapping; a body
   that differs from its NFC normalisation is rejected (fail-closed), never
   silently normalised; line endings are bytes, not normalised. Deliberate
   divergence from 4W's stricter narrative canonical form (NFC + CRLF→LF +
   trailing-whitespace strip, `textCore.mjs`): narratives are _authored_ and
   can be held to a canonical form; documents are _submitted_ and are mapped
   as the bytes they are — VDR requires only what determinism requires (valid
   UTF-8, NFC). Two verifiers, two machines, one map.
3. **The Map Is Not a Verdict** — signed in advance: a residue map is not a
   judgment of the document's truth, quality, or compliance. **Unflagged means
   outside this gate's lexical reach — not safe, true, complete, compliant, or
   non-misleading.**

**Socket ledger (ADR).**

- **Pays:** `residue_over_submitted_narrative_deferred` (minted by 4X's spec;
  never marked PAID silently — this spec section is the payment record).
- **Mints (one only):** `submitted_document_pilot_deferred` — a real external
  party runs the verifier on a real document and publishes the map. This is
  the 10-blocker on the Lab axis and is not buildable by us alone.
- Untouched and open: `irreducible_semantic_residue_deferred`,
  `multilingual_ruleset_deferred`, `narrative_version_diff_deferred`
  (4Y ships _groundwork_ for this — the map-delta projection over a version
  pair — but does NOT pay it; the socket requires a diff **attestation**, not
  a derived metric), `transparency_report_profile_deferred`,
  `cross_gate_residue_benchmark_deferred` (4Z).

**The honest core, signed up front (next stage's attack surface):**

1. **Coverage geometry, not leakage detection.** Over an arbitrary document
   there is no ground truth; the map states what the _gate_ reaches and how
   fragile those catches are under a _fixed_ transform table — it cannot state
   what the document leaks. Inherited floor: v1/v2 are lexical and
   English-centric.
2. **Shadow ≠ paraphrase space.** Fragility is measured under the six frozen
   MR transforms only. A shadow-clean document is not paraphrase-proof.
3. **Fixtures are self-submitted.** Shaped on the Commission's published
   incident template and the redacted-Risk-Report shape, but authored by us —
   no external submitter yet (the minted pilot socket _is_ this bound).
4. **Reconciliation proves consistency, not content.** Public tier proves the
   public map and the private map agree where they overlap; only the audit
   tier (holding the bytes) recomputes content digests.
5. **Public maps are structural metadata.** They reduce content exposure but
   do not prove zero privacy risk. (Design constraint anchored to the
   published attack model: Edact-Ray, PoPETs 2023, dictionary-attacks redacted
   text from glyph-position structure at ~80,000 guesses/second — which is
   exactly why per-span digests live at the audit tier and the public document
   binding is a salted commitment. See §2.)

**Rails (AnthropicSafe designed at spec time):**

- `no_evasion_search_fixed_transform_table_only` — no optimizer, no live
  model, no adversarial lane; the MR table is 4X's, frozen.
- `gate_is_public_lexicon` — VDR reveals no private filter, provider policy,
  or hidden detector. It can only expose behaviour of the public Simurgh
  research lexicon already committed in this repo. It is therefore a
  deterministic complement to private evaluation, not a competitor and not a
  disclosure of hidden operational controls.
- `map_is_content_free_at_public_tier` — no document text and no per-span
  digest ever enters the public map, the attestation body, or the browser
  DOM export.
- `fixture_documents_never_name_a_party` — incident-cluster fixtures are
  shape-only under the standing brand-denylist; the wedge cites public
  reporting, the fixtures accuse no one. (Real submitted documents may name
  parties; the rail binds OUR fixtures, not future submissions.)
- `read_only_kernel` — the 4W lexicon constants + `scanLeakage` (agreement
  oracle) and the 4X `V2_LEXICON`/MR-table/digest helpers are imported
  unmodified; the 184 source-witness covers both stages' files. The span
  extractor is stage-4y code — its agreement with the frozen gate is
  machine-checked (see blade), not assumed; this is signed as limitation 7.

**Explicitly out of scope (unchanged refusals):** any live-model lane; any
adversarial elicitation; any evasion-search over any filter; any claim of
judging document truth; any PDF/binary parsing (VDR consumes UTF-8 text — PDF
extraction is the submitter's step and is declared in provenance; the
Epstein-class failure VDR addresses is the _geometry_ failure, not PDF
internals).

---

## 2. Artifacts, raw codes 181–189, frozen check order

### Region model

- Classes: `caught_v1`, `caught_v2_only`, `redacted`, `unflagged`.
- Overlap precedence (Law 1): `redacted > caught_v1 > caught_v2_only >
unflagged`, resolved byte-wise, then adjacent same-class bytes coalesce into
  maximal regions. The emitted region list is sorted by offset, contiguous
  (region N+1 starts where N ends), gap-free, and covers `[0,
document_byte_length)`.
- Redaction regions come from a **declared redaction manifest** (sorted
  `{offset, length}` records over original bytes). A fixed marker lexicon
  (runs of U+2588 FULL BLOCK; the literal `[REDACTED]`) appearing OUTSIDE any
  declared region is a bytes-tier failure (`undeclared_redaction_marker`, 183) — no smuggled redaction.
- **Span extractor** (stage-4y code over frozen imported lexicons): finds v1
  hits (digit / number_word / percent / month / quantifier over the 4W
  tables) and v2-only hits (4X `V2_LEXICON`) at match granularity with
  original-byte offsets. Bound by the gate-agreement invariant (blade, §1):
  extractor-v1-nonempty ⟺ `scanLeakage(body, [], [])` fires — enforced in
  audit-tier 188, in K7, and as a Lean theorem (`extractorGateAgreement`).
  Manifest offsets are validated on UTF-8 code-point boundaries at 183 by an
  intrinsic byte-mask check (`(byte & 0xC0) !== 0x80`), not by importing 4W's
  helper (ordering rule: nothing imported runs before 184).
- **Redaction×catch visibility (audit tier):** precedence makes redacted
  regions opaque in the partition, so the audit aggregates additionally
  record `caught_inside_redacted{v1, v2_only}` — computed on the private side
  _before_ precedence is applied. This is the number the brainstorm promised
  ("of N caught spans, how many sit inside redacted regions") and it lives at
  the audit tier because it is a property of the private bytes.

### Artifact schemas

**`simurgh.vdr.document.v1`** — descriptor, never published: `byte_length`,
`nfc_ok`, `redaction_manifest` (sorted declared regions), optional
`counterpart_segment_map` for public↔private version alignment. Redactions
are NOT assumed length-preserving; alignment is segment-wise (the sequence of
unredacted segments, each aligned by order, compared by class sequence at
public tier and by content digest at audit tier).

**`simurgh.vdr.map.v1`** — PUBLIC, structural only:

```text
schema, document_byte_length,
document_commitment,            # sha256(salt || document_bytes) — see below
regions[{offset, length, class}],
aggregates{
  bytes_by_class{...}, span_counts_by_class{...},
  shadow{n_caught_regions, a_applicable_variants, k_slip_v1, k_slip_v2}
},
frozen{v1_ruleset_digest, v2_digest, metamorphic_table_digest,
       source_witness_digest},
reconciliation{redaction_region_count, unredacted_segment_count,
               segment_class_sequence},   # public side of 186 (audit compares)
provenance: submitted | fixture
```

The `document_commitment` is an **audit-reopenable salted document
commitment**: it prevents later document substitution once the audit bundle is
opened, but it is **not independently checkable by public-tier verifiers**
without the document bytes and salt. It is public binding-on-open, not public
verification. (Salt lives in the audit bundle; this is the 4P/CPC
window-bound-commitment pattern — raw evidence never published.)

**`simurgh.vdr.audit.v1`** — SEALED, byte-level: `document_digest`
(sha256 of raw bytes), `commitment_salt`, per-span content digests, per-span
shadow records `{span_ref, mr_id, applicable, variant_digest, slips_v1,
slips_v2}` (six records per span; `applicable: false` ⟺ the transform left
the span byte-identical), `caught_inside_redacted{v1, v2_only}` (pre-precedence,
private side), segment-alignment content digests for 186, replay witness.
Published only when the submitter chooses; fixtures publish it,
`withheld_document` does not.

**`simurgh.vdr.attestation.v1`** — Ed25519 over `canonicalJson(body)`;
`signing_key_digest = "sha256:" + sha256(raw public PEM string)` (4W→4X
doctrine, NOT DER); binds `map_digest`, `audit_digest`, and
`merkleRootSorted([map_digest, audit_digest])`. Public verification never
needs the audit bytes — only their digest.

### Raw codes (additive; wrapper LAST; `_VDR` suffix per the VSN-172 collision lesson)

| Raw | Reason                        | Tier    | Catches                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 181 | `vdr_schema_invalid`          | public  | map/audit/attestation schema or field-shape violation                                                                                                                                                                                                                                                 |
| 182 | `vdr_signature_invalid`       | public  | Ed25519 over `canonicalJson(body)` fails, or `signing_key_digest` mismatch                                                                                                                                                                                                                            |
| 183 | `vdr_document_bytes_invalid`  | bytes   | **intrinsic checks only** (no 4W/4X imports): invalid UTF-8 · empty body · `body !== body.normalize("NFC")` (`not_nfc_normalised`) · malformed/overlapping declared manifest offsets · `undeclared_redaction_marker`                                                                                  |
| 184 | `vdr_frozen_binding_mismatch` | public  | map's `frozen` digest block ≠ repo constants: `v1RulesetDigest` / `v2Digest` / `metamorphicTableDigest` / 4W+4X source-witness                                                                                                                                                                        |
| 185 | `vdr_partition_invalid`       | public  | regions unsorted/overlapping/gapped · Σ lengths ≠ `document_byte_length` · unknown class · aggregates ≠ recount over regions · shadow aggregate arithmetic broken                                                                                                                                     |
| 186 | `vdr_reconciliation_mismatch` | audit   | public map vs private-side map disagree: redaction regions ≠ manifest · unredacted segment class sequences differ · segment content digests differ (audit opens both sides). **Applies only when a `counterpart_segment_map` exists; its absence is recorded (`reconciliation: null`), never failed** |
| 187 | `vdr_shadow_replay_mismatch`  | audit   | recomputed `applyMR` variant digest, applicability flag, or slip outcome ≠ sealed shadow record; N/A/K/K′ don't recount from records                                                                                                                                                                  |
| 188 | `vdr_map_recompute_mismatch`  | audit   | full map rebuilt from document bytes + frozen rulesets ≠ committed map, compared via **canonicalJson** (never JSON.stringify — the 4X disk-round-trip gotcha) · salted commitment does not reopen · **gate-agreement oracle violated** (extractor-v1-nonempty ≠ `scanLeakage` fired)                  |
| 189 | `INTERNAL_FAIL_CLOSED_VDR`    | wrapper | any throw in `evaluateVdrSafe` — fail-closed                                                                                                                                                                                                                                                          |

**Frozen first-failure order: 181 → 182 → 183 → 184 → 185 → 186 → 187 → 188;
189 wraps.** Ordering rationale (settled in review): 183 is intrinsic-only so
it may run before 184 verifies the frozen imports; every check that USES bound
artifacts (185's geometry helpers, 187/188 recompute) runs after 184.

**Tier doctrine (the load-bearing beam):**

```text
public = structural arithmetic + signed commitments   → runs 181/182/184/185
audit  = byte recomputation + replay                  → runs 181–188
```

The public verifier holds map + attestation only. It cannot scan marker text,
cannot compare private maps, cannot reopen the commitment — and never
pretends to. When the audit bundle is withheld, public verification checks
the attestation's signature and the presence of the bound audit digest, but
not the audit bundle's contents.

### Exit-code integration

`VDR_RAW_CODES` 181–189 additive in `stage4h/exitCodes.mjs`;
`VDR_CHECK_ORDER = [181..188]`; `181:1 … 189:1` in `RUN_LEVEL_BY_RAW`.
Golden ripple pre-registered: **six known goldens** break on additive codes
(exit-map.json ×2, exitWrapper level map, + the three from 4M/4N memory);
regenerate all in the same task. `UNKNOWN_RAW_PROBE` (999) for unknown-code
tests, never a hardcoded raw (4R/4S lesson). No `[9x,3]`-style array probes
without the probe-hygiene guard.

---

## 3. Evidence lanes, attestation flow, parity, projections

### Lane A — byte-stable CI (fixture corpus)

Ten fixture documents, shape-named under
`fixture_documents_never_name_a_party` (the tamper fixture is SPLIT because
183 masks 186 in one ordered run — see item 6); fixture salts are deterministic
(`sha256("vdr-fixture-salt:" + fixture_id)`) so `sha256(salt ‖ bytes)` stays
byte-stable, real submissions may use random audit-sealed salts:

1. `incident_report_shaped` — structured on the **European Commission's
   published draft Art-73 serious-incident reporting template** (primary
   source pinned in §4; final guidance applies from 2 August 2026).
2. `risk_report_shaped_private` + `risk_report_shaped_public` — an
   unredacted/redacted pair with manifest + segment map; drives 186
   end-to-end. Shape mirrors a frontier-lab risk report (quantitative claims,
   redactions, external-reviewer audience).
3. `consulting_report_shaped_v1` + `consulting_report_shaped_v2` —
   quantitative, citation-dense deliverable prose (the incident-cluster
   shape), as a **version pair** (the withdrawn→revised arc) feeding the
   map-delta projection (below).
4. `withdrawn_policy_shaped` — policy prose with hedged quantitative claims.
5. `minimal_edge` — short document exercising boundary geometry: multi-byte
   code points at region edges, adjacent v1/v2 hits forcing precedence,
   redaction at offset 0 and at EOF.
6. `botched_marker_shaped` + `reconciliation_mismatch_shaped` — two TAMPER
   fixtures (split so each reaches its target check first): the first has a
   marker run outside the declared manifest → `183
undeclared_redaction_marker`; the second is marker-clean and correctly
   signed so it passes 181–185 and fires `186` on a manifest that disagrees
   with the private side. Together they make the Epstein-class geometry
   failure mechanically visible on both tiers.
7. `withheld_document` — **the fixture that proves the blade**: map +
   attestation committed; document bytes deliberately NOT in the repo (digest
   pinned in the fixture README, audit bundle withheld). CI verifies it at
   public tier only; it is **excluded from Lane B and from all audit-tier
   checks** (no bytes to recompute — stated, not discovered). Seatbelt
   (signed into the fixture README): a passing public-tier chain over
   `withheld_document` demonstrates **publishable structural verification and
   signed audit-reopenable binding, not byte-level correctness** — byte-level
   correctness requires the audit tier with document bytes.

Everything built twice and `cmp`-verified; evidence dir
`docs/research/llm-shield/evidence/stage-4y/` fully prettier-ignored;
reproduce script `scripts/reproduce-llm-shield-stage4y.sh` is **verify-only**
over committed evidence; Node 26 required for byte-stability.

### Lane B — blind two-process recompute ceremony

Child receives `{document_path (a parent-made TEMP COPY in scratch, never the
repo path), frozen_digest_block}` on stdin. Child rebuilds the full map and
emits `canonicalJson`; parent compares byte-for-byte against the committed
map. Blindness negatives, static AND runtime:

- static scan of the child source forbids: reading
  `docs/research/llm-shield/evidence/stage-4y`, importing the committed
  map/attestation, accepting a committed-map path key in stdin;
- runtime: child refuses `OPERATOR_*` env (exit 2); refuses
  `ledger_path`/`committed_map` stdin keys; ceremony transcript records
  `{child_received_committed_map_path: false, child_read_evidence_dir: false,
parent_computed_region_classes: false}`.

Signed limitation restated: **process-isolated, not
implementation-independent**.

### Lane C — intentionally absent

No live-model capture lane, consistent with
`no_evasion_search_fixed_transform_table_only`. A design decision, recorded
here, not an omission.

### Browser verifier — the headline artifact (`vdr-verifier.html`)

Offline single file; hash-based CSP with the CI hash-consistency guard (4X
gotcha: recompute inline script/style sha256 after ANY edit). **Two visible
modes = the two tiers:**

- **Public mode:** load map + attestation → 181/182/184/185; renders the
  partition bar (byte ranges by class) and shadow aggregates. **182 is verified
  in-page via WebCrypto Ed25519** (`crypto.subtle`, offline, no network) — a
  deliberate upgrade over 4X's Node-authoritative choice because the browser is
  the headline artifact; if the viewer's browser lacks `crypto.subtle` Ed25519
  the UI shows an explicit "signature not verified in this browser" state,
  never a silent pass.
- **Audit mode:** additionally load document bytes (+ audit bundle) →
  183/186/187/188 byte-level recompute in the reviewer's own browser.

Egress claim, scoped honestly: **the verifier page contains no first-party
egress path** — CSP blocks network fetch/connect/form/image/script egress, and
CI statically rejects
fetch/XMLHttpRequest/WebSocket/EventSource/sendBeacon/importScripts/Worker/
form sinks (`browserNoEgress.test.js`: `default-src 'none'`, `connect-src`
absent/none, `form-action 'none'`, `img-src` data-only, no external
src/href). **This does not claim protection against malicious browser
extensions or a compromised browser.**

### Attestation flow & keys

Builder (holds bytes): descriptor → map + sealed audit bundle → attestation.
Fixture key pair `INSECURE_FIXTURE_ONLY_vdr(.pub).pem` committed under
`tests/fixtures/llmShield/stage4y/test-keys/`; the 3M/3O security-audit
scripts get one stage4y allowlist line, **by path regex, no digits** (4P
lesson).

### Parity (`vdr_parity.py`, stdlib only)

Second implementation of: intrinsic 183 checks, partition build with
precedence, shadow replay (`apply_mr` port), public-tier arithmetic.
**Digest preflight before any map comparison:** Python recomputes
`v1RulesetDigest`, `v2Digest`, `metamorphicTableDigest` from its OWN ported
rule tables and asserts equality with the JS-generated frozen block — so
parity means _same rules, same bytes, same map_, not _two implementations
happened to agree today_. Canonical-serialization pin: Python
`json.dumps(obj, sort_keys=True, separators=(",", ":"))` must byte-match JS
`canonicalJson` for the digested structures (ASCII-safe lexicons make this
exact; a preflight test locks it). JS↔Python full-map equality over all
Lane A fixtures; a divergence is a finding. Ed25519 excluded (Node
authoritative) — same non-claim as 4X.

### Derived projections (zero new raw codes, zero new mechanism)

- **`vdr_oscal_projection`** — render a verified map's aggregates as a NIST
  OSCAL Assessment-Results `observations` block (machine-generated evidence of
  a guardrail-control measurement). Pure projection of already-verified data
  (the 4M Art-73-projection move); validated against the OSCAL JSON shape in
  a unit test, no network.
- **`map delta`** — pure arithmetic diff of two independently verified maps of
  two document versions (region class deltas, shadow deltas). Groundwork for
  `narrative_version_diff_deferred`; explicitly does NOT pay that socket.

### Mechanical closeout hooks (pre-registered)

K7 all-functions e2e net (every export + tamper matrix + cross-stage
invariants) MANDATORY before tag; `check.sh` locally as tasks land (4U
lesson: prettier config, committed-state git checks, exit-map ripple); prior
stages' reproduce scripts must stay green (additive codes must not disturb
sealed history); `npm test` = unit only, never shell `rg` in a unit test (4L);
prettier corrupts bare `_` (4W); rebase-merge then reset local main (4O).

---

## 4. Lean, non-claims, limitations, wedge, scorecard

### Lean (`proofs/stage4y/DocumentResidue.lean`, Lean 4.15 core, no mathlib, zero sorry)

| Theorem                  | Class       | Statement                                                                                                             |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `partitionConservation`  | substantive | a well-formed region list (sorted, contiguous, non-overlapping) satisfies Σ lengths = document length                 |
| `classifyTotal`          | substantive | the precedence function `redacted > v1 > v2only > unflagged` is total and deterministic: every byte gets one class    |
| `shadowSlipAntitone`     | substantive | if v2's catch set ⊇ v1's (4X's monotone premise), the shadow slip set under v2 ⊆ slip set under v1                    |
| `extractorGateAgreement` | substantive | in the model, the span extractor finds ≥1 v1 span iff the region-granular gate predicate fires over the same rule set |
| `redactionCounted`       | lock        | redacted regions contribute full length to the conservation sum — counted, not erased                                 |
| `mapDeterministic`       | lock        | the map function is a pure function of (bytes, rulesets, MR table) in the model — Same Bytes, Same Map                |

Wire into `.github/workflows/stage-4-lean-proofs.yml` + sorry-grep;
`lean-not-in-check.sh` stays true (4R lesson).

### Non-claims (`VDR_NON_CLAIMS`, signed)

```text
not_a_judgment_of_document_truth_quality_or_compliance
not_a_leakage_detector_unflagged_means_outside_lexical_reach
not_a_privacy_guarantee_public_maps_expose_structure
not_a_paraphrase_space_coverage_claim
not_a_disclosure_of_hidden_operational_controls
not_a_claim_of_byte_correctness_at_public_tier
not_a_claim_of_institution_independent_reproduction
not_a_claim_of_model_safety
not_a_claim_of_regulatory_compliance
not_an_accusation_fixtures_are_shape_only
not_a_claim_that_conservative_marker_detection_covers_prose_mentions
```

### Known limitations (signed, `VDR_KNOWN_LIMITATIONS`)

1. `lexical_english_centric_reach_inherited_from_v1_v2`
2. `shadow_fragility_measured_under_six_frozen_transforms_only`
3. `no_external_submitter_yet_all_fixtures_self_authored`
4. `reconciliation_requires_redactor_manifest_and_segment_map`
5. `public_tier_proves_structure_and_binding_never_byte_correctness`
6. `lane_b_process_isolated_not_implementation_independent`
7. `span_extractor_is_stage4y_code_gate_agreement_machine_checked_not_assumed`
8. `literal_marker_detection_is_conservative_prose_must_escape_or_declare`

### The wedge (pinned primaries; source-precision guard applied)

**The wound, verbatim.** External review of frontier safety narratives exists
today and cannot recompute what it reads:

- Barrett et al., _Lessons from External Review of DeepMind's Scheming
  Inability Safety Case_ (arXiv 2604.21964, pinned 2026-07-08 from the PDF):
  _"In the case of the GDM safety case, if the associated artifacts exist, we
  did not have access to them, since they were not published along with GDM's
  paper."_ Process recommendation: reviewers should obtain _"all critical
  system-safety-engineering artifacts that support the safety case, at minimum
  those concerned with identifying hazards, quantifying risks, and deriving
  associated safety requirements."_ Review cost: six reviewers, ~4
  person-months. Same paper: _"The closest related work that we are aware of
  is METR's work reviewing Anthropic's risk reports."_
- METR, _Review of the "Risks from automated R&D" section in the Anthropic
  Risk Report (February 2026)_ (metr.org, 2026-05-08): METR "take[s] issue
  with the adequacy of evidence the report provides" and hand-caught a
  miscounted survey response (reported from METR's blog + X post; figures
  soft-pinned). METR's pilot flow — private report → participant approval →
  public report — is structurally the VDR public/private reconciliation flow,
  today done with prose and trust.
- The **submitted-document incident cluster** (all public reporting, no
  fixture names a party): Deloitte Australia partial refund on a $290K
  government report with fabricated citations (Oct 2025); Deloitte Canada
  $1.6M provincial report (Nov 2025); EY Canada study withdrawn, 16/27
  references hallucinated (May 2026); KPMG flagship report, 40/45 citations
  fake (Jun 2026); South Africa national AI policy withdrawn (Apr 2026);
  1,200+ court sanction instances worldwide, ~$145K in Q1-2026 US sanctions
  alone.
- The **redaction incident** (Law 1's grounding): DOJ Epstein-files release,
  Dec 2025 — redactions that were paint over live text; thousands of documents
  pulled; ~100 victims' information exposed (CNN/PBS, pinned in gap-hunt
  notes). Redaction geometry failures are a national-scale wound.
- **Regulatory timing:** the Commission's draft Art-73 guidance + reporting
  template (consultation closed 2025-11-07) applies from **2026-08-02**; the
  GPAI systemic-risk serious-incident template is already published (Nov
  2025, Code of Practice Commitment 9, EU SEND). 4Y ships weeks before the
  world starts filing documents in exactly this shape.

**One-line wedge:** _4Y does not judge a document. It makes the document's
detector reach, redaction geometry, and shadow fragility reproducible without
publishing the document text._

**Prior-art seam table (each concedes the gap in its own words or method):**

| Prior art                                                                                                                                                                                                                            | What it does                                                       | The seam VDR fills                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **GPTZero** hallucination check (felled EY & KPMG)                                                                                                                                                                                   | web-lookup + human-expert confirmation of citation existence       | not offline-recomputable, not attestable; different axis (citation existence vs gate-coverage geometry)                                |
| **X-Ray** (Free Law Project)                                                                                                                                                                                                         | detects bad redactions (excision failures)                         | detection of failures vs **attestation of geometry**; no signature, no partition, no reconciliation                                    |
| **Edact-Ray** (PoPETs 2023)                                                                                                                                                                                                          | attacks redactions via glyph-position structure (~80K guesses/sec) | the published attack model our public/audit split answers; attack vs attest                                                            |
| **OSCAL** + arXiv 2604.13767 (_"Making AI Compliance Evidence Machine-Readable"_, pinned: proposes _"OSCAL — the NIST standard adopted for FedRAMP cybersecurity compliance — as a candidate interchange format for AI governance"_) | structures compliance evidence machine-readably                    | structuring ≠ recomputation (assessed from abstract; marked as our assessment); VDR emits INTO their format via `vdr_oscal_projection` |
| **Assurance 2.0 / CAE** (Barrett et al.'s method)                                                                                                                                                                                    | structures safety-case _arguments_ for human review                | arguments, not arithmetic; their own recommendation is artifact access — VDR is the artifact                                           |
| **C2PA / in-toto**                                                                                                                                                                                                                   | sign provenance of documents/builds                                | provenance of bytes, never content geometry; nobody signs a partition                                                                  |

**Founder's ledger (named actors + single blocker each; public wording
provider-agnostic):**

| Actor                                                                 | Runs what tomorrow                                                                              | Single blocker                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **METR / RSP external reviewers** (LTBT-approved under RSP v3.x)      | audit-mode map over the private Risk Report; public map published beside the redacted version   | adopting the instrument into their live pilot — the minted pilot socket |
| **Anthropic** — Risk Report author side                               | ships public map + reconciliation commitment WITH the redacted report                           | same pilot                                                              |
| **EU market-surveillance authority / AI Office**                      | public-tier verify over Art-73 / GPAI incident filings (template-shaped fixtures prove the fit) | final guidance lands 2026-08-02                                         |
| **NIST CAISI** (AI 800-2 post-comment phase)                          | corpus + map as a worked reproducible-evaluation example; OSCAL projection speaks their format  | contribution channel                                                    |
| **Any government buyer of consulting reports** (the incident cluster) | pre-acceptance public-tier map over a delivered report                                          | procurement adoption                                                    |

### Four-axis scorecard (spec-time; re-score honestly at closeout)

| Axis                     | Score   | What moves it higher (buildable debts, not decoration)                                                                                                                                                                                  |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                  | **9.5** | content-free structural residue map + redaction-as-region + OSCAL projection + map delta; 10 needs the executed pilot                                                                                                                   |
| Frontier                 | **9.4** | first signed deterministic instrument in a genre whose literature calls reproducibility "optional, fragmented, unstandardised"; privacy design anchored to Edact-Ray; 10 = an external reviewer uses it in a real review                |
| Lab/regulator usefulness | **9.9** | METR×Anthropic review live TODAY with a hand-caught miscount in the fixture-shaped document; enforcement date 25 days out; OSCAL projection; the last 0.1 is locked behind `submitted_document_pilot_deferred` — a debt, not decoration |
| Constitution             | **9.6** | tiered honesty applied to our own publication practice; "counted, not erased" now protects real victims; a public tier that refuses to fake teeth                                                                                       |

**The 10-version delta, named out loud:** a real external party (METR-class
reviewer or market-surveillance authority) runs `vdr-verifier.html` on a real
document and publishes the map. That is `submitted_document_pilot_deferred`,
minted in §1, tracked like every IOU.
