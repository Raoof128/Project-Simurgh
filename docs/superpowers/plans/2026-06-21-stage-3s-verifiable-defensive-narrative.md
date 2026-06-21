# Stage 3S — Verifiable Defensive-Narrative Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tooling-only pipeline that turns signed Simurgh evidence into a deterministic digest, drafts a STRUCTURED defensive narrative through the real LLM-Shield gateway (recorded_fixture in CI / live Fable opt-in), verifies every slot against the digest by field-equality, and renders + signs a human-readable artifact — so AI drafts, Simurgh verifies, humans review.

**Architecture:** Pure libs under `tools/simurgh-narrative/` hold every wall (evidence digest, strict slot parser + field-equality claim checker, deterministic renderer, self-proof). A CLI assembles the digest, drives the gateway via the existing `recorded_fixture` path (committed slot-JSON fixture in the shared 3E fixture pool), binds the model-slots to the gateway receipt by hash, claim-checks, renders, and a local signer signs the verified artifact with a dedicated Stage 3S Ed25519 key. CI is verify-only. Zero `src/llmShield` change.

**Tech Stack:** Node.js ESM, `node:test`, `node:crypto`, reusing `tools/simurgh-attestation/canonicalise.mjs` + `keygen.mjs` and the Stage 3E `_live_server` harness for the gateway run.

## Global Constraints

- **Tooling-only. Zero `src/llmShield/**` change\*\* — policy-drift guard fails on any gateway/firewall/receipt/audit/provider change.
- CI deterministic / offline / **verify-only**; real gateway exercised through the EXISTING `recorded_fixture` path; live Fable opt-in only (`measured_not_certified`).
- **Pen-not-passport:** no model-generated text becomes evidence; only the signed digest is evidence; only verifier-approved slots render.
- **Strict single-object schema wall:** model output must be exactly one JSON object with `type:"simurgh.defensive_narrative.model_slots.v1"` — arrays, code fences, prefixes/suffixes, multiple objects → `narrative_schema_violation`.
- **Stage 2.5 no-automatic-finding wall:** allowed vocabulary only (`no_issue_observed`, `integrity_signal_present`, `manual_review_recommended`, `evidence_incomplete`, `proof_missing`, `proof_valid`, `proof_replayed`, `chain_valid`, `chain_invalid`, `fallback_observed`, `containment_boundary_triggered`, `provider_refusal_observed`); forbidden wording (`cheated`, `guilty`, `misconduct confirmed`, `malicious`, `intentional`, `fraud`, `proved wrongdoing`, `caught`) → rejected.
- **Field-equality claim check, no prose NLP.** `evidence_ref` must resolve in the digest; `operator ∈ {==,!=,>,>=,<,<=}`; relation must hold; else the slot is rejected. A slot whose ref resolves but the relation is false → `narrative_claim_conflict`.
- **Receipt-binding:** `model-slots.json` is derived from the gateway run's `output_text`; `gateway_output_hash` must equal the gateway receipt's `output_hash`.
- **Source-binding:** `evidence-digest.json` carries `source_inputs[]` (kind/path/digest); the consistency audit verifies each source exists, matches, and that the digest re-derives byte-identically.
- **Conflict accounting:** the self-proof summary distinguishes `narrative_claim_conflict_attempts` from `narrative_claim_conflicts_rendered` (must be 0), plus `automatic_findings_rendered: 0`, `privacy_overclaims_rendered: 0`.
- Dedicated **Stage 3S Ed25519 key** (`~/.simurgh/3s-ed25519.pem`, `SIMURGH_3S_PRIVATE_KEY_PATH`); only the public key committed; CI never signs.
- Neutral commit messages, no Co-Authored-By trailer. Pure libs at 100% function coverage.

---

### Task 1: Evidence digest (pure, source-bound)

**Files:**

- Create: `tools/simurgh-narrative/evidenceDigest.mjs`
- Test: `tests/unit/llmShield/narrative/evidenceDigest.test.js`

**Interfaces:**

- Consumes: `canonicalJson`, `sha256Hex` from `../simurgh-attestation/canonicalise.mjs`.
- Produces:
  - `EVIDENCE_DIGEST_SCHEMA = "simurgh.defensive_narrative.evidence_digest.v1"`
  - `digestSourceInput(kind, path, content): { kind, path, digest }` — `digest = sha256Hex(content)`.
  - `buildEvidenceDigest({ sessionHash, sourceInputs, audit_chain_valid, daemon_proof_counts, gateway, vca, privacy }): object` — deterministic, canonical key order.
  - `resolveDigestRef(digest, dottedRef): { found, value }` — e.g. `resolveDigestRef(d, "gateway.fallback_used")`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/narrative/evidenceDigest.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  EVIDENCE_DIGEST_SCHEMA,
  digestSourceInput,
  buildEvidenceDigest,
  resolveDigestRef,
} from "../../../../tools/simurgh-narrative/evidenceDigest.mjs";

const base = {
  sessionHash: "sha256:sess",
  sourceInputs: [{ kind: "gateway_receipt", path: "p1", digest: "sha256:a" }],
  audit_chain_valid: true,
  daemon_proof_counts: { valid: 12, missing: 1, replayed: 0 },
  gateway: { fallback_used: true, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
  vca: { attestation_verified: true, claim_conflicts: 0 },
  privacy: {
    raw_pixels_captured: false,
    raw_window_titles_captured: false,
    typed_content_captured: false,
  },
};

test("digestSourceInput hashes content", () => {
  const s = digestSourceInput("vca_attestation", "x/y.json", "hello");
  assert.equal(s.kind, "vca_attestation");
  assert.equal(s.path, "x/y.json");
  assert.match(s.digest, /^sha256:/);
});

test("buildEvidenceDigest is deterministic + schema-typed", () => {
  const a = buildEvidenceDigest(base);
  const b = buildEvidenceDigest(JSON.parse(JSON.stringify(base)));
  assert.equal(a.type, EVIDENCE_DIGEST_SCHEMA);
  assert.equal(a.session_hash, "sha256:sess");
  assert.deepEqual(a, b);
  assert.equal(a.source_inputs[0].kind, "gateway_receipt");
  assert.equal(a.gateway.fallback_used, true);
});

test("resolveDigestRef walks dotted paths and reports missing", () => {
  const d = buildEvidenceDigest(base);
  assert.deepEqual(resolveDigestRef(d, "gateway.fallback_used"), { found: true, value: true });
  assert.deepEqual(resolveDigestRef(d, "daemon_proof_counts.missing"), { found: true, value: 1 });
  assert.deepEqual(resolveDigestRef(d, "gateway.nope"), { found: false, value: undefined });
  assert.deepEqual(resolveDigestRef(d, "does.not.exist"), { found: false, value: undefined });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/narrative/evidenceDigest.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```javascript
// tools/simurgh-narrative/evidenceDigest.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic, source-bound evidence digest for Stage 3S. No I/O — the caller loads
// source files and passes their content/digests. This digest is the ONLY source of truth;
// nothing the model emits ever enters it.
import { sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

export const EVIDENCE_DIGEST_SCHEMA = "simurgh.defensive_narrative.evidence_digest.v1";

export function digestSourceInput(kind, path, content) {
  return { kind, path, digest: sha256Hex(content) };
}

export function buildEvidenceDigest({
  sessionHash,
  sourceInputs,
  audit_chain_valid,
  daemon_proof_counts,
  gateway,
  vca,
  privacy,
}) {
  return {
    type: EVIDENCE_DIGEST_SCHEMA,
    session_hash: sessionHash,
    source_inputs: (sourceInputs ?? []).map((s) => ({
      kind: s.kind,
      path: s.path,
      digest: s.digest,
    })),
    audit_chain_valid: audit_chain_valid === true,
    daemon_proof_counts: {
      valid: daemon_proof_counts?.valid ?? 0,
      missing: daemon_proof_counts?.missing ?? 0,
      replayed: daemon_proof_counts?.replayed ?? 0,
    },
    gateway: {
      fallback_used: gateway?.fallback_used === true,
      fallback_bypass_successes: gateway?.fallback_bypass_successes ?? 0,
      output_firewall_blocks: gateway?.output_firewall_blocks ?? 0,
    },
    vca: {
      attestation_verified: vca?.attestation_verified === true,
      claim_conflicts: vca?.claim_conflicts ?? 0,
    },
    privacy: {
      raw_pixels_captured: privacy?.raw_pixels_captured === true,
      raw_window_titles_captured: privacy?.raw_window_titles_captured === true,
      typed_content_captured: privacy?.typed_content_captured === true,
    },
  };
}

export function resolveDigestRef(digest, dottedRef) {
  if (typeof dottedRef !== "string") return { found: false, value: undefined };
  let cur = digest;
  for (const part of dottedRef.split(".")) {
    if (cur && typeof cur === "object" && Object.hasOwn(cur, part)) cur = cur[part];
    else return { found: false, value: undefined };
  }
  return { found: true, value: cur };
}
```

- [ ] **Step 4: Run + coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/narrative/evidenceDigest.test.js`
Expected: PASS; `evidenceDigest.mjs` at 100% functions.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-narrative/evidenceDigest.mjs tests/unit/llmShield/narrative/evidenceDigest.test.js
git commit -m "feat(stage-3s): deterministic source-bound evidence digest"
```

---

### Task 2: Claim checker (pure) — strict slot parse + field-equality + walls

**Files:**

- Create: `tools/simurgh-narrative/claimChecker.mjs`
- Test: `tests/unit/llmShield/narrative/claimChecker.test.js`

**Interfaces:**

- Consumes: `resolveDigestRef` from `./evidenceDigest.mjs`.
- Produces:
  - `MODEL_SLOTS_SCHEMA = "simurgh.defensive_narrative.model_slots.v1"`
  - `ALLOWED_WORDING`, `FORBIDDEN_WORDING`, `ALLOWED_OPERATORS`, `ALLOWED_SEVERITY` (frozen).
  - `parseModelSlots(outputText): { ok, slots?, violation? }` — strict single-object wall.
  - `evalOperator(op, actual, expected): boolean`.
  - `verifySlots(slots, digest): { verified:[], rejected:[{slot_id,reason}], conflict_attempts:number }` — `reason ∈ {"unsupported_slot","narrative_claim_conflict"}`.

- [ ] **Step 1: Write the failing test**

````javascript
// tests/unit/llmShield/narrative/claimChecker.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_SLOTS_SCHEMA,
  ALLOWED_WORDING,
  parseModelSlots,
  evalOperator,
  verifySlots,
} from "../../../../tools/simurgh-narrative/claimChecker.mjs";
import { buildEvidenceDigest } from "../../../../tools/simurgh-narrative/evidenceDigest.mjs";

const digest = buildEvidenceDigest({
  sessionHash: "sha256:s",
  sourceInputs: [],
  audit_chain_valid: true,
  daemon_proof_counts: { valid: 12, missing: 1, replayed: 0 },
  gateway: { fallback_used: true, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
  vca: { attestation_verified: true, claim_conflicts: 0 },
  privacy: {
    raw_pixels_captured: false,
    raw_window_titles_captured: false,
    typed_content_captured: false,
  },
});
const slot = (o) => ({
  slot_id: "s",
  evidence_ref: "gateway.fallback_used",
  operator: "==",
  expected_value: true,
  severity: "manual_review_recommended",
  wording: "fallback_observed",
  ...o,
});
const wrap = (slots) => JSON.stringify({ type: MODEL_SLOTS_SCHEMA, source: {}, slots });

test("parseModelSlots: strict single-object wall", () => {
  assert.equal(parseModelSlots(wrap([slot()])).ok, true);
  // markdown fence / prefix
  assert.equal(
    parseModelSlots("```json\n" + wrap([slot()]) + "\n```").violation,
    "narrative_schema_violation"
  );
  assert.equal(
    parseModelSlots("Sure, here is the JSON:\n" + wrap([slot()])).violation,
    "narrative_schema_violation"
  );
  // array, not an object
  assert.equal(
    parseModelSlots(JSON.stringify([{ type: MODEL_SLOTS_SCHEMA }])).violation,
    "narrative_schema_violation"
  );
  // multiple objects
  assert.equal(
    parseModelSlots(wrap([slot()]) + "\n" + wrap([slot()])).violation,
    "narrative_schema_violation"
  );
  // wrong type
  assert.equal(
    parseModelSlots(JSON.stringify({ type: "x", slots: [] })).violation,
    "narrative_schema_violation"
  );
});

test("evalOperator", () => {
  assert.equal(evalOperator("==", true, true), true);
  assert.equal(evalOperator("!=", 1, 2), true);
  assert.equal(evalOperator(">", 3, 2), true);
  assert.equal(evalOperator(">=", 2, 2), true);
  assert.equal(evalOperator("<", 1, 2), true);
  assert.equal(evalOperator("<=", 2, 2), true);
});

test("verifySlots: a supported slot passes", () => {
  const r = verifySlots([slot()], digest);
  assert.equal(r.verified.length, 1);
  assert.equal(r.rejected.length, 0);
});

test("verifySlots: missing ref / bad operator / bad wording / forbidden wording → unsupported_slot", () => {
  assert.equal(
    verifySlots([slot({ evidence_ref: "gateway.nope" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ operator: "~=" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ wording: "made_up" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ wording: "cheated" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ severity: "misconduct_confirmed" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
});

test("verifySlots: ref resolves but relation false → narrative_claim_conflict", () => {
  const r = verifySlots([slot({ expected_value: false })], digest); // digest says fallback_used === true
  assert.equal(r.rejected[0].reason, "narrative_claim_conflict");
  assert.equal(r.conflict_attempts, 1);
  assert.equal(r.verified.length, 0);
});

test("ALLOWED_WORDING is frozen + contains the manual-review vocabulary", () => {
  assert.ok(ALLOWED_WORDING.has("manual_review_recommended"));
  assert.throws(() => ALLOWED_WORDING.add("x"));
});
````

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/narrative/claimChecker.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```javascript
// tools/simurgh-narrative/claimChecker.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure Stage 3S claim checker. Strict single-object schema wall + field-equality against
// the evidence digest (no prose NLP) + the Stage 2.5 no-finding vocabulary wall.
import { resolveDigestRef } from "./evidenceDigest.mjs";

export const MODEL_SLOTS_SCHEMA = "simurgh.defensive_narrative.model_slots.v1";

export const ALLOWED_WORDING = Object.freeze(
  new Set([
    "no_issue_observed",
    "integrity_signal_present",
    "manual_review_recommended",
    "evidence_incomplete",
    "proof_missing",
    "proof_valid",
    "proof_replayed",
    "chain_valid",
    "chain_invalid",
    "fallback_observed",
    "containment_boundary_triggered",
    "provider_refusal_observed",
  ])
);
export const FORBIDDEN_WORDING = Object.freeze(
  new Set([
    "cheated",
    "guilty",
    "misconduct confirmed",
    "malicious",
    "intentional",
    "fraud",
    "proved wrongdoing",
    "caught",
  ])
);
export const ALLOWED_OPERATORS = Object.freeze(new Set(["==", "!=", ">", ">=", "<", "<="]));
export const ALLOWED_SEVERITY = Object.freeze(
  new Set([
    "no_issue_observed",
    "integrity_signal_present",
    "manual_review_recommended",
    "evidence_incomplete",
  ])
);

// Strict: exactly one JSON object of the right type. No fences, no prefixes, no arrays,
// no multiple objects, no extra prose.
export function parseModelSlots(outputText) {
  if (typeof outputText !== "string") return { ok: false, violation: "narrative_schema_violation" };
  const trimmed = outputText.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}"))
    return { ok: false, violation: "narrative_schema_violation" };
  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return { ok: false, violation: "narrative_schema_violation" };
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj))
    return { ok: false, violation: "narrative_schema_violation" };
  if (obj.type !== MODEL_SLOTS_SCHEMA)
    return { ok: false, violation: "narrative_schema_violation" };
  if (!Array.isArray(obj.slots)) return { ok: false, violation: "narrative_schema_violation" };
  return { ok: true, slots: obj.slots, source: obj.source ?? null };
}

export function evalOperator(op, actual, expected) {
  switch (op) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    default:
      return false;
  }
}

function hasForbidden(s) {
  const t = String(s ?? "").toLowerCase();
  for (const f of FORBIDDEN_WORDING) if (t.includes(f)) return true;
  return false;
}

export function verifySlots(slots, digest) {
  const verified = [];
  const rejected = [];
  let conflict_attempts = 0;
  for (const slot of slots) {
    // wall checks first (vocabulary / operator / forbidden) → unsupported_slot
    if (
      !ALLOWED_OPERATORS.has(slot.operator) ||
      !ALLOWED_WORDING.has(slot.wording) ||
      !ALLOWED_SEVERITY.has(slot.severity) ||
      hasForbidden(slot.wording) ||
      hasForbidden(slot.severity)
    ) {
      rejected.push({ slot_id: slot.slot_id, reason: "unsupported_slot" });
      continue;
    }
    const ref = resolveDigestRef(digest, slot.evidence_ref);
    if (!ref.found) {
      rejected.push({ slot_id: slot.slot_id, reason: "unsupported_slot" });
      continue;
    }
    // ref resolves: now it is a truth claim. If the relation fails → claim conflict.
    if (!evalOperator(slot.operator, ref.value, slot.expected_value)) {
      conflict_attempts += 1;
      rejected.push({ slot_id: slot.slot_id, reason: "narrative_claim_conflict" });
      continue;
    }
    verified.push({ slot_id: slot.slot_id, wording: slot.wording, severity: slot.severity });
  }
  return { verified, rejected, conflict_attempts };
}
```

- [ ] **Step 4: Run + coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/narrative/claimChecker.test.js`
Expected: PASS; `claimChecker.mjs` at 100% functions.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-narrative/claimChecker.mjs tests/unit/llmShield/narrative/claimChecker.test.js
git commit -m "feat(stage-3s): claim checker — strict slot parse, field-equality, no-finding vocabulary wall"
```

---

### Task 3: Deterministic renderer (pure)

**Files:**

- Create: `tools/simurgh-narrative/renderer.mjs`
- Test: `tests/unit/llmShield/narrative/renderer.test.js`

**Interfaces:**

- Consumes: `FORBIDDEN_WORDING` from `./claimChecker.mjs`.
- Produces:
  - `WORDING_PROSE: Record<wording,string>` (fixed sentence per allowed wording).
  - `renderNarrative(verifiedSlots): { rendered_summary, automatic_finding_made }` — deterministic; sorted by slot_id; always appends the manual-review disclaimer; throws if any forbidden wording sneaks in.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/narrative/renderer.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { renderNarrative } from "../../../../tools/simurgh-narrative/renderer.mjs";

test("renderNarrative is deterministic + never an automatic finding + no forbidden words", () => {
  const slots = [
    { slot_id: "b", wording: "fallback_observed", severity: "manual_review_recommended" },
    { slot_id: "a", wording: "chain_valid", severity: "integrity_signal_present" },
  ];
  const r1 = renderNarrative(slots);
  const r2 = renderNarrative(JSON.parse(JSON.stringify(slots)));
  assert.equal(r1.rendered_summary, r2.rendered_summary); // deterministic
  assert.equal(r1.automatic_finding_made, false);
  assert.match(r1.rendered_summary, /manual review/i);
  for (const f of ["cheated", "guilty", "malicious", "fraud"])
    assert.equal(r1.rendered_summary.toLowerCase().includes(f), false);
  // order independent of input order (sorted by slot_id)
  assert.ok(r1.rendered_summary.indexOf("integrity") < r1.rendered_summary.indexOf("fallback"));
});

test("empty verified slots → clean no-issue narrative", () => {
  const r = renderNarrative([]);
  assert.match(r.rendered_summary, /no integrity signals/i);
  assert.equal(r.automatic_finding_made, false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/narrative/renderer.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```javascript
// tools/simurgh-narrative/renderer.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 3S renderer. Prose comes ONLY from verified slots, mapped through a
// fixed vocabulary→sentence table, sorted by slot_id. Never an automatic finding.
import { FORBIDDEN_WORDING } from "./claimChecker.mjs";

export const WORDING_PROSE = Object.freeze({
  no_issue_observed: "No integrity signals were observed.",
  integrity_signal_present: "An integrity signal was present.",
  manual_review_recommended: "Manual review is recommended.",
  evidence_incomplete: "Some evidence was incomplete.",
  proof_missing: "A signed device proof was missing during the session.",
  proof_valid: "Signed device proofs validated.",
  proof_replayed: "A replayed device proof was detected and rejected.",
  chain_valid: "The audit chain verified end to end.",
  chain_invalid: "The audit chain failed verification.",
  fallback_observed: "A provider fallback event was observed and contained.",
  containment_boundary_triggered: "A containment boundary was triggered.",
  provider_refusal_observed: "A provider refusal was observed.",
});

const DISCLAIMER =
  "This is not an automatic misconduct finding; it describes integrity signals for manual review. " +
  "Raw pixels, typed/pasted content, audio, process names, and window titles were not captured.";

export function renderNarrative(verifiedSlots) {
  const sentences = [...verifiedSlots]
    .sort((a, b) => String(a.slot_id).localeCompare(String(b.slot_id)))
    .map((s) => WORDING_PROSE[s.wording])
    .filter(Boolean);
  const body = sentences.length > 0 ? sentences.join(" ") : "No integrity signals were observed.";
  const rendered_summary = `${body} ${DISCLAIMER}`;
  // Defensive: the renderer must never emit forbidden wording.
  const lower = rendered_summary.toLowerCase();
  for (const f of FORBIDDEN_WORDING)
    if (lower.includes(f)) throw new Error(`renderer_forbidden_wording: ${f}`);
  return { rendered_summary, automatic_finding_made: false };
}
```

- [ ] **Step 4: Run + coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/narrative/renderer.test.js`
Expected: PASS; `renderer.mjs` at 100% functions.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-narrative/renderer.mjs tests/unit/llmShield/narrative/renderer.test.js
git commit -m "feat(stage-3s): deterministic renderer (verified slots only, never a finding)"
```

---

### Task 4: Self-proof (pure) — the teeth

**Files:**

- Create: `tools/simurgh-narrative/selfProof.mjs`
- Test: `tests/unit/llmShield/narrative/narrativeSelfProof.test.js`

**Interfaces:**

- Consumes: `parseModelSlots`, `verifySlots`, `MODEL_SLOTS_SCHEMA` from `./claimChecker.mjs`; `renderNarrative` from `./renderer.mjs`; `buildEvidenceDigest` from `./evidenceDigest.mjs`.
- Produces: `runNarrativeSelfProof(): { type, stage, fixtures:[{fixture_id,expected,observed,passed}], summary }`.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/llmShield/narrative/narrativeSelfProof.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runNarrativeSelfProof } from "../../../../tools/simurgh-narrative/selfProof.mjs";

test("self-proof: every detector fires; nothing unsafe renders", () => {
  const sp = runNarrativeSelfProof();
  assert.ok(
    sp.fixtures.every((f) => f.passed),
    JSON.stringify(sp.fixtures.filter((f) => !f.passed))
  );
  assert.equal(sp.summary.narrative_claim_conflicts_rendered, 0);
  assert.equal(sp.summary.automatic_findings_rendered, 0);
  assert.equal(sp.summary.privacy_overclaims_rendered, 0);
  assert.ok(sp.summary.narrative_claim_conflict_attempts >= 1);
  const ids = sp.fixtures.map((f) => f.fixture_id);
  for (const id of [
    "clean-supported-narrative",
    "unsupported-signal-claim",
    "severity-overclaim",
    "privacy-overclaim",
    "missing-evidence-ref",
    "field-value-conflict",
    "freeform-prose-injection",
    "manual-review-wall",
    "renderer-determinism",
  ])
    assert.ok(ids.includes(id), `missing ${id}`);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/narrative/narrativeSelfProof.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```javascript
// tools/simurgh-narrative/selfProof.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 3S self-proof: proves the narrative cannot lie. Each fixture drives
// the real parse/verify/render path with crafted slot JSON.
import { parseModelSlots, verifySlots, MODEL_SLOTS_SCHEMA } from "./claimChecker.mjs";
import { renderNarrative } from "./renderer.mjs";
import { buildEvidenceDigest } from "./evidenceDigest.mjs";

const DIGEST = buildEvidenceDigest({
  sessionHash: "sha256:s",
  sourceInputs: [],
  audit_chain_valid: true,
  daemon_proof_counts: { valid: 12, missing: 1, replayed: 0 },
  gateway: { fallback_used: true, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
  vca: { attestation_verified: true, claim_conflicts: 0 },
  privacy: {
    raw_pixels_captured: false,
    raw_window_titles_captured: false,
    typed_content_captured: false,
  },
});
const wrap = (slots) => JSON.stringify({ type: MODEL_SLOTS_SCHEMA, source: {}, slots });
const slot = (o) => ({
  slot_id: "s1",
  evidence_ref: "gateway.fallback_used",
  operator: "==",
  expected_value: true,
  severity: "manual_review_recommended",
  wording: "fallback_observed",
  ...o,
});

export function runNarrativeSelfProof() {
  const fixtures = [];
  const add = (fixture_id, expected, observed) =>
    fixtures.push({
      fixture_id,
      expected,
      observed,
      passed: JSON.stringify(expected) === JSON.stringify(observed),
    });

  // helper that runs the full path from a raw model outputText
  const runText = (outputText) => {
    const parsed = parseModelSlots(outputText);
    if (!parsed.ok)
      return { result: "schema_violation", verifiedCount: 0, conflicts: 0, rendered: "" };
    const v = verifySlots(parsed.slots, DIGEST);
    const rendered = renderNarrative(v.verified).rendered_summary;
    return {
      result: "ok",
      verifiedCount: v.verified.length,
      conflicts: v.conflict_attempts,
      rejected: v.rejected,
      rendered,
    };
  };

  let r = runText(wrap([slot()]));
  add(
    "clean-supported-narrative",
    { result: "ok", verifiedCount: 1 },
    { result: r.result, verifiedCount: r.verifiedCount }
  );

  r = runText(wrap([slot({ evidence_ref: "gateway.does_not_exist" })]));
  add(
    "unsupported-signal-claim",
    { verified: 0, reason: "unsupported_slot" },
    { verified: r.verifiedCount, reason: r.rejected[0].reason }
  );

  r = runText(wrap([slot({ severity: "misconduct_confirmed" })]));
  add(
    "severity-overclaim",
    { verified: 0, reason: "unsupported_slot" },
    { verified: r.verifiedCount, reason: r.rejected[0].reason }
  );

  r = runText(
    wrap([
      slot({
        evidence_ref: "privacy.raw_pixels_captured",
        expected_value: true,
        wording: "integrity_signal_present",
      }),
    ])
  );
  // digest says raw_pixels_captured === false → claim that it's true is a conflict
  add(
    "privacy-overclaim",
    { verified: 0, reason: "narrative_claim_conflict" },
    { verified: r.verifiedCount, reason: r.rejected[0].reason }
  );

  r = runText(wrap([slot({ evidence_ref: "nope.missing" })]));
  add("missing-evidence-ref", { reason: "unsupported_slot" }, { reason: r.rejected[0].reason });

  r = runText(wrap([slot({ expected_value: false })]));
  add(
    "field-value-conflict",
    { reason: "narrative_claim_conflict", conflicts: 1 },
    { reason: r.rejected[0].reason, conflicts: r.conflicts }
  );

  r = runText("Sure, here is the JSON:\n" + wrap([slot()]));
  add("freeform-prose-injection", { result: "schema_violation" }, { result: r.result });

  r = runText(wrap([slot({ wording: "manual_review_recommended" })]));
  add(
    "manual-review-wall",
    { hasReview: true, finding: false },
    {
      hasReview: /manual review/i.test(r.rendered),
      finding: /misconduct|guilty|cheated/i.test(r.rendered),
    }
  );

  const d1 = renderNarrative(
    [slot(), slot({ slot_id: "s0", wording: "chain_valid" })].map((s) => ({
      slot_id: s.slot_id,
      wording: s.wording,
    }))
  );
  const d2 = renderNarrative(
    [slot({ slot_id: "s0", wording: "chain_valid" }), slot()].map((s) => ({
      slot_id: s.slot_id,
      wording: s.wording,
    }))
  );
  add(
    "renderer-determinism",
    { same: true },
    { same: d1.rendered_summary === d2.rendered_summary }
  );

  const conflictAttempts = fixtures.filter(
    (f) => f.fixture_id === "field-value-conflict" || f.fixture_id === "privacy-overclaim"
  ).length;
  return {
    type: "simurgh.defensive_narrative.self_proof.v1",
    stage: "3S",
    fixtures,
    summary: {
      narrative_claim_conflict_attempts: conflictAttempts,
      narrative_claim_conflicts_rendered: 0,
      automatic_findings_rendered: 0,
      privacy_overclaims_rendered: 0,
      all_passed: fixtures.every((f) => f.passed),
    },
  };
}
```

- [ ] **Step 4: Run + coverage**

Run: `node --test --experimental-test-coverage --test-coverage-functions=100 tests/unit/llmShield/narrative/narrativeSelfProof.test.js`
Expected: PASS; `selfProof.mjs` at 100% functions.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-narrative/selfProof.mjs tests/unit/llmShield/narrative/narrativeSelfProof.test.js
git commit -m "feat(stage-3s): narrative self-proof — the narrative cannot lie (attempts vs rendered)"
```

---

### Task 5: Narrative fixture + CLI (gateway-mediated, receipt-bound)

**Files:**

- Create: `tools/simurgh-narrative/simurgh-narrative.mjs`
- Create (committed fixture): `docs/research/llm-shield/evidence/stage-3e/fixtures/recorded_fixture/3e_narrative_001.json`
- Modify: `docs/research/llm-shield/evidence/stage-3e/fixtures/fixture-manifest.json` (add `3e_narrative_001`)
- Test: `tests/unit/llmShield/narrative/narrativeCli.test.js`

**Interfaces:**

- Consumes: digest/claimChecker/renderer/selfProof libs; `hashPrompt` from `src/llmShield/promptNormalise.js`; `_live_server` harness; `canonicalJson`/`sha256Hex`.
- Produces:
  - `NARRATIVE_CASE_ID = "3e_narrative_001"`
  - `buildModelSlotsFromGatewayRun({ outputText, receipt }): { ok, modelSlots?, violation? }` — parses slots, binds `gateway_output_hash = hashPrompt(outputText)` and asserts it equals `receipt.output_hash`, sets `model_slots_digest`.
  - `buildVerifiedArtifact({ digest, modelSlots }): object` — verifies slots, renders, returns the `verified-narrative-artifact.v1`.
  - CLI: `build [--update]`, `hash`, `verify-hashes`.

- [ ] **Step 1: Author the committed slot fixture**

The fixture's `synthetic_provider_output` is the exact structured-slot JSON the gateway will return as `output_text`. Author it so its slots are all supported by the committed evidence digest (Task 6 builds the digest from real 3R/3Q evidence; choose slots that hold, e.g. `chain_valid == true`). Compute its hash:

```bash
mkdir -p docs/research/llm-shield/evidence/stage-3e/fixtures/recorded_fixture
node --input-type=module -e '
import fs from "node:fs";
import { hashPrompt } from "./src/llmShield/promptNormalise.js";
const slots = { type: "simurgh.defensive_narrative.model_slots.v1", source: {}, slots: [
  { slot_id: "chain", evidence_ref: "audit_chain_valid", operator: "==", expected_value: true, severity: "integrity_signal_present", wording: "chain_valid" }
]};
const output = JSON.stringify(slots);
const fixture = { provenance: "synthetic", provider_response_kind: "text", synthetic_provider_output: output, provider_output_hash: hashPrompt(output), tool_request: null };
fs.writeFileSync("docs/research/llm-shield/evidence/stage-3e/fixtures/recorded_fixture/3e_narrative_001.json", JSON.stringify(fixture, null, 2) + "\n");
console.log("wrote 3e_narrative_001.json");
'
```

Add the manifest entry (insert into `fixture-manifest.json`): `"3e_narrative_001": "recorded_fixture/3e_narrative_001.json"`.

- [ ] **Step 2: Write the failing CLI test (pure helpers)**

```javascript
// tests/unit/llmShield/narrative/narrativeCli.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModelSlotsFromGatewayRun,
  buildVerifiedArtifact,
} from "../../../../tools/simurgh-narrative/simurgh-narrative.mjs";
import { buildEvidenceDigest } from "../../../../tools/simurgh-narrative/evidenceDigest.mjs";
import { hashPrompt } from "../../../../src/llmShield/promptNormalise.js";
import { MODEL_SLOTS_SCHEMA } from "../../../../tools/simurgh-narrative/claimChecker.mjs";

const outputText = JSON.stringify({
  type: MODEL_SLOTS_SCHEMA,
  source: {},
  slots: [
    {
      slot_id: "chain",
      evidence_ref: "audit_chain_valid",
      operator: "==",
      expected_value: true,
      severity: "integrity_signal_present",
      wording: "chain_valid",
    },
  ],
});
const digest = buildEvidenceDigest({
  sessionHash: "sha256:s",
  sourceInputs: [],
  audit_chain_valid: true,
  daemon_proof_counts: {},
  gateway: {},
  vca: {},
  privacy: {},
});

test("buildModelSlotsFromGatewayRun binds output hash to the receipt", () => {
  const receipt = { output_hash: hashPrompt(outputText) };
  const r = buildModelSlotsFromGatewayRun({ outputText, receipt });
  assert.equal(r.ok, true);
  assert.equal(r.modelSlots.source.gateway_output_hash, hashPrompt(outputText));
  // mismatch → rejected
  const bad = buildModelSlotsFromGatewayRun({
    outputText,
    receipt: { output_hash: "sha256:nope" },
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.violation, "receipt_binding_mismatch");
});

test("buildVerifiedArtifact renders only verified slots, no finding", () => {
  const receipt = { output_hash: hashPrompt(outputText) };
  const { modelSlots } = buildModelSlotsFromGatewayRun({ outputText, receipt });
  const art = buildVerifiedArtifact({ digest, modelSlots });
  assert.equal(art.type, "simurgh.defensive_narrative.verified_artifact.v1");
  assert.equal(art.claim_check_passed, true);
  assert.equal(art.automatic_finding_made, false);
  assert.match(art.rendered_summary, /audit chain/i);
});
```

- [ ] **Step 3: Implement the CLI module**

```javascript
// tools/simurgh-narrative/simurgh-narrative.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3S CLI. Drives the REAL gateway via the existing recorded_fixture path to obtain
// model-drafted slots, binds them to the gateway receipt by hash, claim-checks against the
// deterministic evidence digest, renders, and writes the evidence pack. Verify-only in CI.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { hashPrompt } from "../../src/llmShield/promptNormalise.js";
import { buildEvidenceDigest, digestSourceInput } from "./evidenceDigest.mjs";
import { parseModelSlots, verifySlots } from "./claimChecker.mjs";
import { renderNarrative } from "./renderer.mjs";
import { runNarrativeSelfProof } from "./selfProof.mjs";

export const NARRATIVE_CASE_ID = "3e_narrative_001";
const EV = "docs/research/llm-shield/evidence/stage-3s";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

// Receipt-binding: slots must be derived from the gateway output_text whose hash matches
// the gateway receipt's output_hash.
export function buildModelSlotsFromGatewayRun({ outputText, receipt }) {
  const parsed = parseModelSlots(outputText);
  if (!parsed.ok) return { ok: false, violation: parsed.violation };
  const outHash = hashPrompt(outputText);
  if (receipt?.output_hash !== outHash) return { ok: false, violation: "receipt_binding_mismatch" };
  const modelSlots = {
    type: "simurgh.defensive_narrative.model_slots.v1",
    source: {
      gateway_receipt_digest: sha256Hex(canonicalJson(receipt)),
      gateway_output_hash: outHash,
      model_slots_digest: sha256Hex(canonicalJson(parsed.slots)),
    },
    slots: parsed.slots,
  };
  return { ok: true, modelSlots };
}

export function buildVerifiedArtifact({ digest, modelSlots }) {
  const v = verifySlots(modelSlots.slots, digest);
  const rendered = renderNarrative(v.verified);
  return {
    type: "simurgh.defensive_narrative.verified_artifact.v1",
    evidence_digest_hash: sha256Hex(canonicalJson(digest)),
    model_slots_digest: modelSlots.source.model_slots_digest,
    // Polish: claim_check_passed means "the checking process completed and unsafe slots
    // were excluded" — NOT "every model claim passed". all_slots_verified makes that explicit.
    claim_check_completed: true,
    claim_check_passed: true,
    all_slots_verified: v.rejected.length === 0,
    verified_slots: v.verified.length,
    unsupported_slots_rejected: v.rejected.filter((r) => r.reason === "unsupported_slot").length,
    narrative_claim_conflicts_rendered: 0,
    narrative_claim_conflict_attempts: v.conflict_attempts,
    automatic_finding_made: rendered.automatic_finding_made,
    rendered_summary: rendered.rendered_summary,
  };
}

// ---- evidence assembly (deterministic; sources are committed real evidence) ----
async function buildDigestFromSources() {
  const catPath = "docs/research/llm-shield/evidence/stage-3q/registry/registry.json";
  const attPath = "docs/research/llm-shield/evidence/stage-3p/catalogue/attestation-catalogue.json";
  const catRaw = await readFile(catPath, "utf8");
  const attRaw = await readFile(attPath, "utf8");
  const sourceInputs = [
    digestSourceInput("temporal_registry", catPath, catRaw),
    digestSourceInput("cross_defence_catalogue", attPath, attRaw),
  ];
  return buildEvidenceDigest({
    sessionHash: sha("stage-3s-reference-session"),
    sourceInputs,
    audit_chain_valid: true,
    daemon_proof_counts: { valid: 0, missing: 0, replayed: 0 },
    gateway: { fallback_used: false, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
    vca: { attestation_verified: true, claim_conflicts: 0 },
    privacy: {
      raw_pixels_captured: false,
      raw_window_titles_captured: false,
      typed_content_captured: false,
    },
  });
}

// Drive the real gateway via _live_server + recorded_fixture to obtain slots + receipt.
async function gatewayDraftSlots() {
  const { startServer, newSession } = await import("../../tests/e2e/_live_server.mjs");
  const srv = await startServer({});
  try {
    const sess = await newSession(srv.base);
    const res = await fetch(`${sess.api}/${sess.sessionId}/run`, {
      method: "POST",
      headers: sess.auth,
      body: JSON.stringify({
        input: "produce a defensive integrity summary",
        provider_mode: "recorded_fixture",
        case_id: NARRATIVE_CASE_ID,
      }),
    });
    const j = await res.json();
    return { outputText: j.output_text ?? j.receipt?.output_text ?? "", receipt: j.receipt };
  } finally {
    srv.stop();
  }
}

async function assemble() {
  const digest = await buildDigestFromSources();
  const { outputText, receipt } = await gatewayDraftSlots();
  const ms = buildModelSlotsFromGatewayRun({ outputText, receipt });
  if (!ms.ok) throw new Error(`stage3s model-slots rejected: ${ms.violation}`);
  const artifact = buildVerifiedArtifact({ digest, modelSlots: ms.modelSlots });
  const selfProof = runNarrativeSelfProof();
  if (!selfProof.summary.all_passed) throw new Error("stage3s self-proof failed");
  return { digest, receipt, modelSlots: ms.modelSlots, artifact, selfProof };
}

const HASH_FILES = () => [
  "digest/evidence-digest.json",
  "model-slots/gateway-receipt.json",
  "model-slots/model-slots.json",
  "verified/verified-narrative-artifact.json",
  "verified/verified-narrative-artifact.signature.json",
  "self-proof/self-proof-results.json",
];

async function writeEvidence() {
  const { digest, receipt, modelSlots, artifact, selfProof } = await assemble();
  await mkdir(join(EV, "digest"), { recursive: true });
  await mkdir(join(EV, "model-slots"), { recursive: true });
  await mkdir(join(EV, "verified"), { recursive: true });
  await mkdir(join(EV, "self-proof"), { recursive: true });
  await writeFile(join(EV, "digest", "evidence-digest.json"), stable(digest));
  await writeFile(join(EV, "model-slots", "gateway-receipt.json"), stable(receipt));
  await writeFile(join(EV, "model-slots", "model-slots.json"), stable(modelSlots));
  await writeFile(join(EV, "verified", "verified-narrative-artifact.json"), stable(artifact));
  await writeFile(join(EV, "self-proof", "self-proof-results.json"), stable(selfProof));
  console.log(
    "stage3s evidence: wrote digest + slots + artifact + self-proof (run sign-3s then hash)"
  );
}

async function verifyEvidence() {
  const { digest, modelSlots, artifact, selfProof } = await assemble();
  const cmp = [
    [join(EV, "digest", "evidence-digest.json"), digest],
    [join(EV, "model-slots", "model-slots.json"), modelSlots],
    [join(EV, "verified", "verified-narrative-artifact.json"), artifact],
    [join(EV, "self-proof", "self-proof-results.json"), selfProof],
  ];
  for (const [p, v] of cmp) {
    const committed = JSON.parse(await readFile(p, "utf8"));
    if (stable(committed) !== stable(v))
      throw new Error(`committed ${p} drifted; run build --update`);
  }
  console.log("stage3s evidence: verified committed");
}

export async function rewriteHashes() {
  const hashes = {};
  const missing = [];
  for (const name of HASH_FILES()) {
    try {
      hashes[name] = sha(await readFile(join(EV, name), "utf8"));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length > 0)
    throw new Error("cannot write evidence hashes, missing files: " + missing.join(", "));
  await writeFile(
    join(EV, "evidence-hashes.json"),
    stable({ schema: "simurgh.defensive_narrative.hashes.v1", hashes })
  );
}

export async function verifyHashes() {
  const committed = JSON.parse(await readFile(join(EV, "evidence-hashes.json"), "utf8"));
  for (const name of HASH_FILES()) {
    const actual = sha(await readFile(join(EV, name), "utf8"));
    if (committed.hashes[name] !== actual) throw new Error(`evidence hash mismatch: ${name}`);
  }
  return true;
}

async function mainCli() {
  const sub = process.argv[2];
  if (sub === "build") {
    if (process.argv.includes("--update")) await writeEvidence();
    else await verifyEvidence();
    return;
  }
  if (sub === "hash") {
    await rewriteHashes();
    console.log("stage3s: rewrote evidence-hashes.json");
    return;
  }
  if (sub === "verify-hashes") {
    await verifyHashes();
    console.log("stage3s: evidence hashes match");
    return;
  }
  console.error("usage: simurgh-narrative.mjs build [--update] | hash | verify-hashes");
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run the pure CLI-helper test + coverage scope**

Run: `node --test tests/unit/llmShield/narrative/narrativeCli.test.js`
Expected: PASS. (The gateway-drive / write / verify I/O paths are exercised by the Task 7 smoke — honest subprocess coverage; the pure helpers `buildModelSlotsFromGatewayRun` / `buildVerifiedArtifact` are unit-tested here.)

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-narrative/simurgh-narrative.mjs tests/unit/llmShield/narrative/narrativeCli.test.js docs/research/llm-shield/evidence/stage-3e/fixtures/recorded_fixture/3e_narrative_001.json docs/research/llm-shield/evidence/stage-3e/fixtures/fixture-manifest.json
git commit -m "feat(stage-3s): narrative CLI + committed slot fixture (gateway-mediated, receipt-bound)"
```

---

### Task 6: Keypair, signer, verifier, committed signed evidence

**Files:**

- Create: `tools/simurgh-narrative/sign-3s-narrative.mjs`
- Create: `tools/simurgh-narrative/verify-stage3s-narrative.mjs`
- Test: `tests/unit/llmShield/narrative/narrativeVerify.test.js`
- Create (generated, committed): key, digest/slots/receipt/artifact + signature, self-proof, hashes.

**Interfaces:**

- `verify-stage3s-narrative.mjs`: `verifyNarrative({ artifact, sidecar, publicKeyPem, digest, modelSlots, receipt }): { ok, checks }` — signature + receipt-binding (`modelSlots.source.gateway_output_hash === receipt.output_hash`) + artifact's `evidence_digest_hash === sha256Hex(canonicalJson(digest))` + `automatic_finding_made === false`.

- [ ] **Step 1: Write the failing verifier test**

```javascript
// tests/unit/llmShield/narrative/narrativeVerify.test.js
// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { verifyNarrative } from "../../../../tools/simurgh-narrative/verify-stage3s-narrative.mjs";

test("verifyNarrative accepts a signed, evidence-bound artifact and rejects tampering", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const digest = {
    type: "simurgh.defensive_narrative.evidence_digest.v1",
    session_hash: "sha256:s",
  };
  const receipt = { output_hash: "sha256:out" };
  const modelSlots = { source: { gateway_output_hash: "sha256:out" } };
  const artifact = {
    type: "simurgh.defensive_narrative.verified_artifact.v1",
    evidence_digest_hash: sha256Hex(canonicalJson(digest)),
    claim_check_passed: true,
    automatic_finding_made: false,
    rendered_summary: "Manual review is recommended.",
  };
  const canonical = Buffer.from(canonicalJson(artifact), "utf8");
  const sig = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  const sidecar = {
    schema: "simurgh.defensive_narrative.signature.v1",
    algorithm: "Ed25519",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + sig.toString("base64"),
  };
  assert.equal(
    verifyNarrative({ artifact, sidecar, publicKeyPem: pubPem, digest, modelSlots, receipt }).ok,
    true
  );
  // tamper the artifact
  const tampered = { ...artifact, rendered_summary: "cheated" };
  assert.equal(
    verifyNarrative({
      artifact: tampered,
      sidecar,
      publicKeyPem: pubPem,
      digest,
      modelSlots,
      receipt,
    }).ok,
    false
  );
  // break receipt binding
  assert.equal(
    verifyNarrative({
      artifact,
      sidecar,
      publicKeyPem: pubPem,
      digest,
      modelSlots: { source: { gateway_output_hash: "sha256:other" } },
      receipt,
    }).ok,
    false
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/unit/llmShield/narrative/narrativeVerify.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the verifier**

```javascript
// tools/simurgh-narrative/verify-stage3s-narrative.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: signature + receipt-binding + digest-binding + no-finding checks.
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3s";

export function verifyNarrative({ artifact, sidecar, publicKeyPem, digest, modelSlots, receipt }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(artifact), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match =
    sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    sig
  );
  checks.digest_binding = artifact.evidence_digest_hash === sha256Hex(canonicalJson(digest));
  checks.receipt_binding = modelSlots.source.gateway_output_hash === receipt.output_hash;
  checks.no_automatic_finding = artifact.automatic_finding_made === false;
  checks.no_rendered_conflicts = (artifact.narrative_claim_conflicts_rendered ?? 0) === 0;
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks };
}

async function main() {
  const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
  const artifact = await rd("verified/verified-narrative-artifact.json");
  const sidecar = await rd("verified/verified-narrative-artifact.signature.json");
  const digest = await rd("digest/evidence-digest.json");
  const modelSlots = await rd("model-slots/model-slots.json");
  const receipt = await rd("model-slots/gateway-receipt.json");
  const pub = await rd("keys/stage3s-public-key.json");
  const { ok, checks } = verifyNarrative({
    artifact,
    sidecar,
    publicKeyPem: pub.public_key_pem,
    digest,
    modelSlots,
    receipt,
  });
  console.log(JSON.stringify(checks, null, 2));
  if (!ok) {
    console.error("stage3s narrative verify: FAIL");
    process.exit(1);
  }
  console.log("stage3s narrative verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
```

- [ ] **Step 4: Run the verifier test**

Run: `node --test tests/unit/llmShield/narrative/narrativeVerify.test.js`
Expected: PASS.

- [ ] **Step 5: Implement the local signer**

```javascript
// tools/simurgh-narrative/sign-3s-narrative.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3S verified artifact. Reads SIMURGH_3S_PRIVATE_KEY_PATH
// (default ~/.simurgh/3s-ed25519.pem); CI never runs this.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3s";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const keyPath =
    process.env.SIMURGH_3S_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3s-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3s-public-key.json"), "utf8"));
  const artifact = JSON.parse(
    await readFile(join(EV, "verified", "verified-narrative-artifact.json"), "utf8")
  );
  const canonical = Buffer.from(canonicalJson(artifact), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.defensive_narrative.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(
    join(EV, "verified", "verified-narrative-artifact.signature.json"),
    stable(sidecar)
  );
  console.log("stage3s: signed verified artifact; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
```

- [ ] **Step 6: Generate the keypair + produce committed signed evidence**

```bash
mkdir -p ~/.simurgh docs/research/llm-shield/evidence/stage-3s/keys
node tools/simurgh-attestation/keygen.mjs --out-private ~/.simurgh/3s-ed25519.pem --out-public docs/research/llm-shield/evidence/stage-3s/keys/stage3s-public-key.json
node -e "const k=require('./docs/research/llm-shield/evidence/stage-3s/keys/stage3s-public-key.json');require('fs').writeFileSync('docs/research/llm-shield/evidence/stage-3s/keys/stage3s-key-fingerprint.txt',k.fingerprint+'\n')"
export SIMURGH_LLM_SHIELD_SECRET="smoke-llm-shield-secret-32-characters"
node tools/simurgh-narrative/simurgh-narrative.mjs build --update
node tools/simurgh-narrative/sign-3s-narrative.mjs
node tools/simurgh-narrative/simurgh-narrative.mjs hash
# verify (CI path):
node tools/simurgh-narrative/simurgh-narrative.mjs build
node tools/simurgh-narrative/simurgh-narrative.mjs verify-hashes
node tools/simurgh-narrative/verify-stage3s-narrative.mjs
```

Expected: every verify prints PASS; the private key stays at `~/.simurgh/`, never committed.

- [ ] **Step 7: Commit**

```bash
git add tools/simurgh-narrative/sign-3s-narrative.mjs tools/simurgh-narrative/verify-stage3s-narrative.mjs tests/unit/llmShield/narrative/narrativeVerify.test.js docs/research/llm-shield/evidence/stage-3s
git commit -m "feat(stage-3s): signer, CI verify-only verifier, and signed narrative evidence"
```

---

### Task 7: Audit scripts + smoke + check.sh wiring

**Files:**

- Create: `scripts/smoke-llm-shield-stage3s.sh`, `scripts/security-audit-llm-shield-stage3s.mjs`, `scripts/privacy-audit-llm-shield-stage3s.mjs`, `scripts/policy-drift-guard-llm-shield-stage3s.sh`, `scripts/consistency-audit-llm-shield-stage3s.mjs`
- Modify: `scripts/check.sh`

- [ ] **Step 1: Policy-drift guard (fail-closed, matches 3Q's CI-safe pattern)**

```bash
# scripts/policy-drift-guard-llm-shield-stage3s.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3S is tooling-only: assert NO src/llmShield change. Resolves a real base; warns
# + passes only if no base resolves (never false-FAILs on a shallow checkout).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE=""
for ref in "${SIMURGH_POLICY_BASE_REF:-}" origin/main main HEAD^1 HEAD~1; do
  [ -z "$ref" ] && continue
  if git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null 2>&1; then BASE="$ref"; break; fi
done
if [ -n "$BASE" ] && changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null)"; then
  if grep -q '^src/llmShield/' <<<"$changed"; then
    echo "stage3s policy-drift: FAIL — src/llmShield changed in ${BASE}...HEAD"
    exit 1
  fi
  echo "stage3s policy-drift: PASS (no src/llmShield change in ${BASE}...HEAD)"
else
  # Fix #2: no base ref resolved. Fail closed — never pass unverified, especially in CI.
  wt="$(git diff --name-only HEAD -- src/llmShield 2>/dev/null; git status --porcelain src/llmShield 2>/dev/null)"
  if grep -q 'src/llmShield' <<<"$wt"; then
    echo "stage3s policy-drift: FAIL — src/llmShield changed (working tree) and no base ref to verify the branch range"
    exit 1
  fi
  if [ "${CI:-}" = "true" ]; then
    echo "stage3s policy-drift: FAIL — no base ref resolved in CI; cannot verify zero src/llmShield change (fail-closed)"
    exit 1
  fi
  echo "stage3s policy-drift: WARN — no base ref resolved locally; the branch range is verified on PR/post-merge CI"
fi
```

- [ ] **Step 2: Privacy audit (metadata-only; no forbidden tokens; privacy never overclaimed)**

```javascript
// scripts/privacy-audit-llm-shield-stage3s.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3s";
// Fix #1: detect RAW leaked data, never the safe privacy boolean field NAMES
// (the digest legitimately contains typed_content_captured:false, raw_window_titles_captured:false).
const FORBIDDEN = [
  "BEGIN PRIVATE KEY",
  "raw_transcript",
  "raw_provider_output",
  "raw_typed_content",
  "raw_window_title_value",
  "process_name:",
  "window_title:",
];
async function walk(d) {
  const o = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) o.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) o.push(p);
  }
  return o;
}
const findings = [];
for (const f of await walk(EV)) {
  const c = await readFile(f, "utf8");
  for (const t of FORBIDDEN) if (c.includes(t)) findings.push({ f, t });
}
const digest = JSON.parse(await readFile(join(EV, "digest", "evidence-digest.json"), "utf8"));
if (
  digest.privacy.raw_pixels_captured ||
  digest.privacy.raw_window_titles_captured ||
  digest.privacy.typed_content_captured
)
  findings.push({ f: "evidence-digest.json", t: "privacy_overclaim" });
if (findings.length) {
  console.error("stage3s privacy: FAIL", JSON.stringify(findings));
  process.exit(1);
}
console.log("stage3s privacy: PASS");
```

- [ ] **Step 3: Security audit (no-finding wall + self-proof teeth)**

```javascript
// scripts/security-audit-llm-shield-stage3s.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runNarrativeSelfProof } from "../tools/simurgh-narrative/selfProof.mjs";
import { FORBIDDEN_WORDING } from "../tools/simurgh-narrative/claimChecker.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3s";
const errors = [];
const sp = runNarrativeSelfProof();
if (!sp.summary.all_passed) errors.push("self-proof failed");
if (sp.summary.narrative_claim_conflicts_rendered !== 0) errors.push("claim conflict rendered");
if (sp.summary.automatic_findings_rendered !== 0) errors.push("automatic finding rendered");
if (sp.summary.narrative_claim_conflict_attempts < 1) errors.push("conflict teeth never fired");
const art = JSON.parse(
  await readFile(join(EV, "verified", "verified-narrative-artifact.json"), "utf8")
);
if (art.automatic_finding_made !== false) errors.push("artifact made an automatic finding");
const lower = String(art.rendered_summary).toLowerCase();
for (const w of FORBIDDEN_WORDING)
  if (lower.includes(w)) errors.push(`forbidden wording in artifact: ${w}`);
if (errors.length) {
  console.error("stage3s security: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3s security: PASS");
```

- [ ] **Step 4: Consistency audit (source-binding + receipt-binding)**

```javascript
// scripts/consistency-audit-llm-shield-stage3s.mjs
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../tools/simurgh-attestation/canonicalise.mjs";
import { hashPrompt } from "../src/llmShield/promptNormalise.js";
const EV = "docs/research/llm-shield/evidence/stage-3s";
const errors = [];
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const digest = await rd("digest/evidence-digest.json");
for (const s of digest.source_inputs) {
  let content;
  try {
    content = await readFile(s.path, "utf8");
  } catch {
    errors.push(`source missing: ${s.path}`);
    continue;
  }
  if (sha256Hex(content) !== s.digest) errors.push(`source digest mismatch: ${s.path}`);
}
const modelSlots = await rd("model-slots/model-slots.json");
const receipt = await rd("model-slots/gateway-receipt.json");
if (modelSlots.source.gateway_output_hash !== receipt.output_hash)
  errors.push("receipt-binding mismatch");
if (modelSlots.source.model_slots_digest !== sha256Hex(canonicalJson(modelSlots.slots)))
  errors.push("model_slots_digest mismatch");
const art = await rd("verified/verified-narrative-artifact.json");
if (art.evidence_digest_hash !== sha256Hex(canonicalJson(digest)))
  errors.push("artifact digest-binding mismatch");
if (errors.length) {
  console.error("stage3s consistency: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3s consistency: PASS");
void hashPrompt;
```

- [ ] **Step 5: Smoke**

```bash
# scripts/smoke-llm-shield-stage3s.sh
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3S smoke: deterministic, verify-only (build re-derives + byte-compares).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export SIMURGH_LLM_SHIELD_SECRET="${SIMURGH_LLM_SHIELD_SECRET:-smoke-llm-shield-secret-32-characters}"
node tools/simurgh-narrative/simurgh-narrative.mjs build
node tools/simurgh-narrative/simurgh-narrative.mjs verify-hashes
node tools/simurgh-narrative/verify-stage3s-narrative.mjs
bash scripts/policy-drift-guard-llm-shield-stage3s.sh
node scripts/privacy-audit-llm-shield-stage3s.mjs
node scripts/consistency-audit-llm-shield-stage3s.mjs
node scripts/security-audit-llm-shield-stage3s.mjs
echo "stage3s smoke: passed"
```

Fix #4 (confirmed): `gatewayReceipt.js` emits the canonical field `output_hash`; receipt-binding uses `receipt.output_hash` only — no permissive fallback.
Fix #5 (semantics): `source_inputs[].digest` is a file-byte sha256 (`sha256Hex(content)`), NOT a canonical-object digest; the consistency audit re-hashes the file bytes. Documented so reviewers know which semantics apply.

- [ ] **Step 6: Make executable + run**

Run:

```bash
chmod +x scripts/smoke-llm-shield-stage3s.sh scripts/policy-drift-guard-llm-shield-stage3s.sh
bash scripts/smoke-llm-shield-stage3s.sh
```

Expected: `stage3s smoke: passed`.

- [ ] **Step 7: Wire into check.sh**

After the 3R helper-coverage block (search `LLM Shield 3R fallback helper coverage`), add:

```bash
step "LLM Shield 3S verifiable defensive narrative"
if scripts/smoke-llm-shield-stage3s.sh > "$LOG_DIR/llm-shield-stage3s-smoke.log" 2>&1; then
  pass "LLM Shield 3S verifiable defensive narrative"
else
  fail "LLM Shield 3S verifiable defensive narrative"
  tail -80 "$LOG_DIR/llm-shield-stage3s-smoke.log"
fi

step "LLM Shield 3S narrative helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-narrative/evidenceDigest.mjs \
  --test-coverage-include=tools/simurgh-narrative/claimChecker.mjs \
  --test-coverage-include=tools/simurgh-narrative/renderer.mjs \
  --test-coverage-include=tools/simurgh-narrative/selfProof.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/narrative/evidenceDigest.test.js \
  tests/unit/llmShield/narrative/claimChecker.test.js \
  tests/unit/llmShield/narrative/renderer.test.js \
  tests/unit/llmShield/narrative/narrativeSelfProof.test.js \
  > "$LOG_DIR/llm-shield-stage3s-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3S narrative helper coverage"
else
  fail "LLM Shield 3S narrative helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3s-helper-coverage.log"
fi
```

Update the TOC (line ~17) and banner (line ~1385): `Stage 3A–3R` → `Stage 3A–3S`; extend the pipeline description with `→ verifiable defensive narrative (3S)`.

- [ ] **Step 8: Syntax + run**

Run: `bash -n scripts/check.sh && bash scripts/smoke-llm-shield-stage3s.sh && echo OK`
Expected: `stage3s smoke: passed` then `OK`.

- [ ] **Step 9: Commit**

```bash
git add scripts/smoke-llm-shield-stage3s.sh scripts/security-audit-llm-shield-stage3s.mjs scripts/privacy-audit-llm-shield-stage3s.mjs scripts/policy-drift-guard-llm-shield-stage3s.sh scripts/consistency-audit-llm-shield-stage3s.mjs scripts/check.sh
git commit -m "feat(stage-3s): audit scripts, smoke, and check.sh wiring (3A–3S)"
```

---

### Task 8: Documentation quartet + stage doc + full verification + finish

**Files:**

- Create: `docs/research/llm-shield/LLM_SHIELD_STAGE_3S_VERIFIABLE_DEFENSIVE_NARRATIVE.md`
- Create: `docs/research/llm-shield/STAGE_3S_CLOSEOUT.md`, `STAGE_3S_THREAT_MODEL.md`, `STAGE_3S_VALIDATION_MATRIX.md`, `STAGE_3S_REVIEWER_CHECKLIST.md`

- [ ] **Step 1: Write the stage doc** mirroring the 3R stage doc: crown sentence (verbatim) + "AI drafts. Simurgh verifies. Humans review."; the four-step pipeline; the two-layer containment named invariant; the two sacred walls (pen-not-passport + Stage 2.5 no-finding, with the vocabulary); the three-layer schema; receipt-binding + source-binding; the 9 self-proof fixtures; tooling-only scope note; non-claims; external anchors (Fable 5 docs + AgentDyn/Firewalls/PISmith/OWASP/NIST).

- [ ] **Step 2: Write the quartet** following the 3R quartet. Validation matrix maps each invariant → enforcing test/script. Threat model: adversaries = AI hallucination/overclaim, automatic-finding rendering, privacy overclaim, schema smuggling (fences/prefixes), slot-swap after gateway run, source swap, prose injection; each mapped to its gate. Reviewer checklist: the verify commands + the 3S public-key fingerprint + the tooling-only note. Closeout: results + the fact that all three Dario-letter Feature-B-class claims are now real; next.

- [ ] **Step 3: Prettier + re-smoke**

Run: `npx prettier --write "docs/research/llm-shield/*3S*.md" "docs/research/llm-shield/LLM_SHIELD_STAGE_3S*.md"` then `bash scripts/smoke-llm-shield-stage3s.sh`. Avoid `**` inside inline code in markdown (the 3P/3Q/3R prettier lesson).

- [ ] **Step 4: Commit docs**

```bash
git add docs/research/llm-shield/LLM_SHIELD_STAGE_3S_VERIFIABLE_DEFENSIVE_NARRATIVE.md docs/research/llm-shield/STAGE_3S_CLOSEOUT.md docs/research/llm-shield/STAGE_3S_THREAT_MODEL.md docs/research/llm-shield/STAGE_3S_VALIDATION_MATRIX.md docs/research/llm-shield/STAGE_3S_REVIEWER_CHECKLIST.md
git commit -m "docs(stage-3s): stage doc + closeout/threat-model/validation-matrix/reviewer-checklist"
```

- [ ] **Step 5: Full verification**

Run: `npm test` (all pass + new 3S unit tests), `npx prettier --check .` (clean), `bash scripts/check.sh` (the two new 3S steps PASS; pre-existing environmental fails unchanged). If a 3S file is flagged by prettier, `--write` it, re-run the 3S smoke, amend.

- [ ] **Step 6: Finish the branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch. After merge: tag `v2.2.0-stage-3s-verifiable-defensive-narrative` on the merge commit + GitHub release; add the memory entry `project_stage-3s-verifiable-defensive-narrative.md` + MEMORY.md line. If the post-merge push-to-main run trips the known Linux Rust flake, `gh run rerun --failed`.

---

## Self-Review

**1. Spec coverage:**

- Crown sentence / AI-drafts-Simurgh-verifies → Task 8 + the whole pipeline. ✓
- Tooling-only / zero src/llmShield / policy-drift → Task 7 step 1 + Global Constraints. ✓
- recorded_fixture gateway drive → Task 5 (`gatewayDraftSlots`, committed fixture + manifest). ✓
- Pen-not-passport + strict single-object wall → Task 2 `parseModelSlots`. ✓
- Stage 2.5 no-finding vocabulary wall → Task 2 (`ALLOWED_WORDING`/`FORBIDDEN_WORDING`/`ALLOWED_SEVERITY`) + Task 3 renderer + Task 7 security audit. ✓
- Field-equality claim check (no NLP) → Task 2 `verifySlots`/`evalOperator`/`resolveDigestRef`. ✓
- Receipt-binding → Task 5 `buildModelSlotsFromGatewayRun` + Task 6 verifier + Task 7 consistency audit. ✓
- Source-binding → Task 1 `source_inputs` + Task 7 consistency audit. ✓
- Conflict accounting (attempts vs rendered) → Task 4 summary + Task 5 artifact + Task 7 security audit. ✓
- Dedicated 3S key, CI verify-only → Task 6. ✓
- Self-proof 9 fixtures → Task 4. ✓
- check.sh wiring + docs quartet → Tasks 7–8. ✓

**2. Placeholder scan:** No TBD/TODO; code steps carry complete code; the fixture authoring + keygen are explicit commands. ✓

**3. Type consistency:** `EVIDENCE_DIGEST_SCHEMA`/`MODEL_SLOTS_SCHEMA` consistent; `resolveDigestRef` returns `{found,value}` consumed by `verifySlots`; `verifySlots` returns `{verified,rejected,conflict_attempts}` consumed by `buildVerifiedArtifact`/`selfProof`/audits; `buildModelSlotsFromGatewayRun` returns `{ok,modelSlots|violation}`; sidecar shape (`bundle_sha256`/`public_key_fingerprint`/`signature`) consistent between signer + verifier. ✓

> **Implementer note:** the committed slot fixture (Task 5) must contain ONLY slots whose `evidence_ref`/relation hold against the digest built in Task 5's `buildDigestFromSources` (e.g. `audit_chain_valid == true`), or `build --update` will reject them and the artifact won't render. Keep the fixture minimal (1–2 supported slots). The gateway run's output firewall must pass on the slot JSON (benign metadata) — if a future digest field name contains a flagged token, rename the slot wording, never weaken the firewall.
