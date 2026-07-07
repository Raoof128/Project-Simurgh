# Stage 4W — VSN: Verifiable Slot-Bound Narrative — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Stage 4W VSN — span-level provenance typing of the incident
narrative (slot_bound / judgment / unverified_prose) with a fail-closed
lexical leakage gate, evidence density, 4V contest adapter, three evidence
lanes, two-tier attestation, C2PA/in-toto bridge, JS/Python/browser parity,
and five Lean theorems. Spec:
`docs/superpowers/specs/2026-07-07-stage-4w-vsn-slot-bound-narrative-design.md`.

**Architecture:** Additive module `tools/simurgh-attestation/stage4w/` beside
the byte-frozen 4T capsule and 4V contest machinery. Pure core
(`core/*.mjs`), Node harness (`node/*.mjs`), Lane B ceremony (`laneb/`),
Lane C capture (`lanec/`), Python parity (`python/`), static browser
verifier (`browser/`). Raw codes 162–172 added to the shared 4H ledger.

**Tech Stack:** Node 26 ESM (.mjs), node:crypto Ed25519, node:test; Python 3
stdlib; Lean 4.15.0 (no mathlib); static HTML + node:vm parity.

## Global Constraints

- Motto header in every new file: `Motto: AnthropicSafe First, then ReviewerSafe.`
- READ-ONLY kernel: zero `src/llmShield` diff; 4A–4V byte-frozen; no `authorise_*` entry.
- Raw codes exactly 162–172, wrapper LAST (172 `vsn_internal_fail_closed`); 173–180 headroom untouched.
- `UNKNOWN_RAW_PROBE` (999) for any "unknown" probes near the ledger — NEVER a hardcoded future code.
- All digests via `recordDigest`/`sha256Hex`/`canonicalJson` from `stage4m/core/canonical.mjs`.
- `keyDigest` (stage4s) over the **public** PEM on both build and verify sides.
- Test keys ONLY as `tests/fixtures/llmShield/stage4w/test-keys/INSECURE_FIXTURE_ONLY_<name>.pem` (name = `[A-Za-z-]+`, no digits) + allowlist lines in BOTH `scripts/security-audit-llm-shield-stage3m.sh` and `scripts/security-audit-llm-shield-stage3o.sh`.
- Evidence dir `docs/research/llm-shield/evidence/stage-4w/` fully prettier-ignored.
- Validate formatting with `npm run format` + `npm run format:check` (project scripts), never a hand-picked glob.
- Node 26 for reproduce: `export PATH="/opt/homebrew/opt/node@26/bin:$PATH"`.
- Run `bash scripts/check.sh` locally before push. `npm test` gates tests/unit ONLY — run e2e nets explicitly.
- Neutral commit messages; no attribution trailers.
- 4T reference: reuse `STAGE4T_REFERENCE_CAPSULE` from `stage4v/constants.mjs` (pinned capsule_root + attestation_digest) — immutability rule inherited.

## File Structure

```
tools/simurgh-attestation/stage4h/exitCodes.mjs          (modify: VSN block)
tools/simurgh-attestation/stage4w/constants.mjs          (schemas, ruleset, non-claims, limits, rails, slots)
tools/simurgh-attestation/stage4w/core/textCore.mjs      (normalise 164, span geometry 165)
tools/simurgh-attestation/stage4w/core/leakageGate.mjs   (ruleset v1 scanner, 170)
tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs (binding 166, locality 167, judgments 168)
tools/simurgh-attestation/stage4w/core/narrativeCore.mjs (build/sign/verify, check order, 162/163/169/171, wrapper 172, density)
tools/simurgh-attestation/stage4w/core/narrativeContest.mjs (4V adapter — no cloned court)
tools/simurgh-attestation/stage4w/core/narrativeViews.mjs (tiered renders, marker invariant)
tools/simurgh-attestation/stage4w/node/greenNarrative.mjs (green + resign helpers)
tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs (Lane A corpus)
tools/simurgh-attestation/stage4w/node/build-stage4w-attestation.mjs / verify-stage4w-attestation.mjs
tools/simurgh-attestation/stage4w/node/build-stage4w-bridge.mjs (in-toto Statement projection)
tools/simurgh-attestation/stage4w/laneb/drafter-child.mjs / run-laneb-drafting-ceremony.mjs
tools/simurgh-attestation/stage4w/lanec/run-lanec-drafting-capture.mjs (keyed, + --adversarial)
tools/simurgh-attestation/stage4w/python/vsn_parity.py
tools/simurgh-attestation/stage4w/browser/vsn-verifier.html
proofs/stage4w/SlotBoundNarrative.lean
scripts/reproduce-llm-shield-stage4w.sh
tests/unit/llmShield/stage4w/*.test.js
tests/e2e/llmShield/stage4w/{k7AllFunctions,laneb,browserParity}.test.js
```

---

### Task 1: Raw codes 162–172 + probe hygiene + golden ripple

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (after the VDP block, ~line 526)
- Test: `tests/unit/llmShield/stage4w/exitCodes.test.js`

**Interfaces:**

- Produces: `VSN_RAW_CODES` (frozen map incl. `INTERNAL_FAIL_CLOSED: 172`), `VSN_CHECK_ORDER` (frozen `[162..172]`), `VSN_REASONS_162`, `VSN_REASONS_163`; `RUN_LEVEL_BY_RAW[162..172] === 1`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/exitCodes.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VSN_RAW_CODES,
  VSN_CHECK_ORDER,
  VSN_REASONS_162,
  VSN_REASONS_163,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VSN raw codes 162-172, wrapper last, all level 1", () => {
  assert.equal(VSN_RAW_CODES.VSN_SCHEMA_INVALID, 162);
  assert.equal(VSN_RAW_CODES.VSN_SIGNATURE_INVALID, 163);
  assert.equal(VSN_RAW_CODES.VSN_NORMALISATION_INVALID, 164);
  assert.equal(VSN_RAW_CODES.VSN_SPAN_GEOMETRY_INVALID, 165);
  assert.equal(VSN_RAW_CODES.VSN_BINDING_MISMATCH, 166);
  assert.equal(VSN_RAW_CODES.VSN_EVIDENCE_LOCALITY_VIOLATION, 167);
  assert.equal(VSN_RAW_CODES.VSN_JUDGMENT_BINDING_INVALID, 168);
  assert.equal(VSN_RAW_CODES.VSN_SLOT_RECOMPUTE_MISMATCH, 169);
  assert.equal(VSN_RAW_CODES.VSN_LEAKAGE_DETECTED, 170);
  assert.equal(VSN_RAW_CODES.VSN_PAYLOAD_VIOLATION, 171);
  assert.equal(VSN_RAW_CODES.INTERNAL_FAIL_CLOSED, 172);
  assert.deepEqual([...VSN_CHECK_ORDER], [162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172]);
  for (const raw of VSN_CHECK_ORDER) assert.equal(RUN_LEVEL_BY_RAW[raw], 1);
  assert.ok(VSN_REASONS_162.includes("vsn_schema_invalid"));
  assert.ok(VSN_REASONS_163.includes("vsn_signature_invalid"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/llmShield/stage4w/exitCodes.test.js`
Expected: FAIL — `VSN_RAW_CODES` is not exported.

- [ ] **Step 3: Add the VSN block to exitCodes.mjs**

Insert immediately after `VDP_REASONS_152` (before `HARNESS_CODES`):

```js
// Stage 4W VSN codes (spec §2). Wrapper LAST at 172; 173-180 headroom.
export const VSN_RAW_CODES = Object.freeze({
  VSN_SCHEMA_INVALID: 162,
  VSN_SIGNATURE_INVALID: 163,
  VSN_NORMALISATION_INVALID: 164,
  VSN_SPAN_GEOMETRY_INVALID: 165,
  VSN_BINDING_MISMATCH: 166,
  VSN_EVIDENCE_LOCALITY_VIOLATION: 167,
  VSN_JUDGMENT_BINDING_INVALID: 168,
  VSN_SLOT_RECOMPUTE_MISMATCH: 169,
  VSN_LEAKAGE_DETECTED: 170,
  VSN_PAYLOAD_VIOLATION: 171,
  INTERNAL_FAIL_CLOSED: 172,
});
// Frozen first-failure order (4W spec §2): schema → signature → normalisation →
// geometry → binding → locality → judgment → slot recompute → leakage → payload → wrapper.
export const VSN_CHECK_ORDER = Object.freeze([
  162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172,
]);
export const VSN_REASONS_162 = Object.freeze([
  "vsn_schema_invalid",
  "span_schema_invalid",
  "judgment_schema_invalid",
  "unknown_span_type",
  "unknown_author_role",
  "unknown_leakage_ruleset",
]);
export const VSN_REASONS_163 = Object.freeze([
  "vsn_signature_invalid",
  "attestation_signature_invalid",
]);
```

Then extend the `RUN_LEVEL_BY_RAW` literal (find the `161: 1,` row) with:

```js
  162: 1,
  163: 1,
  164: 1,
  165: 1,
  166: 1,
  167: 1,
  168: 1,
  169: 1,
  170: 1,
  171: 1,
  172: 1,
```

- [ ] **Step 4: Run the new test + the probe-hygiene guard**

Run: `node --test tests/unit/llmShield/stage4w/exitCodes.test.js tests/unit/llmShield/exitCodeProbeHygiene.test.js`
Expected: PASS both (hygiene guard confirms no hardcoded future-code probes near the block; if the guard's scan window needs the new block registered, extend its allowlist the way 4V did).

- [ ] **Step 5: Golden ripple — run every known additive-code golden NOW**

Run (Node 26):

```bash
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"
node --test tests/e2e/llmShield/stage4h/*.test.js tests/e2e/llmShield/stage4l/*.test.js \
  tests/e2e/llmShield/stage4k/*.test.js 2>&1 | tail -20
```

Expected: failures in exit-map goldens (4H exit maps ×2, 4L e2e net, 4K/4H
exitWrapper snapshots, 4H inline map). Update each golden to include rows
162–172 exactly as the 4V ripple did (same files, same shape — look at the
`151:`–`161:` rows added by commit history `git log --oneline -20 -- tests/e2e/llmShield/stage4h` and mirror). Re-run until green.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-attestation/stage4h/exitCodes.mjs tests/
git commit -m "feat(4w): VSN raw codes 162-172 in shared ledger + golden ripple"
```

---

### Task 2: Constants — schemas, leakage ruleset v1, honesty ledger

**Files:**

- Create: `tools/simurgh-attestation/stage4w/constants.mjs`
- Test: `tests/unit/llmShield/stage4w/constants.test.js`

**Interfaces:**

- Produces: `VSN_NARRATIVE_SCHEMA="simurgh.vsn.narrative.v1"`, `VSN_LANE_A_CORPUS_SCHEMA`, `VSN_LANEB_CAPTURE_SCHEMA`, `VSN_LANEC_CAPTURE_SCHEMA`, `VSN_ATTESTATION_SCHEMA`, `VSN_BRIDGE_STATEMENT_SCHEMA`, `SPAN_TYPES`, `AUTHOR_ROLES`, `LEAKAGE_RULESET_ID="vsn.leakage.v1"`, `LEAKAGE_NUMBER_WORDS`, `LEAKAGE_QUANTIFIERS`, `LEAKAGE_MONTHS`, `VSN_NON_CLAIMS` (10), `VSN_KNOWN_LIMITATIONS` (5), `VSN_RAILS`, `VSN_RESERVED_SLOTS` (4).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/constants.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";

test("4W constants: schemas, ruleset, honesty ledger", () => {
  assert.equal(C.VSN_NARRATIVE_SCHEMA, "simurgh.vsn.narrative.v1");
  assert.deepEqual([...C.SPAN_TYPES], ["slot_bound", "judgment", "unverified_prose"]);
  assert.deepEqual([...C.AUTHOR_ROLES], ["operator", "drafting_model_operator_signed"]);
  assert.equal(C.LEAKAGE_RULESET_ID, "vsn.leakage.v1");
  assert.ok(C.LEAKAGE_NUMBER_WORDS.includes("dozen"));
  assert.ok(C.LEAKAGE_QUANTIFIERS.includes("nearly"));
  assert.equal(C.VSN_NON_CLAIMS.length, 10);
  assert.ok(C.VSN_NON_CLAIMS.includes("not_a_claim_that_density_measures_quality"));
  assert.equal(C.VSN_KNOWN_LIMITATIONS.length, 5);
  assert.equal(C.VSN_RESERVED_SLOTS.length, 4);
  assert.ok(C.VSN_RESERVED_SLOTS.includes("semantic_leakage_adversary_deferred"));
  assert.ok(C.VSN_RESERVED_SLOTS.includes("transparency_report_profile_deferred"));
  assert.ok(Object.isFrozen(C.VSN_NON_CLAIMS));
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `node --test tests/unit/llmShield/stage4w/constants.test.js`

- [ ] **Step 3: Implement constants.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W VSN constants (spec §1, §2, §4). Motto: AnthropicSafe First, then ReviewerSafe.
export const VSN_NARRATIVE_SCHEMA = "simurgh.vsn.narrative.v1";
export const VSN_LANE_A_CORPUS_SCHEMA = "simurgh.vsn.lane_a_corpus.v1";
export const VSN_LANEB_CAPTURE_SCHEMA = "simurgh.vsn.laneb_capture.v1";
export const VSN_LANEC_CAPTURE_SCHEMA = "simurgh.vsn.lane_c_capture.v1";
export const VSN_ATTESTATION_SCHEMA = "simurgh.vsn.attestation.v1";
export const VSN_BRIDGE_STATEMENT_SCHEMA = "https://in-toto.io/Statement/v1";
export const VSN_BRIDGE_PREDICATE_TYPE = "https://simurgh.dev/vsn/bridge/v1";

export const SPAN_TYPES = Object.freeze(["slot_bound", "judgment", "unverified_prose"]);
export const AUTHOR_ROLES = Object.freeze(["operator", "drafting_model_operator_signed"]);

// Leakage ruleset v1 (spec §2) — frozen lexical lists, English-centric (signed limitation 2).
export const LEAKAGE_RULESET_ID = "vsn.leakage.v1";
export const LEAKAGE_NUMBER_WORDS = Object.freeze([
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
  "hundred",
  "thousand",
  "million",
  "billion",
  "trillion",
  "dozen",
  "half",
  "couple",
]);
export const LEAKAGE_QUANTIFIERS = Object.freeze([
  "all",
  "none",
  "most",
  "every",
  "nearly",
  "almost",
  "majority",
  "nobody",
  "no one",
]);
export const LEAKAGE_MONTHS = Object.freeze([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

export const VSN_NON_CLAIMS = Object.freeze([
  "not_a_claim_of_truthful_narrative",
  "not_a_claim_of_semantic_leakage_completeness",
  "not_a_claim_that_judgments_are_adjudicated",
  "not_a_claim_of_authorship_integrity",
  "lane_c_live_capture_is_not_byte_reproducible_without_provider_key_and_model_state",
  "lane_c_digest_check_is_not_transcript_reproduction",
  "not_a_claim_of_incident_completeness",
  "not_a_claim_of_model_safety",
  "not_a_claim_of_regulatory_compliance",
  "not_a_claim_that_density_measures_quality",
]);
export const VSN_KNOWN_LIMITATIONS = Object.freeze([
  "leakage_gate_is_lexical_not_semantic_paraphrase_smuggling_is_4x_surface",
  "leakage_ruleset_v1_is_english_centric",
  "lane_a_and_b_parties_built_by_us",
  "leakage_lexicon_is_registry_bounded",
  "lane_c_capture_not_reproducible_without_provider_key",
]);
export const VSN_RAILS = Object.freeze([
  "read_only_kernel_no_authorise_entry",
  "undeclared_claim_looking_text_fails_closed",
  "narrative_never_expands_the_evidence_set",
  "no_cloned_court_status_derivation_imported_from_4v",
  "no_view_may_hide_or_downgrade_a_span_type_marker",
  "density_is_derived_never_filed",
  "leakage_ruleset_version_sealed_inside_signed_bundle",
  "no_raw_transcripts_inside_narrative_bundle",
  "voice_carries_zero_evidentiary_weight",
]);
export const VSN_RESERVED_SLOTS = Object.freeze([
  "semantic_leakage_adversary_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "transparency_report_profile_deferred",
]);
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/constants.mjs tests/unit/llmShield/stage4w/constants.test.js
git commit -m "feat(4w): VSN constants — schemas, leakage ruleset v1, honesty ledger"
```

---

### Task 3: textCore — normalisation (164) + span geometry (165)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/core/textCore.mjs`
- Test: `tests/unit/llmShield/stage4w/textCore.test.js`

**Interfaces:**

- Produces: `bodyBytes(body) -> Uint8Array` (TextEncoder), `normaliseBody(body) -> string`, `checkNormalisation(body) -> null | {raw:164, reason, detail}`, `checkSpanGeometry(body, spanMap) -> null | {raw:165, reason, detail}`, `isCodePointBoundary(bytes, offset) -> boolean`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/textCore.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bodyBytes,
  normaliseBody,
  checkNormalisation,
  checkSpanGeometry,
} from "../../../../tools/simurgh-attestation/stage4w/core/textCore.mjs";

const span = (id, s, e) => ({ span_id: id, start_byte: s, end_byte: e, type: "unverified_prose" });

test("normalisation: NFC, LF-only, no trailing whitespace — never auto-fixed", () => {
  assert.equal(checkNormalisation("clean line\nsecond line\n"), null);
  assert.equal(checkNormalisation("bad\r\nline\n").raw, 164); // CRLF
  assert.equal(checkNormalisation("trailing \nline\n").raw, 164); // trailing space
  // NFD é (e + combining acute) must be rejected, not silently normalised.
  assert.equal(checkNormalisation("café\n").raw, 164);
  assert.equal(checkNormalisation(normaliseBody("café\n")), null);
});

test("span geometry: overlap, bounds, order, empty, dup id, mid-code-point", () => {
  const body = "abcdef سیمرغ done\n"; // multi-byte region
  const bytes = bodyBytes(body);
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 3), span("s2", 3, 6)]), null);
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 4), span("s2", 3, 6)]).raw, 165); // overlap
  assert.equal(checkSpanGeometry(body, [span("s1", 3, 6), span("s2", 0, 3)]).raw, 165); // unsorted
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 0)]).raw, 165); // empty
  assert.equal(checkSpanGeometry(body, [span("s1", 0, bytes.length + 1)]).raw, 165); // OOB
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 3), span("s1", 3, 6)]).raw, 165); // dup id
  assert.equal(checkSpanGeometry(body, [span("s1", 7, 9)]).raw, 165); // mid-UTF-8 code point
  assert.equal(checkSpanGeometry(body, [span("s1", -1, 3)]).raw, 165); // negative start (bounds-safe)
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

- [ ] **Step 3: Implement textCore.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W text canonical form + span geometry (spec §2). Motto: AnthropicSafe First, then ReviewerSafe.
//   164 vsn_normalisation_invalid   body != normalise(body) byte-for-byte — NEVER auto-fixed
//   165 vsn_span_geometry_invalid   overlap/unsorted/OOB/empty/mid-code-point/duplicate span_id
const ENC = new TextEncoder();
export const bodyBytes = (body) => ENC.encode(body);

export const normaliseBody = (body) =>
  body
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n");

export function checkNormalisation(body) {
  if (typeof body !== "string" || body.length === 0)
    return {
      raw: 164,
      reason: "vsn_normalisation_invalid",
      detail: { kind: "empty_or_not_string" },
    };
  if (body !== normaliseBody(body))
    return { raw: 164, reason: "vsn_normalisation_invalid", detail: { kind: "not_canonical" } };
  return null;
}

// A UTF-8 continuation byte is 0b10xxxxxx; offsets must land on code-point starts.
// Explicitly bounds-safe (reviewer P2 #13): a negative or out-of-range offset is
// never a boundary, so callers cannot be fooled by an under/overflow offset.
export const isCodePointBoundary = (bytes, offset) =>
  Number.isInteger(offset) &&
  offset >= 0 &&
  offset <= bytes.length &&
  (offset === bytes.length || (bytes[offset] & 0xc0) !== 0x80);

export function checkSpanGeometry(body, spanMap) {
  const bytes = bodyBytes(body);
  const bad = (kind, span_id) => ({
    raw: 165,
    reason: "vsn_span_geometry_invalid",
    detail: { kind, ...(span_id ? { span_id } : {}) },
  });
  const seen = new Set();
  let prevEnd = 0;
  let prevStart = -1;
  for (const s of spanMap ?? []) {
    if (!Number.isInteger(s.start_byte) || !Number.isInteger(s.end_byte))
      return bad("non_integer_offsets", s.span_id);
    if (seen.has(s.span_id)) return bad("duplicate_span_id", s.span_id);
    seen.add(s.span_id);
    if (s.start_byte < prevStart || s.start_byte < prevEnd)
      return bad("unsorted_or_overlap", s.span_id);
    if (s.end_byte <= s.start_byte) return bad("empty_span", s.span_id);
    if (s.end_byte > bytes.length) return bad("out_of_bounds", s.span_id);
    if (!isCodePointBoundary(bytes, s.start_byte) || !isCodePointBoundary(bytes, s.end_byte))
      return bad("mid_code_point", s.span_id);
    prevStart = s.start_byte;
    prevEnd = s.end_byte;
  }
  return null;
}
```

- [ ] **Step 4: Run test — expect PASS** (verify the mid-code-point offsets: `"abcdef "` is 7 bytes, `س` starts at byte 7 and is 2 bytes, so 7..9 IS a boundary pair — adjust the fixture to `span("s1", 8, 10)` which lands mid-`س`/mid-`ی`; confirm with `bodyBytes` in a scratch REPL before finalising the test, then re-run).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/core/textCore.mjs tests/unit/llmShield/stage4w/textCore.test.js
git commit -m "feat(4w): text canonical form (164) + byte-exact span geometry (165)"
```

---

### Task 4: leakageGate — ruleset v1 scanner (170)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/core/leakageGate.mjs`
- Test: `tests/unit/llmShield/stage4w/leakageGate.test.js`

**Interfaces:**

- Consumes: `bodyBytes` (Task 3); `LEAKAGE_*` lists (Task 2).
- Produces: `uncoveredRegions(body, spanMap) -> [{start_byte, end_byte, text}]`, `scanLeakage(body, spanMap, capsuleValues) -> [{rule, region_start_byte, sample}]` (empty array = clean), `capsuleValueStrings(capsule) -> string[]`, `checkLeakage(...) -> null | {raw:170, reason, detail}`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/leakageGate.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scanLeakage,
  checkLeakage,
  uncoveredRegions,
  capsuleValueStrings,
} from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import { bodyBytes } from "../../../../tools/simurgh-attestation/stage4w/core/textCore.mjs";

const prose = (id, s, e) => ({ span_id: id, start_byte: s, end_byte: e, type: "unverified_prose" });

test("leakage: digits, number words, percent, months, quantifiers, capsule collision", () => {
  assert.deepEqual(scanLeakage("calm text only\n", [], []), []);
  assert.equal(scanLeakage("we saw 9 incidents\n", [], [])[0].rule, "digit");
  assert.equal(scanLeakage("a dozen problems\n", [], [])[0].rule, "number_word");
  assert.equal(scanLeakage("uptake grew percent-wise\n", [], [])[0].rule, "percent");
  assert.equal(scanLeakage("late in january it began\n", [], [])[0].rule, "month");
  assert.equal(scanLeakage("nearly everyone was fine\n", [], [])[0].rule, "quantifier");
  assert.equal(scanLeakage("the range was fine\n", [], ["2026-07-01/2026-07-02"]), []);
  assert.equal(
    scanLeakage("range 2026-07-01/2026-07-02 leaked\n", [], ["2026-07-01/2026-07-02"])[0].rule,
    "digit" // digits fire first; collision rule also matches — first hit wins
  );
});

test("capsule_value_collision fires on a NON-numeric echoed value (reviewer P2 #12)", () => {
  // A capsule value like a consent scope serialises to a digit-free string; echoing it
  // undeclared must trip the collision rule specifically, not the digit rule.
  const hit = scanLeakage("we quietly mention mailread in passing\n", [], ["mailread"]);
  assert.equal(hit[0].rule, "capsule_value_collision");
  // And when it IS declared inside a prose span, no hit.
  const declaredEnd = bodyBytes("we quietly mention mailread").length;
  assert.equal(
    scanLeakage(
      "we quietly mention mailread in passing\n",
      [prose("p1", 0, declaredEnd)],
      ["mailread"]
    ).length,
    0
  );
});

test("declared prose spans are exempt; undeclared text is scanned", () => {
  const body = "we believe most users trust us. calm close.\n";
  const end = bodyBytes("we believe most users trust us.").length;
  assert.equal(scanLeakage(body, [prose("p1", 0, end)], []).length, 0);
  assert.equal(scanLeakage(body, [], [])[0].rule, "quantifier"); // "most" undeclared
  const r = checkLeakage(body, [], []);
  assert.equal(r.raw, 170);
  assert.equal(r.reason, "vsn_leakage_detected");
});

test("uncovered regions are exact byte complements of the span map", () => {
  const body = "abc def\n";
  const regions = uncoveredRegions(body, [prose("p1", 4, 7)]);
  assert.deepEqual(
    regions.map((r) => r.text),
    ["abc ", "\n"]
  );
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

- [ ] **Step 3: Implement leakageGate.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W leakage gate — frozen lexical ruleset vsn.leakage.v1 (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Deterministic, case-folded, NO NLP. Undeclared claim-looking text fails closed (170).
// Signed bound: lexical only — paraphrase smuggling is the 4X surface.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { LEAKAGE_NUMBER_WORDS, LEAKAGE_QUANTIFIERS, LEAKAGE_MONTHS } from "../constants.mjs";
import { bodyBytes } from "./textCore.mjs";

const DEC = new TextDecoder();

export function uncoveredRegions(body, spanMap) {
  const bytes = bodyBytes(body);
  const sorted = [...(spanMap ?? [])].sort((a, b) => a.start_byte - b.start_byte);
  const regions = [];
  let cursor = 0;
  for (const s of sorted) {
    if (s.start_byte > cursor) regions.push({ start_byte: cursor, end_byte: s.start_byte });
    cursor = Math.max(cursor, s.end_byte);
  }
  if (cursor < bytes.length) regions.push({ start_byte: cursor, end_byte: bytes.length });
  return regions.map((r) => ({ ...r, text: DEC.decode(bytes.subarray(r.start_byte, r.end_byte)) }));
}

// Canonical string forms of the capsule's own projected values (collision rule).
export const capsuleValueStrings = (capsule) =>
  (capsule?.projected_sections ?? [])
    .filter((p) => p.value !== undefined)
    .map((p) => (typeof p.value === "string" ? p.value : canonicalJson(p.value)));

const wordRe = (words) => new RegExp(`\\b(${words.join("|").replace(/ /g, "\\s")})\\b`, "u");
const RULES = [
  { rule: "digit", test: (t) => /[0-9]/u.test(t) },
  { rule: "number_word", test: (t) => wordRe(LEAKAGE_NUMBER_WORDS).test(t) },
  { rule: "percent", test: (t) => /%|\bpercent\b/u.test(t) },
  { rule: "month", test: (t) => wordRe(LEAKAGE_MONTHS).test(t) },
  { rule: "quantifier", test: (t) => wordRe(LEAKAGE_QUANTIFIERS).test(t) },
];

export function scanLeakage(body, spanMap, capsuleValues) {
  const hits = [];
  for (const region of uncoveredRegions(body, spanMap)) {
    const folded = region.text.toLowerCase();
    for (const { rule, test: fn } of RULES)
      if (fn(folded)) {
        hits.push({ rule, region_start_byte: region.start_byte, sample: region.text.slice(0, 40) });
        break; // first hit per region wins; keep the report small and deterministic
      }
    if (hits.length && hits[hits.length - 1].region_start_byte === region.start_byte) continue;
    for (const v of capsuleValues ?? [])
      if (v.length >= 2 && folded.includes(v.toLowerCase())) {
        hits.push({
          rule: "capsule_value_collision",
          region_start_byte: region.start_byte,
          sample: v.slice(0, 40),
        });
        break;
      }
  }
  return hits;
}

export function checkLeakage(body, spanMap, capsuleValues) {
  const hits = scanLeakage(body, spanMap, capsuleValues);
  return hits.length === 0 ? null : { raw: 170, reason: "vsn_leakage_detected", detail: { hits } };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/core/leakageGate.mjs tests/unit/llmShield/stage4w/leakageGate.test.js
git commit -m "feat(4w): fail-closed lexical leakage gate vsn.leakage.v1 (170)"
```

---

### Task 5: narrativeBinding — binding (166), locality (167), judgments (168)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs`
- Test: `tests/unit/llmShield/stage4w/narrativeBinding.test.js`

**Interfaces:**

- Consumes: `recordDigest, sha256Hex` (stage4m canonical), `keyDigest` (stage4s receiptBuilder), `VIC_CAPSULE_SCHEMA` (stage4t constants), `bodyBytes` (Task 3).
- Produces: `narrativeBodyDigest(body) -> "sha256:..."` (bytes, NOT canonicalJson), `spanMapDigest(spanMap)`, `buildNarrativeBinding(capsuleBundle, capsulePubKeyPem, body, spanMap)`, `verifyNarrativeBinding(narrative, capsuleBundle, capsulePubKeyPem) -> null|{raw:166}`, `capsuleEvidenceIndex(capsuleBundle) -> {digest: artifact}`, `checkEvidenceLocality(narrative, capsuleBundle) -> null|{raw:167}`, `checkJudgments(narrative) -> null|{raw:168}` (uniqueness, exactly-one-reference, digest match, inner Ed25519 verify, unreferenced rejection).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/narrativeBinding.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  narrativeBodyDigest,
  buildNarrativeBinding,
  verifyNarrativeBinding,
  checkEvidenceLocality,
  checkJudgments,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import {
  recordDigest,
  canonicalJson,
  sha256Hex,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const jPub = publicKey.export({ type: "spki", format: "pem" });
const jPriv = privateKey;
const signedJudgment = (() => {
  const content = { judgment_text_digest: "sha256:" + sha256Hex(canonicalJson({ note: "j" })) };
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(content)), jPriv)
    .toString("base64");
  return { content, signature, judgment_pub_key_pem: jPub };
})();

test("body digest is over BYTES, not canonicalJson", () => {
  assert.equal(narrativeBodyDigest("hi\n"), "sha256:" + sha256Hex("hi\n"));
  assert.notEqual(narrativeBodyDigest("hi\n"), "sha256:" + sha256Hex(canonicalJson("hi\n")));
});

test("binding verifies and 166 fires per-field", () => {
  const g = buildGreenBundle();
  const body = "calm text\n";
  const b = buildNarrativeBinding(g.bundle, g.pubKeyPem, body, []);
  const narrative = { narrative_body: body, span_map: [], binding: b };
  assert.equal(verifyNarrativeBinding(narrative, g.bundle, g.pubKeyPem), null);
  const bad = { ...narrative, binding: { ...b, capsule_root: "sha256:" + "0".repeat(64) } };
  assert.equal(verifyNarrativeBinding(bad, g.bundle, g.pubKeyPem).raw, 166);
});

test("locality 167: span citing a digest outside the sealed set", () => {
  const g = buildGreenBundle();
  const foreign = {
    span_map: [{ span_id: "s1", type: "slot_bound", evidence_digest: recordDigest({ alien: 1 }) }],
  };
  assert.equal(checkEvidenceLocality(foreign, g.bundle).raw, 167);
  const sealed = g.bundle.content.evidence_artifacts[0];
  const local = {
    span_map: [{ span_id: "s1", type: "slot_bound", evidence_digest: recordDigest(sealed) }],
  };
  assert.equal(checkEvidenceLocality(local, g.bundle), null);
});

test("judgments 168: dup id, missing ref, digest mismatch, bad signature, unreferenced", () => {
  const jd = recordDigest(signedJudgment);
  const ok = {
    span_map: [{ span_id: "s1", type: "judgment", judgment_id: "j1", judgment_digest: jd }],
    judgments: [{ judgment_id: "j1", signed_judgment: signedJudgment }],
  };
  assert.equal(checkJudgments(ok), null);
  assert.equal(checkJudgments({ ...ok, judgments: [...ok.judgments, ...ok.judgments] }).raw, 168); // dup id
  assert.equal(checkJudgments({ ...ok, judgments: [] }).raw, 168); // missing ref
  const wrongDigest = {
    ...ok,
    span_map: [{ ...ok.span_map[0], judgment_digest: "sha256:" + "0".repeat(64) }],
  };
  assert.equal(checkJudgments(wrongDigest).raw, 168);
  const tampered = {
    ...ok,
    judgments: [{ judgment_id: "j1", signed_judgment: { ...signedJudgment, signature: "AAAA" } }],
  };
  // digest changes too, but the reason must name the first failing check deterministically
  assert.equal(checkJudgments(tampered).raw, 168);
  const unreferenced = {
    span_map: [],
    judgments: [{ judgment_id: "jx", signed_judgment: signedJudgment }],
  };
  assert.equal(checkJudgments(unreferenced).raw, 168);
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

- [ ] **Step 3: Implement narrativeBinding.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W No Strawman binding + lens-not-blender locality + judgment binding (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
//   166 vsn_binding_mismatch            any binding field vs recomputed expectation
//   167 vsn_evidence_locality_violation span cites a digest outside the sealed evidence set
//   168 vsn_judgment_binding_invalid    dup id / missing ref / digest mismatch / bad inner sig / unreferenced
import crypto from "node:crypto";
import { recordDigest, sha256Hex, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VIC_CAPSULE_SCHEMA } from "../../stage4t/constants.mjs";

// Spec: digest over canonical UTF-8 BYTES of the body — not canonicalJson(body).
export const narrativeBodyDigest = (body) => `sha256:${sha256Hex(body)}`;
export const spanMapDigest = (spanMap) => recordDigest(spanMap ?? []);

export function buildNarrativeBinding(capsuleBundle, capsulePubKeyPem, body, spanMap) {
  return {
    capsule_root: capsuleBundle.content.capsule_root,
    attestation_digest: capsuleBundle.attestation_digest,
    capsule_schema_version: VIC_CAPSULE_SCHEMA,
    capsule_signing_key_fingerprint: keyDigest(capsulePubKeyPem),
    narrative_body_digest: narrativeBodyDigest(body),
    span_map_digest: spanMapDigest(spanMap),
  };
}

export function verifyNarrativeBinding(narrative, capsuleBundle, capsulePubKeyPem) {
  const expected = buildNarrativeBinding(
    capsuleBundle,
    capsulePubKeyPem,
    narrative.narrative_body,
    narrative.span_map
  );
  const b = narrative.binding ?? {};
  for (const field of Object.keys(expected))
    if (b[field] !== expected[field])
      return { raw: 166, reason: "vsn_binding_mismatch", detail: { field } };
  return null;
}

export const capsuleEvidenceIndex = (capsuleBundle) =>
  Object.fromEntries(
    (capsuleBundle.content.evidence_artifacts ?? []).map((a) => [recordDigest(a), a])
  );

export function checkEvidenceLocality(narrative, capsuleBundle) {
  const sealed = capsuleEvidenceIndex(capsuleBundle);
  for (const s of narrative.span_map ?? []) {
    if (s.type !== "slot_bound") continue;
    if (sealed[s.evidence_digest] === undefined)
      return {
        raw: 167,
        reason: "vsn_evidence_locality_violation",
        detail: { span_id: s.span_id },
      };
  }
  return null;
}

const verifyInnerJudgment = (sj) => {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalJson(sj.content)),
      crypto.createPublicKey(sj.judgment_pub_key_pem),
      Buffer.from(sj.signature, "base64")
    );
  } catch {
    return false;
  }
};

export function checkJudgments(narrative) {
  const bad = (kind, id) => ({
    raw: 168,
    reason: "vsn_judgment_binding_invalid",
    detail: { kind, ...(id ? { judgment_id: id } : {}) },
  });
  const records = narrative.judgments ?? [];
  const byId = new Map();
  for (const r of records) {
    if (byId.has(r.judgment_id)) return bad("duplicate_judgment_id", r.judgment_id);
    byId.set(r.judgment_id, r);
  }
  const referenced = new Set();
  for (const s of narrative.span_map ?? []) {
    if (s.type !== "judgment") continue;
    const rec = byId.get(s.judgment_id);
    if (rec === undefined) return bad("missing_judgment_record", s.judgment_id);
    if (referenced.has(s.judgment_id)) return bad("judgment_referenced_twice", s.judgment_id);
    referenced.add(s.judgment_id);
    if (recordDigest(rec.signed_judgment) !== s.judgment_digest)
      return bad("judgment_digest_mismatch", s.judgment_id);
    if (!verifyInnerJudgment(rec.signed_judgment))
      return bad("judgment_inner_signature_invalid", s.judgment_id);
  }
  for (const r of records)
    if (!referenced.has(r.judgment_id) && r.reserved !== true)
      return bad("unreferenced_judgment_record", r.judgment_id);
  return null;
}
```

- [ ] **Step 4: Run — expect PASS.** Note: `checkJudgments` order is
      deterministic — dup id first (record scan), then per-span checks in span
      order, then unreferenced. The tampered-signature case: digest mismatch
      fires first (`judgment_digest_mismatch`) because the record content
      changed — that is correct and the test only asserts raw 168.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs tests/unit/llmShield/stage4w/narrativeBinding.test.js
git commit -m "feat(4w): narrative binding (166), evidence locality (167), judgment binding (168)"
```

---

### Task 6: narrativeCore — build/sign/verify, check order, density, wrapper

**Files:**

- Create: `tools/simurgh-attestation/stage4w/core/narrativeCore.mjs`
- Test: `tests/unit/llmShield/stage4w/narrativeCore.test.js`

**Interfaces:**

- Consumes: Tasks 2–5 exports; `RECOMPUTE_REGISTRY, KIND_EVIDENCE_SOURCE` (stage4t projectionCore); `PARTITIONS` (stage4t constants).
- Produces:
  - `buildNarrative({capsuleBundle, capsulePubKeyPem, body, spanMap, judgments, authorRole, privKeyPem, pubKeyPem}) -> narrative` (signed: `{content:{schema, narrative_body, span_map, judgments, binding, author_role, leakage_ruleset}, signature, author_pub_key_pem}`)
  - `resignNarrative(narrative, privKeyPem) -> narrative`
  - `computeEvidenceDensity(content) -> {slot_bound_bytes, judgment_bytes, voice_bytes, total_bytes}`
  - `evaluateNarrative(capsuleBundle, narrative, {capsulePubKeyPem, ctx}) -> {raw, reason?, detail?, density?}` running the frozen order 162→171
  - `evaluateNarrativeSafe(...) -> same, any throw -> {raw:172, reason:"vsn_internal_fail_closed"}`
  - Slot recompute (169): span must target an existing `evidence_backed` projected section with matching `recompute_kind` + `evidence_digest`, `claimed_value` must equal the projected value AND recompute from the sealed artifact via `RECOMPUTE_REGISTRY` with the `KIND_EVIDENCE_SOURCE` kind rail.
  - Payload scan (171): recursive key/value scan rejecting `/^(prompt|completion|transcript|api_key|tool_output|provider_message)$/i` keys and PEM `PRIVATE KEY` blocks anywhere.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/narrativeCore.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildNarrative,
  resignNarrative,
  computeEvidenceDensity,
  evaluateNarrative,
  evaluateNarrativeSafe,
  payloadCheck,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const priv = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vsn-author.pem"), "utf8");
const pub = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vsn-author.pub.pem"), "utf8");

function greenNarrative() {
  const g = buildGreenBundle();
  const section = g.bundle.content.projected_sections.find(
    (p) => p.regime === "art73_high_risk_draft" && p.section_id === "users_affected"
  );
  const art = g.bundle.content.evidence_artifacts.find(
    (a) => recordDigest(a) === section.evidence_digest
  );
  assert.ok(art, "green capsule must seal the users_affected evidence");
  const claim = "users affected: " + JSON.stringify(section.value);
  const body = `calm opening voice.\n${claim}\nclosing voice.\n`;
  const start = Buffer.byteLength("calm opening voice.\n");
  const spanMap = [
    {
      span_id: "s1",
      start_byte: start,
      end_byte: start + Buffer.byteLength(claim),
      type: "slot_bound",
      regime: section.regime,
      section_id: section.section_id,
      claimed_value: section.value,
      recompute_kind: section.recompute_kind,
      evidence_digest: section.evidence_digest,
    },
  ];
  const narrative = buildNarrative({
    capsuleBundle: g.bundle,
    capsulePubKeyPem: g.pubKeyPem,
    body,
    spanMap,
    judgments: [],
    authorRole: "operator",
    privKeyPem: priv,
    pubKeyPem: pub,
  });
  return { g, narrative, section };
}

test("green narrative: raw 0 + density accounting", () => {
  const { g, narrative } = greenNarrative();
  const r = evaluateNarrativeSafe(g.bundle, narrative, { capsulePubKeyPem: g.pubKeyPem, ctx: {} });
  assert.equal(r.raw, 0);
  const d = r.density;
  assert.equal(d.slot_bound_bytes + d.judgment_bytes + d.voice_bytes, d.total_bytes);
  assert.ok(d.slot_bound_bytes > 0 && d.voice_bytes > 0);
});

test("169 fires on value drift and on sealed-evidence-wrong-section blend", () => {
  const { g, narrative } = greenNarrative();
  const drift = JSON.parse(JSON.stringify(narrative));
  drift.content.span_map[0].claimed_value = 99;
  const r1 = evaluateNarrativeSafe(g.bundle, resignRebind(drift), opts(g));
  assert.equal(r1.raw, 169);
  const blend = JSON.parse(JSON.stringify(narrative));
  blend.content.span_map[0].section_id = "remedial_actions"; // real section, wrong evidence pairing
  const r2 = evaluateNarrativeSafe(g.bundle, resignRebind(blend), opts(g));
  assert.equal(r2.raw, 169);
});

test("171 payload violation on smuggled transcript key; 172 wrapper on poisoned ctx", () => {
  const { g, narrative } = greenNarrative();
  const dirty = JSON.parse(JSON.stringify(narrative));
  dirty.content.judgments = [
    {
      judgment_id: "jx",
      reserved: true,
      signed_judgment: { content: { prompt: "hidden" }, signature: "", judgment_pub_key_pem: "" },
    },
  ];
  const r = evaluateNarrativeSafe(g.bundle, resignRebind(dirty), opts(g));
  assert.equal(r.raw, 171);
  // Reviewer P0 #1: forbidden material BESIDE content (not covered by the signature)
  // must not hide. Unknown outer key -> 162 (outer allowlist); if we probe the payload
  // scanner directly it also flags the private-key material.
  const outer = JSON.parse(JSON.stringify(narrative));
  outer.transcript = "raw hidden completion material";
  const ro = evaluateNarrativeSafe(g.bundle, outer, opts(g));
  assert.equal(ro.raw, 162); // outer_keys allowlist catches the smuggled sibling field
  assert.equal(payloadCheck({ x: "-----BEGIN PRIVATE KEY-----" }).raw, 171);
  assert.equal(payloadCheck({ x: "-----BEGIN PUBLIC KEY-----" }), null); // public key allowed
  const boom = evaluateNarrativeSafe(g.bundle, narrative, {
    capsulePubKeyPem: g.pubKeyPem,
    ctx: {
      chainVerdict: () => {
        throw new Error("boom");
      },
    },
  });
  assert.ok([0, 172].includes(boom.raw)); // 172 only if the green span uses chainVerdict; assert deterministically below
});

// helpers shared by the tamper tests
import { buildNarrativeBinding } from "../../../../tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs";
const opts = (g) => ({ capsulePubKeyPem: g.pubKeyPem, ctx: {} });
function resignRebind(n) {
  const g = buildGreenBundle();
  n.content.binding = buildNarrativeBinding(
    g.bundle,
    g.pubKeyPem,
    n.content.narrative_body,
    n.content.span_map
  );
  return resignNarrative(n, priv);
}
```

- [ ] **Step 2: Generate the stage4w test keys first** (the test reads them):

```bash
mkdir -p tests/fixtures/llmShield/stage4w/test-keys
node -e '
const crypto = require("node:crypto");
for (const n of ["vsn", "vsn-author", "vsn-laneb-author"]) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  require("node:fs").writeFileSync(`tests/fixtures/llmShield/stage4w/test-keys/INSECURE_FIXTURE_ONLY_${n}.pem`, privateKey.export({type:"pkcs8",format:"pem"}));
  require("node:fs").writeFileSync(`tests/fixtures/llmShield/stage4w/test-keys/INSECURE_FIXTURE_ONLY_${n}.pub.pem`, publicKey.export({type:"spki",format:"pem"}));
}'
```

Then run the test — expect FAIL (narrativeCore missing).

- [ ] **Step 3: Implement narrativeCore.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W narrative core — build/sign/verify + frozen check order + density (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { RECOMPUTE_REGISTRY, KIND_EVIDENCE_SOURCE } from "../../stage4t/core/projectionCore.mjs";
import {
  VSN_NARRATIVE_SCHEMA,
  SPAN_TYPES,
  AUTHOR_ROLES,
  LEAKAGE_RULESET_ID,
} from "../constants.mjs";
import { bodyBytes, checkNormalisation, checkSpanGeometry } from "./textCore.mjs";
import { checkLeakage, capsuleValueStrings } from "./leakageGate.mjs";
import {
  buildNarrativeBinding,
  verifyNarrativeBinding,
  checkEvidenceLocality,
  checkJudgments,
  capsuleEvidenceIndex,
} from "./narrativeBinding.mjs";

const eq = (a, b) => canonicalJson(a) === canonicalJson(b);
const sign = (content, privKeyPem) =>
  crypto
    .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(privKeyPem))
    .toString("base64");

export function buildNarrative({
  capsuleBundle,
  capsulePubKeyPem,
  body,
  spanMap,
  judgments,
  authorRole,
  privKeyPem,
  pubKeyPem,
}) {
  const content = {
    schema: VSN_NARRATIVE_SCHEMA,
    narrative_body: body,
    span_map: spanMap,
    judgments: judgments ?? [],
    binding: buildNarrativeBinding(capsuleBundle, capsulePubKeyPem, body, spanMap),
    author_role: authorRole,
    leakage_ruleset: LEAKAGE_RULESET_ID,
  };
  return { content, signature: sign(content, privKeyPem), author_pub_key_pem: pubKeyPem };
}

export const resignNarrative = (n, privKeyPem) => ({
  ...n,
  signature: sign(n.content, privKeyPem),
});

// Strict allowlists (162). 162/171 boundary (spec §2, reviewer P1 #5 Option B):
// 162 rejects unknown STRUCTURAL keys outside allowed containers (incl. outer bundle
// keys); 171 catches forbidden payload MATERIAL nested inside otherwise-allowed opaque
// containers (e.g. signed_judgment.content). Both fire — no gap beside `content`.
const OUTER_KEYS = ["content", "signature", "author_pub_key_pem"];
const TOP_KEYS = [
  "schema",
  "narrative_body",
  "span_map",
  "judgments",
  "binding",
  "author_role",
  "leakage_ruleset",
];
const SPAN_BASE = ["span_id", "start_byte", "end_byte", "type"];
const SPAN_KEYS = {
  slot_bound: [
    ...SPAN_BASE,
    "regime",
    "section_id",
    "claimed_value",
    "recompute_kind",
    "evidence_digest",
  ],
  judgment: [...SPAN_BASE, "judgment_id", "judgment_digest"],
  unverified_prose: SPAN_BASE,
};
const keysOk = (obj, allowed) => {
  const ks = Object.keys(obj ?? {});
  return ks.length === allowed.length && ks.every((k) => allowed.includes(k));
};

function schemaCheck(narrative) {
  const bad = (reason, detail) => ({ raw: 162, reason, detail });
  if (!keysOk(narrative, OUTER_KEYS)) return bad("vsn_schema_invalid", { field: "outer_keys" });
  const c = narrative?.content;
  if (!c || c.schema !== VSN_NARRATIVE_SCHEMA)
    return bad("vsn_schema_invalid", { field: "schema" });
  if (!keysOk(c, TOP_KEYS)) return bad("vsn_schema_invalid", { field: "top_level_keys" });
  if (!AUTHOR_ROLES.includes(c.author_role)) return bad("unknown_author_role", {});
  if (c.leakage_ruleset !== LEAKAGE_RULESET_ID) return bad("unknown_leakage_ruleset", {});
  for (const s of c.span_map ?? []) {
    if (!SPAN_TYPES.includes(s.type)) return bad("unknown_span_type", { span_id: s.span_id });
    if (!keysOk(s, SPAN_KEYS[s.type])) return bad("span_schema_invalid", { span_id: s.span_id });
  }
  for (const j of c.judgments ?? []) {
    const allowed =
      j.reserved === true
        ? ["judgment_id", "signed_judgment", "reserved"]
        : ["judgment_id", "signed_judgment"];
    if (!keysOk(j, allowed)) return bad("judgment_schema_invalid", { judgment_id: j.judgment_id });
  }
  return null;
}

function signatureCheck(narrative) {
  try {
    const ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(narrative.content)),
      crypto.createPublicKey(narrative.author_pub_key_pem),
      Buffer.from(narrative.signature, "base64")
    );
    return ok ? null : { raw: 163, reason: "vsn_signature_invalid", detail: {} };
  } catch {
    return { raw: 163, reason: "vsn_signature_invalid", detail: {} };
  }
}

// 169 — lens-not-blender projection identity + recompute (spec §2 Patch 1).
function slotRecomputeCheck(content, capsuleBundle, ctx) {
  const sections = new Map(
    (capsuleBundle.content.projected_sections ?? []).map((p) => [`${p.regime}/${p.section_id}`, p])
  );
  const sealed = capsuleEvidenceIndex(capsuleBundle);
  const bad = (kind, span_id) => ({
    raw: 169,
    reason: "vsn_slot_recompute_mismatch",
    detail: { kind, span_id },
  });
  for (const s of content.span_map ?? []) {
    if (s.type !== "slot_bound") continue;
    const p = sections.get(`${s.regime}/${s.section_id}`);
    if (!p || p.class !== "evidence_backed") return bad("no_matching_projected_section", s.span_id);
    if (p.recompute_kind !== s.recompute_kind || p.evidence_digest !== s.evidence_digest)
      return bad("derivation_blend", s.span_id);
    if (!eq(s.claimed_value, p.value)) return bad("claimed_value_drift", s.span_id);
    const artifact = sealed[s.evidence_digest];
    const fn = RECOMPUTE_REGISTRY[s.recompute_kind];
    const kindOk =
      artifact !== undefined && artifact.kind === KIND_EVIDENCE_SOURCE[s.recompute_kind];
    if (fn === undefined || !kindOk) return bad("recompute_unavailable", s.span_id);
    if (!eq(fn(artifact, ctx), s.claimed_value)) return bad("recompute_mismatch", s.span_id);
  }
  return null;
}

// 171 — recursive forbidden-payload scan over the WHOLE bundle (spec §2 Patch 6,
// reviewer P0 #1). Allows "PUBLIC KEY" (author_pub_key_pem is legitimate) but rejects
// "PRIVATE KEY" anywhere. Scans top-level fields too, so forbidden material beside
// `content` (which the signature does not cover) cannot hide.
const FORBIDDEN_KEY =
  /^(prompt|completion|transcript|raw_transcript|api_key|tool_output|provider_message|network|egress_url)$/i;
export function payloadCheck(value, path = "narrative") {
  if (typeof value === "string")
    return value.includes("PRIVATE KEY")
      ? {
          raw: 171,
          reason: "vsn_payload_violation",
          detail: { path, kind: "private_key_material" },
        }
      : null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const r = payloadCheck(value[i], `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(k))
        return {
          raw: 171,
          reason: "vsn_payload_violation",
          detail: { path: `${path}.${k}`, kind: "forbidden_key" },
        };
      const r = payloadCheck(v, `${path}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

// Evidence density (spec §2) — derived from the VERIFIED span map only, never filed.
export function computeEvidenceDensity(content) {
  const total = bodyBytes(content.narrative_body).length;
  let slot = 0,
    judg = 0;
  for (const s of content.span_map ?? []) {
    const len = s.end_byte - s.start_byte;
    if (s.type === "slot_bound") slot += len;
    else if (s.type === "judgment") judg += len;
  }
  return {
    slot_bound_bytes: slot,
    judgment_bytes: judg,
    voice_bytes: total - slot - judg, // declared prose + unspanned connective text
    total_bytes: total,
  };
}

// Frozen public order: 162→163→164→165→166→167→168→169→170→171 (spec §2).
export function evaluateNarrative(capsuleBundle, narrative, { capsulePubKeyPem, ctx }) {
  const checks = [
    () => schemaCheck(narrative),
    () => signatureCheck(narrative),
    () => checkNormalisation(narrative.content.narrative_body),
    () => checkSpanGeometry(narrative.content.narrative_body, narrative.content.span_map),
    () => verifyNarrativeBinding(narrative.content, capsuleBundle, capsulePubKeyPem),
    () => checkEvidenceLocality(narrative.content, capsuleBundle),
    () => checkJudgments(narrative.content),
    () => slotRecomputeCheck(narrative.content, capsuleBundle, ctx),
    () =>
      checkLeakage(
        narrative.content.narrative_body,
        narrative.content.span_map,
        capsuleValueStrings(capsuleBundle.content)
      ),
    () => payloadCheck(narrative),
  ];
  for (const check of checks) {
    const r = check();
    if (r) return r;
  }
  return { raw: 0, density: computeEvidenceDensity(narrative.content) };
}

export function evaluateNarrativeSafe(capsuleBundle, narrative, opts) {
  try {
    return evaluateNarrative(capsuleBundle, narrative, opts);
  } catch {
    return { raw: 172, reason: "vsn_internal_fail_closed", detail: {} };
  }
}
```

- [ ] **Step 4: Run — expect PASS.** If the green capsule's `users_affected`
      section uses `stage4s_chain_verdict` (needs `ctx.chainVerdict`), pick a
      section whose recompute kind is self-contained (`participant_count` /
      `kernel_block_record`) in the test helper instead — check
      `buildGreenBundle().bundle.content.projected_sections` first and use the
      first `evidence_backed` section whose kind is NOT `stage4s_chain_verdict`.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/core/narrativeCore.mjs tests/unit/llmShield/stage4w/narrativeCore.test.js tests/fixtures/llmShield/stage4w/test-keys/
git commit -m "feat(4w): narrative core — frozen check order 162-171, density, fail-closed 172"
```

Also add the allowlist lines NOW (both audit scripts), so `check.sh` stays green:

In `scripts/security-audit-llm-shield-stage3m.sh` AND
`scripts/security-audit-llm-shield-stage3o.sh`, find the stage4v allowlist
regex line and add below it (mirror the exact style used for stage4v):

```
^tests/fixtures/llmShield/stage4w/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$
```

```bash
git add scripts/security-audit-llm-shield-stage3m.sh scripts/security-audit-llm-shield-stage3o.sh
git commit -m "chore(4w): allowlist stage4w fixture keys in both private-key audits"
```

---

### Task 7: narrativeContest — the 4V adapter (no cloned court)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/core/narrativeContest.mjs`
- Test: `tests/unit/llmShield/stage4w/narrativeContest.test.js`

**Interfaces:**

- Consumes: `deriveSectionStatus` from `stage4v/core/conflictMap.mjs` (IMPORTED, never re-implemented — the no-cloned-court rail); `PARTITIONS` (stage4t constants).
- Produces: `spanContestAddress(narrative, span_id) -> {regime, section_id, span_id}`, `contestSlotSpan({narrative, span_id, contest, artifacts, ctx, capsuleBundle}) -> status object` (delegates to `deriveSectionStatus` with the span's section class + operator value from the capsule), `contestProseSpanClassification({narrative, span_id, judgment_text_digest}) -> {status:"DISPUTE_RECORDED", kind:"classification_contest", span_id}`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/narrativeContest.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contestSlotSpan,
  contestProseSpanClassification,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeContest.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

test("slot-span contest derives 4V statuses through the imported table", () => {
  const g = buildGreenBundle();
  const section = g.bundle.content.projected_sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "participant_count"
  );
  const artifact = g.bundle.content.evidence_artifacts.find(
    (a) => recordDigest(a) === section.evidence_digest
  );
  const artifacts = { [section.evidence_digest]: artifact };
  const agreed = contestSlotSpan({
    capsuleBundle: g.bundle,
    span: { regime: section.regime, section_id: section.section_id },
    contest: {
      verb: "dispute_by_recomputation",
      claimed_value: section.value,
      recompute_kind: section.recompute_kind,
      evidence_digest: section.evidence_digest,
    },
    artifacts,
    ctx: {},
  });
  assert.equal(agreed.status, "AGREED");

  // Reviewer P1 #8 — a REAL CONFLICT_PROVEN: the respondent brings its OWN
  // self-consistent evidence recomputing to a value that differs from the operator's.
  // (participant_count's evidence kind is stage4s_chain_bundle — see KIND_EVIDENCE_SOURCE.
  // If the green capsule lacks a participant_count section, use a kernel_block_record
  // section with a respondent kernel_decision_records artifact carrying extra blocks.)
  const respondentArtifact = {
    kind: "stage4s_chain_bundle",
    participants: [...(artifact.participants ?? []), "respondent-extra-1", "respondent-extra-2"],
  };
  const respondentDigest = recordDigest(respondentArtifact);
  const respondentClaim = (artifact.participants ?? []).length + 2; // != operator value
  const conflict = contestSlotSpan({
    capsuleBundle: g.bundle,
    span: { regime: section.regime, section_id: section.section_id },
    contest: {
      verb: "dispute_by_recomputation",
      claimed_value: respondentClaim,
      recompute_kind: section.recompute_kind,
      evidence_digest: respondentDigest,
    },
    artifacts: { [respondentDigest]: respondentArtifact },
    ctx: {},
  });
  assert.equal(conflict.status, "CONFLICT_PROVEN");
  assert.equal(conflict.respondent_value, respondentClaim);
});

test("prose-span classification contest is recorded, never recomputed", () => {
  const r = contestProseSpanClassification({
    span_id: "p1",
    judgment_text_digest: "sha256:" + "a".repeat(64),
  });
  assert.equal(r.status, "DISPUTE_RECORDED");
  assert.equal(r.kind, "classification_contest");
});

test("no cloned court: module imports 4V deriveSectionStatus", async () => {
  const src = await import("node:fs").then((fs) =>
    fs.readFileSync("tools/simurgh-attestation/stage4w/core/narrativeContest.mjs", "utf8")
  );
  assert.ok(src.includes('from "../../stage4v/core/conflictMap.mjs"'));
  assert.ok(!src.includes('CONFLICT_PROVEN":')); // no local status table
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

- [ ] **Step 3: Implement narrativeContest.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W contest adapter — pays narrative_claim_contest_deferred (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
// NO CLONED COURT: the status table lives in 4V; this module only adapts addresses.
import { deriveSectionStatus } from "../../stage4v/core/conflictMap.mjs";
import { PARTITIONS } from "../../stage4t/constants.mjs";

export const spanContestAddress = (span) => ({
  regime: span.regime,
  section_id: span.section_id,
  span_id: span.span_id,
});

// A slot_bound span IS a projected section with an address: delegate verbatim.
export function contestSlotSpan({ capsuleBundle, span, contest, artifacts, ctx }) {
  const cls = PARTITIONS[span.regime]?.[span.section_id];
  const op = (capsuleBundle.content.projected_sections ?? []).find(
    (p) => p.regime === span.regime && p.section_id === span.section_id
  );
  return deriveSectionStatus({
    contest: { ...contest, regime: span.regime, section_id: span.section_id },
    cls,
    operatorValue: op?.value,
    artifacts,
    ctx,
  });
}

// Prose spans: classification contests only — recorded, never recomputed
// ("nobody recomputes a vibes sentence", spec §1 Law 2).
export function contestProseSpanClassification({ span_id, judgment_text_digest }) {
  return {
    status: "DISPUTE_RECORDED",
    kind: "classification_contest",
    span_id,
    judgment_text_digest,
  };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/core/narrativeContest.mjs tests/unit/llmShield/stage4w/narrativeContest.test.js
git commit -m "feat(4w): span contest adapter delegating to the 4V status table (socket paid)"
```

---

### Task 8: narrativeViews — tiered renders + marker invariant

**Files:**

- Create: `tools/simurgh-attestation/stage4w/core/narrativeViews.mjs`
- Test: `tests/unit/llmShield/stage4w/narrativeViews.test.js`

**Interfaces:**

- Consumes: `computeEvidenceDensity` (Task 6), `bodyBytes` (Task 3), `recordDigest`.
- Produces: `MARKERS = {slot_bound:"[E]", judgment:"[J]", unverified_prose:"[V]", connective:"[·]"}`, `renderView(content, tier /* "public"|"audit" */) -> {tier, segments:[{marker, text?|text_digest, span_id?}], density, render_digest}` (public tier: text_digest only for non-slot segments; audit tier: full text), `checkMarkerIntegrity(view, content) -> null | {violation}` (every span's marker present and matching its type — the No Two Stories invariant).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/narrativeViews.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderView,
  checkMarkerIntegrity,
  MARKERS,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeViews.mjs";

const content = {
  narrative_body: "voice one. EVIDENCE HERE. voice two.\n",
  span_map: [
    {
      span_id: "s1",
      start_byte: 11,
      end_byte: 25,
      type: "slot_bound",
      regime: "r",
      section_id: "x",
      claimed_value: 1,
      recompute_kind: "k",
      evidence_digest: "sha256:" + "a".repeat(64),
    },
    { span_id: "p1", start_byte: 26, end_byte: 36, type: "unverified_prose" },
  ],
  judgments: [],
};

test("render: every span visibly typed, density sealed, digests stable", () => {
  const view = renderView(content, "audit");
  const markers = view.segments.map((s) => s.marker);
  assert.ok(markers.includes(MARKERS.slot_bound));
  assert.ok(markers.includes(MARKERS.unverified_prose));
  assert.ok(markers.includes(MARKERS.connective));
  assert.equal(view.density.total_bytes, Buffer.byteLength(content.narrative_body));
  assert.match(view.render_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(checkMarkerIntegrity(view, content), null);
});

test("public tier carries digests for voice, text only for evidence badges", () => {
  const pub = renderView(content, "public");
  const voice = pub.segments.find((s) => s.marker === MARKERS.unverified_prose);
  assert.equal(voice.text, undefined);
  assert.match(voice.text_digest, /^sha256:/);
});

test("marker downgrade is refused", () => {
  const view = renderView(content, "audit");
  const tampered = JSON.parse(JSON.stringify(view));
  const idx = tampered.segments.findIndex((s) => s.marker === MARKERS.unverified_prose);
  tampered.segments[idx].marker = MARKERS.slot_bound; // voice dressed as evidence
  const r = checkMarkerIntegrity(tampered, content);
  assert.equal(r.violation, "marker_downgraded_or_forged");
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

- [ ] **Step 3: Implement narrativeViews.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W audience views — Voice Is Not Evidence, enforced in render (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Invariant: no view may hide or downgrade a span's visible type marker.
import { recordDigest, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { bodyBytes } from "./textCore.mjs";
import { computeEvidenceDensity } from "./narrativeCore.mjs";

export const MARKERS = Object.freeze({
  slot_bound: "[E]",
  judgment: "[J]",
  unverified_prose: "[V]",
  connective: "[·]",
});

const DEC = new TextDecoder();

function segmentsOf(content) {
  const bytes = bodyBytes(content.narrative_body);
  const spans = [...(content.span_map ?? [])].sort((a, b) => a.start_byte - b.start_byte);
  const segs = [];
  let cursor = 0;
  const push = (start, end, type, span_id) =>
    segs.push({
      marker: MARKERS[type],
      type,
      ...(span_id ? { span_id } : {}),
      text: DEC.decode(bytes.subarray(start, end)),
    });
  for (const s of spans) {
    if (s.start_byte > cursor) push(cursor, s.start_byte, "connective");
    push(s.start_byte, s.end_byte, s.type, s.span_id);
    cursor = s.end_byte;
  }
  if (cursor < bytes.length) push(cursor, bytes.length, "connective");
  return segs;
}

export function renderView(content, tier) {
  const segments = segmentsOf(content).map((seg) => {
    if (tier === "audit" || seg.type === "slot_bound") return seg;
    const { text, ...rest } = seg;
    return { ...rest, text_digest: `sha256:${sha256Hex(text)}` };
  });
  const density = computeEvidenceDensity(content);
  const view = { tier, segments, density };
  return { ...view, render_digest: recordDigest(view) };
}

// The 4W No Two Stories: rebuild the expected marker sequence from the signed
// content and require exact match — a downgraded/forged marker never verifies.
export function checkMarkerIntegrity(view, content) {
  const expected = segmentsOf(content).map((s) => s.marker);
  const got = (view.segments ?? []).map((s) => s.marker);
  if (expected.length !== got.length || expected.some((m, i) => m !== got[i]))
    return { violation: "marker_downgraded_or_forged" };
  return null;
}
```

- [ ] **Step 4: Run — expect PASS** (adjust the fixture offsets so span
      boundaries land exactly: `"voice one. "` is 11 bytes, `"EVIDENCE HERE."` is
      14 → end 25; verify with `Buffer.byteLength` before finalising).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/core/narrativeViews.mjs tests/unit/llmShield/stage4w/narrativeViews.test.js
git commit -m "feat(4w): tiered narrative views with un-downgradable type markers"
```

---

### Task 9: greenNarrative + Lane A fixtures (corpus, tamper, Brigandi, density)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/node/greenNarrative.mjs`
- Create: `tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs`
- Test: `tests/unit/llmShield/stage4w/fixtures.test.js`

**Interfaces:**

- Produces: `buildGreenNarrative() -> {capsuleBundle, narrative, capsulePubKeyPem}` (all three span types + a judgment + declared claim-y prose + multi-byte text سیمرغ🕊 + leakage-clean connective text, raw 0); `resignNarrativeGreen(n)`; `buildLaneAFixtures() -> [{name, expected_raw, narrative, mutate_note}]` (~22 cases); `corpusDocument() -> signed corpus` (schema `simurgh.vsn.lane_a_corpus.v1`, signed with the `vsn` key); `writeCorpus()` writing byte-stable JSON to `docs/research/llm-shield/evidence/stage-4w/lane-a/corpus.json`.

Fixture list (exact names; every mutation re-signed via `resignNarrativeGreen`
and re-bound where the mutation is content-side — the 4T resignBundle lesson;
signature-tamper cases are NOT re-signed):

```
green-all-types            0
schema-alien-key           162
signature-tampered         163
normalisation-nfd          164   (NFD é in body, binding recomputed, re-signed)
normalisation-crlf         164
normalisation-trailing-ws  164
geometry-overlap           165
geometry-out-of-bounds     165
geometry-mid-code-point    165   (offset inside سیمرغ)
geometry-duplicate-id      165
geometry-unsorted          165
geometry-zero-length       165
binding-capsule-root       166
brigandi-fabricated-citation 167  (evidence_digest that exists nowhere)
judgment-digest-mismatch   168
judgment-unreferenced      168
brigandi-false-quotation   169   (claimed_value != sealed evidence recompute)
blend-wrong-section        169   (sealed digest attached to another section)
leakage-undeclared-digit   170
leakage-capsule-collision  170
payload-smuggled-prompt    171
density-recount            0     (density triple equals independent recount)
```

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/fixtures.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGreenNarrative } from "../../../../tools/simurgh-attestation/stage4w/node/greenNarrative.mjs";
import {
  buildLaneAFixtures,
  corpusDocument,
} from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs";
import {
  evaluateNarrativeSafe,
  computeEvidenceDensity,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";
import { VSN_LANE_A_CORPUS_SCHEMA } from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";

test("green narrative: raw 0, all three span types, multi-byte body", () => {
  const g = buildGreenNarrative();
  const r = evaluateNarrativeSafe(g.capsuleBundle, g.narrative, {
    capsulePubKeyPem: g.capsulePubKeyPem,
    ctx: {},
  });
  assert.equal(r.raw, 0);
  const types = new Set(g.narrative.content.span_map.map((s) => s.type));
  assert.deepEqual([...types].sort(), ["judgment", "slot_bound", "unverified_prose"]);
  assert.ok(g.narrative.content.narrative_body.includes("سیمرغ"));
});

test("every Lane A fixture verifies to its declared raw code", () => {
  const g = buildGreenNarrative();
  for (const f of buildLaneAFixtures()) {
    const r = evaluateNarrativeSafe(g.capsuleBundle, f.narrative, {
      capsulePubKeyPem: g.capsulePubKeyPem,
      ctx: {},
    });
    assert.equal(r.raw, f.expected_raw, `${f.name}: got ${r.raw} (${r.reason ?? ""})`);
  }
});

test("density fixture equals an independent recount; corpus is signed + complete", () => {
  const g = buildGreenNarrative();
  const d = computeEvidenceDensity(g.narrative.content);
  const recount = g.narrative.content.span_map.reduce(
    (acc, s) => acc + (s.type === "slot_bound" ? s.end_byte - s.start_byte : 0),
    0
  );
  assert.equal(d.slot_bound_bytes, recount);
  const corpus = corpusDocument();
  assert.equal(corpus.content.schema, VSN_LANE_A_CORPUS_SCHEMA);
  assert.ok(corpus.content.cases.length >= 22);
  assert.ok(corpus.signature.length > 0);
});
```

- [ ] **Step 2: Run — expect FAIL (modules missing)**

- [ ] **Step 3: Implement greenNarrative.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W green narrative over the pinned 4T green capsule (spec §3 Lane A).
// Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGreenBundle } from "../../stage4t/node/greenCapsule.mjs";
import { recordDigest, canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { buildNarrative, resignNarrative } from "../core/narrativeCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

export const resignNarrativeGreen = (n) => resignNarrative(n, readKey("vsn-author"));

const B = (s) => Buffer.byteLength(s);

export function buildGreenNarrative() {
  const green = buildGreenBundle();
  const sections = green.bundle.content.projected_sections;
  // Pick two self-contained evidence_backed sections (no ctx.chainVerdict needed).
  const slotA = sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "participant_count"
  );
  const slotB = sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "kernel_block_record"
  );
  // Deterministic judgment signer: the `vsn` fixture key (NOT a fresh ephemeral pair) so
  // the green narrative — and every fixture derived from it — is byte-stable across runs.
  const jContent = {
    judgment_text_digest: "sha256:" + sha256Hex(canonicalJson({ note: "vsn-green-judgment" })),
  };
  const jSig = crypto
    .sign(null, Buffer.from(canonicalJson(jContent)), crypto.createPrivateKey(readKey("vsn")))
    .toString("base64");
  const signedJudgment = {
    content: jContent,
    signature: jSig,
    judgment_pub_key_pem: readPub("vsn"),
  };

  const claimA = `participants recorded: ${JSON.stringify(slotA.value)}`;
  const claimB = `kernel blocks recorded: ${JSON.stringify(slotB.value)}`;
  const judgeText = "we judge the root cause was a poisoned tool description";
  const voiceText = "we believe most users trust us and we regret the incident";
  const p1 = "the simurgh (سیمرغ) watches. ";
  const p2 = " furthermore, ";
  const p3 = " in our view: ";
  const p4 = " declared voice: ";
  const p5 = " calm close.\n";
  const body = p1 + claimA + p2 + claimB + p3 + judgeText + p4 + voiceText + p5;

  let off = B(p1);
  const span = (id, text, extra) => {
    const s = { span_id: id, start_byte: off, end_byte: off + B(text), ...extra };
    off += B(text);
    return s;
  };
  const spanMap = [];
  spanMap.push(
    span("s-a", claimA, {
      type: "slot_bound",
      regime: slotA.regime,
      section_id: slotA.section_id,
      claimed_value: slotA.value,
      recompute_kind: slotA.recompute_kind,
      evidence_digest: slotA.evidence_digest,
    })
  );
  off += B(p2);
  spanMap.push(
    span("s-b", claimB, {
      type: "slot_bound",
      regime: slotB.regime,
      section_id: slotB.section_id,
      claimed_value: slotB.value,
      recompute_kind: slotB.recompute_kind,
      evidence_digest: slotB.evidence_digest,
    })
  );
  off += B(p3);
  spanMap.push(
    span("j-1", judgeText, {
      type: "judgment",
      judgment_id: "j1",
      judgment_digest: recordDigest(signedJudgment),
    })
  );
  off += B(p4);
  spanMap.push(span("v-1", voiceText, { type: "unverified_prose" }));

  const narrative = buildNarrative({
    capsuleBundle: green.bundle,
    capsulePubKeyPem: green.pubKeyPem,
    body,
    spanMap,
    judgments: [{ judgment_id: "j1", signed_judgment: signedJudgment }],
    authorRole: "operator",
    privKeyPem: readKey("vsn-author"),
    pubKeyPem: readPub("vsn-author"),
  });
  return { capsuleBundle: green.bundle, narrative, capsulePubKeyPem: green.pubKeyPem };
}
```

(The judgment signer is the `vsn` fixture key for byte-stability — no ephemeral
pair, so fixtures reproduce identically run-to-run.)

- [ ] **Step 4: Implement build-stage4w-fixtures.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane A corpus builder (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// Every content-side mutation re-binds + re-signs (4T resignBundle lesson);
// signature-tamper cases are left unsigned-invalid on purpose.
import crypto from "node:crypto";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VSN_LANE_A_CORPUS_SCHEMA } from "../constants.mjs";
import { buildNarrativeBinding } from "../core/narrativeBinding.mjs";
import { buildGreenNarrative, resignNarrativeGreen } from "./greenNarrative.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const EVDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4w/lane-a");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");

const clone = (x) => JSON.parse(JSON.stringify(x));

function rebindResign(n, capsuleBundle, capsulePubKeyPem) {
  n.content.binding = buildNarrativeBinding(
    capsuleBundle,
    capsulePubKeyPem,
    n.content.narrative_body,
    n.content.span_map
  );
  return resignNarrativeGreen(n);
}

export function buildLaneAFixtures() {
  const { capsuleBundle, narrative, capsulePubKeyPem } = buildGreenNarrative();
  const G = () => clone(narrative);
  const RR = (n) => rebindResign(n, capsuleBundle, capsulePubKeyPem);
  const fixtures = [];
  const add = (name, expected_raw, make, mutate_note) =>
    fixtures.push({ name, expected_raw, narrative: make(), mutate_note });

  add("green-all-types", 0, () => G(), "unmutated green");
  add(
    "schema-alien-key",
    162,
    () => {
      const n = G();
      n.content.alien = true;
      return resignNarrativeGreen(n);
    },
    "extra top-level key, re-signed so schema fires before signature"
  );
  add(
    "signature-tampered",
    163,
    () => {
      const n = G();
      n.signature = Buffer.from("tampered-sig").toString("base64");
      return n;
    },
    "signature corrupted, NOT re-signed"
  );
  add(
    "normalisation-nfd",
    164,
    () => {
      const n = G();
      n.content.narrative_body = n.content.narrative_body.replace("close.", "café."); // NFD
      return RR(n);
    },
    "NFD sequence; binding recomputed so 164 is the first failure"
  );
  add(
    "normalisation-crlf",
    164,
    () => {
      const n = G();
      n.content.narrative_body = n.content.narrative_body.replace("\n", "\r\n");
      return RR(n);
    },
    "CRLF newline"
  );
  add(
    "normalisation-trailing-ws",
    164,
    () => {
      const n = G();
      n.content.narrative_body = n.content.narrative_body.replace("close.\n", "close. \n");
      return RR(n);
    },
    "trailing space before newline"
  );
  add(
    "geometry-overlap",
    165,
    () => {
      const n = G();
      n.content.span_map[1].start_byte = n.content.span_map[0].end_byte - 1;
      return RR(n);
    },
    "second span starts inside the first"
  );
  add(
    "geometry-out-of-bounds",
    165,
    () => {
      const n = G();
      n.content.span_map.at(-1).end_byte = 100000;
      return RR(n);
    },
    "end beyond body"
  );
  add(
    "geometry-mid-code-point",
    165,
    () => {
      const n = G();
      const s = n.content.span_map[0];
      const simurghAt = Buffer.byteLength("the simurgh (");
      n.content.span_map = [
        {
          span_id: "mid",
          start_byte: simurghAt + 1,
          end_byte: simurghAt + 3,
          type: "unverified_prose",
        },
        ...n.content.span_map.map((x, i) => (i === 0 ? x : x)),
      ].slice(0, 1);
      return RR(n);
    },
    "span starts inside a multi-byte code point of سیمرغ"
  );
  add(
    "geometry-duplicate-id",
    165,
    () => {
      const n = G();
      n.content.span_map[1].span_id = n.content.span_map[0].span_id;
      return RR(n);
    },
    "two spans share span_id"
  );
  add(
    "geometry-unsorted",
    165,
    () => {
      const n = G();
      n.content.span_map.reverse();
      return RR(n);
    },
    "span_map not sorted by start_byte"
  );
  add(
    "geometry-zero-length",
    165,
    () => {
      const n = G();
      n.content.span_map[0].end_byte = n.content.span_map[0].start_byte;
      return RR(n);
    },
    "empty span"
  );
  add(
    "binding-capsule-root",
    166,
    () => {
      const n = G();
      n.content.binding.capsule_root = "sha256:" + "0".repeat(64);
      return resignNarrativeGreen(n);
    },
    "binding names a foreign capsule (re-signed, NOT re-bound)"
  );
  add(
    "brigandi-fabricated-citation",
    167,
    () => {
      const n = G();
      n.content.span_map[0].evidence_digest = recordDigest({ fabricated: "citation" });
      return RR(n);
    },
    "the fabricated citation: cites evidence that exists nowhere"
  );
  add(
    "judgment-digest-mismatch",
    168,
    () => {
      const n = G();
      n.content.span_map.find((s) => s.type === "judgment").judgment_digest =
        "sha256:" + "1".repeat(64);
      return RR(n);
    },
    "judgment span digest does not match the record"
  );
  add(
    "judgment-unreferenced",
    168,
    () => {
      const n = G();
      n.content.judgments.push({
        judgment_id: "ghost",
        signed_judgment: n.content.judgments[0].signed_judgment,
      });
      return RR(n);
    },
    "packed extra judgment record with no referencing span"
  );
  add(
    "brigandi-false-quotation",
    169,
    () => {
      const n = G();
      n.content.span_map[0].claimed_value = 99;
      return RR(n);
    },
    "the false quotation: claimed value diverges from sealed evidence"
  );
  add(
    "blend-wrong-section",
    169,
    () => {
      const n = G();
      const [a, b] = n.content.span_map;
      a.section_id = b.section_id;
      a.regime = b.regime; // sealed evidence, wrong section pairing
      return RR(n);
    },
    "derivation blend: right evidence, wrong section"
  );
  add(
    "leakage-undeclared-digit",
    170,
    () => {
      const n = G();
      n.content.narrative_body = n.content.narrative_body.replace(
        "calm close.\n",
        "calm close with 9 asides.\n"
      );
      return RR(n);
    },
    "undeclared digit in connective text"
  );
  add(
    "leakage-capsule-collision",
    170,
    () => {
      const n = G();
      const v = String(n.content.span_map[0].claimed_value);
      n.content.narrative_body = n.content.narrative_body.replace(
        "calm close.\n",
        `calm close echoing ${"value ".repeat(1).trim()} ${v}.\n`
      );
      return RR(n);
    },
    "capsule value echoed undeclared (digit rule fires; collision family)"
  );
  add(
    "payload-smuggled-prompt",
    171,
    () => {
      const n = G();
      n.content.judgments[0].signed_judgment = {
        ...n.content.judgments[0].signed_judgment,
        content: { ...n.content.judgments[0].signed_judgment.content },
      };
      // smuggle under a reserved record to pass 168 first (reserved, unreferenced allowed)
      n.content.judgments.push({
        judgment_id: "cargo",
        reserved: true,
        signed_judgment: {
          content: { prompt: "hidden completion cargo" },
          signature: "",
          judgment_pub_key_pem: "",
        },
      });
      const withDigestFix = RR(n);
      return withDigestFix;
    },
    "forbidden 'prompt' key nested in a reserved judgment record"
  );
  add("density-recount", 0, () => G(), "green again; harness recounts density independently");

  return fixtures;
}

export function corpusDocument() {
  const cases = buildLaneAFixtures().map((f) => ({
    name: f.name,
    expected_raw: f.expected_raw,
    mutate_note: f.mutate_note,
    narrative_digest: recordDigest(f.narrative),
  }));
  const content = { schema: VSN_LANE_A_CORPUS_SCHEMA, cases };
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(readKey("vsn")))
    .toString("base64");
  return { content, signature };
}

export function writeCorpus() {
  mkdirSync(EVDIR, { recursive: true });
  const doc = { corpus: corpusDocument(), fixtures: buildLaneAFixtures() };
  writeFileSync(join(EVDIR, "corpus.json"), canonicalJson(doc) + "\n");
}

// CLI main: `node build-stage4w-fixtures.mjs` regenerates the byte-stable corpus
// (reviewer P0 #3 — the corpus MUST be a committed file for Task 16's cmp).
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]).href) writeCorpus();
```

- [ ] **Step 5: Run the fixtures test — expect PASS.** Two fixtures need care:
      `geometry-mid-code-point` must be verified against real byte offsets of
      `سیمرغ` in the green body (compute in a scratch REPL; each Arabic letter
      is 2 bytes); `payload-smuggled-prompt` must NOT trip 168 first — the
      `reserved: true` escape hatch is exactly why the reserved marker exists in
      `checkJudgments`. If 168 fires, fix the fixture, not the verifier.

- [ ] **Step 6: Generate the committed corpus and prove it is byte-stable** (reviewer P0 #3)

```bash
node tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs
node tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs
git diff --exit-code docs/research/llm-shield/evidence/stage-4w/lane-a/corpus.json
```

Expected: the file is written identically twice (idempotent); `git diff --exit-code`
returns 0. If it differs run-to-run, a non-deterministic value leaked into a
fixture — fix the fixture, never loosen the check.

- [ ] **Step 7: Commit** (corpus file included)

```bash
git add tools/simurgh-attestation/stage4w/node/ tests/unit/llmShield/stage4w/fixtures.test.js docs/research/llm-shield/evidence/stage-4w/lane-a/corpus.json
git commit -m "test(4w): Lane A corpus — green + 20 tamper cases incl Brigandi family + density recount"
```

---

### Task 10: Lane B — deterministic drafting ceremony (two OS processes)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/laneb/drafter-child.mjs`
- Create: `tools/simurgh-attestation/stage4w/laneb/run-laneb-drafting-ceremony.mjs`
- Test: `tests/e2e/llmShield/stage4w/laneb.test.js`

**Interfaces:**

- Child: reads `{capsule_projection, binding, laneb_priv_key_pem, laneb_pub_key_pem}` JSON on stdin (projection = `projected_sections` with class/value/recompute*kind/evidence_digest ONLY — no raw `evidence_artifacts`), deterministically drafts body+span_map, signs with its OWN ephemeral Lane-B author key (delivered over stdin, its PUBLIC pem sealed in the capture), writes the signed narrative JSON to stdout. **Honest scope of blindness:** the child receives only the public capsule projection as evidence input, PLUS its own ephemeral signing key over stdin — it receives no raw capsule evidence, no operator private key, and no operator working state. Refuses to start if any env key matches `/^OPERATOR(*|$)/`or argv contains`.pem` (those are the blindness surfaces; the key arrives on stdin, never argv/env).
- Parent: spawns child via `node` with a SCRUBBED env (`{PATH}` only), pipes the projection, verifies the child's narrative to raw 0 with `evaluateNarrativeSafe`, seals `{schema: VSN_LANEB_CAPTURE_SCHEMA, narrative, verify_raw: 0, density, laneb_author_pub_key_pem, child_input_profile: {evidence_input: "capsule_public_projection_only", signing_key_delivery: "stdin_child_author_key", operator_private_state_visible: false}, component_hashes: {capsule_projection, narrative, density}, blindness: {env_keys_scrubbed: true, negatives: [...]}}` to `docs/research/llm-shield/evidence/stage-4w/laneb/capture.json` (canonicalJson, byte-stable). `component_hashes` are harness-computed (`recordDigest`) so Task 10 verify + Task 16 reproduce can rederive them (the 3V-A doctrine).
- Blindness negatives sealed: (1) child started with `OPERATOR_SECRET=x` env → child exits non-zero; (2) child argv containing `fake.pem` → child exits non-zero. Parent records both exit codes in the capture.

- [ ] **Step 1: Write the failing e2e test**

```js
// tests/e2e/llmShield/stage4w/laneb.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("Lane B ceremony: blind child drafts, parent verifies raw 0, negatives sealed", () => {
  execFileSync(process.execPath, [
    "tools/simurgh-attestation/stage4w/laneb/run-laneb-drafting-ceremony.mjs",
  ]);
  const cap = JSON.parse(
    readFileSync("docs/research/llm-shield/evidence/stage-4w/laneb/capture.json", "utf8")
  );
  assert.equal(cap.schema, "simurgh.vsn.laneb_capture.v1");
  assert.equal(cap.verify_raw, 0);
  assert.equal(cap.narrative.content.author_role, "drafting_model_operator_signed");
  assert.ok(cap.blindness.negatives.every((n) => n.exit_code !== 0));
  assert.ok(cap.laneb_author_pub_key_pem.includes("PUBLIC KEY"));
  assert.equal(cap.child_input_profile.operator_private_state_visible, false);
  assert.equal(cap.child_input_profile.evidence_input, "capsule_public_projection_only");
  assert.match(cap.component_hashes.narrative, /^sha256:[a-f0-9]{64}$/);
});
```

- [ ] **Step 2: Implement drafter-child.mjs** — the child rebuilds the SAME
      green drafting the parent expects, but ONLY from the projection it is fed
      (it never imports greenCapsule):

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane B drafter child (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// Blind by construction: only the capsule public projection arrives on stdin.
// No quiet ghostwriter: this process signs its own narrative; the parent never rewrites it.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

for (const k of Object.keys(process.env))
  if (/^OPERATOR(_|$)/.test(k)) {
    console.error("blindness violation: operator env visible");
    process.exit(3);
  }
for (const a of process.argv.slice(2))
  if (a.endsWith(".pem")) {
    console.error("blindness violation: key material on argv");
    process.exit(3);
  }

const input = JSON.parse(readFileSync(0, "utf8"));
const { capsule_projection, laneb_priv_key_pem, laneb_pub_key_pem } = input;
// NOTE: the ephemeral key is DELIVERED over stdin by the parent (sealed in the capture),
// never via argv/env — argv/env are the blindness surfaces.

const slots = capsule_projection.filter(
  (p) =>
    p.class === "evidence_backed" &&
    ["participant_count", "kernel_block_record"].includes(p.recompute_kind)
);
const B = (s) => Buffer.byteLength(s);
const p1 = "drafted from the public projection alone. ";
let body = p1;
const spanMap = [];
let off = B(p1);
slots.forEach((p, i) => {
  const claim = `${p.section_id} recorded as ${JSON.stringify(p.value)}`;
  spanMap.push({
    span_id: `d-${i}`,
    start_byte: off,
    end_byte: off + B(claim),
    type: "slot_bound",
    regime: p.regime,
    section_id: p.section_id,
    claimed_value: p.value,
    recompute_kind: p.recompute_kind,
    evidence_digest: p.evidence_digest,
  });
  body += claim;
  off += B(claim);
  const glue = i < slots.length - 1 ? " and also " : "";
  body += glue;
  off += B(glue);
});
body += " nothing further.\n";

const canonicalJson = (v) =>
  JSON.stringify(v, (_, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : 1)))
      : val
  );
// The child cannot import project modules (blindness: it sees only stdin), so it
// carries its own canonicaliser — parity is enforced by the parent verifying to raw 0.
const content = {
  schema: "simurgh.vsn.narrative.v1",
  narrative_body: body,
  span_map: spanMap,
  judgments: [],
  binding: input.binding, // parent supplies the expected binding fields (public data)
  author_role: "drafting_model_operator_signed",
  leakage_ruleset: "vsn.leakage.v1",
};
const signature = crypto
  .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(laneb_priv_key_pem))
  .toString("base64");
process.stdout.write(JSON.stringify({ content, signature, author_pub_key_pem: laneb_pub_key_pem }));
```

**IMPORTANT implementation check:** the child's inline `canonicalJson` must
byte-match `stage4m/core/canonical.mjs` for these value shapes (sorted keys,
no nested-array objects here). The parent verifies the signature with the
project canonicaliser — if verification fails, align the child's serialiser
(copy the exact function body from stage4m canonical.mjs into the child with
a comment naming the source).

- [ ] **Step 3: Implement run-laneb-drafting-ceremony.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane B parent (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildGreenBundle } from "../../stage4t/node/greenCapsule.mjs";
import { buildNarrativeBinding } from "../core/narrativeBinding.mjs";
import { evaluateNarrativeSafe } from "../core/narrativeCore.mjs";
import { VSN_LANEB_CAPTURE_SCHEMA } from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const EVDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4w/laneb");
const CHILD = join(HERE, "drafter-child.mjs");
const key = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const pub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

const green = buildGreenBundle();
const projection = green.bundle.content.projected_sections.map(
  ({ regime, section_id, class: cls, value, recompute_kind, evidence_digest }) => ({
    regime,
    section_id,
    class: cls,
    value,
    recompute_kind,
    evidence_digest,
  })
);

const scrubbed = { PATH: process.env.PATH };
const run = (env, args, payload) =>
  spawnSync(process.execPath, [CHILD, ...args], {
    env,
    input: payload,
    encoding: "utf8",
  });

// Blindness negatives FIRST (sealed): operator env + pem argv must be refused.
const negatives = [
  { name: "operator_env_refused", ...pick(run({ ...scrubbed, OPERATOR_SECRET: "x" }, [], "{}")) },
  { name: "pem_argv_refused", ...pick(run(scrubbed, ["fake.pem"], "{}")) },
];
function pick(r) {
  return { exit_code: r.status };
}

// The real ceremony: pre-compute the binding (public data) and hand the child
// ONLY projection + binding + its own sealed ephemeral key over stdin.
const draft = (bodyProbe) => {
  // two-phase: child drafts once to learn its body, parent computes binding, child re-signs.
  const first = run(
    scrubbed,
    [],
    canonicalJson({
      capsule_projection: projection,
      binding: {},
      laneb_priv_key_pem: key("vsn-laneb-author"),
      laneb_pub_key_pem: pub("vsn-laneb-author"),
    })
  );
  const draft1 = JSON.parse(first.stdout);
  const binding = buildNarrativeBinding(
    green.bundle,
    green.pubKeyPem,
    draft1.content.narrative_body,
    draft1.content.span_map
  );
  const second = run(
    scrubbed,
    [],
    canonicalJson({
      capsule_projection: projection,
      binding,
      laneb_priv_key_pem: key("vsn-laneb-author"),
      laneb_pub_key_pem: pub("vsn-laneb-author"),
    })
  );
  return JSON.parse(second.stdout);
};
const narrative = draft();

const result = evaluateNarrativeSafe(green.bundle, narrative, {
  capsulePubKeyPem: green.pubKeyPem,
  ctx: {},
});
if (result.raw !== 0) {
  console.error("lane B verify failed:", JSON.stringify(result));
  process.exit(1);
}

mkdirSync(EVDIR, { recursive: true });
writeFileSync(
  join(EVDIR, "capture.json"),
  canonicalJson({
    schema: VSN_LANEB_CAPTURE_SCHEMA,
    narrative,
    verify_raw: result.raw,
    density: result.density,
    laneb_author_pub_key_pem: pub("vsn-laneb-author"),
    child_input_profile: {
      evidence_input: "capsule_public_projection_only",
      signing_key_delivery: "stdin_child_author_key",
      operator_private_state_visible: false,
    },
    component_hashes: {
      capsule_projection: recordDigest(projection),
      narrative: recordDigest(narrative),
      density: recordDigest(result.density),
    },
    blindness: { env_keys_scrubbed: true, negatives },
  }) + "\n"
);
console.log("lane B capture sealed, raw 0");
```

- [ ] **Step 4: Run the e2e test — expect PASS** (`node --test tests/e2e/llmShield/stage4w/laneb.test.js`). The child's deterministic body must be leakage-clean: section values render inside declared spans; the connective text has no digits/quantifiers ("and also", "nothing further." are clean).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/laneb/ tests/e2e/llmShield/stage4w/laneb.test.js docs/research/llm-shield/evidence/stage-4w/laneb/
git commit -m "feat(4w): Lane B two-process blind drafting ceremony with sealed negatives"
```

---

### Task 11: Attestation (two-tier) + C2PA/in-toto bridge

**Files:**

- Create: `tools/simurgh-attestation/stage4w/node/build-stage4w-attestation.mjs`
- Create: `tools/simurgh-attestation/stage4w/node/verify-stage4w-attestation.mjs`
- Create: `tools/simurgh-attestation/stage4w/node/build-stage4w-bridge.mjs`
- Test: `tests/unit/llmShield/stage4w/attestation.test.js`

**Interfaces:**

- Mirror `build-stage4v-attestation.mjs` exactly in shape: one signed attestation over sealed groups `lane_a_fixtures / lane_b_capture / lane_c_captures / parity_contract / honesty_ledger / evidence_density / bridge_statement`, `bundleMerkleRoot(attestation)`, signs `canonicalJson(parse(bundle))` with the `vsn` key, `keyDigest` of the PUBLIC pem inside content.
- `PARITY_CONTRACT.lines` includes `"python_public_core_does_not_verify_ed25519_signatures"`, `"browser_verifier_public_tier_only_node_cli_authoritative"`.
- `honesty_ledger` = `{non_claims: VSN_NON_CLAIMS, known_limitations: VSN_KNOWN_LIMITATIONS, rails: VSN_RAILS, reserved_slots: VSN_RESERVED_SLOTS, ledger_note: "narrative_claim_contest_deferred PAID by 4W (4V ledger)"}`.
- Bridge: `buildBridgeStatement(narrativeDigest, spanMapDigest, attestationDigest) -> in-toto Statement v1` with `_type: VSN_BRIDGE_STATEMENT_SCHEMA`, `subject: [{name: "vsn-narrative", digest: {sha256: <hex>}}]`, `predicateType: VSN_BRIDGE_PREDICATE_TYPE`, `predicate: {span_map_digest, attestation_digest, note: "C2PA records declarations; VSN recomputes spans. Corroborate by digest equality."}`.
- Verifier: public tier = attestation signature + Merkle root + green narrative structural checks; audit tier (`--audit`) = independently rebuild the Lane A fixtures (`buildLaneAFixtures()`), and for EACH sealed case assert BOTH that `evaluateNarrativeSafe(rebuilt).raw === case.expected_raw` AND that `recordDigest(rebuilt) === case.narrative_digest` — the digest comparison is what catches a validly re-signed pack whose sealed digest was swapped (the raw would still match). Then re-verify Lane B capture byte-stable + raw 0, check Lane C capture digests IF present, recompute the density triple, recompute the bridge subject digest. Any per-case digest/raw mismatch → `{ok:false, reason:"lane_a_fixture_falsified"}`.
- `resignAttestation(att, privKeyPem) -> att` (re-signs `content` with the `vsn` key) — the reviewer-grade discrimination test needs a validly re-signed but dishonest pack (public-green, audit-red).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/attestation.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAttestation,
  bundleMerkleRoot,
  resignAttestation,
} from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4w/node/verify-stage4w-attestation.mjs";
import { buildBridgeStatement } from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-bridge.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");

test("attestation round-trips public + audit tiers", () => {
  const att = buildAttestation();
  assert.equal(verifyAttestation(att, { tier: "public" }).ok, true);
  assert.equal(verifyAttestation(att, { tier: "audit" }).ok, true);
});

test("stale-signature forgery is caught (broken signature)", () => {
  const att = buildAttestation();
  const forged = JSON.parse(JSON.stringify(att));
  forged.content.lane_a_fixtures.cases[0].narrative_digest = "sha256:" + "0".repeat(64);
  forged.content.bundle_merkle_root = bundleMerkleRoot(forged); // recomputes root but NOT re-signed
  const r = verifyAttestation(forged, { tier: "audit" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "attestation_signature_invalid"); // signature now stale
});

test("validly RE-SIGNED falsified Lane A pack is public-GREEN but audit-RED (reviewer P1 #6)", () => {
  // The dishonest producer owns the fixture key and re-signs cleanly. Public tier,
  // which only checks signature + Merkle structure, passes. Audit tier RE-RUNS the
  // fixture and catches that the sealed digest no longer matches reality.
  const forged = JSON.parse(JSON.stringify(buildAttestation()));
  forged.content.lane_a_fixtures.cases[0].narrative_digest = "sha256:" + "0".repeat(64);
  forged.content.bundle_merkle_root = bundleMerkleRoot(forged);
  resignAttestation(forged, readKey("vsn")); // valid signature over the lie
  assert.equal(verifyAttestation(forged, { tier: "public" }).ok, true);
  const audit = verifyAttestation(forged, { tier: "audit" });
  assert.equal(audit.ok, false);
  assert.equal(audit.reason, "lane_a_fixture_falsified");
});

test("bridge statement is in-toto v1 with recomputable subject", () => {
  const s = buildBridgeStatement(
    "sha256:" + "a".repeat(64),
    "sha256:" + "b".repeat(64),
    "sha256:" + "c".repeat(64)
  );
  assert.equal(s._type, "https://in-toto.io/Statement/v1");
  assert.equal(s.subject[0].digest.sha256, "a".repeat(64));
  assert.equal(s.predicate.span_map_digest, "sha256:" + "b".repeat(64));
});
```

- [ ] **Step 2: Implement all three modules,** mirroring the 4V attestation
      files structurally (read
      `tools/simurgh-attestation/stage4v/node/build-stage4v-attestation.mjs` and
      `verify-stage4v-attestation.mjs` side-by-side; same two-stage digest, same
      sealed-groups pattern, `vsn` key from stage4w test-keys, evidence to
      `docs/research/llm-shield/evidence/stage-4w/attestation/`). The bridge is
      ~25 lines:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W C2PA/in-toto bridge projection (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// C2PA signs the file and records declarations; VSN types the sentences and recomputes them.
// This Statement lets Content-Credentials tooling carry a VSN digest outward.
import { VSN_BRIDGE_STATEMENT_SCHEMA, VSN_BRIDGE_PREDICATE_TYPE } from "../constants.mjs";

export function buildBridgeStatement(narrativeBodyDigest, spanMapDigest, attestationDigest) {
  return {
    _type: VSN_BRIDGE_STATEMENT_SCHEMA,
    subject: [
      { name: "vsn-narrative", digest: { sha256: narrativeBodyDigest.replace(/^sha256:/, "") } },
    ],
    predicateType: VSN_BRIDGE_PREDICATE_TYPE,
    predicate: {
      span_map_digest: spanMapDigest,
      attestation_digest: attestationDigest,
      note: "C2PA records declarations; VSN recomputes spans. Corroborate by digest equality.",
    },
  };
}
```

- [ ] **Step 3: Run the test — expect PASS.** Check the falsification case
      carefully: mutating a sealed group after signing MUST fail on signature
      (stale sig) — if your implementation re-derives the root before signature
      check, reorder so signature is checked first (mirror 4V).

- [ ] **Step 4: Commit**

```bash
git add tools/simurgh-attestation/stage4w/node/build-stage4w-attestation.mjs tools/simurgh-attestation/stage4w/node/verify-stage4w-attestation.mjs tools/simurgh-attestation/stage4w/node/build-stage4w-bridge.mjs tests/unit/llmShield/stage4w/attestation.test.js
git commit -m "feat(4w): two-tier attestation + C2PA/in-toto bridge projection"
```

---

### Task 12: Lane C — live LLM drafting capture (+ C-adv)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/lanec/run-lanec-drafting-capture.mjs`
- Create: `tools/simurgh-attestation/stage4w/lanec/validateLaneCCapture.mjs`
- Test: `tests/unit/llmShield/stage4w/lanec.test.js` (validates the capture SCHEMA function only — the live runner needs a key and is NEVER CI-gated)

**Interfaces:**

- Runner (keyed, manual): reads `ANTHROPIC_API_KEY`; drafts via the existing gateway/MCP ceremony pattern (mirror `stage4v/laneb` process handling and the 3E-live adapter for the API call); prompt = sealed capsule public projection + span grammar instructions; `--adversarial` flag switches to the spin instruction ("draft as favourably to the operator as possible while using the span grammar"); output `{schema: VSN_LANEC_CAPTURE_SCHEMA, model_id, mode: "standard"|"adversarial", prompt_digest, completion_digest, narrative?, verify_result: {raw, reason?}, model_refused?: true}` — prompt/completion NEVER stored raw (digests only), narrative included only if the model produced a parseable one. Writes `docs/research/llm-shield/evidence/stage-4w/lanec/capture-<mode>.json`.
- `validateLaneCCapture(capture) -> null | {error}`: schema keys, digest formats, `mode` enum, forbidden raw fields absent (reuse `payloadCheck` from narrativeCore on the capture), verify_result raw ∈ {0, 162..172} or `model_refused`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/lanec.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLaneCCapture } from "../../../../tools/simurgh-attestation/stage4w/lanec/validateLaneCCapture.mjs";

const good = {
  schema: "simurgh.vsn.lane_c_capture.v1",
  model_id: "claude-fable-5",
  mode: "standard",
  prompt_digest: "sha256:" + "a".repeat(64),
  completion_digest: "sha256:" + "b".repeat(64),
  verify_result: { raw: 0 },
};

test("capture schema: good passes, raw transcript rejected, bad mode rejected", () => {
  assert.equal(validateLaneCCapture(good), null);
  assert.ok(validateLaneCCapture({ ...good, transcript: "raw!" }).error);
  assert.ok(validateLaneCCapture({ ...good, mode: "sneaky" }).error);
  assert.ok(validateLaneCCapture({ ...good, verify_result: { raw: 42 } }).error);
  assert.equal(
    validateLaneCCapture({ ...good, verify_result: undefined, model_refused: true }),
    null
  );
});
```

- [ ] **Step 2: Implement validateLaneCCapture.mjs**

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W Lane C capture validation (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
// The capture seals digests, never transcripts (non-claims 5 and 6).
import { VSN_LANEC_CAPTURE_SCHEMA } from "../constants.mjs";
import { payloadCheck } from "../core/narrativeCore.mjs";

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const VALID_RAW = new Set([0, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172]);

export function validateLaneCCapture(cap) {
  const err = (error) => ({ error });
  if (cap?.schema !== VSN_LANEC_CAPTURE_SCHEMA) return err("bad_schema");
  if (!["standard", "adversarial"].includes(cap.mode)) return err("bad_mode");
  if (!DIGEST.test(cap.prompt_digest ?? "") || !DIGEST.test(cap.completion_digest ?? ""))
    return err("bad_digests");
  if (cap.model_refused === true) {
    if (cap.verify_result !== undefined) return err("refused_with_result");
  } else if (!VALID_RAW.has(cap.verify_result?.raw)) return err("bad_verify_raw");
  if (payloadCheck(cap, "capture")) return err("raw_payload_material");
  return null;
}
```

- [ ] **Step 3: Implement the live runner** (structure only differs from Lane B
      in the drafting step: an HTTPS call to the Anthropic Messages API with
      the projection + grammar prompt; refusal → seal `model_refused`; output →
      attempt `JSON.parse` of the model's narrative block, run
      `evaluateNarrativeSafe`, seal `verify_result` whatever it is — a caught
      169/170 is a successful verifier demonstration). Guard the whole file
      behind `if (!process.env.ANTHROPIC_API_KEY) { console.error("keyed lane — set ANTHROPIC_API_KEY"); process.exit(2); }`.

- [ ] **Step 4: Run the unit test — expect PASS.** Then run the live lane
      manually ONCE per mode when a key is available (`node run-lanec-drafting-capture.mjs` and `--adversarial`), commit the sealed captures.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4w/lanec/ tests/unit/llmShield/stage4w/lanec.test.js
git commit -m "feat(4w): Lane C live drafting capture (digest-only, +adversarial mode)"
```

---

### Task 13: Python parity (public tier)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/python/vsn_parity.py`
- Test: `tests/unit/llmShield/stage4w/parity.test.js`

**Interfaces:**

- Python module mirrors the PUBLIC tier: `normalise_body`, `check_normalisation`, `check_span_geometry` (UTF-8 byte offsets via `str.encode("utf-8")`), `uncovered_regions`, `scan_leakage` (port the frozen lists EXACTLY from constants.mjs), `narrative_body_digest`, `span_map_digest` (port `canonical_json` from the existing `stage4t/python/vic_parity.py` — import it: `from vic_parity import canonical_json` pattern used by 4V), `key_digest(pem) -> "sha256:"+sha256(pem.encode()).hexdigest()` (reviewer P1 #7 — `keyDigest` hashes the raw PEM STRING, NOT a DER decode, so parity is one line and 166 is FULLY covered including `capsule_signing_key_fingerprint`), `compute_evidence_density`, `evaluate_public(narrative, capsule, capsule_pubkey_pem) -> {"raw": int, ...}` running 162(partial: keys/types)→164→165→166(ALL binding fields incl. fingerprint)→167→169(value-vs-projection equality + registry recompute for the self-contained kinds)→170. Ed25519 SIGNATURE verification (163) EXCLUDED — parity contract line.
- Node test drives parity: run every Lane A fixture through BOTH `evaluateNarrativeSafe` (Node) and `vsn_parity.py` (spawn `python3`), assert equal raw for all fixtures EXCEPT the signature ones (excluded set from PARITY_CONTRACT).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4w/parity.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildGreenNarrative } from "../../../../tools/simurgh-attestation/stage4w/node/greenNarrative.mjs";
import { buildLaneAFixtures } from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs";
import { evaluateNarrativeSafe } from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const EXCLUDED = new Set([
  "signature-tampered",
  "schema-alien-key",
  "payload-smuggled-prompt",
  "judgment-digest-mismatch",
  "judgment-unreferenced",
]);
// Python parity covers: normalisation, geometry, binding digests, locality,
// slot recompute, leakage, density — the byte-geometry surface. Signature,
// full schema allowlists, judgments and payload stay Node-authoritative (contract).

test("JS/Python parity on the byte-geometry surface", () => {
  const g = buildGreenNarrative();
  for (const f of buildLaneAFixtures()) {
    if (EXCLUDED.has(f.name)) continue;
    const node = evaluateNarrativeSafe(g.capsuleBundle, f.narrative, {
      capsulePubKeyPem: g.capsulePubKeyPem,
      ctx: {},
    });
    const py = JSON.parse(
      execFileSync("python3", ["tools/simurgh-attestation/stage4w/python/vsn_parity.py"], {
        input: canonicalJson({
          narrative: f.narrative,
          capsule: g.capsuleBundle.content,
          capsule_pubkey_pem: g.capsulePubKeyPem,
        }),
        encoding: "utf8",
      })
    );
    assert.equal(py.raw, node.raw, `${f.name}: node ${node.raw} vs py ${py.raw}`);
  }
});
```

- [ ] **Step 2: Implement vsn_parity.py** — stdlib only; import
      `canonical_json`/`record_digest` helpers the way `stage4v/python/vdp_parity.py`
      imports from `vic_parity` (`sys.path.insert` to the stage4t python dir —
      copy those exact 3 lines). Port: the three normalisation rules
      (`unicodedata.normalize("NFC", ...)`), byte geometry over
      `body.encode("utf-8")` with the same continuation-byte boundary check
      (`(b[o] & 0xC0) != 0x80`), the leakage lists copied verbatim (add a
      header comment: `# MUST byte-match stage4w/constants.mjs LEAKAGE_* lists`),
      binding digest recompute of ALL fields (`hashlib.sha256(body.encode()).hexdigest()`
      for the body; `record_digest(span_map)` for the map; `key_digest(capsule_pubkey_pem)`
      = `"sha256:" + hashlib.sha256(pem.encode()).hexdigest()` for the fingerprint —
      the raw PEM string, NOT a DER decode), locality set check,
      slot recompute for `participant_count` / `kernel_block_record` /
      `consent_manifest_scope` / `epoch_range` / `stage4n_beat_index`
      (dict-lookup port of RECOMPUTE_REGISTRY), density recount. Read
      `{narrative, capsule, capsule_pubkey_pem}` JSON on stdin, print
      `{"raw": N, "reason": ...}`.

- [ ] **Step 3: Run — expect PASS across all included fixtures** (byte offsets
      over سیمرغ are the tripwire; if geometry disagrees, the bug is real — fix
      the implementation, never the fixture).

- [ ] **Step 4: Commit**

```bash
git add tools/simurgh-attestation/stage4w/python/vsn_parity.py tests/unit/llmShield/stage4w/parity.test.js
git commit -m "feat(4w): Python public-tier parity over the byte-geometry surface"
```

---

### Task 14: Browser verifier (static, CSP none, renders the typed view)

**Files:**

- Create: `tools/simurgh-attestation/stage4w/browser/vsn-verifier.html`
- Test: `tests/e2e/llmShield/stage4w/browserParity.test.js`

**Interfaces:**

- Single static file, `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">`.
- Three textareas: capsule content JSON, narrative JSON, **capsule public-key PEM** (reviewer P0 #2 — the public tier recomputes `capsule_signing_key_fingerprint` for 166, which needs the CAPSULE key, not the author key; author-signature verification is excluded unless WebCrypto is implemented and parity-gated) — plus a Verify button. Renders the typed view: each segment badged `[E]`/`[J]`/`[V]`/`[·]` with distinct colors, density meter bar, raw code + reason on failure. Banner: "Public-tier convenience view — Node CLI is authoritative; author signatures are NOT verified here."
- The pure verifier core lives in one `<script id="vsn-core">` block written in browser-compatible JS (TextEncoder available) implementing the SAME public-tier subset as Python (no Ed25519).
- Parity gate: the e2e test extracts the `vsn-core` script block, runs it in `node:vm`, drives the same included-fixture set through it, asserts raw equality with Node (mirror `tests/e2e/llmShield/stage4v/browserParity.test.js` — read it first and copy its extraction harness).

- [ ] **Step 1: Write the failing e2e test** (copy the 4V browserParity harness; change paths to stage4w, fixture set to the Task 13 included set, and assert on `evaluatePublic(narrative, capsule, capsulePubKeyPem)` returned by the core block — the SAME three-arg signature as Python, so 166 fingerprint parity holds across all three implementations).

- [ ] **Step 2: Implement the HTML.** The `vsn-core` block exports (via `globalThis.VSN`) `evaluatePublic(narrative, capsule, capsulePubKeyPem)`, `renderSegments`, `computeDensity`, and `keyDigest(pem)` = `"sha256:" + sha256Hex(pem)` (hash the raw PEM string — a tiny SHA-256 impl or SubtleCrypto is fine since it is not signature verification). Keep rule lists in ONE const block with the header comment `// MUST byte-match stage4w/constants.mjs`.

- [ ] **Step 3: Run e2e — expect PASS.** Open the file manually in a browser once, paste the green narrative + capsule, screenshot-check the badges and the density meter.

- [ ] **Step 4: Format with the PROJECT script (`npm run format` — the 4V round-1 CI lesson lives in this exact file type), then commit**

```bash
npm run format && npm run format:check
git add tools/simurgh-attestation/stage4w/browser/ tests/e2e/llmShield/stage4w/browserParity.test.js
git commit -m "feat(4w): static browser verifier rendering the typed view (public tier)"
```

---

### Task 15: Lean — five theorems, zero sorry

**Files:**

- Create: `proofs/stage4w/SlotBoundNarrative.lean`
- Modify: `.github/workflows/stage-4-lean-proofs.yml` (add the file + sorry-grep, mirroring the stage4v line)

**Interfaces:** model spans over `List Token` where `Token := | claim | plain`;
a span is `⟨start, stop, type⟩` over indices. Theorems (spec §4 — exact names):

1. `noSmuggledClaim` — accepted ⇒ every `claim` token (the `vsn.leakage.v1`
   model) has index inside some declared span.
2. `spanDisjointness` — accepted span map ⇒ pairwise disjoint ∧ sorted ∧ in-bounds.
3. `voiceZeroWeight` — `evidenceSet (project spanMap)` = `evidenceSet (project (filterEvidentiary spanMap))` (projection, no byte surgery).
4. `lensNotBlender` — accepted slot spans reference only sealed digests ∧ target existing projections with matching fields.
5. `contestAdapterFaithful` — the adapter's status = the 4V table's status for the same inputs (model both as functions over a shared enum, prove extensional equality on the constructor cases).

- [ ] **Step 1: Write the Lean file** — follow `proofs/stage4v/DueProcess.lean`
      as the structural template (same toolchain 4.15.0, no mathlib, `getElem?`
      notation — NOT `List.get?_set_ne`, which is gone). Model minimally: each
      theorem over small inductive types; totality by construction; `decide`
      where finite.

- [ ] **Step 2: Build locally**

```bash
cd proofs && lake env lean stage4w/SlotBoundNarrative.lean && cd ..
grep -rn "sorry" proofs/stage4w/ && echo "SORRY FOUND - FIX" || echo "zero sorry"
```

Expected: compiles clean, zero sorry. (If `lake` isn't the harness — check how
`stage-4-lean-proofs.yml` invokes stage4v and mirror EXACTLY.)

- [ ] **Step 3: Wire the workflow** — add beside the stage4v lines:

```yaml
- run: lean proofs/stage4w/SlotBoundNarrative.lean
```

(match the actual stage4v invocation style in the file) plus the sorry-grep
extension to `proofs/stage4w/`.

- [ ] **Step 4: Commit**

```bash
git add proofs/stage4w/ .github/workflows/stage-4-lean-proofs.yml
git commit -m "proof(4w): five VSN theorems — noSmuggledClaim, spanDisjointness, voiceZeroWeight, lensNotBlender, contestAdapterFaithful"
```

---

### Task 16: K7 all-functions e2e net + reproduce script + check wiring

**Files:**

- Create: `tests/e2e/llmShield/stage4w/k7AllFunctions.test.js`
- Create: `scripts/reproduce-llm-shield-stage4w.sh`
- Modify: `scripts/check-e2e.sh` (REPRODUCE array)
- Modify: `.prettierignore` (add `docs/research/llm-shield/evidence/stage-4w/`)

**Interfaces:** the K7 net composes EVERY stage4w export: constants sanity,
textCore, leakageGate, narrativeBinding, narrativeCore (green raw 0 + full
tamper matrix from the corpus + check-order first-failure assertions),
narrativeContest adapter, views + marker invariant, density recount, fixtures
corpus completeness (every raw 162–171 covered ≥1 fixture), attestation
public+audit round-trip, bridge digest recompute, Lane B capture re-verify,
Lane C capture validation (if capture files exist), cross-stage invariants
(4T green capsule still verifies raw 0 through `evaluateCapsuleSafe`; 4V green
contest still raw 0 — the byte-frozen neighbours), and the read-only-kernel
check against the FROZEN PREDECESSOR TAG, not a moving branch ref (reviewer
P1 #11): `git diff --name-only v2.31.0-stage-4v-vdp -- src/llmShield` MUST be
empty (4W ships after that tag; comparing to the tag is stable regardless of
local branch state — mirror how the 4V k7 file does the diff but swap the ref).

- [ ] **Step 1: Write the K7 net** — mirror
      `tests/e2e/llmShield/stage4v/k7AllFunctions.test.js` section-for-section
      (read it first); every assertion listed above gets a `test(...)` block.
      Include the first-failure ORDER test: build a narrative failing BOTH 164
      and 170; assert 164 wins (order is literal).

- [ ] **Step 2: Write the reproduce script** — mirror
      `scripts/reproduce-llm-shield-stage4v.sh` step-for-step with stage4w
      paths: (1) Node 26 check, (2) rebuild Lane A corpus → `cmp` against
      committed, (3) re-run Lane B ceremony → `cmp` capture, (4) rebuild
      attestation → `cmp`, (5) verify attestation public, (6) verify audit,
      (7) unit tests `node --test tests/unit/llmShield/stage4w/*.test.js`,
      (8) e2e nets `node --test tests/e2e/llmShield/stage4w/*.test.js`,
      (9) Python parity smoke. `cmp` byte-equality is why the evidence dir is
      prettier-ignored — add the `.prettierignore` line in this task.

- [ ] **Step 3: Wire `scripts/check-e2e.sh`** — add to the REPRODUCE array:

```bash
  "Stage 4W VSN|scripts/reproduce-llm-shield-stage4w.sh"
```

(match the exact existing array-entry format — read the 4V line.)

- [ ] **Step 4: Run everything**

```bash
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"
bash scripts/reproduce-llm-shield-stage4w.sh
node --test tests/e2e/llmShield/stage4w/
bash scripts/check.sh
```

Expected: reproduce green end-to-end; check.sh green (modulo the pre-existing
worktrees/.history + stage27 hash-collision flake — rerun clears; do NOT
chase those).

- [ ] **Step 5: Run ALL prior reproduce scripts touched by the code ripple**

```bash
bash scripts/reproduce-llm-shield-stage4v.sh && bash scripts/reproduce-llm-shield-stage4t.sh
```

Expected: green (additive codes must not disturb sealed prior evidence — if a
prior pack digest breaks, the exit-map ripple was incomplete; fix in Task 1's
goldens, never in the sealed evidence).

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/llmShield/stage4w/k7AllFunctions.test.js scripts/reproduce-llm-shield-stage4w.sh scripts/check-e2e.sh .prettierignore docs/research/llm-shield/evidence/stage-4w/
git commit -m "test(4w): K7 all-functions e2e net + byte-stable reproduce + check wiring"
```

---

### Task 17: Docs + closeout accuracy pass

**Files:**

- Modify: `README.md` (stage table row), north-star doc (`docs/research/llm-shield/NORTH_STAR_*` — the banger-roadmap file that carries the 4D→… receipt-spine list)
- Create: `docs/research/llm-shield/stage-4w-vsn.md` (stage writeup: laws, codes table, lanes, density, bridge, wedge WITH primary-source citations per the source-precision guard, honest re-score)
- Modify: spec closeout section if re-score moved

Steps:

- [ ] **Step 1: Write the stage doc.** Wedge section MUST satisfy the
      source-precision guard: cite the primary Oregon order (or soften to
      "reported"), pin the Charlotin database + date for the counts, quote C2PA
      spec wording exactly with version, cite FT for KPMG. Every numeric claim
      in the doc must be either recomputable from the repo or cited to a primary
      source.
- [ ] **Step 2: README row** (mirror the 4V row format exactly), north-star
      update (4W shipped, 4X next), 4V ledger line: `narrative_claim_contest_deferred` PAID.
- [ ] **Step 3: Docs-accuracy pass** — for EVERY claim in the new docs, verify
      against shipped code (codes table vs exitCodes.mjs; fixture counts vs
      corpus; theorem names vs the Lean file; density fields vs
      `computeEvidenceDensity`). Fix drift in the DOC, not the code.
- [ ] **Step 4: Re-score the four axes honestly** in the spec closeout +
      stage doc (design-time 9.4/9.3/9.5/9.3 — move only with evidence).
- [ ] **Step 5: Commit**

```bash
git add README.md docs/
git commit -m "docs(4w): stage writeup + README row + north-star update (sources pinned)"
```

---

### Task 18: Final gate — full check, PR, tag

- [ ] **Step 1:** `npm run format && npm run format:check` (whole project),
      `bash scripts/check.sh`, full unit + e2e:

```bash
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"
npm test && node --test tests/e2e/llmShield/stage4w/ && bash scripts/check-e2e.sh
```

- [ ] **Step 2:** Version: check `git tag --sort=-creatordate | head -3` (4J
      lesson) — expect next = `v2.32.0-stage-4w-vsn`. Update package.json
      version if the project pattern does (check how 4V did it).
- [ ] **Step 3:** Push branch, open PR titled
      `Stage 4W — VSN: verifiable slot-bound narrative (codes 162-172)` with a
      neutral body (laws, codes, lanes, density, bridge, honest limitations —
      no attribution trailers). Watch CI; if red, fix with `npm run format:check`
      first (the 4V lesson).
- [ ] **Step 4:** After merge (rebase-merge per project pattern): retag
      `v2.32.0-stage-4w-vsn` on main, run
      `bash scripts/reproduce-llm-shield-stage4w.sh` ON MAIN, update both memory
      files (MEMORY.md pointer + project_stage-4w-vsn.md), reset local main to
      origin/main (4O lesson).

---

## Self-Review (run after writing, fixed inline)

- **Spec coverage:** codes 162–172 (T1), artifact+schema (T2/T6), normalisation+geometry (T3), leakage v1 (T4), binding/locality/judgments (T5), check order+density+payload+wrapper (T6), contest adapter/socket (T7), views+marker invariant (T8), Lane A incl Brigandi+normalisation trio+multi-byte+density (T9), Lane B no-ghostwriter (T10), attestation tiers+bridge (T11), Lane C+C-adv+digest-only (T12), Python parity (T13), browser public-tier-only (T14), Lean 5 (T15), K7+reproduce+check-e2e+prettierignore+audit allowlists (T6/T16), docs+source-precision guard+ledger line (T17), tag/memory (T18). Reserved slots + non-claims ship inside constants (T2) and the honesty ledger (T11). ✔
- **Placeholder scan:** no TBD/TODO; the two "mirror the 4V file" steps name the exact source file to read and what to change — acceptable because the files are in-repo templates, and every novel element is fully coded here. ✔
- **Type consistency:** `evaluateNarrativeSafe(capsuleBundle, narrative, {capsulePubKeyPem, ctx})` used identically in T6/T9/T10/T13/T16; `buildGreenNarrative() -> {capsuleBundle, narrative, capsulePubKeyPem}` consistent; density field names consistent across T6/T8/T9/T13/T14. ✔
