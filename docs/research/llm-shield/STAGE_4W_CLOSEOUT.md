# Stage 4W — VSN (Verifiable Slot-Bound Narrative) Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.** Public-facing: provider-safe
first, then reviewer-safe.

- **Shipped:** 2026-07-07 on branch `stage-4w-vsn`. Target tag
  `v2.32.0-stage-4w-vsn`.
- **Laws:** **No Smuggled Claim** · **No Unanswerable Story** ·
  **Voice Is Not Evidence.**
- **Banner:** the incident narrative _around_ the numbers becomes span-typed,
  bounded, and contest-addressable. 4T made the report rerun; 4V let the accused
  answer; **4W stops the story from impersonating evidence.** Pays 4V's reserved
  `narrative_claim_contest_deferred`.

## Core claim (frozen)

For a sealed Stage-4T Incident Capsule, a signed narrative bundle carries a free
prose body plus a declared **span map**. Every claim-bearing span is typed
`slot_bound` (recomputes against the capsule's sealed evidence), `judgment`
(binds by digest to a signed judgment record), or `unverified_prose` (carries
zero evidentiary weight and renders visibly as voice). A deterministic,
frozen-lexical **leakage gate** (`vsn.leakage.v1`) scans every _undeclared_ byte
region and fails closed (raw 170) on any claim-lookalike — digits, English
number words, percents, dates, quantifiers, or a collision with the capsule's own
projected values. A `slot_bound` span may cite only evidence the capsule already
sealed, and only through a matching projection (lens, not blender). The verifier
runs a frozen first-failure order 162→172 and, on acceptance, emits an
**evidence-density** triple (slot-bound / judgment / voice bytes) derived from
the verified span map — never author-filed. A reviewer who trusts neither party
can rerun the whole thing offline from pinned inputs.

## What shipped

- **Span-typed provenance + fail-closed leakage gate** — raw codes **162–172**
  (wrapper LAST at 172), all `RUN_LEVEL_BY_RAW` level 1, additive in the shared
  4H ledger. Span coordinates are byte-offset ranges over the canonical UTF-8
  body (NFC, LF-only, no trailing whitespace), non-overlapping, sorted,
  in-bounds, code-point-aligned, unique-id.
- **Contest payoff (the socket)** — a `slot_bound` span _is_ a projected section
  with an address, so 4V's frozen status table applies verbatim through a thin
  adapter that **imports** `deriveSectionStatus` from 4V (no cloned court, guarded
  by a source-grep test). Judgment spans → `DISPUTE_RECORDED`; prose spans →
  classification contest only ("presented as evidence while typed prose"), never
  recomputation. The 4V ledger line **`narrative_claim_contest_deferred` is
  marked PAID by 4W.**
- **Evidence density** — a sealed byte-accounting triple rendered in every
  audience view ("this report is N% evidence-bound, M% judgment, K% voice").
  Signed non-claim: density is descriptive, **not** a quality score — a 100%-voice
  condolence letter is legitimate.
- **Tiered views** — derived-never-filed audience renders with an
  un-downgradable type marker per span (the 4W **No Two Stories** invariant).
- **Three evidence lanes** — Lane A: 22-case byte-stable corpus (green + the full
  162–171 tamper matrix, the normalisation trio, the multi-byte `سیمرغ` geometry
  tripwire, the **Brigandi** fabricated-citation (167) / false-quotation (169)
  pair, and a density recount). Lane B: a genuine two-OS-process
  respondent-blind drafting ceremony (child fed only the public projection + its
  own ephemeral key over stdin; blindness negatives sealed; no ghostwriter). Lane
  C: a keyed, non-CI live-model drafting capture (+`--adversarial`), digest-only,
  both outcomes sealed honestly — a caught 169/170 is a successful verifier
  demonstration, not a failed stage.
- **Two-tier attestation + C2PA/in-toto bridge** — public tier = structure
  (signature, Merkle root, two-stage digest); audit tier rebuilds every Lane A
  fixture and asserts BOTH the sealed digest AND expected raw (the digest match
  catches a validly re-signed swapped pack — public-green, audit-red), re-verifies
  Lane B, and recomputes the density + bridge subject. The bridge emits an in-toto
  Statement v1 whose subject is the narrative-body digest — Content-Credentials
  tooling carries a VSN digest outward while VSN supplies the missing inner layer.
- **Parity** — Python public-tier core (`vsn_parity.py`) and a static browser
  verifier (`vsn-verifier.html`, CSP `default-src 'none'`, node:vm parity gate)
  reproduce the byte-geometry surface, including the 166 fingerprint (`keyDigest`
  hashes the raw PEM string — verified empirically, not a DER decode). Ed25519
  signature verification stays Node-authoritative (parity contract).
- **Five Lean theorems, zero sorry** — `noSmuggledClaim`, `spanDisjointness`,
  `voiceZeroWeight`, `lensNotBlender`, `contestAdapterFaithful` (Lean 4.15.0, no
  mathlib).

## Honest limitations (signed)

1. **Lexical, not semantic** — paraphrase smuggling ("almost nobody was
   affected") evades any lexical gate. Out of scope for 4W; named as the **4X**
   attack surface (`semantic_leakage_adversary_deferred`).
2. **Ruleset v1 is English-centric** — the multi-byte fixture proves byte
   geometry, not multilingual leakage coverage (`multilingual_ruleset_deferred`).
3. **Both Lane A/B parties built by us** — no independent adversarial drafter yet
   (restated from 4V; the 4X hook).
4. **Leakage lexicon is registry-bounded** — the gate catches what the frozen
   list names; we sign the bound.
5. **Lane C non-reproducibility** — live-model captures are not byte-reproducible
   without the provider key and model state; the digest check is not transcript
   reproduction.

## Reserved (signed) slots

`semantic_leakage_adversary_deferred` (the 4X socket, minted after
`narrative_claim_contest_deferred` is marked PAID), `multilingual_ruleset_deferred`,
`narrative_version_diff_deferred`, `transparency_report_profile_deferred`.

## Industry wedge (source-map claim, not a compliance claim)

Verified in the 2026-07-07 sweep. **Sources are as-reported by secondary
outlets at design time; before any figure is quoted as a pinned fact in a
public-facing artifact, pin the primary source or soften to "reported" — an
anti-fabrication stage must not carry a fuzzy citation.**

- **EU:** the AI Act applies generally from **2 August 2026** (Art-113). The
  Commission published draft Art-73 serious-incident guidance + a standard
  reporting template (consultation closed 2025-11-07) and a separate GPAI
  systemic-risk incident template — the surfaces 4T builds against; their prose
  sections are exactly what VSN types.
- **Courts are enforcing Law 1 by hand:** ~1,313 proceedings across 106 countries
  (Charlotin database, reported) involve AI-hallucinated material; an April 2026
  Oregon federal order (~$110K, reported) sanctioned fabricated citations and
  false quotations. Under VSN a fabricated citation is 167 and a false quotation
  is 169 — structurally unfileable.
- **KPMG withdrew a flagship agentic-AI report (2026-06-13, reported)** after
  organisations disputed its claims — "industrialized plausibility." Under VSN
  every disputed claim is a declared span with a contest address.
- **C2PA v2.3 (Feb 2026)** "records what was declared, not whether the declaration
  is true", and signs the file, never the sentences — precisely the seam the
  bridge rides.
- **NIST AI 800-4 (March 2026)** finds immature incident-data sharing and no
  standardized severity/root-cause methodology.

No matching prior pattern in our current source map makes individual
incident-report narrative spans recomputable and contest-addressable from sealed
evidence.

## Four-axis scorecard (design-time, re-scored at closeout)

> Design-time internal scorecard, not shipped evidence and not a
> literature-complete novelty claim.

| Axis                     | Score | Note                                                                                                                                                                                  |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                  | 9.4   | Span-typed provenance + fail-closed leakage gate + contest adapter + density projection — new verifier geometry, not a 3S port.                                                       |
| Frontier                 | 9.3   | First narrative surface in the chain + Lane C-adv; single-narrative, single-round.                                                                                                    |
| Lab/regulator usefulness | 9.5   | Art-73 template prose becomes typed in the 2026-08-02 window; the court doctrine + Brigandi/KPMG failures are this mechanism's shape; C2PA bridge rides an existing adoption channel. |
| Constitution             | 9.3   | Voice visibly marked as voice + honest density accounting = anti-deception infrastructure.                                                                                            |

## Reproduce

```bash
bash scripts/reproduce-llm-shield-stage4w.sh   # Node 26, offline, byte-stable
```

Builds on [Stage 4T VIC] and [Stage 4V VDP]; honors the read-only-kernel rule
(zero `src/llmShield` diff vs `v2.31.0-stage-4v-vdp`). Next: **4X — Novel-Attack
Discovery** (an independent adversarial drafter against the 4T/4V/4W chain).
