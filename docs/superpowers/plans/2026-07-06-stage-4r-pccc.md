# Stage 4R — PCCC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Stage 4R — Private Custody Corroboration Ceremony: a real-DDH curve25519 (Edwards form) two-operator match ceremony with commit-before-reveal, DLEQ-verified sealed audit packets, epoch-bound unlinkability (No Public Herd Token law), VFR-gated export of match records, window match census, BYO-Operator Kit, six Lean theorems, and a verify-only byte-idempotent reproduce over raw codes 90–99.

**Architecture:** Pure-function core (`tools/simurgh-attestation/stage4r/core/*`) with all digests via stage4m `canonicalJson`/`sha256Hex`; the Edwards25519 group and Chaum-Pedersen DLEQ are in-repo pure-BigInt reference modules (ZERO new deps) cross-validated against RFC 8032 vectors. Node layer does Ed25519 signing, process orchestration, and file I/O only. Pure-Python parity kernel mirrors group ops, DLEQ, and the normative check order. Lane A = deterministic fixture corpus with quarantined `INSECURE_FIXTURE_ONLY` scalars; Lane B = two real OS processes + the REAL shipped 4Q approver for the export crossing; reproduce verifies committed captures and never regenerates them.

**Tech Stack:** Node 26 (`node:test`, `node:crypto` Ed25519 + SHA, `node:child_process`), zero new npm deps, pure Python 3 (stdlib only), Lean 4 v4.15.0 (no mathlib), bash.

**Spec:** `docs/superpowers/specs/2026-07-06-stage-4r-pccc-design.md` (branch `stage-4r-pccc`, commits `be68324e` + `a6d6f80e` + `d1f97b61`). §N references below are to that spec.

## Global Constraints

- MOTTO header comment in every new file: `// Motto: AnthropicSafe First, then ReviewerSafe.` plus `// SPDX-License-Identifier: AGPL-3.0-or-later` first line (`--` comments in Lean, `#` in bash/Python).
- Raw codes 90–99 ONLY; closed ledger; unknown → run-level 3 via `stage4CodeForRawCode`. Normative first-failure order (§6.4, frozen): `90 → 91 → 94 → 95 → 96 → 93 → 92 → 99 → 97 → 98`. Earlier failures mask later checks.
- Digests: `sha256:` + `sha256Hex(canonicalJson({domain, …}))` using `tools/simurgh-attestation/stage4m/core/canonical.mjs` exports `canonicalJson`, `sha256Hex`, `recordDigest`, `DIGEST_RE`.
- Evidence digest domains start `SIMURGH_STAGE4R_`. Crypto domain-separation tags are the frozen §3 strings (`simurgh.pccc.class.v1`, `simurgh.pccc.match.v1`, `simurgh.pccc.token_commit.v1`, `simurgh.pccc.pair.v1`, `simurgh.pccc.match_commit.v1`, `simurgh.pccc.ephemeral_pub.v1`, `simurgh.pccc.dleq.v1`) — never invent more.
- Point encoding (frozen for the whole stage): RFC 8032 compressed Edwards, 64-char lowercase hex (`y` little-endian, high bit = `x` parity). Scalar encoding: 64-char zero-padded lowercase big-endian hex of the value mod L.
- The seven schemas (§5.1), seven non-claims (§2.1), five known_limitations (§2.2), sixteen rails (§7), and the three attestation kind strings (§5.1 item 5) are FROZEN — copy exactly, never paraphrase.
- Public bundle NEVER contains: `mask_point`, token, `token_nonce`, `z`, DLEQ proofs, `custody_class_digest`, scalars (§5.2). Sealed packet never contains a scalar (§5.3). Raw-98 refusal publishes NO match record (§4.2).
- Fixture Ed25519 keys: `tests/fixtures/llmShield/stage4r/test-keys/INSECURE_FIXTURE_ONLY_<letters-and-hyphens>.pem` — NO digits in names. Task 9 adds the allowlist line to BOTH `scripts/security-audit-llm-shield-stage3m.sh` and `-stage3o.sh`. Fixture curve scalars: `INSECURE_FIXTURE_ONLY_<letters-and-hyphens>-scalar.hex` in the same dir.
- VFR approver key digest must differ from operator-a, operator-b, ceremony-harness, and attestation keys — compared by public-key digest, never label (§4.2).
- `npm test` gates `tests/unit` only; e2e goes in `scripts/check-e2e.sh`. NEVER shell out to `rg` in a unit test. Unit runs use explicit file paths: `node --test tests/unit/llmShield/stage4r/<name>.test.js`.
- Prettier: `npx prettier --write` every JS/MD file BEFORE freezing any digest of it; `docs/research/llm-shield/evidence/stage-4r/**` and `tests/fixtures/llmShield/stage4r/**` prettier-ignored in Task 9 BEFORE the first evidence write.
- Reproduce byte-idempotent twice under Node 26 (`/opt/homebrew/opt/node@26/bin` locally); VERIFY-ONLY for Lane B (refresh only via `SIMURGH_REFRESH_STAGE4R_LANEB=1`, outside reproduce). No network anywhere.
- Harness signing key OUT OF REPO at `~/simurgh-keys/stage4r.pem`; reproduce re-verifies, never re-signs.
- Commits: neutral conventional messages. No AI attribution of any kind.
- Overclaim scan trips on bare negations near capability nouns — phrase docs accordingly (4N lesson). Say `prior_art_limiting_rows`, never "kill-shot" (§8.2).
- The known pre-existing `scripts/check.sh` RED (worktrees/.history, untracked artifacts) is NOT a 4R gate (§18).

---

### Task 1: Raw-code registry extension (90–99) + all shared goldens

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs`
- Modify: `tests/unit/llmShield/stage4p/constants.test.js` (the "unknown" probe at line ~48)
- Modify (golden bumps, discover exact spots by running the suites): 4H `exit-map.json` golden + 4H exitWrapper inline map, 4K/4H exitWrapper snapshots, 4L e2e net golden (§14)
- Test: `tests/unit/llmShield/stage4r/exitCodes.test.js`

**Interfaces:**

- Consumes: existing `stage4CodeForRawCode`, `VFR_RAW_CODES` block shape in `exitCodes.mjs`.
- Produces: `PCCC_RAW_CODES` (frozen object, 10 names→codes), `PCCC_CHECK_ORDER` (frozen array), `PCCC_REASONS_90`, `PCCC_REASONS_93`, `PCCC_REASONS_96` (frozen subreason arrays), registry map rows `90..99 → 1`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/llmShield/stage4r/exitCodes.test.js
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  PCCC_RAW_CODES,
  PCCC_CHECK_ORDER,
  PCCC_REASONS_90,
  PCCC_REASONS_93,
  PCCC_REASONS_96,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("pccc raw codes 90-99 are frozen (spec §6.1)", () => {
  assert.deepEqual(PCCC_RAW_CODES, {
    PCCC_TRANSCRIPT_SCHEMA_INVALID: 90,
    OPERATOR_IDENTITY_SIGNATURE_INVALID: 91,
    MATCH_CLAIM_CONFLICT: 92,
    DDH_TRANSCRIPT_MISMATCH: 93,
    SMALL_ORDER_OR_ALL_ZERO_FAIL_CLOSED: 94,
    CROSS_EPOCH_REPLAY_DETECTED: 95,
    EPHEMERAL_KEY_REUSE_DETECTED: 96,
    DISCLOSURE_BUDGET_EXCEEDED: 97,
    VFR_EXPORT_GATE_FAILED: 98,
    PUBLIC_HERD_TOKEN_VIOLATION: 99,
  });
});

test("normative check order is frozen (spec §6.4)", () => {
  assert.deepEqual(PCCC_CHECK_ORDER, [90, 91, 94, 95, 96, 93, 92, 99, 97, 98]);
});

test("subreason ledgers are frozen (spec §6.2, §6.3)", () => {
  assert.deepEqual(PCCC_REASONS_90, [
    "pccc_token_commitment_missing",
    "pccc_token_commitment_opening_invalid",
    "pccc_phase_order_invalid",
    "slot_cardinality_commitment_missing",
    "slot_cardinality_mismatch",
    "slot_terminal_record_missing",
    "window_match_census_mismatch",
  ]);
  assert.deepEqual(PCCC_REASONS_93, [
    "token_recompute_mismatch",
    "dleq_mask_proof_invalid",
    "dleq_z_proof_invalid",
  ]);
  assert.deepEqual(PCCC_REASONS_96, [
    "mask_reuse_detected",
    "ephemeral_public_digest_reuse_detected",
  ]);
});

test("registry maps 90-99 to stage-4 code 1 and 100 is unknown (3)", () => {
  for (let raw = 90; raw <= 99; raw++) assert.equal(stage4CodeForRawCode(raw), 1);
  assert.equal(stage4CodeForRawCode(100), 3);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/unit/llmShield/stage4r/exitCodes.test.js`
Expected: FAIL — `PCCC_RAW_CODES` is not exported.

- [ ] **Step 3: Extend the registry**

Append below the `VFR_*` block in `exitCodes.mjs` (mirror its comment style):

```js
// Stage 4R — PCCC (spec §6). 94 before 95/96 because a degenerate point must
// never be diagnosed as reuse; 95 before 96 so a cross-epoch replay with
// identical mask bytes reads as replay, not reuse; 98 last — its refusal is
// the ledgered expected-GREEN.
export const PCCC_RAW_CODES = Object.freeze({
  PCCC_TRANSCRIPT_SCHEMA_INVALID: 90,
  OPERATOR_IDENTITY_SIGNATURE_INVALID: 91,
  MATCH_CLAIM_CONFLICT: 92,
  DDH_TRANSCRIPT_MISMATCH: 93,
  SMALL_ORDER_OR_ALL_ZERO_FAIL_CLOSED: 94,
  CROSS_EPOCH_REPLAY_DETECTED: 95,
  EPHEMERAL_KEY_REUSE_DETECTED: 96,
  DISCLOSURE_BUDGET_EXCEEDED: 97,
  VFR_EXPORT_GATE_FAILED: 98,
  PUBLIC_HERD_TOKEN_VIOLATION: 99,
});
export const PCCC_CHECK_ORDER = Object.freeze([90, 91, 94, 95, 96, 93, 92, 99, 97, 98]);
export const PCCC_REASONS_90 = Object.freeze([
  "pccc_token_commitment_missing",
  "pccc_token_commitment_opening_invalid",
  "pccc_phase_order_invalid",
  "slot_cardinality_commitment_missing",
  "slot_cardinality_mismatch",
  "slot_terminal_record_missing",
  "window_match_census_mismatch",
]);
export const PCCC_REASONS_93 = Object.freeze([
  "token_recompute_mismatch",
  "dleq_mask_proof_invalid",
  "dleq_z_proof_invalid",
]);
export const PCCC_REASONS_96 = Object.freeze([
  "mask_reuse_detected",
  "ephemeral_public_digest_reuse_detected",
]);
```

Then add `90: 1, … 99: 1` rows to the raw→stage4 map object (same object that holds `80: 1 … 89: 1`).

- [ ] **Step 4: Bump the 4P probe and hunt the goldens**

In `tests/unit/llmShield/stage4p/constants.test.js` change the unknown probe from 90 to 100 (and its comment: `// 90-99 are Stage 4R PCCC codes (mapped to 1); 100+ is unknown.`). Then run the FULL unit suite and fix every golden the additive codes break — expect the 4H exit-map golden, 4H/4K exitWrapper snapshots, and the 4L e2e net list (§14; there may be a seventh — the 4Q lesson).

Run: `npm test`
Expected: all green after bumps.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4h/exitCodes.mjs tests/unit/llmShield/stage4r/exitCodes.test.js tests/unit/llmShield/stage4p/constants.test.js <every bumped golden>
git commit -m "feat: extend raw-code registry with stage 4r pccc codes 90-99 and bump dependent goldens"
```

---

### Task 2: Stage4r constants module

**Files:**

- Create: `tools/simurgh-attestation/stage4r/constants.mjs`
- Test: `tests/unit/llmShield/stage4r/constants.test.js`

**Interfaces:**

- Consumes: nothing new.
- Produces: `SCHEMAS` (7), `CRYPTO_DOMAINS` (7 frozen §3 strings), `DOMAINS` (all `SIMURGH_STAGE4R_*`: `PAIR_ID_HASH`, `TRANSCRIPT`, `MATCH_RECORD`, `CEREMONY_CAPTURE`, `SEALED_PACKET`, `ATTESTATION`, `CENSUS`, `REFUSAL`, `INVITATION`, `PROCESS_INSTANCE`), `PCCC_NON_CLAIMS` (7, §2.1), `PCCC_KNOWN_LIMITATIONS` (5, §2.2), `PCCC_RAILS` (16, §7), `VERIFICATION_KINDS` (`{LANE_A, LANE_B, PACKET}` §5.1), `SLOT_TERMINAL_KINDS` (3, §8.1), `DLEQ_RELATION_KINDS = ["mask", "z"]`, `DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW = 4` (4P import), `ROLES = ["a", "b"]`, `POINT_HEX_RE = /^[0-9a-f]{64}$/`, `SCALAR_HEX_RE = /^[0-9a-f]{64}$/`.

- [ ] **Step 1: Write the failing test** — assert `SCHEMAS` deep-equals the seven §5.1 names (`simurgh.pccc_mask_message.v1`, `simurgh.pccc_match_transcript.v1`, `simurgh.pccc_match_record.v1`, `simurgh.pccc_ceremony_capture.v1`, `simurgh.pccc_attestation.v1`, `simurgh.pccc_dleq_proof.v1`, `simurgh.pccc_operator_invitation.v1`); `CRYPTO_DOMAINS` deep-equals the seven §3 tags; `PCCC_NON_CLAIMS`, `PCCC_KNOWN_LIMITATIONS`, `PCCC_RAILS` deep-equal the frozen spec lists verbatim; `VERIFICATION_KINDS` deep-equals `{LANE_A: "deterministic_replay_with_fixture_scalars", LANE_B: "two_party_ceremony_dleq_audit_verified", PACKET: "sealed_transcript_packet_for_offline_verifier"}`; all `DOMAINS` values match `/^SIMURGH_STAGE4R_[A-Z0-9_]+$/` and are unique.
- [ ] **Step 2: Run to verify FAIL** (`node --test tests/unit/llmShield/stage4r/constants.test.js`).
- [ ] **Step 3: Implement `constants.mjs`** — literal frozen objects copied from the spec (no derivation logic).
- [ ] **Step 4: Run to verify PASS.**
- [ ] **Step 5: Commit** — `feat: add stage 4r pccc constants (schemas, crypto domains, rails, non-claims)`.

---

### Task 3: Edwards25519 reference group + RFC 8032 vector gate

**Files:**

- Create: `tools/simurgh-attestation/stage4r/core/edwards25519.mjs`
- Test: `tests/unit/llmShield/stage4r/edwards25519.test.js`
- Seed source: `tools/simurgh-attestation/stage4r/probes/dleq-probe.mjs` (already committed — lift its arithmetic)

**Interfaces:**

- Consumes: `node:crypto` (hashing only).
- Produces: `P`, `L`, `G`, `ID`, `add(p, q)`, `mul(k, p)`, `affine(p)`, `eq(p, q)`, `onCurve(p)`, `isSmallOrder(p)` (true iff `eq(mul(8n, p), ID)`), `encodePoint(p)` → 64-hex RFC 8032 compressed, `decodePoint(hex)` (throws on off-curve/bad encoding), `randomScalar()`, `scalarFromHex(hex)`, `scalarToHex(k)`, `hashToPoint(cryptoDomain, epoch, label)` (try-and-increment on sha256 counter, cofactor-cleared, throws on identity).

- [ ] **Step 1: Write the failing tests**

```js
test("basepoint is on curve and has order L", () => {
  assert.ok(onCurve(G));
  assert.ok(eq(mul(L, G), ID));
});

test("RFC 8032 vector: encodePoint(G) is the standard basepoint encoding", () => {
  assert.equal(encodePoint(G), "5866666666666666666666666666666666666666666666666666666666666666");
});

test("RFC 8032 TEST 1 public key: secret-derived scalar times G", () => {
  // RFC 8032 §7.1 TEST 1: sk 9d61...  -> pk d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a
  // Derive the clamped scalar from sha512(sk) exactly as RFC 8032 does, then
  // assert encodePoint(mul(s, G)) equals the published pk. Implement inline in the test.
});

test("encode/decode round-trips and rejects off-curve", () => {
  const Pt = mul(12345n, G);
  assert.ok(eq(decodePoint(encodePoint(Pt)), Pt));
  assert.throws(() => decodePoint("ff".repeat(32)));
});

test("hashToPoint is deterministic, on-curve, non-identity, domain-separated", () => {
  const a = hashToPoint("simurgh.pccc.class.v1", "sha256:e", "class-x");
  const b = hashToPoint("simurgh.pccc.class.v1", "sha256:e", "class-x");
  const c = hashToPoint("simurgh.pccc.class.v1", "sha256:OTHER", "class-x");
  assert.ok(eq(a, b));
  assert.ok(!eq(a, c));
  assert.ok(onCurve(a) && !isSmallOrder(a));
});
```

- [ ] **Step 2: Run to verify FAIL.**
- [ ] **Step 3: Implement** — lift field/point/mul/hashToPoint from the committed probe, add RFC 8032 compressed encode/decode (`y` LE bytes, top bit = x&1; decode recovers x via `recoverX`, checks on-curve), `isSmallOrder`, scalar hex helpers. Keep it under ~220 lines, pure, no I/O.
- [ ] **Step 4: Run to verify PASS** (RFC vectors are the gate — do not proceed on any mismatch).
- [ ] **Step 5: Commit** — `feat: add pure-bigint edwards25519 reference group with rfc 8032 vector gate`.

---

### Task 4: Double-mask + degenerate-point rejection

**Files:**

- Create: `tools/simurgh-attestation/stage4r/core/maskCore.mjs`
- Test: `tests/unit/llmShield/stage4r/maskCore.test.js`

**Interfaces:**

- Consumes: Task 3 exports; Task 2 `CRYPTO_DOMAINS`.
- Produces: `classPoint(epoch, custodyClassDigest)` → point; `maskPoint(scalar, point)` → point (throws `SMALL_ORDER` sentinel error if result small-order/identity — feeds raw 94); `matchToken(epoch, pairId, zPoint)` → `sha256:` digest (`canonicalJson({domain: CRYPTO_DOMAINS.MATCH, epoch, pair_id, z: encodePoint(z)})`); `pairId(epoch, operatorKeyDigests)` (sorted, `CRYPTO_DOMAINS.PAIR`); `pairMatchCommitment(epoch, pairId, match, transcriptDigest)`; `ephemeralPublicDigest(epoch, role, scalar)` (over `encodePoint(mul(scalar, G))`, `CRYPTO_DOMAINS.EPHEMERAL_PUB`).

- [ ] **Step 1: Failing tests** — double-mask commutes end-to-end (`matchToken` from `a·(b·Hc)` equals from `b·(a·Hc)` for same epoch/pair); different class ⇒ different tokens; same class different epoch ⇒ different `classPoint` AND different token (No Public Herd Token seed assertion); same class same epoch different pair ⇒ different token (§3.4 cross-pair claim); `maskPoint(scalar, smallOrderPoint)` throws the `SMALL_ORDER` sentinel.
- [ ] **Step 2: FAIL.** — [ ] **Step 3: Implement (pure, ~80 lines).** — [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat: add pccc double-mask core with epoch-bound tokens and degenerate-point rejection`.

---

### Task 5: DLEQ prove/verify + forged-relation vectors

**Files:**

- Create: `tools/simurgh-attestation/stage4r/core/dleq.mjs`
- Test: `tests/unit/llmShield/stage4r/dleq.test.js`

**Interfaces:**

- Consumes: Task 3 group; Task 2 `CRYPTO_DOMAINS.DLEQ`, `DLEQ_RELATION_KINDS`.
- Produces: `dleqProve({scalar, basePoint, epk, targetPoint, relationKind, epoch, runId, pairId, role})` → `{schema, relation_kind, epoch, run_id, pair_id, role, R1, R2, s}` (points as hex, `s` as scalar hex, schema = `SCHEMAS.DLEQ_PROOF`); `dleqVerify(proof, {basePoint, epk, targetPoint})` → boolean. Challenge = SHA-512 of `canonicalJson({domain: CRYPTO_DOMAINS.DLEQ, relation_kind, epoch, run_id, pair_id, role, g, base, epk, target, r1, r2})` reduced mod L.

- [ ] **Step 1: Failing tests** — honest mask-relation proof verifies; honest z-relation proof verifies; forged target (peer's mask swapped) rejected; tampered `s` rejected; proof bound to role/epoch (changing either in the proof object breaks verification); proof over small-order target rejected.
- [ ] **Step 2: FAIL.** — [ ] **Step 3: Implement** (lift Chaum-Pedersen from the probe; `sG == R1 + c·epk ∧ s·base == R2 + c·target`). — [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat: add chaum-pedersen dleq prove and verify with fiat-shamir binding`.

---

### Task 6: Schema validators (raw 90 structural tier)

**Files:**

- Create: `tools/simurgh-attestation/stage4r/core/schemaCore.mjs`
- Test: `tests/unit/llmShield/stage4r/schemaCore.test.js`

**Interfaces:**

- Consumes: Task 2 constants; `DIGEST_RE`, `POINT_HEX_RE`.
- Produces: `validateMaskMessage(obj)`, `validateTranscript(obj)`, `validateMatchRecord(obj)`, `validateCeremonyCapture(obj)`, `validateDleqProof(obj)`, `validateInvitation(obj)`, `validateAttestation(obj)` — each returns `{ok: true}` or `{ok: false, raw: 90, reason: "<subreason or field path>"}` and enforces EXACT key sets (§5.1 shapes; match record keys: `schema, match, epoch, pair_id_hash, pair_match_commitment, transcript_digest, vfr_receipt_digest, respondent_notice_hash, contest_pointer_hash, matched_against_operator_commitment, contest_route_available, signatures`). `validateTranscript` also enforces the phase-order vector (`["mask", "commit", "open", "sign"]` per role) → `pccc_phase_order_invalid`, presence of both commitments → `pccc_token_commitment_missing`.
- Public-shape guard: `assertNoSealedMaterial(matchRecord)` — rejects any of `mask_point|token|token_nonce|z|dleq` keys anywhere in the object tree (defence-in-depth for §5.2; the raw-99 SCAN lives in Task 8).

- [ ] Steps 1–4: TDD as above — one green case per schema + one exact-key rejection + phase-order rejection + `assertNoSealedMaterial` rejection.
- [ ] **Step 5: Commit** — `feat: add stage 4r schema validators with exact-key and phase-order enforcement`.

---

### Task 7: Ceremony core — commit/reveal machine + THE decision function

**Files:**

- Create: `tools/simurgh-attestation/stage4r/core/pcccCore.mjs`
- Test: `tests/unit/llmShield/stage4r/pcccCore.test.js`

**Interfaces:**

- Consumes: Tasks 2–6.
- Produces:
  - `tokenCommitment({epoch, runId, pairId, role, peerMaskDigest, token, tokenNonce})` → `sha256:` digest under `CRYPTO_DOMAINS.TOKEN_COMMIT` (§3.3 exact field order via canonicalJson).
  - `buildTranscript(...)` — assembles the four-phase transcript object (used by Lane A builder and Lane B operators).
  - `evaluateCeremony({transcript, sealedPacket, publicRecord, ledger, budgetState, vfrCheck})` → `{raw, reason, green}` — THE first-failure engine over the frozen order `90→91→94→95→96→93→92→99→97→98`:
    - 90 schema/phase/commitment-opening/cardinality/census (via Task 6 + `sha256` recompute of each opening against its commitment),
    - 91 both operator Ed25519 signatures over the transcript digest,
    - 94 any small-order/identity mask or z in the packet,
    - 95 message epoch ≠ ceremony epoch, or mask/token bytes duplicated across epochs in `ledger`,
    - 96 mask-digest or ephemeral-public-digest duplicated within the epoch ledger (subreasons per which),
    - 93 recompute both tokens from packet z (`token_recompute_mismatch`), verify all four DLEQ proofs (`dleq_mask_proof_invalid` / `dleq_z_proof_invalid`),
    - 92 transcript `match` bool contradicts token comparison,
    - 99 delegated scan hook (Task 8) over the public record,
    - 97 budget count vs `DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW`,
    - 98 `vfrCheck` callback result (Task 13 wires the real 4Q verifier; unit tests use a stub).
  - `GREEN = {raw: 0, green: true}` for accepted match AND accepted non-match.

- [ ] **Step 1: Failing tests** — golden honest MATCH ceremony returns green; honest NON-MATCH returns green; then one test per raw code + per subreason using minimal tampering of the golden (the token-copy liar arm asserts `{raw: 90, reason: "pccc_token_commitment_opening_invalid"}`; the claim liar asserts `{raw: 92}`; masking asserted: a bundle that is BOTH schema-broken and signature-broken returns 90, never 91).
- [ ] **Step 2: FAIL.** — [ ] **Step 3: Implement.** — [ ] **Step 4: PASS.**
- [ ] **Step 5: Commit** — `feat: add pccc ceremony evaluation engine with frozen check order and masking`.

---

### Task 8: Census, budget, herd-token scan, reuse/replay ledgers

**Files:**

- Create: `tools/simurgh-attestation/stage4r/core/censusCore.mjs`
- Test: `tests/unit/llmShield/stage4r/censusCore.test.js`

**Interfaces:**

- Consumes: Tasks 2, 6.
- Produces: `buildWindowMatchCensus(slotOutcomes)` → `{epoch, matches, non_matches, refusals}`; `checkCensus(census, slotLedger)` → 90/`window_match_census_mismatch` on any count drift; `checkSlotTerminality(slotLedger)` → 90 subreasons (`slot_cardinality_commitment_missing|slot_cardinality_mismatch|slot_terminal_record_missing`, §8.1); `herdTokenScan(publicBundle, privateIndex)` → 99 if any public leaf equals a known `custody_class_digest`, mask hex, z hex, or token digest from `privateIndex`, or matches `POINT_HEX_RE` outside the allowed public fields; `budgetCheck(exportCount)` → 97 above 4; `buildLedgers(runSet)` → `{maskDigestsByEpoch, ephemeralDigestsByEpoch, tokensByEpoch}` for the 95/96 checks.
- [ ] Steps 1–5: TDD (census exact-count green + one-off mismatch; terminality three subreasons; scan catches a planted class digest AND a planted raw point hex; budget green at 4 / red at 5). Commit — `feat: add pccc census, budget, herd-token scan, and reuse ledgers`.

---

### Task 9: Fixture keys + scalars, audit allowlists, prettierignore

**Files:**

- Create: `tests/fixtures/llmShield/stage4r/test-keys/INSECURE_FIXTURE_ONLY_operator-alpha.pem` (+ `-beta`, `-harness`, `-attestation` Ed25519 PEMs, generated by script, committed)
- Create: `tests/fixtures/llmShield/stage4r/test-keys/INSECURE_FIXTURE_ONLY_operator-alpha-scalar.hex` (+ `-beta-scalar.hex`)
- Modify: `scripts/security-audit-llm-shield-stage3m.sh`, `scripts/security-audit-llm-shield-stage3o.sh` (add `stage4r/test-keys/INSECURE_FIXTURE_ONLY_` allowlist line to BOTH)
- Modify: `.prettierignore` (add `docs/research/llm-shield/evidence/stage-4r/` and `tests/fixtures/llmShield/stage4r/` BEFORE any evidence lands)
- Test: `tests/unit/llmShield/stage4r/fixtures.test.js` (keys parse, scalars are `SCALAR_HEX_RE`, key digests are pairwise distinct — the §4.2 four-key separation precondition)

- [ ] Steps: generate with a one-shot `node` snippet (Ed25519 via `crypto.generateKeyPairSync`, scalars via `randomScalar()`), write test, run BOTH audit scripts + `npm test`, commit — `feat: add stage 4r quarantined fixture keys and scalars with audit allowlists`.

---

### Task 10: Python parity kernel

**Files:**

- Create: `tools/simurgh-attestation/stage4r/python/pccc_kernel.py` (pure stdlib: Edwards25519 field/point ops, hashToPoint, double-mask, DLEQ verify, token/commitment digests, check-order verdicts for a corpus file)
- Test: `tests/unit/llmShield/stage4r/parity.test.js` (spawns `python3`, feeds the Task 11 corpus JSON, asserts byte-equal `{raw, reason, token}` per case)

**Interfaces:**

- Consumes: corpus format defined here: `{cases: [{name, epoch, class_a, class_b, scalar_a, scalar_b, expect: {raw, reason, match}}]}`.
- Produces: `pccc_kernel.py verify <corpus.json>` printing one canonical JSON line per case.

- [ ] Steps: write parity test against a 3-case mini corpus (match green / non-match green / forged-dleq 93) inline in the test; implement kernel (~250 lines, mirror JS exactly — same canonicalJson rules as existing stage4q python kernel); PASS; commit — `feat: add pure-python pccc parity kernel (edwards25519 + dleq)`.

---

### Task 11: Lane A corpus builder + full tamper matrix

**Files:**

- Create: `tools/simurgh-attestation/stage4r/node/build-stage4r-fixtures.mjs`
- Create (generated, committed): `tests/fixtures/llmShield/stage4r/lane-a/corpus.json` + `docs/research/llm-shield/evidence/stage-4r/lane-a/` records
- Test: `tests/unit/llmShield/stage4r/fixturesCorpus.test.js`

**Interfaces:**

- Consumes: everything above; committed 4P custody-class digests read from `docs/research/llm-shield/evidence/stage-4p/` (entropy-floor-passing only, §4.1); fixture scalars/keys (Task 9).
- Produces: the FULL §9.2 tamper matrix as committed fixture cases — every raw code ≥1 arm, every subreason ≥1 arm, honest match + honest non-match GREEN arms, the raw-98 arm with a ledgered refusal and NO match record in the public dir. Every digest harness-computed — never hand-typed.

- [ ] Steps: test asserts corpus covers `{90×7 subreasons, 91, 92, 93×3, 94, 95, 96×2, 97, 98, 99, green×2}` and that `evaluateCeremony` returns exactly each case's `expect`; builder writes corpus + evidence deterministically (fixture nonces = `sha256Hex("nonce|" + caseName)`); prettier the generated JSON is EXEMPT (prettierignored — verify `npx prettier --check .` still green); parity test (Task 10) now runs the full corpus. Commit — `feat: add lane a pccc fixture corpus covering the full tamper matrix`.

---

### Task 12: Lane B — two-process ceremony + real 4Q VFR export crossing

**Files:**

- Create: `tools/simurgh-attestation/stage4r/laneb/operator.mjs` (`--role a|b --port N --peer-port M`; in-memory `randomScalar()`, never written; signs phase messages with its fixture identity PEM; localhost HTTP exchange, 33xxx ports per the 3V-A CI lesson)
- Create: `tools/simurgh-attestation/stage4r/laneb/ceremony.mjs` (spawns both operators + the REAL `tools/simurgh-attestation/stage4q/node/approver-signer.mjs` for the export crossing; builds a genuine `simurgh.vfr_approval_receipt` bound to `{action: "pccc_match_record_export", pair_match_commitment, boundary_kind: "disclosure_escalation", stage4n window, run_id}`; writes `docs/research/llm-shield/evidence/stage-4r/lane-b/` capture: honest match, honest non-match, mandatory raw-98 negative with ledgered refusal and NO published record)
- Test: `tests/e2e/llmShield/stage4r/laneb.test.js` (NOT under tests/unit — e2e)

**Interfaces:**

- Consumes: 4Q approver + 4Q verifier CLI (`verify-stage4q.mjs --offline <path>` — flag form, 4Q lesson); current 4N window anchor from committed 4N evidence.
- Produces: `pccc_ceremony_capture.v1` + sealed packet + public records; privacy-clean metadata ONLY (`process_instance_digest`, `role`, `operator_key_digest`, `ceremony_start_digest` — §10.3, no pid/argv/env/hostname).

- [ ] Steps: e2e test runs `ceremony.mjs --once` into a temp dir, asserts three arms' verdicts, asserts the approver public-key digest differs from all four stage-4r key digests (§4.2 extra tooth), asserts no scalar hex appears anywhere in the output tree (scan every written file against both fixture scalars AND assert no 64-hex leaf outside allowed fields); one-time REAL capture run with `SIMURGH_REFRESH_STAGE4R_LANEB=1` writes the committed evidence; commit — `feat: add lane b two-process pccc ceremony with real 4q approver export crossing`.

---

### Task 13: Attestation build + two-tier offline verifier + BYO kit

**Files:**

- Create: `tools/simurgh-attestation/stage4r/node/build-stage4r-attestation.mjs` (signs `canonicalJson` of the full run set with `~/simurgh-keys/stage4r.pem`; embeds census, non-claims, limitations, rails, `VERIFICATION_KINDS` fields, novelty source map + constitution projection + contest-hook fields §8.2–8.4)
- Create: `tools/simurgh-attestation/stage4r/node/verify-stage4r-attestation.mjs` (`--offline <dir> [--tier public|audit|both]`; public tier = digest-level checks + herd-token scan + VFR receipt via the 4Q verifier; audit tier = full `evaluateCeremony` incl. DLEQ over the sealed packet; exit 0 green / raw code otherwise)
- Create: `tools/simurgh-attestation/stage4r/byo/operator-kit.mjs` (single file: invitation validation + operator role loop, no repo imports beyond edwards25519/dleq/pcccCore — checked by a test that reads its import list)
- Create (generated, committed): `docs/research/llm-shield/evidence/stage-4r/pccc-attestation.json`
- Test: `tests/unit/llmShield/stage4r/attestation.test.js` + `tests/e2e/llmShield/stage4r/verifier.test.js`

- [ ] Steps: TDD attestation shape (exact keys incl. `window_match_census`, the three kind strings, 7 non-claims, 5 limitations, 16 rails); verifier e2e: both tiers exit 0 on committed evidence, audit tier exits 93 on a z-tampered packet copy, public tier exits 99 on a planted class digest; BYO kit validates the committed sample invitation and refuses a version-skewed one; sign once with the real key (generate at `~/simurgh-keys/stage4r.pem` if absent — NEVER in repo); commit — `feat: add stage 4r attestation, two-tier offline verifier, and byo operator kit`.

---

### Task 14: Lean — six theorems

**Files:**

- Create: `proofs/stage4r/NoPublicHerdToken.lean` (+ lakefile wiring mirroring `proofs/stage4q/`)
- Test: build step in reproduce + `scripts/check-e2e.sh`

Scope header EXACT (§11). Six theorems over a symbolic model (opaque injective hash `H : Domain → Msg → Token`, abstract group as free scalar action): `noPublicHerdTokenForLinkMaterial`, `matchSound`, `zeroFailClosed`, `commitPrecedesReveal`, `singleLiarExcluded`, `dleqBindsSingleScalar` — statements per §11, proofs by the same finite-case/injectivity style as `proofs/stage4q/FrictionPrecedence.lean`.

- [ ] Steps: write model + theorem statements first with `sorry`, confirm `lake build` FAILS on sorry-check, replace with proofs, `lake build` exit 0, commit — `feat: add stage 4r lean theorems for herd-token, commit-reveal, and dleq laws`.

---

### Task 15: Scans, reproduce script, check-e2e wiring

**Files:**

- Create: `scripts/reproduce-llm-shield-stage4r.sh` — ten steps, each `set -euo pipefail`, Node 26 guard: (1) unit suites (explicit `node --test` file list), (2) RFC 8032 vector gate, (3) rebuild Lane A corpus → `git diff --exit-code` (byte-stability), (4) VERIFY committed Lane B capture (never regenerate; refuse if `SIMURGH_REFRESH_STAGE4R_LANEB` is set), (5) verifier public tier, (6) verifier audit tier, (7) JS↔Python parity over the full corpus, (8) Lean `lake build`, (9) privacy scan + forbidden-live-scalar scan (`grep -R` for both fixture scalar hexes limited to lane-b/, public bundle, attestation — must find NOTHING; plus the Task 8 herd-token scan CLI over the public dir) + BOTH 3M/3O key audits, (10) `npx prettier --check` on all tracked stage-4r non-ignored files.
- Modify: `scripts/check-e2e.sh` (add stage4r e2e test files + reproduce invocation)
- Test: `tests/unit/llmShield/stage4r/reproduce.test.js` (script exists, is executable, contains the ten step markers and the refresh-guard line)

- [ ] Steps: write test, implement script, run TWICE — second run must produce zero `git status` drift; commit — `feat: add stage 4r verify-only reproduce script and e2e wiring`.

---

### Task 16: K7 all-functions E2E net + docs + docs-accuracy pass (plan ENDS here — standing rule)

**Files:**

- Create: `tests/e2e/llmShield/stage4r/k7AllFunctions.test.js` — (a) FROZEN export inventory: import every `stage4r` module, `assert.deepEqual(Object.keys(mod).sort(), [...])` per module; (b) composed replay: full pipeline from corpus → evaluate → attest → verify both tiers, asserting check-order masking on a doubly-tampered bundle; (c) byte-idempotency: run builder twice into temp dirs, byte-compare; (d) cross-stage invariants (§14): match universe ⊆ committed 4P class digests, epoch == committed 4N anchor, VFR receipt verifies under the UNMODIFIED 4Q verifier CLI, probe scripts still exit 0; (e) attestation verifies at both tiers.
- Create: `docs/research/llm-shield/STAGE_4R_THREAT_MODEL.md`, `STAGE_4R_VALIDATION_MATRIX.md`, `STAGE_4R_REVIEWER_CHECKLIST.md` (checklist carries the OWASP-LLM10 / NIST MEASURE 2.7 mapping NOTE §17 + the §20 gap survey pointer + CERA staging note), `STAGE_4R_CLOSEOUT.md` (written at closeout with the re-score; stub NOT committed — closeout writes it).
- Modify: `README.md` stage table row.

- [ ] Steps: K7 net green; then the comprehensive docs-accuracy pass — verify EVERY claim in the three docs + spec §12 file list + §15 gate list against the shipped tree (fix doc or code, never paper over); `npm test` + `scripts/check-e2e.sh` + reproduce twice + `npm run format:check` ALL green BEFORE any merge (4Q post-merge lesson); commit — `docs: add stage 4r threat model, validation matrix, reviewer checklist; k7 net green`.

---

## Self-review (done at write time)

- **Spec coverage:** §1–§20 all mapped: claim/law (T7, T8, T14), non-claims/limitations (T2, T13), core contract + DLEQ (T3–T5), architecture/tiers (T12, T13), schemas (T6), codes/order (T1, T7), rails (T2, T13), inventions incl. census/kit/CERA-note (T8, T13, T16), Lane A matrix (T11), Lane B locks (T12, T15), Lean (T14), components (T3–T13 paths match §12), invariants/gates (T15, T16), scorecard/§20 (T16 docs). CERA itself is a closeout artifact, deliberately not a build task.
- **Placeholder scan:** the RFC 8032 TEST-1 test body is described-not-coded deliberately WITH its vector values and derivation rule inline — implementer has the exact bytes. No TBDs.
- **Type consistency:** `evaluateCeremony` return `{raw, reason, green}` used by T7, T10 corpus `expect`, T11 assertions, T13 verifier exits; point/scalar hex regexes defined once in T2 and consumed in T6/T9.

Execution note: tasks are strictly ordered; 1–8 are pure-core and fast; 9 unblocks 10–13; 12 needs the committed 4Q evidence present (it is, v2.26.0).
