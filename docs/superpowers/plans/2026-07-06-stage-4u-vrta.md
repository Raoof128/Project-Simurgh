# Stage 4U — VRTA (Verifiable Red-Team Attestation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a charter-bound, byte-reproducible adversarial red-team of the Stage-4 capability kernel and the VDCC (4S) delegation-completeness verifier, whose signed attestation proves what was attacked, the honest attack-success rate, and that the red-team could not hide its own wins — without mutating any kernel code.

**Architecture:** A new `tools/simurgh-attestation/stage4u/` tree layered on the frozen 4S primitives (`canonicalJson`, `recordDigest`, `merkleRootSorted`, Ed25519 `crypto.sign/verify`). A signed `red_team_charter` precommits an attack-manifest Merkle root; a Lane A offline corpus of ~58 seed-derived attack fixtures spans eight families; each fixture resolves to exactly one signed finding; a two-tier verifier (public structural / audit engine-rerun) recomputes the ASR; a small disabled-by-default Lane B drives live Fable-5 under signed denial-of-wallet caps; two Lean theorems pin charter-binding soundness and ASR anti-monotonicity. The kernel and the 4S verifier are imported read-only — no `authorise_*` entry is added.

**Tech Stack:** Node.js ESM (`.mjs`), `node:crypto` Ed25519, `node:test`; Python 3 stdlib (parity); Lean 4.15.0 (no mathlib); bash reproduce script. All digests via the frozen `stage4m/core/canonical.mjs`.

## Global Constraints

- **Motto in every new file header:** `AnthropicSafe First, then ReviewerSafe.` (verbatim, since Stage 4M).
- **Neutral copy everywhere:** no Claude co-author trailer, no "Claude Code" tag in any commit, PR, release, or doc.
- **Branch:** `stage-4u-vrta` · **Target tag:** `v2.29.0-stage-4u-vrta` · **Version check before tagging:** `git tag --sort=-creatordate | head`.
- **Raw codes:** 119–132, additive in `tools/simurgh-attestation/stage4h/exitCodes.mjs`. Frozen check order `119 → 120 → 121 → 122 → 123 → 124 → 125 → 126 → 127 → 128 → 129 → 130 → 131 → 132`. All rows map to `RUN_LEVEL_BY_RAW` level **1**.
- **Additive-code discipline (from `feedback_exit-code-probe-hygiene`):** never shell `rg` in a unit test; adding codes breaks hardcoded "unknown" probes and 4H/4K exit snapshots — run the full Node-26 e2e nets **and** every prior `scripts/reproduce-llm-shield-stage4*.sh` before tag, not just `npm test`. Use `UNKNOWN_RAW_PROBE` (999) for any "unmapped code" probe.
- **Read-only kernel:** no edit to `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py` or any frozen 4A–4S source. Do **not** run `black` on `capability_kernel.py`.
- **Determinism:** every digest is `recordDigest(x) = sha256:${sha256Hex(canonicalJson(x))}`. Ed25519 is deterministic → byte-stable. Signing: `crypto.sign(null, Buffer.from(canonicalJson(unsigned)), privKey).toString("hex")`; verify: `crypto.verify(null, Buffer.from(canonicalJson(unsigned)), pub, Buffer.from(sig,"hex"))`.
- **Fixture keys:** `tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_<name>.pem` — name is `[A-Za-z-]+` (NO digits), or the 3m/3o private-key audits fail.
- **Prettier-ignore all committed evidence** under `docs/research/llm-shield/evidence/stage-4u/` so reproduce `cmp` is byte-stable.
- **Node 26** for reproduce byte-stability: `/opt/homebrew/opt/node@26/bin` (from `project_stage-4h-full-chain-e2e-audit`).
- **Non-malice:** charter proves *declared scope, not inner intent*; Lane B never evades a Fable refusal — a refusal is recorded as `model_refused` and the lane moves on.

---

## File Structure

```text
tools/simurgh-attestation/stage4h/exitCodes.mjs          MODIFY  +VRTA_RAW_CODES/CHECK_ORDER/REASONS_119 + 14 RUN_LEVEL rows
tools/simurgh-attestation/stage4u/
  constants.mjs            SCHEMAS, ATTACK_FAMILIES, VRTA_NON_CLAIMS, VRTA_KNOWN_LIMITATIONS, VRTA_RAILS, DOMAINS
  core/charter.mjs         buildCharter, charterDigest, verifyCharter (120/121/122/124), attackManifestRoot
  core/attackModel.mjs     ATTACK_FIXTURE schema, validateFixture (119), expectedVerdict binding
  core/findingLedger.mjs   buildFinding, verifyLedger (125/126/131), recomputeAsr (130)
  core/dualSignal.mjs      classify(expected,observed), verifyFinding (127/128/129)
  core/vrtaCore.mjs        evaluateVrta / evaluateVrtaSafe — frozen order, 132 fail-closed
  node/build-stage4u-corpus.mjs        Lane A: seed→58 attack fixtures + manifest + charter
  node/build-stage4u-attestation.mjs   computeStructural / computeAttestation / signAttestation
  node/verify-stage4u-attestation.mjs  verifyAttestation({tier,pubKeyPem}) + CLI
  laneb/fable-attacker.mjs             capped live Fable-5 driver (disabled-by-default, lazy SDK)
  laneb/run-laneb-vrta.mjs             ceremony wrapper + verify-only replay (runVrtaLaneB)
  python/vrta_parity.py                stdlib parity for the offline outcome model
proofs/stage4u/NoSilentBypass.lean     charterBindingSound + asrMonotone (+2 lemmas)
proofs/stage4u/lean-toolchain          "leanprover/lean4:v4.15.0"
scripts/reproduce-llm-shield-stage4u.sh
docs/research/llm-shield/STAGE_4U_CLOSEOUT.md
docs/research/llm-shield/evidence/stage-4u/{fixtures,attestation,laneb}/   (generated, prettier-ignored)
tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_{vrta,vrta-charter,delegator,delegatee}.pem
tests/unit/llmShield/stage4u/{exitCodes,constants,charter,attackModel,findingLedger,dualSignal,vrtaCore,corpus,attestation,parity}.test.js
tests/e2e/llmShield/stage4u/{k7AllFunctions,laneb}.test.js
```

Modified config/golden files (Task 1): both `exit-map.json` copies, `stage4h/exitWrapper.test.js`, `.prettierignore`, `scripts/security-audit-llm-shield-stage3m.sh`, `scripts/security-audit-llm-shield-stage3o.sh`, `.github/workflows/stage-4-lean-proofs.yml`, `scripts/check-e2e.sh`.

---

## Task 1: Golden sweep + raw-code registry 119–132

**Files:**
- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (after the `VDCC_*` block near line 409 and the `RUN_LEVEL_BY_RAW` map)
- Modify: `docs/research/llm-shield/evidence/stage-4h/exit-map.json` and `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json`
- Modify: `tests/unit/llmShield/stage4h/exitWrapper.test.js` (the inline `RUN_LEVEL_BY_RAW` literal)
- Modify: `.prettierignore`, `scripts/security-audit-llm-shield-stage3m.sh`, `scripts/security-audit-llm-shield-stage3o.sh`, `.github/workflows/stage-4-lean-proofs.yml`, `scripts/check-e2e.sh`
- Test: `tests/unit/llmShield/stage4u/exitCodes.test.js`

**Interfaces:**
- Produces: `VRTA_RAW_CODES` (object, 14 entries 119–132), `VRTA_CHECK_ORDER` (array of 14, ascending), `VRTA_REASONS_119` (array of malformed-schema reasons), and `RUN_LEVEL_BY_RAW[119..132] = 1`. Consumed by every later task.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/llmShield/stage4u/exitCodes.test.js`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VRTA_RAW_CODES,
  VRTA_CHECK_ORDER,
  VRTA_REASONS_119,
  RUN_LEVEL_BY_RAW,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VRTA codes are the contiguous block 119..132", () => {
  const vals = Object.values(VRTA_RAW_CODES).sort((a, b) => a - b);
  assert.deepEqual(vals, Array.from({ length: 14 }, (_, i) => 119 + i));
});

test("check order is ascending 119..132 and covers every code once", () => {
  assert.deepEqual(VRTA_CHECK_ORDER, Array.from({ length: 14 }, (_, i) => 119 + i));
});

test("every VRTA code is run-level 1", () => {
  for (const c of VRTA_CHECK_ORDER) assert.equal(RUN_LEVEL_BY_RAW[c], 1);
});

test("named codes match the spec map", () => {
  assert.equal(VRTA_RAW_CODES.VRTA_BUNDLE_MALFORMED, 119);
  assert.equal(VRTA_RAW_CODES.CHARTER_SIGNATURE_INVALID, 120);
  assert.equal(VRTA_RAW_CODES.CHARTER_UNBOUND_ATTACK, 121);
  assert.equal(VRTA_RAW_CODES.NON_MALICE_INVARIANT_VIOLATED, 122);
  assert.equal(VRTA_RAW_CODES.LIVE_LANE_CAP_EXCEEDED, 123);
  assert.equal(VRTA_RAW_CODES.ATTACK_MANIFEST_ROOT_MISMATCH, 124);
  assert.equal(VRTA_RAW_CODES.FINDING_RECORD_MISSING, 125);
  assert.equal(VRTA_RAW_CODES.CORPUS_COUNT_MISMATCH, 126);
  assert.equal(VRTA_RAW_CODES.SELF_REPORT_RECOMPUTE_CONFLICT, 127);
  assert.equal(VRTA_RAW_CODES.OUTCOME_CLASSIFICATION_INVALID, 128);
  assert.equal(VRTA_RAW_CODES.ATTACK_NOT_REPRODUCIBLE, 129);
  assert.equal(VRTA_RAW_CODES.ASR_LEDGER_MISMATCH, 130);
  assert.equal(VRTA_RAW_CODES.SEVERITY_UNDECLARED, 131);
  assert.equal(VRTA_RAW_CODES.INTERNAL_FAIL_CLOSED, 132);
  assert.equal(UNKNOWN_RAW_PROBE, 999);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/exitCodes.test.js`
Expected: FAIL — `VRTA_RAW_CODES` is not exported.

- [ ] **Step 3: Add the registry to `exitCodes.mjs`**

Immediately after the `VDCC_REASONS_100` block (near line 421), insert:

```javascript
export const VRTA_RAW_CODES = Object.freeze({
  VRTA_BUNDLE_MALFORMED: 119,
  CHARTER_SIGNATURE_INVALID: 120,
  CHARTER_UNBOUND_ATTACK: 121,
  NON_MALICE_INVARIANT_VIOLATED: 122,
  LIVE_LANE_CAP_EXCEEDED: 123,
  ATTACK_MANIFEST_ROOT_MISMATCH: 124,
  FINDING_RECORD_MISSING: 125,
  CORPUS_COUNT_MISMATCH: 126,
  SELF_REPORT_RECOMPUTE_CONFLICT: 127,
  OUTCOME_CLASSIFICATION_INVALID: 128,
  ATTACK_NOT_REPRODUCIBLE: 129,
  ASR_LEDGER_MISMATCH: 130,
  SEVERITY_UNDECLARED: 131,
  INTERNAL_FAIL_CLOSED: 132,
});
export const VRTA_CHECK_ORDER = Object.freeze([
  119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
]);
export const VRTA_REASONS_119 = Object.freeze([
  "vrta_bundle_schema_invalid",
  "charter_schema_invalid",
  "attack_fixture_schema_invalid",
  "finding_record_schema_invalid",
  "attack_manifest_schema_invalid",
]);
```

Then in the `RUN_LEVEL_BY_RAW` object add 14 rows (after the last existing row, before the closing brace):

```javascript
  119: 1, 120: 1, 121: 1, 122: 1, 123: 1, 124: 1, 125: 1,
  126: 1, 127: 1, 128: 1, 129: 1, 130: 1, 131: 1, 132: 1,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/exitCodes.test.js`
Expected: PASS (4/4).

- [ ] **Step 5: Regenerate the 4H exit-map goldens (both copies)**

Both `exit-map.json` files enumerate `raw → run_level`. Add the 14 rows `"119": 1 … "132": 1` to **both**:
- `docs/research/llm-shield/evidence/stage-4h/exit-map.json`
- `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json`

Then update the inline literal in `tests/unit/llmShield/stage4h/exitWrapper.test.js` (search for the `RUN_LEVEL_BY_RAW`-mirroring object) to include the same 14 rows.

Run: `node --test tests/unit/llmShield/stage4h/exitWrapper.test.js`
Expected: PASS.

- [ ] **Step 6: Confirm the probe-hygiene guard stays green**

The guard's danger zone is `(maxAllocated, 999)`. `maxAllocated` moves 118 → 132; no existing probe uses 119–132, so no fix is needed, but confirm:

Run: `node --test tests/unit/llmShield/exitCodeProbeHygiene.test.js`
Expected: PASS. If it flags a probe in 119–132, change that probe's code to `UNKNOWN_RAW_PROBE`.

- [ ] **Step 7: Wire config files**

Append to `.prettierignore`:
```text
docs/research/llm-shield/evidence/stage-4u/
```
Add a stage4u allowlist line to **both** `scripts/security-audit-llm-shield-stage3m.sh` and `scripts/security-audit-llm-shield-stage3o.sh`, mirroring the stage4s line (line 24 pattern):
```bash
    | grep -v -E "^tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" || true
```
(Move the `|| true` to the new last line; the stage4s line loses it.)
Add to `.github/workflows/stage-4-lean-proofs.yml` after the `stage4s` lean step:
```yaml
      - name: Check Stage 4U proof
        run: lean proofs/stage4u/NoSilentBypass.lean
```
Add a row to `scripts/check-e2e.sh` after the Stage 4S row (line 126):
```text
  "Stage 4U VRTA|scripts/reproduce-llm-shield-stage4u.sh"
```

- [ ] **Step 8: Run the full unit suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS (baseline count + 4 new).

- [ ] **Step 9: Commit**

```bash
git add tools/simurgh-attestation/stage4h/exitCodes.mjs tests/unit/llmShield/stage4u/exitCodes.test.js \
  docs/research/llm-shield/evidence/stage-4h/exit-map.json tests/fixtures/llmShield/stage4h/expected-results/exit-map.json \
  tests/unit/llmShield/stage4h/exitWrapper.test.js .prettierignore \
  scripts/security-audit-llm-shield-stage3m.sh scripts/security-audit-llm-shield-stage3o.sh \
  .github/workflows/stage-4-lean-proofs.yml scripts/check-e2e.sh
git commit -m "feat(4u): register VRTA raw codes 119-132 and wire additive-code goldens"
```

---

## Task 2: `constants.mjs` — frozen schemas, families, non-claims, limitations, rails

**Files:**
- Create: `tools/simurgh-attestation/stage4u/constants.mjs`
- Test: `tests/unit/llmShield/stage4u/constants.test.js`

**Interfaces:**
- Produces: `SCHEMAS` (charter/attack_fixture/finding/attestation/manifest names), `DOMAINS` (5 digest domains), `ATTACK_FAMILIES` (8 names in spec order), `VRTA_NON_CLAIMS` (7), `VRTA_KNOWN_LIMITATIONS` (5), `VRTA_RAILS` (11), `OUTCOME_CLASSES` (`["survived","bypass","model_refused"]`), `CAMPAIGN_SEED` (`"stage4u-vrta-seed-v1"`), `FAMILY_COUNTS` (object summing to 58).

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMAS, DOMAINS, ATTACK_FAMILIES, VRTA_NON_CLAIMS,
  VRTA_KNOWN_LIMITATIONS, VRTA_RAILS, OUTCOME_CLASSES, FAMILY_COUNTS, CAMPAIGN_SEED,
} from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

test("eight attack families in spec order", () => {
  assert.deepEqual(ATTACK_FAMILIES, [
    "ghost_hop", "structuring_budget", "scope_escalation", "crypto_signature",
    "structural_forgery", "fable_adaptive", "verifier_oracle", "differential",
  ]);
});
test("family counts sum to the declared 58", () => {
  assert.equal(Object.values(FAMILY_COUNTS).reduce((a, b) => a + b, 0), 58);
  assert.deepEqual(Object.keys(FAMILY_COUNTS), ATTACK_FAMILIES);
});
test("seven non-claims, five limitations, eleven rails", () => {
  assert.equal(VRTA_NON_CLAIMS.length, 7);
  assert.equal(VRTA_KNOWN_LIMITATIONS.length, 5);
  assert.equal(VRTA_RAILS.length, 11);
});
test("outcome classes are frozen and exact", () => {
  assert.deepEqual(OUTCOME_CLASSES, ["survived", "bypass", "model_refused"]);
  assert.throws(() => { OUTCOME_CLASSES.push("x"); });
});
test("domains never collide", () => {
  assert.equal(new Set(Object.values(DOMAINS)).size, Object.values(DOMAINS).length);
});
test("campaign seed is the spec value", () => {
  assert.equal(CAMPAIGN_SEED, "stage4u-vrta-seed-v1");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/constants.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `constants.mjs`**

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U frozen constants (4U spec §2, §3, §5). Motto: AnthropicSafe First,
// then ReviewerSafe. Changing ANY value invalidates every committed digest.
export const SCHEMAS = Object.freeze({
  CHARTER: "simurgh.vrta_red_team_charter.v1",
  ATTACK_MANIFEST: "simurgh.vrta_attack_manifest.v1",
  ATTACK_FIXTURE: "simurgh.vrta_attack_fixture.v1",
  FINDING: "simurgh.vrta_finding_record.v1",
  ATTESTATION: "simurgh.vrta_attestation.v1",
});
export const DOMAINS = Object.freeze({
  CHARTER: "SIMURGH_STAGE4U_CHARTER_V1",
  MANIFEST_LEAF: "SIMURGH_STAGE4U_MANIFEST_LEAF_V1",
  FIXTURE: "SIMURGH_STAGE4U_FIXTURE_V1",
  FINDING: "SIMURGH_STAGE4U_FINDING_V1",
  ATTESTATION: "SIMURGH_STAGE4U_ATTESTATION_V1",
});
// §5 — eight attack families, spec order.
export const ATTACK_FAMILIES = Object.freeze([
  "ghost_hop", "structuring_budget", "scope_escalation", "crypto_signature",
  "structural_forgery", "fable_adaptive", "verifier_oracle", "differential",
]);
// §3.1 — precommitted schedule.
export const CAMPAIGN_SEED = "stage4u-vrta-seed-v1";
export const FAMILY_COUNTS = Object.freeze({
  ghost_hop: 8, structuring_budget: 8, scope_escalation: 8, crypto_signature: 8,
  structural_forgery: 6, fable_adaptive: 4, verifier_oracle: 8, differential: 8,
});
export const OUTCOME_CLASSES = Object.freeze(["survived", "bypass", "model_refused"]);
// §2.1 — non-claims, signed, spec order.
export const VRTA_NON_CLAIMS = Object.freeze([
  "not_a_proof_of_model_safety",
  "not_a_jailbreak_immunity_claim",
  "not_a_production_security_certification",
  "not_an_exhaustive_attack_space_claim",
  "not_a_claim_that_a_green_corpus_means_no_vulnerabilities_exist",
  "not_a_third_party_targeting_or_offensive_tool",
  "not_a_legal_or_compliance_authorization",
]);
// §2.2 — known limitations, signed, spec order.
export const VRTA_KNOWN_LIMITATIONS = Object.freeze([
  "corpus_is_relative_to_declared_attack_families_not_the_full_adversary_space",
  "live_fable_lane_is_one_capped_capture_not_ecosystem_scale",
  "a_green_corpus_is_evidence_of_survived_attacks_not_absence_of_bugs",
  "severity_labels_are_analyst_declared_not_a_formal_exploitability_proof",
  "non_malice_is_enforced_over_declared_endpoints_and_fixture_keys_only",
]);
// §2.3 — honesty rails, spec order.
export const VRTA_RAILS = Object.freeze([
  "a_confirmed_bypass_is_a_recorded_outcome_not_a_verification_failure",
  "non_malice_charter_proves_declared_scope_not_inner_intent",
  "red_team_held_verifiable_never_system_proven_safe",
  "the_red_team_cannot_omit_its_own_successful_attacks_no_selective_omission",
  "attacks_target_only_our_own_verifier_keys_and_repo_never_third_parties",
  "fable_is_an_attack_bundle_driver_not_a_target_of_harm_no_capability_elicitation",
  "authorization_scope_and_disclosure_are_signed_before_any_attack_runs",
  "reported_asr_is_recomputed_from_pinned_inputs_no_hand_edited_totals",
  "live_lane_is_disabled_by_default_lazy_loaded_and_denial_of_wallet_capped",
  "lane_b_uses_honest_transparent_framing_we_never_evade_or_trick_fable_safeguards",
  "a_fable_refusal_is_recorded_as_outcome_never_rephrased_to_bypass_it",
]);
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/constants.test.js`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4u/constants.mjs tests/unit/llmShield/stage4u/constants.test.js
git commit -m "feat(4u): frozen VRTA constants (families, non-claims, limitations, rails)"
```

---

## Task 3: `core/charter.mjs` — signed charter + precommitted attack-manifest root

**Files:**
- Create: `tools/simurgh-attestation/stage4u/core/charter.mjs`
- Create keys: `tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta-charter.pem` (+ public)
- Test: `tests/unit/llmShield/stage4u/charter.test.js`

**Interfaces:**
- Consumes: `canonicalJson`, `recordDigest`, `sha256Hex`, `merkleRootSorted` from `stage4m/core/canonical.mjs`; `keyDigest` from `stage4s/core/receiptBuilder.mjs`; constants from Task 2; `VRTA_RAW_CODES` from Task 1.
- Produces:
  - `attackManifestRoot(seed, familyCounts) -> "sha256:<hex>"` — deterministic Merkle root over derived attack ids.
  - `deriveAttackIds(seed, familyCounts) -> string[]` — sorted stable ids `"<family>#<n>"`.
  - `buildCharter({ seed, familyCounts, caps, charterKeyDigest }) -> charter` (unsigned object incl. `schema`, `non_claims`, `known_limitations`, `rails`, `attack_manifest_root`, `declared_attack_count`, `caps`).
  - `signCharter(charter, privKey) -> { ...charter, signature }`.
  - `charterDigest(charter) -> "sha256:<hex>"` (over the **unsigned** charter body, signature stripped).
  - `verifyCharter(charter, { pubKeyPem }) -> { raw, reason }` — 119 (schema), 120 (sig), 124 (manifest root recompute mismatch).

- [ ] **Step 1: Generate the charter key**

```bash
mkdir -p tests/fixtures/llmShield/stage4u/test-keys
node -e "const c=require('crypto');const{privateKey,publicKey}=c.generateKeyPairSync('ed25519');const fs=require('fs');const d='tests/fixtures/llmShield/stage4u/test-keys/';fs.writeFileSync(d+'INSECURE_FIXTURE_ONLY_vrta-charter.pem',privateKey.export({type:'pkcs8',format:'pem'}));fs.writeFileSync(d+'INSECURE_FIXTURE_ONLY_vrta-charter.pub.pem',publicKey.export({type:'spki',format:'pem'}));"
```

- [ ] **Step 2: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import {
  attackManifestRoot, deriveAttackIds, buildCharter, signCharter, charterDigest, verifyCharter,
} from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import { FAMILY_COUNTS, CAMPAIGN_SEED } from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

const KEYDIR = "tests/fixtures/llmShield/stage4u/test-keys/";
const priv = crypto.createPrivateKey(readFileSync(KEYDIR + "INSECURE_FIXTURE_ONLY_vrta-charter.pem"));
const pubPem = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
const caps = { max_turns: 6, max_tokens: 4000, max_spend_usd: 2 };
const mk = () => signCharter(buildCharter({ seed: CAMPAIGN_SEED, familyCounts: FAMILY_COUNTS, caps, charterKeyDigest: "sha256:" + "a".repeat(64) }), priv);

test("attack ids are deterministic and count to 58", () => {
  const ids = deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS);
  assert.equal(ids.length, 58);
  assert.deepEqual(ids, deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS)); // stable
  assert.match(attackManifestRoot(CAMPAIGN_SEED, FAMILY_COUNTS), /^sha256:[0-9a-f]{64}$/);
});
test("a well-formed signed charter verifies GREEN", () => {
  assert.deepEqual(verifyCharter(mk(), { pubKeyPem: pubPem }), { raw: 0, reason: "green" });
});
test("tampered signature -> 120", () => {
  const c = mk(); c.signature = c.signature.replace(/^../, "00");
  assert.equal(verifyCharter(c, { pubKeyPem: pubPem }).raw, 120);
});
test("manifest root that does not recompute -> 124", () => {
  const c = mk(); c.attack_manifest_root = "sha256:" + "b".repeat(64);
  const resigned = signCharter({ ...c, signature: undefined }, priv);
  assert.equal(verifyCharter(resigned, { pubKeyPem: pubPem }).raw, 124);
});
test("missing schema -> 119", () => {
  const c = mk(); delete c.schema;
  assert.equal(verifyCharter(c, { pubKeyPem: pubPem }).raw, 119);
});
test("charterDigest ignores the signature field", () => {
  const c = mk();
  const d1 = charterDigest(c);
  const d2 = charterDigest({ ...c, signature: "deadbeef" });
  assert.equal(d1, d2);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/charter.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `charter.mjs`**

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U signed Red-Team Charter + precommitted attack manifest (4U spec §3).
// Motto: AnthropicSafe First, then ReviewerSafe. The charter proves DECLARED
// SCOPE, not inner intent (rail non_malice_charter_proves_declared_scope_not_inner_intent).
import crypto from "node:crypto";
import { canonicalJson, recordDigest, sha256Hex, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import {
  SCHEMAS, DOMAINS, ATTACK_FAMILIES, FAMILY_COUNTS,
  VRTA_NON_CLAIMS, VRTA_KNOWN_LIMITATIONS, VRTA_RAILS,
} from "../constants.mjs";

// Deterministic, stable attack ids: "<family>#<n>" for n in [0, count).
export function deriveAttackIds(seed, familyCounts) {
  const ids = [];
  for (const fam of ATTACK_FAMILIES) {
    const n = familyCounts[fam] || 0;
    for (let i = 0; i < n; i++) ids.push(`${seed}:${fam}#${i}`);
  }
  return ids.sort();
}

export function attackManifestRoot(seed, familyCounts) {
  const leaves = deriveAttackIds(seed, familyCounts).map(
    (id) => recordDigest({ domain: DOMAINS.MANIFEST_LEAF, id }),
  );
  return merkleRootSorted(leaves);
}

export function buildCharter({ seed, familyCounts, caps, charterKeyDigest }) {
  const declared = deriveAttackIds(seed, familyCounts).length;
  return {
    schema: SCHEMAS.CHARTER,
    campaign_seed: seed,
    attack_family_counts: { ...familyCounts },
    attack_manifest_root: attackManifestRoot(seed, familyCounts),
    declared_attack_count: declared,
    caps: { ...caps },
    charter_key_digest: charterKeyDigest,
    non_claims: [...VRTA_NON_CLAIMS],
    known_limitations: [...VRTA_KNOWN_LIMITATIONS],
    rails: [...VRTA_RAILS],
  };
}

const unsignedBody = (charter) => {
  const { signature, ...body } = charter;
  return body;
};

export function charterDigest(charter) {
  return recordDigest({ domain: DOMAINS.CHARTER, charter: unsignedBody(charter) });
}

export function signCharter(charter, privKey) {
  const body = unsignedBody(charter);
  const signature = crypto.sign(null, Buffer.from(canonicalJson(body)), privKey).toString("hex");
  return { ...body, signature };
}

const REQUIRED = [
  "schema", "campaign_seed", "attack_family_counts", "attack_manifest_root",
  "declared_attack_count", "caps", "non_claims", "known_limitations", "rails", "signature",
];

export function verifyCharter(charter, { pubKeyPem }) {
  // 119 — schema/shape.
  if (!charter || typeof charter !== "object") return { raw: 119, reason: "charter_schema_invalid" };
  for (const k of REQUIRED) {
    if (!(k in charter)) return { raw: 119, reason: "charter_schema_invalid", detail: { missing: k } };
  }
  if (charter.schema !== SCHEMAS.CHARTER) return { raw: 119, reason: "charter_schema_invalid" };
  // 120 — signature.
  let sigOk = false;
  try {
    sigOk = crypto.verify(
      null,
      Buffer.from(canonicalJson(unsignedBody(charter))),
      crypto.createPublicKey(pubKeyPem),
      Buffer.from(charter.signature, "hex"),
    );
  } catch { sigOk = false; }
  if (!sigOk) return { raw: 120, reason: "charter_signature_invalid" };
  // 124 — manifest root must recompute from committed seed + counts.
  const recomputed = attackManifestRoot(charter.campaign_seed, charter.attack_family_counts);
  if (recomputed !== charter.attack_manifest_root) {
    return { raw: 124, reason: "attack_manifest_root_mismatch", detail: { recomputed } };
  }
  if (charter.declared_attack_count !== deriveAttackIds(charter.campaign_seed, charter.attack_family_counts).length) {
    return { raw: 124, reason: "attack_manifest_root_mismatch", detail: { count: true } };
  }
  return { raw: 0, reason: "green" };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/charter.test.js`
Expected: PASS (6/6).

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-attestation/stage4u/core/charter.mjs tests/unit/llmShield/stage4u/charter.test.js tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta-charter*.pem
git commit -m "feat(4u): signed red-team charter with precommitted attack-manifest root (119/120/124)"
```

---

## Task 4: `core/attackModel.mjs` — attack fixture schema + expected-verdict binding

**Files:**
- Create: `tools/simurgh-attestation/stage4u/core/attackModel.mjs`
- Test: `tests/unit/llmShield/stage4u/attackModel.test.js`

**Interfaces:**
- Consumes: `recordDigest` from canonical; `charterDigest` from Task 3; `VRTA_RAW_CODES`.
- Produces:
  - `ATTACK_FIXTURE_FIELDS` (frozen array of required keys).
  - `validateFixture(fixture) -> { raw, reason }` — 119 on schema violation, else `{raw:0}`.
  - `fixtureDigest(fixture) -> "sha256:<hex>"`.
  - `bindsCharter(fixture, charter) -> boolean` — `fixture.charter_digest === charterDigest(charter)`.
  - `NON_FIXTURE_KEY_RE` / `THIRD_PARTY_ENDPOINT` helper `nonMaliceViolation(fixture) -> null | reason` used by vrtaCore for **122**.

A fixture shape (frozen contract other tasks rely on):
```json
{
  "schema": "simurgh.vrta_attack_fixture.v1",
  "attack_id": "stage4u-vrta-seed-v1:ghost_hop#0",
  "family": "ghost_hop",
  "charter_digest": "sha256:...",
  "target": "vdcc_verifier | kernel",
  "payload": { "kind": "chain_bundle", "bundle": { } },
  "expected_raw": 111,
  "key_refs": ["INSECURE_FIXTURE_ONLY_delegator", "INSECURE_FIXTURE_ONLY_delegatee"],
  "endpoint": "in_repo"
}
```

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFixture, fixtureDigest, bindsCharter, nonMaliceViolation }
  from "../../../../tools/simurgh-attestation/stage4u/core/attackModel.mjs";

const good = {
  schema: "simurgh.vrta_attack_fixture.v1",
  attack_id: "stage4u-vrta-seed-v1:ghost_hop#0",
  family: "ghost_hop",
  charter_digest: "sha256:" + "a".repeat(64),
  target: "vdcc_verifier",
  payload: { kind: "chain_bundle", bundle: {} },
  expected_raw: 111,
  key_refs: ["INSECURE_FIXTURE_ONLY_delegator"],
  endpoint: "in_repo",
};

test("well-formed fixture validates", () => {
  assert.deepEqual(validateFixture(good), { raw: 0, reason: "green" });
});
test("missing field -> 119", () => {
  const bad = { ...good }; delete bad.expected_raw;
  assert.equal(validateFixture(bad).raw, 119);
});
test("bindsCharter compares digests", () => {
  assert.equal(bindsCharter(good, {}, "sha256:" + "a".repeat(64)), true);
  assert.equal(bindsCharter(good, {}, "sha256:" + "c".repeat(64)), false);
});
test("non-fixture key ref is a non-malice violation (feeds 122)", () => {
  assert.equal(nonMaliceViolation(good), null);
  assert.match(nonMaliceViolation({ ...good, key_refs: ["prod_signing_key"] }), /non_fixture_key/);
});
test("third-party endpoint is a non-malice violation (feeds 122)", () => {
  assert.match(nonMaliceViolation({ ...good, endpoint: "https://api.example.com" }), /third_party_endpoint/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/attackModel.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `attackModel.mjs`**

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U attack fixture model (4U spec §3, §5). Motto: AnthropicSafe First,
// then ReviewerSafe. A fixture declares its target, payload, expected verifier
// verdict, and the fixture-only keys/endpoints it is allowed to touch.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, ATTACK_FAMILIES } from "../constants.mjs";
import { SCHEMAS } from "../constants.mjs";

export const ATTACK_FIXTURE_FIELDS = Object.freeze([
  "schema", "attack_id", "family", "charter_digest", "target",
  "payload", "expected_raw", "key_refs", "endpoint",
]);

export function validateFixture(fixture) {
  if (!fixture || typeof fixture !== "object")
    return { raw: 119, reason: "attack_fixture_schema_invalid" };
  for (const k of ATTACK_FIXTURE_FIELDS)
    if (!(k in fixture)) return { raw: 119, reason: "attack_fixture_schema_invalid", detail: { missing: k } };
  if (fixture.schema !== SCHEMAS.ATTACK_FIXTURE)
    return { raw: 119, reason: "attack_fixture_schema_invalid" };
  if (!ATTACK_FAMILIES.includes(fixture.family))
    return { raw: 119, reason: "attack_fixture_schema_invalid", detail: { family: fixture.family } };
  if (!Number.isInteger(fixture.expected_raw))
    return { raw: 119, reason: "attack_fixture_schema_invalid", detail: { expected_raw: true } };
  return { raw: 0, reason: "green" };
}

export function fixtureDigest(fixture) {
  return recordDigest({ domain: DOMAINS.FIXTURE, fixture });
}

// Third arg is the precomputed charterDigest(charter) — cheap for callers that
// verify many fixtures against one charter.
export function bindsCharter(fixture, _charter, expectedDigest) {
  return fixture.charter_digest === expectedDigest;
}

// Non-malice: only fixture-only keys and in-repo/localhost endpoints allowed.
const FIXTURE_KEY_RE = /^INSECURE_FIXTURE_ONLY_[A-Za-z-]+$/;
const ALLOWED_ENDPOINTS = new Set(["in_repo", "localhost"]);
export function nonMaliceViolation(fixture) {
  for (const k of fixture.key_refs || [])
    if (!FIXTURE_KEY_RE.test(k)) return `non_fixture_key:${k}`;
  if (!ALLOWED_ENDPOINTS.has(fixture.endpoint)) return `third_party_endpoint:${fixture.endpoint}`;
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/attackModel.test.js`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4u/core/attackModel.mjs tests/unit/llmShield/stage4u/attackModel.test.js
git commit -m "feat(4u): attack fixture model + non-malice check (119/122 inputs)"
```

---

## Task 5: `core/findingLedger.mjs` — precommitted completeness + ASR recompute

**Files:**
- Create: `tools/simurgh-attestation/stage4u/core/findingLedger.mjs`
- Test: `tests/unit/llmShield/stage4u/findingLedger.test.js`

**Interfaces:**
- Consumes: `recordDigest`; `deriveAttackIds` from Task 3; `OUTCOME_CLASSES`, `VRTA_RAW_CODES`.
- Produces:
  - `buildFinding({ attack_id, family, self_reported_raw, verifier_recomputed_raw, expected_raw, outcome_class, severity }) -> finding`.
  - `verifyLedger(charter, fixtures, findings) -> { raw, reason }` — 125 (a planned id lacks a finding), 126 (count mismatch fixtures/findings/declared), 131 (a `bypass` finding with no `severity`).
  - `recomputeAsr(findings) -> { asr, over_refusal_rate, executed_non_refusal, confirmed_bypass, model_refused, lane_b_attempts }`.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFinding, verifyLedger, recomputeAsr }
  from "../../../../tools/simurgh-attestation/stage4u/core/findingLedger.mjs";
import { deriveAttackIds } from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import { CAMPAIGN_SEED, FAMILY_COUNTS } from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

const ids = deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS);
const charter = { campaign_seed: CAMPAIGN_SEED, attack_family_counts: FAMILY_COUNTS, declared_attack_count: ids.length };
const fixtures = ids.map((id) => ({ attack_id: id, family: id.split(":")[1].split("#")[0] }));
const survivedFindings = ids.map((id) => buildFinding({
  attack_id: id, family: id.split(":")[1].split("#")[0],
  self_reported_raw: 111, verifier_recomputed_raw: 111, expected_raw: 111,
  outcome_class: "survived", severity: null,
}));

test("complete survived ledger is GREEN", () => {
  assert.deepEqual(verifyLedger(charter, fixtures, survivedFindings), { raw: 0, reason: "green" });
});
test("dropping a finding -> 125", () => {
  assert.equal(verifyLedger(charter, fixtures, survivedFindings.slice(1)).raw, 125);
});
test("count mismatch (extra fixture, no id) -> 126", () => {
  const extra = [...fixtures, { attack_id: "stage4u-vrta-seed-v1:ghost_hop#99", family: "ghost_hop" }];
  assert.equal(verifyLedger(charter, extra, survivedFindings).raw, 126);
});
test("bypass without severity -> 131", () => {
  const f = [...survivedFindings];
  f[0] = buildFinding({ attack_id: ids[0], family: "ghost_hop", self_reported_raw: 0, verifier_recomputed_raw: 0, expected_raw: 111, outcome_class: "bypass", severity: null });
  assert.equal(verifyLedger(charter, fixtures, f).raw, 131);
});
test("ASR excludes refusals; over_refusal reported separately", () => {
  const f = survivedFindings.map((x, i) => i < 2
    ? buildFinding({ attack_id: ids[i], family: "fable_adaptive", self_reported_raw: null, verifier_recomputed_raw: null, expected_raw: 111, outcome_class: "model_refused", severity: null })
    : x);
  const r = recomputeAsr(f);
  assert.equal(r.model_refused, 2);
  assert.equal(r.confirmed_bypass, 0);
  assert.equal(r.executed_non_refusal, f.length - 2);
  assert.equal(r.asr, 0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/findingLedger.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `findingLedger.mjs`**

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U finding ledger (4U spec §3.1, §7). Motto: AnthropicSafe First, then
// ReviewerSafe. Enforces precommitted completeness (every planned id → exactly
// one finding) and recomputes the ASR from findings — never a hand-edited total.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, OUTCOME_CLASSES } from "../constants.mjs";
import { SCHEMAS } from "../constants.mjs";
import { deriveAttackIds } from "./charter.mjs";

export function buildFinding({ attack_id, family, self_reported_raw, verifier_recomputed_raw, expected_raw, outcome_class, severity }) {
  return {
    schema: SCHEMAS.FINDING,
    attack_id, family,
    self_reported_raw, verifier_recomputed_raw, expected_raw,
    outcome_class,
    severity: severity ?? null,
  };
}

export const findingDigest = (f) => recordDigest({ domain: DOMAINS.FINDING, finding: f });

export function verifyLedger(charter, fixtures, findings) {
  const planned = new Set(deriveAttackIds(charter.campaign_seed, charter.attack_family_counts));
  const fixtureIds = new Set(fixtures.map((f) => f.attack_id));
  const findingIds = new Map(findings.map((f) => [f.attack_id, f]));

  // 126 — the three counts must agree.
  if (fixtures.length !== planned.size || findings.length !== planned.size ||
      charter.declared_attack_count !== planned.size) {
    return { raw: 126, reason: "corpus_count_mismatch", detail: { planned: planned.size, fixtures: fixtures.length, findings: findings.length } };
  }
  // 125 — every planned id has a fixture AND a finding; every finding maps to a planned id.
  for (const id of planned) {
    if (!fixtureIds.has(id)) return { raw: 125, reason: "finding_record_missing", detail: { attack_id: id, kind: "fixture" } };
    if (!findingIds.has(id)) return { raw: 125, reason: "finding_record_missing", detail: { attack_id: id, kind: "finding" } };
  }
  for (const f of findings) {
    if (!planned.has(f.attack_id)) return { raw: 125, reason: "finding_record_missing", detail: { attack_id: f.attack_id, kind: "unplanned" } };
    if (!OUTCOME_CLASSES.includes(f.outcome_class)) return { raw: 125, reason: "finding_record_missing", detail: { attack_id: f.attack_id, kind: "class" } };
    // 131 — a confirmed bypass MUST carry a signed severity.
    if (f.outcome_class === "bypass" && !f.severity) {
      return { raw: 131, reason: "severity_undeclared", detail: { attack_id: f.attack_id } };
    }
  }
  return { raw: 0, reason: "green" };
}

export function recomputeAsr(findings) {
  let confirmed_bypass = 0, model_refused = 0, lane_b_attempts = 0;
  for (const f of findings) {
    if (f.outcome_class === "bypass") confirmed_bypass++;
    if (f.family === "fable_adaptive") lane_b_attempts++;
    if (f.outcome_class === "model_refused") model_refused++;
  }
  const executed_non_refusal = findings.length - model_refused;
  return {
    asr: executed_non_refusal === 0 ? 0 : confirmed_bypass / executed_non_refusal,
    over_refusal_rate: lane_b_attempts === 0 ? 0 : model_refused / lane_b_attempts,
    executed_non_refusal, confirmed_bypass, model_refused, lane_b_attempts,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/findingLedger.test.js`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4u/core/findingLedger.mjs tests/unit/llmShield/stage4u/findingLedger.test.js
git commit -m "feat(4u): finding ledger — precommitted completeness 125/126/131 + ASR recompute"
```

---

## Task 6: `core/dualSignal.mjs` — self-report vs recompute (127) + classification truth table (128) + reproducibility (129)

**Files:**
- Create: `tools/simurgh-attestation/stage4u/core/dualSignal.mjs`
- Test: `tests/unit/llmShield/stage4u/dualSignal.test.js`

**Interfaces:**
- Consumes: `VRTA_RAW_CODES`, `OUTCOME_CLASSES`.
- Produces:
  - `classify(expected_raw, observed_raw) -> "survived" | "bypass"` — bypass iff `expected_raw !== 0 && observed_raw === 0` (verifier let a should-fail attack through) OR the kernel-over-authorize dual (`expected_raw` a containment code, `observed_raw === 0`). For the offline corpus, the rule is exactly: `observed_raw === 0 && expected_raw !== 0 ? "bypass" : "survived"`.
  - `verifyFinding(finding, recomputed_raw) -> { raw, reason }` — 127 (`self_reported_raw !== verifier_recomputed_raw`), 128 (`outcome_class !== classify(expected_raw, verifier_recomputed_raw)`), 129 (`verifier_recomputed_raw !== recomputed_raw` from a fresh engine run). Refusals (`model_refused`) are exempt from 127/128 but still 129-checked as a no-op.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, verifyFinding } from "../../../../tools/simurgh-attestation/stage4u/core/dualSignal.mjs";

test("classify: should-fail attack that returns 0 is a bypass", () => {
  assert.equal(classify(111, 0), "bypass");
  assert.equal(classify(111, 111), "survived");
  assert.equal(classify(0, 0), "survived"); // an honest-green fixture is not a bypass
});
test("survived finding with matching signals is GREEN", () => {
  const f = { self_reported_raw: 111, verifier_recomputed_raw: 111, expected_raw: 111, outcome_class: "survived" };
  assert.deepEqual(verifyFinding(f, 111), { raw: 0, reason: "green" });
});
test("self-report != recompute -> 127", () => {
  const f = { self_reported_raw: 0, verifier_recomputed_raw: 111, expected_raw: 111, outcome_class: "survived" };
  assert.equal(verifyFinding(f, 111).raw, 127);
});
test("classification not following the truth table -> 128 (even when 127 passes)", () => {
  // self-report == recompute == observed 0, but labelled survived when expected 108 => bypass
  const f = { self_reported_raw: 0, verifier_recomputed_raw: 0, expected_raw: 108, outcome_class: "survived" };
  assert.equal(verifyFinding(f, 0).raw, 128);
});
test("recorded recompute != fresh engine run -> 129", () => {
  const f = { self_reported_raw: 111, verifier_recomputed_raw: 111, expected_raw: 111, outcome_class: "survived" };
  assert.equal(verifyFinding(f, 105).raw, 129);
});
test("model_refused is exempt from 127/128", () => {
  const f = { self_reported_raw: null, verifier_recomputed_raw: null, expected_raw: 111, outcome_class: "model_refused" };
  assert.deepEqual(verifyFinding(f, null), { raw: 0, reason: "green" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/dualSignal.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `dualSignal.mjs`**

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U dual-signal lie detector (4U spec §7). Motto: AnthropicSafe First,
// then ReviewerSafe. 127 = did you honestly report what the engine returned;
// 128 = does your survived/bypass label follow from expected-vs-observed; these
// are independent (a finding can pass 127 and still fail 128).
export function classify(expected_raw, observed_raw) {
  return observed_raw === 0 && expected_raw !== 0 ? "bypass" : "survived";
}

export function verifyFinding(finding, recomputed_raw) {
  if (finding.outcome_class === "model_refused") {
    // 129 no-op: a refusal reproduces to a refusal (null).
    if (recomputed_raw !== null && recomputed_raw !== undefined)
      return { raw: 129, reason: "attack_not_reproducible", detail: { expected: "refusal" } };
    return { raw: 0, reason: "green" };
  }
  // 129 — the recorded recompute must equal a fresh engine run.
  if (finding.verifier_recomputed_raw !== recomputed_raw)
    return { raw: 129, reason: "attack_not_reproducible", detail: { recorded: finding.verifier_recomputed_raw, fresh: recomputed_raw } };
  // 127 — self-report honesty.
  if (finding.self_reported_raw !== finding.verifier_recomputed_raw)
    return { raw: 127, reason: "self_report_recompute_conflict" };
  // 128 — classification follows the truth table.
  const truth = classify(finding.expected_raw, finding.verifier_recomputed_raw);
  if (finding.outcome_class !== truth)
    return { raw: 128, reason: "outcome_classification_invalid", detail: { recorded: finding.outcome_class, truth } };
  return { raw: 0, reason: "green" };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/dualSignal.test.js`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4u/core/dualSignal.mjs tests/unit/llmShield/stage4u/dualSignal.test.js
git commit -m "feat(4u): dual-signal lie detector — independent 127/128/129"
```

---

## Task 7: `core/vrtaCore.mjs` — frozen check order + fail-closed wrapper

**Files:**
- Create: `tools/simurgh-attestation/stage4u/core/vrtaCore.mjs`
- Test: `tests/unit/llmShield/stage4u/vrtaCore.test.js`

**Interfaces:**
- Consumes: `verifyCharter`, `charterDigest` (Task 3); `validateFixture`, `bindsCharter`, `nonMaliceViolation` (Task 4); `verifyLedger`, `recomputeAsr` (Task 5); `verifyFinding` (Task 6); `VRTA_CHECK_ORDER`, `VRTA_RAW_CODES`.
- Produces:
  - `evaluateVrta(bundle, { pubKeyPem, engine, capBreaches }) -> { raw, reason, detail? }` — runs the frozen order 119→132; returns the first non-zero, else `{raw:0}`. `engine(fixture) -> raw` re-runs an attack (audit tier); when omitted, 129/127/128 that need a fresh run are skipped (public tier). `capBreaches` (array) drives 123. Bundle carries `{ charter, attack_fixtures, finding_records, asr }`.
  - `evaluateVrtaSafe(bundle, opts)` — try/catch wrapper returning **132** on any thrown error.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { evaluateVrta, evaluateVrtaSafe } from "../../../../tools/simurgh-attestation/stage4u/core/vrtaCore.mjs";
import { buildCharter, signCharter, charterDigest } from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import { buildFinding } from "../../../../tools/simurgh-attestation/stage4u/core/findingLedger.mjs";
import { deriveAttackIds } from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import { CAMPAIGN_SEED, FAMILY_COUNTS, SCHEMAS } from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

const priv = crypto.createPrivateKey(readFileSync("tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta-charter.pem"));
const pubPem = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
const caps = { max_turns: 6, max_tokens: 4000, max_spend_usd: 2 };

function greenBundle() {
  const charter = signCharter(buildCharter({ seed: CAMPAIGN_SEED, familyCounts: FAMILY_COUNTS, caps, charterKeyDigest: "sha256:" + "a".repeat(64) }), priv);
  const cd = charterDigest(charter);
  const ids = deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS);
  const attack_fixtures = ids.map((id) => ({
    schema: SCHEMAS.ATTACK_FIXTURE, attack_id: id, family: id.split(":")[1].split("#")[0],
    charter_digest: cd, target: "vdcc_verifier", payload: { kind: "chain_bundle", bundle: {} },
    expected_raw: 111, key_refs: ["INSECURE_FIXTURE_ONLY_delegator"], endpoint: "in_repo",
  }));
  const finding_records = ids.map((id) => buildFinding({
    attack_id: id, family: id.split(":")[1].split("#")[0],
    self_reported_raw: 111, verifier_recomputed_raw: 111, expected_raw: 111, outcome_class: "survived", severity: null,
  }));
  return { charter, attack_fixtures, finding_records, asr: 0 };
}

test("well-formed bundle is GREEN (public tier)", () => {
  assert.deepEqual(evaluateVrta(greenBundle(), { pubKeyPem: pubPem }), { raw: 0, reason: "green" });
});
test("fixture not bound to charter -> 121", () => {
  const b = greenBundle(); b.attack_fixtures[0].charter_digest = "sha256:" + "f".repeat(64);
  assert.equal(evaluateVrta(b, { pubKeyPem: pubPem }).raw, 121);
});
test("non-fixture key -> 122", () => {
  const b = greenBundle(); b.attack_fixtures[0].key_refs = ["prod_key"];
  assert.equal(evaluateVrta(b, { pubKeyPem: pubPem }).raw, 122);
});
test("cap breach -> 123", () => {
  assert.equal(evaluateVrta(greenBundle(), { pubKeyPem: pubPem, capBreaches: ["max_tokens"] }).raw, 123);
});
test("audit tier: engine disagreeing with recorded recompute -> 129", () => {
  assert.equal(evaluateVrta(greenBundle(), { pubKeyPem: pubPem, engine: () => 105 }).raw, 129);
});
test("evaluateVrtaSafe returns 132 on a thrown engine", () => {
  assert.equal(evaluateVrtaSafe(greenBundle(), { pubKeyPem: pubPem, engine: () => { throw new Error("boom"); } }).raw, 132);
});
test("ASR ledger mismatch -> 130", () => {
  const b = greenBundle(); b.asr = 0.5;
  assert.equal(evaluateVrta(b, { pubKeyPem: pubPem }).raw, 130);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/vrtaCore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `vrtaCore.mjs`**

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U verifier core (4U spec §8). Motto: AnthropicSafe First, then
// ReviewerSafe. Runs the FROZEN check order 119→132 and returns the first
// non-zero code. Public tier omits `engine`; audit tier supplies it to re-run
// each attack and catch 127/128/129.
import { verifyCharter, charterDigest } from "./charter.mjs";
import { validateFixture, bindsCharter, nonMaliceViolation } from "./attackModel.mjs";
import { verifyLedger, recomputeAsr } from "./findingLedger.mjs";
import { verifyFinding } from "./dualSignal.mjs";

const GREEN = { raw: 0, reason: "green" };

export function evaluateVrta(bundle, { pubKeyPem, engine, capBreaches } = {}) {
  // 119 — top-level shape.
  if (!bundle || typeof bundle !== "object" || !Array.isArray(bundle.attack_fixtures) ||
      !Array.isArray(bundle.finding_records) || !bundle.charter) {
    return { raw: 119, reason: "vrta_bundle_schema_invalid" };
  }
  for (const fx of bundle.attack_fixtures) {
    const v = validateFixture(fx);
    if (v.raw) return v;
  }
  // 120 / 124 — charter signature + manifest root (also 119 for charter schema).
  const cres = verifyCharter(bundle.charter, { pubKeyPem });
  if (cres.raw) return cres;
  const cd = charterDigest(bundle.charter);
  // 121 — every fixture bound to this charter.
  for (const fx of bundle.attack_fixtures) {
    if (!bindsCharter(fx, bundle.charter, cd))
      return { raw: 121, reason: "charter_unbound_attack", detail: { attack_id: fx.attack_id } };
  }
  // 122 — non-malice invariants.
  for (const fx of bundle.attack_fixtures) {
    const nm = nonMaliceViolation(fx);
    if (nm) return { raw: 122, reason: "non_malice_invariant_violated", detail: { attack_id: fx.attack_id, why: nm } };
  }
  // 123 — denial-of-wallet caps.
  if (Array.isArray(capBreaches) && capBreaches.length)
    return { raw: 123, reason: "live_lane_cap_exceeded", detail: { breaches: capBreaches } };
  // 124 handled inside verifyCharter; 125/126/131 — ledger completeness.
  const lres = verifyLedger(bundle.charter, bundle.attack_fixtures, bundle.finding_records);
  if (lres.raw) return lres;
  // 127/128/129 — per-finding (audit tier only, when engine supplied).
  if (typeof engine === "function") {
    const fxById = new Map(bundle.attack_fixtures.map((f) => [f.attack_id, f]));
    for (const f of bundle.finding_records) {
      const fresh = f.outcome_class === "model_refused" ? null : engine(fxById.get(f.attack_id));
      const r = verifyFinding(f, fresh);
      if (r.raw) return { ...r, detail: { ...(r.detail || {}), attack_id: f.attack_id } };
    }
  }
  // 130 — ASR ledger must recompute.
  const { asr } = recomputeAsr(bundle.finding_records);
  if (typeof bundle.asr === "number" && Math.abs(bundle.asr - asr) > 1e-12)
    return { raw: 130, reason: "asr_ledger_mismatch", detail: { signed: bundle.asr, recomputed: asr } };
  return GREEN;
}

export function evaluateVrtaSafe(bundle, opts) {
  try {
    return evaluateVrta(bundle, opts);
  } catch (e) {
    return { raw: 132, reason: "internal_fail_closed", detail: { error: String(e && e.message) } };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/vrtaCore.test.js`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4u/core/vrtaCore.mjs tests/unit/llmShield/stage4u/vrtaCore.test.js
git commit -m "feat(4u): vrtaCore frozen check order 119-132 + fail-closed 132"
```

---

## Task 8: `node/build-stage4u-corpus.mjs` — Lane A offline attack corpus (8 families → 58 fixtures)

**Files:**
- Create: `tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs`
- Create keys: `INSECURE_FIXTURE_ONLY_{delegator,delegatee}.pem` under stage4u test-keys
- Test: `tests/unit/llmShield/stage4u/corpus.test.js`
- Output (generated, prettier-ignored): `docs/research/llm-shield/evidence/stage-4u/fixtures/{corpus-index.json, charter.json, <attack_id>.json …}`

**Interfaces:**
- Consumes: `buildCharter/signCharter/charterDigest/deriveAttackIds` (Task 3); `fixtureDigest`, `SCHEMAS` (Tasks 2/4); the real 4S engine `evaluateChainSafe` from `stage4s/core/chainCore.mjs` and the 4S receipt builders to construct attack bundles; `buildFinding` (Task 5); `classify` (Task 6).
- Produces:
  - `buildFamily(family, count, ctx) -> { fixtures, findings }` — deterministic per-family attack generator. Each attack payload is a 4S `chain_bundle` deliberately malformed to target the family's code (e.g. `ghost_hop` drops a co-signature → expected_raw 111/112; `structural_forgery` hand-builds a cycle → expected_raw 104). For each fixture, run `evaluateChainSafe` to get `observed_raw`, then `classify(expected_raw, observed_raw)`.
  - `buildCorpus() -> writes fixtures + charter + corpus-index.json`. `corpus-index.json` = `{ epoch, charter_digest, attack_manifest_root, cases: [{ attack_id, family, file, expected_raw, observed_raw, outcome_class }] }`.
  - CLI: `node build-stage4u-corpus.mjs` (writes), importable `buildCorpus`.

- [ ] **Step 1: Generate the delegator/delegatee fixture keys**

```bash
node -e "const c=require('crypto');const fs=require('fs');const d='tests/fixtures/llmShield/stage4u/test-keys/';for(const n of ['delegator','delegatee']){const{privateKey,publicKey}=c.generateKeyPairSync('ed25519');fs.writeFileSync(d+'INSECURE_FIXTURE_ONLY_'+n+'.pem',privateKey.export({type:'pkcs8',format:'pem'}));fs.writeFileSync(d+'INSECURE_FIXTURE_ONLY_'+n+'.pub.pem',publicKey.export({type:'spki',format:'pem'}));}"
```

- [ ] **Step 2: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCorpus } from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs";
import { FAMILY_COUNTS, ATTACK_FAMILIES } from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";
import { evaluateVrta } from "../../../../tools/simurgh-attestation/stage4u/core/vrtaCore.mjs";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const priv = crypto.createPrivateKey(readFileSync("tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta-charter.pem"));
const pubPem = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();

test("corpus builds 58 fixtures across 8 families, all bound and complete", () => {
  const { bundle } = buildCorpus({ write: false });
  assert.equal(bundle.attack_fixtures.length, 58);
  assert.equal(bundle.finding_records.length, 58);
  for (const fam of ATTACK_FAMILIES)
    assert.equal(bundle.attack_fixtures.filter((f) => f.family === fam).length, FAMILY_COUNTS[fam]);
});
test("the assembled corpus bundle passes the audit-tier verifier GREEN", () => {
  const { bundle, engine } = buildCorpus({ write: false });
  assert.deepEqual(evaluateVrta(bundle, { pubKeyPem: pubPem, engine }), { raw: 0, reason: "green" });
});
test("corpus is deterministic (two builds → identical fixture digests)", () => {
  const a = buildCorpus({ write: false }).bundle;
  const b = buildCorpus({ write: false }).bundle;
  assert.deepEqual(a.attack_fixtures, b.attack_fixtures);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `node --test tests/unit/llmShield/stage4u/corpus.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the corpus builder**

Model each family generator on the 4S fixture builder (`tools/simurgh-attestation/stage4s/node/build-stage4s-fixtures.mjs`), reusing its receipt/bundle constructors. Key rules: (a) every fixture's `expected_raw` is the 4S/kernel code the malformation *should* trigger; (b) `observed_raw = evaluateChainSafe(payload.bundle).raw`; (c) `outcome_class = classify(expected_raw, observed_raw)`; (d) a `structural_forgery` fixture that cannot actually be forged (content-addressing) correctly yields `observed_raw === expected_raw` → `survived` — that is the honest headline result. The `fable_adaptive` family's four fixtures are pre-captured Fable attack payloads replayed deterministically (Lane A role); Lane B (Task 12) may overwrite these slots at runtime. Write `charter.json`, one JSON per fixture, and `corpus-index.json`. The importable `buildCorpus({ write })` returns `{ bundle, engine }` where `engine = (fixture) => evaluateChainSafe(fixture.payload.bundle).raw`.

Represent the deterministic generator with a small seeded counter (no RNG): fixture content derives only from `attack_id` + fixed template, so two runs are byte-identical.

- [ ] **Step 5: Run to verify it passes**

Run: `node --test tests/unit/llmShield/stage4u/corpus.test.js`
Expected: PASS (3/3).

- [ ] **Step 6: Generate the committed corpus and confirm it is prettier-ignored**

```bash
node tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs
npx prettier --check "docs/research/llm-shield/evidence/stage-4u/**" || echo "ignored (expected)"
git status --short docs/research/llm-shield/evidence/stage-4u/
```
Expected: files generated; prettier does not try to format them (ignored via Task 1).

- [ ] **Step 7: Commit**

```bash
git add tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs tests/unit/llmShield/stage4u/corpus.test.js \
  tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_delegat*.pem \
  docs/research/llm-shield/evidence/stage-4u/fixtures/
git commit -m "feat(4u): Lane A offline attack corpus — 58 seed-derived fixtures across 8 families"
```

---

## Task 9: `node/build-stage4u-attestation.mjs` — two-tier attestation + signing

**Files:**
- Create: `tools/simurgh-attestation/stage4u/node/build-stage4u-attestation.mjs`
- Create key: `INSECURE_FIXTURE_ONLY_vrta.pem` (attestation signer)
- Test: `tests/unit/llmShield/stage4u/attestation.test.js` (build half)
- Output: `docs/research/llm-shield/evidence/stage-4u/attestation/vrta-attestation.json`

**Interfaces:** (mirror 4S `build-stage4s-attestation.mjs`)
- Produces:
  - `computeStructural(fixturesDir) -> { epoch, charter_digest, attack_manifest_root, corpus_digest, per_fixture:[{attack_id,expected_raw,fixture_digest}], asr }` (NO engine run).
  - `computeAttestation(fixturesDir, signerKeyDigest) -> structural + { per_fixture adds observed_raw + outcome_class }` (engine run).
  - `signAttestation(att, privKey) -> { ...att, signature }` (sign over canonicalJson of the unsigned att).
  - `bundleMerkleRoot(att)` over the four arrays (`charter`, `attack_fixtures`, `finding_records`, `asr_ledger`) using `merkleRootSorted`.
  - CLI `--key <pem> --out <path>`.

- [ ] **Step 1: Generate the attestation signer key**

```bash
node -e "const c=require('crypto');const fs=require('fs');const d='tests/fixtures/llmShield/stage4u/test-keys/';const{privateKey,publicKey}=c.generateKeyPairSync('ed25519');fs.writeFileSync(d+'INSECURE_FIXTURE_ONLY_vrta.pem',privateKey.export({type:'pkcs8',format:'pem'}));fs.writeFileSync(d+'INSECURE_FIXTURE_ONLY_vrta.pub.pem',publicKey.export({type:'spki',format:'pem'}));"
```

- [ ] **Step 2: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStructural, computeAttestation, signAttestation }
  from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-attestation.mjs";

test("structural attestation has 58 fixtures and no observed_raw (public tier)", () => {
  const s = computeStructural();
  assert.equal(s.per_fixture.length, 58);
  assert.ok(!("observed_raw" in s.per_fixture[0]));
  assert.match(s.attack_manifest_root, /^sha256:/);
});
test("audit attestation adds observed_raw + outcome_class", () => {
  const a = computeAttestation();
  assert.ok("observed_raw" in a.per_fixture[0]);
  assert.ok("outcome_class" in a.per_fixture[0]);
});
test("signature verifies against the signer public key", () => {
  const crypto = require("node:crypto"); const { readFileSync } = require("node:fs");
  const priv = crypto.createPrivateKey(readFileSync("tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta.pem"));
  const pub = crypto.createPublicKey(priv);
  const att = signAttestation(computeAttestation(), priv);
  const { signature, ...body } = att;
  const { canonicalJson } = require("../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs");
  assert.ok(crypto.verify(null, Buffer.from(canonicalJson(body)), pub, Buffer.from(signature, "hex")));
});
```

*(Note: convert `require` to top imports if the runner is ESM-only; the 4S test uses static imports — match that file.)*

- [ ] **Step 3: Run to verify it fails**, then **Step 4: implement** (copy 4S structure, swap in VRTA schema/domains, the four-array Merkle root, and the ASR ledger), **Step 5: run to pass**, **Step 6: generate + commit**:

```bash
node tools/simurgh-attestation/stage4u/node/build-stage4u-attestation.mjs --key tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta.pem --out docs/research/llm-shield/evidence/stage-4u/attestation/vrta-attestation.json
git add tools/simurgh-attestation/stage4u/node/build-stage4u-attestation.mjs tests/unit/llmShield/stage4u/attestation.test.js tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta*.pem docs/research/llm-shield/evidence/stage-4u/attestation/
git commit -m "feat(4u): two-tier VRTA attestation builder + signer"
```

---

## Task 10: `node/verify-stage4u-attestation.mjs` — two-tier verifier + CLI

**Files:**
- Create: `tools/simurgh-attestation/stage4u/node/verify-stage4u-attestation.mjs`
- Test: extend `tests/unit/llmShield/stage4u/attestation.test.js` (verify half)

**Interfaces:** (mirror 4S `verify-stage4s-attestation.mjs`)
- Produces: `verifyAttestation(att, { tier, pubKeyPem }) -> { ok, raw, reason, tier }`. Public tier: charter binding, manifest-root recompute, corpus-count completeness, signature, ASR-ledger recompute — no engine. Audit tier: additionally re-run each fixture through `evaluateChainSafe` and re-derive `observed_raw` + `outcome_class`, catching 127/128/129. CLI `--tier public|audit --pubkey <pem>`; exit code = `raw`.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4u/node/verify-stage4u-attestation.mjs";

const att = JSON.parse(readFileSync("docs/research/llm-shield/evidence/stage-4u/attestation/vrta-attestation.json", "utf8"));
const pub = readFileSync("tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta.pub.pem", "utf8");

test("public tier verifies GREEN", () => {
  assert.equal(verifyAttestation(att, { tier: "public", pubKeyPem: pub }).raw, 0);
});
test("audit tier verifies GREEN (engine re-run)", () => {
  assert.equal(verifyAttestation(att, { tier: "audit", pubKeyPem: pub }).raw, 0);
});
test("flipping a per-fixture expected_raw breaks audit tier (128 or 129)", () => {
  const t = JSON.parse(JSON.stringify(att));
  t.per_fixture[0].expected_raw = t.per_fixture[0].expected_raw === 0 ? 111 : 0;
  const r = verifyAttestation(t, { tier: "audit", pubKeyPem: pub });
  assert.ok(r.raw === 120 || r.raw === 128 || r.raw === 129); // sig-over-body may also trip
});
```

- [ ] **Step 2–5:** run→fail, implement (mirror 4S verify), run→pass, then generate the reproduce-friendly outputs. **Commit:**

```bash
git add tools/simurgh-attestation/stage4u/node/verify-stage4u-attestation.mjs tests/unit/llmShield/stage4u/attestation.test.js
git commit -m "feat(4u): two-tier VRTA attestation verifier + CLI"
```

---

## Task 11: `python/vrta_parity.py` — stdlib parity for the offline outcome model

**Files:**
- Create: `tools/simurgh-attestation/stage4u/python/vrta_parity.py`
- Test: `tests/unit/llmShield/stage4u/parity.test.js` (drives the python via subprocess and compares)

**Interfaces:**
- Produces (Python): `canonical_json(obj)` (matches JS: `json.dumps(sort_keys=True, separators=(",",":"), ensure_ascii=False)`), `record_digest(obj)`, `classify(expected, observed)`, `recompute_asr(findings)`. Reads `corpus-index.json`, recomputes `classify` + ASR, prints JSON `{ asr, over_refusal_rate, per_fixture:[{attack_id, outcome_class}] }`.
- Parity contract: Python `classify`/ASR/`record_digest` must equal the JS values for every non-signature field (Python has no Ed25519 — signatures are excluded from parity, exactly as 4S excludes them).

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildCorpus } from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs";
import { recomputeAsr } from "../../../../tools/simurgh-attestation/stage4u/core/findingLedger.mjs";

test("python parity: classify + ASR match JS on the whole corpus", () => {
  const { bundle } = buildCorpus({ write: false });
  const js = recomputeAsr(bundle.finding_records);
  const out = JSON.parse(execFileSync("python3", ["tools/simurgh-attestation/stage4u/python/vrta_parity.py"], { encoding: "utf8" }));
  assert.equal(out.asr, js.asr);
  assert.equal(out.over_refusal_rate, js.over_refusal_rate);
  for (const p of out.per_fixture) {
    const f = bundle.finding_records.find((x) => x.attack_id === p.attack_id);
    assert.equal(p.outcome_class, f.outcome_class);
  }
});
```

- [ ] **Step 2–4:** run→fail, implement the Python (only stdlib: `json`, `hashlib`), run→pass.
- [ ] **Step 5: Format only the new Python file and commit** (never run black on the repo/kernel):

```bash
black tools/simurgh-attestation/stage4u/python/vrta_parity.py
git add tools/simurgh-attestation/stage4u/python/vrta_parity.py tests/unit/llmShield/stage4u/parity.test.js
git commit -m "feat(4u): python stdlib parity for VRTA outcome model + ASR"
```

---

## Task 12: `laneb/` — capped live Fable-5 adaptive lane (disabled-by-default) + verify-only replay

**Files:**
- Create: `tools/simurgh-attestation/stage4u/laneb/fable-attacker.mjs`
- Create: `tools/simurgh-attestation/stage4u/laneb/run-laneb-vrta.mjs`
- Test: `tests/e2e/llmShield/stage4u/laneb.test.js` (verify-only, no live call)
- Output (when live-run): `docs/research/llm-shield/evidence/stage-4u/laneb/laneb-capture.json`

**Interfaces:**
- Produces:
  - `fable-attacker.mjs`: `attackOnce({ client, charter, capState }) -> { attack_id, prompt, response, produced_bundle | null, outcome_class }`. Lazy-imports the model SDK **only** when `VRTA_LANE_B=1`; otherwise throws `LaneBDisabledError`. Enforces caps (`max_turns`, `max_tokens`, `max_spend_usd`) from `charter.caps`; a breach records `cap_exceeded` and stops (feeds vrtaCore 123). A Fable refusal is captured verbatim → `outcome_class = "model_refused"` (never rephrased; rail `a_fable_refusal_is_recorded_as_outcome_never_...`). The system prompt embeds `charterDigest` + plain-scope text per spec §6.1.
  - `run-laneb-vrta.mjs`: `runVrtaLaneB({ live }) -> capture`. When `live=false` (default, CI), it **verifies** an existing `laneb-capture.json` by replaying its recorded outcomes through `evaluateChainSafe` — it never calls the model. When `live=true` (manual), it drives `attackOnce` up to `fable_adaptive` count, fills those manifest slots, and writes the capture.
- Consumes: `charter.mjs`, `dualSignal.classify`, `evaluateChainSafe`.

- [ ] **Step 1: Write the failing verify-only test**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { runVrtaLaneB } from "../../../../tools/simurgh-attestation/stage4u/laneb/run-laneb-vrta.mjs";
import { attackOnce } from "../../../../tools/simurgh-attestation/stage4u/laneb/fable-attacker.mjs";

test("Lane B is disabled by default — attackOnce throws without VRTA_LANE_B", async () => {
  delete process.env.VRTA_LANE_B;
  await assert.rejects(() => attackOnce({ client: null, charter: { caps: {} }, capState: {} }), /LaneBDisabled/);
});
test("verify-only replay of a captured Lane B reproduces recorded outcomes (no live call)", () => {
  const res = runVrtaLaneB({ live: false });
  assert.equal(res.raw, 0);          // capture re-verifies
  assert.ok(res.verified_count >= 0); // 0 if capture absent → still GREEN (graceful degradation)
});
test("a recorded refusal stays model_refused on replay (never rephrased)", () => {
  const res = runVrtaLaneB({ live: false });
  for (const r of res.replayed || []) if (r.recorded_class === "model_refused") assert.equal(r.replay_class, "model_refused");
});
```

- [ ] **Step 2–4:** run→fail, implement both files (SDK import guarded by `VRTA_LANE_B`; caps enforced; refusal captured verbatim; verify-only path replays without the model), run→pass.
- [ ] **Step 5: Commit** (do not commit a live capture unless produced intentionally on a real account):

```bash
git add tools/simurgh-attestation/stage4u/laneb/ tests/e2e/llmShield/stage4u/laneb.test.js
git commit -m "feat(4u): capped disabled-by-default live Fable-5 Lane B + verify-only replay"
```

---

## Task 13: `proofs/stage4u/NoSilentBypass.lean` — two theorems + two lemmas

**Files:**
- Create: `proofs/stage4u/NoSilentBypass.lean`
- Create: `proofs/stage4u/lean-toolchain` (`leanprover/lean4:v4.15.0`)

**Interfaces:** (self-contained Lean, no mathlib)
- `charterBindingSound` — model the check order as a list; if the schema/charter gates (119/120/121) fire, the evaluator returns a non-zero code, so a GREEN result implies charter binding held.
- `asrMonotone` — `asr` as `bypass / max(1, executed)`; prove adding a confirmed bypass (increment `bypass` and `executed` together, or `bypass` alone when the attack was already executed) never decreases the numerator-driven rate under the frozen denominator rule.
- Lemmas: `completenessNoOmission` (finding-count = planned-count is necessary for GREEN), `bypassIsOutcomeNotFailure` (a `bypass` outcome tag is disjoint from the integrity-failure set {119..132}).

- [ ] **Step 1: Write the Lean with explicit `#eval`/`example` checks; zero `sorry`.** Model codes as `Nat`, the check order as `List Nat`, and use `Nat.le_refl` / `Nat.le_trans` (NOT bare `le_trans` — 4S gotcha).

- [ ] **Step 2: Verify locally**

Run: `lean proofs/stage4u/NoSilentBypass.lean`
Expected: no output, exit 0 (compiles, zero `sorry`).

- [ ] **Step 3: Commit**

```bash
git add proofs/stage4u/NoSilentBypass.lean proofs/stage4u/lean-toolchain
git commit -m "feat(4u): Lean — charterBindingSound + asrMonotone (No Silent Bypass)"
```

---

## Task 14: `scripts/reproduce-llm-shield-stage4u.sh` — verify-only reproduce

**Files:**
- Create: `scripts/reproduce-llm-shield-stage4u.sh` (chmod +x)

**Interfaces:**
- A 9-step verify-only script: (1) rebuild corpus to a temp dir and `cmp` fixture digests against committed; (2) `verify-stage4u-attestation --tier public`; (3) `--tier audit`; (4) recompute ASR ledger and compare; (5) python parity; (6) Lane B verify-only replay; (7) epoch-tamper the attestation → expect a non-zero VRTA code; (8) guarded `lean proofs/stage4u/NoSilentBypass.lean` (skip if `lean` absent); (9) print `REPRODUCE OK`. Byte-stable under Node 26.

- [ ] **Step 1: Write the script** following `scripts/reproduce-llm-shield-stage4s.sh` structure (guarded lean, verify-only Lane B, `set -euo pipefail`).

- [ ] **Step 2: Run end-to-end under Node 26**

Run: `PATH="/opt/homebrew/opt/node@26/bin:$PATH" bash scripts/reproduce-llm-shield-stage4u.sh`
Expected: prints `REPRODUCE OK`, exit 0.

- [ ] **Step 3: Commit**

```bash
chmod +x scripts/reproduce-llm-shield-stage4u.sh
git add scripts/reproduce-llm-shield-stage4u.sh
git commit -m "feat(4u): verify-only reproduce script (byte-stable, guarded lean, verify-only Lane B)"
```

---

## Task 15: Docs — closeout, README row, north-star update

**Files:**
- Create: `docs/research/llm-shield/STAGE_4U_CLOSEOUT.md`
- Modify: `README.md` (stage table — add the 4U row after 4S)
- Modify: `docs/research/llm-shield/NORTH_STAR_VDCC.md` (mark VRTA as the shipped hardening rung before 4T)

**Interfaces:** none (docs).

- [ ] **Step 1: Write `STAGE_4U_CLOSEOUT.md`** — core claim (verbatim), the eight attack families + honest per-family result, the real ASR (both lanes), any confirmed bypass with signed severity, the four-axis re-score with evidence, and the reproduce command. Every number copied from the generated attestation, not from memory.

- [ ] **Step 2: Add the README stage row** (neutral copy, match the 4S row format): stage, law "No Silent Bypass", tag `v2.29.0-stage-4u-vrta`, one-line claim.

- [ ] **Step 3: Update `NORTH_STAR_VDCC.md`** — note 4U hardens the chain verifier before the 4T Incident Capsule.

- [ ] **Step 4: Prettier-format the docs and commit**

```bash
npx prettier --write README.md docs/research/llm-shield/STAGE_4U_CLOSEOUT.md docs/research/llm-shield/NORTH_STAR_VDCC.md
git add README.md docs/research/llm-shield/STAGE_4U_CLOSEOUT.md docs/research/llm-shield/NORTH_STAR_VDCC.md
git commit -m "docs(4u): closeout, README row, north-star hardening-rung note"
```

---

## Task 16: Comprehensive K7 all-functions E2E net + docs-accuracy pass

**Files:**
- Create: `tests/e2e/llmShield/stage4u/k7AllFunctions.test.js`
- Test target: every VRTA export + the full 119–132 tamper matrix + read-only-kernel assertion

**Interfaces:**
- Consumes: every exported function from Tasks 2–10.
- Produces: the standing all-functions net (mandatory before tag).

- [ ] **Step 1: Write the E2E net** — it must:
  1. Compose the full pipeline: `buildCorpus → build attestation → verify public → verify audit`, asserting GREEN end-to-end.
  2. **Tamper matrix:** for each code 119–132, construct a bundle that trips exactly that code and assert `evaluateVrtaSafe(...).raw === code`. Use `UNKNOWN_RAW_PROBE` (999) for any "unmapped" probe — never a bare unused number.
  3. **Cross-stage invariants:** charter binding, manifest-root recompute, ASR recompute, dual-signal 127-vs-128 independence, precommitted completeness 125/126.
  4. **Read-only-kernel assertion:** `git diff --name-only <base>..HEAD` (via `execFileSync("git", …)`, NOT shelling `rg`) contains no path under `tools/agentdojo-simurgh-adapter/` and no `src/llmShield` change; assert the six `authorise*` signatures in `capability_kernel.py` are unchanged by hashing the file and comparing to the value recorded at branch start.

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateVrtaSafe } from "../../../../tools/simurgh-attestation/stage4u/core/vrtaCore.mjs";
import { VRTA_CHECK_ORDER } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("tamper matrix: every VRTA code 119..132 is independently reachable", () => {
  for (const code of VRTA_CHECK_ORDER) {
    const bundle = buildBundleTripping(code); // helper defined in-file per family above
    assert.equal(evaluateVrtaSafe(bundle, tripOpts(code)).raw, code, `code ${code}`);
  }
});
// … full pipeline + read-only-kernel assertions per Step 1 …
```

- [ ] **Step 2: Run the net**

Run: `node --test tests/e2e/llmShield/stage4u/k7AllFunctions.test.js`
Expected: PASS (all 14 codes + pipeline + kernel-frozen).

- [ ] **Step 3: Docs-accuracy pass** — re-read `STAGE_4U_CLOSEOUT.md`, the README row, and the spec's frozen claim; verify **every** numeric/claim against the generated attestation and the shipped code. Fix any drift. Confirm the spec's file-structure list matches what exists.

- [ ] **Step 4: Full gate under Node 26**

Run:
```bash
npm test
PATH="/opt/homebrew/opt/node@26/bin:$PATH" bash scripts/check-e2e.sh
PATH="/opt/homebrew/opt/node@26/bin:$PATH" bash scripts/reproduce-llm-shield-stage4u.sh
bash scripts/reproduce-llm-shield-stage4s.sh   # prior stage still reproduces (additive-code safety)
```
Expected: all green; `REPRODUCE OK` for both 4U and 4S.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/llmShield/stage4u/k7AllFunctions.test.js
git commit -m "test(4u): comprehensive K7 all-functions E2E net + tamper matrix + read-only-kernel guard"
```

- [ ] **Step 6: Finish the branch** — invoke `superpowers:finishing-a-development-branch` (verify tests → present merge/PR options). Do NOT tag until CI is green; then `git tag -a v2.29.0-stage-4u-vrta` after confirming `git tag --sort=-creatordate | head`.

---

## Self-Review

**1. Spec coverage:**
- §0/§1 non-malice framing → Tasks 2 (rails), 3 (charter). ✓
- §2 non-claims/limitations/rails → Task 2. ✓
- §3 charter + §3.1 manifest root + §3.2 binding → Task 3. ✓
- §4 read-only surface → Task 16 kernel-frozen assertion. ✓
- §5 eight families → Task 8. ✓
- §6/§6.1 two lanes + safeguard-legibility + refusal-as-data → Tasks 8 (Lane A), 12 (Lane B). ✓
- §7 ASR formula + 127/128 split → Tasks 5, 6. ✓
- §8 codes 119–132 + order → Task 1. ✓
- §9 two-tier attestation → Tasks 9, 10. ✓
- §10 reproduce/hermeticity → Task 14. ✓
- §11 two Lean theorems + two lemmas → Task 13. ✓
- §12 kernel touch none → Task 16. ✓
- §13 prior-art → Task 15 closeout. ✓
- §14 scorecard → Task 15 (re-score at closeout). ✓
- §15 E2E + docs-accuracy → Task 16. ✓
- §16 file structure → File Structure section + all tasks. ✓
- §17 closeout obligations → Task 15 + post-merge (memory write). ✓

**2. Placeholder scan:** Tasks 8/9/10/12/13 lean on "mirror the 4S file" for large mechanical builders rather than repeating hundreds of lines; each still specifies exact exports, return shapes, the precise rule set, and a complete failing test. No `TODO`/`TBD`/"handle edge cases". ✓

**3. Type consistency:** `charterDigest`, `deriveAttackIds`, `classify`, `recomputeAsr`, `verifyLedger`, `verifyFinding`, `evaluateVrta(Safe)`, `validateFixture`, `nonMaliceViolation`, `bindsCharter` names are identical across producer and consumer tasks; bundle shape `{ charter, attack_fixtures, finding_records, asr }` is used consistently in Tasks 7/8/9/16; outcome classes `survived|bypass|model_refused` consistent in Tasks 2/5/6/12. ✓

---

**Post-merge ritual (after tag):** push tag, create neutral GitHub Release marked latest, watch main-push Quality Gate + lean-check to success, write `project_stage-4u-vrta.md` + a `feedback`/gotcha memory if any surfaced, update `MEMORY.md`. Next roadmap rung: **Stage 4T — Incident Capsule (EU AI Act Art-73)**, now projecting a red-team-hardened chain.
