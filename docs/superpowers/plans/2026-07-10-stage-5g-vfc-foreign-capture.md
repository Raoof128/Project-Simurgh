# Stage 5G — VFC: Verifiable Foreign Capture (implementation plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.**
> Spec: `docs/superpowers/specs/2026-07-10-stage-5g-vfc-foreign-capture-design.md`.
> Version **v2.42.0**, raw codes **283–299**, branch `stage-5g-vfc`.
> Marker key: **[S§n]** spec section · **[Ln]** law · **[A/B/C/D]** beast inventions · **[Lean]** proof ·
> **[C]** Lane C (non-CI). Every code task is **test-first**: failing test → watch it fail → minimal code
> → green → `npm run format` → `npm run format:check` (whole-repo, never a glob).
>
> **Scope honesty [S§1, S§5]:** VFC computes the strongest **producer/verifier separation rung** a foreign
> capture actually supports and **rejects unsupported upgrades**. **Not category-creating** (OVERT ships
> tiered independent-attestation levels + a pinned Protocol Profile); VFC is the executable,
> byte-reproducible, Lean-modelled **per-capture instantiation**. Separation ≠ correctness; rung-2 ≠
> human/organisational non-control; challenge-binding ≠ wall-clock freshness ≠ rerun-absence; process/key
> separation ≠ institution-independent. Single detector (PG2). Rung-2 real keyless-Sigstore is a socket;
> Lane C targets rung-1.
>
> **No separate amendment layer** — every gauntlet correction is merged into its owning task.

## Ground rules (from the gotcha ledger — read BEFORE Task 1)

- **All runtime modules live in `tools/simurgh-attestation/stage5g/`.** Reuse 3W's OIDC/Sigstore and
  5E/5F capture patterns by **copying logic in or invoking a hash-bound vendored copy; NEVER `import`
  from another stage** at runtime. The only subprocess kernel is `node/sigstoreKernelRunner.mjs` (Task 14).
- Raw codes are **additive** in the global ledger `stage4h/exitCodes.mjs` (5F ends at **282**; VFC is
  **283–299**). Adding them regenerates the signed 4h digest fixtures — a deterministic **golden ripple**
  (blast radius: `tests/unit/llmShield/stage4h/exitWrapper.test.js` inline map, BOTH `exit-map.json`
  files, `exitCodeProbeHygiene.test.js`). Regen with `build-stage4h-digest-fixtures.mjs` **under Node 26
  from a CLEAN fixture state**. Never probe an unknown code with a hardcoded literal — `UNKNOWN_RAW_PROBE=999`.
- `npm test` = unit only. Byte-stable evidence builds **ONLY under Node 26**
  (`export PATH="/opt/homebrew/opt/node@26/bin:$PATH"`). **Dir byte-stability:** snapshot sorted per-file
  `sha256`, rebuild into a clean temp dir, diff the hash set, then `git diff --exit-code` — **never `cmp`**.
- **No binary floating-point or score arithmetic affects a verdict.** Rungs compare as **exact small
  integer ordinals** (`RUNG.index`, a `Number` used only as an ordinal — never a measurement/float);
  digests are strings; counts are exact integers.
- **No object hashes or signs itself** [S§2]. Each signed object has a `<obj>.content.v1` sub-object
  (plain ASCII, **no ellipsis, no zero-width chars** — byte-stability landmine):
  `digest = sha256(DOMAIN.<obj> ‖ canonicalJson(content))`,
  `signature = sign(key, DOMAIN.<obj> ‖ canonicalJson(content))` — **signatures are domain-separated too**,
  guarding against cross-object substitution. Digest/signature fields live in the **wrapper only**.
- **Fingerprint (VFC-local):** `fingerprint(pem) = "sha256:" + sha256(createPublicKey(pem).export({type:"spki",format:"der"}))`.
  This is **canonical SPKI-DER**, robust to PEM wrapping and usable on a key extracted from a certificate.
  It is a deliberate VFC-local choice, **distinct from** prior stages' `keyDigest` (raw-PEM) — do not
  conflate; VFC computes its own pins with this function on both sides of every comparison.
- **The neural forward pass NEVER runs in CI.** Models run offline only in Lane C (Tasks 28–29). CI
  exercises synthetic fixtures + arithmetic/geometry + Ed25519 + the mock Sigstore kernel.
- **Failure codes are frozen and never conflated:** malformed evidence → 283–295; overclaim → **296**;
  audit census → **297**; honest-but-below-policy → **298**; env/kernel-unavailable → **299** (own suite;
  never misreported as tampering). **Policy never turns absent evidence into malformed evidence.**
  `evaluateForeignCapture` never fails open.
- **External trust supplied from OUTSIDE the bundle** [S§2, 5E lesson]: the verifier pin (`stage5g/pin.json`,
  compact canonical, prettier-ignored) binds **all three** of `{verifier_key_fingerprint,
  verifier_identity_subject, verifier_identity_digest}`; the Sigstore Fulcio/Rekor root allowlist
  (`stage5g/trust-root.json`, formatted, compared by canonicalJson digest) is supplied externally.
  Checked FIRST; unknown embedded trust-root fields → 283.
- **CLI-main guard:** `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`.
- **Process exit ≠ raw** (raw > 255 wraps): print full raw in JSON, set
  `process.exitCode = (result.raw === 0 ? 0 : 1)` (all VFC codes are non-zero → 1; mirrors 5F's CLI).
- **Key-commit rule:** never commit production, actor-controlled, or non-fixture private keys.
  **Deterministic test-only keys are committed solely under the audited fixture allowlist** (PATH REGEX
  in **both** `scripts/security-audit-llm-shield-stage3m.sh` and `scripts/security-audit-llm-shield-stage3o.sh`,
  `INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem`, **no digits**). `.env` gitignored.
- Final evidence generated **LAST** (Task 30). Neutral messages, **no attribution trailers**.

---

## Task 0 — Test-key fixtures + external trust config + Sigstore fixture material

Create in `tests/fixtures/llmShield/stage5g/test-keys/` (deterministic committed keys; never
`generateKeyPairSync` in a builder):
- `INSECURE_FIXTURE_ONLY_stage-vfc.pem` — Simurgh attestation/verifier (Ed25519)
- `INSECURE_FIXTURE_ONLY_stage-vfc-producer.pem` — the **distinct** foreign producer (Ed25519)
- `INSECURE_FIXTURE_ONLY_stage-vfc-ceremony.pem` — Lane B ceremony (Ed25519)
- `INSECURE_FIXTURE_ONLY_stage-vfc-fulcio.pem` — mock Fulcio CA
- `INSECURE_FIXTURE_ONLY_stage-vfc-rekor.pem` — mock Rekor log signing key

Sigstore fixture bundle (rung-2, `tests/fixtures/llmShield/stage5g/sigstore/`) — full offline surface:
Fulcio **leaf certificate** (certifies the producer identity; carries `producer_key_algorithm`), Rekor
**signed checkpoint**, **inclusion proof**, **SCT**, and a **frozen integrated time** constant. The mock
Fulcio certifies the Ed25519 producer key for the fixture; the schema also carries `producer_key_algorithm`
so real keyless Sigstore (ECDSA ephemeral) is expressible via the **cross-binding** (Task 14), not key
identity.

External config **outside** the evidence dir:
- `tools/simurgh-attestation/stage5g/pin.json` (compact canonical:
  `{"verifier_key_fingerprint":"sha256:…","verifier_identity_subject":"…","verifier_identity_digest":"sha256:…","ceremony_fingerprint":"sha256:…"}`)
  — **the pin fingerprints are computed and recorded HERE in Task 0** (via `fingerprint()` + the identity
  digest formula), and **verified by Task 7 / Task 23**.
- `tools/simurgh-attestation/stage5g/trust-root.json` (Fulcio/Rekor root manifest + `schema_version`).

Deliverable: keys + Sigstore material + both config files committed. **Commit.**

---

## Task 1 — Register raw codes 283–299 in the global ledger  [S§2]

**Test first** — `tests/unit/llmShield/stage5g/exitCodesVfc.test.js`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  VFC_RAW_CODES, VFC_PUBLIC_CHECK_ORDER, VFC_AUDIT_CHECK_ORDER,
  VFC_AUDIT_ONLY_CODES, VFC_POLICY_CODES, stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VFC raw codes are 283–299, contiguous", () => {
  const vals = Object.values(VFC_RAW_CODES).filter((v) => v !== 0);
  assert.deepEqual(vals, Array.from({ length: 17 }, (_, i) => 283 + i));
});
test("public order 283–296; audit adds 297; audit-only=[297]; policy=[298]", () => {
  assert.deepEqual(VFC_PUBLIC_CHECK_ORDER, Array.from({ length: 14 }, (_, i) => 283 + i));
  assert.deepEqual(VFC_AUDIT_CHECK_ORDER, Array.from({ length: 15 }, (_, i) => 283 + i));
  assert.deepEqual(VFC_AUDIT_ONLY_CODES, [297]);
  assert.deepEqual(VFC_POLICY_CODES, [298]);
});
test("every 283–299 has run level 1", () => {
  for (let c = 283; c <= 299; c++) assert.equal(stage4CodeForRawCode(c), 1);
});
```
_(Verified against the ledger: the run-level lookup is `stage4CodeForRawCode` — misleadingly named, it
returns `RUN_LEVEL_BY_RAW[code]`, defaulting to 3 for unknowns. Do **not** invent a `runLevelForCode`.)_
**Then** append after the VMP block (after line 875) mirroring the VMP shape:
```js
export const VFC_RAW_CODES = Object.freeze({
  OK: 0,
  VFC_SCHEMA_INVALID: 283,
  VFC_ATTESTATION_TRUST_OR_SIGNATURE_INVALID: 284, // reason: external_pin_missing|external_pin_mismatch|attestation_signature_invalid
  VFC_CHALLENGE_RECEIPT_INVALID: 285,
  VFC_PRODUCER_ATTRIBUTION_MISSING: 286, // Law 1
  VFC_PRODUCER_SIGNATURE_INVALID: 287,
  VFC_CAPTURE_DIGEST_MISMATCH: 288,
  VFC_KEY_NOT_DISTINCT: 289, // rung-0 floor
  VFC_CHALLENGE_UNBOUND: 290, // Law 2 (present-but-incomplete binding)
  VFC_CHALLENGE_MISMATCH: 291, // Law 2 (present-but-mismatched)
  VFC_SUBJECT_NOT_DISTINCT: 292, // rung-2
  VFC_EXTERNAL_TRUST_CONFIGURATION_INVALID: 293, // rung-2, fail-closed
  VFC_ANCHOR_EVIDENCE_INVALID: 294, // rung-2
  VFC_ANCHOR_BINDING_MISMATCH: 295, // rung-2, Law 4
  VFC_SEPARATION_OVERCLAIM: 296, // Law 3 — headline
  VFC_AUDIT_CENSUS_MISMATCH: 297, // audit-only
  VFC_POLICY_REJECTED: 298, // strict min-rung
  INTERNAL_OR_ENV_UNAVAILABLE_VFC: 299, // fail-closed wrapper + kernel unavailable
});
export const VFC_PUBLIC_CHECK_ORDER = Object.freeze([283,284,285,286,287,288,289,290,291,292,293,294,295,296]);
export const VFC_AUDIT_CHECK_ORDER = Object.freeze([283,284,285,286,287,288,289,290,291,292,293,294,295,296,297]);
export const VFC_AUDIT_ONLY_CODES = Object.freeze([297]);
export const VFC_POLICY_CODES = Object.freeze([298]);
```
Insert `283:1 … 299:1` into `RUN_LEVEL_BY_RAW` before its closing `});` (currently ends `282: 1` at
line 1169). No new export — `stage4CodeForRawCode` (line 1172) already returns these. **Ripple:** regen
under Node 26: `node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`; update the
inline map in `tests/unit/llmShield/stage4h/exitWrapper.test.js` (add 283–299);
`node --test tests/unit/llmShield/stage4h/*.test.js` green. **Commit.**

---

## Task 2 — `stage5g/constants.mjs`  [S§1, S§2]

**Test first** — `constants.test.js`: `RUNG.order` deepEquals `["distinct_key_only","challenge_bound","externally_anchored"]`;
`rungGte("externally_anchored","challenge_bound")===true`; `rungGte("distinct_key_only","challenge_bound")===false`;
`DOMAIN.challenge_receipt==="simurgh.vfc.challenge_receipt.v1\n"`; `DOMAIN.verifier_identity` and
`DOMAIN.producer_identity` present; `ANCHOR_TYPES` deepEquals `["none","sigstore_oidc"]`.
**Then**:
```js
export { VFC_RAW_CODES as CODES, VFC_PUBLIC_CHECK_ORDER, VFC_AUDIT_CHECK_ORDER,
  VFC_AUDIT_ONLY_CODES, VFC_POLICY_CODES } from "../stage4h/exitCodes.mjs";
const ORDER = ["distinct_key_only", "challenge_bound", "externally_anchored"];
export const RUNG = Object.freeze({ order: ORDER, index: (r) => ORDER.indexOf(r) }); // ordinal only, never a measurement
export function rungGte(a, b) {
  const i = ORDER.indexOf(a), j = ORDER.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`invalid rung ${JSON.stringify([a, b])}`);
  return i >= j;
}
export const ANCHOR_TYPES = Object.freeze(["none", "sigstore_oidc"]);
export const DOMAIN = Object.freeze({
  challenge_receipt: "simurgh.vfc.challenge_receipt.v1\n",
  producer_transcript: "simurgh.vfc.producer_transcript.v1\n",
  foreign_capture: "simurgh.vfc.foreign_capture.v1\n",
  capture: "simurgh.vfc.capture.v1\n",
  anchor_evidence: "simurgh.vfc.anchor_evidence.v1\n",
  verifier_identity: "simurgh.vfc.verifier_identity.v1\n",
  producer_identity: "simurgh.vfc.producer_identity.v1\n",
  capture_census: "simurgh.vfc.capture_census.v1\n",
});
export const VFC_SCHEMAS = Object.freeze({
  challenge_receipt: "simurgh.vfc.challenge_receipt.v1",
  producer_transcript: "simurgh.vfc.producer_transcript.v1",
  foreign_capture: "simurgh.vfc.foreign_capture.v1",
  capture: "simurgh.vfc.capture.v1",
  verifier_identity: "simurgh.vfc.verifier_identity.v1",
  producer_identity: "simurgh.vfc.producer_identity.v1",
  anchor_evidence: "simurgh.vfc.anchor_evidence.v1",
  capture_census: "simurgh.vfc.capture_census.v1",
  campaign_outcome: "simurgh.vfc.campaign_outcome.v1",
  blind_recompute_receipt: "simurgh.vfc.blind_recompute_receipt.v1",
});
export const CAMPAIGN_STATUS = Object.freeze(["completed", "declined", "no_show", "environment_failed"]);
export const DEFAULT_MIN_RUNG = "challenge_bound";
export const VFC_RESERVED_SLOTS = Object.freeze([
  "real_sigstore_anchor_execution_deferred", "foreign_panel_capture_deferred",
  "dns_anchor_backend_deferred", "undisclosed_rerun_detection_deferred",
  "reflexive_foreign_capture_execution_deferred", "producer_affiliation_deferred",
  "overt_vfc_crosswalk_deferred", "cap_srp_receipt_bridge_deferred",
]);
```
**Identity-digest formula (frozen):** `identityDigest(id) = domainDigest(DOMAIN.<role>_identity, id)` over the
FULL identity object `{identity_subject, public_key_pem, key_fingerprint, anchor_type, anchor_subject}`.
**Commit.**

---

## Task 3 — `core/canonical.mjs` + `core/digests.mjs`  [S§2]

**Interfaces:** `canonicalJson(v)->string` (sorted keys, compact — copy 5F verbatim);
`domainDigest(domainSep, contentObj)->"sha256:"+hex` = `sha256(domainSep + canonicalJson(contentObj))`;
`sha256Hex(str)`. **Test first** — key-order independence; exact domain-prefixed digest value.
**Then** implement with `node:crypto`. **Commit.**

---

## Task 4 — `core/signatures.mjs`  [S§2; SPKI-DER fingerprint]

**Interfaces:**
- `fingerprint(pem)` = `"sha256:"+sha256(createPublicKey(pem).export({type:"spki",format:"der"}))`.
- `signContent(privPem, domainSep, contentObj)->sigB64` = `sign(null, Buffer.from(domainSep+canonicalJson(contentObj)), key)`.
- `verifyContent(identity, domainSep, contentObj, sigB64)` — **recompute** `fingerprint(identity.public_key_pem)`,
  assert `=== identity.key_fingerprint` (else throw → caller maps to its code), then verify the
  domain-separated signature. Returns bool.

**Test first** — sign fixture content with producer key → `verifyContent` true; PEM re-wrapped with
different line endings → same fingerprint (SPKI-DER robustness); fingerprint/PEM mismatch → throws;
tampered content → false. **Then** implement. **Commit.**

---

## Task 5 — `_validBundle.mjs` fixture (+`resign`) + challenge issuer helper  [S§2]

`tests/unit/llmShield/stage5g/_validBundle.mjs` exports:
- `issueChallenge({corpus, panelPlan, detectorSnapshot, verifierIdentity})` → signed rung-1 challenge
  receipt (fixture verifier key) — mirrors `node/issue-vfc-challenge.mjs` (Task 21).
- `validBundle({rung})` → a valid `foreign_capture.v1`. **Task 5 builds only `distinct_key_only` and
  `challenge_bound`** (no Sigstore dependency). The `externally_anchored` variant is added in **Task 14**
  once the Sigstore fixture exists (cannot forward-reference).
- `resign(bundle)` → re-derives `challenge_record_digest`, `capture_digest`, `producer_identity_digest`,
  `verifier_identity_digest`, and re-signs **all THREE** signed objects in dependency order (challenge
  receipt→verifier key, producer transcript→producer key, attestation→verifier key). **Every mutated-bundle
  test MUST `resign` unless it targets a signature/digest check** (284/285/287 gate everything after).

**Test first** — `fixture.test.js` (satisfies the failing-test ritual **without** the not-yet-existing
evaluator): assert `issueChallenge` output verifies under `verifyContent`; assert `resign(validBundle())`
still has all three signatures verifying and `capture_digest === domainDigest(DOMAIN.capture, capture)`;
assert a mutated cell **without** `resign` breaks `capture_digest`. **Commit.**

---

## Shared `ctx` and result types (frozen — used by Tasks 6–23)  [S§2, S§3]

```text
ctx = {
  tier: "public"|"audit", minRung, attestationOnly: bool,
  verifierPin: { verifier_key_fingerprint, verifier_identity_subject, verifier_identity_digest },
  trustRootAllowlist: [ rootFingerprint... ],
  artifacts: { panelPlan, corpus, detectorSnapshot },   // loaded from --dir; 291 recomputes from THESE
  auditCensus,                                          // audit tier only
  kernelResult,                                         // canonical Sigstore-kernel output (Task 14), or null
  diag,                                                 // scratch: checks may set diag.trust_reason (284) etc.
}
result = {
  raw, tier,
  record_authentic,        // structure + attribution + 3 signatures + external pin OK  (raw ∉ {283,284,285,286,287})
  attestation_valid,       // raw === 0 || raw === 298 (honest policy rejection keeps a valid record)
  claimed_rung, proven_rung, minimum_required_rung,
  policy_evaluated,        // !attestationOnly
  policy_accepted,         // true iff raw===0; false iff raw===298; null if bypassed or preempted
  audit_census_verified,   // true only when tier==="audit" AND 297 ran+passed (public can't masquerade)
  rung2_anchor_verified,   // anchor evidence present AND 292–295 passed
  trust_reason,            // ctx.diag.trust_reason for 284, else null
}
```

## Tasks 6–19 — check modules (each: test-first → one code → commit)

Each exports `checkX(bundle, ctx) -> rawCode | null` — **uniform numeric-or-null contract**, never an
object. Unit-tested in isolation: `validBundle()`→null and a `resign`'d targeted tamper→its code.

- **Task 6 — `core/schema.mjs` → 283.** **Recursive exact-schema validation** — reject unknown keys
  recursively in challenge-receipt (wrapper+content), producer-transcript (wrapper+content), both
  identities, capture+cells, anchor-evidence+DSSE, census, and foreign-capture (wrapper+content); reject
  any embedded trust-root field. **`anchor_evidence`/`anchor_evidence_digest` are driven by PRESENCE, not
  `claimed_rung`:** if `anchor_evidence` absent → `anchor_evidence_digest` MUST be absent (not null); if
  present → digest required. Adds `capture_census_digest` to the required attestation-content keys. Test:
  unknown nested key → 283; `anchor_evidence_digest` present with no `anchor_evidence` → 283.
- **Task 7 — `core/attestationTrust.mjs` → 284.** External pin first, binding **all three**:
  `ctx.verifierPin` present (else `diag.trust_reason="external_pin_missing"`);
  `fingerprint(bundle.verifier_identity.public_key_pem)===verifierPin.verifier_key_fingerprint`,
  `bundle.verifier_identity.identity_subject===verifierPin.verifier_identity_subject`,
  `identityDigest(bundle.verifier_identity)===verifierPin.verifier_identity_digest`
  (else `external_pin_mismatch`); then verify `attestation_signature` (else `attestation_signature_invalid`).
  **Returns `284` or `null`** (reason on `ctx.diag`). Test each branch.
- **Task 8 — `core/challengeReceipt.mjs` → 285** *(runs only if a challenge receipt is present)*. Verify
  verifier sig over receipt content; recompute `challenge_record_digest`; assert
  `receipt.content.verifier_identity_digest === identityDigest(bundle.verifier_identity)`. Test each.
- **Task 9 — `core/producerTranscript.mjs` → 286/287.** 286: producer identity/key present; **exact
  attribution** — `capture.producer_identity_ref === identityDigest(bundle.producer_identity)` **and**
  `transcript.content.producer_identity_digest === identityDigest(bundle.producer_identity)** (closes the
  re-skinning gap); cells are covered because the whole ordered cell array is bound by `capture_digest`
  (Task 10). 287: verify producer sig over transcript content (fingerprint recomputed first). Test each.
- **Task 10 — `core/captureDigest.mjs` → 288.** Recompute `domainDigest(DOMAIN.capture, capture)` over the
  whole capture object `{schema, producer_identity_ref, detector_snapshot_digest, corpus_digest, cells}`
  and compare to `transcript.content.capture_digest`. Test: mutate a cell → 288.
- **Task 11 — `core/keySeparation.mjs` → 289.** `fingerprint(producer.public_key_pem) !==
  fingerprint(verifier.public_key_pem)`. Test: producer key == verifier key (+`resign`) → 289
  (`honor_system_self_graded`, Invention C).
- **Task 12 — `core/challengeBinding.mjs` → 290/291** *(runs only if challenge binding present)*. 290:
  `transcript.content.challenge_record_digest` present but a required committed digest field missing. 291:
  bound `challenge_record_digest` equals the receipt's **and** the receipt's committed
  `{panel_plan,corpus,detector_snapshot}_digest` equal digests **recomputed from
  `ctx.artifacts.{panelPlan,corpus,detectorSnapshot}`** (not the bundle's `_ref.digest` copies). Test:
  strip a committed field → 290; mutate `ctx.artifacts.corpus` → 291. **Absence of challenge binding is
  NOT 290** — it leaves proven rung 0 (handled by rungLattice + overclaim/policy).
- **Task 13 — `core/subjectSeparation.mjs` → 292** *(anchor present only)*. anchored producer subject !==
  `ctx.verifierPin.verifier_identity_subject` (externally-configured). Test → 292.
- **Task 14 — `node/sigstoreKernelRunner.mjs` + `core/anchorBinding.mjs` → 293/294/295** *(anchor present
  only)*. Kernel runs the **offline** mock Sigstore verify (fixture Fulcio leaf + Rekor checkpoint +
  inclusion proof + SCT, **frozen integrated time, no `Date.now()`**); kernel cannot execute → surfaced as
  299 by `vfcCore`; its canonical output goes on `ctx.kernelResult`. `anchorBinding` (pure): 293 external
  trust config present + root fp ∈ `ctx.trustRootAllowlist`; 294 kernel result valid + frozen
  issuer·audience·subject match; 295 **(a)** the DSSE statement (signed by the Fulcio-certified key, any
  `producer_key_algorithm`) binds `{producer_identity_digest, producer_key_fingerprint, capture_digest,
  challenge_record_digest}` — a **cross-binding**, not "Fulcio key == producer key" (real keyless Fulcio
  is ECDSA); **(b)** `domainDigest(DOMAIN.anchor_evidence, bundle.anchor_evidence) ===
  producer_transcript.content.anchor_evidence_digest` [P0 — else a genuine transcript could be paired with
  substituted anchor evidence]. **Also adds** the rung-2 `validBundle` variant + a **`resignRung2(bundle)`
  helper** that recomputes `anchor_evidence_digest`, re-builds the DSSE statement, and re-signs it with the
  fixture Fulcio-certified key (so rung-2 tamper fixtures fire their target check first). Collision-safe
  fixtures [gotcha]: `notified_body_unanchored` = valid trust config + claims rung-2 + **no
  `anchor_evidence`** → proven stays 1 → **296** (not 293); `missing_trust_config` = claims rung-2 **and
  CARRIES valid `anchor_evidence`** but the **external trust config is absent/root not allowlisted** →
  **293** (must carry anchor evidence, else the presence-driven evaluator skips 293–295); `retained_auditor`
  = valid rung-2 (the non-claim fixture). Test 293/294/295 (incl. the anchor-digest mismatch) + the
  conditional matrix.
- **Task 15 — `core/rungLattice.mjs` + `core/overclaim.mjs` → 296.** `rungLattice(predicates)` computes
  `proven_rung` from already-verified booleans (`{keyDistinct, challengeBound, anchorValid, subjectDistinct}`),
  **re-checking nothing**: rung0 always (past 287+289), +challengeBound→rung1, +anchorValid∧subjectDistinct→rung2.
  `overclaim`: `rungGte(claimed, proven) && claimed!==proven` → 296. Test: claimed anchored over rung-1 →
  296; lower claim over stronger evidence → accepted, both rungs reported.
- **Task 16 — `core/census.mjs` → 297** (audit-only, **pure, no forward pass**). Over `capture_census.v1`
  `{challenge_record_digest, corpus_digest, attempt_records[], terminal_records[], capture_digest}` with a
  stable `record_id` on each attempt/terminal: one terminal per committed case; no dup/omission; every
  attempt→one terminal; every cell↔one terminal; and the census binding
  **`domainDigest(DOMAIN.capture_census, census) === attestation.content.capture_census_digest`**. Sets
  `audit_census_verified`. Test a dropped terminal → 297; a census-digest mismatch → 297.
- **Task 17 — `core/policy.mjs` → 298.** `rungGte(proven_rung, ctx.minRung ?? DEFAULT_MIN_RUNG)` else 298;
  `ctx.attestationOnly` bypasses (policy_evaluated=false). **Policy never mutates integrity status.** Test:
  honest rung-0 bundle + default min → 298; `attestationOnly` → null.
- **Task 18 — `core/campaignOutcome.mjs`.** `validateCampaign(obj)` over `campaign_outcome.v1`; only
  `status:"completed"` may carry a producer transcript; a non-completed outcome **never** enters
  `evaluateForeignCapture`. Test: `no_show` with a transcript → throws.
- **Task 19 — `core/diversity.mjs` [A].** `diversityIndex(attestations[])` → projection
  `{by_rung:{...}, distinct_anchored_subjects:int, state:"diverse"|"monoculture"|"insufficient_anchored_evidence"}`
  where `distinct_anchored_subjects` counts **only** attestations with `proven_rung==="externally_anchored"`
  (rung-0/1 subjects are self-declared — never counted); `insufficient_anchored_evidence` when <2 anchored.
  When emitted as an artifact it is signed by the attestation key (that is the only sense of "signed").
  **Non-claim (doc-comment):** counts distinct anchored subjects, not humans/orgs. Test: two anchored,
  one subject → `monoculture`; zero anchored → `insufficient_anchored_evidence`.

---

## Task 20 — `core/vfcCore.mjs`: `evaluateForeignCapture` + `…Safe`  [S§2, S§3]

**Interface:** `evaluateForeignCapture(bundle, ctx) -> result` (both frozen types above);
`evaluateForeignCaptureSafe(bundle, ctx)` wraps in try/catch → `{...result, raw:299, record_authentic:false,
attestation_valid:false, policy_accepted:null}`; **never throws, never fails open.**

**Test first** — valid rung-1 → `{raw:0, proven_rung:"challenge_bound", record_authentic:true,
attestation_valid:true, policy_accepted:true, audit_census_verified:false}`; valid rung-2 (audit) →
`externally_anchored`, `audit_census_verified:true`, `rung2_anchor_verified:true`; **honest rung-0 +
default policy → raw 298, attestation_valid:true, policy_accepted:false, and 292–295 NEVER run** (assert
via a `trustRootAllowlist` getter that throws if touched); each tamper yields its code in frozen order; a
throw past the signature gate → 299. **`vfcCore` is PURE — it NEVER invokes the Sigstore kernel** [P0]. The Node orchestrator (Task 22) runs
`sigstoreKernelRunner` and populates `ctx.kernelResult`; `vfcCore` only *consumes* it. If anchor evidence
is present but `ctx.kernelResult` is missing/undefined → **299** (required kernel output unavailable),
never a silent skip. **Then** implement the **presence-driven conditional model**:
```text
predicates = { keyDistinct:false, challengeBound:false, anchorValid:false, subjectDistinct:false }
run 283, 284, 285(if challengeReceiptPresent), 286, 287, 288, 289 in order → first non-null → return
predicates.keyDistinct = true  // guaranteed past 289
if challengeBindingPresent:
    if !challengeReceiptPresent: return 290   // FROZEN: binding digest present but no receipt → 290 (never a stray 291 vs undefined)
    run 290, 291 → first non-null → return; predicates.challengeBound = true
  // challenge binding ABSENT → challengeBound stays false (NOT 290); rung stays 0
if anchorEvidencePresent:
    if ctx.kernelResult == null: return 299   // orchestrator must have populated it
    run 292, 293, 294, 295 in order → first non-null → return
    predicates.subjectDistinct = true; predicates.anchorValid = true
  // anchor ABSENT → rung capped at 1 (NOT 293/294/295)
proven_rung = rungLattice(predicates)
if overclaim(claimed_rung, proven_rung): return 296
if tier==="audit": run 297 → set audit_census_verified
if !attestationOnly && !rungGte(proven_rung, minRung ?? DEFAULT_MIN_RUNG): raw = 298
assemble result per the frozen shape (record_authentic / attestation_valid / policy_* / rung2_anchor_verified)
```
`presence` helpers: `challengeReceiptPresent = !!bundle.challenge_receipt`, `challengeBindingPresent =
!!bundle.producer_transcript?.content?.challenge_record_digest`, `anchorEvidencePresent =
!!bundle.anchor_evidence`. **Commit.**

---

## Task 21 — Challenge tooling  [S§4]

`node/issue-vfc-challenge.mjs` (committed artifact refs, ≥256-bit nonce `crypto.randomBytes(32)`, derive
`challenge_record_digest`, sign the receipt with the verifier key, write **no** capture/attestation) +
`node/verify-vfc-challenge.mjs` (producer verifies the receipt under the external verifier pin before
running PG2). **Test first** — issue→verify round-trips; tampered receipt → non-zero. CLI-main guard;
`process.exitCode` mapping. **Commit.**

---

## Task 22 — Evidence builder + verifier CLI  [S§3]

`node/build-vfc-evidence.mjs` — assembles the synthetic Lane-A bundle **from FROZEN committed inputs**
[P1, byte-stability]: it reads a **committed `challenge-receipt.json`** (issued ONCE via Task 21 and
committed) — it **never generates a fresh nonce and never reruns inference**; it only recomputes digests
and re-assembles. Two fresh builds therefore match byte-for-byte. Writes the committed artifacts
`panel-plan.json`/`shared-corpus.json`/`detector-snapshot-manifest.json`.
`node/verify-vfc-attestation.mjs` (CLI: `--tier --attestation-only --min-rung --dir --verifier-pin
--trust-root`) is the **orchestrator**: loads pin + trust-root + `ctx.artifacts` from the specified paths;
if `bundle.anchor_evidence` present, **runs `sigstoreKernelRunner` and sets `ctx.kernelResult`** before
calling the pure `evaluateForeignCaptureSafe`; **prints full raw JSON**, sets
`process.exitCode = result.raw===0?0:1`. **Test first** — build twice → manifest-identical; verify raw 0
(public + audit); `--min-rung externally_anchored` on a rung-1 bundle → raw 298 in JSON, exit 1. **Commit.**

---

## Task 23 — Lane B sidecar ceremony  [S§3]

`laneb/ceremony.mjs` + `laneb/run-laneb-recompute-ceremony.mjs`. Receipt schema
`simurgh.vfc.blind_recompute_receipt.v1` content: `{challenge_record_digest, capture_digest,
producer_transcript_digest, producer_identity_digest, verifier_identity_digest, attestation_content_digest,
anchor_evidence_digest?(absent at rung-1), recomputed_proven_rung}`; wrapper adds `{ceremony_key_fingerprint,
signature}`. **The ceremony key SIGNS the receipt; the external ceremony pin VERIFIES it (a pin does not
sign).** Process-2 independently recomputes the digests + re-verifies all three bundle signatures +
`proven_rung`, asserts equality, signs the receipt. **Sidecar only — removal does NOT invalidate the
principal attestation** [S§3]. **Test first** — ceremony over `validBundle()` corroborates; mutated capture
→ mismatch. **Commit.**

---

## Task 24 — Python parity  [S§3]

`python/vfc_parity.py` — **independent** reimpl of the exact JS canonicalisation (implement the same
algorithm, not a bare `json.dumps`), the domain-separated digest surface, the rung-predicate lattice, and
Ed25519 verification (`cryptography`). Sigstore = shared-kernel note. **Test first** — `pythonParity.test.js`
runs it against committed evidence → `{"vfc_parity":"corroborated"}` + byte-identical digests; **plus a
parity corpus** (`parityCorpus.json`) exercising Unicode, astral chars, newlines, backslashes, empty
objects, nested arrays, control-char escapes, and max safe integers — asserted byte-identical JS↔Python.
**Commit.**

---

## Task 25 — Browser portable verifier  [S§3]

`browser/{index.html, canonical-json.mjs, vfc-portable.mjs}`. Recompute digests + rung predicates +
Ed25519 (WebCrypto). Returns exactly `{verification_scope:"portable", portable_valid, proven_rung_portable,
rung2_status:"not_evaluated", full_attestation_status:"not_evaluated", raw:null}` — **never** a complete
`proven_rung` when an anchor exists but wasn't evaluated. **Claim split** [gauntlet]: (a) portable crypto
parity tested in **Node WebCrypto** (`browserParity.test.js`); (b) CSP/no-egress verified by **static
policy inspection** of `index.html` (assert the `<meta http-equiv="Content-Security-Policy">` forbids
`connect-src`/external hosts) — **no runtime browser-network-enforcement claim** (no real headless harness
this stage). **Commit.**

---

## Task 26 — Lean proofs  [Lean, S§4]

`proofs/stage5g/ForeignCapture.lean`, lean 4.15, **zero `sorry`**, wired into `stage-4-lean-proofs.yml`.
**Exactly 10 theorems + 1 lemma.** The **Anchoring Trilemma is NOT a Lean theorem** — pre-issued
credentials falsify its naive statement, so it ships as a **signed design observation** (spec §6 /
closeout) with its assumptions stated, not a zero-`sorry` proof [gauntlet: don't overclaim a theorem].
The 10 theorems + lemma:
1. `rungMonotonicity` — `requirements(anchored) ⊇ requirements(challenge) ⊇ requirements(distinct)` (+ dual `satisfies` antitone)
2. `overclaimSound` — `claimed > proven → raw = 296`
3. `rung0RequiresDistinctKey` — rung-0 acceptance → producer key ≠ verifier key
4. `challengeBindingSound` — digest/challenge consistency (not time, not rerun-absence)
5. `captureDigestBindsContext` — accepted capture digest binds producer-id-ref + detector snapshot + corpus + cells
6. `subjectAnchorBindingSound` — binds an accepted external subject (not humans, not non-collusion)
7. `externalRootRequiredForRung2` — rung-2 acceptance requires an externally-supplied trust value (not Fulcio/Rekor security)
8. `attestationTrustRequiresExternalPin` — any acceptance requires the external verifier pin (raw 284)
9. `producerTranscriptBindsIdentity` — a valid transcript binds `producer_identity_digest`
10. `strictPolicyMayRejectValidLowerRung` — a truthful rung-0 record may be valid while strict policy → 298
+ lemma `verifierCodomainHasNoIndependenceBoolean` — the result type has no boolean `independent`, only the rung ladder + codes.

**Design observation (not Lean)** — *Anchoring Trilemma* [B]: under the assumption that "external anchor"
requires a fresh online interaction at capture time, no rung simultaneously gives {offline producer,
external anchor, no online-root trust at verify}. **Caveat signed in the closeout:** pre-issued credentials
(anchored offline earlier, verified offline against a pre-committed root) can relax this — so it is a
tradeoff observation with stated assumptions, not a proof.
Model rungs as `inductive Rung | distinct | challenge | anchored`. Structural recursion + `getElem?`
idioms [gotcha: no `List.get?_set_ne`]. **Build:** `lake env lean proofs/stage5g/ForeignCapture.lean`
exit 0. **Commit.**

---

## Task 27 — Homework Corpus fixtures  [C]

`homeworkCorpus.test.js` drives the three named fixtures through `evaluateForeignCapture`:
`honor_system_self_graded`→289, `notified_body_unanchored`→296, `retained_auditor`→valid
`externally_anchored` **with the rung-2 ≠ non-collusion non-claim asserted in the test doc-comment**. **Commit.**

---

## Task 28 — Standalone foreign-capture pack  [C, S§4]

`tools/simurgh-attestation/stage5g/foreign-capture-pack/{run.sh, verify-challenge.py, capture_pg2.py,
sign-transcript.py, requirements.lock, README.md, OUTPUT_CONTRACT.md}`. Accepts {signed receipt, external
verifier pin, safe corpus, pinned detector snapshot, actor-controlled key}; returns **only** the capture
package; receives **no** Simurgh private material. **Frozen offline acquisition lifecycle** (in
`README.md` + enforced by `run.sh`): (1) acquire the exact pinned detector snapshot; (2) verify its
manifest digest + revision; (3) `export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1`; (4) capture entirely
from the verified cache — the producer must not silently download a different model. **Test first** — a
shell test runs the pack against a fixture challenge with a throwaway local key; the emitted transcript
verifies at rung-1. **Commit.**

---

## Task 29 — Lane C real capture (non-CI) + release-gate capture  [C, D]

`lanec/capture_pg2.py` (single detector, MPS-or-CPU, pinned revision) + `lanec/build-real-evidence.mjs`
(assembles the real attestation into `docs/research/llm-shield/evidence/stage-5g/real-capture/`).
**Release-gate + honest-title rule [P0 — actor definition is load-bearing]:** the shipped **"foreign"
claim requires a `completed` rung-1 capture produced by a SEPARATELY-REPORTED EXTERNAL ACTOR** who
controls the producer key AND the environment (the named actor: the reproduction team). A second machine
run by the same Simurgh operator is **NOT** a foreign producer — it proves operational separation only, and
would not answer the "you graded your own homework" criticism. Two honest outcomes, no third:
- **External actor completes** → ship as **Verifiable Foreign Capture**, rung-1 real, Frontier moves.
- **Only operator-separated available (or a no-show)** → **the stage ships under the DOWNGRADED title
  "Challenge-Bound Operator-Separated Capture"**, the words *foreign / independent-party* are explicitly
  **not** claimed, Frontier is scored down, and the external run is carried as
  `reflexive_foreign_capture_execution_deferred` (a no-show is honest `campaign_outcome.v1`).

Also stages **Lane C-reflexive [D]** (Simurgh's own conformance artifact via the external producer).
**Executed with the user, not in CI.**

---

## Task 30 — Gates, reproduce, evidence, byte-stability  [S§3, gotcha]

Separate, explicitly-named gates (K7 covers JS exports **only**):
1. **JS K7 net** `tests/e2e/llmShield/stage5g/k7-vfc.test.js` — every JS export + tamper suites split
   **integrity/overclaim 283–297 / policy 298 / env 299** + cross-object invariants.
2. **Python** import/function tests (Task 24) · **CLI matrix** (Task 22) · **browser** portable (Task 25)
   · **shell-pack** (Task 28) · **Lean** zero-sorry build (Task 26) — each run + recorded separately.
3. `scripts/reproduce-llm-shield-stage5g.sh` — fail-closed, **two-line gates** (never `cmd && echo` under
   `set -e` [5E lesson]); rebuild evidence into a temp dir under Node 26; diff sorted sha256 manifest;
   `git diff --exit-code`; verify `real-capture/` via `--dir` when present.
4. **Prior-reproduction list (frozen, explicit paths):** run each of
   `scripts/reproduce-llm-shield-stage4y.sh`, `scripts/reproduce-llm-shield-stage4z.sh`,
   `scripts/reproduce-llm-shield-stage5a.sh`, `scripts/reproduce-llm-shield-stage5b.sh`,
   `scripts/reproduce-llm-shield-stage5c.sh`, `scripts/reproduce-llm-shield-stage5d.sh`,
   `scripts/reproduce-llm-shield-stage5e.sh`, `scripts/reproduce-llm-shield-stage5f.sh` — additive codes
   must not disturb sealed history. (Verify each path exists first; if a stage's script name differs,
   correct to the real path — do not skip.)
5. Add the stage5g allowlist line to **`scripts/security-audit-llm-shield-stage3m.sh`** and
   **`scripts/security-audit-llm-shield-stage3o.sh`** (exact paths).
6. `.prettierignore += docs/research/llm-shield/evidence/stage-5g/` + `tools/simurgh-attestation/stage5g/pin.json`
   (trust-root.json **stays formatted**).
7. **Generate final evidence LAST**, Node 26, into `docs/research/llm-shield/evidence/stage-5g/`; build
   twice, assert manifest-identical. **Commit.**

---

## Task 31 — Release-facing docs (PRE-merge) + ceremony + post-release metadata

**Doc ordering [P1 — released tree must contain its own docs]:**
1. **BEFORE merge/tag**, commit the release-facing docs into the PR branch so they exist in the released
   tree: `docs/research/llm-shield/STAGE_5G_CLOSEOUT.md` (re-scored four-axis + OVERT/CAP-SRP crosswalk
   paragraph + signed limitations incl. the Anchoring-Trilemma caveat + socket ledger + S§4 crosswalk
   tasks), **README banner → v2.42.0**, and the honest **title decision** from Task 29 (foreign vs
   operator-separated). Leave clearly-marked `TO-CONFIRM` slots ONLY for the three facts that cannot exist
   pre-tag (reproduce-on-main result, tag commit hash, Release-Latest confirmation).
2. **Mandatory ceremony** (a tag is not a Release; a Release is not proof the tree reproduced):
   ```text
   PR → CI green → rebase-merge → git fetch && git reset --hard origin/main
   → reproduce under Node 26 on merged main (all gates + prior-repro list green)
   → git tag v2.42.0-stage-5g-vfc at the reproduced HEAD → git push origin <tag>
   → gh release create (not draft) → verify via `gh release list` it exists + is marked Latest
   → assert tag commit == reproduced HEAD
   ```
3. **AFTER the Release only** (post-release metadata): fill the three `TO-CONFIRM` slots in the closeout
   with the reproduced-HEAD hash + Release-Latest confirmation; write memory (`MEMORY.md` pointer +
   `project_stage-5g-vfc.md`); Zurvan (search dupes first; decision ADR). Pay down the crosswalk tasks
   (OVERT Profile / Attestable Audits / arXiv / EUR-Lex) as far as sources allow; **downgrade any score
   honestly** if a crosswalk narrows a differentiation.

---

### Plan self-review (mechanical audit — re-run after any edit)
- **Spec coverage:** every S§2 code 283–299 owns exactly one Task-6–17 module; **299 is owned by Task 20**
  (the Safe wrapper), not a check module; all four beast inventions built (A/19, B/26, C/27, D/29).
- **Placeholder scan:** the earlier `domainDigest?` / `identityDigest?` placeholders are resolved to the
  frozen `identityDigest`/`domainDigest(DOMAIN.capture_census,·)` formulas. No `TBD`/`…` remain.
- **Type consistency:** the single frozen `ctx` and `result` shapes (declared once above) are referenced
  by Tasks 6–23; no task redefines them.
- **Honesty:** scope banner + Task 31 carry the corrected non-category-creation positioning; Task 29 makes
  a real foreign rung-1 capture a release gate.
