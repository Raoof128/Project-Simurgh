# Stage 5M — VTC-Quorum: implementation plan (TDD, zero-context)

Compiles the FROZEN spec (`docs/superpowers/specs/2026-07-13-stage-5m-vtc-quorum-design.md`) to keystrokes. Read the spec's Sections 1–4 before Task 1. Every task is test-first: write the failing test, watch it fail, minimal code, watch it pass, format, commit.

## Global constraints (VERBATIM — do not paraphrase)

- **Node 26** at `/opt/homebrew/opt/node@26/bin` for reproduce/K7/byte-stable steps; unit tests run on repo Node.
- **Motto in every new file header:** `AnthropicSafe First, then ReviewerSafe` (project header convention) — public/design wording uses the stage motto _ClaimSafe first, then ReviewerSafe_.
- **No attribution trailers** anywhere (commits/PRs/releases). Neutral messages.
- **Additive only.** 5L core (codes 364–383) and every prior stage stay byte-frozen. New raw codes **384–395**.
- **Frozen first-failure order** (spec §2): dispatch → 5L core 364…383 → 384 → 385 → 386 → 387 → 388 → 389 → 390 → 391 → 392 → 394 → 393; `395` is the outer fail-closed boundary, never a sequential predicate.
- **Three states:** `ecology_confirmed`→0 / `ecology_incomplete`→393 / `false_anchored`→394. Overclaim (394) before floor (393).
- **B11 split:** pure core over injected facts; node/python adapters do real crypto; browser verifies the adapter attestation (signed non-claim).
- **Keys:** Lane-A `INSECURE_FIXTURE_ONLY_*` (prettier-ignored, allowlisted in `scripts/security-audit-llm-shield-stage3m.sh` + `…stage3o.sh` by PATH REGEX, no digits); Lane-B/D **real Ed25519** — commit **public keys + fingerprints only**, never private keys, never allowlist a private key.
- **Evidence dirs prettier-ignored;** byte-stable (`cmp` twice).
- **Pinned inputs** `{ tsa_root, bitcoin_checkpoint, rekor_log_pubkey, expected_submitter_key }` are adapter inputs, independent of the entry (G6).
- **Real Lane B facts** (already captured & offline-verified): Rekor uuid `108e9186e8c5677ace556f35c062528c6cbcdeacbfc5f0b82e63509340bbd9e073bf7bc81bfb504f`, global_log_index `2156398791`, shard_leaf_index `2034494529`, tree_size `2034499331`, rootHash `8d8ba1bfc885f83cd007bb99e2110ed3238ed1d55dce3d5ee2afec428211b95b`, 24 inclusion hashes, bound artifact sha256 `9f1f14af4cafd0243fa37787822f2afcd3b599090f081d56aad6dc854ea0366d`, commitment `3ee8a8c9b8d7ea805fdb4bae192d86d11c22192855526d95761f4b87d89828e8`. Packet + offline verifier in scratchpad `rekor-gate/`.

## File map (one responsibility each)

```
tools/simurgh-attestation/stage4h/exitCodes.mjs         # +VTCQUORUM_RAW_CODES 384–395, orders, RUN_LEVEL, wrapper
tools/simurgh-attestation/stage5m/
  constants.mjs        # profile third_trust_ecology, required members, pinned-input shape, sockets I7/I8, RESERVED slots
  core/
    result.mjs         # R(code, detail?) re-export shape
    schema.mjs         # 384 v2 envelope + seat shape; exactly-3 required members (no gerrymander)
    rekorSeat.mjs      # 385–390 over INJECTED facts (structural→inclusion→checkpoint→SET→submitter)
    crossSeat.mjs      # 391 both binding levels (G3); 392 distinctness from pinned classes
    state.mjs          # 393/394 + ecology_independence_number (I-A); 394-before-393
    dispatch.mjs       # v2 schema-version dispatch; project onto 5L vtc_quorum profile (G2); run 5L core then extension
    vtcQuorumCore.mjs  # frozen spine wiring 384…394 over facts
  node/
    rekorAdapter.mjs   # real RFC6962 walk + ECDSA checkpoint/SET/submitter (Node-native crypto, no openssl, no net)
    facts.mjs          # makeVtcQuorumFacts(bundle, pinned) → injected facts (asserts shard_leaf_index<tree_size, ckpt==walk)
    verify.mjs         # verifyVtcQuorum(bundle, pinned) = dispatch(core, facts)
    attestation.mjs    # Ed25519 sign/verify over canonicalJson(parse(bundle⊕verdict)); binds pinned roots + N (spec §3)
    intoto.mjs         # I-B emit-only candidate predicate projection
    buildEvidence.mjs  # CLI: build Lane-A + wire Lane-B packet
    verifyAttestation.mjs # CLI: two-tier (public structure / audit rerun)
  python/vtcq_quorum_parity.py   # pure core parity + Lane-D raw-packet adapter (decision-equivalence)
  browser/{canonical-json.mjs, vtcq-quorum-portable.mjs}  # pure core; verifies adapter attestation
proofs/stage5m/EcologyQuorum.lean + lean-toolchain          # 11 theorems
tests/unit/llmShield/stage5m/*.test.js + _valid.mjs         # Lane A, all codes+states, parity, attestation, adapter
tests/e2e/llmShield/stage5m/k7AllFunctions.test.js          # K7 net
docs/research/llm-shield/evidence/stage-5m/{lane-a,real-laneb,real-lanec,real-laned}/
scripts/reproduce-llm-shield-stage5m.sh
tests/fixtures/llmShield/stage5m/test-keys/INSECURE_FIXTURE_ONLY_*.pem
```

---

## Task 0 — exit codes + constants (foundation)

**Interfaces:** `VTCQUORUM_RAW_CODES` (OK:0, 384–395), `VTCQUORUM_PUBLIC_CHECK_ORDER = [384,385,386,387,388,389,390,391,392,394,393]`, `VTCQUORUM_AUDIT_CHECK_ORDER`, wrapper id `INTERNAL_OR_ENV_UNAVAILABLE_VTCQUORUM = 395`, each 384–395 → `RUN_LEVEL_BY_RAW = 1`.

Steps:
1. **Test first** `tests/unit/llmShield/stage5m/exitCodes.test.js`: assert 384–395 present, unique, disjoint from 364–383; order array is a permutation with 394 before 393; every code maps RUN_LEVEL 1; wrapper is last. Run → fail.
2. Edit `exitCodes.mjs`: add the block additively (mirror `VTCQ_*` from 5L). **Gotcha (memory):** this is another exit-map consumer — update `RUN_LEVEL_BY_RAW` and any `exitWrapper`/exit-map golden; keep the non-hermetic 4h builder to only the two exit-maps it already reads. Run 5L + prior exit-map tests → still green.
3. `constants.mjs`: `PROFILE='third_trust_ecology'`, `QUORUM_RULE='all_required'`, `REQUIRED_MEMBERS=['rfc3161_tsa','bitcoin_confirmed_publication','transparency_log_inclusion']` (frozen, exactly 3), `PINNED_INPUT_KEYS`, `MINTED_SOCKETS=['keyless_submitter_identity_binding'(I7),'checkpoint_witness_cosigning'(I8)]`, `RESERVED_ARTIFACT_SLOTS`. Test freezes each. Commit `feat(5m): exit codes 384-395 + constants`.

## Task 1 — pure core: schema 384 (test-first)

`core/schema.mjs checkV2Schema(bundle)`: 384 if `schema!=='vtc_quorum_confirmed.v2'`, profile/quorum_rule wrong, `required_members` not exactly the 3-set (reject a smuggled 4th member — No Gerrymandered Universe), or any seat shape malformed. Tests: valid `_valid.mjs` v2 bundle → null; each malformation → 384. Commit.

## Task 2 — pure core: Rekor seat 385–390 over injected facts

`core/rekorSeat.mjs checkRekorSeat(facts)` returns first of:
- 385 `entry_body_malformed` (`facts.rekor.kind!=='hashedrekord'` / spec shape)
- 386 `artifact_hash_mismatch` (`facts.rekor.artifact_hash !== facts.anchor_sha256`)
- 387 `inclusion_invalid` + detail enum (`facts.inclusion_ok===false` with `facts.inclusion_reason`)
- 388 `checkpoint_invalid` + detail enum (`facts.checkpoint_ok===false`)
- 389 `set_invalid` (`facts.set_ok===false`)
- 390 `submitter_binding` + detail enum (`facts.submitter_ok===false` OR `facts.entry_submitter_fpr !== facts.expected_submitter_fpr`) — reachable via the pinned expected key (G6)
Tests: one per code, isolated (only that fact false). Commit.

## Task 3 — pure core: cross-seat 391 + distinctness 392

`core/crossSeat.mjs`:
- `checkCrossSeat(facts)` → 391 unless **both** (G3): `facts.anchor_parses_to_commitment && facts.tsa_imprint===facts.commitment` AND `facts.ots_target===facts.anchor_sha256 && facts.rekor_artifact_hash===facts.anchor_sha256`.
- `checkDistinctEcologies(facts)` → 392 if `new Set(facts.ecology_class).size < 3` where `ecology_class` are **verifier-pinned** classes (`rfc3161`/`bitcoin`/`rekor`), never producer strings.
Tests: mismatch at each level → 391; two seats same class → 392. Commit.

## Task 4 — pure core: state machine 393/394 + Ecology Independence Number (I-A)

`core/state.mjs`:
- `ecologyIndependenceNumber(facts)` = count of distinct pinned classes among **valid, present** seats.
- `computeState(facts)`: `confirmed` iff all 3 seats present+valid ∧ crossSeat ok ∧ distinct(=3); else `incomplete`.
- `checkState(facts)`: if `facts.declared_externally_anchored && state==='incomplete'` → **394** (overclaim, first); else if `state==='incomplete'` → **393**; else null (0).
Tests: confirmed→0 & N=3; a required seat absent + declared false → 393 & N<3; same absent + declared true → 394; ensure a present-but-invalid seat returns its 385–392 code, NOT 394/393 (precedence). Commit.

## Task 5 — pure core: dispatch + frozen spine

`core/dispatch.mjs dispatchVtcQuorum(bundle, facts, run5lCore)`:
1. schema-version check → non-`.v2` handled (v1 routed to 5L unchanged — `v1Unreinterpreted`).
2. project bundle onto **5L `vtc_quorum` profile** (G2); `const c = run5lCore(projection); if (c!==0) return c;` (frozenCorePreserved).
3. `checkV2Schema` (384) → `checkRekorSeat` (385–390) → `checkCrossSeat` (391) → `checkDistinctEcologies` (392) → `checkState` (394 then 393) → 0.
Wrap the whole call so an internal throw yields **395** (outer boundary, never masks a derived code).
`vtcQuorumCore.mjs` composes these as the exported frozen spine. Tests: full order table; v1 bundle verdict == its 5L verdict; a 5L-core nonzero (e.g. pending OTS → 372) short-circuits. Commit.

## Task 6 — node adapter: real crypto (ports the gate verifier)

`node/rekorAdapter.mjs` (Node-native `crypto`, **no openssl subprocess, no network** — hermetic):
- `rfc6962Root(leafHash, shardLeafIndex, treeSize, proofHashes)` (iterative; assert `0<=idx<size`, consume all hashes).
- `verifyCheckpointNote(checkpoint, rekorPubKey)` → parse note, ECDSA-verify sig over `body+'\n'`, assert size line == treeSize and root line == rootHash.
- `verifySet(canonEntry, setDer, rekorPubKey)`.
- `verifySubmitter(anchorBytes, sigDer, entryPubKey)`.
`node/facts.mjs makeVtcQuorumFacts(bundle, pinned)`: recompute all of the above, assert `shard_leaf_index<tree_size` and `checkpoint_size===tree_size`, produce the injected-facts object (booleans + values the core consumes). `node/verify.mjs verifyVtcQuorum(bundle,pinned)=dispatchVtcQuorum(bundle, makeVtcQuorumFacts(...), run5lCore)`.
Test against the **real Lane B packet**: verdict 0, state confirmed, N=3, externally_anchored true. Negative controls (tamper anchor→386, flip inclusion hash→387, corrupt SET→389, logIndex=treeSize→387 `log_index_out_of_range`, wrong expected_submitter→390). Commit.

## Task 7 — attestation + in-toto predicate (I-B)

`node/attestation.mjs`: Ed25519 sign/verify over `canonicalJson(parse(bundle⊕verdict))`; the signed object binds the **full list** in spec §3 (schema/profile, anchor digest, commitment, packet manifest root, TSA+roots fpr, OTS digest+block, Rekor uuid+global_log_index+shard_leaf_index+tree_size, body/inclusion/checkpoint/SET digests, pinned Rekor + submitter fpr, adapter version digest, injected facts, state, `ecology_independence_number`, externally_anchored, raw+detail). `node/intoto.mjs emitContainmentQuorumPredicate(...)` → in-toto Statement, candidate predicate `https://simurgh.dev/attestation/containment-quorum/v0` (emit-only; non-conformance non-claim in output). Tests: sign→verify round-trip; tamper any bound field → verify fails; predicate has the non-claim. Commit.

## Task 8 — Lane A fixtures + byte-stable build CLI

`node/buildEvidence.mjs` builds `evidence/stage-5m/lane-a/` synthetic bundles (fixture keys) exercising **every** 384–395 + all three states; `cmp` twice for byte-idempotence. `verifyAttestation.mjs` two-tier CLI. Tests: build is deterministic; each fixture yields its target code. Commit.

## Task 9 — Lane B real offline CI gate

Wire the frozen real packet into `evidence/stage-5m/real-laneb/` (Rekor packet + manifest `898fc09e…`, reuse 5L DigiCert token + confirmed OTS). CI gate = **digest pin + full offline Node recompute** → 0/confirmed/N=3/anchored, run on any 5M verifier/adapter/schema/trust-root/evidence change. Real Ed25519 attestation (public key + fpr committed; private key never). Test asserts the gate result and that the committed signature verifies. Commit.

## Task 10 — Python parity + Lane D + browser

`python/vtcq_quorum_parity.py`: (a) pure-core parity over identical injected facts (same 384–395 verdict as Node); (b) **Lane-D** raw-packet adapter consuming the frozen packet itself (never Node facts/root/verdict) → decision-equivalence (raw verdict, state, N, anchor+root fingerprints byte-equal; signatures differ by key). `browser/vtcq-quorum-portable.mjs`: pure core + verifies adapter attestation (signed non-claim). Tests: Node↔Python↔browser core parity on shared vectors; Lane-D decision-equivalence. Commit.

## Task 11 — Lean proofs (11 theorems)

`proofs/stage5m/EcologyQuorum.lean` (Lean 4.15.0, no mathlib, zero `sorry`, no user axioms; `HashInjectiveOn` explicit). Theorems 1–11 from spec §4: `exactConjunction` (precond `v2WellFormed ∧ coreVerdict=0`), `incompleteNeverAnchored`, `overclaimBeforeFloor`, `rekorSpecificWins`, `distinctFromPinnedClasses`, `crossSeatBindingSound`, `frozenCorePreserved`, `v1Unreinterpreted`, `canonicalAnchorRoundTrip`, `rewriteFloorExact`, `crossEcologyEquivocationBound`. **Gotchas (memory):** `deriving DecidableEq`; `unfold X; decide` not `rw` on opaque defs; `_hm` for unused hyps; compile `exit 0`. Commit.

## Task 12 — K7 e2e + reproduce + keys + audits

`tests/e2e/llmShield/stage5m/k7AllFunctions.test.js`: every exported 5M function + tamper matrix + cross-stage invariants (5I/5J/5K/5L undisturbed). `scripts/reproduce-llm-shield-stage5m.sh` (Node 26; unit + parity + Lane A idempotence + Lane B offline gate + attestation verify + privacy scan + key audits + K7). Add fixture keys; allowlist by PATH REGEX in stage3m + stage3o audits. **Split any `write-hashes` after prettier; split `cmd && echo` under `set -e` onto separate lines (fail-open lesson).** Run reproduce twice → byte-identical. Commit.

## Task 13 — Lane C-adv deterministic corpus + live (post-build)

Freeze the mandatory deterministic corpus: counterfeit ecology→392, cross-log/wrong-checkpoint→388, cross-commitment replay→386, honest 2-seat floor→393, promoted 2-seat floor→394. Then (optional, CVP) Sonnet-5 live adversary; freeze any forgery as an evidence mutation through the real verifier; a refusal recorded honestly = neither attack nor containment. Digest-only, never CI-gated.

## Closeout

K7 + full reproduce green (+ 5I–5L reproduce undisturbed) → `check.sh` locally → PR (honest scope) → CI green → rebase-merge → reset local main → tag `v2.48.0-stage-5m-vtc-quorum` → reproduce ON MAIN → re-score scorecard from real Lane B CI / Lane D / external repro → closeout doc → README banner → memory (MEMORY.md + topic file) → Zurvan (search dupes first + ADR). I5 marked **PAID** on release acceptance.
