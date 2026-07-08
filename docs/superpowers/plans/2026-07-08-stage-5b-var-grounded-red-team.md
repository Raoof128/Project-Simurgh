# Stage 5B — VAR (Verifiable Adversarial Readout) — TDD Implementation Plan

**Motto: AnthropicSafe First, then ReviewerSafe.** Spec:
`docs/superpowers/specs/2026-07-08-stage-5b-var-grounded-red-team-design.md`.
Every task is **test-first**: write the failing test, watch it fail for the _right_ reason,
write the minimal code, green, `npm run format`, commit (neutral message, **no attribution
trailer anywhere**). Build from the 5A skeleton (`stage5a/`) + the 4U red-team machinery
(`stage4u/`). Read the gotcha ledger below **before Task 1**.

---

## Gotcha ledger (each cost a real CI round in a prior stage — read first)

1. **Additive-code golden ripple** (4R/4S/4M/4N/5A): adding raw codes 210–224 disturbs ≥6
   `exit-map.json` goldens **and** the inline literal `RUN_LEVEL_BY_RAW` map in
   `exitWrapper.test.js`. Regenerate goldens **only under Node 26** (`/opt/homebrew/opt/node@26/bin`);
   confirm the diff is limited to the exit-map files + the inline map.
2. **Never name an identifier `VAR`/`var`** — JS reserved word. Use `VAR_*` prefixes or
   `varCore`; the wrapper suffix `_VAR` (`INTERNAL_FAIL_CLOSED_VAR`) is safe.
3. **`canonicalJson` never `JSON.stringify`** (4X): compare aggregates/ledgers via
   `canonicalJson`, not `JSON.stringify`.
4. **Torch stays OUT of CI** (4Z): the lens-VJP code imports torch/transformers; it must be
   absent from every `node --test` / pytest glob **and** `scripts/check.sh`. Add boundary asserts
   (`lanec.test.js` pattern) — `validateCeremony` validates ceremony shape **without importing
   torch**.
5. **`node --test <bare-dir>` fails** (4K) — always pass an explicit `*.test.js` glob.
6. **`npm test` = unit ONLY** (4L) — never shell `rg`/`find` inside a unit test; e2e nets are a
   separate glob.
7. **Fixture trips the _claimed_ code, not an easier one** (5A Task-6): a mutation aimed at 5A
   raw 205 may trip 5A 201 first. The corpus builder MUST assert each attack's **exact**
   `target_raw` (Task 10).
8. **`keyDigest = sha256(raw PEM)`**, `recordDigest = "sha256:" + sha256(canonicalJson(...))`,
   `merkleRootSorted` odd-carry — copy verbatim from `stage5a/core/*`.
9. **Prettier mangles bare `_`** and underscore-emphasis in Markdown; run `npm run format:check`
   on spec/plan/README before push (5A/4W shipped unformatted once).
10. **Rebase-merge diverges local main** (4O): after merge, `git reset --hard origin/main`
    before tagging.
11. **CLI main-guard**: `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`
    — copy from `stage5a/node/verify-stage5a-attestation.mjs`.
12. **Byte-stability is MEASURED, not assumed** (spec §1): the 1B CPU capture is `cmp`-gated; if
    non-deterministic, hash-anchor + sign the limitation. Do not write "byte-stable" until the
    `cmp` passes.
13. **`model_refused` / `lane_disabled` cannot come from a Lane A synthetic** (gauntlet): all 46
    scheduled attacks are synthetic mutations scored against frozen verifiers → each is
    `survived` or `bypass`. `lane_disabled` fixtures are attacks routed to the **disabled** live
    lane; `model_refused` exists ONLY as a **sealed recorded refusal** (4U Fable precedent),
    never a live call in CI. The ASR denominator (`survived + bypass`) already excludes both.
14. **Do NOT modify a frozen predecessor** (kernel posture): 5B imports 4V–5A evaluators
    read-only and copies (not edits) the 4Z capture harness. Zero bytes of 4V/4W/4X/4Y/4Z/5A
    change; a bypass is a recorded finding, never an in-stage patch to a prior verifier.

---

## File layout (mirrors 5A; new stage dir `tools/simurgh-attestation/stage5b/`)

```
stage5b/
  constants.mjs
  core/charter.mjs          # precommit charter: 212 campaign, 213 unscheduled, 219 structural precommit
  core/captureBinding.mjs   # No Author's Map: 214/215 precommitted-readout reconciliation
  core/attackModel.mjs      # 7 families, 46 attacks, mutations, target routing, expected_target_raw
  core/findingLedger.mjs    # finding records: 216 classify, 217/218 No Silent Bypass, 220 severity lock
  core/asrCore.mjs          # 221 partition, 222 ASR recompute, 223 tallies + floor reconciliation
  core/varCore.mjs          # 210 schema, 211 signature, evaluateVar (VAR_CHECK_ORDER), 224 wrapper
  node/greenBundle.mjs      # green + tampered bundles; drives frozen 4v–5a target verifiers
  node/build-stage5b-corpus.mjs      # 46-attack corpus + fixture-integrity gate
  node/build-stage5b-fixtures.mjs    # signed bundles, every code both tiers
  node/build-stage5b-attestation.mjs # named CLI (mirrors 5A)
  node/verify-stage5b-attestation.mjs
  laneb/recompute-child.mjs
  laneb/run-laneb-var-ceremony.mjs
  lanec/capture-workspace-readout.py # COPIED from 4Z + elided lens VJP completed here
  lanec/ceremonyCore.mjs    # 5B-only ceremony-shape validation shim (no 4Z edit)
  lanec/run-var-ceremony.py # orchestrates capture + narrative + attest; --dry-run
  lanec/README.md
  python/var_parity.py
  browser/var-verifier.html
  browser/inject-csp.mjs
proofs/stage5b/AdversarialReadout.lean   # 7 theorems
proofs/stage5b/lean-toolchain
```

Plus: **copy** the 4Z capture harness into `stage5b/lanec/capture-workspace-readout.py` and
complete the elided lens VJP **there**. The frozen 4Z file stays **byte-untouched**.

---

## Task 1 — Constants + exit codes (spec §0, §2, §3)

**Test first** (`tests/unit/llmShield/stage5b/constants.test.js`,
`.../exitCodes.test.js`):

- `VAR_OUTCOME_CLASSES` deep-equals `["survived","bypass","model_refused","lane_disabled"]`
  (4U verbatim — parity).
- `VAR_ATTACK_FAMILIES` length 7. Constants declare **expected shape only** (reviewer blocker 3):
  `VAR_EXPECTED_FAMILY_TOTAL = 7` and `VAR_EXPECTED_ATTACK_TOTAL = 46`. The concrete
  `FAMILY_COUNTS` and `attack_manifest_root` are **derived from `attackModel.mjs` and frozen in
  Task 10** (after corpus integrity passes) — never frozen here, to avoid the sequencing trap.
- `VAR_NON_CLAIMS` (9), `VAR_KNOWN_LIMITATIONS` (7 + closeout slot), `VAR_RAILS` (12) — frozen,
  spec order, `Object.freeze`.
- Socket ledger: `VAR_PAID_SLOTS` = `["cross_gate_residue_benchmark_deferred"]`,
  `VAR_MINTED_SLOTS` = `["live_adversary_capture_lane_deferred"]`,
  `VAR_RESERVED_SLOTS.length === 6` and **excludes** the paid slot, **includes** the minted +
  `frontier_readout_conflict_deferred` (NOT retired).
- `VAR_PAID_SLOT_SCOPES` set-equals `VAR_PAID_SLOTS`; `cross_gate_...` scope = `"full"`.
- exitCodes: `VAR_RAW_CODES` = 210…224; `VAR_CHECK_ORDER` = [210…223] (wrapper 224 excluded);
  `RUN_LEVEL_BY_RAW[210..224] === 1`.
- **Tier split is NOT identity (gauntlet-2 P1-A).** `VAR_AUDIT_CODES` = all of 210…223.
  `VAR_PUBLIC_CODES` is a **strict subset** that EXCLUDES the truthfulness codes — the
  laundered-finding / omitted-bypass cases of **217** (public trusts the recorded `target_raw`;
  only audit re-runs the frozen target). Unit test asserts `VAR_PUBLIC_CODES ⊊ VAR_AUDIT_CODES`
  and `217 ∉ VAR_PUBLIC_CODES`. This is the honest two-tier boundary: public = structural
  integrity + recomputable ASR _from recorded findings_ + label/`target_raw` consistency (218);
  audit = the recorded findings are **true**.

**Code:** `stage5b/constants.mjs` + extend `stage4h/exitCodes.mjs`. **Golden ripple** — regen
`exit-map.json` under Node 26; update inline `exitWrapper.test.js` map (gotcha 1).

**Commit:** `feat(5b): VAR constants + raw codes 210-224`.

---

## Task 2 — Lane C: complete the lens VJP + ceremony validation (spec §5, §9.1)

**Offline compute (NOT CI-gated), CI validates shape only.**

**Test first** (`tests/e2e/llmShield/stage5b/lanec.test.js`):

- `validateCeremony(record)` accepts a well-formed `captured` and `capture_failed` record
  **without importing torch**; rejects non-finite markers, missing `declaration_digest` on
  `captured`, and a `tensor_commitment_root` not matching the tensors' recompute.
- **Boundary assert:** `run-var-ceremony.py` + `capture-workspace-readout.py` appear in **no**
  `node --test` glob and **not** in `scripts/check.sh` (grep asserts).

**Code:**

- **Own the completion in `stage5b/lanec/` — do NOT edit the frozen 4Z capture file (gauntlet):**
  copy the 4Z harness into `stage5b/lanec/capture-workspace-readout.py` and complete the elided
  lens rows there. 4Z stays byte-untouched (no predecessor changed). The lens rows:
  `torch.autograd.grad` of the post-final-norm unembedding logit of each lexicon token w.r.t.
  each (layer, position) activation, averaged over the pinned benign corpus → per-(layer,token)
  lens row; `assert_finite`; salted `tensor_commitment`.
- `stage5b/lanec/run-var-ceremony.py --dry-run` prints the ordered ceremony (capture → narrative
  → sign claim table before map revealed → attest) + frozen rails; real run needs the model.
- Add a **5B-only** ceremony validation shim `stage5b/lanec/ceremonyCore.mjs` (port the shape
  logic). **Do NOT edit `stage4z/core/captureCore.mjs`** — no ambiguous "or" (reviewer blocker 2).

**Offline build step (manual, sealed both-outcomes):** run the 1B capture on the Air →
`captured` → freeze `frozen_capture` fixture + measure byte-stability (`cmp` two runs). If
`capture_failed` or non-deterministic → ship on hash-anchored/synthetic, honestly labelled.

**Commit:** `feat(5b): Lane C lens VJP + ceremony validation (offline, torch out of CI)`.

---

## Task 3 (=3A) — charter.mjs: verifier logic ONLY, no frozen constants (212, 213, 219) (spec §3)

> **Split (reviewer blocker 4):** this task writes the charter _verifier_ against
> **placeholder** constants. The real `attack_manifest_root` + `family_counts` are frozen in
> **Task 10B** (after corpus integrity) and the charter fixtures regenerated + parity-asserted in
> **Task 10C**. Codex must NOT freeze charter constants in this task.

**Test first** (`charter.test.js`):

- `checkCharter(bundle)` → **212** when a re-signed charter's `campaign_seed`/`family_counts`/
  `attack_manifest_root` ≠ canonical constants.
- **213** when a finding scores an `attack_id` **not under** the signed `attack_manifest_root`
  (Merkle non-membership).
- **219** when the charter binds a `tensor_commitment_root`/`map_digest` field instead of only
  `capture_declaration_digest` (structural precommit — NOT a timestamp). Assert 219 fires on a
  _well-formed_ charter with the illegal binding (disjoint from 210, gotcha/P0-3).
- `manifestRoot`/`verifyInclusion` reuse `stage5a/core/manifestCore.mjs` (odd-carry parity).

**Code:** `stage5b/core/charter.mjs` (adapt `stage4u/core/charter.mjs`).

**⚠ Dependency (gauntlet-2 P1-B):** the charter's `attack_manifest_root` + `family_counts` are
**derived from the integrity-validated corpus**, so **Task 5 (attackModel) and Task 10's
integrity gate must complete first** — an attack Task 10 rejects changes the id set → changes
the root. Build order is therefore: attackModel → corpus integrity → **then** freeze these
charter constants (this task writes the _verifier_; the frozen values land after Task 10).
Do NOT freeze a manifest_root over a corpus that hasn't passed integrity.

**Commit:** `feat(5b): precommit charter — campaign/manifest/structural precommit`.

---

## Task 4 — captureBinding.mjs: No Author's Map (214, 215) (spec §1 Law 2, §3)

**Test first** (`captureBinding.test.js`):

- **214** when `frozen_capture` tensors don't reconcile with the salted `tensor_commitment_root`,
  or the root's lineage isn't the charter's `capture_declaration_digest`.
- **215** when a capture is non-finite, or `declaration_digest` ≠ charter's.
- **Honest-bound test:** a capture signed with a _different key_ but reconciling tensors PASSES
  (key identity is NOT the check — precommitted-readout is). Documents that 214 has no
  third-party-independence teeth (spec §1 P0-1).

**Code:** `stage5b/core/captureBinding.mjs`.

**Commit:** `feat(5b): captureBinding — precommitted-readout (No Author's Map)`.

---

## Task 5 — attackModel.mjs: 7 families, 46 attacks (spec §4)

**Test first** (`attackModel.test.js`):

- `VAR_ATTACK_FAMILIES` order + counts (8/8/8/6/4/6/6 = 46).
- Each attack has `{attack_id, family, target_stage, mutation, expected_target_raw}`; `target_stage`
  ∈ `{4v,4w,4x,4y,4z,5a}`; the 4 ★core families carry the `capture_grounded: true` tag.
- `applyMutation(cleanBundle, attack)` is **pure** and deterministic (seed → same bytes).
- Merkle root over the 46 sorted `attack_id`s is stable.

**Code:** `stage5b/core/attackModel.mjs` (adapt `stage4u/core/attackModel.mjs`).

**Commit:** `feat(5b): attack model — 46 attacks over 4V-5A + capture-substitution`.

---

## Task 6 — findingLedger.mjs: No Silent Bypass (216, 217, 218, 220) (spec §1, §3)

**Test first** (`findingLedger.test.js`):

- `classifyOutcome(finding)` → **216** when an attack maps to zero or >1 outcome class.
- **217** when a `target_raw === 0` (GREEN) finding is labelled `survived` while the mutation
  smuggled its payload (**laundered bypass**), OR a detectable bypass is absent from findings.
- **218** the mislabel-the-other-way (`bypass` label but `target_raw !== 0`).
- **220** a `bypass` finding whose severity is absent from `known_limitations`.
- **A Bypass Is Not a Break:** a correctly-disclosed `bypass` with signed severity yields a
  clean finding record (content, not failure).

**Code:** `stage5b/core/findingLedger.mjs` (adapt `stage4u/core/findingLedger.mjs`).

**Commit:** `feat(5b): finding ledger — No Silent Bypass + severity lock`.

---

## Task 7 — asrCore.mjs: partition, ASR, tallies, floor reconciliation (221, 222, 223) (spec §3, §4)

**Test first** (`asrCore.test.js`):

- **221** partition: finding `attack_id` set ≠ scheduled set (uncovered/double-covered).
- **222** ASR recompute: `asr = bypasses / (survived + bypass)`; `model_refused` and
  `lane_disabled` **excluded from denominator** (P1-5). A hand-edited `aggregates.asr` trips 222.
- **223** tally mismatch (per-class/per-family) **and** `floor_reconciliation`: a residue
  `bypass` count **≤ signed floor** ⇒ `corroborated`; **> floor** without a new signed finding
  ⇒ 223 (Signed-Floor Corroboration).
- `tallies()` returns the 4 class counts + per-family counts; sum = 46.

**Code:** `stage5b/core/asrCore.mjs`. **Floor is RECOMPUTED, not hardcoded (gauntlet):** import
4X's `residueLedger.mjs` fields `metamorphic_slip_rate_v2` + `residue_delta.irreducible` (and the
4Y equivalent) from their **signed** ledgers and reconcile 5B's residue bypasses against those —
the floor is anchored to the predecessor's attestation, never a magic number.

**Commit:** `feat(5b): ASR recompute + partition + Signed-Floor Corroboration`.

---

## Task 8 — varCore.mjs: schema, signature, evaluateVar frozen order, wrapper (210, 211, 224) (spec §3)

**Test first** (`varCore.test.js`):

- **210** schema: any malformed `simurgh.var.*`; a `tensor_commitment_root` **key in a charter**
  routes to **219 not 210** (charter schema has no such slot → precommit check owns it) —
  reachability assert (P0-3).
- **211** signature invalid on any artifact.
- `evaluateVar(bundle, {tier, targetPubKeys})` runs `VAR_CHECK_ORDER` 210→223, **first-failure
  wins**; a clean bundle → raw 0.
- `evaluateVarSafe` wraps in try/catch → **224** `INTERNAL_FAIL_CLOSED_VAR`.
- Optional-artifact skip: a bundle without the (disabled) live lane doesn't trip a spurious code.
- **Schema-scope note (reviewer medium):** 210 validates top-level artifact shape + required
  field _types_ only; it must NOT reject the charter-reserved illegal precommit fields
  (`tensor_commitment_root`/`map_digest`) that are intentionally routed to **219** — else the
  first-failure order is dishonest. Test asserts a charter carrying `tensor_commitment_root`
  returns 219, not 210.

**Code:** `stage5b/core/varCore.mjs` (mirror `stage5a/core/vncCore.mjs`).

**Commit:** `feat(5b): varCore — schema/signature/evaluateVar frozen order + wrapper`.

---

## Task 9 — greenBundle.mjs: target-verifier drivers (spec §5, §9)

**Test first** (`fixtures.test.js` part 1):

- `makeGreenBundle()` assembles charter + capture_binding + 46 clean findings + attestation
  → `evaluateVar` raw **0** both tiers.
- `driveTarget(attack)` imports the **frozen** evaluator for `attack.target_stage` — **verified
  exact exports (gauntlet):** `evaluateContest` (4V), `evaluateNarrative` (4W), `evaluateVlr`
  (4X), `evaluateVdr` (4Y), `evaluateVwa` (4Z), `evaluateVnc` (5A) — and returns the **real**
  `target_raw` for the mutated bundle.
- **Clean-bundle sources (verified):** 4V `greenContest.mjs`, 4W `greenNarrative.mjs` expose
  green builders; **4X/4Y clean bundles are corpus-granular** (`buildAndAssertCorpus`/`writeAll`)
  — the `residue_paraphrase_slip` mutation operates at corpus level (heavier; budget for it).
- Audit tier recomputes `target_raw` via `driveTarget`; public tier trusts the recorded value +
  checks structure.

**Code:** `stage5b/node/greenBundle.mjs`. Keys: `VAR_PRIV/PUB`, `VAR_AUTHOR_PRIV/PUB`, plus the
frozen target pubkeys imported read-only. **No frozen predecessor is modified.**

**Commit:** `feat(5b): green bundle + read-only target-verifier drivers`.

---

## Task 10 — build-stage5b-corpus.mjs: 46 attacks + fixture-integrity gate (spec §4, §9.4)

**Test first** (`corpus.test.js`):

- Building the corpus **asserts each attack trips its exact `expected_target_raw`** via
  `driveTarget` — a `conflict_laundering` attack that trips 5A 201 instead of 205 **fails the
  build** (P1-7 / gotcha 7).
- Family 2 emits the **cross-gate slip-rate table** (4X gate vs 4Y gate on the shared paraphrase
  set) — the socket payment artifact.
- **Integrity precedes the charter freeze (P1-B):** the validated 46-id set is what the charter's
  `attack_manifest_root` + `family_counts` are frozen from. If integrity rejects an attack, adjust
  the corpus until 46 buildable attacks pass, THEN freeze the charter constants — never the
  reverse. Corpus Merkle root then matches the charter's `attack_manifest_root` by construction.

**Code:** `stage5b/node/build-stage5b-corpus.mjs`.

**Commit:** `feat(5b): 46-attack corpus with fixture-integrity gate + slip-rate table`.

### Task 10B — freeze charter constants from the validated corpus (reviewer blocker 4)

After integrity passes on the 46-attack corpus, derive + freeze the concrete `FAMILY_COUNTS` and
`attack_manifest_root` (Merkle over the validated sorted ids) into `constants.mjs`. Assert
`sum(FAMILY_COUNTS) === VAR_EXPECTED_ATTACK_TOTAL (46)` and `families === 7`.
**Commit:** `feat(5b): freeze charter constants from integrity-validated corpus`.

### Task 10C — regenerate charter fixtures + assert root/count parity

Rebuild the charter fixture with the frozen constants; assert the corpus Merkle root == the
charter's `attack_manifest_root` and per-family counts match. `checkCharter` (Task 3A) now runs
against the real frozen values (212/213 reachable).
**Commit:** `test(5b): charter fixtures + root/count parity`.

---

## Task 11 — Fixtures + CLIs, byte-stable (spec §5)

**Test first** (`fixtures.test.js` part 2):

- The fixture index covers **every raw 210–224**, each in the tier(s) it is **reachable** in
  (P1-A): structural/arithmetic codes in both `public_raw`/`audit_raw`; the audit-only
  truthfulness case of **217** (laundered/omitted bypass) asserted **only** in the audit tier —
  a public-tier verify of that fixture returns 0 by design (public trusts the recorded value).
  Headline fixture is a clean survived-corpus with the honest floor-reconciled residue bypasses
  recorded.
- **224 is wrapper-only (reviewer medium):** raw 224 is excluded from `VAR_CHECK_ORDER` and must
  be reached ONLY through `evaluateVarSafe`'s injected internal-exception path — never by
  `evaluateVar`'s normal check order. Its fixture uses a fault-injection hook, not a malformed
  bundle.
- Building fixtures twice is `cmp`-identical (byte-stable; evidence dir prettier-ignored).
- `verify-stage5b-attestation.mjs --all --tier {public,audit}` matches the index; exits raw code.

**Code:** `stage5b/node/{build-stage5b-fixtures,verify-stage5b-attestation,build-stage5b-attestation}.mjs`;
evidence at `docs/research/llm-shield/evidence/stage-5b/`. Test keys under
`tests/fixtures/llmShield/stage5b/test-keys/INSECURE_FIXTURE_ONLY_var{,-author}.pem`.

**Commit:** `feat(5b): byte-stable fixtures (every code, both tiers) + verify/build CLIs`.

---

## Task 12 — Lane B blind ceremony (spec §5)

**Test first** (`tests/e2e/llmShield/stage5b/laneb.test.js`):

- `run-laneb-var-ceremony.mjs` spawns `recompute-child.mjs`, which re-derives ASR + partition +
  floor reconciliation from pinned findings with **no operator hints**; child exits **2** on
  forbidden env (`OPERATOR_*`) or leaked keys (`committed_asr`/`expected_raw`/`evidence/`).
- **Truly blind (reviewer medium):** the child runs with `cwd` set to a **sterile temp dir**
  containing only the minimal pinned findings file — no repo `evidence/` dir, fixture index, or
  `expected_raw` map reachable by path. Blind, not sunglasses-indoors blind.
- Ceremony output equals the committed aggregates.

**Code:** `stage5b/laneb/{recompute-child,run-laneb-var-ceremony}.mjs` (adapt 5A laneb).

**Commit:** `test(5b): Lane B blind recompute ceremony`.

---

## Task 13 — Python parity (spec §5)

**Test first** (`tests/e2e/llmShield/stage5b/parity.test.js`):

- `python/var_parity.py` (stdlib only) recomputes — over the fixture corpus — the ASR,
  outcome classification, Merkle root, partition, and floor reconciliation; JS ↔ Python
  canonical strings match. Ed25519 excluded (Node authoritative).

**Code:** `stage5b/python/var_parity.py` (modes: `asr`, `classify`, `merkle`, `partition`,
`floor`, `canonical`). Reuse `stage5a/python/vnc_parity.py` canonical/record-digest helpers.

**Commit:** `test(5b): JS<->Python parity (2nd impl)`.

---

## Task 14 — Browser verifier (spec §5)

**Test first** (`tests/e2e/llmShield/stage5b/browserParity.test.js`, node:vm +
`crypto.webcrypto`):

- `browser/var-verifier.html` recomputes ASR + partition + verifies the Ed25519 attestation
  in-page (WebCrypto), matching Node for a clean bundle and flagging a tampered one.
- **Compatibility gate (reviewer medium):** if WebCrypto Ed25519 is unavailable, the verifier
  **fails closed** with `ed25519_not_supported` (never a silent pass); the Node CLI stays
  authoritative. Kills the environment-sensitivity flake.
- CSP is a no-egress **hash-CSP**; `inject-csp.mjs` writes the sha256 **after** prettier
  (base64 `/` preserved; gotcha 9).

**Code:** `stage5b/browser/{var-verifier.html,inject-csp.mjs}` (adapt 5A vnc-verifier).

**Commit:** `feat(5b): browser verifier (WebCrypto Ed25519 + ASR recompute, hash-CSP)`.

---

## Task 15 — Lean: 7 theorems (spec §6)

**Test first** (CI wiring in `.github/workflows/stage-4-lean-proofs.yml`; `lake build` green,
zero `sorry`):

1. `outcomePartitionTotal` 2. `noSilentBypassSound` 3. `asrConservation`
2. `precommittedReadoutSound` 5. `precommitMonotone` 6. `severityLockTotal`
3. `floorReconciliationSound`.

**Lean edge (gauntlet-2 P2):** `asrConservation` must define `asr = 0` when the denominator
`survived + bypass = 0` (a corpus of only `lane_disabled`/`model_refused`) — else the `0/0` case
makes the theorem false. Encode ASR as a guarded ratio; the theorem carries the `denom = 0 ⇒
asr = 0` branch.

**Code:** `proofs/stage5b/AdversarialReadout.lean` (+ `lean-toolchain`). Lean 4.15 idioms: hand
the IH to `omega` via `have ih := thm xs`; decide-Bool via `simp only [decide_eq_true_eq]`
(gotcha, 5A).

**Commit:** `proof(5b): seven Lean theorems (zero sorry)`.

---

## Task 16 — K7 all-functions net + reproduce (spec §9)

**Test first** (`tests/e2e/llmShield/stage5b/k7AllFunctions.test.js`):

- Every `stage5b` export is exercised at least once.
- **Tamper matrix:** flip each bound field (charter campaign, manifest membership, capture
  reconciliation, declaration binding, finding label, severity, ASR, partition) → assert the
  **correct first-failure** raw code (frozen order).
- **Cross-stage invariant:** a mutated bundle's recorded `target_raw` equals the frozen target
  verifier's real output (audit tier).
- **Read-only predecessor assertion (reviewer medium, enforces gotcha 14):** `git diff` every
  imported `stage4v/4w/4x/4y/4z/5a` file against `merge-base HEAD origin/main` → must be
  **byte-identical**. Sole allowed exception: `stage4h/exitCodes.mjs` may only **append** raw
  codes 210–224; every pre-existing block must be byte-unchanged.

**Code:** `scripts/reproduce-llm-shield-stage5b.sh` (public+audit verify, byte-stability, Lane B,
Python, browser+K7) + wire into `scripts/check-e2e.sh`. **Run all prior reproduce scripts** —
additive codes must not disturb sealed history.

**Commit:** `test(5b): K7 all-functions net + reproduce script + check-e2e wiring`.

---

## Task 17 — Closeout (spec §8; feedback: four-axis + full-E2E)

- Security-audit key allowlist: add the stage5b fixture key **by path regex (no digits)** to
  `scripts/security-audit-llm-shield-stage3m.sh` **and**
  `scripts/security-audit-llm-shield-stage3o.sh` (explicit paths — no brace expansion; 4P
  precedent). _(Reviewer suggested `stage4o` — rejected: no `stage4o.sh` exists; every stage
  since 3M allowlists in the **3m/3o** audits per git log.)_
- Full Node-26 e2e nets + `bash scripts/check.sh` locally (gotcha: run before push, not
  `npm test` only).
- Docs: `docs/research/llm-shield/{ADVERSARIAL_READOUT.md, STAGE_5B_CLOSEOUT.md}`; README banner
  - constitution-alignment update; **the signed bypass list** (id + severity, if any).
- Honest **re-score** (spec §8 was 9.4/9.2/9.6/9.5 — adjust for what actually shipped, esp. if
  the real capture ran vs. hash-anchored; if the live lane stayed minted, Frontier holds ~9.2).
- Memory (`project_stage-5b-var.md` + MEMORY.md pointer) + Zurvan decision ADR (**search
  duplicates first**).

**Commit:** `docs(5b): closeout + honest re-score + README banner`.

---

## End-state definition of done (MANDATORY before tag)

- `bash scripts/reproduce-llm-shield-stage5b.sh` → ALL PASS (Node 26); **all prior reproduce
  scripts still green**.
- `bash scripts/check.sh` locally green.
- K7 net + both-tier `--all` verify green; fixtures `cmp`-byte-stable.
- 7 Lean theorems build, zero `sorry`.
- If a real bypass was found: it is **disclosed by id + severity** in `known_limitations` and the
  attestation is honest (No Silent Bypass) — a found bypass is a shipped result, not a blocker.
