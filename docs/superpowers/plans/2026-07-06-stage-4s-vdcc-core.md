# Stage 4S — VDCC-Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

**Goal:** Ship Stage 4S — Verifiable Delegation-Chain Completeness: dual-signed hop-receipt trees with window-close fan-out commitments, flux/attenuation laws, No Ghost Hop enforced at the Capability Kernel, raw codes 100–118, Lane A + Lane B (2-process + real MCP hop), two-tier verifier, Lean proofs, Python parity.

**Architecture:** Pure-function core modules under `tools/simurgh-attestation/stage4s/` (constants → scope lattice → tree invariants → fan-out → flux → chainCore decision engine), consumed by fixture builder, attestation builder, two-tier verifier, and an additive Capability Kernel entry `authorise_with_chain` (sixth family member, all predecessors frozen). Evidence under `docs/research/llm-shield/evidence/stage-4s/`.

**Tech Stack:** Node ≥22 ESM (Node 26 for byte-stable reproduce), `node:test`, `node:crypto` Ed25519, Python 3 stdlib, Lean 4 v4.15.0 (no mathlib), zero new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-stage-4s-vdcc-core-design.md` — every §-reference below is to it.
- Raw codes **100–118** exactly as spec §11; frozen check order `100 → 101 → 102 → 103 → 113 → 104 → 105 → 106 → 107 → 108 → 110 → 109 → 112 → 111 → 114 → 115 → 116 → 117 → 118`.
- ZERO new npm/pip dependencies. All digests via `tools/simurgh-attestation/stage4m/core/canonical.mjs` (`canonicalJson`, `recordDigest`, `DIGEST_RE`).
- Every new `.mjs`/`.py`/`.lean` file starts with the SPDX line and the motto comment (copy any stage4r header).
- Scope = sorted unique lowercase string array; `A ⊑ B` iff `A ⊆ B`. Budget/spend = non-negative integers.
- Root receipt: `parent_receipt_digest: null`, `root_receipt_digest: "self"` (constant `ROOT_SENTINEL`).
- Signature semantics (§11): present-but-empty/invalid signature → 101; MISSING signature field → 100.
- Duplicate `declared_child_receipt_digests` → 100 (§4).
- Fixture keys: `test-keys/INSECURE_FIXTURE_ONLY_stage4s_*.pem` (regex-allowlisted in BOTH `scripts/audit-3m-private-keys.sh`-style scripts — find the exact two script paths with `grep -rln INSECURE_FIXTURE_ONLY scripts/`).
- `evidence/stage-4s` fully prettier-ignored (4N lesson). `npm run format` before every digest recompute.
- Unit tests in `tests/unit/llmShield/stage4s/` (gated by `npm test`); e2e in `tests/e2e/llmShield/stage4s/` (must be wired into `scripts/check-e2e.sh` explicitly — 4L lesson). Explicit `*.test.js` globs, never bare dirs. Never shell `rg` in a unit test.
- Neutral commit messages; no attribution trailers of any kind.
- Version: `v2.28.0-stage-4s-vdcc-core` — confirm with `git tag --sort=-creatordate | head -3` before tagging.

---

## File Structure

```text
tools/simurgh-attestation/stage4s/
  constants.mjs                 # schemas, domains, rails, non-claims, kinds, sentinel
  core/scopeLattice.mjs         # normalizeScope, scopeLeq, pathScope
  core/treeCore.mjs             # indexBundle, verifyTreeInvariants (102/103/113/104/105)
  core/fanoutCore.mjs           # buildFanoutCommitment, verifyFanoutCommitments (100/106/107)
  core/fluxCore.mjs             # verifyFlux (110/109)
  core/bundleMerkle.mjs         # bundleRoot (4O algorithm, stage4s domains)
  core/receiptBuilder.mjs       # keygen-consuming builders + dual sign + assembleChainBundle
  core/chainCore.mjs            # evaluateChain / evaluateChainSafe — THE decision engine
  laneb/delegatee-mcp-server.mjs# process B: minimal MCP-style JSON-RPC server over stdio
  laneb/run-laneb-ceremony.mjs  # process A orchestrator: spawns B, real hop, receipts
  node/build-stage4s-fixtures.mjs
  node/build-stage4s-attestation.mjs
  node/verify-stage4s-attestation.mjs   # two-tier: --tier public|audit
  python/vdcc_kernel.py         # standalone parity reimplementation
tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/
  vdcc_surface.py               # pure decision surface mirroring chainCore
  capability_kernel.py          # + authorise_with_chain (additive; 5 predecessors FROZEN)
proofs/stage4s/NoGhostHop.lean  # 6 theorems, zero sorry
scripts/reproduce-llm-shield-stage4s.sh
tests/unit/llmShield/stage4s/   # constants, scopeLattice, treeCore, fanoutCore, fluxCore,
                                # receiptBuilder, chainCore, exitCodes, fixturesCorpus, parity
tests/e2e/llmShield/stage4s/    # k7AllFunctions.test.js, laneb.test.js
docs/research/llm-shield/evidence/stage-4s/   # fixtures, bundles, attestation (prettier-ignored)
docs/research/llm-shield/STAGE_4S_CLOSEOUT.md
```

---

### Task 1: Golden sweep + raw-code registry 100–118

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (after `PCCC_REASONS_96`, before `HARNESS_CODES`)
- Modify: `tests/e2e/llmShield/stage4l/fullChain.e2e.test.js:128` (`[100, 3]` → `[999, 3]`)
- Modify: any other golden the sweep finds
- Test: `tests/unit/llmShield/stage4s/exitCodes.test.js`

**Interfaces:**

- Produces: `VDCC_RAW_CODES` (map name→100..118), `VDCC_CHECK_ORDER` (frozen array), `VDCC_REASONS_100` (frozen reason strings for raw 100), and `RUN_LEVEL_BY_RAW` rows `100..118 → 1` — all later tasks import these from `../../stage4h/exitCodes.mjs`.

- [ ] **Step 1: Sweep goldens with BOTH grep forms (4R lesson) and list hits**

```bash
grep -rn "\[100, 3\]\|\[100,3\]" tests/ tools/ | grep -v node_modules
grep -rn "unknown.*raw\|raw.*unknown" tests/e2e/llmShield/stage4l/fullChain.e2e.test.js
grep -rln "exit-map" tests/ tools/ docs/ | grep -v node_modules
grep -rn "99, 3\|100, 3" tests/e2e/ tests/unit/ | grep -v node_modules
```

Expected: at minimum `tests/e2e/llmShield/stage4l/fullChain.e2e.test.js:128` (`[100, 3]`). Record every other hit; each becomes a modify target in Step 4.

- [ ] **Step 2: Write the failing test**

`tests/unit/llmShield/stage4s/exitCodes.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S raw-code registry gate (4S spec §11). Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VDCC_RAW_CODES,
  VDCC_CHECK_ORDER,
  VDCC_REASONS_100,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VDCC_RAW_CODES is exactly the closed 100-118 block in spec order", () => {
  assert.deepEqual(VDCC_RAW_CODES, {
    MALFORMED_CHAIN_BUNDLE: 100,
    SIGNATURE_INVALID: 101,
    ROOT_MISSING_OR_MULTIPLE: 102,
    PARENT_DIGEST_MISMATCH: 103,
    CYCLE_DETECTED: 104,
    UNREACHABLE_NODE: 105,
    FANOUT_COUNT_MISMATCH: 106,
    FANOUT_CHILD_SET_MISMATCH: 107,
    SCOPE_ATTENUATION_VIOLATION: 108,
    BUDGET_FLUX_VIOLATION: 109,
    LOCAL_SPEND_OVERFLOW: 110,
    GHOST_HOP_DETECTED: 111,
    RECEIPTLESS_AUTHORITY_CROSSING: 112,
    SPLIT_BRAIN_CHILD: 113,
    EPOCH_REPLAY: 114,
    ROOT_REPLAY: 115,
    SPINE_REF_MISMATCH: 116,
    MERKLE_BUNDLE_MISMATCH: 117,
    INTERNAL_FAIL_CLOSED: 118,
  });
});

test("frozen check order matches spec §11 exactly", () => {
  assert.deepEqual(
    VDCC_CHECK_ORDER,
    [100, 101, 102, 103, 113, 104, 105, 106, 107, 108, 110, 109, 112, 111, 114, 115, 116, 117, 118]
  );
});

test("every VDCC code maps to run level 1 and stays out of the unknown bucket", () => {
  for (let raw = 100; raw <= 118; raw++) assert.equal(stage4CodeForRawCode(raw), 1);
  assert.equal(stage4CodeForRawCode(999), 3); // permanent unknown probe value
});

test("VDCC_REASONS_100 covers the malformed species from spec §4 and §11", () => {
  assert.ok(VDCC_REASONS_100.includes("duplicate_declared_child_digests"));
  assert.ok(VDCC_REASONS_100.includes("required_signature_field_missing"));
  assert.ok(Object.isFrozen(VDCC_REASONS_100));
});
```

- [ ] **Step 3: Run to verify failure**

Run: `node --test tests/unit/llmShield/stage4s/exitCodes.test.js`
Expected: FAIL — `VDCC_RAW_CODES` not exported.

- [ ] **Step 4: Implement registry + fix every golden from Step 1**

In `exitCodes.mjs`, after `PCCC_REASONS_96`:

```js
// Stage 4S VDCC codes (4S spec §11). NUMERIC order is allocation order; the
// NORMATIVE first-failure order is VDCC_CHECK_ORDER (113 immediately after 103
// so a split-brain child is never diagnosed as a cycle; 110 before 109 so a
// local overspend is never diagnosed as generic flux; 112 before 111 so "no
// binding at all" is never diagnosed as an orphan; 118 last, typed-wrapper only).
export const VDCC_RAW_CODES = Object.freeze({
  MALFORMED_CHAIN_BUNDLE: 100,
  SIGNATURE_INVALID: 101,
  ROOT_MISSING_OR_MULTIPLE: 102,
  PARENT_DIGEST_MISMATCH: 103,
  CYCLE_DETECTED: 104,
  UNREACHABLE_NODE: 105,
  FANOUT_COUNT_MISMATCH: 106,
  FANOUT_CHILD_SET_MISMATCH: 107,
  SCOPE_ATTENUATION_VIOLATION: 108,
  BUDGET_FLUX_VIOLATION: 109,
  LOCAL_SPEND_OVERFLOW: 110,
  GHOST_HOP_DETECTED: 111,
  RECEIPTLESS_AUTHORITY_CROSSING: 112,
  SPLIT_BRAIN_CHILD: 113,
  EPOCH_REPLAY: 114,
  ROOT_REPLAY: 115,
  SPINE_REF_MISMATCH: 116,
  MERKLE_BUNDLE_MISMATCH: 117,
  INTERNAL_FAIL_CLOSED: 118,
});
export const VDCC_CHECK_ORDER = Object.freeze([
  100, 101, 102, 103, 113, 104, 105, 106, 107, 108, 110, 109, 112, 111, 114, 115, 116, 117, 118,
]);
export const VDCC_REASONS_100 = Object.freeze([
  "chain_bundle_schema_invalid",
  "receipt_schema_invalid",
  "fanout_commitment_schema_invalid",
  "crossing_artifact_schema_invalid",
  "duplicate_declared_child_digests",
  "required_signature_field_missing",
]);
```

Extend `RUN_LEVEL_BY_RAW` with `100: 1,` through `118: 1,` rows. Change `tests/e2e/llmShield/stage4l/fullChain.e2e.test.js:128` `[100, 3]` → `[999, 3]` with comment `// 999: permanently outside every planned block`. Apply the same fix to every other Step-1 hit.

- [ ] **Step 5: Run new test + the known offenders**

```bash
node --test tests/unit/llmShield/stage4s/exitCodes.test.js
node --test tests/unit/llmShield/stage4h/*.test.js tests/unit/llmShield/stage4k/*.test.js
node --test tests/e2e/llmShield/stage4l/fullChain.e2e.test.js
npm test
```

Expected: ALL PASS (if a 4H/4K exitWrapper snapshot or exit-map golden fails, update that golden — the additive-code breakage list is spec §11).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add stage 4s vdcc raw codes 100-118 with frozen check order; move 4l unknown-code probe to permanent 999"
```

---

### Task 2: Stage constants

**Files:**

- Create: `tools/simurgh-attestation/stage4s/constants.mjs`
- Test: `tests/unit/llmShield/stage4s/constants.test.js`

**Interfaces:**

- Produces: `SCHEMAS` (`HOP_RECEIPT: "simurgh.vdcc_hop_receipt.v1"`, `FANOUT_COMMITMENT: "simurgh.vdcc_fanout_commitment.v1"`, `CROSSING_ARTIFACT: "simurgh.vdcc_crossing_artifact.v1"`, `CHAIN_BUNDLE: "simurgh.vdcc_chain_bundle.v1"`), `DOMAINS` (`RECEIPT: "SIMURGH_STAGE4S_RECEIPT_V1"`, `FANOUT: "SIMURGH_STAGE4S_FANOUT_V1"`, `CROSSING: "SIMURGH_STAGE4S_CROSSING_V1"`, `BUNDLE: "SIMURGH_STAGE4S_BUNDLE_V1"`, `ATTESTATION: "SIMURGH_STAGE4S_ATTESTATION_V1"`, `MERKLE_LEAF: "SIMURGH_STAGE4S_MERKLE_LEAF_V1"`, `MERKLE_NODE: "SIMURGH_STAGE4S_MERKLE_NODE_V1"`), `CROSSING_KINDS` (6, spec §3.3 order), `VDCC_NON_CLAIMS` (7, §2.1 order), `VDCC_KNOWN_LIMITATIONS` (5, §2.2 order), `VDCC_RAILS` (12, §2.3 order), `ROOT_SENTINEL = "self"`.

- [ ] **Step 1: Write the failing test**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S frozen constants gate (4S spec §2, §3). Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4s/constants.mjs";

test("schemas, domains, kinds, sentinel are frozen and exact", () => {
  assert.equal(C.SCHEMAS.HOP_RECEIPT, "simurgh.vdcc_hop_receipt.v1");
  assert.equal(C.SCHEMAS.CHAIN_BUNDLE, "simurgh.vdcc_chain_bundle.v1");
  assert.equal(C.DOMAINS.BUNDLE, "SIMURGH_STAGE4S_BUNDLE_V1");
  assert.deepEqual(C.CROSSING_KINDS, [
    "tool_execution",
    "export",
    "privilege_expansion",
    "consent_broadening",
    "disclosure_escalation",
    "destructive_mutation",
  ]);
  assert.equal(C.ROOT_SENTINEL, "self");
  for (const o of [C.SCHEMAS, C.DOMAINS, C.CROSSING_KINDS]) assert.ok(Object.isFrozen(o));
});

test("non-claims (7), limitations (5), rails (12) in spec order", () => {
  assert.equal(C.VDCC_NON_CLAIMS.length, 7);
  assert.equal(C.VDCC_NON_CLAIMS[0], "not_an_agent_identity_system");
  assert.equal(C.VDCC_KNOWN_LIMITATIONS.length, 5);
  assert.equal(C.VDCC_KNOWN_LIMITATIONS[3], "incident_capsule_deferred_to_stage_4t");
  assert.equal(C.VDCC_RAILS.length, 12);
  assert.ok(C.VDCC_RAILS.includes("merkle_inclusion_is_presence_not_completeness"));
  assert.ok(
    C.VDCC_RAILS.includes(
      "attenuation_enforcement_is_prior_art_our_claim_is_offline_recomputable_proof"
    )
  );
});
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/unit/llmShield/stage4s/constants.test.js` → FAIL (module missing).

- [ ] **Step 3: Implement `constants.mjs`** — copy the header style of `tools/simurgh-attestation/stage4r/constants.mjs`; export exactly the Interfaces list above, every array/object `Object.freeze`d, strings verbatim from spec §2.1/§2.2/§2.3/§3.

- [ ] **Step 4: Run to verify pass** — same command, PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s frozen constants (schemas, domains, rails, crossing kinds)"`

---

### Task 3: Scope lattice

**Files:**

- Create: `tools/simurgh-attestation/stage4s/core/scopeLattice.mjs`
- Test: `tests/unit/llmShield/stage4s/scopeLattice.test.js`

**Interfaces:**

- Produces: `normalizeScope(arr) -> string[]` (sorted unique lowercase; throws `TypeError` on non-array/non-string/empty-string members), `scopeLeq(a, b) -> boolean` (`A ⊆ B` on normalized sets), `pathScope(scopes) -> string[]` (intersection of an array of scope arrays; throws on empty input list).

- [ ] **Step 1: Write the failing test**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S scope lattice (4S spec §7): A ⊑ B iff A ⊆ B; path scope = intersection.
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeScope,
  scopeLeq,
  pathScope,
} from "../../../../tools/simurgh-attestation/stage4s/core/scopeLattice.mjs";

test("normalizeScope sorts, dedupes, lowercases, rejects junk", () => {
  assert.deepEqual(normalizeScope(["Mail.Read", "calendar.read", "mail.read"]), [
    "calendar.read",
    "mail.read",
  ]);
  assert.throws(() => normalizeScope("mail.read"), TypeError);
  assert.throws(() => normalizeScope([""]), TypeError);
  assert.throws(() => normalizeScope([42]), TypeError);
});

test("scopeLeq is subset order — narrower means fewer capabilities", () => {
  assert.ok(scopeLeq(["mail.read"], ["calendar.read", "mail.read"]));
  assert.ok(!scopeLeq(["mail.read", "mail.send"], ["mail.read"]));
  assert.ok(scopeLeq([], ["mail.read"])); // empty scope is bottom
  assert.ok(scopeLeq(["mail.read"], ["mail.read"])); // reflexive
});

test("pathScope is the running intersection along a path", () => {
  assert.deepEqual(
    pathScope([
      ["calendar.read", "mail.read", "mail.send"],
      ["mail.read", "mail.send"],
      ["mail.read"],
    ]),
    ["mail.read"]
  );
  assert.deepEqual(pathScope([["a"], ["b"]]), []); // disjoint collapses to bottom
  assert.throws(() => pathScope([]), TypeError);
});
```

- [ ] **Step 2: Verify failure** — `node --test tests/unit/llmShield/stage4s/scopeLattice.test.js` → FAIL.

- [ ] **Step 3: Implement**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S scope lattice (4S spec §7). Motto: AnthropicSafe First, then ReviewerSafe.
// For scope sets, A ⊑ B iff A ⊆ B — narrower = subset; no other reading is admitted.

export function normalizeScope(arr) {
  if (!Array.isArray(arr)) throw new TypeError("scope must be an array");
  const out = new Set();
  for (const s of arr) {
    if (typeof s !== "string" || s.length === 0)
      throw new TypeError("scope entries must be non-empty strings");
    out.add(s.toLowerCase());
  }
  return [...out].sort();
}

export function scopeLeq(a, b) {
  const bSet = new Set(normalizeScope(b));
  return normalizeScope(a).every((s) => bSet.has(s));
}

export function pathScope(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0)
    throw new TypeError("pathScope needs at least one scope");
  let acc = new Set(normalizeScope(scopes[0]));
  for (const s of scopes.slice(1)) {
    const cur = new Set(normalizeScope(s));
    acc = new Set([...acc].filter((x) => cur.has(x)));
  }
  return [...acc].sort();
}
```

- [ ] **Step 4: Verify pass**, then **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s scope lattice (subset order, path intersection)"`

---

### Task 4: Tree invariants

**Files:**

- Create: `tools/simurgh-attestation/stage4s/core/treeCore.mjs`
- Test: `tests/unit/llmShield/stage4s/treeCore.test.js`

**Interfaces:**

- Consumes: `ROOT_SENTINEL` from `../constants.mjs`; `recordDigest` from `../../stage4m/core/canonical.mjs`.
- Produces: `receiptDigest(receipt) -> "sha256:..."` (recordDigest over `{domain: DOMAINS.RECEIPT, receipt}` where `receipt` is the full signed object), `indexBundle(receipts) -> {byDigest: Map, childrenOf: Map, rootDigest, issue: null | {raw, reason}}`, `verifyTreeInvariants(index) -> {raw: 0} | {raw: 102|103|113|104|105, reason, detail}`.
- Detection semantics: split-brain (113) = one receipt digest listed as child of two parents OR a delegatee-node receipt whose `parent_receipt_digest` names two conflicting parents across duplicates; checked BEFORE cycles (spec check order `103 → 113 → 104 → 105`).

- [ ] **Step 1: Write the failing test** — build a helper `mkReceipt(parentDigest, name)` returning a minimal unsigned receipt object `{schema, epoch: "ep1", run_id: "run1", root_receipt_digest, parent_receipt_digest, delegator_key_digest, delegatee_key_digest, scope: ["mail.read"], budget_allocated: 6, spine_refs: {custody_4p: null, consent_4o: null, friction_4q: null}}`; cover:
  - honest 4-node tree (root + 2 children + 1 grandchild) → `{raw: 0}`
  - two roots → 102; zero roots (all have parents) → 102
  - child whose `parent_receipt_digest` matches no receipt → 103
  - same child digest under two parents (duplicate the receipt object with two different `parent_receipt_digest` values but identical `delegatee_key_digest` + duplicate declared linkage) → 113
  - A→B→A parent loop (two receipts naming each other, no root path) → root check fires first (102) so ALSO test a rooted cycle: root→A, A→B, B claims parent A AND A claims parent B via a third forged receipt → 104
  - disconnected island (valid parent digests among themselves but unreachable from root) → 105

- [ ] **Step 2: Verify failure.**

- [ ] **Step 3: Implement `treeCore.mjs`** — `indexBundle` builds `byDigest` (digest → receipt; duplicate digest with conflicting parent = record for 113), `childrenOf` (parentDigest → [childDigest...]); root = receipts with `parent_receipt_digest === null` (count ≠ 1 → 102). `verifyTreeInvariants` order: every non-root parent digest resolves (103) → in-degree computation over declared parents, any receipt appearing as child under ≥2 distinct parents or duplicate digest with conflicting parents (113) → DFS from root with visited set, back-edge (104) → any receipt not visited (105). Return `{raw: 0}` when clean.

- [ ] **Step 4: Verify pass**, **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s tree invariants (root, parent, split-brain, cycle, reachability)"`

---

### Task 5: Fan-out commitments (window-close)

**Files:**

- Create: `tools/simurgh-attestation/stage4s/core/fanoutCore.mjs`
- Test: `tests/unit/llmShield/stage4s/fanoutCore.test.js`

**Interfaces:**

- Consumes: `receiptDigest`, `indexBundle` (Task 4); `bundleRoot` NOT needed here — child-set root uses `recordDigest({domain: DOMAINS.FANOUT, child_digests: sorted})`.
- Produces: `buildFanoutCommitment({epoch, runId, windowId, delegatorKeyDigest, nodeReceiptDigest, childReceiptDigests}) -> unsigned commitment object` (sorts + rejects duplicates by throwing), `verifyFanoutCommitments(index, commitments) -> {raw: 0} | {raw: 100|106|107, reason, detail}`.
- Rules: duplicate declared digests → `{raw: 100, reason: "duplicate_declared_child_digests"}`; a node with NO commitment → 106 (`declared` treated as absent, count mismatch); count mismatch → 106; equal count but different set (or set-root mismatch) → 107. Zero-fan-out leaves MUST carry an explicit empty commitment (§3.2) — a missing leaf commitment is 106.

- [ ] **Step 1: Write the failing test** — honest tree with commitments for every node (leaves commit `declared_child_count: 0`, empty list) → 0; hidden child (parent commits 1 of its 2 children) → 106; same count, swapped digest (parent commits child X but observed child is Y) → 107; duplicate digests in declared list → verify returns 100; missing leaf commitment → 106.

- [ ] **Step 2: Verify failure.**

- [ ] **Step 3: Implement** — commitment object exactly spec §3.2 fields (without signature; signing is Task 7); `declared_child_set_root = recordDigest({domain: DOMAINS.FANOUT, child_digests})`. Verify recomputes observed children per node from `index.childrenOf` and compares count, then set equality AND root.

- [ ] **Step 4: Verify pass**, **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s window-close fanout commitments (exact child-set binding)"`

---

### Task 6: Budget flux

**Files:**

- Create: `tools/simurgh-attestation/stage4s/core/fluxCore.mjs`
- Test: `tests/unit/llmShield/stage4s/fluxCore.test.js`

**Interfaces:**

- Consumes: `indexBundle` result; crossing artifacts array (each `{bound_receipt_digest, spend}`).
- Produces: `verifyFlux(index, crossings) -> {raw: 0} | {raw: 110|109, reason, detail}` where `local_spend(node) = Σ spend of crossings bound to that node`; checks per node in digest-sorted order: `local_spend > budget_allocated` → 110 (`reason: "local_spend_overflow"`), else `local_spend + Σ child.budget_allocated > budget_allocated` → 109 (`reason: "budget_flux_violation"`).

- [ ] **Step 1: Write the failing test** — root budget 10 delegating 4+4 with local spend 2 → 0; local spend 3 (3+8>10) → 109 (double-dipping); Σ children 6+6=12>10, no local spend → 109 (amplification); leaf budget 2 with crossings spending 3 → 110; structuring probe: root 10, twenty children budget 1 each (Σ=20>10) → 109; **checked-before rule**: node where BOTH local overspend and flux violated → 110 (more specific first).

- [ ] **Step 2: Verify failure.** **Step 3: Implement** (pure arithmetic walk, integers only, reject negative/non-integer spend or budget by throwing `TypeError` — schema-level malformed is caught earlier at 100 in chainCore). **Step 4: Verify pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s budget flux law (local spend + children within parent, no double-dipping)"`

---

### Task 7: Receipt builder + bundle Merkle + dual signatures

**Files:**

- Create: `tools/simurgh-attestation/stage4s/core/bundleMerkle.mjs`
- Create: `tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs`
- Test: `tests/unit/llmShield/stage4s/receiptBuilder.test.js`

**Interfaces:**

- Consumes: `node:crypto` (`generateKeyPairSync("ed25519")`, `sign`, `verify`), `canonicalJson`/`recordDigest` from stage4m, constants, `receiptDigest` from treeCore.
- Produces:
  - `bundleMerkle.mjs`: `bundleRoot(digests) -> "sha256:..."` — the 4O `merkleSurface` algorithm (leaf/node domain separation, odd promotes) with `DOMAINS.MERKLE_LEAF` / `DOMAINS.MERKLE_NODE` and `SCHEMAS.CHAIN_BUNDLE`; copy the levels/promote logic from `tools/simurgh-attestation/stage4o/core/merkleSurface.mjs`, comment crediting it.
  - `receiptBuilder.mjs`: `keyDigest(publicKeyPem) -> "sha256:..."`, `buildHopReceipt({...spec §3.1 fields minus signatures})`, `dualSign(receipt, delegatorPrivKey, delegateePrivKey) -> signed receipt` (each signature = Ed25519 over `canonicalJson` of the receipt WITHOUT both signature fields, hex), `verifyDualSignature(receipt, delegatorPubPem, delegateePubPem) -> {ok} | {ok: false, missing: bool}` (missing field vs empty/invalid — spec §11 semantics), `signFanout(commitment, delegatorPrivKey)`, `signCrossing(artifact, actorPrivKey)`, `assembleChainBundle({epoch, runId, receipts, fanouts, crossings}) -> bundle` computing `bundle_merkle_root = bundleRoot([...receipt digests, ...fanout digests, ...crossing digests])` in that concatenation order (each via recordDigest with its own DOMAINS.\* domain) and embedding `VDCC_NON_CLAIMS`, `VDCC_KNOWN_LIMITATIONS`, `VDCC_RAILS`.

- [ ] **Step 1: Write the failing test** — generate two ephemeral keypairs; build + dual-sign a root receipt and one child; assert `verifyDualSignature` ok; tamper `budget_allocated` → not ok; DELETE `signature_delegatee` → `{ok: false, missing: true}`; set it to `""` → `{ok: false, missing: false}`; assemble a bundle from 2 receipts + 2 fanouts + 1 crossing and assert `bundle_merkle_root` matches an independently recomputed `bundleRoot`; assert bundle carries 7 non-claims / 5 limitations / 12 rails.

- [ ] **Step 2: Verify failure.** **Step 3: Implement.** **Step 4: Verify pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s receipt builder, dual signatures, bundle merkle commitment"`

---

### Task 8: chainCore — the decision engine (adversarial matrix)

**Files:**

- Create: `tools/simurgh-attestation/stage4s/core/chainCore.mjs`
- Test: `tests/unit/llmShield/stage4s/chainCore.test.js`

**Interfaces:**

- Consumes: everything from Tasks 2–7.
- Produces:
  - `evaluateChain(bundle, {publicKeys}) -> {raw, reason, detail}` — runs EXACTLY the frozen check order: schema shape of bundle/receipts/fanouts/crossings incl. missing signature fields + duplicate declared digests (100) → every dual signature + fanout + crossing signature verifies (101) → tree invariants via treeCore (102/103/113/104/105) → fanoutCore (106/107; its internal 100 surfaces as 100 — document that this cannot occur here because schema pass already rejected duplicates; keep the branch for defence) → scope: per-edge `scopeLeq(child, parent)` and per-crossing `scopeLeq(requested_scope, pathScope(bound node path))` (108) → fluxCore (110 then 109) → crossings: `bound_receipt_digest` absent field or empty (112) → binding digest is a VALIDLY SIGNED receipt present in `bundle.orphan_receipts` or absent from the verified tree (111) → replay: every receipt/crossing `epoch === bundle.epoch` (114) → every receipt `run_id === bundle.run_id && root_receipt_digest === (concrete root digest or ROOT_SENTINEL for root)` (115) → `spine_refs` digests, when non-null, must appear in `bundle.spine_index` (116) → recompute `bundle_merkle_root` (117) → `{raw: 0, reason: "green"}`.
  - `evaluateChainSafe(bundle, opts)` — try/catch typed wrapper: any thrown error → `{raw: 118, reason: "internal_fail_closed"}`.
  - `reSign(receipt, keys)` test helper EXPORTED from the test file only (not the module): after tampering signed content, re-sign so later codes are reachable (4R lesson).
- Bundle carries `orphan_receipts: []` (validly signed receipts NOT in the tree — Lane A fixture material for 111) and `spine_index: []` (declared spine digests).

- [ ] **Step 1: Write the failing test** — the FULL spec §12 matrix, one `test()` per row, each building the honest base tree (root + 2 children + 1 grandchild, budgets 10/4/4/2, scopes shrinking, commitments complete) then applying ONE mutation + `reSign` where needed:

| test                         | mutation                                             | expected                                                                                       |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| green                        | none                                                 | 0                                                                                              |
| hidden hop                   | add signed child, don't update parent fanout         | 106 or 107                                                                                     |
| orphan crossing              | crossing bound to receipt in `orphan_receipts`       | 111                                                                                            |
| receiptless crossing         | crossing with `bound_receipt_digest: ""`             | 112                                                                                            |
| split-brain                  | duplicate child receipt under second parent, reSign  | 113                                                                                            |
| forged attenuation           | child scope ⊋ parent scope, reSign both              | 108                                                                                            |
| crossing over-scope          | requested_scope outside path intersection            | 108                                                                                            |
| amplification                | children budgets sum over parent, reSign             | 109                                                                                            |
| double-dipping               | parent spends + delegates same budget                | 109                                                                                            |
| local overspend              | leaf crossings exceed leaf budget                    | 110                                                                                            |
| structuring                  | 20 under-threshold children                          | 109                                                                                            |
| wrong epoch                  | one receipt epoch "ep0", reSign                      | 114                                                                                            |
| wrong root right epoch       | receipt root_receipt_digest from sibling run, reSign | 115                                                                                            |
| tampered spine ref           | spine digest not in spine_index, reSign              | 116                                                                                            |
| dropped after seal           | remove one receipt, keep old merkle root             | 106/107 masked? NO — removal breaks fanout first; ALSO test crossing-only removal reaching 117 |
| single-signature hop         | `signature_delegatee: ""`                            | 101                                                                                            |
| missing signature field      | delete `signature_delegatee`                         | 100                                                                                            |
| dual root / cycle / island   | per Task 4 shapes, reSigned                          | 102/104/105                                                                                    |
| fail-closed                  | `evaluateChainSafe(null)`                            | 118                                                                                            |
| F9-a liar ledgers overbudget | honest commitment of over-budget delegation          | 109                                                                                            |
| F9-b zero-fanout leaf        | explicit empty commitment                            | 0                                                                                              |

- [ ] **Step 2: Verify failure.** **Step 3: Implement `evaluateChain` + `evaluateChainSafe`.** **Step 4: Verify ALL matrix rows pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s chain decision engine with frozen check order and full adversarial matrix"`

---

### Task 9: Lane A fixtures + corpus test + key hygiene

**Files:**

- Create: `tools/simurgh-attestation/stage4s/node/build-stage4s-fixtures.mjs`
- Create: `test-keys/INSECURE_FIXTURE_ONLY_stage4s_root.pem` (+ delegatorA/delegateeB/actor keys as the builder needs — generated once, committed)
- Modify: the two private-key audit scripts (find with `grep -rln "INSECURE_FIXTURE_ONLY" scripts/ | head`) — extend the path-regex allowlist to cover `test-keys/INSECURE_FIXTURE_ONLY_stage4s_[a-z]+\.pem` (NO digits in names — 4P lesson)
- Modify: `.prettierignore` — add `docs/research/llm-shield/evidence/stage-4s/`
- Test: `tests/unit/llmShield/stage4s/fixturesCorpus.test.js`

**Interfaces:**

- Produces: `docs/research/llm-shield/evidence/stage-4s/fixtures/` — `honest-tree.json` (depth 3, fan-out 3 at root, zero-fan-out leaves committed) + one fixture per matrix row (`fixture-106-hidden-hop.json`, ... one file per raw code 100–117; 118 needs no file) + `corpus-index.json` listing `{name, file, expected_raw}`. Deterministic: fixture scalars/keys from committed PEMs, stable field order via `canonicalJson`, NO timestamps (epoch = fixed `"win-2026-07-06"` string binding the 4N window anchor id used in evidence docs).

- [ ] **Step 1: Write the failing corpus test** — loads `corpus-index.json`, runs `evaluateChainSafe` on every fixture, asserts `raw === expected_raw` for all; asserts every code 100–117 appears at least once in the corpus and 118 is covered by the typed-wrapper test (reachability contract §11); asserts re-running the builder is byte-identical (`execFileSync` node builder twice into temp dirs, compare).

- [ ] **Step 2: Verify failure.** **Step 3: Implement builder** (uses receiptBuilder + the Task-8 mutation recipes; writes with `canonicalJson` + trailing newline). Generate keys: `node tools/simurgh-attestation/keygen.mjs` pattern or `generateKeyPairSync` + PEM export, WRITE ONCE, commit. Update BOTH audit scripts' allowlists. Add `.prettierignore` line. **Step 4: Verify pass + run both audit scripts** (`bash scripts/<audit-3m>.sh && bash scripts/<audit-3o>.sh` — exact names from the grep) → both GREEN.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s deterministic lane a fixture corpus covering all raw codes"`

---

### Task 10: Python parity kernel

**Files:**

- Create: `tools/simurgh-attestation/stage4s/python/vdcc_kernel.py`
- Test: `tests/unit/llmShield/stage4s/parity.test.js`

**Interfaces:**

- Produces: `python3 vdcc_kernel.py verify <corpus-index.json>` — standalone stdlib reimplementation of schema checks, Ed25519 verify (`cryptography` NOT allowed — use `hashlib` + skip signature verification is NOT acceptable either; use Python 3.13 stdlib: signatures verified via `hmac`-free path — **precedent**: follow `tools/simurgh-attestation/stage4r/python/pccc_kernel.py` which skips Ed25519 and parities the MATH layers; here parity covers tree/fanout/flux/scope/replay/merkle layers and expected raw for every NON-signature fixture; signature fixtures (100-missing-field, 101) are asserted JS-side only). Prints one canonical JSON line per fixture: `{"name", "raw", "reason"}` with `sort_keys=True, separators=(",", ":")`.
- Parity test: `execFileSync("python3", [kernel, "verify", corpusIndex])`, parse lines, compare against JS `evaluateChainSafe` outputs for every fixture whose expected code is not 101 (and not the missing-signature-field 100 variant).

- [ ] **Step 1: Write the failing parity test.** **Step 2: Verify failure.** **Step 3: Implement `vdcc_kernel.py`** (canonical_json exactly `json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`; record_digest `"sha256:" + sha256(canonical.encode()).hexdigest()`; reimplement treeCore/fanoutCore/fluxCore/scopeLattice/replay/merkle walks independently — same check order). **Step 4: Verify pass.**

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s python parity kernel over the lane a corpus"`

---

### Task 11: Capability Kernel — `authorise_with_chain` (sixth family member)

**Files:**

- Create: `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/vdcc_surface.py`
- Modify: `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py` (append ONLY — five predecessors byte-frozen)
- Test: `tools/agentdojo-simurgh-adapter/tests/test_vdcc_surface.py` (follow the existing pytest layout — `ls tools/agentdojo-simurgh-adapter/tests/` first and match naming)

**Interfaces:**

- `vdcc_surface.py`: `decide(bundle: dict, crossing: dict, verify_signature=None) -> dict` (`{"raw": int, "reason": str, "bound_receipt_digest": str}`) — pure stdlib port of the chainCore path RESTRICTED to what the kernel needs at a boundary: schema (100), tree invariants (102/103/113/104/105), fanout (106/107), scope for THIS crossing (108), flux including this crossing (110/109), binding (112/111), replay (114/115). `verify_signature` callable defaults to fail-closed refuse-all (`_refuse_all` precedent at `capability_kernel.py:244`) → signature failure = 101.
- `capability_kernel.py` additions (mirror the 4Q block style exactly):

```python
# --- Stage 4S: delegation-chain completeness (sixth additive family member) -----------
# The five functions above stay FROZEN. authorise_with_chain is a thin shim over the
# pure vdcc_surface.decide, mirroring the Node chainCore. 4S spec §8.


@dataclass(frozen=True)
class ChainContext:
    bundle: dict
    crossing: dict
    verify_signature: object = None


@dataclass
class ChainAuthorityDecision:
    decision: AuthorityDecision
    raw_code: int
    reason: str
    bound_receipt_digest: str = ""


def authorise_with_chain(action: Action, *, chain: ChainContext) -> "ChainAuthorityDecision":
    out = _vs.decide(
        bundle=chain.bundle, crossing=chain.crossing, verify_signature=chain.verify_signature
    )
    if out["raw"] != 0:
        return ChainAuthorityDecision(
            AuthorityDecision("block", out["reason"], action.family, [action.target]),
            out["raw"],
            out["reason"],
        )
    return ChainAuthorityDecision(
        AuthorityDecision("allow", "chain_receipt_bound", action.family),
        0,
        "accepted",
        out["bound_receipt_digest"],
    )
```

(with `from . import vdcc_surface as _vs` added at the import block — additive line only).

- [ ] **Step 1: Write failing pytest** — honest bundle+crossing → allow `chain_receipt_bound`; ghost/orphan → block 111; receiptless → block 112; over-scope → block 108; over-budget → block 110/109; **differential-equivalence**: import and call `authorise`, `authorise_with_intent`, `authorise_with_provenance`, `authorise_with_manifest`, `authorise_with_friction` on one existing corpus case each (reuse the existing tests' fixture data) and assert outputs equal the pre-4S expected values (frozen-predecessor gate).

- [ ] **Step 2: Verify failure** (`cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/test_vdcc_surface.py -q`). **Step 3: Implement `vdcc_surface.py` + kernel block.** **Step 4: Run full adapter pytest suite** — ALL PASS. **Step 5: Commit** — `git add -A && git commit -m "feat: add authorise_with_chain kernel entry over pure vdcc surface; five predecessors frozen"`

---

### Task 12: Attestation build + two-tier verifier

**Files:**

- Create: `tools/simurgh-attestation/stage4s/node/build-stage4s-attestation.mjs`
- Create: `tools/simurgh-attestation/stage4s/node/verify-stage4s-attestation.mjs`
- Test: `tests/unit/llmShield/stage4s/attestation.test.js`

**Interfaces:**

- Build: reads the fixture corpus + honest bundle, emits `docs/research/llm-shield/evidence/stage-4s/attestation/stage4s-attestation.json`: `{schema: "simurgh.vdcc_attestation.v1", epoch, corpus_digest, honest_bundle_digest, per_fixture: [{name, expected_raw, observed_raw, fixture_digest}], bundle_merkle_root, non_claims, known_limitations, rails, signature}` — signature = Ed25519 (stage4s key from `test-keys/INSECURE_FIXTURE_ONLY_stage4s_root.pem` for the committed artifact; the CLI takes `--key`) over `canonicalJson(parse(attestation-without-signature))` (3M prettier+merge-safe discipline). Two-stage digest per 4P: `attestation_digest = recordDigest({domain: DOMAINS.ATTESTATION, attestation})`.
- Verify: `--tier public` recomputes structure, signature, corpus digests, merkle root from the attestation + fixture digests alone (no raw payload resolution); `--tier audit` ADDITIONALLY re-runs `evaluateChainSafe` on every fixture file and compares `observed_raw`, and resolves `spine_refs` against `--spine-dir` when provided. Exit 0 GREEN / 1 RED with the failing raw code printed. Paths: `isAbsolute(dir) ? dir : join(ROOT, dir)` (4R verifier lesson).

- [ ] **Step 1: Write failing test** — build (into scratchpad temp dir), verify public → 0; verify audit → 0; tamper one `observed_raw` in the JSON → public catches signature break; reSign tampered file with fixture key → audit catches recompute mismatch while public passes (two-tier separation proof).
- [ ] **Step 2: Verify failure.** **Step 3: Implement both CLIs.** **Step 4: Verify pass; run builder into the committed evidence path; `npm run format` (evidence is prettier-ignored — confirm `git status` shows no reformat)**.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s attestation builder and two-tier verifier with signed corpus"`

---

### Task 13: Lane B — two processes + real MCP hop

**Files:**

- Create: `tools/simurgh-attestation/stage4s/laneb/delegatee-mcp-server.mjs`
- Create: `tools/simurgh-attestation/stage4s/laneb/run-laneb-ceremony.mjs`
- Test: `tests/e2e/llmShield/stage4s/laneb.test.js`

**Interfaces:**

- `delegatee-mcp-server.mjs`: a REAL MCP stdio server implementing `initialize` + `tools/list` + `tools/call` JSON-RPC 2.0 (follow the message shapes captured in `tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs` — read it first and reuse its framing). Exposes one tool `record_delegated_task {task: string}`. On `tools/call` it: generates its own ephemeral Ed25519 keypair at startup, co-signs the hop receipt the client sends in the tool arguments (`receipt_unsigned` + `delegator_signature`), returns `{delegatee_signature, delegatee_key_pem, crossing_artifact_signed}` for a `tool_execution` crossing it performs under the received scope/budget.
- `run-laneb-ceremony.mjs`: process A — generates ephemeral delegator keypair, builds root receipt (self-delegation of the window authority) + the A→B hop receipt (scope `["task.record"]`, budget 2), **spawns the MCP server as a second OS process** (`child_process.spawn(process.execPath, [serverPath], {stdio: ["pipe","pipe","inherit"]})`), performs the genuine MCP handshake + `tools/call` over stdio, collects B's co-signature + crossing, closes the window, mints fan-out commitments, assembles the bundle, runs `evaluateChainSafe` → writes `docs/research/llm-shield/evidence/stage-4s/laneb/laneb-capture.json` with `{bundle, verdict, transport: "mcp_stdio_jsonrpc2", process_isolation: {parent_pid_captured: true}}`. Ephemeral scalars never written to disk (4R rail). Harness computes all hashes (3V-A discipline). NO network sockets — stdio transport avoids the port-flake class entirely; if a socket is ever needed use reserved 33xxx (3V-A lesson).
- e2e test: runs the ceremony end-to-end, asserts verdict raw 0, asserts the receipt is genuinely dual-signed by two DIFFERENT keys, asserts two distinct PIDs were involved, asserts a tampered replay (mutate bundle epoch) now fails 114.

- [ ] **Step 1: Read `capture-mcp-manifest.mjs`, write the failing e2e test.** **Step 2: Verify failure.** **Step 3: Implement server then orchestrator.** **Step 4: `node --test tests/e2e/llmShield/stage4s/laneb.test.js`** → PASS; run ceremony once to produce the committed capture.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s lane b two-process ceremony with real mcp stdio hop"`

---

### Task 14: Lean proofs — NoGhostHop.lean

**Files:**

- Create: `proofs/stage4s/NoGhostHop.lean` + `proofs/stage4s/lean-toolchain` (copy `proofs/stage4m/lean-toolchain`)
- Modify: `.github/workflows/stage-4-lean-proofs.yml` (add `lean proofs/stage4s/NoGhostHop.lean` to the lean-check job)
- Test: local `lean proofs/stage4s/NoGhostHop.lean` (Node-side reproduce wiring is Task 15)

**Interfaces:**

- Six theorems over a symbolic model (finite trees as inductive `Node` with `children : List Node`, scopes as `List String` treated as sets via `⊆`-style membership predicate, budgets as `Nat`):
  1. `noGhostHop` — for a hop `h` not in the committed tree: `uncommittedChild h ∨ orphanBinding h ∨ receiptless h` (disjunction constructed from the model's exhaustive case split).
  2. `attenuationComposes` — `pathScope` (fold of intersect) is `⊆ rootScope` by induction.
  3. `fluxConservation` — `totalSpend t ≤ t.budget` by structural induction given the per-node law.
  4. `fanoutSound` — committed child list = observed child list at every node → tree equality of node multisets (no omitted node).
  5. `splitBrainExcluded` — single root + each non-root exactly one parent + reachability → parent function well-founded (tree).
  6. `inclusionNotCompleteness` — CONSTRUCT a two-tree model where a Merkle-style membership predicate holds for every element of the smaller tree yet `fanoutSound`'s hypothesis fails; conclude `¬(inclusion → completeness)` by exhibiting the counterexample.
- Zero `sorry`; no mathlib; single-file `lean <file>` must succeed on v4.15.0 (follow `proofs/stage4r/NoPublicHerdToken.lean` style — read it first).

- [ ] **Step 1: Read the 4R Lean file for idiom.** **Step 2: Write the six theorems.** **Step 3: Run `lean proofs/stage4s/NoGhostHop.lean`** (Node 26 PATH env if needed; lean via elan) → exits 0. **Step 4: Add to workflow lean-check job.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add stage 4s lean proofs (no ghost hop, attenuation, flux, fanout, split-brain, inclusion-not-completeness)"`

---

### Task 15: Reproduce script + CI wiring

**Files:**

- Create: `scripts/reproduce-llm-shield-stage4s.sh` (copy structure of `scripts/reproduce-llm-shield-stage4r.sh` — verify-only, numbered `run_step`s, guarded lean call)
- Modify: `scripts/check-e2e.sh` — add row `"Stage 4S VDCC|scripts/reproduce-llm-shield-stage4s.sh"` after line 125 AND add the stage4s e2e test files to whatever explicit test list the script runs (read it first)
- Test: run both scripts

**Interfaces:**

- Reproduce steps: (1) fixture-corpus digest recompute + byte-compare against committed evidence (`cmp`), (2) attestation verify `--tier public`, (3) attestation verify `--tier audit`, (4) python parity run + diff, (5) lane-b capture re-verify (`evaluateChainSafe` on committed capture → 0; epoch-tamper probe → 114), (6) kernel differential gate (`python3 -m pytest tests/test_vdcc_surface.py -q` from the adapter dir), (7) guarded lean: `if command -v lean >/dev/null 2>&1; then ... else echo skip; fi` (4R pattern verbatim).

- [ ] **Step 1: Write the script.** **Step 2: `bash scripts/reproduce-llm-shield-stage4s.sh`** → exit 0, all steps GREEN, run TWICE and `cmp` any rebuilt artifacts (byte-stable under Node 26: `/opt/homebrew/opt/node@26/bin` — 4H gotcha). **Step 3: Wire into `check-e2e.sh`; run `bash scripts/check-e2e.sh`** → GREEN including stage4s rows.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "ci: add stage 4s reproduce script and wire e2e gate"`

---

### Task 16: K7 all-functions E2E net + docs + closeout (MANDATORY before tag)

**Files:**

- Create: `tests/e2e/llmShield/stage4s/k7AllFunctions.test.js`
- Create: `docs/research/llm-shield/STAGE_4S_CLOSEOUT.md`
- Modify: `README.md` (stage table row), `docs/research/llm-shield/NORTH_STAR_VDCC.md` (status note: first rung shipped)
- Test: everything

**Interfaces:**

- K7 net (follow `tests/e2e/llmShield/stage4r/k7AllFunctions.test.js` shape): imports EVERY export of every stage4s module (constants, scopeLattice, treeCore, fanoutCore, fluxCore, bundleMerkle, receiptBuilder, chainCore) and drives them in one composed scenario; full tamper matrix re-asserted through `evaluateChainSafe`; cross-stage invariants: registry integrity 0–118 (every VDCC code in `RUN_LEVEL_BY_RAW`, check order is a permutation of 100–118), 4N epoch anchor string format shared with the evidence, spine_refs resolve against real 4P/4O/4Q evidence digests for at least one fixture, attestation verify both tiers, corpus ↔ python parity, lane-b capture re-verification.
- Closeout doc: what shipped, honest results table (every raw code + fixture), the §18 re-score with justification, limitations restated, reviewer-run instructions (one command: the reproduce script).

- [ ] **Step 1: Write the K7 net; run it** → PASS.
- [ ] **Step 2: Docs-accuracy pass (standing rule):** for EVERY claim in spec/closeout/README rows, verify against shipped code (grep the claimed function names, re-run the claimed commands, confirm counts like "19 codes", "12 rails", "6 theorems"). Fix any drift in the DOCS (never weaken code to match docs).
- [ ] **Step 3: Overclaim scan + full gates:**

```bash
npm run format && npm test
bash scripts/check-e2e.sh
bash scripts/reproduce-llm-shield-stage4s.sh
grep -rn "proves the model safe\|prevents all" docs/research/llm-shield/STAGE_4S_CLOSEOUT.md  # expect no hits
```

(run whatever overclaim-scan script exists: `ls scripts/ | grep -i overclaim` — honest negations phrased to survive it, 4N lesson).

- [ ] **Step 4: Re-score §18 in the spec at closeout; update memory-worthy gotchas in the closeout doc.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "test: add stage 4s all-functions e2e net; docs: closeout, readme row, north-star status"`

---

## Completion

After all 16 tasks: verify `git tag --sort=-creatordate | head -3` (expect `v2.27.0-stage-4r-pccc` latest), then use superpowers:finishing-a-development-branch — full `npm test` + `check-e2e.sh`, PR to main, CI green, rebase-merge, tag `v2.28.0-stage-4s-vdcc-core`, release. Post-merge: `git checkout main && git reset --hard origin/main` (4O divergence lesson).
