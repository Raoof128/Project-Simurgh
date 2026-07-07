# Stage 4T — VIC (Verifiable Incident Capsule) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the signed Incident Capsule — a closed-world, dual-template-bound, offline-recomputable serious-incident report over the 4S delegation chain, under the **No Hearsay** law (every template section recomputes from sealed evidence or signs its absence) and the **No Two Stories** law (audience views may redact, never contradict, and every redaction is ledgered).

**Architecture:** A new `tools/simurgh-attestation/stage4t/` tree layered read-only on frozen primitives (`canonicalJson`/`recordDigest`/`merkleRootSorted` from `stage4m/core/canonical.mjs`; `evaluateChainSafe` from `stage4s/core/chainCore.mjs`). Two pinned Commission template snapshots (GPAI Art-55 flagship + Art-73 high-risk draft) carry a normative three-way partition; a Merkle-sealed evidence census closes the epoch's evidence universe; a closed `recompute_kind` registry rederives every `evidence_backed` field; salted per-section commitments derive tiered views (regulator/insurer/public) with a redaction ledger; a two-tier verifier plus a static single-file browser verifier; four Lean theorems. No Capability Kernel entry is added.

**Tech Stack:** Node.js ESM (`.mjs`), `node:crypto` Ed25519, `node:test`; Python 3 stdlib (parity); Lean 4.15.0 (no mathlib); bash reproduce script; one static HTML file (no dependencies).

## Global Constraints

- **Motto in every new file header:** `AnthropicSafe First, then ReviewerSafe.` (verbatim, since Stage 4M) — new `.mjs`/`.py`/`.lean` **and** new `.js` test files: `// SPDX-License-Identifier: AGPL-3.0-or-later` + one-line `// Stage 4T … Motto: AnthropicSafe First, then ReviewerSafe.` The `.html` browser verifier uses **HTML comments** instead (P1-4): `<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->` + `<!-- Stage 4T VIC browser verifier. Motto: AnthropicSafe First, then ReviewerSafe. -->`.
- **Neutral copy everywhere:** no Claude co-author trailer, no "Claude Code" tag in any commit, PR, release, or doc.
- **Branch:** `stage-4t-vic` · **Target tag:** `v2.30.0-stage-4t-vic` · verify with `git tag --sort=-creatordate | head` before tagging.
- **Raw codes:** 133–150, additive in `tools/simurgh-attestation/stage4h/exitCodes.mjs`, all `RUN_LEVEL_BY_RAW` level **1**. Frozen check order `133 → 134 → 135 → 136 → 137 → 138 → 139 → 140 → 145 → 146 → 141 → 142 → 143 → 144 → 147 → 148 → 149 → 150`.
- **Verification layers (no helper may return a later-layer code early):** L1 schema/signature `133,134` · L2 template pinning `135,136,137` · L3 census+epoch `138,139,140,145` · L4 cross-stage truth `146` · L5 field truth + suppression `141,142,143,144` · L6 attestation seal `147` · L7 views `148,149` · L8 fail-closed `150`. Each core helper owns exactly one layer; `capsuleCore` composes them in frozen order.
- **Additive-code discipline** (`feedback_exit-code-probe-hygiene`, `feedback_run-check-sh-locally-before-push`): never shell `rg` in a unit test; use `UNKNOWN_RAW_PROBE` (999) for unmapped-code probes; regenerate both `exit-map.json` goldens + `stage4h/exitWrapper.test.js` literal; run `bash check.sh` locally (full Node-26 e2e nets + every prior `scripts/reproduce-llm-shield-stage4*.sh`), never `npm test`-only. Known pre-existing flake: Stage 2.7 "4321 leaked" — rerun clears.
- **Read-only predecessors:** no edit to any frozen 4A–4U source, no `src/llmShield` diff, no `authorise_*` entry, no `black` on `capability_kernel.py`.
- **Determinism:** every digest is `recordDigest(x)`; signing `crypto.sign(null, Buffer.from(canonicalJson(unsigned)), privKey).toString("hex")`; verify with `crypto.verify`. Two-stage digest: the attestation signs `canonicalJson(parse(bundle))` (4P lesson). Byte-stability under Node ≥ 26 (`/opt/homebrew/opt/node@26/bin`).
- **Fixture keys:** `tests/fixtures/llmShield/stage4t/test-keys/INSECURE_FIXTURE_ONLY_<name>.pem`, name `[A-Za-z-]+` (NO digits); allowlist path-regex in **both** `scripts/security-audit-llm-shield-stage3m.sh` and `...stage3o.sh`.
- **Prettier-ignore** all of `docs/research/llm-shield/evidence/stage-4t/` and the deterministic Lane A fixture dir; write any CLI hashes AFTER prettier (3T lesson).
- **Outcome semantics (frozen):** a red 4S verdict inside the capsule is a valid recorded outcome; 146 fires only when a referenced artifact fails to reproduce its **recorded** verdict.
- **Template snapshots are transcriptions of record:** each committed snapshot carries `source_url`, `retrieved` date, and an honest `transcription_of_record` marker; the pinned digest is over our committed snapshot file. If the Commission text changes, a new snapshot digest + visible mapping diff is required.

---

## File Structure

```text
tools/simurgh-attestation/stage4h/exitCodes.mjs          MODIFY  +VIC_RAW_CODES/CHECK_ORDER/REASONS + 18 RUN_LEVEL rows
tools/simurgh-attestation/stage4t/
  constants.mjs            schemas, regimes, partition classes, RECOMPUTE_KINDS, non-claims, limitations, rails, view tiers
  template/gpai-art55-template.snapshot.json      committed transcription (flagship regime)
  template/art73-draft-template.snapshot.json     committed transcription (second regime)
  core/templateMap.mjs     loadTemplates, verifyTemplateBindings (135/136/137)
  core/censusCore.mjs      buildEvidenceManifest, censusRoot, verifyCensus (138/139/140/145)
  core/projectionCore.mjs  RECOMPUTE_REGISTRY, verifyProjection (141/142), verifySuppression (143/144)
  core/viewCore.mjs        sectionCommitment, capsuleRoot, buildView, verifyView (148/149)
  core/capsuleCore.mjs     buildCapsule, verifyCrossStageRefs (146), verifySeal (147), evaluateCapsule/Safe (150)
  node/build-stage4t-fixtures.mjs       Lane A: honest capsule + one fixture per code 133–149
  node/build-stage4t-attestation.mjs    computeStructural / computeAttestation / signAttestation
  node/verify-stage4t-attestation.mjs   verifyAttestation({ tier }) + CLI --tier public|audit
  browser/vic-verifier.html             static single-file convenience verifier (no network)
  laneb/run-laneb-incident-ceremony.mjs staged contained near-incident over 4S MCP stdio + 3 views
  python/vic_parity.py                  stdlib parity for the non-signature decision core
proofs/stage4t/NoHearsay.lean           noHearsay, suppressionDetectable, censusExactness, noTwoStories
proofs/stage4t/lean-toolchain           "leanprover/lean4:v4.15.0"
scripts/reproduce-llm-shield-stage4t.sh
docs/research/llm-shield/STAGE_4T_CLOSEOUT.md
docs/research/llm-shield/evidence/stage-4t/{fixtures,attestation,laneb}/   (generated, prettier-ignored)
tests/fixtures/llmShield/stage4t/test-keys/INSECURE_FIXTURE_ONLY_{vic,vic-delegator,vic-delegatee}.pem
tests/unit/llmShield/stage4t/{exitCodes,constants,templateMap,censusCore,projectionCore,viewCore,capsuleCore,fixtures,attestation,parity}.test.js
tests/e2e/llmShield/stage4t/{k7AllFunctions,laneb,browserParity}.test.js
```

Golden/config ordering (4U P0-2 lesson): **Task 1** touches exitCodes + both exit-map goldens + exitWrapper literal + `.prettierignore` + both 3m/3o allowlists. **Task 12** adds the lean workflow entry (after the `.lean` exists). **Task 13** adds the `check-e2e.sh` row (after the reproduce script exists).

---

## Task 1: Raw-code registry 133–150 + golden sweep + fixture keys

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs` (append after the `VRTA_REASONS_120` block, before `HARNESS_CODES`)
- Modify: `docs/research/llm-shield/evidence/stage-4h/exit-map.json` AND `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` (regenerate, do not hand-edit if a generator exists — check `git log` for how 4U did it; otherwise add the 18 rows by hand in both)
- Modify: `tests/unit/llmShield/stage4h/exitWrapper.test.js` (inline `RUN_LEVEL_BY_RAW` literal +18 rows)
- Modify: `.prettierignore` (+`docs/research/llm-shield/evidence/stage-4t/` +`tests/fixtures/llmShield/stage4t/expected-results/`)
- Modify: `scripts/security-audit-llm-shield-stage3m.sh` and `scripts/security-audit-llm-shield-stage3o.sh` (extend the fixture-key path regex with `stage4t`)
- Create: `tests/fixtures/llmShield/stage4t/test-keys/INSECURE_FIXTURE_ONLY_{vic,vic-delegator,vic-delegatee}.pem`
- Test: `tests/unit/llmShield/stage4t/exitCodes.test.js`

**Interfaces:**

- Produces: `VIC_RAW_CODES` (18 entries), `VIC_CHECK_ORDER` (frozen array, spec §8 order), `VIC_REASONS_133` (schema reasons incl. `unknown_recompute_kind`), `VIC_REASONS_134` (`capsule_signature_invalid`, `attestation_signature_invalid`), `RUN_LEVEL_BY_RAW[133..150] = 1`. Consumed by every later task.

- [ ] **Step 1: Write the failing test** — `tests/unit/llmShield/stage4t/exitCodes.test.js`:

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC exit-code registry. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIC_RAW_CODES,
  VIC_CHECK_ORDER,
  RUN_LEVEL_BY_RAW,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VIC codes are 133-150, frozen order, level 1, fail-closed last", () => {
  assert.equal(VIC_RAW_CODES.VIC_CAPSULE_MALFORMED, 133);
  assert.equal(VIC_RAW_CODES.VIC_SIGNATURE_INVALID, 134);
  assert.equal(VIC_RAW_CODES.TEMPLATE_DIGEST_MISMATCH, 135);
  assert.equal(VIC_RAW_CODES.TEMPLATE_PARTITION_INCOMPLETE, 136);
  assert.equal(VIC_RAW_CODES.TEMPLATE_SECTION_UNMAPPED, 137);
  assert.equal(VIC_RAW_CODES.EVIDENCE_CENSUS_MISSING_ITEM, 138);
  assert.equal(VIC_RAW_CODES.EVIDENCE_CENSUS_SMUGGLED_ITEM, 139);
  assert.equal(VIC_RAW_CODES.CENSUS_MERKLE_MISMATCH, 140);
  assert.equal(VIC_RAW_CODES.FIELD_UNBACKED, 141);
  assert.equal(VIC_RAW_CODES.FIELD_RECOMPUTE_MISMATCH, 142);
  assert.equal(VIC_RAW_CODES.NOT_DERIVABLE_UNJUSTIFIED, 143);
  assert.equal(VIC_RAW_CODES.REQUIRES_HUMAN_INPUT_UNJUSTIFIED, 144);
  assert.equal(VIC_RAW_CODES.INCIDENT_EPOCH_MISMATCH, 145);
  assert.equal(VIC_RAW_CODES.CROSS_STAGE_REFERENCE_INVALID, 146);
  assert.equal(VIC_RAW_CODES.ATTESTATION_DIGEST_MISMATCH, 147);
  assert.equal(VIC_RAW_CODES.VIEW_INCONSISTENT_WITH_CAPSULE, 148);
  assert.equal(VIC_RAW_CODES.REDACTION_UNDECLARED, 149);
  assert.equal(VIC_RAW_CODES.INTERNAL_FAIL_CLOSED, 150);
  assert.deepEqual(VIC_CHECK_ORDER, [
    133, 134, 135, 136, 137, 138, 139, 140, 145, 146, 141, 142, 143, 144, 147, 148, 149, 150,
  ]);
  for (let c = 133; c <= 150; c += 1) assert.equal(RUN_LEVEL_BY_RAW[c], 1);
  assert.equal(RUN_LEVEL_BY_RAW[UNKNOWN_RAW_PROBE], undefined);
});
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/unit/llmShield/stage4t/exitCodes.test.js` → FAIL (`VIC_RAW_CODES` not exported).
- [ ] **Step 3: Implement** — append to `exitCodes.mjs` after `VRTA_REASONS_120`:

```javascript
export const VIC_RAW_CODES = Object.freeze({
  VIC_CAPSULE_MALFORMED: 133,
  VIC_SIGNATURE_INVALID: 134,
  TEMPLATE_DIGEST_MISMATCH: 135,
  TEMPLATE_PARTITION_INCOMPLETE: 136,
  TEMPLATE_SECTION_UNMAPPED: 137,
  EVIDENCE_CENSUS_MISSING_ITEM: 138,
  EVIDENCE_CENSUS_SMUGGLED_ITEM: 139,
  CENSUS_MERKLE_MISMATCH: 140,
  FIELD_UNBACKED: 141,
  FIELD_RECOMPUTE_MISMATCH: 142,
  NOT_DERIVABLE_UNJUSTIFIED: 143,
  REQUIRES_HUMAN_INPUT_UNJUSTIFIED: 144,
  INCIDENT_EPOCH_MISMATCH: 145,
  CROSS_STAGE_REFERENCE_INVALID: 146,
  ATTESTATION_DIGEST_MISMATCH: 147,
  VIEW_INCONSISTENT_WITH_CAPSULE: 148,
  REDACTION_UNDECLARED: 149,
  INTERNAL_FAIL_CLOSED: 150,
});
export const VIC_CHECK_ORDER = Object.freeze([
  133, 134, 135, 136, 137, 138, 139, 140, 145, 146, 141, 142, 143, 144, 147, 148, 149, 150,
]);
export const VIC_REASONS_133 = Object.freeze([
  "vic_capsule_schema_invalid",
  "evidence_manifest_schema_invalid",
  "projected_section_schema_invalid",
  "view_schema_invalid",
  "unknown_recompute_kind",
]);
export const VIC_REASONS_134 = Object.freeze([
  "capsule_signature_invalid",
  "attestation_signature_invalid",
]);
```

and add `133..150 → 1` to `RUN_LEVEL_BY_RAW` where 119–132 were added.

- [ ] **Step 4: Golden sweep** — regenerate/extend both `exit-map.json` copies and the `exitWrapper.test.js` literal exactly as the 4U Task-1 commit did (`git show` the 4U commit that touched them to copy the mechanism). Extend `.prettierignore` and both 3m/3o audit allowlists (path regex `tests/fixtures/llmShield/stage4t/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem`).
- [ ] **Step 5: Generate fixture keys**:

```bash
cd tools/simurgh-attestation && for n in vic vic-delegator vic-delegatee; do \
  node keygen.mjs ../../tests/fixtures/llmShield/stage4t/test-keys/INSECURE_FIXTURE_ONLY_$n.pem; done
```

(If `keygen.mjs` takes different args, check `node keygen.mjs --help` and match the 4S/4U key generation invocation from git history.)

- [ ] **Step 6: Verify green + no ripple** — `node --test tests/unit/llmShield/stage4t/exitCodes.test.js tests/unit/llmShield/stage4h/exitWrapper.test.js tests/unit/llmShield/exitCodeProbeHygiene.test.js` → all PASS (probe-hygiene lives at `tests/unit/llmShield/exitCodeProbeHygiene.test.js`, NOT under `stage4l/` — P1-1); then `npm test` → PASS.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(4t): raw codes 133-150 + golden sweep + VIC fixture keys"`

---

## Task 2: Pinned template snapshots (dual regime)

**Files:**

- Create: `tools/simurgh-attestation/stage4t/template/gpai-art55-template.snapshot.json`
- Create: `tools/simurgh-attestation/stage4t/template/art73-draft-template.snapshot.json`
- Test: (covered by Task 3's templateMap tests; this task is data + verification of digests)

**Interfaces:**

- Produces: two committed JSON snapshots, each `{ schema: "simurgh.vic.template_snapshot.v1", regime, source_url, retrieved, transcription_of_record: true, sections: [{ section_id, title }] }`. `section_id` is snake_case, stable, ours; `title` is the Commission's heading text.

- [ ] **Fail-closed rule for this whole task (P1-8):** if the template document cannot be fetched, or its section headings cannot be extracted, **STOP** — do not fall back to the sample JSON below as ground truth. The sample shows only the *shape*; the fetched Commission text is the sole source of section content. A pinned snapshot built from a guess would turn a placeholder into false evidence.
- [ ] **Step 1: Fetch and transcribe the GPAI Art-55 template** from
  `https://digital-strategy.ec.europa.eu/en/library/ai-act-commission-publishes-reporting-template-serious-incidents-involving-general-purpose-ai` (download the DOCX/PDF; extract the section headings). Transcribe the real section list. Expected shape (VALIDATE against the fetched document and correct — the fetched text wins over this plan):

```json
{
  "schema": "simurgh.vic.template_snapshot.v1",
  "regime": "gpai_art55",
  "source_url": "https://digital-strategy.ec.europa.eu/en/library/ai-act-commission-publishes-reporting-template-serious-incidents-involving-general-purpose-ai",
  "retrieved": "2026-07-07",
  "transcription_of_record": true,
  "sections": [
    { "section_id": "reporting_provider_identity", "title": "Provider identification" },
    { "section_id": "model_identification", "title": "GPAI model identification" },
    { "section_id": "incident_dates", "title": "Date(s) of incident and of awareness" },
    { "section_id": "incident_description", "title": "Description of the serious incident" },
    { "section_id": "incident_classification", "title": "Type / classification of serious incident" },
    { "section_id": "affected_persons_or_infrastructure", "title": "Affected persons or infrastructure" },
    { "section_id": "root_cause_analysis", "title": "Root cause / contributing factors" },
    { "section_id": "corrective_measures", "title": "Measures taken or planned" },
    { "section_id": "cross_border_notifications", "title": "Other authorities notified" }
  ]
}
```

- [ ] **Step 2: Same for the Art-73 draft template** from the consultation page (`.../ai-act-commission-issues-draft-guidance-and-reporting-template-serious-ai-incidents-and-seeks`), regime `art73_high_risk_draft`, same schema.
- [ ] **Step 3: Record the pinned digests** — `node -e 'import("./tools/simurgh-attestation/stage4m/core/canonical.mjs").then(async m=>{const fs=await import("node:fs");for(const f of ["gpai-art55-template.snapshot.json","art73-draft-template.snapshot.json"]) console.log(f, m.recordDigest(JSON.parse(fs.readFileSync("tools/simurgh-attestation/stage4t/template/"+f,"utf8"))));})'` — paste both digests into the closeout notes file later; they become `TEMPLATE_SNAPSHOT_DIGESTS` in Task 3.
- [ ] **Step 4: Commit** — `git add tools/simurgh-attestation/stage4t/template && git commit -m "feat(4t): pin dual Commission template snapshots (GPAI Art-55 + Art-73 draft) as transcriptions of record"`

---

## Task 3: `constants.mjs` + `core/templateMap.mjs` (135/136/137)

**Files:**

- Create: `tools/simurgh-attestation/stage4t/constants.mjs`
- Create: `tools/simurgh-attestation/stage4t/core/templateMap.mjs`
- Test: `tests/unit/llmShield/stage4t/constants.test.js`, `tests/unit/llmShield/stage4t/templateMap.test.js`

**Interfaces:**

- Produces (constants): `VIC_CAPSULE_SCHEMA="simurgh.vic.capsule.v1"`, `VIC_CAPSULE_BUNDLE_SCHEMA="simurgh.vic.capsule_bundle.v1"`, `VIC_ATTESTATION_SCHEMA="simurgh.vic.attestation.v1"`, `VIC_VIEW_SCHEMA="simurgh.vic.view.v1"`, `TEMPLATE_REGIMES=Object.freeze(["gpai_art55","art73_high_risk_draft"])`, `PARTITION_CLASSES=Object.freeze(["evidence_backed","not_derivable","requires_human_input"])`, `VIEW_TIERS=Object.freeze(["regulator","insurer","public"])`, `RECOMPUTE_KINDS=Object.freeze(["stage4s_chain_verdict","kernel_block_record","epoch_range","participant_count","consent_manifest_scope","stage4u_asr","stage4n_beat_index"])`, `VIC_NON_CLAIMS` (7, spec §2.1 verbatim order), `VIC_KNOWN_LIMITATIONS` (7, spec §2.2 verbatim order incl. both reserved slots), `VIC_RAILS` (11, spec §2.3 verbatim order), `TEMPLATE_SNAPSHOT_DIGESTS={gpai_art55:"sha256:…",art73_high_risk_draft:"sha256:…"}` (Task 2 values), `PARTITIONS` (per regime, `{section_id: class}` for every section; classification decided here and published: `incident_dates`/`affected_persons_or_infrastructure`/`root_cause_analysis`/`corrective_measures`/`model_identification` → `evidence_backed` where a `RECOMPUTE_KINDS` entry can derive them, `incident_description`/`incident_classification` → `requires_human_input`, remainder → `not_derivable`), and `PARTITION_RECOMPUTE_KIND={regime:{section_id: kind}}` for every `evidence_backed` section.
- Produces (templateMap): `loadTemplates()` → `{gpai_art55: snapshot, art73_high_risk_draft: snapshot}` (reads the two committed files); `verifyTemplateBindings(capsule, templates)` → `null` or `{raw, reason, detail}` for 135 (binding digest ≠ pinned digest, per regime), 136 (partition key set ≠ snapshot section set — catches BOTH a missing section AND an extra partition entry, via `setEqual`), 137 (capsule projects a `section_id` absent from that regime's snapshot). The loop is over `TEMPLATE_REGIMES`, so unknown/extra regimes in `template_bindings`/`projected_sections` are NOT silently ignored here — they are rejected as schema code 133 in `capsuleCore` L1 (see Task 7). Exports a small `setEqual(a, b)` helper (two `Set`s equal iff same size and `a ⊆ b`).

- [ ] **Step 1: Failing tests** — `templateMap.test.js` (representative; constants.test.js asserts list lengths, frozen-ness, and that every `evidence_backed` partition entry has a `PARTITION_RECOMPUTE_KIND`):

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTemplates, verifyTemplateBindings } from "../../../../tools/simurgh-attestation/stage4t/core/templateMap.mjs";
import { TEMPLATE_SNAPSHOT_DIGESTS, PARTITIONS } from "../../../../tools/simurgh-attestation/stage4t/constants.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const templates = loadTemplates();

const okBindings = () =>
  Object.entries(TEMPLATE_SNAPSHOT_DIGESTS).map(([regime, d]) => ({
    regime, template_snapshot_digest: d, partition_digest: recordDigest(PARTITIONS[regime]),
  }));

test("green bindings verify", () => {
  const capsule = { template_bindings: okBindings(), projected_sections: [] };
  assert.equal(verifyTemplateBindings(capsule, templates), null);
});
test("135 on tampered snapshot digest", () => {
  const b = okBindings(); b[0].template_snapshot_digest = "sha256:" + "0".repeat(64);
  const r = verifyTemplateBindings({ template_bindings: b, projected_sections: [] }, templates);
  assert.equal(r.raw, 135);
});
test("136 on partition gap (binding digest must match the gappy partition, else 135 fires first)", () => {
  const gappy = { ...PARTITIONS.gpai_art55 }; delete gappy.incident_dates;
  const b = okBindings();
  b.find((x) => x.regime === "gpai_art55").partition_digest = recordDigest(gappy);
  const r = verifyTemplateBindings(
    { template_bindings: b, projected_sections: [] }, templates, { partitions: { ...PARTITIONS, gpai_art55: gappy } });
  assert.equal(r.raw, 136);
});
test("136 on EXTRA partition entry (partition superset of snapshot)", () => {
  const extra = { ...PARTITIONS.gpai_art55, invented_section: "not_derivable" };
  const b = okBindings();
  b.find((x) => x.regime === "gpai_art55").partition_digest = recordDigest(extra);
  const r = verifyTemplateBindings(
    { template_bindings: b, projected_sections: [] }, templates, { partitions: { ...PARTITIONS, gpai_art55: extra } });
  assert.equal(r.raw, 136);
});
test("137 on invented section", () => {
  const r = verifyTemplateBindings(
    { template_bindings: okBindings(), projected_sections: [{ regime: "gpai_art55", section_id: "invented_section", class: "not_derivable" }] }, templates);
  assert.equal(r.raw, 137);
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** `constants.mjs` (all lists verbatim from spec §2; paste the Task-2 digests) and `templateMap.mjs`:

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC template pinning (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { TEMPLATE_REGIMES, TEMPLATE_SNAPSHOT_DIGESTS, PARTITIONS, PARTITION_CLASSES } from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES = {
  gpai_art55: "gpai-art55-template.snapshot.json",
  art73_high_risk_draft: "art73-draft-template.snapshot.json",
};

export const setEqual = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

export function loadTemplates() {
  const out = {};
  for (const regime of TEMPLATE_REGIMES)
    out[regime] = JSON.parse(readFileSync(join(HERE, "..", "template", FILES[regime]), "utf8"));
  return out;
}

export function verifyTemplateBindings(capsule, templates, opts = {}) {
  const partitions = opts.partitions ?? PARTITIONS;
  for (const regime of TEMPLATE_REGIMES) {
    const binding = (capsule.template_bindings ?? []).find((b) => b.regime === regime);
    const snapshot = templates[regime];
    if (!binding || binding.template_snapshot_digest !== recordDigest(snapshot) ||
        binding.template_snapshot_digest !== TEMPLATE_SNAPSHOT_DIGESTS[regime] ||
        binding.partition_digest !== recordDigest(partitions[regime]))
      return { raw: 135, reason: "template_digest_mismatch", detail: { regime } };
    // 136: partition key set must EXACTLY equal the snapshot section set — a missing
    // section OR an extra partition entry both break exhaustiveness.
    const snapshotIds = new Set(snapshot.sections.map((s) => s.section_id));
    const partitionIds = new Set(Object.keys(partitions[regime]));
    if (!setEqual(snapshotIds, partitionIds))
      return { raw: 136, reason: "template_partition_incomplete", detail: { regime } };
    for (const s of snapshot.sections)
      if (!PARTITION_CLASSES.includes(partitions[regime][s.section_id]))
        return { raw: 136, reason: "template_partition_incomplete", detail: { regime, section_id: s.section_id } };
    for (const p of capsule.projected_sections ?? [])
      if (p.regime === regime && !snapshotIds.has(p.section_id))
        return { raw: 137, reason: "template_section_unmapped", detail: { regime, section_id: p.section_id } };
  }
  return null;
}
```

- [ ] **Step 4: Run → PASS.** Also run `npx prettier --check` on new files.
- [ ] **Step 5: Commit** — `git commit -m "feat(4t): constants + dual-regime template pinning with normative exhaustive partition (135/136/137)"`

---

## Task 4: `core/censusCore.mjs` (138/139/140/145)

**Files:**

- Create: `tools/simurgh-attestation/stage4t/core/censusCore.mjs`
- Test: `tests/unit/llmShield/stage4t/censusCore.test.js`

**Interfaces:**

- Produces: `buildEvidenceManifest({ epoch, items })` → `{ epoch, items, census_root }` where `items: [{ kind, digest, epoch }]` sorted by digest and `census_root = merkleRootSorted(items.map(recordDigest))`; `verifyCensus(capsule, artifactsByDigest)` → `null` | `{raw,…}` for 138 (manifest item with no artifact), 139 (artifact key not listed in manifest), 140 (recomputed root ≠ `census_root`), 145 (item.epoch ≠ capsule.epoch). `artifactsByDigest` is a plain object `digest → parsed artifact` and each artifact must satisfy `recordDigest(artifact) === digest` (mismatch is 138 — the listed item is effectively absent).

- [ ] **Step 1: Failing tests** — green manifest verifies; delete one artifact → 138; add an extra key → 139; tamper `census_root` → 140; for 145 you MUST re-root after mutating the epoch, or the earlier Merkle check (140) fires first:

```javascript
manifest.items[0].epoch = "other-epoch";
manifest.census_root = merkleRootSorted(manifest.items.map(recordDigest)); // re-seal so 140 passes
const r = verifyCensus({ epoch: "ep1", evidence_manifest: manifest }, artifactsByDigest);
assert.equal(r.raw, 145);
```

(The 138/139/140 tests follow the Task-3 pattern: build a 3-item manifest from inline `{kind:"stage4s_chain_bundle",epoch:"ep1",…}` artifacts, mutate, assert `r.raw`. Note `artifactsByDigest` keys must equal `recordDigest(artifact)` for each item so 138 does not spuriously fire.)
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement:**

```javascript
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC closed epoch census (spec §4). Motto: AnthropicSafe First, then ReviewerSafe.
import { recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";

export function buildEvidenceManifest({ epoch, items }) {
  const sorted = [...items].sort((a, b) => (a.digest < b.digest ? -1 : 1));
  return { epoch, items: sorted, census_root: merkleRootSorted(sorted.map(recordDigest)) };
}

export function verifyCensus(capsule, artifactsByDigest) {
  const manifest = capsule.evidence_manifest;
  for (const item of manifest.items) {
    const artifact = artifactsByDigest[item.digest];
    if (artifact === undefined || recordDigest(artifact) !== item.digest)
      return { raw: 138, reason: "evidence_census_missing_item", detail: { kind: item.kind, digest: item.digest } };
  }
  const listed = new Set(manifest.items.map((i) => i.digest));
  for (const digest of Object.keys(artifactsByDigest))
    if (!listed.has(digest))
      return { raw: 139, reason: "evidence_census_smuggled_item", detail: { digest } };
  if (merkleRootSorted(manifest.items.map(recordDigest)) !== manifest.census_root)
    return { raw: 140, reason: "census_merkle_mismatch", detail: {} };
  for (const item of manifest.items)
    if (item.epoch !== capsule.epoch)
      return { raw: 145, reason: "incident_epoch_mismatch", detail: { kind: item.kind, item_epoch: item.epoch } };
  return null;
}
```

- [ ] **Step 4: Run → PASS.** **Step 5: Commit** — `git commit -m "feat(4t): closed epoch evidence census with exact Merkle seal (138/139/140/145)"`

---

## Task 5: `core/projectionCore.mjs` (141/142/143/144)

**Files:**

- Create: `tools/simurgh-attestation/stage4t/core/projectionCore.mjs`
- Test: `tests/unit/llmShield/stage4t/projectionCore.test.js`

**Interfaces:**

- Produces: `RECOMPUTE_REGISTRY` — `Object.freeze({ [kind]: (artifact, ctx) => value })`, one pure function per `RECOMPUTE_KINDS` entry: `stage4s_chain_verdict` → `ctx.chainVerdict(artifact)` (injected; audit tier passes `evaluateChainSafe`-backed fn, public tier passes recorded-verdict reader), `kernel_block_record` → `artifact.decisions.filter(d=>d.decision==="blocked").length`, `epoch_range` → `artifact.range`, `participant_count` → `artifact.participants.length`, `consent_manifest_scope` → `artifact.scope`, `stage4u_asr` → `artifact.attack_success_rate`, `stage4n_beat_index` → `artifact.beat_index`.
- `verifyProjection(capsule, artifactsByDigest, ctx)` → 141 (an `evidence_backed` projected section whose `evidence_digest` is absent from `artifactsByDigest`), 142 (registry recompute ≠ `value`, `deepStrictEqual` on canonicalJson).
- Exports `KIND_EVIDENCE_SOURCE = Object.freeze({ stage4s_chain_verdict: "stage4s_chain_bundle", kernel_block_record: "kernel_decision_records", epoch_range: "stage4s_chain_bundle", participant_count: "stage4s_chain_bundle", consent_manifest_scope: "stage4o_consent_manifests", stage4u_asr: "stage4u_attestation_ref", stage4n_beat_index: "stage4n_temporal_anchor" })` — maps a recompute kind to the manifest `item.kind` that would supply its evidence.
- `verifySuppression(capsule, partitions, kindOf)` → 143/144. **It reads `capsule.evidence_manifest.items` directly** (that is where kinds live — `artifactsByDigest` alone cannot tell a chain bundle from a consent manifest, P0-3). Let `presentKinds = new Set(capsule.evidence_manifest.items.map((i) => i.kind))`. For each regime+section the partition classes `evidence_backed` with declared recompute kind `k = kindOf[regime][section_id]`: if the capsule's projected section for that regime+section is marked `not_derivable` (→143) or `requires_human_input` (→144) **while** `presentKinds.has(KIND_EVIDENCE_SOURCE[k])`, return the code. Honest absence (evidence source kind NOT in the sealed census) ⇒ the marker is legal ⇒ `null`.

- [ ] **Step 1: Failing tests** — green projection passes; drop the cited artifact → 141; corrupt `value` → 142; mark an `evidence_backed` section `not_derivable` **while its `KIND_EVIDENCE_SOURCE` kind is still in `capsule.evidence_manifest.items`** → 143; mark it `requires_human_input` under the same condition → 144; honest absence (remove the source kind's `item` from the manifest) with a `not_derivable` marker → `null`. Tests build a capsule with an inline `evidence_manifest.items` list so `verifySuppression` can read kinds.
- [ ] **Step 2: Run → FAIL.** **Step 3: Implement** exactly per the Interfaces block (each check loops `capsule.projected_sections`, layer-pure: no census or template codes returned here). **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(4t): field binding + closed recompute registry + suppression law (141/142/143/144)"`

---

## Task 6: `core/viewCore.mjs` (148/149)

**Files:**

- Create: `tools/simurgh-attestation/stage4t/core/viewCore.mjs`
- Test: `tests/unit/llmShield/stage4t/viewCore.test.js`

**Interfaces:**

- Produces: `sectionCommitment(section, saltHex)` = `recordDigest({ salt: saltHex, section })`; `capsuleRoot(capsule, saltsBySectionKey)` = `merkleRootSorted` over commitments of every projected section (key = `` `${regime}/${section_id}` ``); `buildView(capsule, tier, redactKeys, salts)` → `{ schema: VIC_VIEW_SCHEMA, tier, capsule_root, disclosed: [{ key, section, salt }], redactions: { count, keys: [...], commitments: [...] } }`.
- **`verifyViewAgainstCommitments(view, commitments)` is the primary verifier** (browser + CLI both call it — P1-3). `commitments` is the capsule's full public commitment list: `[{ key: "gpai_art55/incident_dates", commitment: "sha256:…" }, …]` (one per projected section, both regimes). It checks, in order: `view.capsule_root === merkleRootSorted(commitments.map(c => c.commitment))` (else 148); every `disclosed[i]` recomputes `sectionCommitment(disclosed[i].section, disclosed[i].salt)` and that value is the `commitment` for `disclosed[i].key` (else 148); `new Set([...disclosed.keys, ...redactions.keys])` `setEqual` `new Set(commitments.map(c => c.key))` (else 149); `redactions.count === redactions.keys.length` (else 149); **every `redactions.keys[i]` has its `redactions.commitments[i]` equal to `commitmentByKey.get(key)`** — the ledgered commitment must match the capsule's own commitment for that key, so a view cannot redact a section while advertising a fabricated commitment for it (else 149, P1-1). `verifyView(view, capsule, salts)` is a thin wrapper that derives `commitments` from `(capsule, salts)` then calls `verifyViewAgainstCommitments`.
- Salts: deterministic for Lane A — `saltHex = sha256Hex(canonicalJson({ seed: "stage4t-vic-salt-v1", key }))`; Lane B uses `crypto.randomBytes(32)`.

- [ ] **Step 1: Failing tests** — three-tier views verify green; tamper one disclosed `value` → 148; omit a section from both `disclosed` and `redactions` → 149; lower `redactions.count` by one → 149; a fully-redacted view still verifies (redact-all is legal, contradiction is not).
- [ ] **Step 2: Run → FAIL.** **Step 3: Implement** per Interfaces (pure, ~60 lines). **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(4t): salted section commitments + tiered views + redaction ledger — No Two Stories (148/149)"`

---

## Task 7: `core/capsuleCore.mjs` — 146/147, frozen order, fail-closed 150

**Files:**

- Create: `tools/simurgh-attestation/stage4t/core/capsuleCore.mjs`
- Test: `tests/unit/llmShield/stage4t/capsuleCore.test.js`

**Interfaces:**

- **Bundle vs capsule boundary (read first).** Tasks 3–6 verifiers take a `capsule` argument = the flat body `{ schema:"simurgh.vic.capsule.v1", epoch, template_bindings, evidence_manifest, projected_sections, section_commitments, capsule_root, non_claims, known_limitations, honesty_rails, capsule_key_digest, signature }`. Task 7's `evaluateCapsule` takes the **two-stage wrapper** `bundle = { schema: VIC_CAPSULE_BUNDLE_SCHEMA, content: <capsule>, attestation_digest, signature? }` and calls each core verifier with `bundle.content`. `verifySeal(147)` runs on the wrapper (`capsuleAttestationDigest(bundle)` over `content`). The inner `capsule.signature` (134) is the Ed25519 over `unsignedCapsule(capsule)`; the outer `attestation_digest` (147) is the content-binding digest — that is the two stages.
- Produces: `buildCapsule({ epoch, manifest, projectedSections, salts, privKeyPem })` → the two-stage `bundle` above, whose inner `content` is a signed `incident_capsule.v1` (fields: `schema`, `epoch`, `template_bindings`, `evidence_manifest`, `projected_sections`, `section_commitments`, `capsule_root`, `non_claims`, `known_limitations`, `honesty_rails`, `capsule_key_digest`, `signature`). Import `keyDigest` from `stage4s/core/receiptBuilder.mjs`; set `capsule_key_digest = keyDigest(pubKeyPem)` derived from `privKeyPem`. `non_claims`/`known_limitations`/`honesty_rails` are set verbatim in `VIC_NON_CLAIMS`/`VIC_KNOWN_LIMITATIONS`/`VIC_RAILS` order (P1-7). The signature is `crypto.sign(null, Buffer.from(canonicalJson(unsignedCapsule(capsule))), privKey)` where `unsignedCapsule` strips only `signature`.
- **L1 schema (133) — closed-world regime + list checks (P0-6):** `capsule.template_bindings.length === TEMPLATE_REGIMES.length`, **`new Set(template_bindings.map(b=>b.regime)).size === TEMPLATE_REGIMES.length`** (rejects duplicate `gpai_art55` + missing `art73_high_risk_draft` drifting into 135 instead of 133 — P1-2), and every `b.regime`/`s.regime` in `template_bindings`/`projected_sections` ∈ `TEMPLATE_REGIMES` (else 133 with `regime` detail); `non_claims`/`known_limitations`/`honesty_rails` deep-equal the frozen constants in order (else 133).
- **Signature 134 (P0-4):** `evaluateCapsule(bundle, opts)` requires `opts.capsulePubKeyPem`; fail 134 if `capsule.capsule_key_digest !== keyDigest(opts.capsulePubKeyPem)` OR `crypto.verify(...)` over `unsignedCapsule` is false (`capsule_signature_invalid`). Lane B's committed capture carries `capsule_pubkey_pem` (the ephemeral public key) so verify-mode can supply `capsulePubKeyPem` from the capture itself.
- `verifyCrossStageRefs(capsule, artifactsByDigest, stageVerifiers)` → 146 when a census artifact's own-stage verifier does not reproduce its **recorded** verdict; `stageVerifiers = { stage4s_chain_bundle: (a)=>evaluateChainSafe(a.bundle, a.opts).raw, stage4u_attestation_ref: …, stage4o_consent_manifests: …, stage4n_temporal_anchor: … }` — each returns the recomputed verdict/digest to compare with `a.recorded_verdict`/`a.recorded_digest`. A recorded red (e.g. 108) that reproduces red passes (frozen outcome semantics).
- **147 two-stage digest — exact formula (P0-7):**

```javascript
export const unsignedCapsule = (capsule) => { const { signature, ...body } = capsule; return body; };

// Two-stage wrapper shape (canonical `content` object — no ambiguous bare fields):
//   { schema: VIC_ATTESTATION_SCHEMA, content: { … }, attestation_digest, signature }
// The capsule-level wrapper's content is { capsule }; the Task-9 attestation wrapper's
// content is the four sealed groups. Same digest function serves both.
export function capsuleAttestationDigest(bundle) {
  const { attestation_digest, signature, ...body } = bundle;
  return recordDigest({ schema: body.schema, content: JSON.parse(canonicalJson(body.content)) });
}
export function verifySeal(bundle) {
  return bundle.attestation_digest === capsuleAttestationDigest(bundle)
    ? null : { raw: 147, reason: "attestation_digest_mismatch" };
}
```

(The `JSON.parse(canonicalJson(...))` round-trip is the 4P prettier/merge-safe step: the digest is over the re-canonicalised `content`, immune to whitespace re-serialisation. **The digest is ALWAYS over `body.content` — every two-stage wrapper in 4T, both the capsule wrapper and the Task-9 attestation, MUST nest its payload under a top-level `content` key, never as bare sibling fields.**)

- `evaluateCapsule(bundle, opts)` — L1 schema 133 (incl. regime/list checks above), signature 134, then delegates in the frozen order to templateMap (135/136/137) → censusCore (138/139/140/145) → verifyCrossStageRefs (146) → projectionCore (141/142) → suppression (143/144) → verifySeal (147) → views (148/149); returns `{ raw: 0 }` or the first failure. `evaluateCapsuleSafe` wraps in try/catch → `{ raw: 150, reason: "internal_fail_closed" }`.

- [ ] **Step 1: Failing tests** — a full green bundle (built with the module's own builders + the Task-1 `vic` key, passing `{ capsulePubKeyPem, stageVerifiers }`) → `{raw:0}`; the `FIXTURE_MUTATIONS` table (exported here for Task 8 reuse) is **17 rows** — one named mutation per code 133–149 — driven through `evaluateCapsule` as `[mutator, expectedRaw]` pairs; BigInt-poisoned bundle through `evaluateCapsuleSafe` → 150; check-order test: a bundle violating BOTH census (139) and suppression (143) fails 139 (census layer runs first).
- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(4t): capsule assembly + cross-stage truth + seal + frozen check order with fail-closed (146/147/150)"`

---

## Task 8: Lane A fixtures — `node/build-stage4t-fixtures.mjs`

**Files:**

- Create: `tools/simurgh-attestation/stage4t/node/build-stage4t-fixtures.mjs`
- Create (generated, committed): `tests/fixtures/llmShield/stage4t/expected-results/laneA/*.json`
- Test: `tests/unit/llmShield/stage4t/fixtures.test.js`

**Interfaces:**

- Produces: `buildLaneAFixtures()` → deterministic array `[{ name, bundle, expected_raw }]`: `honest-capsule` (0) + one per code 133–149 (each derived from the honest bundle by one named mutation — reuse the Task-7 mutation table by exporting it from `capsuleCore.mjs` as `FIXTURE_MUTATIONS`); the honest bundle's incident chain is built with **4S machinery** (`stage4s/core/receiptBuilder.mjs` + committed vic-delegator/vic-delegatee keys) and contains a real over-scoped crossing so the recorded chain verdict is **108**; CLI `node build-stage4t-fixtures.mjs --out <dir>` writes one file per fixture, byte-stable (no timestamps, no randomness — deterministic salts).

- [ ] **Step 1: Failing test** — `fixtures.test.js`: builds all fixtures; asserts count = 18 (1 green + 17 mutations); runs `evaluateCapsuleSafe` on each and asserts `raw === expected_raw`; asserts a rebuild is `deepStrictEqual` (determinism); asserts the honest capsule's `stage4s_chain_verdict` projected value equals 108.
- [ ] **Step 2: Run → FAIL.** **Step 3: Implement + generate committed fixtures.** **Step 4: Run → PASS**, plus `node --test tests/unit/llmShield/stage4t/` all green.
- [ ] **Step 5: Commit** — `git commit -m "feat(4t): deterministic Lane A corpus — honest capsule (chain verdict 108) + one fixture per code 133-149"`

---

## Task 9: Two-tier attestation build + verify CLI

**Files:**

- Create: `tools/simurgh-attestation/stage4t/node/build-stage4t-attestation.mjs`, `node/verify-stage4t-attestation.mjs`
- Create (generated, committed): `docs/research/llm-shield/evidence/stage-4t/attestation/vic-attestation.json`
- Test: `tests/unit/llmShield/stage4t/attestation.test.js`

**Interfaces:**

- Produces: `computeAttestation({ fixturesDir, lanebDir })` → `vic_attestation.v1` with the two-stage wrapper shape **`{ schema: VIC_ATTESTATION_SCHEMA, content: { template_snapshots, lane_a_fixtures, census_artifacts, lane_b_capture }, attestation_digest, signature }`** — the four sealed groups live under `content` (so `capsuleAttestationDigest` from Task 7 applies unchanged), and `lane_a_fixtures` seals **all 18** Lane A entries (honest capsule + one per code 133–149), NOT a single capsule (P0-5). `attestation_digest = capsuleAttestationDigest(bundle)`, Merkle root computed over the four group digests inside `content`, signed with the `vic` key; `verifyAttestation({ bundlePath, tier, pubKeyPem })` — `public` tier: signatures, template digests, partition exhaustiveness, census set-equality + Merkle, section schema, view commitments; `audit` tier: additionally reruns the full `evaluateCapsule` with real `stageVerifiers` (4S rerun) over every Lane A fixture and asserts each `expected_raw`. Exports `bundleMerkleRoot(attestation)` (over the four `content`-group digests) for the omission test. CLI: `node verify-stage4t-attestation.mjs --tier public|audit <bundle>` exits raw code.

- [ ] **Step 1: Failing test** — sign+verify green both tiers; flip one byte in the capsule group → public tier fails (134/147 per what was flipped); a fixture whose `expected_raw` is falsified → audit tier catches it, public does not (tier-separation assertion, 3M lineage); **omission test (P0-5):** `bundleMerkleRoot({ ...a, content: { ...a.content, lane_a_fixtures: a.content.lane_a_fixtures.slice(1) } }) !== bundleMerkleRoot(a)` — dropping any Lane A fixture changes the root.
- [ ] **Step 2: Run → FAIL.** **Step 3: Implement.** **Step 4: Run → PASS.** Generate the committed attestation (after `npx prettier --write` on sources, hashes written after formatting — 3T lesson).
- [ ] **Step 5: Commit** — `git commit -m "feat(4t): two-tier VIC attestation (public structural / audit engine-rerun) + CLI"`

---

## Task 10: Python parity — `python/vic_parity.py`

**Files:**

- Create: `tools/simurgh-attestation/stage4t/python/vic_parity.py`
- Test: `tests/unit/llmShield/stage4t/parity.test.js`

**Interfaces:**

- Produces: stdlib-only `evaluate_capsule(bundle: dict) -> int` implementing the non-signature decision core (layers L2–L5 + L7; signature checks return a sentinel `-1` "not_evaluated" and are excluded from parity, mirroring the 4S parity contract). `canonical_json` must byte-match `canonicalJson` (copy the 4S `vdcc_kernel.py` canonicalisation verbatim).

- [ ] **Step 1: Failing test** — `parity.test.js` spawns `python3 vic_parity.py <fixture.json>` for every non-signature Lane A fixture (exclude the 134-mutation fixture) and asserts stdout raw == JS `evaluateCapsuleSafe` raw. Guard: skip with a logged notice if `python3` absent (CI always has it).
- [ ] **Step 2: Run → FAIL.** **Step 3: Implement** (do NOT run `black` on any frozen predecessor; format only the new file). **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(4t): JS-Python parity for the VIC decision core over all non-signature fixtures"`

---

## Task 11: Lane B — staged contained near-incident ceremony + three views

**Files:**

- Create: `tools/simurgh-attestation/stage4t/laneb/run-laneb-incident-ceremony.mjs`
- Create (generated, committed): `docs/research/llm-shield/evidence/stage-4t/laneb/{capture.json,views/{regulator,insurer,public}.json,README.md}`
- Test: `tests/e2e/llmShield/stage4t/laneb.test.js`

**Interfaces:**

- Produces: `runVicLaneB({ mode: "capture" | "verify" })` — capture mode: spawns the **4S** `laneb/delegatee-mcp-server.mjs` as a second OS process over MCP stdio (reuse the 4S ceremony harness verbatim — import, do not copy), drives a delegation in which the delegatee returns an **over-scoped crossing**; runs 4S `evaluateChainSafe` in-process → expects raw **108**; builds the capsule over the contained event (census = chain bundle + kernel decision records + 4U attestation ref (digest of the committed 4U attestation) + 4O consent manifests + 4N temporal anchor (beat index read from the committed 4N evidence)) with **ephemeral** keys and random salts; derives the three tiered views (public view redacts `reporting_provider_identity` + `model_identification` sections per regime); writes the capture. Verify mode: re-verifies the committed capture (capsule green under `evaluateCapsuleSafe` with recorded-verdict cross-stage readers, all three views green against commitments, recorded chain verdict is 108) — **never regenerates**.
- `incident_classification` and `incident_description` sections are `requires_human_input` in the capture — assert this in the test (the rail demonstrated).

- [ ] **Step 1: Failing e2e test** — verify-mode assertions above against the committed capture (which does not exist yet → FAIL).
- [ ] **Step 2: Implement, run capture once, commit the capture.** README.md documents ephemeral keys + verify-only discipline + the staged-near-incident limitation verbatim from spec §2.2.
- [ ] **Step 3: Run verify mode → PASS.** **Step 4: Commit** — `git commit -m "feat(4t): Lane B staged contained near-incident over real MCP hop — capsule + three consistent views (verify-only capture)"`

---

## Task 12: Lean — `proofs/stage4t/NoHearsay.lean` + workflow

**Files:**

- Create: `proofs/stage4t/NoHearsay.lean`, `proofs/stage4t/lakefile.toml`, `proofs/stage4t/lean-toolchain` (`leanprover/lean4:v4.15.0`)
- Modify: `.github/workflows/stage-4-lean-proofs.yml` (add the stage4t build step, mirroring stage4u's entry)

**Interfaces:**

- Produces four checked theorems over a small abstract model (mirror the stage4s/stage4u Lean modeling style — finite `List`-based structures, decidable checkers):
  1. `noHearsay` — the checker accepts only if every section is assigned exactly one of the three classes (partition exhaustive + no fourth state constructible).
  2. `suppressionDetectable` — if a section is classed derivable and the census holds matching-kind evidence, marking it absent ⇒ checker rejects.
  3. `censusExactness` — for an injective digest model, removing or adding a committed item changes the folded root.
  4. `noTwoStories` — under commitment binding (modelled injectivity), a verified view's disclosed value equals the capsule's, and its undisclosed set equals its declared redaction set.

- [ ] **Step 1: Write the model + theorem statements with `sorry`.** Do not rely on `lake build` failing on `sorry` (Lean emits a warning, not an error, by default — P1-5). The enforced guard is a grep: `! grep -Rn "\bsorry\b" proofs/stage4t` must exit non-zero-free (no matches) for the task to be complete; add that grep to the reproduce script's guarded Lean step and the CI lean workflow.
- [ ] **Step 2: Prove all four (zero `sorry`), `lake build` → success AND `! grep -Rn "\bsorry\b" proofs/stage4t` → no matches.**
- [ ] **Step 3: Add the workflow step; do NOT add lean to `check.sh` (4R lesson — dedicated CI job only).**
- [ ] **Step 4: Commit** — `git commit -m "feat(4t): machine-checked NoHearsay/suppressionDetectable/censusExactness/noTwoStories (Lean 4.15.0, zero sorry)"`

---

## Task 13: Reproduce script + `check-e2e.sh` row

**Files:**

- Create: `scripts/reproduce-llm-shield-stage4t.sh`
- Modify: `scripts/check-e2e.sh` (add row `"Stage 4T VIC|scripts/reproduce-llm-shield-stage4t.sh"` next to the 4S/4U rows at ~line 126)

**Interfaces:**

- Produces a verify-only script (mirror `reproduce-llm-shield-stage4s.sh` structure): Node ≥ 26 gate → rebuild Lane A fixtures to a temp dir → `cmp` byte-equality vs committed → recompute + verify attestation both tiers → Lane B verify mode → tamper one census item in a temp copy → expect a census-law failure → tamper one view value → expect 148 → guarded Lean build only if `lean` on PATH. No network, no wall clock.

- [ ] **Step 1: Write the script; run it end-to-end → exit 0.**
- [ ] **Step 2: Tamper-negative self-test: corrupt a committed fixture in a temp checkout → script exits non-zero.**
- [ ] **Step 3: Add the check-e2e row; run `bash scripts/check-e2e.sh` → green.**
- [ ] **Step 4: Commit** — `git commit -m "feat(4t): one-command byte-stable reproduce + check-e2e wiring"`

---

## Task 14: Browser verifier — `browser/vic-verifier.html` + parity gate

**Files:**

- Create: `tools/simurgh-attestation/stage4t/browser/vic-verifier.html`
- Test: `tests/e2e/llmShield/stage4t/browserParity.test.js`

**Interfaces:**

- Produces one static, dependency-free HTML file (pattern: 4M `browser/build-browser-verifier.mjs` — inline the needed pure functions by generating the HTML from the core modules at build time, or hand-inline `canonicalJson`/`sha256` via WebCrypto): drop a capsule JSON → green/red per template section per regime; drop a view JSON → verify via `verifyViewAgainstCommitments` semantics + show the redaction ledger; banner renders the rail `browser_verifier_is_a_convenience_view_not_the_authoritative_verifier`; **no network calls** (CSP meta tag `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`).
- Parity gate: `browserParity.test.js` extracts the inlined verifier script from the HTML, evaluates it in a `node:vm` context with a WebCrypto shim, runs it over every Lane A fixture + the Lane B views, and asserts verdict equality with the CLI (`evaluateCapsuleSafe`). Failure blocks the tag — it is a test, not a runtime raw code.

- [ ] **Step 1: Failing parity test.** **Step 2: Implement the HTML.** **Step 3: Parity test → PASS; open the file manually once and drop the Lane B public view (visual check).**
- [ ] **Step 4: Commit** — `git commit -m "feat(4t): static single-file browser verifier with CLI parity gate (convenience view, CLI authoritative)"`

---

## Task 15: K7 all-functions E2E net

**Files:**

- Create: `tests/e2e/llmShield/stage4t/k7AllFunctions.test.js`

**Interfaces:**

- Consumes every export of every stage4t module (constants, templateMap, censusCore, projectionCore, viewCore, capsuleCore, fixtures builder, attestation build/verify, laneb verify).

- [ ] **Step 1: Write the net:** (a) compose an honest end-to-end flow from raw 4S chain → census → capsule → attestation → three views → both verifier tiers → browser-parity core; (b) full tamper matrix for **133–149** (drive the exported `FIXTURE_MUTATIONS` through `evaluateCapsuleSafe` and through the audit-tier verifier), plus the typed-wrapper-only **150** fail-closed fixture; (c) cross-stage invariants: capsule over a tampered 4S bundle fails 146/142 and never 0; the suppression duel (same section: fabricate → 141-path, suppress → 143); a contradicting view never verifies (148); (d) read-only-predecessor assertion via committed state — copy the 4U K7 baseline resolver verbatim (`BASE=$(git merge-base HEAD <ref>)` trying `origin/main` then `main`, so a moving `origin/main` cannot false-fail — P1-6), then `git show "$BASE:<file>"` vs HEAD for `capability_kernel.py`, each `stage4s/core/*.mjs`, AND every frozen predecessor 4T imports directly: `stage4m/core/canonical.mjs`, `stage4s/core/receiptBuilder.mjs`, and `stage4h/exitCodes.mjs` **restricted to the pre-existing lines** (4T legitimately appends codes 133–150 to exitCodes.mjs, so assert the 119–132 VRTA block and everything above it is byte-identical to base, not the whole file).
- [ ] **Step 2: Run under Node 26 → PASS.** Then the full local gate: `bash check.sh` → green (rerun the known stage27 flake if it trips).
- [ ] **Step 3: Commit** — `git commit -m "test(4t): K7 all-functions e2e net — tamper matrix 133-149 + 150 wrapper + cross-stage and read-only invariants"`

---

## Task 16: Docs, closeout, scorecard re-score, north-star update, tag

**Files:**

- Create: `docs/research/llm-shield/STAGE_4T_CLOSEOUT.md` (mirror `STAGE_4S_CLOSEOUT.md`: frozen core claim, what shipped, honest results table for 0/133–150 with how each was exercised, partition census published as a finding — how many sections per class per regime, consent-IOU retirement in the spec §6 wording, four-axis re-score with evidence, reviewer one-command instructions, gotchas)
- Modify: `docs/research/llm-shield/NORTH_STAR_VDCC.md` (status update: 4T shipped, wedge artifact delivered)
- Modify: `README.md` (stage table row, neutral copy)
- Create: memory `project_stage-4t-vic.md` + `MEMORY.md` line

- [ ] **Step 1: Docs-accuracy pass** — read every claim in the spec, closeout, README row, and north-star update against shipped code; fix or soften any mismatch (spec deltas recorded honestly, 4P-style, if implementation diverged).
- [ ] **Step 2: Full gate again:** `bash check.sh` + every prior `scripts/reproduce-llm-shield-stage4*.sh` under Node 26 → all green.
- [ ] **Step 3: Version check:** `git tag --sort=-creatordate | head` → confirm `v2.29.0-stage-4u-vrta` is latest → tag target stays `v2.30.0-stage-4t-vic`.
- [ ] **Step 4: Commit, push, PR (neutral title/body), merge per project convention, tag after merge.**

---

## Self-Review (run after writing, fixed inline)

- **Spec coverage:** §2 lists → Task 3 constants; §3 dual templates → Tasks 2–3; §4 census → Task 4; §5 suppression → Task 5; §6 capsule/binding/146/147 + consent IOU → Tasks 7, 16; §6.1 views → Tasks 6, 11, 14; §7 lanes → Tasks 8, 11; §8 codes/order/ripple → Tasks 1, 15; §9 tiers + browser → Tasks 9, 14; §10 reproduce → Task 13; §11 Lean → Task 12; §12 kernel-untouched → Task 15(d); §13 citations pinned → Task 16 closeout; §14 re-score + §15 E2E/docs pass → Tasks 15–16; §16 file structure → header block; §17 closeout → Task 16. No gaps found.
- **Placeholder scan:** template section lists are explicitly marked "fetched text wins"; all other steps carry code or exact procedures. Clean.
- **Type consistency:** `evaluateCapsuleSafe` / `verifyTemplateBindings` / `verifyCensus` / `verifyProjection` / `verifySuppression(capsule, partitions, kindOf)` / `verifyViewAgainstCommitments(view, commitments)` / `capsuleAttestationDigest` / `verifySeal` / `bundleMerkleRoot` / `keyDigest` / `setEqual` / `KIND_EVIDENCE_SOURCE` / `FIXTURE_MUTATIONS` names are used identically across Tasks 3–15. Clean.

## Patch round (post-review, 2026-07-07)

Seven P0 + eight P1 trapdoors fixed inline before handoff:

- **P0-1** Task-3 136 test now sets the binding's `partition_digest` to the gappy partition so 136 fires, not 135; added an extra-entry 136 test.
- **P0-2** Task-4 145 test re-roots the manifest after mutating `item.epoch` so 145 fires, not 140.
- **P0-3** `verifySuppression` reads `capsule.evidence_manifest.items` for kinds; `KIND_EVIDENCE_SOURCE` exported.
- **P0-4** capsule carries `capsule_key_digest`; `evaluateCapsule` requires `capsulePubKeyPem`; Lane B capture carries `capsule_pubkey_pem` (ephemeral) — 134 verifiable.
- **P0-5** attestation seals `lane_a_fixtures` (all 18), not one `capsule`; omission test added.
- **P0-6** `capsuleCore` L1 rejects unknown/extra regimes and wrong binding count as 133; partition check is exact `setEqual` (missing OR extra → 136).
- **P0-7** exact `capsuleAttestationDigest`/`verifySeal` two-stage formula with the 4P re-canonicalise round-trip.
- **P1s:** probe-hygiene path corrected (`tests/unit/llmShield/exitCodeProbeHygiene.test.js`); 17-row mutation table; `verifyViewAgainstCommitments` input shape pinned; HTML comment header; Lean `sorry` grep-guard (not `lake build` reliance); K7 merge-base baseline + widened frozen-file set (exitCodes checked above the 133 block only); signed capsule includes `honesty_rails`; Task-2 fail-closed on fetch failure.

### Round 2 (one remaining P0 + 2 P1)

- **P0 (digest-shape gremlin):** `capsuleAttestationDigest` referenced `body.content`, but the declared wrapper had no `content` field. Fixed with Option A — every two-stage wrapper (capsule bundle AND Task-9 attestation) nests its payload under a top-level `content` key; the digest is always over `body.content`. Added the explicit bundle-vs-capsule boundary to Task 7 (`bundle = { schema, content:<capsule>, attestation_digest, signature }`, core verifiers get `bundle.content`) and `VIC_CAPSULE_BUNDLE_SCHEMA` to constants; Task-9 attestation and the omission test updated to the `content`-nested path.
- **P1** view verifier now checks each `redactions.commitments[i] === commitmentByKey.get(key)` (a redaction cannot advertise a fabricated commitment).
- **P1** L1 rejects duplicate valid regimes via a `Set`-size check (duplicate `gpai_art55` + missing `art73` → 133, not a misleading 135).
