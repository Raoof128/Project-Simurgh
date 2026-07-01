# Stage 4J — PCTA (Provenance-Carrying Tool Attestation) v0 — Design Spec

**Status:** design locked (brainstorm), pre-implementation. **Owner:** Raouf. **Date:** 2026-07-02.
**Depends on:** merged Stage 4H.0–4H.5 (DFI certificate, `offlineHarness.mjs`, total fail-closed exit wrapper `exitCodes.mjs`, Ed25519 signed pack, signed-pack manifest).
**Next step:** `writing-plans` turns this design into the task-by-task TDD implementation plan (J1→J6). This spec is the WHAT/WHY; the plan is the HOW.

---

## Milestone (one sentence)

PCTA v0 — a **Provenance-Carrying Tool Attestation** unit bound to the merged 4H DFI certificate, plus an offline, third-party-reproducible verifier that attests, per tool call, that (1) enforcement was **required**, (2) a **valid signed authority proof** accompanied the action, (3) untrusted context **never became authority** (into the declared authority-sink set), (4) the host applied **exactly** the authorized action (as recorded), and (5) it all **replays offline under a dishonest producer, within the scope of §0.6**.

## "Attest, don't own" (the spine, locked)

Simurgh does **not** dispatch or block tools — the host runtime performs allow/deny. PCTA is an *attested enforcement hook*: it verifies, post-hoc and offline, that the host's authorization decision carried a valid proof, that authority never derived from untrusted context, and that what executed matches what was authorized. **Verifiable receipt, not a passport; not a reference monitor; not a gateway.**

## Naming note (deliberate)

"PCTA" expands to **Provenance-Carrying Tool Attestation** — *not* "proof-carrying authorization," which is Bauer's established term (Princeton TR-677-03, 2003, building on Appel & Felten's Proof-Carrying Authentication, CCS'99) for an **inline guard that checks a submitted proof and decides** — architecturally the opposite of what Simurgh does. We keep the letters, drop the colliding phrase, and position explicitly against classic PCA in §5.

---

## 0. Locked ledgers

### 0.1 PCTA authorization proof — frozen schema `simurgh.pcta.authorization.v1`

One canonical, signable unit per tool call; digest bound into the same Ed25519-signed pack manifest as the 4H `certificate_digest` (acyclic — no ouroboros). The verifier **recomputes every digest from local inputs**; it never trusts a committed digest.

```json
{
  "payload": {
    "schema": "simurgh.pcta.authorization.v1",
    "tool": "send_email",
    "action_class": "external_egress",
    "authorized_action_digest": "sha256:...",
    "user_intent_digest": "sha256:...",
    "policy_digest": "sha256:...",
    "authority_source": "user_confirmed",
    "untrusted_context_reached_authority": false,
    "dfi_certificate_digest": "sha256:...",
    "epoch": 1782892800,
    "nonce": "b3f1...",
    "nonce_scope": "signed_pack",
    "enforcement": {
      "required": true,
      "applied": true,
      "applied_action_class": "external_egress",
      "applied_action_digest": "sha256:..."
    }
  },
  "signature": "ed25519:...",
  "public_key_fingerprint": "sha256:..."
}
```

- **DFI binding.** `dfi_certificate_digest` MUST reference the 4H DFI certificate for the *same run*. PCTA is built on 4H's explicit-flow-integrity proof and **requires that certificate to be valid** (see §0.6 / P4 precondition 1).
- **Run-root binding.** The PCTA proof roots into the existing 4H **signed-pack manifest** as the single declared-run object. The 4H manifest already commits `base_pack_digest + certificate_digest + hermeticity_attestation_digest` under one `merkle_root` (verified: `base_pack_digest` IS under the root); the PCTA proof digest is bound into that manifest acyclically. No new `run_pack_digest` is introduced.
- **Signed envelope (P2).** Acyclic canonical `payload` + `ed25519` signature **outside** the payload + `public_key_fingerprint`. A signature is accepted only if it verifies **and** the fingerprint is in the reviewer-side **pinned keyset** (valid signature under an unpinned key still fails `32` — forged ≠ merely malformed).
- **Two-digest-space carve-out (load-bearing).** There are two digest spaces and they must not be conflated:
  - **Proof-envelope digest** (the PCTA proof's own canonical digest, for manifest binding) = **RFC 8785 JCS + SHA-256**.
  - **Action-comparison digests** (`authorized_action_digest`, `enforcement.applied_action_digest`) = **4H's `sha256Canonical`**, computed over the *same* resolved-action object as the 4H receipt's `resolved_args_digest`, and compared **inside 4H's digest space** — reuse the receipt's `resolved_args_digest` directly, do NOT recompute with JCS. (Mismatched canonicalizers here are a silent-failure mode: P5/P6 would never match. This carve-out prevents it.)
- **Action-digest binding (P5).** `action_class` equality is necessary but not sufficient; reject (`35`) whenever `applied_action_digest ≠ authorized_action_digest` in 4H's digest space.
- **Replay scope (P3).** `nonce_scope: "signed_pack"` — nonce uniqueness + epoch freshness recomputed **within the signed pack** (pack-local replay only; not global anti-replay in v0).

### 0.2 Authority-source lattice (frozen)

| Authority source | Rank | Can carry a tool action? |
| --- | --- | --- |
| `user_confirmed` | 3 (highest) | Yes |
| `policy_preauthorized` | 2 | Yes (within policy scope; scope-verification deferred — see non-claims) |
| `agent_derived` | 1 | Only with a higher-ranked proof present |
| `untrusted_context` | 0 (lowest) | **NEVER — hard reject (`34`)** |

**Killer invariant (P4), read-not-walk.** An authorization proof whose `authority_source` resolves — through the bound 4H DFI certificate's **authority-requiring sink** claim — to `untrusted_context` is rejected (`34 authority_from_untrusted_context`), **even when the proof declares `untrusted_context_reached_authority:false`**. DFI-derived truth always beats the producer's declaration.

Implementation: **P4 reads the bound certificate's `sink_safety_claim` for the authority-requiring sink** rather than re-walking a lattice — sound *only because* PCTA re-runs 4H's `validateDerivation` in the same offline pass (P4 precondition 1, §0.6), which cryptographically forces stored `safe` to equal the recomputed value. The protected object is the host-declared **authority-requiring action sink** (4H's `authority_sink:true` flag), not a separate "authority-granting edge" (which 4H does not model). *Untrusted context can influence answer text, but cannot become authority into a declared authority sink.*

### 0.3 Exit-code ledger — extends 4H §0.1 (frozen, total, fail-closed)

| Raw code | Meaning (gate) | Run-level |
| --- | --- | --- |
| `0` | verifier accepted a well-formed authorized call (P0) | `0` |
| `31` | `authorization_proof_missing` (P1) | `1` |
| `32` | `authorization_signature_invalid` — bad sig or unpinned key (P2) | `1` |
| `33` | `authorization_proof_stale` — epoch/pack-local nonce replay (P3) | `1` |
| `34` | `authority_from_untrusted_context` (P4 — killer invariant) | `1` |
| `35` | `authorized_action_mismatch` — applied ≠ proven, or executed sans proof (P5) | `1` |
| `36` | `enforcement_required_not_applied` (P6) | `1` |
| `37` | `pcta_policy_or_intent_digest_mismatch` (P7) | `1` |
| `38` | `authority_sink_underdeclared` — high-consequence class flagged non-authority (P8) | `1` |
| `28` | `checker_not_offline` (reused 4H Q3 pre-flight) | `2` |
| `20–26` (4H band) | surfaced verbatim when the **mandatory 4H re-verify fails** (P4 precondition 1) | per 4H |
| `29` / unmapped | internal error / exhaustiveness breach | `3` (fail-closed) |

**Locked rule:** `0→0`; `{31..38}→1`; `28→2`; `29→3`; **unknown → 3**. 4H raw codes retain their existing 4H mappings. (`30 extraction_budget_exceeded` stays EBA/4K's; PCTA does not use it.) Q0–Q7 mappings unchanged.

**4H re-verify note (P4 precondition 1).** PCTA's "verify signed pack" step means **run the 4H verifier** (which runs `validateDerivation`), not check a digest. If the re-verify fails — e.g. a certificate whose stored `sink_safety_claim.safe=true` fails 4H's recompute — PCTA surfaces the **underlying 4H raw code (20–26 band)** through the shared wrapper, NOT a PCTA `31–38` code. It is a 4H-layer failure detected during the required re-verify; layering is preserved.

**`38` extends the frozen band deliberately.** P8 is the one local cross-check on the authority-sink *membership* gap (§0.6). It is a v0 include; it can be deferred by dropping `38`/P8 and marking the membership gap a pure named residual — that is the only knob if the band must stay `31–37`.

### 0.4 P-gate ledger (the verifier — one falsifier per gate)

| Gate | Falsifies | Fixture | Raw → typed exit |
| --- | --- | --- | --- |
| **P0** | positive control: well-formed, `user_confirmed`, DFI-clean call accepted | `clean-authorized.json` | `0 → 0` |
| **P1** | no authority proof for an executed (recorded-allowed) action | `missing-proof.json` | `31 → 1` |
| **P2** | forged/invalid signature or signer key not pinned | `forged-sig.json` | `32 → 1` |
| **P3** | stale epoch / duplicate nonce within the pack | `stale-proof.json` | `33 → 1` |
| **P4** | authority resolves to untrusted via the bound cert's authority-sink claim (declaration ignored) | `untrusted-authority.json` | `34 → 1` |
| **P4-pre** | bound cert's stored `safe=true` fails 4H re-verify (stored ≠ recomputed) | `stale-derivation-cert.json` | 4H band `24`/`26` → `1` |
| **P5** | `applied_action_digest ≠ authorized_action_digest` (or recorded-allowed sans proof) | `action-mismatch.json` | `35 → 1` |
| **P6** | enforcement required but no receipt supports `applied` (`¬applied_supported`) | `enforcement-gap.json` | `36 → 1` |
| **P7** | intent/policy digest mismatch | `digest-mismatch.json` | `37 → 1` |
| **P8** | receipt declares high-consequence class but `authority_sink:false` | `sink-underdeclared.json` | `38 → 1` |

Fixtures for P5/P6 are constructed from real **decision-receipts** (fields `decision`, `resolved_args_digest`, `sink_id`, `consequence_class`), not synthetic execution records, so they exercise the actual `applied_supported` recompute path.

**Pre-flight (reused from 4H).** The whole P0–P8 body runs inside `runOffline` (`offlineHarness.mjs`); any egress hit → `28 → 2`. Final exit **always** routes through `stage4CodeForRawCode`.

### 0.5 Honesty ceiling / non-claims (state up front)

- `not_runtime_gateway` / `not_reference_monitor` — Simurgh does not dispatch or block; the host performs allow/deny.
- `host_owns_dispatch` — a tool that ran without a proof is *detected post-hoc* (`31`/`35`), not *prevented* inline.
- `authority_source` is **declared-then-provenance-checked**, not ground-truth intent.
- **`applied` is faithfulness-of-record — specifically "recorded-as-allowed"**, not kernel execution-truth (execution-truth gap = R6/4M). Correspondingly, T2's left side is `recorded_allowed(action,k)`, not `executed(...)`.
- **`authority_sink` membership is host-declared.** P4 recomputes untrusted-non-reachability *into* declared authority sinks; it does not derive *which* actions require authority. Under-declaration shrinks P4 coverage (P8 is a partial, non-closing cross-check; full closer = R6/4M).
- `pack_local_replay_only` (no cross-pack anti-replay in v0).
- `policy_scope_deferred` — v0 headlines only `user_confirmed`; `policy_preauthorized` stays lattice-valid but its scope is unverified until a later stage.
- **single-delta** (`not_multifield_collusion`); **explicit-flow only** (`implicit_flow_security=false`); **not model safety / not execution truth**; **process-boundary, not a kernel sandbox** (R6/4M); `attestation_assumes_reviewer_runtime`.
- No "first proof-carrying authorization" public-priority wording (frozen).

### 0.6 Dishonest-producer threat model (the scope of "under a dishonest producer")

**v0 scope = A (correctly-scoped boundary, not "least work").** PCTA v0 attests **consistency + provenance of the declared evidence, relative to the pinned 4H manifest root**. Both attack classes beyond this line are outside what any offline single-producer recompute can *ever* close, so the honest v0 job is to make the boundary loud and precise, not to overreach it.

| Attack | Closes it | Where it belongs |
| --- | --- | --- |
| Forge signature / unpinned key | P2 pinned keyset | **v0 (A)** ✅ |
| Internally inconsistent evidence (digest/premise/derivation mismatch) | offline recomputation (P4 re-verify, P5, P7, DFI binding) | **v0 (A)** ✅ |
| **Applied-action reality** ("said bob@company, really sent attacker@evil") | non-fabricable transcript of the outbound call — zkTLS/DECO (a witnessable TLS event) | **deferred**, T2/P5 surface |
| **Internal-flow reality** ("was authority actually clean") AND **authority-sink-set completeness** ("is this action honestly flagged") | attested runtime (TEE/eBPF) = **R6/4M** — zkTLS cannot see the internal graph | **deferred**, T1/P4 surface |
| Post-hoc swap / backdate / fork | commit-before-challenge protocol (not a mere anchor) | **witness/DAP line** (3W → WIE/4O), not PCTA |

**Two omission surfaces, two deferred closers** — this is the same T1/T2 decomposition projected onto the omission axis:

- **T2 / P5 — applied-action reality.** Closer = zkTLS/DECO on the outbound tool call. Contingent on that DECO transcript rooting into the same manifest.
- **T1 / P4 — internal-flow reality + authority-sink membership.** Two omission entries, one closer = attested runtime (R6/4M). zkTLS cannot see internal flow; do not claim it does.

**Relocations / exclusions.** A transparency-log/timestamp **anchor is NOT an omission defense** and does not belong in PCTA — against a single producer who fabricates at authoring time and signs honestly, anti-swap buys nothing. Anchoring only pays off inside a commit-before-challenge protocol, which is the witness/DAP line.

**Frozen claim (scoped).** *Simurgh proves that — with respect to the declared explicit-flow graph and the declared authority-sink set, and under a producer who cannot forge crypto or present internally inconsistent evidence — the host achieved complete mediation with clean-provenance authority for this run, without being the mediator.* **Prove mediation ≠ perform mediation.**

---

## 1. Architecture — new module, reuse 4H unchanged

New dir `tools/simurgh-attestation/stage4j/`, reusing merged 4H modules **verbatim**:

- `exitCodes.mjs` — **extend** `RUN_LEVEL_BY_RAW` with `31–38 → 1` (still total, fail-closed); add `PCTA_REASONS`.
- `offlineHarness.mjs` — reused as the Q3 pre-flight (no edits).
- 4H DFI verifier (`dfiCertificate.mjs` / the nine-step verifier), `canonicalPremises.mjs`, `sha256Canonical`, Ed25519 signed-pack verify, `packBinding` manifest — reused; **PCTA re-runs the 4H verifier** as the mandatory pre-verify.

New modules:

- `authorizationProof.mjs` — §0.1 schema, JCS canonicalization of the envelope, acyclic manifest binding, `dfi_certificate_digest` recompute-and-compare, the two-digest-space boundary.
- `authoritySource.mjs` — §0.2 lattice + the P4 resolver that reads the bound cert's authority-sink `sink_safety_claim` (after the mandatory 4H re-verify).
- `verify-stage4j-pcta.mjs` — the P0–P8 verifier; offline pre-flight; `process.exitCode = stage4CodeForRawCode(rawCode)` on every path.
- `build-stage4j-fixtures.mjs` — builds the §0.4 fixtures (P5/P6 from real receipts).

**Invariant preserved:** no change to 4H's pinned nine-step verifier, `canonicalPremises.mjs`, or Q0–Q7. PCTA *consumes* the DFI certificate; it never modifies it.

**Tech/pins (unchanged):** Node.js ESM, `node:test`, `node:assert/strict`; RFC 8785 JCS + SHA-256 (proof envelope) + 4H `sha256Canonical` (action digests) + RFC 8032 Ed25519 + RFC 6962/9162 Merkle; determinism pins `TZ=UTC`, `LC_ALL=C`, `LANG=C`, `SOURCE_DATE_EPOCH=0`, `PYTHONHASHSEED=0`, `env -u` scrub, `NO_NETWORK=1` advisory (harness is the enforced boundary); Prettier + shellcheck.

## 2. Scope guard

**Do:** the §0.1 proof schema + canonicalization + two-digest-space boundary; the §0.2 lattice + P4 read-after-reverify resolver; the P0–P8 verifier with offline pre-flight and mandatory 4H re-verify; the `31–38` exit-code extension; a one-command reproduce with an anti-theatre deletion falsifier + byte-stable golden; evidence pack + closeout + reviewer checklist + validation matrix + the §0.6 threat model.

**Do NOT:** any token issuance or inline dispatch/deny (host owns that); any change to 4H Q0–Q7 or the nine-step order; a transparency anchor (relocated to the witness/DAP line); zkTLS/DECO or attested-runtime work (deferred omission closers); implicit-flow claims; multi-field collusion; kernel/namespace isolation (R6/4M); EBA exposure accounting (4K); any "first proof-carrying authorization" wording.

## 3. Task outline (detail deferred to writing-plans)

TDD, J1→J6 in order; J1 (shared exit-wrapper extension) is a hard dependency for all later tasks.

- **J1** — extend `exitCodes.mjs` with `31–38 → 1` + `PCTA_REASONS`; keep the wrapper total (`hasOwnProperty` guard, unknown → 3).
- **J2** — `authorizationProof.mjs`: JCS envelope, `computeProofDigest`, acyclic `bindIntoManifest`, `dfi_certificate_digest` recompute, signature envelope + pinned-keyset (`32`), the two-digest-space boundary.
- **J3** — `authoritySource.mjs`: lattice + P4 resolver (mandatory 4H re-verify → read authority-sink claim; declaration never overrides).
- **J4** — `verify-stage4j-pcta.mjs`: P0–P8 wrapped in `runOffline`; P4-pre surfaces 4H band codes; P5/P6 recompute over receipts; P8 consistency gate; evidence emission + acyclic manifest binding.
- **J5** — one-command reproduce (`set -euo pipefail`, exit only via wrapper), anti-theatre deletion falsifier (delete the proof → must flip to `31`/`35`, never `0`), byte-stable golden.
- **J6** — evidence pack + `STAGE_4J_CLOSEOUT.md` / `STAGE_4J_REVIEWER_CHECKLIST.md` / `STAGE_4J_VALIDATION_MATRIX.md` / `STAGE_4J_THREAT_MODEL.md` (§0.6 backbone) + overclaim guard.

## 4. Definition of Done + reviewer 5-minute path

**DoD:** exit wrapper total over `{0,19,20..38}` (`31–38→1`, `28→2`, `29`/unknown→3); every P-gate produces its mapped typed exit; **P4 rejects even when the proof declares clean**, and only after the mandatory 4H re-verify; a stale-derivation cert surfaces a 4H band code, not a PCTA code; every digest recomputed offline in the correct digest space; acyclic manifest binding; one-command reproduce exits only via the wrapper; deletion falsifier flips to `31`/`35` (never `0`); two runs byte-identical; §0.6 stated; no banned wording.

**Reviewer T1–T6 ("you do not need to trust us; run these six things"):** T1 clean→`0` · T2 strip proof→`1`(`31`) · T3 corrupt signature→`1`(`32`) · T4 replay stale proof→`1`(`33`) · T5 untrusted-authority→`1`(`34`, killer invariant) · T6 action mismatch→`1`(`35`).

## 5. Frontier positioning (credit, then the wedge)

The capability canon — **OCap / macaroons / Biscuit / UCAN / SPIFFE-SVID / Zanzibar** — proves authority **possession**. **Attested MCP tool-server admission (arXiv 2605.24248, Metere)** and **inline IFC systems / reference monitors — FIDES (arXiv 2505.23643, Costa & Köpf et al.; an IFC *planner*), MVAR (github.com/mvar-security/mvar), and classic Proof-Carrying Authorization (Bauer, Princeton 2003; Appel & Felten, CCS'99)** — are **inline, trusted enforcers that *decide***. None prove authority provenance offline, and none expose a third-party-recomputable faithfulness check. PCTA never decides — it proves.

> *(Citation debt, resolve before any external use: the "Meyman / Four-Tests / SSRN" reference is UNVERIFIED and must be confirmed or cut. Do not ship §5 with an unverifiable citation.)*

**Frozen claim (razor-specific, scoped to §0.6).** PCTA decomposes reference-monitor *complete mediation* (Anderson) into two independently-falsifiable properties an untrusting reviewer recomputes offline from the signed pack, under a dishonest producer (§0.6 scope) — the formal core of "attest, don't own." Prove mediation ≠ perform mediation.

- **T1 · Authority Non-Derivability.** Predicate: for the host-declared authority-sink set in the 4H DFI certificate bound by `dfi_certificate_digest`, **no untrusted-context source reaches any authority-requiring sink** — recomputed offline via the mandatory 4H re-verify. Novelty: retarget IFC non-interference off the answer channel onto the authority-requiring sink as the protected object. **FIDES contrast (closest prior art):** FIDES's Trusted-Action rule enforces this integrity condition *inline, as the planner*; T1's contribution is that the condition is recomputed **post-hoc, offline, producer-independently** from the signed pack by an untrusting reviewer. FIDES *is* the mediator; PCTA *attests* that mediation held without being it. Load-bearing falsifier = P4 declaration-override (`34`). Honest ceilings (§0.5): authority-sink *membership* is declared, not derived; internal-flow reality is R6/4M.
- **T2 · Applied-Action Faithfulness.** Biconditional: `recorded_allowed(action,k) ⇔ ∃ a valid bound proof with applied_action_digest = authorized_action_digest (action_class=k) AND applied_supported`. Two falsifier directions: (i) recorded-allowed sans proof → `35`; (ii) digest/class mismatch or `required ∧ ¬applied_supported` → `35`/`36`. Converts complete mediation from a property a *trusted monitor guarantees* into a biconditional the *adversary's own reviewer verifies offline*. Honest ceiling: `applied` = recorded-as-allowed, not execution-truth (R6/4M); applied-action reality closer = zkTLS/DECO.

**Empty-cell (PCTA-only under the full conjunction):** post-hoc + producer-independent + offline-recomputable + authority-provenance-integrity (T1) + applied-faithfulness biconditional (T2) + bound to an independent 4H DFI certificate, under a dishonest producer (§0.6 scope).

## 6. Maps to roadmap

- Evidence Plane mega-plan → 4J / PCTA (Friction half; first build to ship; reuses merged 4H DFI certificate + manifest).
- 4H DFI certificate (Q1/Q4 explicit-flow-integrity) → bound via `dfi_certificate_digest`; P4 reads the authority-sink claim after the mandatory 4H re-verify.
- 4H §0.1 exit wrapper + Q3 offline harness → reused and extended (`31–38`).
- Banger Roadmap EP6 — MCP Tool-Gate (R5) → PCTA is the attestation counterpart (verify authorization, don't dispatch).
- Deferred closers: zkTLS/DECO (applied-action reality), R6/4M attested runtime (internal-flow reality + authority-sink membership), witness/DAP line (commit-before-challenge anchoring), token issuance / inline dispatch, implicit flow, multi-field collusion, `policy_preauthorized` scope verification.
- Next after 4J: the 2-page Anthropic pitch memo (lands harder post-PCTA), then EBA (4K).

---

**Parent:** Project Simurgh — Evidence Plane / Verifiable Circuit Breaker (Unified Mega-Plan). **Reuses:** merged Stage 4H (DFI certificate, offline harness, total exit wrapper, signed pack + manifest).
