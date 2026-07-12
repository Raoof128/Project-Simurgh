# Stage 5J — VRC: Verifiable Rating Contest (implementation plan)

> Motto: **AnthropicSafe First, then ReviewerSafe.** Public wording stays provider-agnostic.
> Spec: `docs/superpowers/specs/2026-07-12-stage-5j-vrc-rating-contest-design.md`.
> For a skilled engineer with **zero context** on this repo. Every task is TDD: write the failing
> test, run it, watch it fail for the right reason, write the minimal code, watch it pass, format,
> commit. Do not batch tasks. Do not write code before its test.

---

## Global Constraints (verbatim — do not paraphrase)

- **Version** `v2.45.0-stage-5j-vrc`; branch `stage-5j-vrc`; **raw codes 332–347** (16, wrapper 347 last).
- **Codes live in the GLOBAL registry** `tools/simurgh-attestation/stage4h/exitCodes.mjs` — additive
  only. Every 332–347 maps to `RUN_LEVEL_BY_RAW = 1`. The wrapper identifier MUST be suffixed
  `INTERNAL_OR_ENV_UNAVAILABLE_VRC: 347` (bare `INTERNAL_FAIL_CLOSED` collides — see 5B/4X/4Y/4Z/5A).
- **Never probe unknown-code behaviour with a bare literal above the range** — use the repo constant
  `UNKNOWN_RAW_PROBE = 999` (a literal just above the range becomes a real code next stage; that broke
  4R and 4S CI).
- **House partition** (mirror VPC/VSD/VFC): public first-failure `332→344`; audit adds `345`;
  `VRC_POLICY_CODES = [346]`; wrapper `347` applied OUTSIDE the ordered scan.
- **Pure core** `vrcCore` over `(bundle, cfg, facts)` owns the frozen order; crypto (Ed25519 /
  SPKI-DER) is done by the node adapter and injected via `facts` (the 5I B11 pattern). Schema check
  runs BEFORE `makeCtx`, so a malformed bundle is 332, never a 347 throw.
- **All digests** via the SHARED `tools/simurgh-attestation/canonicalise.mjs` (`canonicalJson`,
  `sha256Hex`) — never a stage-local hash copy (byte-parity across JS/Python/browser depends on it).
- **Derive upstream, never copy.** `S`, `C(r)`, reviewer keys, and the producer identity are DERIVED
  from the verified 5I bundle via `vpc_ref { vpc_bundle_digest, panel_subject_root, panel_evidence_root,
partition_digest }` + `producer_ref { producer_identity_digest, producer_key_fingerprint }`. The VRC
  bundle supplies no independently trusted copy of the coverage relation.
- **No cross-scale.** Every ordinal rating binds the exact top-level `rating_scale_digest`; mismatch → 338. No scale-mapping machinery in v1.
- **Reserved slots are structural unions** `null | reserved_anchor_object`; a non-null branch under the
  current `schema_version` → 346 (a strict-null schema would be caught at 332 first — do not use
  strict null). `external_registry_anchor` is an ACTIVE optional field (`null | intoto_statement`),
  verified in the audit tier (345 family), NOT a reserved slot.
- **Node version:** the 5I/4H reproduce + digest builders are byte-stable **only under Node 26**
  (`/opt/homebrew/opt/node@26/bin`). Build and `cmp` all evidence under Node 26.
- **Evidence dirs are prettier-ignored** (`.prettierignore`). Add `docs/research/llm-shield/evidence/stage-5j/`.
- **`npm test` runs UNIT ONLY** (`tests/unit/**`). The K7 e2e (`tests/e2e/llmShield/stage5j/`) runs via
  `scripts/check.sh` — never shell `rg`/`find` inside a unit test.
- **Neutral commits.** No attribution trailers anywhere (commits, PR, release).
- **Lint gate:** `npm run format:check` must pass (prettier `--check .`) — run `npm run format` before
  each commit. Do NOT hand-edit fixtures prettier will reformat; regenerate them.

## Read before Task 1 (paid-for lessons)

- `.claude/skills/simurgh-stage-craft/references/gotcha-ledger.md` — every entry cost ≥1 red CI round.
- Additive codes ripple **both** exit-map goldens AND the inline map AND the hardcoded consumers:
  `tools/simurgh-attestation/stage4h/exitCodes.mjs` (`RUN_LEVEL_BY_RAW`),
  `docs/research/llm-shield/evidence/stage-4h/exit-map.json`,
  `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json`,
  `tests/unit/llmShield/exitCodeProbeHygiene.test.js`,
  `tests/unit/llmShield/stage4h/exitWrapper.test.js`,
  `tests/unit/llmShield/stage4h/closeout.test.js`. Regenerate the goldens with
  `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs` (Node 26) — do not hand-edit.
- `resign()` helpers mutate; `structuredClone` before tampering a fixture (fixture aliasing bit 5I).
- Compare recomputes with `canonicalJson(a) === canonicalJson(b)`, never `===` on objects.

---

## File map (every file; one responsibility each)

**Stage root — `tools/simurgh-attestation/stage5j/`**

- `constants.mjs` — lives at the STAGE ROOT (like `stage5i/constants.mjs`), NOT in `core/`; re-exports
  `VRC_*` from `../stage4h/exitCodes.mjs` (correct relative path from the stage root); `DOMAINS`; reuse
  the `RUNG` lattice; `RATING_STATE` enums; `CORRECTNESS_FORBIDDEN_KEYS` (G13 belt);
  `VRC_RESERVED_ARTIFACT_SLOTS` (3 fields, for 346) + `VRC_MINTED_SOCKETS` (2 IOUs); policy profiles.
  Core modules import it via `../constants.mjs`.

**Core (pure) — `tools/simurgh-attestation/stage5j/core/`**

- `result.mjs` — `R(raw, reason, extra)` / `OK(ctx)` (copy 5I verbatim).
- `digests.mjs` — re-export `canonicalJson`, `sha256Hex`; `domainDigest`, `artifactDigest`,
  `identityDigest` (copy 5I; identity binds subject+fingerprint only).
- `schema.mjs` — `checkBundleSchema(bundle) → 332 | null` AND `checkConfigSchema(cfg) → 332 | null`
  (two total functions, both catch parse/canonical failures and RETURN 332, never throw): shape,
  canonical form, uniqueness, required objects, reserved-slot union typing, `value` present iff
  `value_kind==="ordinal"`.
- `context.mjs` — `makeCtx(bundle, cfg, facts)`: load verified 5I anchors, DERIVE `S`, `C(r)`,
  reviewer-key set, producer identity; build digest→object maps for ratings/events/responses/etc.;
  compute active chain heads.
- `chains.mjs` — pure rating-chain topology: `activeHead(entries, chainSubject) → head | {err}`
  (one genesis, contiguous revisions, acyclic, no fork, no cross-subject supersession, one head);
  epoch-ticket contiguity.
- `roots.mjs` — `ratingObligationRoot(ctx)`, `ratingLedgerRoot(ctx)`, `contestLayerRoot(ctx)`.
- `contest.mjs` — `recomputeHistoricalContestEvents(ctx)` (over BOTH rating histories + epoch tickets),
  `divergenceComparable(producerHead, reviewerHead, scale)` (severity_direction).
- `checks333to341.mjs` — bindings/obligation/topology/scale/signatures.
- `checks342to344.mjs` — contest-event census+presence (342), response validity (343), phantom
  reviewer statement (344, concurrence OR rebuttal).
- `checks345to346.mjs` — projection recompute (345, audit-only, incl. `external_registry_anchor`
  bridge), reserved-slot policy (346).
- `projections.mjs` — `divergenceCensus`, `favourableSkew` (num+den), `concurrenceBacking`
  (den = committed census of all agreement-style claims), `downgradeDepth` (G1), `sectionStates`.
- `vrcCore.mjs` — `vrcVerify(bundle, cfg, facts, {tier}) → {raw, ...}`. Owns the frozen order.

**Node adapter — `tools/simurgh-attestation/stage5j/node/`**

- `adapter.mjs` — resolve crypto → `facts`; call `vrcVerify`.
- `laneKeys.mjs` — deterministic committed test-keys (copy 5I pattern).
- `buildSignedBundle.mjs` — construct + sign a `vrc_bundle`; `resign()` helper.
- `build-vrc-evidence.mjs` — emit the Lane A byte-stable pack + the negative arms (332–346 as files;
  347 is runtime-only) + attestations.
- `verify-vrc-attestation.mjs` — CLI verify (absolute or dir arg; handles dir ingest — 5I gotcha).
- `verify-byte-stability.mjs` — build twice, `cmp`.
- `lanec-gate.mjs` — campaign gate (`completed ⟹ pack present AND verifies raw 0`).

**Python parity — `tools/simurgh-attestation/stage5j/python/vrc_parity.py`** (independent decision-core
port; shared canonical/hash semantics).

**Browser — `tools/simurgh-attestation/stage5j/browser/vrc-portable.mjs`** (same JS core, packaged).

**Lean — `proofs/stage5j/RatingContest.lean` + `proofs/stage5j/lean-toolchain`** (11 theorems, zero
`sorry`).

**Tests — `tests/unit/llmShield/stage5j/`**: `constants.test.js`, `schema.test.js`,
`chains.test.js`, `vrcCore.test.js`, `digestsSignatures.test.js`, `projections.test.js`,
`parity.test.js`, `browser.test.js`, `laneA.test.js`, `laneb.test.js`, `lanec.test.js`,
`nodeAdapter.test.js`, `exitCodes.test.js`, `_validBundle.mjs` (shared fixture factory).
**E2E — `tests/e2e/llmShield/stage5j/k7AllFunctions.test.js`** (every export + every raw 332–347
reachable + evidence lock).

**Fixtures — `tests/fixtures/llmShield/stage5j/`** (`test-keys/` named `INSECURE_FIXTURE_ONLY_*.pem`,
the valid pack, the 332–346 negative arms).
**Evidence — `docs/research/llm-shield/evidence/stage-5j/`** (byte-stable pack; prettier-ignored).
**Modified:** `tools/simurgh-attestation/stage4h/exitCodes.mjs`; both exit-map goldens;
`exitCodeProbeHygiene.test.js`; `stage4h/exitWrapper.test.js`; `stage4h/closeout.test.js`;
`.prettierignore`; `README.md` banner + north-star (closeout).

---

## Phase 0 — Branch + code registry

### Task 0.1 — Branch

```bash
git -C . checkout -b stage-5j-vrc
git tag --sort=-creatordate | head -3   # confirm v2.44.0-stage-5i-vpc is latest
```

Expected: on `stage-5j-vrc`; latest tag `v2.44.0-stage-5i-vpc`.

### Task 0.2 — Register raw codes 332–347 (failing test first)

**Test** `tests/unit/llmShield/stage5j/exitCodes.test.js` (new). Assert, importing from
`../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs`:

- `VRC_RAW_CODES.VRC_SCHEMA_INVALID === 332` … `INTERNAL_OR_ENV_UNAVAILABLE_VRC === 347`.
- `VRC_PUBLIC_CHECK_ORDER` deep-equals `[332…344]`; `VRC_AUDIT_CHECK_ORDER` = `[332…345]`;
  `VRC_AUDIT_ONLY_CODES` = `[345]`; `VRC_POLICY_CODES` = `[346]`.
- for every `c` in 332..347: `stage4CodeForRawCode(c) === 1`.
- `stage4CodeForRawCode(UNKNOWN_RAW_PROBE) === 3`.

Run `node --test tests/unit/llmShield/stage5j/exitCodes.test.js` → **fails** (`VRC_RAW_CODES` undefined).

**Code** — append to `exitCodes.mjs` after the VPC block (before `HARNESS_CODES`), following the VPC
comment style:

```js
// Stage 5J — VRC: Verifiable Rating Contest. Additive codes 332–347. Exact rating-obligation equality
// over the verified 5I coverage relation (reviewer pairs = C(r) AND producer sections = S), append-only
// contest events, No Silent Favourable Override. Public first-failure 332→344; audit adds projection
// recompute 345; policy 346 + wrapper 347 applied OUTSIDE the ordered scan (house convention, cf. VPC_*).
export const VRC_RAW_CODES = Object.freeze({
  OK: 0,
  VRC_SCHEMA_INVALID: 332,
  VRC_VPC_ANCHOR_MISMATCH: 333, // vpc_ref/producer_ref ≠ referenced verified 5I bundle
  VRC_OBLIGATION_ROOT_MISMATCH: 334, // reviewer pairs = C(r) AND producer sections = S
  VRC_REQUIRED_RATING_MISSING: 335, // reviewer pair or producer section
  VRC_ORPHAN_RATING: 336, // out-of-panel / out-of-universe / non-required subject
  VRC_CHAIN_TOPOLOGY_INVALID: 337, // fork / cycle / detached / cross-subject / ≠1 head / bad epoch chain
  VRC_RATING_SCALE_INVALID: 338, // unsigned / rating_scale_digest mismatch across compared entries
  VRC_COMPARISON_NON_CANONICAL: 339, // ordinal comparison attempted on a non_comparable pair
  VRC_REVIEWER_RATING_SIGNATURE_INVALID: 340,
  VRC_PRODUCER_RATING_SIGNATURE_INVALID: 341,
  VRC_UNANSWERED_CONTEST_EVENT: 342, // census mismatch OR required event has no response object — headline
  VRC_RESPONSE_RECEIPT_INVALID: 343, // present-but-invalid: sig/binding/uniqueness/subject/epoch/replay
  VRC_PHANTOM_REVIEWER_STATEMENT: 344, // concurrence OR rebuttal w/o valid reviewer sig, or both asserted
  VRC_PROJECTION_MISMATCH: 345, // audit-only (census/skew/downgrade-depth/concurrence-backing/bridge)
  VRC_RESERVED_SLOT_ACTIVATED: 346, // policy — non-null reserved branch under current schema_version
  INTERNAL_OR_ENV_UNAVAILABLE_VRC: 347, // fail-closed wrapper
});
export const VRC_PUBLIC_CHECK_ORDER = Object.freeze([
  332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344,
]);
export const VRC_AUDIT_CHECK_ORDER = Object.freeze([
  332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345,
]);
export const VRC_AUDIT_ONLY_CODES = Object.freeze([345]);
export const VRC_POLICY_CODES = Object.freeze([346]);
```

Then extend `RUN_LEVEL_BY_RAW` with `332: 1, … 347: 1` (append after `331: 1`).

Run the test → **passes**. `git add -A && npm run format && git commit -m "feat(5j): register VRC raw codes 332-347"`.

### Task 0.3 — Ripple the goldens + hardcoded consumers (failing test first)

Run `node --test tests/unit/llmShield/stage4h/exitWrapper.test.js tests/unit/llmShield/exitCodeProbeHygiene.test.js tests/unit/llmShield/stage4h/closeout.test.js` → observe which **fail** (they assert the map matches the goldens / a contiguous range). Read each failure.

- Regenerate goldens (Node 26):
  `/opt/homebrew/opt/node@26/bin/node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`
  → updates `docs/research/llm-shield/evidence/stage-4h/exit-map.json` and
  `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` with 332–347.
- Update any inline range assertions in the three consumer tests to include 347 as the new max
  (follow exactly how they referenced 331). Do not loosen an assertion — extend its range.

Re-run the three tests → **pass**. Commit `chore(5j): ripple exit-map goldens + consumers for 332-347`.

---

## Phase 1 — Pure core (TDD, one check at a time)

**Sequencing rule (no long-red tests).** The core is built INCREMENTALLY: Task 1.2 lands a skeleton
`vrcVerify` that returns raw 0 unconditionally, so the valid bundle passes from 1.2 onward (green).
Task 1.3 wires in `checkSchema`; each later check task's FAILING test is that check's own negative arm
(which the current core wrongly accepts); adding the step turns it green while the valid bundle stays
green. Every check task also unit-tests its check function DIRECTLY (`checkObligation(ctx)` on a
hand-built ctx), so a task never depends on a check it hasn't written. Never carry a red test across a
commit — the only red at any moment is the arm of the task in progress.

For every check task: add its negative arm to `tests/unit/llmShield/stage5j/vrcCore.test.js` using the
`_validBundle.mjs` factory (assert the arm returns the target raw AND the valid bundle still returns
0), run (fail), implement the minimal check + wire it into the core's ordered steps, run (pass),
`npm run format`, commit.

### Task 1.1 — `result.mjs`, `digests.mjs` (in `core/`), `constants.mjs` (at STAGE ROOT)

Copy `result.mjs` and `digests.mjs` from `stage5i/core/` into `stage5j/core/` verbatim (only the header
comment changes to 5J). Create `constants.mjs` at `tools/simurgh-attestation/stage5j/constants.mjs`
(stage root, mirroring `stage5i/constants.mjs` — from here `../stage4h/exitCodes.mjs` resolves
correctly; from `core/` it would wrongly resolve to `stage5j/stage4h`):

```js
export {
  VRC_RAW_CODES as CODES,
  VRC_PUBLIC_CHECK_ORDER,
  VRC_AUDIT_CHECK_ORDER,
  VRC_AUDIT_ONLY_CODES,
  VRC_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";
export const DOMAINS = Object.freeze({
  scale: "simurgh.vrc.scale.v1",
  reviewer_rating: "simurgh.vrc.reviewer_rating.v1",
  producer_rating: "simurgh.vrc.producer_rating.v1",
  epoch_ticket: "simurgh.vrc.epoch_ticket.v1",
  contest_event: "simurgh.vrc.contest_event.v1",
  producer_response: "simurgh.vrc.producer_response.v1",
  concurrence: "simurgh.vrc.concurrence.v1",
  rebuttal: "simurgh.vrc.rebuttal.v1",
  attestation_public: "simurgh.vrc.public_attestation.v1",
  attestation_audit: "simurgh.vrc.audit_attestation.v1",
});
export const RATING_STATE = Object.freeze({
  comparison: Object.freeze(["non_comparable", "comparable_uncontested", "comparable_contested"]),
  contest: Object.freeze([
    "not_applicable",
    "contested_unanswered",
    "contested_response_recorded",
    "reviewer_concurrence_backed",
    "contested_reviewer_maintains",
  ]),
});
// G13 belt-and-suspenders — a correctness/verdict-of-truth assertion in the flat annotation surface
// fails closed at schema (332). The structural guarantee is the Lean noCorrectnessBit; this is the
// lexical screen. Honest bound: a bounded vocabulary, not a semantic proof.
export const CORRECTNESS_FORBIDDEN_KEYS = Object.freeze(
  new Set([
    "producer_wrong",
    "reviewer_right",
    "rating_correct",
    "rating_incorrect",
    "verdict_truth",
  ])
);
// The runtime artifact fields raw 346 rejects when non-null (structural slots) — NOT the same as the
// socket-ledger IOUs. Keep them as two distinct constants (reviewer P3).
export const VRC_RESERVED_ARTIFACT_SLOTS = Object.freeze([
  "universe_commitment_anchor", // VUC pays
  "review_window_binding", // VTC pays
  "campaign_composition_root", // capstone consumes
]);
export const VRC_MINTED_SOCKETS = Object.freeze([
  "rating_truth_oracle_deferred",
  "response_adequacy_deferred",
]);
export const POLICY_PROFILES = Object.freeze({
  release: Object.freeze({
    profile_id: "vrc-release-v1",
    min_reviewers: 2,
    require_two_sided_equality: true,
  }),
  test: Object.freeze({
    profile_id: "vrc-test-v1",
    min_reviewers: 1,
    require_two_sided_equality: true,
  }),
});
```

`external_registry_anchor` is NOT in `VRC_RESERVED_ARTIFACT_SLOTS` — it is an active optional field
(345 family), not a 346 slot. **Test** `constants.test.js`: the two enums have exactly the spec values;
`CODES.OK===0`; `VRC_RESERVED_ARTIFACT_SLOTS` length **3**; `VRC_MINTED_SOCKETS` length **2**. Commit.

### Task 1.2 — `_validBundle.mjs` factory + `vrcCore` skeleton

`_validBundle()` returns a fully-valid `vrc_bundle` + `cfg` + `facts` (all crypto pre-resolved as
truthy facts) over 5 sections A–E reproducing the Lane B state census (uncontested /
response_recorded / concurrence_backed / non_comparable / maintains). `cfg = { policy,
verifier_key_pin, vpc_bundle, vpc_external_config }` — the verified 5I bundle and its external config
travel in `cfg` so `makeCtx` can re-verify them (Task 1.4). `facts` enumerates, all pre-resolved:
`reviewerSigValid` / `producerSigValid` / `responseSigValid` / `concurrenceSigValid` /
`rebuttalSigValid` / `epochTicketSigValid` (per-`entry_digest`, over FULL histories, not just heads),
`scaleSigValid`, `roleFingerprints` { reviewers, producer, ledger_authority, scale_authority,
attestation_verifier }, and `vpc_facts` (the 5I crypto facts for the upstream re-verify). Export
`resign(obj, key)` (mutates → recompute the matching sig fact; `structuredClone` before tampering).
**This is the crux fixture.**
Land a **truly minimal** `vrcCore.mjs` skeleton (no forward references — `checkSchema` arrives 1.3,
`makeCtx` arrives 1.4):

```js
// imports (checkSchema, makeCtx, R, OK, check modules) are added as Tasks 1.3–1.12 introduce them.
export function vrcVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  return { raw: 0 }; // checks + try/wrapper appended by Tasks 1.3–1.13
}
```

**Test:** `_validBundle()` has the required top-level keys (pure data assertion — green now); and
`vrcVerify(validBundle, cfg, facts, {tier:"audit"}).raw === 0` (green trivially, and STAYS green as
each real check is added over a VALID bundle — that is the regression guard). Each later task adds one
check and its own red→green negative arm; Task 1.13 finalises the `try`/wrapper and the frozen order.

### Task 1.3 — `schema.mjs` → 332 (two total functions)

There is no 317-style external-config code in VRC — a malformed `cfg` is a 332, an anchor _mismatch_ is
a 333. Split so the `cfg === undefined` path can be handled BETWEEN them (never passing `undefined`
into a field-reading function):

- `checkBundleSchema(bundle) → 332 | null`: required top-level keys; `canonicalJson` round-trips; no
  duplicate `entry_digest`; every rating entry has `value` iff `value_kind==="ordinal"`; reserved
  slots are `null` or objects (union), never other types; flat annotation surface contains no
  `CORRECTNESS_FORBIDDEN_KEYS` (G13 belt).
- `checkConfigSchema(cfg) → 332 | null`: `cfg` carries `policy`, `verifier_key_pin`, `vpc_bundle`,
  `vpc_external_config`, all well-formed.
  BOTH functions **catch normal parse/canonical failures and RETURN `R(332,…)`** — they never throw.
  The core calls `checkBundleSchema`, then `if (cfg===undefined) return R(347,…)`, then
  `checkConfigSchema` (Task 1.13). **Test:** valid→null each; each bundle violation and each cfg violation
  → `R(332,…)`; passing `undefined` to the core → 347 (not a throw).

### Task 1.4 — `context.mjs` + upstream RE-VERIFICATION → 333

`makeCtx` takes the embedded 5I bundle + external config from `cfg` (`cfg.vpc_bundle`,
`cfg.vpc_external_config`) and **actually re-runs the 5I verifier on it** —
`vpcVerify(cfg.vpc_bundle, cfg.vpc_external_config, facts.vpc_facts, {tier:"audit"})` — earning the
word "verified": if that does not return raw 0, set `ctx.anchorMismatch = R(333,"upstream_unverified")`.
Then recompute `panel_subject_root`, `panel_evidence_root`, `partition_digest`, `producer_identity_digest`
from the (now-verified) 5I bundle and compare to `vpc_ref` / `producer_ref`; any mismatch →
`R(333,"anchor_mismatch")`. Finally derive `S`, `C(r) = {reviewer_principal → evaluated_sections}`,
reviewer-key set, producer identity. **`makeCtx` MUST NOT throw on a bad upstream** — it stores
`ctx.anchorMismatch` (a candidate the core returns as its first step, the 5I `R_candidate` pattern);
an unexpected throw is the 347 wrapper, not 333. `facts` therefore carries `vpc_facts` (the 5I crypto
facts). **Tests:** valid→0; an upstream 5I bundle that fails its own verifier → 333
(`upstream_unverified`); each tampered anchor → 333 (`anchor_mismatch`).

### Task 1.5 — obligation equality → 334/335/336

`ratingObligationRoot(ctx)` commits `{required_reviewer_pairs = {(s,r):s∈C(r)}, required_producer_sections=S}`.

- 334: declared `rating_obligation_root` ≠ recompute.
- 335: an active reviewer pair in `required` absent, OR a committed section lacks an active producer
  rating.
- 336: a rating whose subject ∉ required (out-of-panel reviewer / out-of-universe section).
  **Test:** three arms + a two-sided-missing arm (drop a producer self-rating → 335).

### Task 1.6 — `chains.mjs`: rating-chain + epoch-ticket integrity → 337

337 owns **rating-chain OR epoch-ticket integrity invalid** — structure _and_ ticket authority, so a
forged epoch ticket has an explicit owner. `activeHead(entries, chainSubject)`: exactly one genesis
(`supersedes_digest===null`), contiguous `revision`, acyclic, no fork, exactly one head, and **no
cross-subject / cross-chain supersession** (an entry whose `supersedes_digest` points at a different
`chain_subject`). Epoch tickets: chain contiguity via `previous_epoch_ticket_digest` AND
`facts.epochTicketSigValid` (ledger-authority signature over each ticket) — a forged/unsigned ticket is
337, not a silent pass. Any violation → `R(337,…)`.
**Frozen ownership split (reviewer P6):** cross-subject/cross-chain supersession is a STRUCTURAL fault
caught HERE at 337 (it runs before 340/341); a correct-subject entry whose SIGNER is wrong/invalid is a
signature fault at 340/341 (Task 1.8). One isolation fixture for each so neither steals the other's
first-failure. **Test:** forked chain, two heads, cross-subject supersede, broken epoch chain, forged
epoch-ticket sig → 337; valid→0.

### Task 1.7 — scale + comparison → 338/339

338: `rating_scale` unsigned or `facts.scaleSigValid===false` (scale_authority signature), or an
ordinal entry's `rating_scale_digest` ≠ top-level. 339: an ordinal comparison attempted on a
`non_comparable` pair (abstain / not_assessed / out-of-dimension). `divergenceComparable` uses
`severity_direction`. **Test:** unsigned scale→338; tamper scale digest→338; force a comparison on a
pair whose `dimension_id ∉ comparable_dimensions`→339.

### Task 1.8 — signatures over ALL HISTORICAL entries → 340/341

Theorem 8 (fossil attack) requires validating EVERY historical entry's signature, not just active
heads — a forged historical entry can manufacture a historical contest while the active head stays
honestly signed. Facts carry per-`entry_digest` validity for the FULL histories:
`reviewerSigValid`, `producerSigValid` (both keyed over all entries, not just heads). Roles are pinned:
`facts.roleFingerprints` = { reviewer(s) (from the reused 5I principals), producer (bound to
`producer_ref.producer_key_fingerprint` = the reused 5I `producer_identity_digest`), ledger_authority,
scale_authority }.

- 340: ANY reviewer-chain entry (head or superseded) with an invalid or wrong-role signature.
- 341: ANY producer-chain entry (head or superseded) with an invalid or wrong-role signature.
  The rating-scale signature (`scale_authority`) is validated at 338; epoch-ticket signatures at 337; the
  outer public/audit attestation key pin is validated in the attestation task (1.14). A same-subject
  entry with a wrong signer fails HERE (cross-subject _structure_ already failed at 337 — reviewer P6).
  **Tests:** flip a sig fact on (a) an active reviewer rating, (b) a _superseded_ reviewer rating (fossil
  → 340), (c) an active producer rating, (d) a superseded producer rating (fossil → 341); a **key-swap**
  (reviewer entry signed with the producer key, subject correct) → 340; producer entry signed with a
  non-pinned key → 341.

### Task 1.9 — `contest.mjs` + 342/343

`recomputeHistoricalContestEvents(ctx)` over BOTH rating histories + epoch tickets (contemporaneous
active heads at each transition). 342: `stored_contest_events ≠ recomputed` OR a recomputed event has
no response object (this catches erase-by-supersession — the reviewer chain is append-only, so the
historical divergence stays recomputable). 343: a present response with bad sig / not bound to the FULL
`contest_event_digest` / non-unique / wrong subject / epoch / replay. **Tests:** (a) aligned producer
supersession that omits the earlier event → 342; (b) required event, no response → 342; (c)
present-but-replayed response → 343; **(d) positive control:** revise-after-responding preserving the
event + receipt → **0**.

### Task 1.10 — 344 phantom reviewer statement

Derived state is never trusted input — the verifier computes `contest_state` from the OBJECTS. 344
fires when a `concurrence` or `reviewer_rebuttal` object exists whose reviewer signature over the
`contest_event_digest` is absent/invalid (so the backed/maintains state it would imply is
unsupported), or when one reviewer asserts BOTH a concurrence and a rebuttal on one event (ambiguous).
**Test:** unsigned concurrence object → 344; wrongly-signed rebuttal object → 344; both objects for one
(event, reviewer) → 344.

### Task 1.11 — `projections.mjs` + 345 (audit-only)

`divergenceCensus`, `favourableSkew {favourable_count, comparable_pair_count}`,
`concurrenceBacking {backed_claim_count, total_concurrence_claim_count}` (den = committed census of
ALL agreement-style claims), `downgradeDepth {total_rank_delta, contested_pair_count}` (G1),
`sectionStates`. 345 (audit tier only): declared `projections` ≠ recompute, OR a present
`external_registry_anchor` whose in-toto subject ≠ `contestLayerRoot(ctx)` (G3 bridge). **Test:**
tamper a projection field → 345 at audit, 0 at public; tamper the bridge subject → 345 at audit.

### Task 1.12 — 346 reserved-slot policy

Any of `universe_commitment_anchor` / `review_window_binding` / `campaign_composition_root` non-null
under the current `schema_version` → `R(346,…)`. (`external_registry_anchor` is NOT here — it is
active/optional.) **Test:** set each reserved slot non-null → 346.

### Task 1.13 — `vrcCore.mjs` (frozen order) — the valid bundle goes green

```js
export function vrcVerify(bundle, cfg, facts, { tier = "public" } = {}) {
  const b332 = checkBundleSchema(bundle);
  if (b332) return b332; // 332 (bundle form, pre-ctx)
  if (cfg === undefined) return R(347, "external_config_unavailable");
  const c332 = checkConfigSchema(cfg);
  if (c332) return c332; // 332 (cfg form, pre-ctx)
  try {
    const ctx = makeCtx(bundle, cfg, facts); // stores ctx.anchorMismatch; never throws on bad upstream
    const steps = [
      () => ctx.anchorMismatch, // 333
      () => checkObligation(ctx), // 334,335,336
      () => checkChains(ctx), // 337
      () => checkScaleAndComparison(ctx), // 338,339
      () => checkSignatures(ctx), // 340,341
      () => checkContest(ctx), // 342,343
      () => checkPhantomStatement(ctx), // 344
    ];
    for (const s of steps) {
      const r = s();
      if (r) return r;
    }
    if (tier === "audit") {
      const p = checkProjections(ctx);
      if (p) return p;
    } // 345
    const pol = checkReservedSlots(ctx); // 346 (both tiers)
    if (pol) return pol;
    return OK(ctx);
  } catch (e) {
    return R(347, "internal_or_env_unavailable", { error: String(e) });
  }
}
```

Now `_validBundle` returns 0 (audit + public). Add the **frozen-order test:** for a bundle carrying
simultaneous 335 and 342 defects, the verdict is 335 (earlier wins); assert per-tier
`VRC_PUBLIC_CHECK_ORDER`/`VRC_AUDIT_CHECK_ORDER` matches the sequence the core actually walks. Commit
each check task separately.

### Task 1.14 — split attestations (build + verify) — dedicated task

New `core/attestation.mjs` + tests in `nodeAdapter.test.js`. The two signed objects are not decorative
JSON — they get their own verification. Build `buildPublicAttestation(ctx)` and
`buildAuditAttestation(ctx, publicAtt)`:

- `vrc_public_attestation`: `object_type:"simurgh.vrc.public_attestation.v1"`, `tier:"public"`,
  `vpc_bundle_digest`, `vrc_bundle_digest`, `rating_obligation_root`, `rating_ledger_root`,
  `contest_layer_root`, `verdict_raw`, `checked_raw_range:[332..344,346]`,
  `projection_status:"not_verified"`, `verifier_identity`, `signature`.
- `vrc_audit_attestation`: `object_type:"…audit_attestation.v1"`, `tier:"audit"`,
  `public_attestation_digest` (binds to the public object), `vrc_bundle_digest`, `projection_root`,
  `verdict_raw`, `checked_raw_range:[332..346]`, `verifier_identity`, `signature`.
  `verifyAttestation(att, cfg, facts)` checks: `object_type`/`tier` correct; the `verifier_identity`
  fingerprint equals `cfg.verifier_key_pin` (external pin) and `facts.attestationSigValid`; the exposed
  roots equal the recompute; public carries `projection_status:"not_verified"` and never a
  `projection_root`; audit's `public_attestation_digest` resolves to a valid public attestation.
  **Tests:** valid public+audit → accept; a **key-swap** (attestation signed by a non-pinned key) →
  reject; public object carrying a `projection_root` → reject; audit whose `public_attestation_digest`
  doesn't resolve → reject; and the invariant **audit accepts ⟹ public accepts** (theorem 9) over the
  valid pack. Commit.

---

## Phase 2 — Node adapter + Lane A byte-stable pack

### Task 2.1 — `laneKeys.mjs` + `buildSignedBundle.mjs` + priv-key allowlist

Deterministic committed test-keys (copy 5I generation) under `tests/fixtures/llmShield/stage5j/test-keys/`,
named **`INSECURE_FIXTURE_ONLY_<role>.pem`** (the audit scripts allowlist by exactly that regex).
`buildSignedBundle` assembles a `vrc_bundle`, signs each entry/ticket/response/concurrence/rebuttal
under the right role key (reviewer / producer / ledger*authority / scale_authority / attestation
verifier), and resolves `facts`.
**Private-key audit allowlist (MANDATORY — omitting it is a guaranteed red round):** add a
`grep -v -E "^tests/fixtures/llmShield/stage5j/test-keys/INSECURE_FIXTURE_ONLY*[A-Za-z-]+\.pem$"`line
to BOTH`scripts/security-audit-llm-shield-stage3m.sh`and`scripts/security-audit-llm-shield-stage3o.sh`(the allowlist is by PATH REGEX, no digits in the role name). Run both scripts locally and confirm they
pass BEFORE committing the keys.
**Test**`digestsSignatures.test.js`: a built bundle verifies raw 0 under the real adapter; a byte-flip
in any signed content flips the matching signature fact.

### Task 2.2 — `adapter.mjs` + `verify-vrc-attestation.mjs`

Adapter does Ed25519 + SPKI-DER, builds `facts`, calls `vrcVerify`. CLI accepts an absolute path OR a
directory (ingest the bundle+cfg from a dir — 5I gotcha: handle dir args). **Test** `nodeAdapter.test.js`:
CLI on the valid pack prints raw 0; on a tampered pack prints the right raw + reason.

### Task 2.3 — `build-vrc-evidence.mjs`: valid pack + negative arms (332–346 files + runtime 347)

Emit to `docs/research/llm-shield/evidence/stage-5j/`: `bundle.json`, `external-config.json`,
`public-attestation.json`, `audit-attestation.json`, and `negatives/raw-<n>.json` for each code
**332–346** (335/342/344 get `-a`/`-b` files for their two arms). **Raw 347 has NO evidence file** —
it is a thrown dependency, reachable only by a runtime `facts` injection in the test (a JSON artifact
malformed enough to force a throw would be caught at 332 first). The Fable-5 laundering scenario
(favourable producer self-rating after an input-filter miss vs a stricter reviewer rating) is the base
pack. Add a `.prettierignore` entry for the evidence dir.

**Negative-arm pattern (do NOT hand-write blobs — derive each from the valid pack, then repair
downstream hashes/sigs so it reaches EXACTLY its target first-failure):**

| Raw | Mutation on a clone of the valid pack                                                                                                                                                                                                 |
| --: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 332 | delete a required key                                                                                                                                                                                                                 |
| 333 | flip one byte of `vpc_ref.panel_subject_root`                                                                                                                                                                                         |
| 334 | replace the DECLARED `rating_obligation_root` with the digest of a deliberately incomplete synthetic set, while leaving the real upstream-derived obligations intact (declared ≠ recompute)                                           |
| 335 | remove one reviewer rating (arm a) / one producer self-rating (arm b)                                                                                                                                                                 |
| 336 | add a rating for a reviewer ∉ panel, re-sign                                                                                                                                                                                          |
| 337 | duplicate an active entry with a second genesis (two heads)                                                                                                                                                                           |
| 338 | change one ordinal entry's `rating_scale_digest`                                                                                                                                                                                      |
| 339 | keep an entry's `dimension_id` OUTSIDE `comparable_dimensions` (so it is genuinely `non_comparable`) and force an ordinal comparison on it — never simply relabel `abstain`→`ordinal` (that would become a valid comparable)          |
| 340 | invalidate one reviewer sig (flip a byte post-sign)                                                                                                                                                                                   |
| 341 | invalidate one producer sig                                                                                                                                                                                                           |
| 342 | append an aligned producer supersession, delete the earlier contest event (arm a) / drop a response object (arm b)                                                                                                                    |
| 343 | copy a valid response onto a different event digest (replay)                                                                                                                                                                          |
| 344 | insert an UNSIGNED (or wrongly-signed) concurrence object (arm a) / rebuttal object (arm b) over a real contest event and let the verifier DERIVE the invalid backed state — never write the derived `contest_state` as trusted input |
| 345 | bump `favourable_skew.favourable_count` by 1 (audit rejects, public accepts)                                                                                                                                                          |
| 346 | set `universe_commitment_anchor` to `{}`                                                                                                                                                                                              |
| 347 | inject a test-only `facts` dependency that throws (never a malformed artifact — that is 332)                                                                                                                                          |

**Test** `laneA.test.js`: iterate the 16 (+ the arm-b variants); each negative → its target raw under
the adapter; the base pack → raw 0 public+audit; the revise-after-responding **positive control** → 0.

### Task 2.4 — byte-stability

`verify-byte-stability.mjs`: build the pack twice under Node 26, `cmp` every file. **Test** asserts
identical bytes. Command:
`/opt/homebrew/opt/node@26/bin/node tools/simurgh-attestation/stage5j/node/verify-byte-stability.mjs` →
`BYTE-STABLE`.

---

## Phase 3 — Lane B ceremony + Lane C gate (+ adversarial demo)

### Task 3.1 — Lane B multi-party ceremony

Per-party child processes (≥1 producer, ≥2 reviewers, 1 ledger authority), each signing under its own
key; epoch tickets sequence entries; produces sections A–E (the full state census incl. rebuttal E).
Assert key distinctness (`ledger_authority ≠ producer ≠ every reviewer`) and
`ledger_authority_content_blind` (the authority's inputs are `entry_digest`s only — G10). **Test**
`laneb.test.js`: ceremony output verifies raw 0; the 5-section derived-state census matches expected.

### Task 3.2 — Lane C (real reviewer-rating ceremony) + the adversarial demo (kept separate)

Two DISTINCT things — do not conflate them (reviewer P7):

**Lane C (real, `completed ⟹ raw 0`).** The frozen Lane C is the real-structure ceremony: reuse the
**exact two 5I `reviewer_principal` identities**, each emitting **NEW VRC ratings** over its committed
`evaluated_sections` (5I committed coverage receipts, NOT ratings — the ratings are new here) over the
Opus 4.6 SRR 37-section public structure; producer ratings from the research producer under the reused
`producer_identity_digest` (explicitly NOT Anthropic self-ratings); VFC `externally_anchored` evidence
attached; all Lane C non-claims retained (`not_anthropic_self_rating`, `not_metr_rating`, …).
`lanec-gate.mjs`: `completed ⟹ pack present AND verifies **raw 0**` under a verifier key distinct from
ours; else `pending`. A pack that fails verification can be **sealed** as an outcome but can NEVER mark
the campaign `completed`.

**The adversarial Fable-5 demonstration (Lane-A family, NOT Lane C).** The live Fable-5 producer that
self-rates favourably against a stricter reviewer rating is an _adversarial reference_ alongside the
Lane A laundering fixture: it seals `342` (override caught — trophy), `0` (spin confined to a recorded
contest — system works), or `model_refused`. Because a `342` outcome is not raw 0, it is a sealed
demonstration and **never** a completed Lane C. Fable-5 does not replace the real-structure ceremony.

**Test** `lanec.test.js`: `pending` with no pack; a synthetic real-ceremony pack (distinct keys, two
reused reviewer principals, raw 0) → `completed`; a pack that fails verification → rejected as
`completed` (may be sealed); the adversarial demo sealing `342` is recorded as a demonstration, not a
`completed` campaign. (Real execution is a Phase-6 step.)

---

## Phase 4 — Parity + Lean

### Task 4.1 — Python parity

`vrc_parity.py` ports the decision core; shares canonical/hash semantics. **Test** `parity.test.js`
runs both on the committed Lane A pack and asserts byte-identical `verdict_raw`, `vpc_bundle_digest`,
`partition_digest`, `rating_obligation_root`, `rating_ledger_root`, `contest_layer_root`,
`projection_root`, `derived_state_census`. State in the test header: injected crypto facts test the
pure core, not cross-runtime crypto impl.

### Task 4.2 — Browser packaging parity

`vrc-portable.mjs` bundles the same JS core. **Test** `browser.test.js`: same raw + roots as Node on
the Lane A pack. Wording: "browser packaging/execution parity over the same JS core," not a third
language.

### Task 4.3 — Lean (11 theorems, zero `sorry`)

`proofs/stage5j/RatingContest.lean` — model the decision core as a pure function and the wrapper as an
explicit `Except`/`Result` boundary. Prove the SAME 11 theorems as spec §4, one-to-one: (1)
obligation-equality soundness; (2) contest-event completeness (recompute over BOTH rating histories +
epoch tickets); (3) no-silent-favourable-override **quantified** — `∃!` valid bound response per
recomputed historical contest event; (4) per-tier first-failure uniqueness/soundness (347 modeled as
the explicit `Result` boundary); (5) reviewer-statement binding — concurrence AND rebuttal, mutually
exclusive, each reachable only from `contested_response_recorded`; (6) chain-topology unique head; (7)
non-comparable exclusion from the denominator; (8) supersession authority over ALL historical entries
(fossil attack); (9) tier monotonicity; (10) `noSilentOverridePath` — the Override Trilemma, no fourth
branch; (11) `noCorrectnessBit` — the state space has no correctness value; verdict independent of any
correctness predicate. Build:

```bash
cd proofs/stage5j && (lake build || lean --run RatingContest.lean)
grep -c "sorry" proofs/stage5j/RatingContest.lean   # → 0
```

---

## Phase 5 — K7 net + gates

### Task 5.1 — K7 all-functions e2e

`tests/e2e/llmShield/stage5j/k7AllFunctions.test.js`: import every exported function from every
`stage5j` module and assert it is called; assert every raw **332–347 is reachable** (drive 332–346 via
their negative-arm files, and **347 via a runtime throwing-`facts` injection**); assert the evidence
pack is **locked** (recompute digests match committed). Mirror `stage5i/k7AllFunctions.test.js`.

### Task 5.2 — Full local gate

```bash
npm run format            # normalize
npm test                  # unit — all green
bash scripts/check.sh     # full gate incl. e2e, prettier --check, git-clean, exit-map goldens
```

All green. If `check.sh` flags git-clean, commit the regenerated evidence/goldens (never `.gitignore`
them). Re-run the **prior** stage reproduce to confirm sealed history is undisturbed:

```bash
/opt/homebrew/opt/node@26/bin/node tools/simurgh-attestation/stage5i/node/verify-vpc-attestation.mjs docs/research/llm-shield/evidence/stage-5i
```

Expected: 5I still verifies raw 0.

---

## Phase 6 — PR, merge, tag, reproduce-on-main, closeout

**The tag must contain the closeout and the final Lane-C status — never tag first and back-fill
(reviewer P12).** Pick ONE release shape and follow it in order:

**Plan-time preflights (settle empirically first):**

- RSP version is **settled: v3.4, effective 8 July 2026** (confirmed from the canonical policy page).
  Pin v3.4 in the spec. The confirmed verbatim anchor is the split-review coverage sentence; the
  **"Areas of disagreement" section + 30-day window is reported-until-pinned** (the canonical page did
  not surface it — pin it from the Risk Report template before it hardens into a quoted claim, or keep
  it flagged as reported).
- Confirm the independent party can sign VRC reviewer ratings under the reused 5I reviewer keys
  (decides Lane C reuse vs a fresh VPC bundle).

**Pending-release path (Lane C not yet run by the independent party):**

1. Commit the code, Lane A/B evidence, the `pending` Lane-C gate, the closeout doc (`docs/research/llm-shield/STAGE_5J_CLOSEOUT.md`,
   Frontier scored **9.2**), README banner + north-star update — ALL before tagging.
2. PR with an honest scope section (what shipped, what stayed `pending`, the signed limitations).
3. CI green → rebase-merge → **`git reset --hard origin/main`** on local main.
4. `git tag v2.45.0-stage-5j-vrc` (re-check `git tag --sort=-creatordate` first) → reproduce ON MAIN
   (Node 26): build-evidence twice + `cmp`; verify raw 0 public+audit; confirm 5I still reproduces.
5. Later, when the independent party runs the real Lane C, ship it as a follow-up (its own commit/tag).

**Completed-release path (real Lane C executed before release):**

1. Execute the **real Lane C** (two reused 5I reviewer principals emit real VRC ratings, producer =
   research principal, VFC `externally_anchored`); it must verify **raw 0** to mark `completed`.
2. Separately run the **adversarial Fable-5 demonstration** (Frontier lever) and seal its outcome
   (`342` trophy / `0` / `model_refused`) — a `342` is a sealed demo, NOT a completed campaign.
3. Commit code + all evidence (Lane A/B/C) + the closeout (Frontier **9.5**, earned by the executed
   Lane C) + README/north-star → PR → CI green → rebase-merge → reset local main → reproduce → THEN
   `git tag`.
4. Verify the tag is a Release (`gh release list` vs `git tag` — tag ≠ Release, the 5C lesson).

**After either path:** Memory — `MEMORY.md` pointer + `project_stage-5j-vrc.md` with the new gotchas.
Zurvan — search for duplicates first, then ingest the decision ADR + any missing claims.

---

## Task dependency order

`0.1 → 0.2 → 0.3 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 1.10 → 1.11 → 1.12 → 1.13
→ 2.1 → 2.2 → 2.3 → 2.4 → 3.1 → 3.2 → 4.1 → 4.2 → 4.3 → 5.1 → 5.2 → Phase 6`.

Each Phase-1 check task ends with an independently testable green core arm; each Phase-2+ task ends
with a runnable artifact. Never proceed to the next task with a red test.
