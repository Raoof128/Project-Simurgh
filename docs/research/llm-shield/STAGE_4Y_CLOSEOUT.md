# Stage 4Y — VDR (Verifiable Document Residue) Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.** Public-facing: provider-safe
first, then reviewer-safe.

- **Shipped:** 2026-07-08 on branch `stage-4y-vdr`. Target tag
  `v2.34.0-stage-4y-vdr`. Prev: v2.33.0-stage-4x-vlr (main 63a1ea45).
- **Laws:** **No Silent Region** (redaction is counted, not erased) · **Same
  Bytes, Same Map** · **The Map Is Not a Verdict.**
- **Banner:** 4X measured the gate's residue over a corpus _we_ authored. 4Y
  hands the instrument to the world: submit **any** UTF-8 document and get back
  a signed, byte-reproducible, **content-free structural residue map** — a total
  partition of every byte into `caught_v1` / `caught_v2_only` / `redacted` /
  `unflagged`, plus a metamorphic **shadow** slip-rate — without republishing a
  word of the document. No live-model lane, no evasion search.

## Core claim (frozen)

Given a UTF-8 document and a declared redaction manifest, VDR emits a **public
map** (offsets, lengths, region classes, aggregate counts, frozen digests, an
audit-reopenable salted commitment — never raw text, never per-span digests)
and a sealed **audit bundle** (byte digests, per-region shadow records). The map
is a **total partition**: region lengths sum to the document byte length (No
Silent Region), overlaps resolve by fixed precedence
`redacted > caught_v1 > caught_v2_only > unflagged`, and a redaction contributes
its full length to the sum. Caught regions are located by a **stage-4y span
extractor** over the frozen 4W/4X lexicons, bound to the unmodified 4W gate by a
machine-checked **gate-agreement invariant** (extractor-v1-nonempty ⟺
`scanLeakage` fires). Each caught region is replayed through all six frozen 4X
metamorphic transforms; slips are counted over **applicable** variants only.

## Two-tier verification (the load-bearing beam)

```text
public = structural arithmetic + signed commitments   → codes 181/182/184/185
audit  = byte recomputation + replay                  → codes 181–188
```

Public verification needs only the map + attestation (Ed25519 over
`canonicalJson(body)`, key digest over the raw public PEM, Merkle root over the
declared map/audit digests) — it recomputes `map_digest` from the map bytes and
reads `audit_digest` from the signed body, so **a withheld audit bundle still
verifies at public tier** (the `withheld_document` fixture proves it: a passing
public chain over a document whose bytes are not in the repo). The audit tier
re-runs the frozen gate over the document bytes (183), reconciles the
public/private segment sequences when a counterpart exists (186, absence is not
failure), replays the shadow (187), and rebuilds the whole map to compare via
`canonicalJson` (188). Raw codes **181–189**, wrapper `INTERNAL_FAIL_CLOSED_VDR`
LAST at 189.

## Shipped numbers (honest, recomputable)

Over the ten-fixture Lane A corpus: **18 caught regions, 34 applicable
metamorphic variants, 15 slip v1, 2 slip v2.** The v2 lexicon shrinks the slip
set (2 ≪ 15) but never closes it — the two irreducible v2 slips are the
document-level echo of 4X's signed semantic floor. Every number is recomputed
byte-for-byte by `verify --tier audit`, by the Lane B blind child, by the
Python second implementation, and in the browser.

## Evidence lanes

- **Lane A** — 10 shape-only fixtures (`fixture_documents_never_name_a_party`),
  byte-stable, prettier-ignored; the tamper fixture is SPLIT (`botched_marker_shaped`
  → 183, `reconciliation_mismatch_shaped` → 186) because 183 masks 186 in the
  ordered run.
- **Lane B** — blind two-process recompute: the child gets a parent-made temp
  copy + inputs, never the committed map; blindness negatives enforced
  statically and at runtime. Process-isolated, **not** implementation-independent.
- **Lane C** — intentionally absent (no live-model lane).
- **Browser** — `vdr-verifier.html`, the headline artifact: offline, hash-based
  CSP, **real in-page WebCrypto Ed25519** (a deliberate upgrade over 4X's
  Node-authoritative choice; unsupported-browser path shows an explicit
  unverified state, never a silent pass), vm-parity byte-equal to the JS map.
- **Parity** — `vdr_parity.py` (stdlib), digest preflight then full-map
  equality: same rules, same bytes, same map.
- **Lean** — `proofs/stage4y/DocumentResidue.lean`, six theorems (partition
  conservation, classify total, shadow-slip antitone, extractor-gate agreement +
  two locks), zero sorry.
- **Projections (zero new codes)** — `vdr_oscal_projection` (map → NIST OSCAL
  Assessment-Results observations) and the `map delta` over a version pair.

## Socket ledger

Pays `residue_over_submitted_narrative_deferred` (minted by 4X — this stage is
the payment record). Mints exactly one: `submitted_document_pilot_deferred` (a
real external party runs the verifier on a real document and publishes the map).
Reserved and open: `irreducible_semantic_residue_deferred`,
`multilingual_ruleset_deferred`, `narrative_version_diff_deferred` (4Y ships the
map-delta _groundwork_ but does NOT pay it — no diff attestation),
`transparency_report_profile_deferred`, `cross_gate_residue_benchmark_deferred`
(4Z).

## Wedge (pinned)

External review of frontier safety narratives exists today and cannot recompute
what it reads: Barrett et al. (arXiv 2604.21964) report of DeepMind's safety
case, verbatim — _"if the associated artifacts exist, we did not have access to
them, since they were not published along with GDM's paper"_; METR's May-2026
review of Anthropic's Feb-2026 Risk Report hand-caught a miscounted survey
response. The submitted-document failure cluster is live (Deloitte AU $290K,
Deloitte CA $1.6M, EY CA withdrawn 16/27, KPMG 40/45 fake, South Africa policy
withdrawn; 1,200+ court sanctions). The DOJ Epstein-files release (Dec 2025) is
Law 1's national-scale incident — "redactions" that were paint over live text.
Regulatory timing: the EU Commission's Art-73 serious-incident template applies
from **2 Aug 2026**. Prior-art seam: GPTZero (web + human, not
offline-recomputable), X-Ray (detects bad redactions, does not attest geometry),
Edact-Ray (the published redaction dictionary-attack the public/audit split
answers), OSCAL (structures evidence, does not make it recomputable — VDR emits
_into_ its format).

## Four-axis scorecard (re-scored post-evidence)

| Axis                     | Spec-time | Shipped | Why                                                                                                                                         |
| ------------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                  | 9.5       | **9.4** | Content-free structural residue map + redaction-as-region + OSCAL/delta projections landed; trimmed 0.1 for the seed corpus.                |
| Frontier                 | 9.4       | **9.3** | First signed deterministic instrument in a genre whose literature calls reproducibility "optional, fragmented"; honest seed-scale trim.     |
| Lab/regulator usefulness | 9.9       | **9.8** | METR×Anthropic review live today; enforcement 25 days out; WebCrypto browser + OSCAL. 10 stays behind `submitted_document_pilot`.           |
| Constitution             | 9.6       | **9.6** | Tiered honesty applied to our own publication practice; "counted, not erased" protects real victims; a public tier that refuses fake teeth. |

## Reproduce

```bash
bash scripts/reproduce-llm-shield-stage4y.sh   # Node 26, offline, byte-stable
```

## Gotchas (paid-for; mirrored into memory)

1. **Run the 4H digest-fixtures builder ONLY under Node 26.** Under Node 22 it
   re-signs ~20 stage-4h evidence files (crypto output differs), masquerading as
   a 4Y ripple; under Node 26 the additive codes ripple exactly the two
   `exit-map.json` files. (Caught pre-commit by diffing on a pristine tree.)
2. **The 4W gate is region-granular, not span-granular** — VDR needs its own
   match-granular extractor bound to the gate by a machine-checked agreement
   invariant. Assuming `scanLeakage` returns offsets would have collapsed every
   document to one region.
3. **4X's `computeSourceWitness` is hardcoded to the two 4W files** — reusing it
   could never catch a 4X code change. VDR writes its own witness over four
   files (`FOUR_WX_SOURCE_FILES`).
4. **Shadow unit is the caught REGION (sentence context), not a bare token** —
   the MRs are sentence-designed; token-level replay yields a hollow number.
5. **No single-text `checkV1/checkV2` exists** — call `scanLeakage(variant, [],
[])` with the variant as the whole body.
6. **Browser global-regex `.test()` is stateful** — reset `lastIndex` before
   each `firesV2` call, or `slips_v2` diverges from JS.
7. **`183` masks `186`** — the tamper fixture must be split so each reaches its
   target check first.
8. **CSP hash recompute after ANY browser edit**; base64 hashes contain `/` —
   inject via Node, not a `/`-delimited sed/perl.
