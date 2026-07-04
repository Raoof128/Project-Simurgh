# Stage 4N — Extraction Seismograph (Public Extraction-Telemetry Heartbeat)

> **Motto.** AnthropicSafe First, then ReviewerSafe.

## 0. Status

**Status:** Frozen design spec for Stage 4N (supersedes the 2026-07-04 draft; five review
defects fixed — see §18).

**Working name:** **Extraction Seismograph**.

**Stage slot:** 4N, after 4M / VXD (raw codes 47–54; 39 stays reserved, 40–42 stay 4L,
43–46 stay 4M).

**Scope decision:** **Extraction lane only for v0** — the 4K / 4L / 4M spine. The schema
reserves room for other exit families later; v0 does not generalise.

**Publication decision:** **In-repo append-only JSONL** as the reviewer-friendly public
feed, with the dual-root witness pattern on top (public heartbeat chain root + committed
private-evidence root per synthetic window).

**Cadence decision:** **Synthetic-time windows** for v0. Real wall-clock cadence is
declared in policy as a deployment parameter; CI uses deterministic synthetic windows
only.

---

## 1. One-sentence thesis

Every stage so far produces evidence shared bilaterally through 4M's P/A/R tiers. **4N
adds the missing public anchor: one hash-chained heartbeat record per reporting window —
its feed root signed by the stage manifest — published for everyone, where silence is
itself machine-detectable evidence.**

A seismograph does not tell you who moved. It proves the ground was being watched
continuously and that nobody rewrote the trace afterwards.

---

## 2. Why this stage exists

### Why

4K proves exposure-budget accounting for one consumer lane. 4L proves cluster-level
budget accounting so structuring across accounts fails. 4M proves disclosure claims can
be recomputed and contested.

But a provider can still try to launder extraction telemetry across **time**:

- delay the bad window;
- suppress a window (or suppress only its aggregate reveal);
- reorder windows;
- publish one story to the public and another to Tier-A / Tier-R recipients;
- claim "nothing happened" because no public artifact exists.

4N closes that gap.

### Spec

4N introduces **temporal completeness**:

> For every declared reporting window, exactly one public heartbeat record and (after the
> declared delay) exactly one public aggregate-reveal record must exist at their declared
> chain positions, and every 4M disclosure bundle for that window must carry an inclusion
> proof into that window's heartbeat.

### Done when

A verifier can detect, offline and deterministically as of a committed `as_of_window`:

- a missing heartbeat;
- a missing or early aggregate reveal;
- a reordered or duplicated window;
- a mutated record;
- equivocation between the public feed and any second artifact for the same window;
- a 4M bundle not inclusion-bound to the public pulse;
- a public reveal whose disclosure bits exceed the declared self-leakage budget;
- inclusion-proof material or raw counts leaking into public artifacts.

---

## 3. The big invention: temporal completeness

| Stage  | Completeness scope                                | What laundering it stops        |
| ------ | ------------------------------------------------- | ------------------------------- |
| 4K/EBA | Exposure events inside a consumer/window ledger   | Selective omission of exposures |
| 4L/CCB | Cluster assignments and cluster budget totals     | Structuring across accounts     |
| 4M/VXD | Disclosure claims against committed evolution     | Post-hoc disclosure rewriting   |
| **4N** | **Public heartbeat chain over reporting windows** | **Structuring across time**     |

### Falsifiable-first contribution

> 4N is a public, recomputable extraction-telemetry feed where a missing window is a
> detectable event, not a gap, and every bilateral disclosure is inclusion-proof-bound to
> the public pulse.

### Honest prior-art positioning

Do **not** claim "first transparency log" or "first silence-as-signal system." Position
against: **Certificate Transparency** (append-only ancestry / inclusion proofs),
**SCITT** (signed transparency statements over artifacts), **warrant canaries**
(silence as signal), and transparency logs generally (public anchoring /
non-equivocation).

Defensible delta:

> Budget-gated extraction telemetry, cross-tier non-equivocation, respondent semantics,
> and deterministic offline recomputation under a dishonest producer.

Short line: CT and SCITT prove statement history. 4N proves extraction-telemetry
liveness and cross-tier non-equivocation over the 4K/4L/4M containment-evidence spine.

---

## 4. Architecture overview

### Flow

```
4K exposure ledger
      ↓
4L cluster budget ledger
      ↓
4M disclosure / contest bundle
      ↓
4N public chain records (heartbeat + delayed aggregate reveal)
      ↓
single append-only JSONL public feed (one interleaved chain)
      ↓
offline verifier (feed, genesis policy, as_of_window [, second artifact]):
  - chain integrity + interleave order        (Q10)
  - temporal completeness / silence           (Q11)
  - cross-tier inclusion (bilateral input)    (Q12)
  - commit-now / reveal-later schedule        (Q13)
  - self-leakage budget                       (Q14)
  - cross-stage source roots                  (Q15)
  - public-surface disclosure scan            (Q16)
  - cross-artifact equivocation (2 inputs)    (Q17)
```

### Core objects

```
genesis-policy.json            (public, signed)
heartbeat-feed.jsonl           (public, append-only, ONE chain: heartbeats + reveals)
heartbeat-manifest.json        (public, signed root set)
stage4n-attestation.json       (public, signed; binds as_of_window)
stage4n-verifier-summary.json  (public, deterministic)
inclusion proofs               (BILATERAL ONLY — inside 4M Tier-P/A/R bundles, never in repo)
```

### Repo placement

```
tools/simurgh-attestation/stage4n/
tests/fixtures/llmShield/stage4n/
tests/unit/llmShield/stage4n/
tests/e2e/llmShield/stage4n/
docs/research/llm-shield/evidence/stage-4n/
docs/research/llm-shield/STAGE_4N_*.md
proofs/stage4n/
scripts/reproduce-llm-shield-stage4n.sh
```

---

## 5. Data model

### 5.0 The single interleaved chain (Fix 1)

The public feed is **one** append-only JSONL chain containing two record types,
`heartbeat` and `aggregate_reveal`. Every record carries `position` and
`prev_record_digest`; the chain covers both types, so **suppressing a reveal is exactly
as chain-detectable as suppressing a heartbeat**.

Signed records are never mutated. A heartbeat committed at window `W` is never touched
again; its aggregate reveal is a **separate record appended later**. The deterministic
interleave rule (from genesis policy, delay `d`):

```
at window k:  append heartbeat(k)
              then, if k − d ≥ genesis_window:  append aggregate_reveal(k − d)
```

The expected record sequence up to any `as_of_window` is therefore a pure function of
the genesis policy — no wall clock, no producer discretion.

### 5.1 `simurgh.seismograph.genesis_policy.v1`

```json
{
  "schema": "simurgh.seismograph.genesis_policy.v1",
  "stage": "4N",
  "chain_id": "stage4n-extraction-seismograph-v0",
  "scope": {
    "lane": "extraction",
    "source_stages": ["4K", "4L", "4M"],
    "reserved_exit_families": []
  },
  "publication": {
    "surface": "in_repo_jsonl",
    "feed_path": "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl",
    "append_only": true
  },
  "window_policy": {
    "clock": "synthetic",
    "cadence": "P1D",
    "genesis_window": "synthetic-0000",
    "max_overdue_heartbeats": 0
  },
  "reveal_policy": {
    "aggregate_reveal_delay_windows": 2,
    "freshest_oracle_non_claim": true
  },
  "band_policy": {
    "dimensions": {
      "breach_count": ["0", "1-5", ">5"],
      "consumer_count": ["0", "1-10", ">10"]
    },
    "band_vector_space_size": 9,
    "leakage_bits_per_reveal_max": 4
  },
  "non_claims": [
    "band_not_count",
    "quiet_trace_not_safe_model",
    "reporting_liveness_not_detection_guarantee",
    "synthetic_clock_not_deployment_sla",
    "equivocation_detection_requires_two_artifacts",
    "inclusion_proofs_are_bilateral_not_public"
  ],
  "crypto": {
    "canonicalization": "RFC8785_JCS",
    "digest": "SHA-256",
    "signature": "Ed25519"
  }
}
```

**Band policy invariants (Fix 2).** Every band dimension that may ever appear in a
public reveal is declared here. The leakage bound is computed **from the policy alone**:

```
band_vector_space_size   = Π |dimension values|          (v0: 3 × 3 = 9)
leakage_bits_upper_bound = ceil(log2(band_vector_space_size))   (v0: 4)
require: leakage_bits_upper_bound ≤ leakage_bits_per_reveal_max (v0: 4 ≤ 4 ✓)
```

The v0 clean fixture satisfies its own budget with equality. `cluster_count` is **not**
a v0 dimension (the draft's undeclared third dimension pushed the bound to 5 bits and
failed its own gate); adding any dimension later is a new policy version with a
recomputed bound.

### 5.2 `simurgh.seismograph.heartbeat.v1`

One public commitment record per window. **No `aggregate_reveal` field exists** (Fix 1 —
the draft's attach-later null field would have required mutating a signed, chained
record).

```json
{
  "schema": "simurgh.seismograph.heartbeat.v1",
  "record_type": "heartbeat",
  "stage": "4N",
  "chain_id": "stage4n-extraction-seismograph-v0",
  "window_id": "synthetic-0003",
  "position": 4,
  "prev_record_digest": "sha256:...",
  "commitments": {
    "stage4k_exposure_root": "sha256:...",
    "stage4l_cluster_budget_root": "sha256:...",
    "stage4m_disclosure_root": "sha256:...",
    "private_evidence_root": "sha256:..."
  },
  "reveal_commitment": {
    "committed_band_vector_digest": "sha256:...",
    "reveal_due_window": "synthetic-0005"
  },
  "non_claims": [
    "band_not_count",
    "quiet_trace_not_safe_model",
    "reporting_liveness_not_detection_guarantee"
  ]
}
```

`committed_band_vector_digest` commits to the exact band vector the later reveal must
match, salted with the reveal record's `reveal_salt` (a digest of the window's **private**
source counts — never `private_evidence_root`, which is public in the heartbeat and would
give zero hiding over a 9-element band space). At reveal, the verifier recomputes the
commitment from the disclosed bands + salt and requires byte-exact equality.

**Hiding is bounded, and we say so (known limitation
`reveal_commitment_binding_not_hiding_low_entropy_v0`).** The commitment is
unconditionally **binding** — the producer cannot change the bands after committing. It is
**not** a cryptographic privacy proof: `reveal_salt` is a deterministic function of
low-entropy private counts, so a party who can enumerate plausible counts could brute-force
the pre-reveal bands. The commit-now/reveal-later mechanism therefore buys **binding +
ordering + timing discipline** (you cannot rewrite history and the freshest window's value
is not handed out in the clear), **not** information-theoretic secrecy of the aggregate.
Random per-window salts would strengthen hiding but break byte-reproducibility; v0
deliberately chooses reproducibility and declares the trade.

### 5.3 `simurgh.seismograph.aggregate_reveal.v1`

A **chain record in the same feed** (Fix 1), appended at `reveal_due_window`, never
attached to the heartbeat:

```json
{
  "schema": "simurgh.seismograph.aggregate_reveal.v1",
  "record_type": "aggregate_reveal",
  "stage": "4N",
  "chain_id": "stage4n-extraction-seismograph-v0",
  "window_id": "synthetic-0003",
  "revealed_at_window": "synthetic-0005",
  "position": 9,
  "prev_record_digest": "sha256:...",
  "bands": {
    "breach_count": "1-5",
    "consumer_count": "1-10"
  },
  "reveal_salt": "sha256:...",
  "self_leakage": {
    "band_vector_space_size": 9,
    "leakage_bits_upper_bound": 4,
    "budget_bits": 4,
    "within_budget": true
  },
  "non_claims": [
    "band_not_count",
    "no_noise_byte_reproducible_coarsening",
    "freshest_oracle_value_not_revealed"
  ]
}
```

`self_leakage` is recomputed by the verifier from the genesis policy; the record's copy
is a convenience that must match (Fix 2 — the draft computed `ceil(log2(3)) = 2` over
dimension count instead of the vector space, and disclosed an undeclared band).

### 5.4 `simurgh.seismograph.inclusion_proof.v1` — **bilateral artifact** (Fix 5)

Inclusion proofs travel **inside** 4M Tier-P / Tier-A / Tier-R bundles and are verified
by the recipient _against_ the public feed. They are **never published in the repo**:
a public proof would tell any observer "a Tier-R (respondent-facing) disclosure existed
in window W" — audience-tier linkability, exactly the structural egress the dual-safety
rule exists to stop. The public feed carries roots only. Q16 scans public artifacts and
fails raw 54 if proof material, tier labels, or respondent digests appear.

```json
{
  "schema": "simurgh.seismograph.inclusion_proof.v1",
  "stage": "4N",
  "distribution": "bilateral_only",
  "window_id": "synthetic-0003",
  "heartbeat_digest": "sha256:...",
  "bundle_digest": "sha256:...",
  "bundle_tier": "Tier-A",
  "included_under": "stage4m_disclosure_root",
  "proof_path": ["sha256:...", "sha256:..."],
  "root": "sha256:..."
}
```

### 5.5 `stage4n-attestation.json` — the committed verdict (Fix 3)

The verifier verdict is a pure function of `(feed, genesis policy, as_of_window,
optional second artifact)`. **`as_of_window` is bound into the signed attestation**;
"overdue" is never derived from wall clock, so the same inputs give the same verdict on
any machine on any day. The attestation binds: genesis-policy digest, feed digest, chain
head digest, `as_of_window`, expected-vs-present record counts, source-stage roots, and
the verifier-summary digest.

**Overdue semantics.** As of `as_of_window = T`: heartbeat(w) is required for every
`w ≤ T` (`max_overdue_heartbeats: 0`); aggregate_reveal(w) is required for every
`w ≤ T − d` and is **pending, not overdue** for `T − d < w ≤ T`. Pending-within-delay is
the designed state, never a failure.

---

## 6. Verification gates

Pinned check order (a falsifier has exactly one legal answer):
**Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17.**

### Q10 — Chain + interleave integrity (raw 49)

For each record at chain index `i`: `prev_record_digest` matches `digest(record[i−1])`,
`position == i`, and `(record_type, window_id)` matches the deterministic interleave
sequence from §5.0. **Fail (49):** prev-digest mismatch; position skip or repeat;
duplicate `(record_type, window_id)`; interleave-order violation; window id outside the
genesis schedule.

### Q11 — Temporal completeness / silence (raw 47)

From the genesis policy and the committed `as_of_window`, compute the expected record
set (§5.5) and require exactly one record per expected slot. **Fail (47):** a required
heartbeat is absent. (A required-but-absent reveal is a schedule violation → Q13.)
CI uses synthetic time only; there is no wall-clock dependency anywhere in the verdict.

### Q15 — Cross-stage source roots (raw 50)

Recompute the 4K exposure root, 4L cluster-budget root, and 4M disclosure root from the
deterministic fixtures and compare with the heartbeat commitments; recompute
`private_evidence_root` from its children. **Fail (50):** any mismatch.

### Q13 — Commit-now, reveal-later schedule (raw 52; digest mismatch → 50)

Every reveal appears exactly at its heartbeat's `reveal_due_window`, and its band vector
re-derives the heartbeat's `committed_band_vector_digest`. **Fail (52):** reveal appears
before `reveal_due_window`; reveal absent when `window_id ≤ as_of_window − d`. **Fail
(50):** reveal bands do not match the committed digest. Missing required non-claims fail
closed at schema validation.

### Q14 — Self-leakage budget (raw 53)

Recompute `band_vector_space_size` and `leakage_bits_upper_bound` from the genesis
policy (never trusting the record's copy) and require
`leakage_bits_upper_bound ≤ leakage_bits_per_reveal_max`. **Fail (53):** bound exceeds
budget; a reveal discloses a dimension not declared in `band_policy.dimensions`; the
record's `self_leakage` copy disagrees with the recomputation.

### Q16 — Public-surface disclosure scan (raw 54)

Scan every public artifact (feed, manifest, attestation, summary, docs evidence dir).
**Fail (54):** raw counts instead of bands; inclusion-proof material
(`proof_path`, `bundle_tier`, respondent digests) in any public artifact; any per-cluster
or per-respondent field.

### Q12 — Cross-tier inclusion binding (raw 51; bilateral input)

Given a 4M bundle + its inclusion proof (supplied bilaterally by the holder): the bundle
digest proves under `included_under` to the heartbeat's committed root, the tier label is
one of Tier-P/A/R, and the referenced heartbeat digest exists in the public feed.
**Fail (51):** proof path invalid; unknown tier; referenced heartbeat absent from the
feed.

### Q17 — Cross-artifact equivocation (raw 48; requires two artifacts) (Fix 4)

**A single feed cannot show a fork** — inside one JSONL, "two roots for one window" is a
Q10 duplicate (49). Real equivocation (different stories to different audiences) is
detectable exactly when **two artifacts meet**: the public feed plus a second feed
snapshot, or the public feed plus a bilaterally received inclusion proof. **Fail (48):**
the same `(chain_id, window_id, record_type)` maps to two different digests across the
two inputs. This scoping is stated as a non-claim
(`equivocation_detection_requires_two_artifacts`) so the public claim never exceeds the
verifier.

---

## 7. Raw exit-code plan

4N takes raw **47–54**; 39 stays reserved/unmapped, 40–42 stay 4L, 43–46 stay 4M.
Verified against the shipped exit map (`unknown_raw_maps_to: 3`).

| Raw | Reason                                  | Run-level | Gate    |
| --: | --------------------------------------- | --------: | ------- |
|  47 | `heartbeat_missing`                     |         1 | Q11     |
|  48 | `heartbeat_equivocation`                |         1 | Q17     |
|  49 | `heartbeat_chain_order_invalid`         |         1 | Q10     |
|  50 | `heartbeat_commitment_mismatch`         |         1 | Q15/Q13 |
|  51 | `heartbeat_inclusion_proof_invalid`     |         1 | Q12     |
|  52 | `heartbeat_reveal_schedule_violation`   |         1 | Q13     |
|  53 | `heartbeat_reveal_budget_exceeded`      |         1 | Q14     |
|  54 | `heartbeat_public_disclosure_violation` |         1 | Q16     |

(Schedule violations — early **and** overdue reveals — share raw 52; the draft had no
overdue-reveal code at all. The public-disclosure scan folds the Fix-5 falsifier into
raw 54.)

Unchanged discipline: `0→0`, `19–27→1`, `28→2`, `29→3`, `30–38→1`, `39` unmapped
(→3), `40–46→1`, unknown→3.

**Gotcha budget:** adding 47–54 intentionally breaks the exit-map and snapshot goldens
touched by the 4H / 4K / 4L / 4M all-functions nets (five goldens last time). Refresh
them as a named task (N1), never as an incidental fix.

---

## 8. Falsifier matrix

Arms are `T*` (tamper) to avoid colliding with plan tasks `N*`.

| Arm | Mutation                                                | Expected raw | Why it matters                               |
| --- | ------------------------------------------------------- | -----------: | -------------------------------------------- |
| T0  | Clean chain at `as_of = synthetic-0006`                 |            0 | Anti-vacuity                                 |
| T1  | Drop heartbeat `synthetic-0002`                         |           47 | Silence is evidence                          |
| T2  | Second feed snapshot with different root for window 3   |           48 | Equivocation (two-artifact, Q17)             |
| T3  | Reorder records 2 and 3 / duplicate window in one feed  |           49 | Chain + interleave integrity                 |
| T4  | Mutate 4K root inside heartbeat                         |           50 | Source-stage commitment binding              |
| T5  | Bilateral 4M proof points to absent heartbeat           |           51 | Cross-tier binding                           |
| T6  | Reveal for window 3 appended at window 3 (early)        |           52 | Freshest-oracle suppression                  |
| T7  | Drop the reveal for a window ≤ `as_of − d` (overdue)    |           52 | Reveal suppression is not laundering         |
| T8  | Reveal bands differ from `committed_band_vector_digest` |           50 | Commit/reveal byte binding                   |
| T9  | Reveal discloses undeclared `cluster_count` dimension   |           53 | Self-leakage budget                          |
| T10 | Publish raw count `breach_count: 7`                     |           54 | Band-not-count privacy invariant             |
| T11 | Inclusion-proof material placed in a public artifact    |           54 | Bilateral-only linkability guard (Fix 5)     |
| T12 | Unknown raw code (e.g. 99) through the exit wrapper     |  run-level 3 | Fail-closed guard (`unknown_raw_maps_to: 3`) |
| T13 | Delete derivation/proof path; verdict unchanged         |    must fail | Anti-theatre                                 |

(T12 fixes the draft's N9 nit: the expectation is **run-level 3 via the exit wrapper**,
not raw 29.)

---

## 9. K7-style all-functions E2E net

Ships with the stage, mandatory before tag. The net executes:

```
build genesis policy → build source-stage fixture roots → build interleaved feed
verify clean feed at committed as_of_window
run every T1–T13 arm; assert exact raw code AND run-level
run exit-wrapper map over 47–54 + unknown
run reproduce script twice; assert byte-idempotency (no diff on second run)
assert docs artifact list matches actual repo outputs
assert cross-stage invariants: heartbeat roots == recomputed 4K/4L/4M fixture roots
```

**Done when:** clean E2E exits 0; every falsifier hits its exact code; no falsifier
crashes; no false green; all deterministic evidence is byte-identical on the second
reproduce.

---

## 10. Lean proof lane

**Lemma 1 — Omitted committed record is detectable** (`proofs/stage4n/TemporalCompleteness.lean`):
given a deterministic successor function over the interleaved `(record_type, window)`
sequence and a chain committing predecessor digest + position, any chain omitting an
expected record has a position or successor discontinuity. Covers reveals as well as
heartbeats, because both are chain records (§5.0).

**Lemma 2 — Delayed reveal preserves deterministic recomputation** (stretch;
`proofs/stage4n/DelayedReveal.lean`): if bands are deterministic functions of private
evidence roots and the delay is policy-fixed, delay changes publication position, not
recomputation result.

**Done when:** Lemma 1 type-checks in CI (controlled, documented skip if Lean is
unavailable, consistent with the shipped `proofs/` core).

---

## 11. Reviewer-facing reproduce command

```bash
bash scripts/reproduce-llm-shield-stage4n.sh
```

Output shape: build fixtures → verify clean feed → temporal-completeness falsifiers →
inclusion/equivocation falsifiers → schedule falsifiers → budget/disclosure falsifiers →
byte-idempotency → `ALL GREEN`. Explicit `*.test.js` globs; no bare directory test
discovery; no network; no wall clock.

---

## 12. Implementation plan

| Task | Deliverable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Done when                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| N1   | Raw 47–54 in the shared stage-4 exit map; named golden refresh (4H exit-map, 4K/4H exitWrapper snapshots, 4L e2e net, 4M goldens)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Exit-map tests pass; goldens intentionally updated; unknown→3 preserved                                                  |
| N2   | `genesisPolicy.mjs`: policy schema, synthetic window successor/parser, interleave sequence function (§5.0), band-space/leakage computation (§5.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Expected record set derived deterministically; malformed policy fails closed; leakage bound recomputed from policy alone |
| N3   | Heartbeat + reveal canonical cores: exact top-level keys, unknown-field rejection, required non-claims, `committed_band_vector_digest` derivation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Clean records validate; unknown-field/missing-non-claim fixtures fail closed                                             |
| N4   | Append-only interleaved JSONL feed builder; position/prev-digest computed, never caller-supplied; fixtures under `tests/fixtures/llmShield/stage4n/` + `.prettierignore`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Feed byte-stable; second build produces no diff                                                                          |
| N5   | Q10 + Q11 verifier (chain, interleave, silence) with committed `as_of_window`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | T1/T3 hit raw 47/49 exactly; pending-within-delay is not a failure                                                       |
| N6   | Q15 source-root binding (recompute 4K/4L/4M fixture roots + `private_evidence_root`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | T4 hits raw 50; clean binding passes                                                                                     |
| N7   | Q12 bilateral inclusion-proof verification (proof supplied as verifier input, never read from repo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | T5 hits raw 51; valid P/A/R proofs pass                                                                                  |
| N8   | Q13 schedule + commit/reveal binding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | T6/T7 hit raw 52; T8 hits raw 50                                                                                         |
| N9   | Q14 self-leakage budget (recompute, compare, reject undeclared dimensions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | T9 hits raw 53; clean fixture passes at 4 ≤ 4                                                                            |
| N10  | Q16 public-surface scan + Q17 two-artifact equivocation check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | T10/T11 hit raw 54; T2 hits raw 48                                                                                       |
| N11  | `stage4n-attestation.json` + signed manifest (binds `as_of_window`, policy/feed/head digests, roots, summary digest); stage4n Ed25519 key; 4D/4H crypto discipline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Manifest verifies offline; key-substitution falsifier fails                                                              |
| N12  | K7-style all-functions E2E net (§9), incl. T13 anti-theatre                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | All arms exact; no crashes; no false green                                                                               |
| N13  | `scripts/reproduce-llm-shield-stage4n.sh` + byte-idempotency                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Exits 0; second run leaves tree clean; `ALL GREEN`                                                                       |
| N14  | Lean Lemma 1 (+ Lemma 2 stretch)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Type-checks in CI or controlled documented skip                                                                          |
| N15  | Reviewer docs (`STAGE_4N_THREAT_MODEL.md`, `STAGE_4N_VALIDATION_MATRIX.md`, `STAGE_4N_REVIEWER_CHECKLIST.md`, `STAGE_4N_CLOSEOUT.md`) + final docs-accuracy pass: grep raw codes + schema names, artifact list vs repo outputs, no raw counts public, no unscoped "safe model" language, prior-art section honest. Includes (a) a docs-only **GPAI Commitment-9 / Article-73 projection note** mapping heartbeat cadence and `max_overdue_heartbeats` onto the EU severity-based 2/5/10/15-day initial-report deadlines (template published 2025-11-04; guidance applies 2026-08-02), carrying `not_legal_compliance_certification` verbatim, same discipline as 4M's Article-73 projection; and (b) a related-work paragraph positioning against the Oxford NeurIPS position paper on reproducibility standards for frontier AI safety claims (arXiv:2605.08192 — "evidential inversion", tiered public/controlled/claim-restricted disclosure), which independently argues for the P/A/R-plus-public-anchor structure that 4M+4N implement | Plan, docs, fixtures, tests, and reproduce output agree; release notes need no hidden caveats                            |

---

## 13. Threat model

**Adversary:** a dishonest producer or compromised reporting pipeline that may omit a
bad window or its reveal, reorder windows, fork the public feed for different audiences,
mutate a source-stage commitment, hold bilateral 4M bundles unanchored to the public
pulse, leak overly precise public aggregates to build an attacker oracle, publish
linkable tier/respondent material, or claim silence means safety.

**Trusted base:** the verifier binary run by the reviewer; the pinned signing key;
deterministic canonicalisation; the genesis policy; the public JSONL feed; the
source-stage deterministic fixtures (v0).

**Out of scope:** real-world truth of provider telemetry; Sybil closure (inherits 4L's
provider-supplied cluster-commitment assumption); legal compliance; detection
completeness; preventing extraction; preventing a provider from refusing to publish at
all — 4N only makes refusal and silence visible; adjudicating respondent contests —
4N anchors the evidence path.

---

## 14. Non-claims (verbatim in docs and release notes)

- **The heartbeat proves reporting liveness and non-equivocation; it does not prove
  extraction did not happen.**
- **A quiet trace is not a safe model.**
- **4N enforces declared telemetry, not detection truth.**
- **Bands are not counts.**
- **Synthetic-time cadence is a reproducibility mechanism, not a deployment SLA.**
- **The public feed is a bounded disclosure channel, not a full incident report.**
- **Equivocation detection requires two artifacts; a single feed proves its own
  integrity, not the absence of a fork elsewhere.**
- **Inclusion proofs are bilateral artifacts; nothing in the public feed identifies
  tiers, respondents, or clusters.**
- **4N does not solve Sybil attacks; it inherits 4L's provider-supplied
  cluster-commitment assumption.**
- **4N does not adjudicate respondent contests; it anchors the evidence path.**
- **No raw prompts, outputs, user identities, cluster identities, or per-cluster data
  appear in any public artifact.**

---

## 15. Reviewer-safe pitch

> 4N turns Simurgh's extraction evidence from bilateral disclosure into public liveness.
> One hash-chained record per window, with the feed root signed by the stage manifest,
> proves the telemetry chain was alive, ordered, and
> non-equivocal; missing windows — and missing reveals — become detectable events. Every
> 4M disclosure bundle is inclusion-bound to the public pulse, and the public channel is
> itself budget-gated, so the seismograph never becomes an unbounded attacker oracle.

Blunt version: **a provider can still choose silence. 4N makes silence visible.**

---

## 16. Release gate

Do not tag 4N until all of this is true: `npm test` green; stage 4N unit tests green;
E2E net green; `bash scripts/reproduce-llm-shield-stage4n.sh` exits 0 and is
byte-idempotent; tree clean after reproduce; no raw counts, tier labels, respondent
digests, or proof material in public artifacts; bilateral P/A/R inclusion-proof fixtures
pass; every T-arm fails at its exact raw code and run-level; Lean temporal-completeness
proof type-checks (or controlled documented skip); docs-accuracy pass complete; release
notes use the honesty lines and avoid "first transparency log" wording.

---

## 17. Canonical implementation slogan

4K stops omitted exposures. 4L stops split-account structuring. 4M stops rewritten
disclosure. **4N stops time laundering.**

The seismograph does not say the earth is safe. It proves the needle was there.

---

## 18. Changes from the 2026-07-04 draft (review fixes)

1. **Reveal-attachment contradiction removed.** `aggregate_reveal` no longer exists as a
   heartbeat field; reveals are separate chain records in one interleaved append-only
   feed (§5.0/§5.2/§5.3), so no signed record is ever mutated and reveal suppression is
   chain-detectable.
2. **Leakage math reconciled.** Bound computed over the band **vector space** from the
   policy alone; `cluster_count` dropped from v0 (undeclared and budget-breaking in the
   draft); clean fixture satisfies 4 ≤ 4 (§5.1, Q14).
3. **Deterministic overdue.** `as_of_window` is bound into the signed attestation; the
   verdict is a pure function of committed inputs; pending-within-delay is distinguished
   from overdue (§5.5, Q11, Q13).
4. **Fork-detection scoped honestly.** Single-feed duplicates are Q10 (raw 49);
   equivocation is an explicit two-artifact check Q17 (raw 48) with a matching non-claim
   (§6).
5. **Inclusion proofs bilateral-only.** Public feed carries roots only; Q16 (raw 54)
   fails any public artifact containing proof material, tier labels, or respondent
   digests; falsifier T11 added (§5.4, Q16).
   Nits: T12 expectation corrected to run-level 3 via the exit wrapper; gate check order
   pinned (§6).
