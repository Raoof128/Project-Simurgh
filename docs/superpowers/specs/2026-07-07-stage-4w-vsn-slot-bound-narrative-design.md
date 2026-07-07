# Stage 4W — VSN: Verifiable Slot-Bound Narrative (design)

> Motto: **AnthropicSafe First, then ReviewerSafe.** (Internal tie-break order;
> public wording stays provider-agnostic.)

**Date:** 2026-07-07 · **Branch:** `stage-4w-vsn` · **Prev:**
v2.31.0-stage-4v-vdp (main 317d78b8)

---

## 1. Identity, laws, blade

**Stage 4W — VSN: Verifiable Slot-Bound Narrative.** The arc declared at 4V:
**4V Contest → 4W Verified-Slot Narrative → 4X Novel-Attack Discovery.** 4W
pays the 4V reserved socket `narrative_claim_contest_deferred`.

**The wound it attacks.** 4T/4V locked the numbers but signed the honest
finding that 16 of 22 template sections are prose (`not_derivable`) or human
judgment (`requires_human_input`). The narrative _around_ the numbers is where
a story still gets spun. An Art-73 serious-incident report is a prose
document; 4W makes the prose **typed, bounded, and contest-addressable** — it
does not make prose "true".

**Thesis line:**

```text
4T: the report reruns.
4V: the accused can answer.
4W: the story cannot impersonate evidence.
```

**The blade (one per stage): span-level provenance typing of the incident
narrative.** The narrative is free prose plus a signed **span map**. Every
evidence-looking span must be declared. It may be `slot_bound`, `judgment`, or
`unverified_prose`. Only `slot_bound` and `judgment` spans carry evidentiary
linkage; `unverified_prose` carries zero evidentiary weight and renders
visibly as voice. A deterministic **leakage gate** scans all _undeclared_ text
for claim-lookalikes and fails closed on any hit.

**Span coordinates (defined now, not discovered later):** all spans are
byte-offset ranges over the canonical UTF-8 narrative body after deterministic
normalisation. Spans must be non-overlapping, sorted, inside bounds, non-empty,
aligned to UTF-8 code-point boundaries, and have unique `span_id` values.

**Laws:**

1. **No Smuggled Claim** — anything that sounds like evidence must be a
   declared span, and a declared span must verify. You may say anything; you
   may not _imply_ evidence. **Undeclared claim-looking text fails closed.**
2. **No Unanswerable Story** — every declared span is a contest address, by
   type: `slot_bound` spans are contestable by recomputation under 4V's frozen
   status table; `judgment` spans are contestable as judgment records;
   `unverified_prose` spans are contestable only as classification/rendering
   claims, never as evidence. Nobody recomputes a vibes sentence.
3. **Voice Is Not Evidence** — `unverified_prose` spans render visibly _as_
   prose in every audience view; the verifier proves they contributed zero
   evidentiary weight.

**The honest core (signed up front):** the leakage gate is a **frozen lexical
ruleset, not NLP**. Paraphrase smuggling ("almost nobody was affected") can
evade any lexical detector — we bound _syntactic_ smuggling only and sign that
bound. **Semantic paraphrase smuggling is out of scope for 4W and becomes a 4X
attack surface.**

**Read-only kernel:** zero `src/llmShield` diff; 4A–4V byte-frozen; no
`authorise_*` entry point. Additive raw codes **162–172** (wrapper LAST at
172; 173–180 left as headroom).

---

## 2. Artifact: `simurgh.vsn.narrative.v1`

A signed narrative bundle, additive beside the capsule (4T and 4V byte-frozen):

```text
{
  schema: "simurgh.vsn.narrative.v1",
  narrative_body,        // canonical UTF-8: NFC, LF-only newlines, no trailing
                         // whitespace; verifier checks byte-equality with
                         // normalise(body) — NEVER auto-fixes (164 on mismatch)
  span_map: [            // sorted by start_byte, non-overlapping, in-bounds
    { span_id, start_byte, end_byte, type: "slot_bound",
      regime, section_id, claimed_value, recompute_kind, evidence_digest },
    { span_id, start_byte, end_byte, type: "judgment",
      judgment_id, judgment_digest },
    { span_id, start_byte, end_byte, type: "unverified_prose" }
  ],
  judgments: [ { judgment_id, signed_judgment } ],
  binding: {
    capsule_root, attestation_digest, capsule_schema_version,
    capsule_signing_key_fingerprint,        // keyDigest over the PUBLIC PEM
    narrative_body_digest, span_map_digest },
  author_role,           // "operator" | "drafting_model_operator_signed"
  leakage_ruleset,       // "vsn.leakage.v1" — sealed INSIDE the signed bundle
  signature              // Ed25519 by the author key
}
```

**Digest definitions (canonical, one line each):**

- `narrative_body_digest` = sha256 over the canonical UTF-8 **bytes** of
  `narrative_body`, NOT `canonicalJson(narrative_body)`.
- `span_map_digest` = `recordDigest(span_map)` without derived/render-only
  fields, sorted exactly as stored.

**Judgment rules:** `judgment_id` values must be unique. Every judgment span
must reference exactly one judgment record.
`judgment_digest = recordDigest(signed_judgment)`. The `signed_judgment`
signature must verify under the declared judgment key or 168 fires.
Unreferenced judgment records are rejected (168) unless explicitly marked
reserved/non-rendered.

**Evidence-locality rail (lens, not blender):** a `slot_bound` span may only
cite an `evidence_digest` the capsule already sealed (167 otherwise), AND must
target an existing capsule projected section whose `regime`, `section_id`,
`recompute_kind`, `evidence_digest` match and whose `claimed_value` recomputes
to the projected value (169 otherwise — sealed evidence attached to the wrong
section is a wrong _derivation_, not foreign evidence). The narrative can
never expand the evidence set; a respondent with new evidence has 4V.

**Unspanned text:** renders as unverified connective prose by default and must
be leakage-clean. It never carries evidence weight.

**`unverified_prose` semantics:** declared `unverified_prose` spans MAY
contain claim-looking language; they render visibly as voice and contribute
zero evidentiary weight. Undeclared claim-looking text fails raw 170.

### Raw codes 162–172

| Raw | Reason                            | Fires when                                                                      |
| --- | --------------------------------- | ------------------------------------------------------------------------------- |
| 162 | `vsn_schema_invalid`              | strict allowlist keys/types (top level + per-span-type + judgment records)      |
| 163 | `vsn_signature_invalid`           | Ed25519 over `canonicalJson(content)` fails                                     |
| 164 | `vsn_normalisation_invalid`       | body ≠ normalise(body) byte-for-byte (NFC / CRLF / trailing-WS)                 |
| 165 | `vsn_span_geometry_invalid`       | overlap / unsorted / out-of-bounds / empty / mid-code-point / duplicate span_id |
| 166 | `vsn_binding_mismatch`            | any binding field ≠ recomputed expectation                                      |
| 167 | `vsn_evidence_locality_violation` | span cites a digest outside the capsule's sealed evidence set                   |
| 168 | `vsn_judgment_binding_invalid`    | digest mismatch / dup id / unreferenced record / inner signature fails          |
| 169 | `vsn_slot_recompute_mismatch`     | claimed_value ≠ recompute, or sealed-evidence-wrong-section derivation blend    |
| 170 | `vsn_leakage_detected`            | undeclared claim-lookalike in unspanned text — **fail closed**                  |
| 171 | `vsn_payload_violation`           | forbidden payload material anywhere in the bundle (recursive scan)              |
| 172 | `vsn_internal_fail_closed`        | wrapper: any throw → 172, never a silent pass                                   |

Frozen `VSN_CHECK_ORDER` = 162→163→164→165→166→167→168→169→170→171 (public
order is literal; the implementation follows it exactly). All codes
`RUN_LEVEL_BY_RAW` level 1. `UNKNOWN_RAW_PROBE` (999) hygiene per the standing
rule; `exitCodeProbeHygiene` danger-zone guard extended.

**Payload scan (171):** recursive over the full bundle — top-level fields,
`span_map` entries, `judgments`, `signed_judgment` payloads, and any
render/view material. Rejects raw transcripts, model prompts, hidden
completions, provider messages, tool outputs, private keys, and
network/egress-like fields. (Lane C is the reason this is spelled out:
prompt/completion material lives digest-only in the separate capture
document, never inside the narrative bundle.)

### Leakage ruleset `vsn.leakage.v1` (frozen, versioned, signed)

On all _undeclared_ byte regions, case-folded, deterministic, no NLP:

- ASCII digits;
- frozen English number-word list (zero…trillion, dozen, half, couple);
- `%` and the word "percent";
- ISO-date patterns and English month names;
- frozen quantifier list (all, none, most, every, nearly, almost, majority,
  nobody, no one);
- **capsule-value collision**: canonical serialisations of the capsule's own
  projected-section values appearing undeclared.

Every hit → 170 with byte-location detail. The ruleset version is sealed
inside the signed bundle so a future `vsn.leakage.v2` cannot silently
re-judge a `v1` narrative.

### Contest payoff (the socket, paid in-stage)

A `slot_bound` span _is_ a projected section with an address, so 4V's frozen
status table applies **verbatim** through a thin adapter — no new statuses,
no new verbs:

- `slot_bound` → the five 4V statuses by recomputation;
- `judgment` → `dispute_as_judgment` → `DISPUTE_RECORDED`;
- `unverified_prose` → classification/rendering contest only ("this was
  presented as evidence while typed prose") → recorded judgment, never
  recomputation.

**No-cloned-court rail:** Node 4W must call/import the 4V status-derivation
functions rather than defining a new 4W-only status table. Python/browser may
port the table only under parity gates.

The 4V ledger line: **`narrative_claim_contest_deferred` is marked PAID by
4W.** (Never silently replaced; the debt is paid, then the next debt is
minted — see reserved slots.)

### Views (Voice Is Not Evidence, enforced in render)

Derived-never-filed audience renders per the 4T 148/149 pattern: every span's
type is visible in every tier (`slot_bound` shows its recompute badge, voice
is visibly voice), render digest sealed, public tier structure-only.
**Invariant: no audience view may hide or downgrade the visible type marker of
a span** — the 4W No Two Stories.

---

## 3. Evidence lanes, attestation, parity, browser

| Lane | Role                            | Reproducibility tier              |
| ---- | ------------------------------- | --------------------------------- |
| A    | verifier/tamper/status corpus   | byte-stable, CI-gated             |
| B    | deterministic drafting ceremony | byte-stable, CI-gated             |
| C    | real LLM drafting capture       | sealed live capture, NOT CI-gated |

### Lane A — byte-stable corpus (over the pinned 4T green capsule)

- **Green narrative** (raw 0): all three span types + unspanned connective
  text; slot*bound spans over the real projected sections; a digest-bound
  judgment span; a declared `unverified_prose` span that \_contains
  claim-looking language* ("we believe most users trust us") proving the
  declared-voice semantics; leakage-clean connective text.
- **Normalisation fixtures**: NFC mismatch → 164; CRLF body → 164; trailing
  whitespace → 164.
- **Span-boundary matrix**: overlap → 165; out-of-bounds → 165; mid-UTF-8
  code-point split → 165; zero-length → 165; unsorted → 165; duplicate
  `span_id` → 165.
- **Tamper matrix 162–171**: one fixture per code plus trigger-family
  sub-variants — locality (foreign digest → 167) vs derivation blend (sealed
  digest, wrong section → 169); leakage (raw digit / number word / percent /
  capsule-value collision → 170); judgment (dup id / unreferenced record /
  bad inner signature → 168). Mutation fixtures re-signed (the 4T
  resignBundle lesson).
- **Contest fixtures (socket payoff)**: slot span → AGREED / CONFLICT_PROVEN /
  DISPUTE_FAILED via the 4V adapter; prose-span classification contest →
  recorded; locality pair.
- **View invariants**: a render attempting to downgrade a prose marker →
  refused; public-tier structure-only check.
- **Non-ASCII fixture**: narrative containing multi-byte text (سیمرغ + an
  emoji) with spans on byte boundaries around it, byte-stable across
  JS/Python/browser.

~20–24 cases, signed corpus document (`simurgh.vsn.lane_a_corpus.v1`).

### Lane B — deterministic drafting ceremony (CI-gated)

Two OS processes (the 4V pattern): `drafter-child.mjs` receives **only the
sealed capsule public projection** over stdin — never raw evidence, never
`OPERATOR_*` env (blindness negatives sealed: env-key regex + value scan +
argv `.pem` check). It deterministically emits narrative + span map. **The
Lane B drafter child signs the narrative with an ephemeral Lane-B author key
whose public key is sealed in the capture; the parent never rewrites the
child's narrative before verification.** Parent verifies to raw 0 and seals.
Blade proved: a drafter that sees only the capsule's public face can still
produce a fully verified narrative — drafting needs no privileged access, and
no quiet ghostwriter exists in the machinery.

### Lane C — live LLM drafting capture (sealed, NOT CI-gated)

A real Claude model via the gateway/MCP ceremony drafts from the sealed
capsule + the span grammar. The verifier runs on the real output. **Both
outcomes sealed as first-class evidence**: all-verified proves the pipeline;
a caught 169/170 is a successful verifier demonstration, not a failed stage.
The narrative bundle carries **no raw transcript** — prompt/completion are
sealed digest-only in a separate Lane C capture document
(`simurgh.vsn.lane_c_capture.v1`, the 3V-B/4O pattern); model id recorded; if
the model refuses, we seal `model_refused` (4U precedent). Marked
non-reproducible-without-key.

### Attestation — two-tier

New `stage4w` Ed25519 keypair (`INSECURE_FIXTURE_ONLY_vsn*.pem` under
`tests/fixtures/llmShield/stage4w/test-keys/`; path-regex allowlist line added
to BOTH `scripts/security-audit-llm-shield-stage3m.sh` and
`scripts/security-audit-llm-shield-stage3o.sh`).

- **Public tier** verifies every deterministic check that needs no private or
  live machinery: schema, signature, binding, normalisation, span geometry,
  evidence locality, judgment binding, leakage-rule declaration,
  render-marker presence, and the bundle Merkle root.
- **Audit tier** = full Lane A rerun, Lane B byte-stable reverify, Lane C
  digest/capture consistency checks.

Signs `canonicalJson(parse(bundle))` (prettier+merge-safe); `keyDigest` over
the **public** PEM on both build and verify sides (4V lesson, now doctrine).

### Parity — three implementations, one geometry

- **Python** `vsn_parity.py`: public tier — normalisation, UTF-8 byte
  geometry, binding, locality, leakage gate (the frozen ruleset ported
  exactly); Ed25519 excluded per pattern and stated as a parity non-claim.
- **Browser** `vsn-verifier.html`: static single file, CSP
  `default-src 'none'`, node:vm parity gate; paste capsule + narrative +
  pubkey; renders **the typed view itself** — spans visibly badged, voice
  visibly voice. **The browser verifier does not verify Ed25519 signatures
  unless WebCrypto support is explicitly implemented and parity-gated; the
  Node CLI remains authoritative for signature-bearing acceptance.**
- JS byte offsets via `TextEncoder`; the shared multi-byte fixture is the
  tripwire for all three implementations.

### Wiring (standing gotcha sweep, named now)

- Additive codes 162–172 ripple the SIX known goldens (4H exit maps ×2, 4L
  e2e net, 4K/4H exitWrapper snapshots, 4H inline map) — run the full Node-26
  e2e nets + prior reproduce scripts before push.
- `evidence/stage-4w` fully prettier-ignored (reproduce `cmp` byte-equality).
- `scripts/reproduce-llm-shield-stage4w.sh` added to `scripts/check-e2e.sh`'s
  REPRODUCE array (verified present — 4V's line lives there).
- Validate with `npm run format:check` (project script), never a hand-picked
  glob (the 4V round-1 lesson).
- Run `scripts/check.sh` locally as you build, before push.
- Node 26 (`/opt/homebrew/opt/node@26/bin`) for byte-stable reproduce.

---

## 4. Lean, non-claims, limitations, wedge, scorecard

### Lean (`proofs/stage4w/`, Lean 4.15.0, no mathlib, zero sorry)

Wired into `stage-4-lean-proofs.yml` + sorry-grep. Five theorems over a
modelled token/span algebra:

1. **`noSmuggledClaim`** — if the verifier accepts, every **lexical-claim
   token recognised by `vsn.leakage.v1`** in the body lies inside a declared
   span (leakage-gate soundness on the modelled stream; proves the frozen
   lexical model, not semantic claimhood).
2. **`spanDisjointness`** — accepted span map ⇒ pairwise disjoint, sorted,
   in-bounds.
3. **`voiceZeroWeight`** — projecting the verified span map onto evidentiary
   spans (`slot_bound` + `judgment`) yields the same verified evidence set
   whether `unverified_prose` spans and unspanned connective text are present
   or omitted. (No byte-offset surgery in the theorem.)
4. **`lensNotBlender`** — accepted `slot_bound` spans reference only sealed
   capsule evidence AND target an existing capsule projected section with the
   expected `regime`, `section_id`, `recompute_kind`, `evidence_digest`, and
   recomputed `claimed_value`.
5. **`contestAdapterFaithful`** — a narrative span contest derives exactly
   the status 4V's frozen table gives the corresponding projected section.

### Non-claims (9, signed)

1. `not_a_claim_of_truthful_narrative` — typed ≠ true.
2. `not_a_claim_of_semantic_leakage_completeness`.
3. `not_a_claim_that_judgments_are_adjudicated` — recorded, digest-bound,
   never scored.
4. `not_a_claim_of_authorship_integrity` — the key signs; we do not verify
   who held the pen.
5. `lane_c_live_capture_is_not_byte_reproducible_without_provider_key_and_model_state`.
6. `lane_c_digest_check_is_not_transcript_reproduction`.
7. `not_a_claim_of_incident_completeness` — suppression detection stays 4T's
   143/144.
8. `not_a_claim_of_model_safety` — the permanent one.
9. `not_a_claim_of_regulatory_compliance` — regulator-useful is not legal
   compliance.

### Known limitations (signed)

1. **Lexical, not semantic** — paraphrase smuggling evades any lexical gate;
   out of scope for 4W, named as the 4X attack surface.
2. **Ruleset v1 is English-centric** — number words/quantifiers are an
   English lexicon; the multi-byte fixture proves byte geometry, not
   multilingual leakage coverage.
3. **Both Lane A/B parties built by us** — restated from 4V; still the 4X
   hook.
4. **Leakage lexicon is registry-bounded** — the gate catches what the frozen
   list names; we sign the bound.
5. **Lane C non-reproducibility** — per non-claims 5 and 6.

### Reserved (signed) slots

- `semantic_leakage_adversary_deferred` — the new 4X socket (minted AFTER the
  4V ledger marks `narrative_claim_contest_deferred` PAID by 4W).
- `multilingual_ruleset_deferred` — `vsn.leakage.v2+` lexicons.
- `narrative_version_diff_deferred` — diffing narrative revisions across
  capsule re-filings (composes with 3Q registry machinery when opened).

### Industry wedge (source-map claim, not a compliance claim)

EU AI Act applies generally from **2 August 2026** (Art-113); Art-73
serious-incident reports and GPAI Art-55 model reports are prose documents —
the Act mandates filing but no mechanism types which sentences are
evidence-bound. California SB 53-family frontier-transparency reports
likewise. **No matching prior pattern in our current source map makes
individual incident-report narrative spans recomputable and
contest-addressable from sealed evidence.** Public wording stays
provider-agnostic.

### Four-axis scorecard

> Design-time internal scorecard, not shipped evidence and not a
> literature-complete novelty claim.

| Axis                     | Score | Why / what moves it higher                                                                                                                                  |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                  | 9.4   | Span-typed provenance over sealed evidence + fail-closed leakage gate + contest adapter = new verifier geometry, not a 3S port. Higher: semantic gate (4X). |
| Frontier                 | 9.2   | First narrative surface in the chain; single-narrative, single-round. Higher: adversarial drafter, multilingual ruleset.                                    |
| Lab/regulator usefulness | 9.4   | Art-73 filings are prose today with the Act applying 2026-08-02; a typed narrative is directly fileable. Higher: real regulator template adoption.          |
| Constitution             | 9.3   | Voice visibly marked as voice = anti-deception infrastructure; signed gate bounds. Higher: 4X adversarial closure.                                          |

Re-score at closeout.

### Mandatory closeout obligations

- K7-style all-functions E2E net (composes every export + tamper matrix +
  cross-stage invariants) MANDATORY before tag.
- Comprehensive docs-accuracy pass: every doc claim verified against shipped
  code.
- README stage row; north-star update; memory write; reserved slots restated;
  4V ledger line (`narrative_claim_contest_deferred` PAID) recorded.
- `scripts/check.sh` locally before push; neutral commit/PR messages, no
  attribution trailers.
