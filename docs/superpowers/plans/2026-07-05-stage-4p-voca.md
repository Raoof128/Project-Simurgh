# Stage 4P — VOCA/CPC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Stage 4P — Verifiable Origin-Custody Attestation with CPC custody-class corroboration: offline custody verifier over raw codes 67–79, previous-link hop-receipt chains, 4N-window-anchored entropy-gated CPC signals, the invention layer (pincer / contest / disclosure / bridge), six Lean theorems including `GhostTrilemma`, and a byte-idempotent reproduce.

**Architecture:** Pure-function core (`tools/simurgh-attestation/stage4p/core/*`) with all digests via the stage4m pure-JS canonical/sha256; Node layer does Ed25519 and file I/O only. Lane A modelled corpus + Lane B in-process relay over the 4O harness + Lane C public-report-motivated fixture. Every fixture digest is harness-computed by `build-stage4p-fixtures.mjs` — never hand-typed.

**Tech Stack:** Node 26 (`node:test`, `node:crypto` Ed25519), zero new npm deps, Lean 4 v4.15.0 (no mathlib), bash reproduce script.

**Spec:** `docs/superpowers/specs/2026-07-05-stage-4p-voca-design.md` (branch `stage-4p-voca-design`, commits `16c7963b` + `325f8110`). Section references (§N) below are to that spec.

## Global Constraints

- MOTTO header comment in every new file: `// Motto: AnthropicSafe First, then ReviewerSafe.` plus `// SPDX-License-Identifier: AGPL-3.0-or-later` first line (`--` comments in Lean, `#` in bash).
- Raw codes 67–79 ONLY; closed ledger; unknown → run-level 3 via `stage4CodeForRawCode`.
- Digests: `sha256:` + `sha256Hex(canonicalJson({domain, schema, value}))` using `tools/simurgh-attestation/stage4m/core/canonical.mjs` exports `canonicalJson`, `sha256Hex` (bare hex — prefix manually), `DIGEST_RE`.
- All 4P domains start `SIMURGH_STAGE4P_`.
- Fixture private keys: PEM files whose first line after the header is the comment marker `INSECURE_FIXTURE_ONLY` in the filename (`*-INSECURE_FIXTURE_ONLY.pem`) — the 3M/3O whole-repo key audits allowlist that token.
- Evidence bytes: digests and enums only. No raw endpoint, hostname, prompt, account ID, private key material, API key, secret token, or raw relay identifier; public verification keys only in explicit `*_public_key_pem` / `signer_public_key` fields (§13).
- `npm test` gates `tests/unit` only. Anything e2e goes in `scripts/check-e2e.sh`.
- NEVER shell out to `rg` inside a unit test (Linux CI lacks it).
- Unit test runs use explicit file paths: `node --test tests/unit/llmShield/stage4p/<name>.test.js` (bare-directory form fails on some Node versions).
- Prettier: run `npx prettier --write` on every JS/MD file you create BEFORE computing/freezing any digest of it; fixture + evidence dirs get prettier-ignored in Task 8.
- Reproduce must be byte-idempotent twice under Node 26 (`/opt/homebrew/opt/node@26/bin` locally); no network anywhere in CI.
- Commits: neutral conventional messages. No AI attribution of any kind.
- Non-claims list (16, §2) is frozen — copy exactly, never paraphrase.

## File Structure (locked)

```text
tools/simurgh-attestation/stage4h/exitCodes.mjs            MODIFY: add VOCA block
tools/simurgh-attestation/stage4p/constants.mjs            schemas/domains/enums/non-claims
tools/simurgh-attestation/stage4p/core/digest.mjs          domainDigest + named digest builders
tools/simurgh-attestation/stage4p/core/schemaCore.mjs      exact-key validators (4 schemas)
tools/simurgh-attestation/stage4p/core/chainCore.mjs       previous-link hop chain (raw 78)
tools/simurgh-attestation/stage4p/core/cpcCore.mjs         entropy gate, CPC signals, budget (raw 79)
tools/simurgh-attestation/stage4p/core/custodyCore.mjs     normative check order 67→…→79
tools/simurgh-attestation/stage4p/core/inventionCore.mjs   pincer/contest/disclosure/bridge
tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs
tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs
tools/simurgh-attestation/stage4p/node/build-stage4p-attestation.mjs
tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs
tests/unit/llmShield/stage4p/*.test.js                     one test file per core module
tests/e2e/llmShield/stage4p/allFunctions.e2e.test.js       K7 net
tests/fixtures/llmShield/stage4p/                          committed fixtures (prettier-ignored)
docs/research/llm-shield/evidence/stage-4p/                evidence (prettier-ignored)
proofs/stage4p/OriginCustody.lean                          six theorems
scripts/reproduce-llm-shield-stage4p.sh                    one-command reproduce
.github/workflows/stage-4-lean-proofs.yml                  MODIFY: add stage4p lean line
scripts/check-e2e.sh                                       MODIFY: add stage4p entry
.prettierignore                                            MODIFY: add stage4p dirs
```

---

### Task 1: Raw-code registry extension + stage4p constants

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (VOCA block after VTSA reasons, ~line 227; RUN_LEVEL_BY_RAW entries after `66: 1`)
- Create: `tools/simurgh-attestation/stage4p/constants.mjs`
- Test: `tests/unit/llmShield/stage4p/constants.test.js`

**Interfaces:**

- Consumes: nothing new.
- Produces: `VOCA_RAW_CODES` (13 keys), `VOCA_CHECK_ORDER`, `VOCA_REASONS_67`/`_77`, extended `RUN_LEVEL_BY_RAW` (67–79 → 1); constants module exports `SCHEMAS`, `DOMAINS`, `ENUMS`, `VOCA_NON_CLAIMS`, `ENTROPY_BITS_BY_KIND`, `ENTROPY_FLOOR_BITS`, `GENESIS`.

- [ ] **Step 1: Write the failing test**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VOCA_RAW_CODES,
  VOCA_CHECK_ORDER,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  SCHEMAS,
  DOMAINS,
  ENUMS,
  VOCA_NON_CLAIMS,
  ENTROPY_BITS_BY_KIND,
  ENTROPY_FLOOR_BITS,
} from "../../../../tools/simurgh-attestation/stage4p/constants.mjs";

test("voca raw codes 67-79 are frozen and complete", () => {
  assert.deepEqual(VOCA_RAW_CODES, {
    CUSTODY_ENVELOPE_MISSING: 67,
    CUSTODY_SIGNATURE_INVALID: 68,
    CUSTODY_EPOCH_INVALID: 69,
    ENDPOINT_ORIGIN_MISMATCH: 70,
    UNDECLARED_PROXY_HOP: 71,
    MODEL_IDENTITY_MISMATCH: 72,
    ACCOUNT_POOL_AMBIGUITY: 73,
    TRACE_CUSTODY_VIOLATION: 74,
    CUSTODY_SURFACE_REWRITE: 75,
    RELAY_TRANSFORM_UNBOUND: 76,
    CUSTODY_RECEIPT_BINDING_MISMATCH: 77,
    CUSTODY_PATH_LAUNDERING: 78,
    CPC_EMISSION_VIOLATION: 79,
  });
});

test("normative check order is frozen (78 after structural validity, spec §7.1)", () => {
  assert.deepEqual(VOCA_CHECK_ORDER, [67, 68, 69, 78, 70, 71, 72, 73, 74, 75, 76, 77, 79]);
});

test("all 13 codes map to run-level 1; unknown fails closed to 3", () => {
  for (const code of Object.values(VOCA_RAW_CODES)) {
    assert.equal(RUN_LEVEL_BY_RAW[code], 1);
    assert.equal(stage4CodeForRawCode(code), 1);
  }
  assert.equal(stage4CodeForRawCode(80), 3);
});

test("constants: schemas, domains, enums, non-claims frozen", () => {
  assert.equal(SCHEMAS.ENVELOPE, "simurgh.origin_custody_envelope.v1");
  assert.equal(SCHEMAS.HOP_RECEIPT, "simurgh.custody_hop_receipt.v1");
  assert.equal(SCHEMAS.CUSTODY_RECEIPT, "simurgh.custody_receipt.v1");
  assert.equal(SCHEMAS.CPC_SIGNAL, "simurgh.custody_class_signal.v1");
  assert.equal(SCHEMAS.ENFORCEMENT, "simurgh.enforcement_window_commitment.v1");
  assert.equal(SCHEMAS.CONTEST, "simurgh.relay_contest.v1");
  assert.equal(SCHEMAS.DISCLOSURE, "simurgh.vendor_custody_disclosure.v1");
  assert.equal(SCHEMAS.ATTESTATION, "simurgh.voca_attestation.v1");
  for (const d of Object.values(DOMAINS)) assert.ok(d.startsWith("SIMURGH_STAGE4P_"));
  assert.equal(DOMAINS.CUSTODY_CLASS, "SIMURGH_STAGE4P_CUSTODY_CLASS_V1");
  assert.equal(DOMAINS.SURFACE_BINDING, "SIMURGH_STAGE4P_STAGE4O_SURFACE_BINDING_V1");
  assert.equal(VOCA_NON_CLAIMS.length, 16);
  assert.ok(VOCA_NON_CLAIMS.includes("not_model_substitution_oracle"));
  assert.ok(VOCA_NON_CLAIMS.includes("disclosure_budget_is_not_privacy_proof"));
  assert.equal(ENTROPY_BITS_BY_KIND.relay_spki_sha256, 128);
  assert.equal(ENTROPY_BITS_BY_KIND.low_entropy_or_unknown, 0);
  assert.equal(ENTROPY_FLOOR_BITS, 96);
  assert.ok(Object.isFrozen(ENUMS.provider_family));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/constants.test.js`
Expected: FAIL — `VOCA_RAW_CODES` not exported / cannot find `stage4p/constants.mjs`.

- [ ] **Step 3: Implement — exitCodes.mjs additions**

Insert after `VTSA_REASONS_66` (line ~226), mirroring the VTSA block style:

```js
// Stage 4P VOCA codes (reviewed extension of the shared ledger; 4P spec §7). NUMERIC
// order is allocation order; the NORMATIVE first-failure order is VOCA_CHECK_ORDER
// (4P spec §7.1 — 78 runs right after structural validity because laundering masks
// downstream mismatches).
export const VOCA_RAW_CODES = Object.freeze({
  CUSTODY_ENVELOPE_MISSING: 67,
  CUSTODY_SIGNATURE_INVALID: 68,
  CUSTODY_EPOCH_INVALID: 69,
  ENDPOINT_ORIGIN_MISMATCH: 70,
  UNDECLARED_PROXY_HOP: 71,
  MODEL_IDENTITY_MISMATCH: 72,
  ACCOUNT_POOL_AMBIGUITY: 73,
  TRACE_CUSTODY_VIOLATION: 74,
  CUSTODY_SURFACE_REWRITE: 75,
  RELAY_TRANSFORM_UNBOUND: 76,
  CUSTODY_RECEIPT_BINDING_MISMATCH: 77,
  CUSTODY_PATH_LAUNDERING: 78,
  CPC_EMISSION_VIOLATION: 79,
});
export const VOCA_CHECK_ORDER = Object.freeze([67, 68, 69, 78, 70, 71, 72, 73, 74, 75, 76, 77, 79]);

export const VOCA_REASONS_67 = Object.freeze(["absent", "schema_invalid"]);
export const VOCA_REASONS_68 = Object.freeze([
  "envelope_signature_invalid",
  "hop_signature_invalid",
  "receipt_signature_invalid",
]);
export const VOCA_REASONS_69 = Object.freeze(["run_epoch_outside_validity_window"]);
export const VOCA_REASONS_70 = Object.freeze(["declared_endpoint_digest_mismatch"]);
export const VOCA_REASONS_71 = Object.freeze(["relay_not_declared", "relay_policy_direct_only"]);
export const VOCA_REASONS_72 = Object.freeze(["model_identity_digest_mismatch"]);
export const VOCA_REASONS_73 = Object.freeze(["account_boundary_undeclared_pool"]);
export const VOCA_REASONS_74 = Object.freeze(["trace_custody_expanded_beyond_declaration"]);
export const VOCA_REASONS_75 = Object.freeze(["stage4o_surface_binding_mismatch"]);
export const VOCA_REASONS_76 = Object.freeze(["transform_not_declared"]);
export const VOCA_REASONS_77 = Object.freeze(["receipt_schema_invalid", "binding_mismatch"]);
export const VOCA_REASONS_78 = Object.freeze([
  "missing_hop",
  "reordered_hop",
  "duplicated_hop",
  "non_linking_previous_digest",
  "terminal_response_mismatch",
]);
export const VOCA_REASONS_79 = Object.freeze([
  "below_floor_digest_emitted",
  "matchable_missing_digest",
  "degraded_carries_digest",
  "window_anchor_not_in_feed",
  "disclosure_budget_exceeded",
]);
```

And in `RUN_LEVEL_BY_RAW`, after `66: 1,`:

```js
  // Stage 4P VOCA codes (reviewed extension of the shared ledger; 4P spec §7.2).
  67: 1,
  68: 1,
  69: 1,
  70: 1,
  71: 1,
  72: 1,
  73: 1,
  74: 1,
  75: 1,
  76: 1,
  77: 1,
  78: 1,
  79: 1,
```

- [ ] **Step 4: Implement — `tools/simurgh-attestation/stage4p/constants.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4P frozen constants (4P spec §2, §6). Motto: AnthropicSafe First, then
// ReviewerSafe. Changing ANY value invalidates every committed digest.
export const SCHEMAS = Object.freeze({
  ENVELOPE: "simurgh.origin_custody_envelope.v1",
  HOP_RECEIPT: "simurgh.custody_hop_receipt.v1",
  CUSTODY_RECEIPT: "simurgh.custody_receipt.v1",
  CPC_SIGNAL: "simurgh.custody_class_signal.v1",
  ENFORCEMENT: "simurgh.enforcement_window_commitment.v1",
  CONTEST: "simurgh.relay_contest.v1",
  DISCLOSURE: "simurgh.vendor_custody_disclosure.v1",
  ATTESTATION: "simurgh.voca_attestation.v1",
});

export const DOMAINS = Object.freeze({
  ENVELOPE: "SIMURGH_STAGE4P_ENVELOPE_V1",
  HOP_RECEIPT: "SIMURGH_STAGE4P_HOP_RECEIPT_V1",
  CUSTODY_PATH: "SIMURGH_STAGE4P_CUSTODY_PATH_V1",
  CUSTODY_RECEIPT: "SIMURGH_STAGE4P_CUSTODY_RECEIPT_V1",
  CUSTODY_CLASS: "SIMURGH_STAGE4P_CUSTODY_CLASS_V1",
  SURFACE_BINDING: "SIMURGH_STAGE4P_STAGE4O_SURFACE_BINDING_V1",
  ENFORCEMENT: "SIMURGH_STAGE4P_ENFORCEMENT_V1",
  CONTEST: "SIMURGH_STAGE4P_CONTEST_V1",
  DISCLOSURE: "SIMURGH_STAGE4P_DISCLOSURE_V1",
  BRIDGE: "SIMURGH_STAGE4P_BRIDGE_V1",
  ATTESTATION_BUNDLE: "SIMURGH_STAGE4P_ATTESTATION_BUNDLE_V1",
});

export const ENUMS = Object.freeze({
  provider_family: Object.freeze(["openai", "anthropic", "local", "self_hosted", "unknown"]),
  relay_policy: Object.freeze(["direct_only", "declared_relays_allowed"]),
  account_boundary: Object.freeze(["single_declared", "declared_pool", "unknown_disallowed"]),
  trace_custody: Object.freeze([
    "provider_only",
    "declared_relay",
    "no_trace_retained",
    "unknown_disallowed",
  ]),
  trace_custody_observed: Object.freeze(["provider_only", "declared_relay", "unknown"]),
  signal_mode: Object.freeze(["matchable", "degraded_non_matchable"]),
  evidence_kind: Object.freeze([
    "relay_spki_sha256",
    "relay_signing_public_key_sha256",
    "declared_relay_instance_key_sha256",
    "self_hosted_relay_public_key_sha256",
    "low_entropy_or_unknown",
  ]),
  action_class: Object.freeze([
    "account_cluster_ban",
    "rate_restriction",
    "key_revocation",
    "other_declared",
  ]),
  bridge_mode: Object.freeze(["digest_binding_only"]),
});

// 4P spec §6.6 — deterministic entropy buckets. No probabilistic guessing.
export const ENTROPY_BITS_BY_KIND = Object.freeze({
  relay_spki_sha256: 128,
  relay_signing_public_key_sha256: 128,
  declared_relay_instance_key_sha256: 128,
  self_hosted_relay_public_key_sha256: 128,
  low_entropy_or_unknown: 0,
});
export const ENTROPY_FLOOR_BITS = 96;

export const GENESIS = "genesis";

// 4P spec §2, frozen wording — never edit, never paraphrase.
export const VOCA_NON_CLAIMS = Object.freeze([
  "not_provider_identity_oracle",
  "not_proxy_blocking_system",
  "not_grey_market_investigation",
  "not_law_enforcement_claim",
  "not_model_safety_claim",
  "not_proof_of_actual_provider_execution",
  "not_detection_of_all_proxies",
  "not_a_replacement_for_provider_abuse_detection",
  "not_model_substitution_oracle",
  "http_resale_shape_deferred_to_4p1",
  "window_anchor_is_public",
  "match_is_not_attribution",
  "private_custody_corroboration_deferred",
  "disclosure_budget_is_not_privacy_proof",
  "not_enforcement_verification",
  "not_legal_compliance_certification",
]);

// 4P spec §18, frozen — signed into the attestation as safety_rail.
export const SAFETY_RAIL =
  "Stage 4P proves properties of recorded custody evidence. It does not prove physical " +
  "network truth, provider honesty, real-world attribution, or model execution identity " +
  "outside the evidence supplied to the verifier.";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4p/constants.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the pre-existing wrapper tests to see the EXPECTED breakage list (do not fix yet — Task 9 regenerates goldens)**

Run: `npm test 2>&1 | tail -20`
Expected: failures in `stage4h`/`stage4k`/`stage4l` exit-map/wrapper snapshot tests complaining about codes 67–79. Record the exact failing files in the Task 9 checklist. If anything OUTSIDE those snapshot tests fails, stop and investigate.

- [ ] **Step 7: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/constants.mjs tests/unit/llmShield/stage4p/constants.test.js tools/simurgh-attestation/stage4h/exitCodes.mjs
git add tools/simurgh-attestation/stage4h/exitCodes.mjs tools/simurgh-attestation/stage4p/constants.mjs tests/unit/llmShield/stage4p/constants.test.js
git commit -m "feat(llm-shield): stage 4p raw codes 67-79 and frozen constants"
```

---

### Task 2: Digest core

**Files:**

- Create: `tools/simurgh-attestation/stage4p/core/digest.mjs`
- Test: `tests/unit/llmShield/stage4p/digest.test.js`

**Interfaces:**

- Consumes: `canonicalJson`, `sha256Hex`, `DIGEST_RE` from `stage4m/core/canonical.mjs`; `DOMAINS`, `SCHEMAS`, `ENTROPY_BITS_BY_KIND`, `ENTROPY_FLOOR_BITS` from Task 1.
- Produces:
  - `domainDigest(domain, schema, value) -> "sha256:<hex>"` (throws `unknown_digest_domain` on non-4P domain)
  - `hopReceiptDigest(hop) -> digest` (over the hop WITHOUT its `signature` key)
  - `custodyPathDigest(hopDigests: string[]) -> digest`
  - `surfaceBindingDigest({stage4o_manifest_digest, stage4o_toolset_digest, stage4o_manifest_epoch}) -> digest`
  - `custodyClassDigest({stage4n_window_anchor_digest, failure_class, evidence_kind, observed_evidence_digest, entropy_floor_bits, disclosure_budget_max_signals_per_window}) -> digest` (THROWS `entropy_floor_not_met` when `ENTROPY_BITS_BY_KIND[evidence_kind] < entropy_floor_bits` — the unbypassable gate, spec §6.6)

- [ ] **Step 1: Write the failing test**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DIGEST_RE } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  domainDigest,
  hopReceiptDigest,
  custodyPathDigest,
  surfaceBindingDigest,
  custodyClassDigest,
} from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";
import { DOMAINS, SCHEMAS } from "../../../../tools/simurgh-attestation/stage4p/constants.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

test("domainDigest: 4P domains only, format, domain separation", () => {
  const a = domainDigest(DOMAINS.ENVELOPE, SCHEMAS.ENVELOPE, { x: 1 });
  const b = domainDigest(DOMAINS.CUSTODY_RECEIPT, SCHEMAS.ENVELOPE, { x: 1 });
  assert.match(a, DIGEST_RE);
  assert.notEqual(a, b); // same value, different domain, different digest
  assert.throws(() => domainDigest("SIMURGH_STAGE4O_ACTION_V1", SCHEMAS.ENVELOPE, {}), {
    message: /unknown_digest_domain/,
  });
});

test("hopReceiptDigest ignores signature; custodyPathDigest is order-sensitive", () => {
  const hop = {
    schema: SCHEMAS.HOP_RECEIPT,
    hop_index: 0,
    previous_receipt_digest: D("a"),
    relay_identity_digest: D("b"),
    transform_digest: "genesis",
    input_digest: D("c"),
    output_digest: D("d"),
  };
  const h1 = hopReceiptDigest({ ...hop, signature: "AAAA" });
  const h2 = hopReceiptDigest({ ...hop, signature: "BBBB" });
  assert.equal(h1, h2);
  assert.notEqual(custodyPathDigest([h1, D("e")]), custodyPathDigest([D("e"), h1]));
});

test("custodyClassDigest: deterministic, entropy gate unbypassable", () => {
  const input = {
    stage4n_window_anchor_digest: D("1"),
    failure_class: "undeclared_proxy_hop",
    evidence_kind: "relay_spki_sha256",
    observed_evidence_digest: D("2"),
    entropy_floor_bits: 96,
    disclosure_budget_max_signals_per_window: 4,
  };
  assert.equal(custodyClassDigest(input), custodyClassDigest({ ...input }));
  assert.notEqual(
    custodyClassDigest(input),
    custodyClassDigest({ ...input, stage4n_window_anchor_digest: D("3") })
  ); // cross-window unlinkability at digest level
  assert.throws(() => custodyClassDigest({ ...input, evidence_kind: "low_entropy_or_unknown" }), {
    message: /entropy_floor_not_met/,
  });
  assert.throws(() => custodyClassDigest({ ...input, evidence_kind: "surprise_kind" }), {
    message: /unknown_evidence_kind/,
  });
});

test("surfaceBindingDigest matches spec §6.7 construction", () => {
  const d = surfaceBindingDigest({
    stage4o_manifest_digest: D("a"),
    stage4o_toolset_digest: D("b"),
    stage4o_manifest_epoch: 3,
  });
  assert.match(d, DIGEST_RE);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/digest.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/digest.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Domain-separated digests (4P spec §5, §6.5–§6.7). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, SCHEMAS, ENTROPY_BITS_BY_KIND } from "../constants.mjs";

const FOUR_P_DOMAINS = new Set(Object.values(DOMAINS));

export function domainDigest(domain, schema, value) {
  if (!FOUR_P_DOMAINS.has(domain)) throw new Error(`unknown_digest_domain: ${domain}`);
  return `sha256:${sha256Hex(canonicalJson({ domain, schema, value }))}`;
}

export function hopReceiptDigest(hop) {
  const { signature, ...unsigned } = hop;
  return domainDigest(DOMAINS.HOP_RECEIPT, SCHEMAS.HOP_RECEIPT, unsigned);
}

export function custodyPathDigest(hopDigests) {
  return domainDigest(DOMAINS.CUSTODY_PATH, SCHEMAS.HOP_RECEIPT, hopDigests);
}

export function surfaceBindingDigest({
  stage4o_manifest_digest,
  stage4o_toolset_digest,
  stage4o_manifest_epoch,
}) {
  return domainDigest(DOMAINS.SURFACE_BINDING, SCHEMAS.ATTESTATION, {
    stage4o_manifest_digest,
    stage4o_toolset_digest,
    stage4o_manifest_epoch,
  });
}

// THE entropy gate (4P spec §6.6): there is no code path to a public match token
// from below-floor evidence. Throws, never returns a digest.
export function custodyClassDigest(input) {
  const bits = ENTROPY_BITS_BY_KIND[input.evidence_kind];
  if (bits === undefined) throw new Error(`unknown_evidence_kind: ${input.evidence_kind}`);
  if (bits < input.entropy_floor_bits) throw new Error("entropy_floor_not_met");
  return domainDigest(DOMAINS.CUSTODY_CLASS, SCHEMAS.CPC_SIGNAL, {
    stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
    failure_class: input.failure_class,
    evidence_kind: input.evidence_kind,
    observed_evidence_digest: input.observed_evidence_digest,
    entropy_floor_bits: input.entropy_floor_bits,
    disclosure_budget_max_signals_per_window: input.disclosure_budget_max_signals_per_window,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4p/digest.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/core/digest.mjs tests/unit/llmShield/stage4p/digest.test.js
git add tools/simurgh-attestation/stage4p/core/digest.mjs tests/unit/llmShield/stage4p/digest.test.js
git commit -m "feat(llm-shield): stage 4p digest core with unbypassable cpc entropy gate"
```

---

### Task 3: Schema validation core

**Files:**

- Create: `tools/simurgh-attestation/stage4p/core/schemaCore.mjs`
- Test: `tests/unit/llmShield/stage4p/schemaCore.test.js`

**Interfaces:**

- Consumes: `SCHEMAS`, `ENUMS` (Task 1); `DIGEST_RE` from stage4m canonical.
- Produces (each returns `{ ok: true }` or `{ ok: false, raw, reason }` per spec §7.2 — object failures are raw 67 `schema_invalid`, EXCEPT malformed custody receipts which are raw 77 `receipt_schema_invalid`):
  - `validateEnvelope(env)`
  - `validateHopReceipt(hop)` (raw 67 — hop receipts are envelope-side chain objects)
  - `validateCustodyReceipt(rec)` (raw 77 on schema failure)
  - `validateCpcSignal(sig)` (two exact-key variants; wrong-variant field mix → raw 79 with reason `matchable_missing_digest` / `degraded_carries_digest`; other malformation → raw 67 `schema_invalid`)

Helper (module-local): `exactKeys(obj, keys)` — sorted-array equality of `Object.keys`.

- [ ] **Step 1: Write the failing test**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEnvelope,
  validateHopReceipt,
  validateCustodyReceipt,
  validateCpcSignal,
} from "../../../../tools/simurgh-attestation/stage4p/core/schemaCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

export function goodEnvelope() {
  return {
    schema: "simurgh.origin_custody_envelope.v1",
    run_epoch: 12,
    declared_endpoint_digest: D("a"),
    provider_family: "self_hosted",
    provider_identity_digest: D("b"),
    model_identity_digest: D("c"),
    relay_policy: "declared_relays_allowed",
    declared_relay_digests: [D("d")],
    declared_transform_digests: [D("e")],
    account_boundary: "single_declared",
    trace_custody: "declared_relay",
    tool_surface_digest: D("f"),
    valid_from_epoch: 10,
    valid_until_epoch: 20,
    signature: "QUJD",
  };
}

export function goodHop() {
  return {
    schema: "simurgh.custody_hop_receipt.v1",
    hop_index: 0,
    previous_receipt_digest: D("1"),
    relay_identity_digest: D("2"),
    transform_digest: "genesis",
    input_digest: D("3"),
    output_digest: D("4"),
    signature: "QUJD",
  };
}

export function goodReceipt() {
  return {
    schema: "simurgh.custody_receipt.v1",
    request_digest: D("5"),
    response_digest: D("6"),
    custody_path_digest: D("7"),
    model_identity_digest: D("c"),
    relay_chain_digest: D("8"),
    trace_custody_observed: "declared_relay",
    tool_surface_digest: D("f"),
    receipt_epoch: 12,
    signature: "QUJD",
  };
}

test("good objects validate", () => {
  assert.deepEqual(validateEnvelope(goodEnvelope()), { ok: true });
  assert.deepEqual(validateHopReceipt(goodHop()), { ok: true });
  assert.deepEqual(validateCustodyReceipt(goodReceipt()), { ok: true });
});

test("envelope: extra key, missing key, bad enum, inverted epochs all fail raw 67", () => {
  for (const bad of [
    { ...goodEnvelope(), surprise: 1 },
    (() => {
      const e = goodEnvelope();
      delete e.trace_custody;
      return e;
    })(),
    { ...goodEnvelope(), provider_family: "acme_cloud" },
    { ...goodEnvelope(), valid_from_epoch: 30 },
    { ...goodEnvelope(), declared_endpoint_digest: "sha256:xyz" },
  ]) {
    const r = validateEnvelope(bad);
    assert.equal(r.ok, false);
    assert.equal(r.raw, 67);
    assert.equal(r.reason, "schema_invalid");
  }
});

test("malformed custody receipt fails raw 77 receipt_schema_invalid (spec §7.2)", () => {
  const r = validateCustodyReceipt({ ...goodReceipt(), trace_custody_observed: "psychic" });
  assert.deepEqual(r, { ok: false, raw: 77, reason: "receipt_schema_invalid" });
});

test("cpc signal: two exact variants; cross-variant contamination is raw 79", () => {
  const matchable = {
    schema: "simurgh.custody_class_signal.v1",
    signal_mode: "matchable",
    failure_class: "undeclared_proxy_hop",
    stage4n_window_anchor_digest: D("9"),
    evidence_kind: "relay_spki_sha256",
    custody_class_digest: D("0"),
    entropy_floor_bits: 96,
    disclosure_budget_max_signals_per_window: 4,
    public_linkability: "bounded",
  };
  const degraded = {
    schema: "simurgh.custody_class_signal.v1",
    signal_mode: "degraded_non_matchable",
    coarse_failure_class: "undeclared_proxy_hop",
    stage4n_window_anchor_digest: D("9"),
    entropy_floor_bits: 96,
    observed_entropy_bits: 0,
    public_linkability: "none",
  };
  assert.deepEqual(validateCpcSignal(matchable), { ok: true });
  assert.deepEqual(validateCpcSignal(degraded), { ok: true });
  const m = { ...matchable };
  delete m.custody_class_digest;
  assert.deepEqual(validateCpcSignal(m), {
    ok: false,
    raw: 79,
    reason: "matchable_missing_digest",
  });
  assert.deepEqual(validateCpcSignal({ ...degraded, custody_class_digest: D("0") }), {
    ok: false,
    raw: 79,
    reason: "degraded_carries_digest",
  });
  assert.deepEqual(validateCpcSignal({ ...matchable, public_linkability: "unbounded" }), {
    ok: false,
    raw: 67,
    reason: "schema_invalid",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/schemaCore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/schemaCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Exact-key schema validation, fail closed (4P spec §6, §7.2). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS, ENUMS, GENESIS } from "../constants.mjs";

const fail67 = { ok: false, raw: 67, reason: "schema_invalid" };
const isEpoch = (v) => Number.isInteger(v) && v >= 0;
const isDigest = (v) => typeof v === "string" && DIGEST_RE.test(v);
const isDigestOrGenesis = (v) => v === GENESIS || isDigest(v);
const isB64 = (v) => typeof v === "string" && v.length > 0 && /^[A-Za-z0-9+/=]+$/.test(v);

function exactKeys(obj, keys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const a = Object.keys(obj).sort();
  const b = [...keys].sort();
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

const ENVELOPE_KEYS = [
  "schema",
  "run_epoch",
  "declared_endpoint_digest",
  "provider_family",
  "provider_identity_digest",
  "model_identity_digest",
  "relay_policy",
  "declared_relay_digests",
  "declared_transform_digests",
  "account_boundary",
  "trace_custody",
  "tool_surface_digest",
  "valid_from_epoch",
  "valid_until_epoch",
  "signature",
];

export function validateEnvelope(env) {
  if (!exactKeys(env, ENVELOPE_KEYS)) return fail67;
  if (env.schema !== SCHEMAS.ENVELOPE) return fail67;
  if (![env.run_epoch, env.valid_from_epoch, env.valid_until_epoch].every(isEpoch)) return fail67;
  if (env.valid_from_epoch > env.valid_until_epoch) return fail67;
  if (!ENUMS.provider_family.includes(env.provider_family)) return fail67;
  if (!ENUMS.relay_policy.includes(env.relay_policy)) return fail67;
  if (!ENUMS.account_boundary.includes(env.account_boundary)) return fail67;
  if (!ENUMS.trace_custody.includes(env.trace_custody)) return fail67;
  const digests = [
    env.declared_endpoint_digest,
    env.provider_identity_digest,
    env.model_identity_digest,
    env.tool_surface_digest,
  ];
  if (!digests.every(isDigest)) return fail67;
  if (!Array.isArray(env.declared_relay_digests) || !env.declared_relay_digests.every(isDigest))
    return fail67;
  if (
    !Array.isArray(env.declared_transform_digests) ||
    !env.declared_transform_digests.every(isDigest)
  )
    return fail67;
  if (!isB64(env.signature)) return fail67;
  return { ok: true };
}

const HOP_KEYS = [
  "schema",
  "hop_index",
  "previous_receipt_digest",
  "relay_identity_digest",
  "transform_digest",
  "input_digest",
  "output_digest",
  "signature",
];

export function validateHopReceipt(hop) {
  if (!exactKeys(hop, HOP_KEYS)) return fail67;
  if (hop.schema !== SCHEMAS.HOP_RECEIPT) return fail67;
  if (!Number.isInteger(hop.hop_index) || hop.hop_index < 0) return fail67;
  if (!isDigest(hop.previous_receipt_digest)) return fail67;
  if (!isDigest(hop.relay_identity_digest)) return fail67;
  if (!isDigestOrGenesis(hop.transform_digest)) return fail67;
  if (![hop.input_digest, hop.output_digest].every(isDigest)) return fail67;
  if (!isB64(hop.signature)) return fail67;
  return { ok: true };
}

const RECEIPT_KEYS = [
  "schema",
  "request_digest",
  "response_digest",
  "custody_path_digest",
  "model_identity_digest",
  "relay_chain_digest",
  "trace_custody_observed",
  "tool_surface_digest",
  "receipt_epoch",
  "signature",
];

export function validateCustodyReceipt(rec) {
  const bad = { ok: false, raw: 77, reason: "receipt_schema_invalid" };
  if (!exactKeys(rec, RECEIPT_KEYS)) return bad;
  if (rec.schema !== SCHEMAS.CUSTODY_RECEIPT) return bad;
  const digests = [
    rec.request_digest,
    rec.response_digest,
    rec.custody_path_digest,
    rec.model_identity_digest,
    rec.relay_chain_digest,
    rec.tool_surface_digest,
  ];
  if (!digests.every(isDigest)) return bad;
  if (!ENUMS.trace_custody_observed.includes(rec.trace_custody_observed)) return bad;
  if (!isEpoch(rec.receipt_epoch)) return bad;
  if (!isB64(rec.signature)) return bad;
  return { ok: true };
}

const MATCHABLE_KEYS = [
  "schema",
  "signal_mode",
  "failure_class",
  "stage4n_window_anchor_digest",
  "evidence_kind",
  "custody_class_digest",
  "entropy_floor_bits",
  "disclosure_budget_max_signals_per_window",
  "public_linkability",
];
const DEGRADED_KEYS = [
  "schema",
  "signal_mode",
  "coarse_failure_class",
  "stage4n_window_anchor_digest",
  "entropy_floor_bits",
  "observed_entropy_bits",
  "public_linkability",
];

export function validateCpcSignal(sig) {
  if (!sig || typeof sig !== "object" || Array.isArray(sig)) return fail67;
  if (sig.schema !== SCHEMAS.CPC_SIGNAL) return fail67;
  if (sig.signal_mode === "matchable") {
    // Variant contamination gets its OWN raw-79 reasons (spec §6.4) so the tamper
    // matrix can distinguish "wrong variant" from "generic malformation".
    if (!("custody_class_digest" in sig))
      return { ok: false, raw: 79, reason: "matchable_missing_digest" };
    if (!exactKeys(sig, MATCHABLE_KEYS)) return fail67;
    if (!isDigest(sig.custody_class_digest)) return fail67;
    if (!isDigest(sig.stage4n_window_anchor_digest)) return fail67;
    if (!ENUMS.evidence_kind.includes(sig.evidence_kind)) return fail67;
    if (sig.public_linkability !== "bounded") return fail67;
    if (!Number.isInteger(sig.entropy_floor_bits) || sig.entropy_floor_bits <= 0) return fail67;
    if (
      !Number.isInteger(sig.disclosure_budget_max_signals_per_window) ||
      sig.disclosure_budget_max_signals_per_window < 1
    )
      return fail67;
    return { ok: true };
  }
  if (sig.signal_mode === "degraded_non_matchable") {
    if ("custody_class_digest" in sig)
      return { ok: false, raw: 79, reason: "degraded_carries_digest" };
    if (!exactKeys(sig, DEGRADED_KEYS)) return fail67;
    if (!isDigest(sig.stage4n_window_anchor_digest)) return fail67;
    if (sig.public_linkability !== "none") return fail67;
    if (sig.observed_entropy_bits !== 0) return fail67;
    if (!Number.isInteger(sig.entropy_floor_bits) || sig.entropy_floor_bits <= 0) return fail67;
    return { ok: true };
  }
  return fail67;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4p/schemaCore.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/core/schemaCore.mjs tests/unit/llmShield/stage4p/schemaCore.test.js
git add tools/simurgh-attestation/stage4p/core/schemaCore.mjs tests/unit/llmShield/stage4p/schemaCore.test.js
git commit -m "feat(llm-shield): stage 4p exact-key schema validation, fail closed"
```

---

### Task 4: Hop-chain core (raw 78)

**Files:**

- Create: `tools/simurgh-attestation/stage4p/core/chainCore.mjs`
- Test: `tests/unit/llmShield/stage4p/chainCore.test.js`

**Interfaces:**

- Consumes: `hopReceiptDigest`, `custodyPathDigest` (Task 2); `validateHopReceipt` (Task 3).
- Produces: `verifyHopChain({ envelopeDigest, hops, responseDigest }) -> { ok: true, custody_path_digest, relay_identity_digests } | { ok: false, raw: 78, reason }` implementing spec §6.2 chain rules: genesis previous == envelope digest; `hop[i].previous_receipt_digest == hopReceiptDigest(hop[i-1])`; `hop_index` strictly 0..n-1; duplicate hop digests rejected; terminal `output_digest === responseDigest`. Schema-invalid hop inside the chain returns the schema failure (raw 67) untouched — structural validity precedes linkage.

- [ ] **Step 1: Write the failing test** — helper `buildChain` mirrors what the fixture builder will do:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyHopChain } from "../../../../tools/simurgh-attestation/stage4p/core/chainCore.mjs";
import { hopReceiptDigest } from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

function buildChain(envelopeDigest, n, responseDigest) {
  const hops = [];
  let prev = envelopeDigest;
  for (let i = 0; i < n; i++) {
    const hop = {
      schema: "simurgh.custody_hop_receipt.v1",
      hop_index: i,
      previous_receipt_digest: prev,
      relay_identity_digest: D(String(i + 1)),
      transform_digest: "genesis",
      input_digest: D("c"),
      output_digest: i === n - 1 ? responseDigest : D("d"),
      signature: "QUJD",
    };
    hops.push(hop);
    prev = hopReceiptDigest(hop);
  }
  return hops;
}

test("well-linked chain verifies and reports path digest + relay identities", () => {
  const hops = buildChain(D("e"), 3, D("f"));
  const r = verifyHopChain({ envelopeDigest: D("e"), hops, responseDigest: D("f") });
  assert.equal(r.ok, true);
  assert.match(r.custody_path_digest, /^sha256:/);
  assert.deepEqual(r.relay_identity_digests, [D("1"), D("2"), D("3")]);
});

test("laundering arms: missing, reordered, duplicated, non-linking, terminal mismatch", () => {
  const good = () => buildChain(D("e"), 3, D("f"));
  const arms = [
    [good().slice(0, 2), "terminal_response_mismatch"],
    [[good()[0], good()[2]], "non_linking_previous_digest"],
    [[good()[1], good()[0], good()[2]], "reordered_hop"],
    [[good()[0], good()[0], good()[2]], "duplicated_hop"],
    [
      (() => {
        const h = good();
        h[2] = { ...h[2], output_digest: D("9") };
        return h;
      })(),
      "terminal_response_mismatch",
    ],
    [[], "missing_hop"],
  ];
  for (const [hops, reason] of arms) {
    const r = verifyHopChain({ envelopeDigest: D("e"), hops, responseDigest: D("f") });
    assert.equal(r.ok, false, reason);
    assert.equal(r.raw, 78, reason);
    assert.equal(r.reason, reason);
  }
});

test("schema-invalid hop inside chain surfaces raw 67, not 78", () => {
  const hops = buildChain(D("e"), 2, D("f"));
  hops[1] = { ...hops[1], surprise: true };
  const r = verifyHopChain({ envelopeDigest: D("e"), hops, responseDigest: D("f") });
  assert.deepEqual(r, { ok: false, raw: 67, reason: "schema_invalid" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/chainCore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/chainCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Previous-link hop chain verification — raw 78 custody_path_laundering (4P spec §6.2,
// patch: previous-link only, no forward digests). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { hopReceiptDigest, custodyPathDigest } from "./digest.mjs";
import { validateHopReceipt } from "./schemaCore.mjs";

const launder = (reason) => ({ ok: false, raw: 78, reason });

export function verifyHopChain({ envelopeDigest, hops, responseDigest }) {
  if (!Array.isArray(hops) || hops.length === 0) return launder("missing_hop");
  for (const hop of hops) {
    const v = validateHopReceipt(hop);
    if (!v.ok) return v; // structural validity precedes linkage (spec §7.1)
  }
  const digests = [];
  const seen = new Set();
  let prev = envelopeDigest;
  for (let i = 0; i < hops.length; i++) {
    if (hops[i].hop_index !== i) return launder("reordered_hop");
    if (hops[i].previous_receipt_digest !== prev) return launder("non_linking_previous_digest");
    const d = hopReceiptDigest(hops[i]);
    if (seen.has(d)) return launder("duplicated_hop");
    seen.add(d);
    digests.push(d);
    prev = d;
  }
  if (hops[hops.length - 1].output_digest !== responseDigest)
    return launder("terminal_response_mismatch");
  return {
    ok: true,
    custody_path_digest: custodyPathDigest(digests),
    relay_identity_digests: hops.map((h) => h.relay_identity_digest),
  };
}
```

Note: the duplicated-hop test above duplicates `hop[0]` which ALSO breaks `hop_index` — so verify the test arms against the implementation's actual first-detected reason and adjust the expected reasons to what the deterministic scan yields (`reordered_hop` fires first for the duplicated-index arm; if so, build the duplicate arm with corrected `hop_index` values but identical content: copy `hop[0]`, set `hop_index: 1`, keep `previous_receipt_digest` pointing at `hopReceiptDigest(hop[0])` — then content differs so craft the duplicate by repeating hop 1 verbatim after fixing indices. The INVARIANT that matters: each of the five reasons in `VOCA_REASONS_78` is reachable by at least one test arm, and the scan is deterministic. Rework arms until all five reasons appear.)

- [ ] **Step 4: Run tests, iterate the arms until all five §6.2 reasons are covered, then verify PASS**

Run: `node --test tests/unit/llmShield/stage4p/chainCore.test.js`
Expected: PASS (3 tests) AND grep the test file to confirm all five reason strings appear:
`grep -c "missing_hop\|reordered_hop\|duplicated_hop\|non_linking_previous_digest\|terminal_response_mismatch" tests/unit/llmShield/stage4p/chainCore.test.js` → ≥ 5.

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/core/chainCore.mjs tests/unit/llmShield/stage4p/chainCore.test.js
git add tools/simurgh-attestation/stage4p/core/chainCore.mjs tests/unit/llmShield/stage4p/chainCore.test.js
git commit -m "feat(llm-shield): stage 4p previous-link hop chain, raw 78 laundering arms"
```

---

### Task 5: CPC core (raw 79) — signals, window anchor, budget

**Files:**

- Create: `tools/simurgh-attestation/stage4p/core/cpcCore.mjs`
- Test: `tests/unit/llmShield/stage4p/cpcCore.test.js`

**Interfaces:**

- Consumes: `custodyClassDigest` (Task 2), `validateCpcSignal` (Task 3), `ENTROPY_BITS_BY_KIND`, `ENTROPY_FLOOR_BITS` (Task 1).
- Produces:
  - `buildCpcSignal({ failure_class, stage4n_window_anchor_digest, evidence_kind, observed_evidence_digest, disclosure_budget_max_signals_per_window }) -> signal` — returns the matchable variant when the entropy bucket passes the floor, otherwise the degraded variant (never throws for `low_entropy_or_unknown`; throws only on unknown kind).
  - `verifyCpcEmission({ signals, declared_cap, anchor_digests }) -> { ok: true } | { ok: false, raw: 79, reason }` — reasons: `window_anchor_not_in_feed` (a signal's anchor is not in the supplied set of recomputed 4N record digests), `below_floor_digest_emitted` (matchable signal whose `evidence_kind` bucket < floor), `disclosure_budget_exceeded` (matchable count per anchor > `declared_cap`), plus schema-variant failures surfaced from `validateCpcSignal`.

- [ ] **Step 1: Write the failing test**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCpcSignal,
  verifyCpcEmission,
} from "../../../../tools/simurgh-attestation/stage4p/core/cpcCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);
const ANCHOR = D("a");
const base = {
  failure_class: "undeclared_proxy_hop",
  stage4n_window_anchor_digest: ANCHOR,
  evidence_kind: "relay_spki_sha256",
  observed_evidence_digest: D("b"),
  disclosure_budget_max_signals_per_window: 2,
};

test("high-entropy evidence -> matchable; same inputs match across operators", () => {
  const a = buildCpcSignal(base);
  const b = buildCpcSignal({ ...base });
  assert.equal(a.signal_mode, "matchable");
  assert.equal(a.custody_class_digest, b.custody_class_digest); // CPC match arm
  const c = buildCpcSignal({ ...base, observed_evidence_digest: D("c") });
  assert.notEqual(a.custody_class_digest, c.custody_class_digest); // differ arm
  const w = buildCpcSignal({ ...base, stage4n_window_anchor_digest: D("d") });
  assert.notEqual(a.custody_class_digest, w.custody_class_digest); // cross-window arm
});

test("low-entropy evidence -> degraded, no digest anywhere", () => {
  const s = buildCpcSignal({ ...base, evidence_kind: "low_entropy_or_unknown" });
  assert.equal(s.signal_mode, "degraded_non_matchable");
  assert.equal(s.coarse_failure_class, "undeclared_proxy_hop");
  assert.ok(!("custody_class_digest" in s));
  assert.equal(s.observed_entropy_bits, 0);
  assert.equal(s.public_linkability, "none");
});

test("verifyCpcEmission: anchor membership, budget cap, tampered below-floor digest", () => {
  const ok2 = [
    buildCpcSignal(base),
    buildCpcSignal({ ...base, failure_class: "model_identity_mismatch" }),
  ];
  assert.deepEqual(verifyCpcEmission({ signals: ok2, declared_cap: 2, anchor_digests: [ANCHOR] }), {
    ok: true,
  });
  assert.deepEqual(verifyCpcEmission({ signals: ok2, declared_cap: 1, anchor_digests: [ANCHOR] }), {
    ok: false,
    raw: 79,
    reason: "disclosure_budget_exceeded",
  });
  assert.deepEqual(
    verifyCpcEmission({ signals: [ok2[0]], declared_cap: 2, anchor_digests: [D("z")] }),
    { ok: false, raw: 79, reason: "window_anchor_not_in_feed" }
  );
  // Adversarial bundle: matchable signal claiming a low-entropy kind (built by hand,
  // since buildCpcSignal cannot construct it — that is the point).
  const forged = { ...ok2[0], evidence_kind: "low_entropy_or_unknown" };
  assert.deepEqual(
    verifyCpcEmission({ signals: [forged], declared_cap: 2, anchor_digests: [ANCHOR] }),
    { ok: false, raw: 79, reason: "below_floor_digest_emitted" }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/cpcCore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/cpcCore.mjs`**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// CPC signal construction + emission verification — raw 79 (4P spec §6.4–§6.6, §9).
// The 4N anchor is a PUBLIC temporal domain separator, not a secret salt.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { custodyClassDigest } from "./digest.mjs";
import { validateCpcSignal } from "./schemaCore.mjs";
import { SCHEMAS, ENTROPY_BITS_BY_KIND, ENTROPY_FLOOR_BITS } from "../constants.mjs";

export function buildCpcSignal(input) {
  const bits = ENTROPY_BITS_BY_KIND[input.evidence_kind];
  if (bits === undefined) throw new Error(`unknown_evidence_kind: ${input.evidence_kind}`);
  if (bits < ENTROPY_FLOOR_BITS) {
    return {
      schema: SCHEMAS.CPC_SIGNAL,
      signal_mode: "degraded_non_matchable",
      coarse_failure_class: input.failure_class,
      stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
      entropy_floor_bits: ENTROPY_FLOOR_BITS,
      observed_entropy_bits: 0,
      public_linkability: "none",
    };
  }
  return {
    schema: SCHEMAS.CPC_SIGNAL,
    signal_mode: "matchable",
    failure_class: input.failure_class,
    stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
    evidence_kind: input.evidence_kind,
    custody_class_digest: custodyClassDigest({
      stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
      failure_class: input.failure_class,
      evidence_kind: input.evidence_kind,
      observed_evidence_digest: input.observed_evidence_digest,
      entropy_floor_bits: ENTROPY_FLOOR_BITS,
      disclosure_budget_max_signals_per_window: input.disclosure_budget_max_signals_per_window,
    }),
    entropy_floor_bits: ENTROPY_FLOOR_BITS,
    disclosure_budget_max_signals_per_window: input.disclosure_budget_max_signals_per_window,
    public_linkability: "bounded",
  };
}

export function verifyCpcEmission({ signals, declared_cap, anchor_digests }) {
  const anchors = new Set(anchor_digests);
  const matchablePerAnchor = new Map();
  for (const sig of signals) {
    const v = validateCpcSignal(sig);
    if (!v.ok) return v;
    if (!anchors.has(sig.stage4n_window_anchor_digest))
      return { ok: false, raw: 79, reason: "window_anchor_not_in_feed" };
    if (sig.signal_mode !== "matchable") continue;
    if (ENTROPY_BITS_BY_KIND[sig.evidence_kind] < sig.entropy_floor_bits)
      return { ok: false, raw: 79, reason: "below_floor_digest_emitted" };
    const n = (matchablePerAnchor.get(sig.stage4n_window_anchor_digest) ?? 0) + 1;
    if (n > declared_cap) return { ok: false, raw: 79, reason: "disclosure_budget_exceeded" };
    matchablePerAnchor.set(sig.stage4n_window_anchor_digest, n);
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4p/cpcCore.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/core/cpcCore.mjs tests/unit/llmShield/stage4p/cpcCore.test.js
git add tools/simurgh-attestation/stage4p/core/cpcCore.mjs tests/unit/llmShield/stage4p/cpcCore.test.js
git commit -m "feat(llm-shield): stage 4p cpc signals with entropy gate and window budget"
```

---

### Task 6: Custody verifier — normative check order

**Files:**

- Create: `tools/simurgh-attestation/stage4p/core/custodyCore.mjs`
- Test: `tests/unit/llmShield/stage4p/custodyCore.test.js`

**Interfaces:**

- Consumes: Tasks 2–5 exports; `VOCA_CHECK_ORDER` from exitCodes.
- Produces: `verifyCustody(input) -> { raw: 0, custody_path_digest } | { raw, reason }` where `input` is:

```js
{
  envelope,                    // object or null (null/absent -> 67 "absent")
  envelopeDigest,              // digest the genesis hop must link to (spec §6.2)
  hops,                        // hop receipt array
  custodyReceipt,              // custody receipt object
  responseDigest,              // digest the terminal hop must bind
  requestDigest,               // digest the receipt must bind
  sig: { envelope_ok, hops_ok, receipt_ok },   // booleans, Ed25519 checked in node layer
  observed: {                  // node layer supplies observed values
    endpoint_digest, model_identity_digest, account_pool_observed, // boolean
    trace_custody_observed,    // enum
    tool_surface_digest, transform_digests,    // string[] observed transforms
  },
  stage4o_surface_commitment_digest,           // from surfaceBindingDigest (Task 2)
  cpc: { signals, declared_cap, anchor_digests },
}
```

The function walks EXACTLY `VOCA_CHECK_ORDER = [67, 68, 69, 78, 70, 71, 72, 73, 74, 75, 76, 77, 79]`, returning the first failure (spec §7.1). Checks per code:

- 67: envelope null → `absent`; `validateEnvelope` fail → its result.
- 68: any of `sig.envelope_ok/hops_ok/receipt_ok` false → matching `VOCA_REASONS_68` reason.
- 69: `run_epoch` outside `[valid_from_epoch, valid_until_epoch]` OR `custodyReceipt.receipt_epoch !== envelope.run_epoch` → `run_epoch_outside_validity_window`.
- 78: `verifyHopChain` fail (also covers embedded 67 from hop schema — return whatever it returns).
- 70: `observed.endpoint_digest !== envelope.declared_endpoint_digest`.
- 71: any chain `relay_identity_digest` not in `envelope.declared_relay_digests`; if `relay_policy === "direct_only"` and hops.length > 1 → `relay_policy_direct_only`. (One hop = the declared origin itself; ≥2 = a relay is present.)
- 72: `observed.model_identity_digest !== envelope.model_identity_digest` OR `custodyReceipt.model_identity_digest !== envelope.model_identity_digest`.
- 73: `observed.account_pool_observed === true` while `envelope.account_boundary !== "declared_pool"`.
- 74: `trace_custody_observed` stricter-set check: allowed pairs are (`provider_only` declared → observed `provider_only`), (`declared_relay` → `provider_only` or `declared_relay`), (`no_trace_retained` → `provider_only`), (`unknown_disallowed` → nothing, observed `unknown` always fails).
- 75: `custodyReceipt.tool_surface_digest !== stage4o_surface_commitment_digest` OR `observed.tool_surface_digest !== stage4o_surface_commitment_digest`.
- 76: any `observed.transform_digests` entry not in `envelope.declared_transform_digests`.
- 77: `validateCustodyReceipt` fail → its result; else binding: `custodyReceipt.request_digest !== requestDigest` OR `custodyReceipt.response_digest !== responseDigest` OR `custodyReceipt.custody_path_digest !== <recomputed>` → `binding_mismatch`.
- 79: `verifyCpcEmission` fail.
- All pass → `{ raw: 0, custody_path_digest }`.

- [ ] **Step 1: Write the failing test** — reuse `goodEnvelope/goodHop/goodReceipt` exported from Task 3's test file plus `buildChain` logic; assemble one `greenInput()` factory that passes end-to-end, then 13 single-fault arms (one per raw code) and 3 doubly-broken arms asserting first-failure order:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyCustody } from "../../../../tools/simurgh-attestation/stage4p/core/custodyCore.mjs";
import {
  hopReceiptDigest,
  custodyPathDigest,
  surfaceBindingDigest,
} from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";
import { buildCpcSignal } from "../../../../tools/simurgh-attestation/stage4p/core/cpcCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);
const SURFACE = surfaceBindingDigest({
  stage4o_manifest_digest: D("a"),
  stage4o_toolset_digest: D("b"),
  stage4o_manifest_epoch: 1,
});
const ANCHOR = D("f");

function greenInput() {
  const envelope = {
    schema: "simurgh.origin_custody_envelope.v1",
    run_epoch: 12,
    declared_endpoint_digest: D("1"),
    provider_family: "self_hosted",
    provider_identity_digest: D("2"),
    model_identity_digest: D("3"),
    relay_policy: "declared_relays_allowed",
    declared_relay_digests: [D("4"), D("5")],
    declared_transform_digests: [D("6")],
    account_boundary: "single_declared",
    trace_custody: "declared_relay",
    tool_surface_digest: SURFACE,
    valid_from_epoch: 10,
    valid_until_epoch: 20,
    signature: "QUJD",
  };
  const envelopeDigest = D("e");
  const responseDigest = D("9");
  const hops = [];
  let prev = envelopeDigest;
  for (let i = 0; i < 2; i++) {
    const hop = {
      schema: "simurgh.custody_hop_receipt.v1",
      hop_index: i,
      previous_receipt_digest: prev,
      relay_identity_digest: [D("4"), D("5")][i],
      transform_digest: "genesis",
      input_digest: D("7"),
      output_digest: i === 1 ? responseDigest : D("8"),
      signature: "QUJD",
    };
    hops.push(hop);
    prev = hopReceiptDigest(hop);
  }
  const custodyReceipt = {
    schema: "simurgh.custody_receipt.v1",
    request_digest: D("0"),
    response_digest: responseDigest,
    custody_path_digest: custodyPathDigest(hops.map(hopReceiptDigest)),
    model_identity_digest: D("3"),
    relay_chain_digest: D("5"),
    trace_custody_observed: "declared_relay",
    tool_surface_digest: SURFACE,
    receipt_epoch: 12,
    signature: "QUJD",
  };
  return {
    envelope,
    envelopeDigest,
    hops,
    custodyReceipt,
    responseDigest,
    requestDigest: D("0"),
    sig: { envelope_ok: true, hops_ok: true, receipt_ok: true },
    observed: {
      endpoint_digest: D("1"),
      model_identity_digest: D("3"),
      account_pool_observed: false,
      trace_custody_observed: "declared_relay",
      tool_surface_digest: SURFACE,
      transform_digests: [D("6")],
    },
    stage4o_surface_commitment_digest: SURFACE,
    cpc: { signals: [], declared_cap: 2, anchor_digests: [ANCHOR] },
  };
}

test("green input returns raw 0 with custody path digest", () => {
  const r = verifyCustody(greenInput());
  assert.equal(r.raw, 0);
  assert.match(r.custody_path_digest, /^sha256:/);
});

test("each raw code fires in isolation", () => {
  const arms = [
    [67, (x) => ({ ...x, envelope: null })],
    [68, (x) => ({ ...x, sig: { ...x.sig, hops_ok: false } })],
    [69, (x) => ({ ...x, envelope: { ...x.envelope, run_epoch: 25 } })],
    [78, (x) => ({ ...x, hops: [x.hops[0]] })],
    [70, (x) => ({ ...x, observed: { ...x.observed, endpoint_digest: D("z") } })],
    [71, (x) => ({ ...x, envelope: { ...x.envelope, declared_relay_digests: [D("4")] } })],
    [72, (x) => ({ ...x, observed: { ...x.observed, model_identity_digest: D("z") } })],
    [73, (x) => ({ ...x, observed: { ...x.observed, account_pool_observed: true } })],
    [74, (x) => ({ ...x, observed: { ...x.observed, trace_custody_observed: "unknown" } })],
    [75, (x) => ({ ...x, observed: { ...x.observed, tool_surface_digest: D("z") } })],
    [76, (x) => ({ ...x, observed: { ...x.observed, transform_digests: [D("z")] } })],
    [77, (x) => ({ ...x, requestDigest: D("z") })],
    [
      79,
      (x) => ({
        ...x,
        cpc: {
          signals: [
            buildCpcSignal({
              failure_class: "undeclared_proxy_hop",
              stage4n_window_anchor_digest: D("q"), // not in anchor feed
              evidence_kind: "relay_spki_sha256",
              observed_evidence_digest: D("w"),
              disclosure_budget_max_signals_per_window: 2,
            }),
          ],
          declared_cap: 2,
          anchor_digests: [ANCHOR],
        },
      }),
    ],
  ];
  for (const [raw, mutate] of arms) {
    const r = verifyCustody(mutate(greenInput()));
    assert.equal(r.raw, raw, `expected raw ${raw}, got ${r.raw} (${r.reason})`);
  }
});

test("first-failure determinism on doubly-broken arms (spec §7.1)", () => {
  // laundering + model swap -> 78, not 72
  let x = greenInput();
  x = { ...x, hops: [x.hops[0]], observed: { ...x.observed, model_identity_digest: D("z") } };
  assert.equal(verifyCustody(x).raw, 78);
  // bad signature + laundering -> 68, not 78
  let y = greenInput();
  y = { ...y, sig: { ...y.sig, receipt_ok: false }, hops: [y.hops[0]] };
  assert.equal(verifyCustody(y).raw, 68);
  // endpoint mismatch + undeclared relay -> 70, not 71
  let z = greenInput();
  z = {
    ...z,
    observed: { ...z.observed, endpoint_digest: D("z") },
    envelope: { ...z.envelope, declared_relay_digests: [D("4")] },
  };
  assert.equal(verifyCustody(z).raw, 70);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/custodyCore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/custodyCore.mjs`** — a single exported function walking the checks in exactly the order documented in the Interfaces block above. Structure:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Normative custody verifier — first failure wins, order 67→68→69→78→70→71→72→73→74→
// 75→76→77→79 (4P spec §7.1). Pure, no I/O; Ed25519 results are injected booleans.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { validateEnvelope, validateCustodyReceipt } from "./schemaCore.mjs";
import { verifyHopChain } from "./chainCore.mjs";
import { verifyCpcEmission } from "./cpcCore.mjs";
import { custodyPathDigest, hopReceiptDigest } from "./digest.mjs";

const TRACE_ALLOWED = Object.freeze({
  provider_only: ["provider_only"],
  declared_relay: ["provider_only", "declared_relay"],
  no_trace_retained: ["provider_only"],
  unknown_disallowed: [],
});

export function verifyCustody(input) {
  // 67
  if (!input.envelope) return { raw: 67, reason: "absent" };
  const ve = validateEnvelope(input.envelope);
  if (!ve.ok) return { raw: ve.raw, reason: ve.reason };
  const env = input.envelope;
  // 68
  if (!input.sig.envelope_ok) return { raw: 68, reason: "envelope_signature_invalid" };
  if (!input.sig.hops_ok) return { raw: 68, reason: "hop_signature_invalid" };
  if (!input.sig.receipt_ok) return { raw: 68, reason: "receipt_signature_invalid" };
  // 69
  if (
    env.run_epoch < env.valid_from_epoch ||
    env.run_epoch > env.valid_until_epoch ||
    input.custodyReceipt?.receipt_epoch !== env.run_epoch
  )
    return { raw: 69, reason: "run_epoch_outside_validity_window" };
  // 78 (laundering before content mismatches — it can mask them)
  const chain = verifyHopChain({
    envelopeDigest: input.envelopeDigest,
    hops: input.hops,
    responseDigest: input.responseDigest,
  });
  if (!chain.ok) return { raw: chain.raw, reason: chain.reason };
  // 70
  if (input.observed.endpoint_digest !== env.declared_endpoint_digest)
    return { raw: 70, reason: "declared_endpoint_digest_mismatch" };
  // 71
  if (env.relay_policy === "direct_only" && input.hops.length > 1)
    return { raw: 71, reason: "relay_policy_direct_only" };
  for (const rid of chain.relay_identity_digests)
    if (!env.declared_relay_digests.includes(rid)) return { raw: 71, reason: "relay_not_declared" };
  // 72
  if (
    input.observed.model_identity_digest !== env.model_identity_digest ||
    input.custodyReceipt.model_identity_digest !== env.model_identity_digest
  )
    return { raw: 72, reason: "model_identity_digest_mismatch" };
  // 73
  if (input.observed.account_pool_observed && env.account_boundary !== "declared_pool")
    return { raw: 73, reason: "account_boundary_undeclared_pool" };
  // 74
  if (!TRACE_ALLOWED[env.trace_custody].includes(input.observed.trace_custody_observed))
    return { raw: 74, reason: "trace_custody_expanded_beyond_declaration" };
  // 75
  if (
    input.custodyReceipt.tool_surface_digest !== input.stage4o_surface_commitment_digest ||
    input.observed.tool_surface_digest !== input.stage4o_surface_commitment_digest
  )
    return { raw: 75, reason: "stage4o_surface_binding_mismatch" };
  // 76
  for (const t of input.observed.transform_digests)
    if (!env.declared_transform_digests.includes(t))
      return { raw: 76, reason: "transform_not_declared" };
  // 77
  const vr = validateCustodyReceipt(input.custodyReceipt);
  if (!vr.ok) return { raw: vr.raw, reason: vr.reason };
  const recomputedPath = custodyPathDigest(input.hops.map(hopReceiptDigest));
  if (
    input.custodyReceipt.request_digest !== input.requestDigest ||
    input.custodyReceipt.response_digest !== input.responseDigest ||
    input.custodyReceipt.custody_path_digest !== recomputedPath
  )
    return { raw: 77, reason: "binding_mismatch" };
  // 79
  const cpc = verifyCpcEmission({
    signals: input.cpc.signals,
    declared_cap: input.cpc.declared_cap,
    anchor_digests: input.cpc.anchor_digests,
  });
  if (!cpc.ok) return { raw: cpc.raw, reason: cpc.reason };
  return { raw: 0, custody_path_digest: chain.custody_path_digest };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4p/custodyCore.test.js`
Expected: PASS (3 tests, 13/13 raw arms + 3 doubly-broken).

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/core/custodyCore.mjs tests/unit/llmShield/stage4p/custodyCore.test.js
git add tools/simurgh-attestation/stage4p/core/custodyCore.mjs tests/unit/llmShield/stage4p/custodyCore.test.js
git commit -m "feat(llm-shield): stage 4p custody verifier, 13/13 raw arms, first-failure order"
```

---

### Task 7: Invention layer core (pincer / contest / disclosure / bridge)

**Files:**

- Create: `tools/simurgh-attestation/stage4p/core/inventionCore.mjs`
- Test: `tests/unit/llmShield/stage4p/inventionCore.test.js`

**Interfaces:**

- Consumes: `SCHEMAS`, `ENUMS` (Task 1); `DIGEST_RE`; `domainDigest` (Task 2).
- Produces:
  - `validateEnforcementCommitment(c) -> {ok:true}|{ok:false, raw:67, reason:"schema_invalid"}` — exact keys `["schema","stage4n_window_anchor_digest","custody_class_digest","action_class","count_commitment","signer_public_key","signature"]`, `action_class` from `ENUMS.action_class`.
  - `pincerCorroborated({ commitment, signals }) -> boolean` — true iff some matchable signal shares BOTH `custody_class_digest` AND `stage4n_window_anchor_digest` with the commitment (spec §11.1).
  - `validateRelayContest(contest, { signerKeyDigest }) -> {ok:true}|{ok:false, raw, reason}` — exact keys per §11.2; `signerKeyDigest !== contest.relay_identity_digest` → `{ok:false, raw:68, reason:"contest_signer_mismatch"}` (68-class per closed-ledger rule §11).
  - `projectVendorDisclosure(attestation) -> disclosure` — derives `declared_provider_family`, `declared_relay_count`, `trace_custody_class`, `verification_result` ("verified" iff attestation `raw === 0` else "custody_failure"), `attestation_digest` (via `domainDigest(DOMAINS.DISCLOSURE, …)` over the attestation's own digest field).
  - `verifyVendorDisclosure(disclosure, attestation) -> {ok:true}|{ok:false, raw:67, reason:"schema_invalid"}` — recompute `projectVendorDisclosure(attestation)` and deep-equal; ANY extra/underivable field fails closed (spec §11.3 test).
  - `validateExtractionBridge(bridge, { knownCpcDigests, known3tDigests }) -> {ok:true}|{ok:false, raw:67, reason:"schema_invalid"}` — exact keys `["cpc_custody_class_digest","stage3t_attestation_digest","bridge_mode"]`, `bridge_mode === "digest_binding_only"`, and both digests must be members of the supplied known sets (both sides verify independently, spec §11.4).

- [ ] **Step 1: Write the failing test** — cover: pincer match / window-mismatch / class-mismatch (3 arms), contest valid + signer-mismatch (2 arms), disclosure recompute + underivable-field rejection, bridge accept + unknown-digest rejection:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEnforcementCommitment,
  pincerCorroborated,
  validateRelayContest,
  projectVendorDisclosure,
  verifyVendorDisclosure,
  validateExtractionBridge,
} from "../../../../tools/simurgh-attestation/stage4p/core/inventionCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

const commitment = {
  schema: "simurgh.enforcement_window_commitment.v1",
  stage4n_window_anchor_digest: D("a"),
  custody_class_digest: D("b"),
  action_class: "account_cluster_ban",
  count_commitment: D("c"),
  signer_public_key: "QUJD",
  signature: "QUJD",
};
const signal = (over = {}) => ({
  schema: "simurgh.custody_class_signal.v1",
  signal_mode: "matchable",
  failure_class: "undeclared_proxy_hop",
  stage4n_window_anchor_digest: D("a"),
  evidence_kind: "relay_spki_sha256",
  custody_class_digest: D("b"),
  entropy_floor_bits: 96,
  disclosure_budget_max_signals_per_window: 4,
  public_linkability: "bounded",
  ...over,
});

test("pincer: match / window-mismatch / class-mismatch", () => {
  assert.deepEqual(validateEnforcementCommitment(commitment), { ok: true });
  assert.equal(pincerCorroborated({ commitment, signals: [signal()] }), true);
  assert.equal(
    pincerCorroborated({ commitment, signals: [signal({ stage4n_window_anchor_digest: D("z") })] }),
    false
  );
  assert.equal(
    pincerCorroborated({ commitment, signals: [signal({ custody_class_digest: D("z") })] }),
    false
  );
});

test("relay contest: valid chains; wrong signer key is 68-class", () => {
  const contest = {
    schema: "simurgh.relay_contest.v1",
    contested_custody_class_digest: D("b"),
    stage4n_window_anchor_digest: D("a"),
    relay_identity_digest: D("r"),
    counter_evidence_digest: D("e"),
    signature: "QUJD",
  };
  assert.deepEqual(validateRelayContest(contest, { signerKeyDigest: D("r") }), { ok: true });
  assert.deepEqual(validateRelayContest(contest, { signerKeyDigest: D("x") }), {
    ok: false,
    raw: 68,
    reason: "contest_signer_mismatch",
  });
});

test("vendor disclosure: recomputes field-for-field; underivable field fails closed", () => {
  const attestation = {
    raw: 0,
    envelope: {
      provider_family: "self_hosted",
      declared_relay_digests: [D("1"), D("2")],
      trace_custody: "declared_relay",
    },
    bundle_digest: D("9"),
  };
  const disc = projectVendorDisclosure(attestation);
  assert.equal(disc.schema, "simurgh.vendor_custody_disclosure.v1");
  assert.equal(disc.declared_relay_count, 2);
  assert.equal(disc.verification_result, "verified");
  assert.deepEqual(verifyVendorDisclosure(disc, attestation), { ok: true });
  assert.equal(verifyVendorDisclosure({ ...disc, marketing_grade: "A+" }, attestation).ok, false);
});

test("extraction bridge: both digests must verify independently", () => {
  const bridge = {
    cpc_custody_class_digest: D("b"),
    stage3t_attestation_digest: D("t"),
    bridge_mode: "digest_binding_only",
  };
  const ctx = { knownCpcDigests: [D("b")], known3tDigests: [D("t")] };
  assert.deepEqual(validateExtractionBridge(bridge, ctx), { ok: true });
  assert.equal(validateExtractionBridge(bridge, { ...ctx, known3tDigests: [] }).ok, false);
  assert.equal(validateExtractionBridge({ ...bridge, bridge_mode: "causal_proof" }, ctx).ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/inventionCore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/inventionCore.mjs`** — straightforward validators following schemaCore's `exactKeys` style (duplicate the tiny helper locally rather than exporting it; DRY yields to core-module independence here), `projectVendorDisclosure` building the five-field object, `verifyVendorDisclosure` via `canonicalJson` equality of the recomputed projection, `pincerCorroborated` as a `.some()` over matchable signals comparing the two digests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4p/inventionCore.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/core/inventionCore.mjs tests/unit/llmShield/stage4p/inventionCore.test.js
git add tools/simurgh-attestation/stage4p/core/inventionCore.mjs tests/unit/llmShield/stage4p/inventionCore.test.js
git commit -m "feat(llm-shield): stage 4p invention layer core - pincer, contest, disclosure, bridge"
```

---

### Task 8: Fixture builder — Lane A corpus, Lane C, CPC arms, keys, prettierignore

**Files:**

- Create: `tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs`
- Create (generated, committed): `tests/fixtures/llmShield/stage4p/**`
- Modify: `.prettierignore` (add two lines)
- Test: `tests/unit/llmShield/stage4p/fixtures.test.js`

**Interfaces:**

- Consumes: all core modules; `node:crypto` Ed25519 (`generateKeyPairSync`, `sign`, `verify`); stage4n fixture feed for anchors: pick ONE committed 4N heartbeat record file under `tests/fixtures/llmShield/stage4n/` (inspect that directory, choose the canonical feed fixture, recompute its record digest with stage4n's own core so the anchor is REAL — spec §10.2) and freeze the chosen path + digest into `tests/fixtures/llmShield/stage4p/stage4n-anchor.json` as `{ source_path, record_digest }`.
- Produces committed fixture tree:

```text
tests/fixtures/llmShield/stage4p/
  keys/  operator-a-INSECURE_FIXTURE_ONLY.pem + .pub  (same for operator-b, operator-c,
         relay-1, relay-2, relay-hidden, provider, contest-relay)
  stage4n-anchor.json                      real 4N anchor (+ next-window anchor)
  stage4o-surface.json                     {stage4o_manifest_digest, stage4o_toolset_digest,
                                            stage4o_manifest_epoch, commitment_digest}
                                           copied from committed 4O fixture manifest digests
  lane-a/<arm-name>/input.json             verifyCustody input (sig booleans REAL —
                                           computed by verifying actual Ed25519 signatures)
  lane-a/<arm-name>/expected.json          {raw, reason}
  lane-c/public-report-motivated/input.json + expected.json   (71 arm, synthetic names)
  cpc/<arm-name>.json                      five CPC arms (§9 table)
  invention/pincer-{match,window-mismatch,class-mismatch}.json
  invention/contest-{valid,forged}.json
  invention/disclosure.json  invention/bridge.json
```

Lane A arm list (fixed, 24 arms): `green-direct`, `green-declared-relay`, one per raw code (`fault-67` … `fault-79`, 13 arms), doubly-broken `laundering-beats-model-swap` (78), `signature-beats-laundering` (68), `endpoint-beats-relay` (70), boundary `epoch-edge-low` (green at `run_epoch == valid_from_epoch`), `epoch-edge-high` (green at `== valid_until_epoch`), `unknown-enum` (67), `malformed-receipt` (77).

- [ ] **Step 1: Write the failing test** — `fixtures.test.js` loads every `lane-a/*/input.json` + `expected.json`, runs `verifyCustody`, asserts exact `{raw, reason}` match; asserts CPC arm files reproduce via `buildCpcSignal` (match arm: operator-a and operator-b files carry IDENTICAL `custody_class_digest`; differ arm differs; cross-window differs; degraded has no digest; budget arm's expected is raw 79); asserts all five `VOCA_REASONS_78` reasons and all 13 raw codes appear across expected files; asserts no fixture byte contains `BEGIN PRIVATE KEY` outside `keys/`, and no key under `keys/` lacks the `INSECURE_FIXTURE_ONLY` filename token. (Write it against the not-yet-existing tree; it fails with ENOENT.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/fixtures.test.js`
Expected: FAIL — ENOENT on fixture dir.

- [ ] **Step 3: Implement `build-stage4p-fixtures.mjs`** — deterministic given committed keys: on first run with `--init-keys`, generate the eight Ed25519 keypairs into `keys/`; every subsequent run reads the committed PEMs and rebuilds ALL fixture JSON (real signatures over `canonicalJson` of unsigned objects, envelope digest via `domainDigest(DOMAINS.ENVELOPE, …)` of the unsigned envelope, sig booleans in `input.json` computed by actually verifying the signatures, `fault-68` arm produced by corrupting a signature byte). The 4N anchor: read the chosen stage4n fixture, recompute the record digest using `tools/simurgh-attestation/stage4n` core functions, write `stage4n-anchor.json` with BOTH the current-window and next-window anchors (cross-window arm needs two). The 4O surface: read the committed 4O fixture manifest (`tests/fixtures/llmShield/stage4o/` — locate the manifest JSON carrying `toolset_digest`; use its digests + epoch), compute `surfaceBindingDigest`, write `stage4o-surface.json`. Lane C arm: synthetic provider names only (`example-transfer-station`, `example-premium-model`) with a `source_note` field: `"public_report_motivated_synthetic"`.

- [ ] **Step 4: Generate, format, verify**

```bash
node tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs --init-keys
printf '\n# stage 4P deterministic fixtures + evidence (byte-identity via signed bundle)\ntests/fixtures/llmShield/stage4p/\ndocs/research/llm-shield/evidence/stage-4p/\n' >> .prettierignore
node tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs   # second run must be a byte no-op
git status --porcelain tests/fixtures/llmShield/stage4p/ | wc -l         # after git add: rerun builder, expect 0 changes
node --test tests/unit/llmShield/stage4p/fixtures.test.js
```

Expected: builder idempotent on second run; fixtures test PASS.

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs tests/unit/llmShield/stage4p/fixtures.test.js
git add tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs tests/unit/llmShield/stage4p/fixtures.test.js tests/fixtures/llmShield/stage4p/ .prettierignore
git commit -m "feat(llm-shield): stage 4p harness-computed fixture corpus, lanes a and c, cpc arms"
```

---

### Task 9: Golden regenerations (the §7.3 blast radius)

**Files:**

- Modify: every golden broken by codes 67–79. Known list (verify against the Task 1 Step 6 record): `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json`, `docs/research/llm-shield/evidence/stage-4h/exit-map.json`, the 4h exitWrapper inline map test, `tests/unit/llmShield/stage4k/*wrapper*`, `tests/unit/llmShield/stage4l/*wrapper*`, `tests/unit/llmShield/stage4o/exitWrapper.vtsa.test.js` (only if it asserts map completeness), `tests/e2e/llmShield/stage4l/fullChain.e2e.test.js`, 4n/4o net snapshots.

**Interfaces:** none new — this task restores `npm test` to green.

- [ ] **Step 1: Enumerate actual breakage**

Run: `npm test 2>&1 | grep -E "fail|✖" | head -30`
Record every failing file.

- [ ] **Step 2: Regenerate the 4h exit map** — find the 4h regeneration entry point first: `grep -rn "exit-map.json" scripts/ tools/simurgh-attestation/stage4h/ | grep -v test`. Use the existing regeneration command (the 4h reproduce script regenerates fixture + evidence copies — run `scripts/reproduce-llm-shield-stage4h.sh` if that is the documented regenerator; confirm both exit-map.json copies pick up 67–79).

- [ ] **Step 3: Update wrapper snapshot tests** — for each failing snapshot/inline-map assertion, extend the expected map with `67: 1 … 79: 1` exactly as Task 1 added them (these tests assert ledger completeness — the additions are the reviewed extension, and the diff should contain ONLY codes 67–79).

- [ ] **Step 4: Full unit suite green**

Run: `npm test`
Expected: PASS, zero failures.

- [ ] **Step 5: E2E goldens**

Run: `bash scripts/check-e2e.sh 2>&1 | tail -5`
Expected: existing stages all green (4l fullChain + 4n/4o nets see the extended map). Fix any remaining snapshot the unit suite missed. Then check working-tree drift: `git status --porcelain | head` — if 4h reproduce regenerated evidence files, they belong in this commit.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test(llm-shield): extend shared exit-code goldens with stage 4p codes 67-79"
```

---

### Task 10: Lane B — relay capture over the 4O harness

**Files:**

- Create: `tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs`
- Create (generated, committed): `tests/fixtures/llmShield/stage4p/lane-b/<six arms>/{input.json,expected.json}` + `lane-b/capture-manifest.json`
- Test: `tests/unit/llmShield/stage4p/laneb.test.js`

**Interfaces:**

- Consumes: 4O mock-provider machinery — inspect `tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs` and `tests/unit/llmShield/stage4o/laneb.test.js` to reuse the same in-process mock MCP server/manifest the 4O capture used; 4P core modules; `stage4o-surface.json` from Task 8.
- Produces: six frozen digest-only captures (spec §8 Lane B): `clean-declared-relay` (green), `undeclared-relay` (71), `model-swap` (72), `trace-custodian-change` (74), `tool-surface-rewrite` (75 — tamper the observed toolset digest so the recomputed surface binding mismatches the committed 4O one), `dropped-hop` (78). The relay is an in-process function: it receives the request object, signs a REAL hop receipt with the `relay-1` key (or `relay-hidden` for the 71 arm), forwards to the 4O mock provider exchange, signs the response custody receipt with the `provider` key. `capture-manifest.json` records `{arm, custody_path_digest, expected: {raw, reason}}` for each arm. CI never touches the network — everything in-process; the capture script is run ONCE by the implementer and the outputs committed; `laneb.test.js` replays `verifyCustody` over the committed captures (no re-capture in CI).

- [ ] **Step 1: Write the failing test** — `laneb.test.js`: for each of the six committed arms, load `input.json` + `expected.json`, REAL Ed25519 verification of every signature in the capture (recompute `sig` booleans from the committed public keys — do not trust the stored booleans), run `verifyCustody`, assert exact match with `expected.json` AND with `capture-manifest.json`. Assert the clean arm's `custody_receipt.tool_surface_digest` equals the committed 4O `commitment_digest` from `stage4o-surface.json` (the REAL cross-stage invariant).

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/laneb.test.js`
Expected: FAIL — ENOENT lane-b.

- [ ] **Step 3: Implement the capture script and run it once**

```bash
node tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs
node tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs   # byte-idempotent
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/unit/llmShield/stage4p/laneb.test.js`
Expected: PASS — 6/6 arms classified, surface binding real.

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs tests/unit/llmShield/stage4p/laneb.test.js
git add tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs tests/unit/llmShield/stage4p/laneb.test.js tests/fixtures/llmShield/stage4p/lane-b/
git commit -m "feat(llm-shield): stage 4p lane b relay captures over the 4o harness, 6/6 arms"
```

---

### Task 11: Attestation builder + offline verifier

**Files:**

- Create: `tools/simurgh-attestation/stage4p/node/build-stage4p-attestation.mjs`
- Create: `tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs`
- Create (generated, committed): `docs/research/llm-shield/evidence/stage-4p/voca-attestation.json` + `voca-signer.pub`
- Test: `tests/unit/llmShield/stage4p/attestation.test.js`

**Interfaces:**

- Consumes: everything above. Mirror the 4O builder (`build-stage4o-attestation.mjs`) for arg parsing, key handling (`--key <pem-path>` for the REAL stage4p attestation key, generated via `tools/simurgh-attestation/keygen.mjs` with the private key OUTSIDE the repo; committed `.pub` JSON alongside the bundle), and the sign-canonical rule: signature over `canonicalJson(JSON.parse(bundleJson))` — prettier/merge-safe (3M lesson).
- Produces bundle `simurgh.voca_attestation.v1`:

```js
{
  schema: "simurgh.voca_attestation.v1",
  non_claims: VOCA_NON_CLAIMS,               // all 16, frozen order
  safety_rail: SAFETY_RAIL,
  arms: [ { arm, lane, raw, reason } ... ],  // every Lane A/B/C arm replayed at build time
  cpc_signals: [...],                        // five §9 arms' signals (operator-a set)
  corroborating_commitments: [...],          // ONLY entropy-passing custody_class_digests
                                             // (4L slot payoff, spec §1.4 — schema-compatible
                                             // string array, matching 4L's existing [] slot)
  enforcement_commitment: {...},             // pincer fixture (synthetic)
  pincer_corroborated: true,
  relay_contests: [...],                     // valid contest fixture
  vendor_custody_disclosure: {...},          // projected from this bundle pre-signature
  custody_extraction_bridge: {...},          // digest_binding_only fixture
  metrics: { raw_code_coverage: "13/13", lane_b_arms: "6/6", cpc_arms: "5/5",
             pincer_arms: "3/3", contest_arms: "2/2" },
  stage4n_window_anchor_digest, stage4o_surface_commitment_digest,
  bundle_digest,                             // domainDigest(ATTESTATION_BUNDLE) of all above
  signer_public_key_pem, signature,
}
```

- Verifier `verify-stage4p.mjs`: two-tier (3M pattern) — `--offline` recomputes every arm from committed fixtures, recomputes `bundle_digest`, verifies Ed25519, checks non-claims list byte-equality, checks `corroborating_commitments` contains EXACTLY the matchable arms' digests and nothing degraded, re-projects the vendor disclosure, re-checks pincer/contest/bridge. Exit code ALWAYS routed through `stage4CodeForRawCode`.

- [ ] **Step 1: Write the failing test** — `attestation.test.js`: run builder in-process (export a `buildBundle({keyPem})` function from the builder; CLI wraps it) with a THROWAWAY key generated in the test, then: bundle validates (schema + 16 non-claims byte-equal to `VOCA_NON_CLAIMS`), verifier passes, tamper matrix — flip one arm's `raw`, drop a non-claim, mutate `corroborating_commitments`, inject a degraded signal's window into `corroborating_commitments`, corrupt signature — each tamper must fail verification with a nonzero raw.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4p/attestation.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement builder + verifier** (builder exports `buildBundle`, CLI reads `--key`; verifier exports `verifyBundle` for the test + e2e net).

- [ ] **Step 4: Run tests, then produce the REAL signed evidence**

```bash
node --test tests/unit/llmShield/stage4p/attestation.test.js       # PASS
node tools/simurgh-attestation/keygen.mjs --out-private ~/.simurgh-keys/stage4p.pem --out-public docs/research/llm-shield/evidence/stage-4p/voca-signer.pub
node tools/simurgh-attestation/stage4p/node/build-stage4p-attestation.mjs --key ~/.simurgh-keys/stage4p.pem --out docs/research/llm-shield/evidence/stage-4p/voca-attestation.json
node tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs --offline docs/research/llm-shield/evidence/stage-4p/voca-attestation.json
```

Expected: verifier prints raw 0 summary; exit 0.

- [ ] **Step 5: Commit**

```bash
npx prettier --write tools/simurgh-attestation/stage4p/node/build-stage4p-attestation.mjs tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs tests/unit/llmShield/stage4p/attestation.test.js
git add tools/simurgh-attestation/stage4p/node/ tests/unit/llmShield/stage4p/attestation.test.js docs/research/llm-shield/evidence/stage-4p/
git commit -m "feat(llm-shield): stage 4p signed voca attestation, offline verifier, 4l slot payoff"
```

---

### Task 12: Lean proofs — six theorems incl. GhostTrilemma

**Files:**

- Create: `proofs/stage4p/OriginCustody.lean`
- Create: `proofs/stage4p/lean-toolchain` (content: `leanprover/lean4:v4.15.0` — match `proofs/stage4m/lean-toolchain` byte-for-byte)
- Modify: `.github/workflows/stage-4-lean-proofs.yml` (add `lean proofs/stage4p/OriginCustody.lean` after the stage4o line)
- Test: local `lean` invocation (Lean CI gate is the workflow)

**Interfaces:**

- Consumes: style of `proofs/stage4m/AntiMonotonicity.lean` (self-contained, no mathlib, `namespace Simurgh`).
- Produces: theorems `noGhostProvider_accept`, `noSilentThirdPath`, `noCustodyLaundering`, `custodyPathMonotone`, `cpcEmissionBounded`, `ghostTrilemma` — over the recorded custody model (spec §12).

- [ ] **Step 1: Write the model + theorems** — complete file:

```lean
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4P Origin Custody Law, machine-checked (4P spec §12). Self-contained: core
-- Lean 4 only, no mathlib. The proofs are over the RECORDED custody model, not
-- physical network truth (signed limitation: proof_is_of_model_not_implementation).
-- Motto: AnthropicSafe First, then ReviewerSafe.

namespace Simurgh.Stage4P

/-- A relay identity in the recorded model. -/
abbrev Relay := Nat

/-- The committed custody envelope: declared relays + declared cap. -/
structure Envelope where
  declaredRelays : List Relay
  cap : Nat

/-- A recorded hop: which relay signed it, and whether its previous-link matches. -/
structure Hop where
  relay : Relay
  linksToPrev : Bool

/-- Verifier decision — total, no fourth constructor exists. -/
inductive Decision where
  | accepted
  | refused
  | ledgered

/-- Chain verification in the recorded model: every hop links and every relay is declared. -/
def chainValid (env : Envelope) (hops : List Hop) : Bool :=
  hops.all (fun h => h.linksToPrev && env.declaredRelays.contains h.relay)

/-- The recorded verifier: accepts iff the chain is valid, else ledgers. -/
def verify (env : Envelope) (hops : List Hop) : Decision :=
  if chainValid env hops then Decision.accepted else Decision.ledgered

/-- NoSilentThirdPath: every decision is accepted, refused, or ledgered. -/
theorem noSilentThirdPath (d : Decision) :
    d = Decision.accepted ∨ d = Decision.refused ∨ d = Decision.ledgered := by
  cases d
  · exact Or.inl rfl
  · exact Or.inr (Or.inl rfl)
  · exact Or.inr (Or.inr rfl)

/-- NoGhostProvider_accept: acceptance implies every recorded relay is declared. -/
theorem noGhostProvider_accept (env : Envelope) (hops : List Hop)
    (h : verify env hops = Decision.accepted) :
    ∀ hop ∈ hops, env.declaredRelays.contains hop.relay = true := by
  intro hop hmem
  unfold verify at h
  by_cases hc : chainValid env hops
  · have := List.all_eq_true.mp hc hop hmem
    exact (Bool.and_eq_true.mp this).right
  · simp [hc] at h

/-- CustodyPathMonotone: acceptance implies no relay outside the envelope appears. -/
theorem custodyPathMonotone (env : Envelope) (hops : List Hop) (r : Relay)
    (h : verify env hops = Decision.accepted)
    (hr : env.declaredRelays.contains r = false) :
    ∀ hop ∈ hops, hop.relay ≠ r := by
  intro hop hmem heq
  have hd := noGhostProvider_accept env hops h hop hmem
  rw [heq, hr] at hd
  exact Bool.noConfusion hd

/-- NoCustodyLaundering: a hop that does not link to its predecessor is never accepted. -/
theorem noCustodyLaundering (env : Envelope) (hops : List Hop) (hop : Hop)
    (hmem : hop ∈ hops) (hbroken : hop.linksToPrev = false) :
    verify env hops ≠ Decision.accepted := by
  intro h
  unfold verify at h
  by_cases hc : chainValid env hops
  · have := List.all_eq_true.mp hc hop hmem
    have hl := (Bool.and_eq_true.mp this).left
    rw [hbroken] at hl
    exact Bool.noConfusion hl
  · simp [hc] at h

/-- The ghost's three options in the recorded model. -/
inductive GhostFate where
  | vanish      -- produced no valid linking hop → chain fails → ledgered
  | forge       -- signed as a declared relay it is not → excluded by assumption
  | selfLedger  -- signed as itself → its identity is in the recorded evidence

/-- Signature soundness assumption (signed limitation): a hop recorded for relay r was
    produced by r. Under it, a hop cannot be `forge`. -/
def signatureSound : Prop :=
  ∀ (recorded actual : Relay), recorded = actual

/-- GhostTrilemma: for an undeclared mediating relay g, either some recorded hop carries
    g's identity (self-ledger: g is in the evidence AND acceptance is impossible by
    noGhostProvider_accept), or no recorded hop carries g (vanish: g's mediation left no
    valid custody evidence — the absence IS the signal). Forgery is excluded by the
    signature-soundness assumption. -/
theorem ghostTrilemma (env : Envelope) (hops : List Hop) (g : Relay)
    (hundeclared : env.declaredRelays.contains g = false) :
    (∃ hop ∈ hops, hop.relay = g) ∧ verify env hops ≠ Decision.accepted
    ∨ (∀ hop ∈ hops, hop.relay ≠ g) := by
  by_cases hmem : ∃ hop ∈ hops, hop.relay = g
  · left
    refine ⟨hmem, ?_⟩
    intro hacc
    obtain ⟨hop, hin, heq⟩ := hmem
    have hd := noGhostProvider_accept env hops hacc hop hin
    rw [heq, hundeclared] at hd
    exact Bool.noConfusion hd
  · right
    intro hop hin heq
    exact hmem ⟨hop, hin, heq⟩

/-- CPC emission model: signals per window vs declared cap; the verifier counts. -/
def emissionOk (cap : Nat) (emitted : Nat) : Bool := emitted ≤ cap

/-- CpcEmissionBounded: an accepted emission never exceeds the declared cap. -/
theorem cpcEmissionBounded (cap emitted : Nat) (h : emissionOk cap emitted = true) :
    emitted ≤ cap := by
  simpa [emissionOk] using h

end Simurgh.Stage4P
```

- [ ] **Step 2: Verify locally**

Run: `lean proofs/stage4p/OriginCustody.lean`
Expected: exit 0, no output, no `sorry`. If lemma names (`List.all_eq_true`, `Bool.and_eq_true`) differ in v4.15.0 core, fix by consulting how `proofs/stage4/ExitLattice.lean` and `proofs/stage4m/AntiMonotonicity.lean` discharge the same shapes — do NOT add mathlib.

- [ ] **Step 3: Extend the CI workflow** — in `.github/workflows/stage-4-lean-proofs.yml`, add after the stage4o line:

```yaml
lean proofs/stage4p/OriginCustody.lean
```

- [ ] **Step 4: Run the guard that no `sorry` exists**

Run: `grep -c sorry proofs/stage4p/OriginCustody.lean`
Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add proofs/stage4p/ .github/workflows/stage-4-lean-proofs.yml
git commit -m "feat(proofs): stage 4p origin-custody theorems incl ghost trilemma, machine-checked"
```

---

### Task 13: K7 all-functions E2E net + reproduce script + wiring

**Files:**

- Create: `tests/e2e/llmShield/stage4p/allFunctions.e2e.test.js`
- Create: `scripts/reproduce-llm-shield-stage4p.sh`
- Modify: `scripts/check-e2e.sh` (add entry after the 4O line, mirroring `"Stage 4O VTSA|scripts/reproduce-llm-shield-stage4o.sh"` → `"Stage 4P VOCA|scripts/reproduce-llm-shield-stage4p.sh"`)

**Interfaces:**

- Consumes: every export of every stage4p module (the net imports ALL of them and fails if any export is untouched — keep an explicit export inventory list in the test and assert against `Object.keys(await import(...))`).
- Produces: the mandatory-before-tag gate (spec §13).

- [ ] **Step 1: Write the E2E net** — one file, sections:
  1. **Export inventory:** import each stage4p module, assert its export-name set matches a frozen list (catches dead/renamed exports).
  2. **Full composition:** rebuild the bundle in-process with a throwaway key → verify offline → assert raw 0.
  3. **Tamper matrix:** for EVERY top-level bundle field, mutate it (string fields → flip a char; arrays → drop element; objects → inject key) and assert verification fails; restore between arms.
  4. **Cross-stage invariants:** (a) clean Lane B arm's surface digest === committed 4O commitment digest recomputed FROM the 4O fixture manifest via `surfaceBindingDigest`; (b) `stage4n-anchor.json` record digest recomputed from the referenced stage4n fixture file via stage4n core === the frozen anchor; (c) `corroborating_commitments` array validates against the 4L slot shape (read `tools/simurgh-attestation/stage4l/build-stage4l-attestation.mjs` slot: an array — assert every entry matches `DIGEST_RE`, and the 4L builder's attestation still parses with the field present).
  5. **Privacy scan:** walk every committed byte under `tests/fixtures/llmShield/stage4p/` and `docs/research/llm-shield/evidence/stage-4p/` (excluding `keys/`), assert no `BEGIN PRIVATE KEY`, no `http://`/`https://` (except in `source_note`-free docs — fixtures carry NO URLs at all), no `@`-email pattern; assert public keys only under keys allowlist or `signer_public_key`/`*_public_key_pem` fields. Pure Node `fs` walk — no `rg`.
  6. **Byte idempotency:** run fixture builder + Lane B capture twice via `execFileSync(process.execPath, …)`, then `git diff --exit-code` on the fixture dirs. The committed attestation is NOT rebuilt (its private key lives outside the repo) — it is re-verified offline, which is the reproducibility contract (3M two-tier pattern).

- [ ] **Step 2: Run it**

Run: `node --test tests/e2e/llmShield/stage4p/allFunctions.e2e.test.js`
Expected: PASS.

- [ ] **Step 3: Write `scripts/reproduce-llm-shield-stage4p.sh`** — mirror the 4O script skeleton exactly (same `set -euo pipefail`, `TZ=UTC LC_ALL=C`, Node-26 PATH prepend, `run_step`/`exit_via_wrapper` via `stage4CodeForRawCode`, egress gate step). Steps: [1] node ≥ 26; [2] unit tests for stage4p (explicit file list); [3] fixture builder re-run + `git diff --exit-code tests/fixtures/llmShield/stage4p`; [4] Lane B capture re-run + diff; [5] offline verifier on committed attestation; [6] E2E net; [7] egress gate (reuse the 4O script's no-network mechanism verbatim); [8] print `[stage4p] ALL GREEN`.

- [ ] **Step 4: Run reproduce twice, byte-idempotent**

```bash
bash scripts/reproduce-llm-shield-stage4p.sh && bash scripts/reproduce-llm-shield-stage4p.sh
git status --porcelain | wc -l   # expect 0 (after the check-e2e.sh edit is committed)
```

- [ ] **Step 5: Wire into check-e2e and run the full gate**

```bash
bash scripts/check-e2e.sh 2>&1 | tail -8
```

Expected: all stages green including `Stage 4P VOCA`.

- [ ] **Step 6: Commit**

```bash
npx prettier --write tests/e2e/llmShield/stage4p/allFunctions.e2e.test.js
git add tests/e2e/llmShield/stage4p/ scripts/reproduce-llm-shield-stage4p.sh scripts/check-e2e.sh
git commit -m "test(llm-shield): stage 4p all-functions e2e net, one-command reproduce, e2e wiring"
```

---

### Task 14: Docs, docs-accuracy pass, closeout re-score

**Files:**

- Create: `docs/research/llm-shield/STAGE_4P_THREAT_MODEL.md` (spec §4 table + out-of-scope list + safety rail)
- Create: `docs/research/llm-shield/STAGE_4P_VALIDATION_MATRIX.md` (spec §13 metrics with ACTUAL counts from the shipped fixtures)
- Create: `docs/research/llm-shield/STAGE_4P_REVIEWER_CHECKLIST.md` (how to re-run: keygen not needed for verify; `verify-stage4p.mjs --offline`; reproduce script; Lean; where each non-claim is enforced in code — file:line per non-claim)
- Modify: `docs/superpowers/specs/2026-07-05-stage-4p-voca-design.md` (closeout re-score appendix ONLY — never touch frozen sections)

**Interfaces:** none — this is the honesty gate.

- [ ] **Step 1: Write the three docs** with real numbers pulled from the shipped tree (`ls tests/fixtures/llmShield/stage4p/lane-a | wc -l` etc.). Every metric line in `STAGE_4P_VALIDATION_MATRIX.md` states the command that recomputes it.

- [ ] **Step 2: Docs-accuracy pass (MANDATORY, spec §17.12)** — for EVERY claim in the three docs AND spec §§5–13, verify against shipped code: schema key lists vs `schemaCore.mjs`, check order vs `exitCodes.mjs`, reason lists vs `VOCA_REASONS_*`, metrics vs actual fixture counts, script/workflow names vs the files. Fix any drift IN THE DOCS (code is source of truth; if code deviated from spec deliberately, record the deviation in the closeout appendix like 4O's "spec delta" comment pattern).

- [ ] **Step 3: Overclaim scan** — run the repo's overclaim/tone gate: `bash scripts/check.sh 2>&1 | tail -10` (the scan trips on honest negations phrased as capabilities — 4N gotcha: phrase limitations as "does not X", never "cannot be Xed").

- [ ] **Step 4: Closeout re-score appendix** in the spec (append after §18):

```markdown
## 19. Closeout re-score (post-implementation)

| Axis               | Spec | Closeout | Delta notes                                      |
| ------------------ | ---- | -------- | ------------------------------------------------ |
| Novelty            | 9.0  | <honest> | GhostTrilemma proved? pincer shipped as specced? |
| Frontier           | 9.0  | <honest> | Lane B shipped MCP-shaped as declared            |
| Good-for-Anthropic | 9.5  | <honest> | pilot still required for 10                      |
| Constitution       | 9.0  | <honest> | contest arm exercised in fixtures only           |

Source discipline honoured: AEX / ChinaTalk / Tom's Hardware / CISPA / RATS / SCITT /
in-toto cited via §3 source map only; no third-party incident figure adopted.
```

Fill `<honest>` with real numbers based on what actually shipped — score DOWN anything descoped, with the reason.

- [ ] **Step 5: Final full gate**

```bash
npm test && bash scripts/check.sh && bash scripts/check-e2e.sh
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
npx prettier --write docs/research/llm-shield/STAGE_4P_*.md docs/superpowers/specs/2026-07-05-stage-4p-voca-design.md
git add docs/research/llm-shield/ docs/superpowers/specs/2026-07-05-stage-4p-voca-design.md
git commit -m "docs(llm-shield): stage 4p threat model, validation matrix, reviewer checklist, closeout re-score"
```

---

## Post-plan (not tasks — release ritual, follow 4O's)

PR from `stage-4p-voca-design` to `main` (rebase-merge; NEVER commit to local main). After merge + CI green: `git tag v2.25.0-stage-4p-voca` (verify `git tag --sort=-creatordate | head -1` is still `v2.24.0-stage-4o-vtsa` first), GitHub release with neutral notes. Memory update comes after tag.
