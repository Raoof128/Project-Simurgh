# Stage 5A — VNC: Verifiable Narrative–Workspace Conflict (TDD plan)

> **Motto: AnthropicSafe First, then ReviewerSafe.**
> Spec: `docs/superpowers/specs/2026-07-08-stage-5a-vnc-narrative-workspace-conflict-design.md`
> Target tag: `v2.36.0-stage-5a-vnc` (prev `v2.35.0-stage-4z-vwa`; check
> `git tag --sort=-creatordate` again before tagging).
> Scorecard (spec-time, re-score at closeout): **9.5 / 9.4 / 9.7 / 9.8**.
> Kernel: **READ-ONLY** — zero changes to `src/llmShield`.
> Raw codes **199–208**, wrapper `INTERNAL_FAIL_CLOSED_VNC: 209` LAST.
> Ledger: PAYS `workspace_narrative_conflict_deferred` (full),
> `lab_readout_pilot_deferred` (artifact scope), `reflection_corpus_provenance_deferred`
> (mechanism + open-corpus scope); MINTS `frontier_readout_conflict_deferred`.

## Read before Task 1 (paid-for gotchas that apply here)

1. **Node 26 ONLY for the 4H digest builder** (`/opt/homebrew/opt/node@26/bin`)
   — Node 22 re-signs ~20 stage-4h files. Expect exactly the two
   `exit-map.json` ripples.
2. **Additive raw codes break SIX goldens** (4M→4Z lesson): the two
   exit-maps, exitWrapper inline map, 4K/4H snapshots, probe-hygiene danger
   zone, 4L e2e expected set. Regenerate deliberately, review as code.
3. **`UNKNOWN_RAW_PROBE` stays 999**; new probes use `[20x, 3]` array form
   (exit-code-probe hygiene memory; `exitCodeProbeHygiene.test.js` guards).
4. **`_VNC` suffix everywhere** — check collisions first (4X lesson: `_VLR`
   collided with VSN's bare 172). `grep -rn "VNC" tools/ tests/` BEFORE
   Task 1; no bare `INTERNAL_FAIL_CLOSED` alias.
5. **`canonicalJson`, never `JSON.stringify`,** for every compare/digest
   (4X). Token-id membership by parsed integer equality, never lexical.
6. **Fixture doctoring re-signs** (4T `resignBundle` lesson): any mutation of
   a signed artifact needs a deliberate resign-or-not decision per fixture
   (tamper_signature = do NOT resign; others = resign to isolate the target
   code).
7. **Split-tamper discipline** (4Y "183 masks 186"): each tamper fixture must
   keep every EARLIER check in `VNC_CHECK_ORDER` clean so only the intended
   code fires. Doctor the LEDGER row, not the inputs, for 205.
8. **`capture.commitments`-style shared references** (4Z F7): always
   `structuredClone` when a fixture builder reuses an object across
   artifacts.
9. **Evidence dirs prettier-ignored on day one** (4K/4N):
   `docs/research/llm-shield/evidence/stage-5a/` into `.prettierignore`
   BEFORE the first build. Validate with FULL `npm run format:check`
   including spec/plan/READMEs (4V + 4Z lessons — unformatted docs shipped
   once already).
10. **`npm test` = unit ONLY; `node --test` needs explicit `*.test.js` globs**
    (4K/4L). Never shell `rg` inside a unit test.
11. **check.sh as you build** (4U memory): `node --check` false-positives on
    `.worktrees/*/node_modules`; it regenerates the banking-pilot fixture
    (revert with `git checkout`); Stage 2.7 "4321 leaked" flake rerun-clears.
12. **Do NOT commit spec/plan to local main before branching** (4O lesson) —
    branch `stage-5a-vnc` first, then commit; rebase-merge diverges
    otherwise (fix = `git reset --hard origin/main`).
13. **CSP hashes**: prettier the HTML BEFORE hash injection via a Node script
    FILE (base64 contains `/`; inline `node -e` hits quoting); never
    reformat after; consistency test guards drift (4Z #11).
14. **Prettier mangles bare `_` and line-initial `+`** in markdown — reword,
    don't fight it (4W + this spec's own ledger-note corruption).
15. **zsh word-splitting**: multi-item shell loops run under `bash <<'BASH'`.
16. **Security-audit allowlists are PATH REGEXES with no digits** (4P), both
    3m and 3o scripts, continuation-backslash checked (4Y).
17. **Neutral commit/PR/release messages; no attribution trailers anywhere.**

## Repo truths verified while planning (do not re-derive)

- `stage4h/exitCodes.mjs` line 626 comment: "199 remains headroom" — 199 is
  free; current max is 198.
- `stage4m/core/canonical.mjs` exports `canonicalJson`, `sha256Hex`,
  `recordDigest` (= `sha256:` + sha256(canonicalJson)), `merkleRootSorted`,
  `DIGEST_RE`.
- `stage4z/core/vwaCore.mjs` exports `evaluateVwa(bundle, {tier, publicKeyPem})`,
  `evaluateVwaSafe`, `signAttestation`, `checkSignature`, `attestationBody`.
  The 4Z public tier verifies with tensors withheld — VNC delegates to it
  verbatim for the embedded map (201).
- `stage4w/core/narrativeCore.mjs` (READ, gauntlet-verified): the narrative
  is `{ content, signature, author_pub_key_pem }`; the Ed25519 signature
  covers `canonicalJson(content)` ONLY and verifies against the EMBEDDED
  `author_pub_key_pem` (the 163 `signatureCheck` pattern — reuse it
  verbatim). `content.binding` is built by
  `buildNarrativeBinding(capsuleBundle, …)` — **`buildNarrative` REQUIRES a
  4T capsule bundle; a capsule-less 4W narrative cannot exist**
  (gauntlet P0). Consequences: (a) fixture narratives ride the pinned 4T
  green capsule via `buildGreenBundle()` from
  `stage4t/node/greenCapsule.mjs` (the exact `greenNarrative.mjs` pattern)
  with CUSTOM introspective body/spans; (b) the Lane C ceremony builds a
  minimal session capsule the same way; (c) VNC verifies signature +
  `checkSpanGeometry` and does NOT re-verify the capsule binding or re-run
  the leakage gate (capsule-bound, out of scope — stated in the spec).
  Span fields are `start_byte`/`end_byte` (NOT `byte_start`); span key
  allowlists are strict per type — introspective claim spans are
  `unverified_prose`.
- **`narrative_digest` definition of record:** `recordDigest(narrative)`
  over the OUTER object (content + signature + author_pub_key_pem) — a
  key-swap re-sign changes the digest, so 201 catches it without any
  key-registry machinery.
- `SPAN_TYPES` from `stage4w/constants.mjs` = `["slot_bound","judgment","unverified_prose"]`.
- 4Z map public fields available for the join: `cells[].{prompt_id,t,layer,scores[],flags[]}`,
  `aggregates.flags_by_token` (string keys), `declaration_digest`,
  `theta_nano` (decimal string), `commitments`, `self_report`, `provenance`
  (verified against `vwa_parity.py` build_map).
- Fixture key naming convention: `INSECURE_FIXTURE_ONLY_vnc(.pub).pem` under
  `tests/fixtures/llmShield/stage5a/test-keys/`.
- keyDigest = `"sha256:" + sha256(raw PEM string)` (4W lesson: PEM, not DER).

## File structure (locked)

```text
tools/simurgh-attestation/stage5a/
  constants.mjs
  core/claimCore.mjs        # claim table: digest, span resolution, precommit (202)
  core/verdictCore.mjs      # hits, unreadable precedence, polarity verdicts, evidence (203, 205)
  core/partitionCore.mjs    # covered/unnarrated partition + tallies (204, 208)
  core/bindingCore.mjs      # No Borrowed Story (201): narrative sig + 4Z delegation
  core/manifestCore.mjs     # RCP manifest: Merkle inclusion + principle totality (206)
  core/adapterCore.mjs      # pilot adaptation conformance (207)
  core/vncCore.mjs          # schema (199), signature (200), evaluateVnc, safe wrapper (209)
  node/build-stage5a-fixtures.mjs
  node/build-stage5a-attestation.mjs
  node/verify-stage5a-attestation.mjs   # --tier public|audit
  node/adapt-external-readout.mjs       # pilot ingest (offline once)
  node/build-reflection-manifest.mjs    # RCP over the pinned CC0 constitution snapshot
  laneb/recompute-child.mjs
  laneb/run-laneb-recompute-ceremony.mjs
  lanec/run-conflict-ceremony.py        # offline: 4Z capture + narrative + table-before-map
  lanec/README.md
  python/vnc_parity.py
  browser/vnc-verifier.html
proofs/stage5a/NarrativeConflict.lean
tests/unit/llmShield/stage5a/*.test.js
tests/e2e/llmShield/stage5a/{laneb,parity,browserParity,k7AllFunctions}.test.js
tests/fixtures/llmShield/stage5a/  (+ test-keys/)
docs/research/llm-shield/evidence/stage-5a/          # prettier-ignored day one
docs/research/llm-shield/NARRATIVE_WORKSPACE_CONFLICT.md
docs/research/llm-shield/STAGE_5A_CLOSEOUT.md
scripts/reproduce-llm-shield-stage5a.sh
```

### Task 1: Raw codes 199–209 + probe hygiene + golden ripple

**Test first** (`exitCodes.test.js` additions):

- `VNC_RAW_CODES` maps eleven names to 199–209;
  `VNC_RAW_CODES.INTERNAL_FAIL_CLOSED_VNC === 209` (`_VNC`-suffixed, no bare
  alias).
- `VNC_CHECK_ORDER` deep-equals `[199,200,201,202,203,204,205,206,207,208]`
  (209 excluded, asserted last-and-separate).
- Every 199–209 has `RUN_LEVEL_BY_RAW === 1`; `getRunLevel(999) === 3`.
- `VNC_PUBLIC_CODES` deep-equals `VNC_AUDIT_CODES` deep-equals
  `[199…208]` — tier depth differs, code SET does not (spec §2); assert
  public ⊆ audit anyway (mirrors Lean `publicSubsetAudit`).

**Implement:** append to `stage4h/exitCodes.mjs` (after the VWA block,
updating its "199 remains headroom" comment to point at 210). Regenerate
BOTH `exit-map.json` **under Node 26**; update exitWrapper inline map +
4K/4H snapshots + probe-hygiene danger zone + 4L expected set.

**Verify:** exit unit tests green; 4H/4K/4L/4W/4X/4Y/4Z e2e nets green;
golden diff limited to the six known ripples.

### Task 2: Constants + the three-payment ledger

**Test first** (`constants.test.js`): schema strings
`simurgh.vnc.{claim_table,ledger,reflection_manifest,pilot_adaptation,attestation}.v1`;
`VNC_VERDICTS = ["corroborated","contradicted","unreadable"]` frozen;
`VNC_POLARITIES = ["asserts_unflagged","asserts_flagged"]` frozen;
`VNC_SCOPE_RULE = "all_cells"`; `VNC_NON_CLAIMS` (11), `VNC_KNOWN_LIMITATIONS`
(9 — spec §4 list), `VNC_RAILS` (5, inherited verbatim) frozen & non-empty.
Ledger arrays, exact:

```js
VNC_PAID_SLOTS = Object.freeze([
  "workspace_narrative_conflict_deferred", // full
  "lab_readout_pilot_deferred", // artifact scope (residual in scorecard)
  "reflection_corpus_provenance_deferred", // mechanism + open-corpus scope
]);
VNC_MINTED_SLOTS = Object.freeze(["frontier_readout_conflict_deferred"]);
// 4Z reserved set MINUS the three paid, PLUS the one minted:
VNC_RESERVED_SLOTS = Object.freeze([
  "irreducible_semantic_residue_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "cross_gate_residue_benchmark_deferred",
  "submitted_document_pilot_deferred",
  "frontier_readout_conflict_deferred",
]);
```

Assert each paid slot ABSENT from `VNC_RESERVED_SLOTS`; assert
`VNC_RESERVED_SLOTS.length === 6` (net debt −2, checked as arithmetic).
Re-import `SPAN_TYPES` from 4W (single source of truth, 4Z precedent).

**Implement:** `stage5a/constants.mjs`. **Verify:** unit green.

### Task 3: `claimCore` — claim table digest, span resolution, precommit (202)

**Test first** (`claimCore.test.js`):

- `claimTableDigest(table) === recordDigest(table)`; table binds
  `narrative_digest` + `declaration_digest`; a table carrying a `map_digest`
  FIELD fails schema shape (Law 3 is structural, not procedural — the
  self-gauntlet P0 baked into the schema).
- `resolveSpan(narrative, span_ref)`: `start_byte`/`end_byte` (4W field
  names — gauntlet fix) resolve inside the narrative body on UTF-8
  code-point boundaries (reuse `checkSpanGeometry`'s boundary helper via
  import, not copy); out-of-bounds or non-boundary → the claim is
  precommit-invalid (202 path), unit-asserted. The referenced span's `type`
  must be `unverified_prose` (v1 eligibility — spec §2); a claim pointing
  at a `judgment` or `slot_bound` span → 202, unit-asserted.
- `checkClaimTable(table, narrative, declaration)` returns `{raw:202}` for:
  digest cross-mismatch (ledger vs attestation is Task 9's wiring; here:
  table's `declaration_digest` ≠ `recordDigest(declaration)`), scope rule ≠
  `all_cells`, empty `token_ids`, duplicate `claim_id`, unresolvable
  span_ref. Clean table → `null`.
- Token ids NOT ⊆ lexicon is **valid** at table level (unreadable is a
  verdict, not an error) — asserted explicitly.

**Implement:** `core/claimCore.mjs`, pure; imports only 4M canonical + the
4W boundary helper. **Verify:** unit green.

### Task 4: `verdictCore` — hits, precedence, polarity, evidence (203, 205)

**Test first** (`verdictCore.test.js`):

- `flagRelation(map)` extracts sorted `F = [(cellKey, token_id)]` from
  `cells[].flags` (cellKey = `(prompt_id,t,layer)` canonical tuple).
- `hitsFor(claim, F)` = exact-integer membership over ALL cells; order
  `(prompt_id,t,layer,token_id)` — total, hence unique.
- `verdictFor(claim, map)`:
  - any token ∉ declared lexicon OR unresolved span → `unreadable`
    (precedence rule: partial unreadability ⇒ WHOLE claim unreadable,
    unit-asserted with a mixed token set);
  - `asserts_unflagged`: `corroborated` iff hits empty, else `contradicted`;
  - `asserts_flagged`: `corroborated` iff hits non-empty, else
    `contradicted`;
  - every verdict row carries `evidence` = sorted hits (possibly empty).
- `classify(table, map)` is TOTAL: one row per claim, sorted by `claim_id`;
  property test over generated tables (every generated claim appears exactly
  once — the Lean `verdictTotal` shadow).
- `checkClassification(ledger, table)` → `{raw:203}` on missing/extra/
  duplicate/unknown-label rows; `checkVerdicts(ledger, table, map)` →
  `{raw:205}` when recomputed rows ≠ published rows (flip one verdict,
  drop one evidence entry — both caught).
- **`conflictAntitone` behavioural shadow:** for an `asserts_unflagged`
  claim, adding a flag to the map never flips `contradicted`→`corroborated`
  (loop over generated cases); for `asserts_flagged` assert the dual is
  intentionally violable (one concrete case, documenting the restriction).

**Implement:** `core/verdictCore.mjs`. **Verify:** unit green.

### Task 5: `partitionCore` — No Silent Flag + tallies (204, 208)

**Test first** (`partitionCore.test.js`):

- `partitionFlags(ledger, map)`: `covered = ⋃ evidence`, `unnarrated =
F \ covered`, both sorted; identity `covered.length +
unnarrated.length === F.length` with disjointness — asserted.
- `checkCoverage(ledger, map)` → `{raw:204}` on: a flag in neither side, a
  flag in both, an `unnarrated_flags` entry absent from the map.
- `tallies(ledger)` recounts all seven aggregates
  (`n_claims,n_corroborated,n_contradicted,n_unreadable,n_flags,n_covered_flags,n_unnarrated_flags`);
  `checkTallies` → `{raw:208}` on any drift (mutate each of the seven once —
  seven assertions).

**Implement:** `core/partitionCore.mjs`. **Verify:** unit green.

### Task 6: `bindingCore` — No Borrowed Story (201)

**Preflight: SETTLED during the plan gauntlet** (repo-truths section): the
signature covers `canonicalJson(narrative.content)` and verifies against
the embedded `author_pub_key_pem`; `narrative_digest =
recordDigest(narrative)` over the outer object. Keep one assertion test
encoding both facts so drift in 4W surfaces here, not in production.

**Test first** (`bindingCore.test.js`):

- `checkBindings(bundle, {vwaPubKeyPem, vsnPubKeyPem})` → `{raw:201}` when:
  ledger/attestation `narrative_digest` ≠ recomputed; `map_digest` ≠
  `recordDigest(map)`; `map_attestation_digest` ≠ recomputed; the table's
  `declaration_digest` ≠ the embedded map's `declaration_digest`; the
  embedded 4Z attestation fails `evaluateVwa(…, {tier:"public"})` (delegated
  verbatim — its raw code is REPORTED inside the 201 detail, never re-mapped);
  the embedded narrative signature fails; span geometry fails.
- Clean bundle (built from Task 10's builder helpers) → `null`.
- Audit depth: with the 4Z audit bundle present, delegation runs
  `tier:"audit"`; with it withheld, audit delegation is SKIPPED and recorded
  (`vwa_audit: "skipped_withheld"`) — the 4Y asymmetry, honest and visible.

**Implement:** `core/bindingCore.mjs`. **Verify:** unit green.

### Task 7: `manifestCore` + `build-reflection-manifest.mjs` — RCP (206)

**Test first** (`manifestCore.test.js`):

- `manifestRoot(examples) === merkleRootSorted(example digests)`;
  `inclusionProof/verifyInclusion` round-trip (4O Merkle lineage).
- `checkManifest(manifest)` → `{raw:206}` on: root ≠ recompute; an example
  with empty `principle_ids` (totality — the projection's one law); a
  `principle_id` absent from the registry; a registry entry whose
  `source_digest` fails `DIGEST_RE`.
- Builder test: `build-reflection-manifest.mjs` over the committed
  constitution snapshot (`tests/fixtures/llmShield/stage5a/constitution/` —
  CC0 1.0 text, pinned revision + retrieval date recorded in a SOURCE.md;
  sliced by section slug into principle-tagged examples) is byte-stable
  (build twice, cmp) and every example carries ≥1 principle id.

**Implement:** `core/manifestCore.mjs` + the builder. License note: CC0
verified at download time; record the statement + URL in SOURCE.md.
**Verify:** unit green; builder deterministic.

### Task 8: `adapterCore` + `adapt-external-readout.mjs` — pilot (207)

**Offline step first (not CI):** download the pinned Neuronpedia gemma-2-2b
export (S3 v1 bucket); VERIFY LICENSE on the Neuronpedia terms page before
committing anything; record source URL + retrieval date + sha256 in
`evidence/stage-5a/pilot/SOURCE.md`. If the license does not permit
redistribution, commit ONLY the digest + adapter output, never the raw bytes
(the audit bundle then documents `raw_export: "digest_only_license"` —
honesty over convenience; the spec's _reported_ marker resolves here).

**Test first** (`adapterCore.test.js`):

- `adaptExport(raw, opts)` emits a valid `simurgh.vwa.map.v1` where every
  field the export lacks carries `adapter_derived: true` (salts, ceremony,
  self_report ⇒ derived-zero with marker); output is byte-stable.
- `checkAdaptation(pilot, adaptedMap)` → `{raw:207}` on: adapted map failing
  4Z public verify; ANY synthesized field missing its marker (walk the
  marker manifest); audit depth: frozen raw bytes ≠ `source_digest`.
- The pilot WFM's attestation is signed by the stage5a key with provenance
  role `adapter` — asserted; never presented as publisher-signed.

**Implement:** `core/adapterCore.mjs` + the CLI. **Verify:** unit green;
frozen pilot artifact replays in Lane A.

### Task 9: `vncCore` — schema (199), signature (200), frozen order, wrapper (209), CLIs

**Test first** (`vncCore.test.js`):

- `checkSchema(bundle, tier)` walks every artifact shape → `{raw:199}`
  (includes: claim table carrying `map_digest` — Task 3's structural law
  surfaces here too).
- `attestationBody(...)` binds
  `merkleRootSorted([claim_table_digest, ledger_digest, narrative_digest, map_attestation_digest, …optional])`;
  keyDigest = sha256(raw PEM); `signAttestation`/`checkSignature` → 200.
- `evaluateVnc(bundle, {tier, keys})` walks `VNC_CHECK_ORDER` frozen
  first-failure; optional-artifact skips recorded
  (`rcp: "absent"`, `pilot: "absent"`) — absence ≠ pass, visible in output.
- `evaluateVncSafe` returns `{raw:209}` on injected throw (monkey-patched
  core), never leaks the exception.
- CLIs: `build-stage5a-attestation.mjs` (delegates to fixture builder),
  `verify-stage5a-attestation.mjs --tier public|audit` exits raw code
  directly (0 clean).

**Implement:** `core/vncCore.mjs` + `node/*.mjs`. **Verify:** unit green.

### Task 10: Fixture builder — 16 fixtures, byte-stable, split-tamper

**Test first** (`fixtures.test.js` + goldens): build the corpus per spec §3
table (5 clean incl. `eval_awareness_conflict`, 1 pilot, 1 rcp, 9 tampers);
for each fixture assert the exact `(public, audit)` expectation; build twice
and `cmp` every file (byte-stability e2e).

Doctoring notes (decided now, not discovered):

- `eval_awareness_conflict`: synthetic map with `eval`-token flags + a
  narrative span asserting absence — verdict `contradicted`, bundle CLEAN.
- `tamper_two_stories` (205): flip the verdict row AND its tallies'
  consistency is preserved by ALSO flipping…nothing — tallies count verdict
  labels, so keep tallies matching the TAMPERED rows (else 208 masks 205);
  re-sign ledger + attestation. The check that catches it is verdict
  RECOMPUTE, not arithmetic — that is the point.
- `tamper_silent_flag` (204): remove one flag from `unnarrated_flags` AND
  from no evidence list; keep tallies consistent with the tampered lists.
- `tamper_posthoc_claim_table` (202): narrow one claim's token set,
  re-digest the table but leave the attestation's `claim_table_digest`
  stale.
- `tamper_borrowed_story` (201): swap `map_digest` to a second synthetic
  capture's digest; re-sign attestation (else 200 masks 201).
- `tamper_tally` (208): mutate ONE aggregate only; everything else clean.

Construction dependencies (gauntlet-pinned, not discovered mid-build):

- Narratives: `buildNarrative` over `buildGreenBundle()` (4T green capsule)
  with custom introspective body + `unverified_prose` spans, signed with a
  committed `vnc-author` fixture key (byte-stable — the greenNarrative
  deterministic-signer lesson).
- Synthetic 4Z maps: built with 4Z's OWN `signAttestation` + the committed
  4Z fixture key (`tests/fixtures/llmShield/stage4z/test-keys/INSECURE_FIXTURE_ONLY_vwa.pem`)
  so `evaluateVwa` delegation verifies for real — never a mocked verify.

**Implement:** `node/build-stage5a-fixtures.mjs` with deterministic salts
`sha256("vnc-fixture-salt:"+id).slice(0,16)`; commit
`INSECURE_FIXTURE_ONLY_vnc(.pub).pem` (+ `vnc-author`). **Verify:** all 16
expectations green in both tiers; goldens committed; evidence dir
prettier-ignored.

### Task 11: Lane B — blind two-process recompute ceremony

**Test first** (`tests/e2e/llmShield/stage5a/laneb.test.js`): parent copies
{narrative bytes, map bytes, claim table, provenance block} to a temp dir;
child rebuilds the LEDGER from only those inputs and emits
`canonicalJson(ledger)`; parent compares to committed. Negatives: child
exits 2 on any `OPERATOR_*` env var; exits 2 if stdin message contains
`committed_ledger` or `ledger_path`. Input rule of record: the ledger binds
provenance ⇒ the child receives provenance as INPUT DATA (a claim, not the
answer).

**Implement:** `laneb/recompute-child.mjs` +
`laneb/run-laneb-recompute-ceremony.mjs`. **Verify:** e2e green.

### Task 12: Python parity — `vnc_parity.py` (stdlib only)

**Test first** (`tests/e2e/llmShield/stage5a/parity.test.js`): digest
preflight (claim_table_digest + narrative_digest byte-equal JS↔Python),
then full-ledger `canonicalJson` equality over the whole corpus; token-id
handling integer-exact; verdict/partition/tally logic reimplemented, not
imported.

**Implement:** `python/vnc_parity.py` (modes: `decl_digest`, `ledger`,
`canonical`) mirroring `vwa_parity.py`'s shape. **Verify:** parity e2e
green over all 16 fixtures.

### Task 13: Browser verifier — `vnc-verifier.html`

**Test first** (`browserParity.test.js`): the in-page pipeline (sha256 +
canonicalJson + verdict/partition/tally recompute + **WebCrypto Ed25519**
verify) over the public bundles matches Node verdicts for every fixture;
no-egress guard (strict hash-CSP, zero external requests); CSP-hash
consistency test.

**Implement:** single self-contained HTML; reset `/g` regex `lastIndex`
(4Y browser gotcha); hash injection via Node script file AFTER prettier.
**Verify:** browser-parity e2e green; CSP consistency green.

### Task 14: Lane C ceremony + pilot freeze (OFFLINE, sealed, never CI)

`lanec/run-conflict-ceremony.py` + README (runbook, not CI):

1. Sign the 4Z declaration (existing harness contract).
2. Run the 4Z capture (`capture-workspace-readout.py`, RunPod,
   Llama-3.2-1B-Instruct pinned revision) — tensors salted-committed,
   ceremony record.
3. SAME session: benign post-task introspection prompts → transcript →
   4W span-typed narrative (`unverified_prose` claim spans), riding a
   minimal session capsule (gauntlet P0: `buildNarrative` requires one —
   built with the 4T machinery over the session records), signed.
4. Author + SIGN the claim table (binds narrative_digest +
   declaration_digest; the map is NOT yet derived/revealed — the ceremony
   record timestamps the ordering; non-claim 9 still applies).
5. Derive the map from frozen tensors; build ledger; attest.
6. Seal BOTH outcomes: `captured`/`capture_failed`; zero-conflict and
   conflict-bearing ledgers equally sealed. Never re-run until it looks
   good. Freeze into the `frozen_capture` Lane A set; rerun the 4Z cascade
   on the frozen tensors (retires the 4Z Frontier debt — record in BOTH
   closeouts).

Pilot freeze (Task 8's offline step) happens in the same working session;
after freeze, CI only ever replays.

**Verify:** harness dry-runs locally against synthetic tensors (the d=8
fixtures) end-to-end; the REAL run is a closeout-window action, sealed
either way.

### Task 15: Lean, memo, K7, reproduce, closeout

- `proofs/stage5a/NarrativeConflict.lean`: `verdictTotal`, `flagPartition`,
  `contradictionSound`, `conflictAntitone` (restricted to
  `asserts_unflagged` — the unrestricted statement is FALSE and not
  claimed), `tallyConservation`, `publicSubsetAudit`. Lean 4.15 core, zero
  sorry; wire into `stage-4-lean-proofs.yml` + sorry-grep.
- `docs/research/llm-shield/NARRATIVE_WORKSPACE_CONFLICT.md` (two-witness
  memo; provider-named citations allowed here only).
- K7 all-functions e2e net (`k7AllFunctions.test.js`): every stage5a export
  exercised + tamper matrix + cross-stage invariants (claim table rejects
  map_digest; 4Z delegation surfaces; reserved-slot arithmetic).
- `scripts/reproduce-llm-shield-stage5a.sh` (verify-only: both tiers +
  parity + Lane B + browser parity + K7); `check-e2e.sh` line
  `"Stage 5A VNC|scripts/reproduce-llm-shield-stage5a.sh"`; ALL prior
  reproduce scripts green; security-audit allowlist lines (3m + 3o, path
  regex, no digits).
- Closeout doc with re-scored scorecard (downgrade honestly if Lane C
  sealed `capture_failed` — Frontier takes the hit, stated); README banner;
  docs-accuracy pass (re-verify every documented claim against shipped
  code); memory write + Zurvan ingest (search duplicates first; decision
  ADR: three-payment ledger + declaration-binding precommit).

## Task dependency order

```text
1 → 2 → 3 → 4 → 5 → 6 (needs 3–5 helpers)
2 → 7 (manifest)      2 → 8 (adapter; offline download first)
6 → 9 → 10 → 11/12/13 (parallel once fixtures exist)
10 → 14 (dry-run needs builder helpers)
15 last (Lean can start any time after 4; everything else needs 10)
```

## Closeout ledger (fill at the end)

- [ ] 16/16 fixtures green both tiers; byte-stable (cmp ×2)
- [ ] Lane B ceremony + negatives green
- [ ] JS↔Python↔browser parity over full corpus
- [ ] Lane C REAL pair: outcome = **\_\_** (captured / capture_failed) — sealed either way; 4Z cascade rerun on frozen tensors: **\_\_**
- [ ] Pilot export: license = **\_\_**; raw bytes committed? **\_\_** (digest-only if license requires)
- [ ] RCP manifest over CC0 constitution snapshot: byte-stable, totality green
- [ ] Lean 6/6, zero sorry, CI wired
- [ ] K7 net green; ALL prior reproduce scripts green; check.sh green locally
- [ ] Sockets: 3 marked PAID (scopes stated), 1 minted, reserved = 6
- [ ] Re-scored scorecard: **\_ / \_ / \_ / \_** (+ why, if moved)
- [ ] README banner + memory + Zurvan (duplicates searched)
