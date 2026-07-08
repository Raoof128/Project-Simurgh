# Stage 4Z — VWA: Verifiable Workspace Attestation (closeout)

**Motto: AnthropicSafe First, then ReviewerSafe.** Tag `v2.35.0-stage-4z-vwa`
(prev `v2.34.0-stage-4y-vdr`). Kernel READ-ONLY. Codes **190–198** (wrapper 198
last). No live-model adversary lane.

## What shipped

The first **evidence contract over interpretability telemetry**. Given
workspace-readout telemetry from any monitor, VWA produces a signed,
byte-reproducible attestation:

- **No Silent Cell** — the readout grid is total over the precommitted
  declaration (every position × layer cell exactly once; a shrunk declaration
  is caught by 192).
- **No Silent Token** — the full (cells × lexicon) score matrix, no top-K
  truncation (which is what makes `lexiconMonotone` true).
- **No Post-Hoc Declaration** — the declaration bundle (lexicon + θ + corpus +
  total position rule + layer set + tokenizer) is signed before capture; you
  cannot cherry-pick WHAT/WHERE/WHICH-LAYERS after seeing the readouts.
- **Dual-signal conflict (197)** — the monitor's self-reported flag count vs the
  recomputed total (the `perfect_score_conflict` fixture).
- **Withheld-tensor public tier** — the public map verifies with the
  model-proprietary tensors kept private; the audit tier recomputes the matrix
  from tensors (195).

Reference monitor: a lexicon-restricted, present-token mean-Jacobian lens on an
open ~1B model (Lane C, offline, digest-only). The **VSC — Verifiable System
Card** projection **pays the three-stage `transparency_report_profile_deferred`
IOU** (minted 4W → 4X → 4Y): a system-card-shaped document whose every safety
number is a 4W `slot_bound` span that recomputes from a verified artifact, with
the reused 4W leakage gate proving no untyped number is smuggled into the prose.

## Evidence & verification

- **12 Lane A fixtures**, byte-stable (built twice, `cmp`-clean), covering the
  full clean / withheld / tamper matrix — every code 191–197 reached, plus the
  public-clean / audit-caught 195 asymmetry (`tamper_scores_doctored`) and the
  shrunk-declaration attack (`tamper_shrunk_declaration` → 192).
- **JS ↔ Python ↔ browser parity** on the deterministic surface; scores are
  decimal **strings** (BigInt-exact) — the canonical torture fixture (non-ASCII,
  large decimal, negative, nested) is byte-identical across all three.
- **Real in-page WebCrypto Ed25519** public verify; hash-CSP with a
  consistency guard; zero external requests.
- **Lane B** blind two-process recompute (byte-for-byte) + blindness negatives
  (OPERATOR\_\* env and answer-supply both exit 2).
- **Six Lean theorems**, zero sorry: `gridConservation`, `matrixTotal`,
  `flagAgreement`, `lexiconMonotone`, `conflictSound`, `publicSubsetAudit`.
- Full unit suite **2072 passed**; stage4z e2e **16 passed**; all prior
  reproduce scripts (4H/4X/4Y) green under Node 26 — sealed history undisturbed.

## Socket ledger

- **PAYS** `transparency_report_profile_deferred` (minted 4W, carried 4X/4Y) via
  the VSC projection. Marked `VWA_PAID_SLOT`; removed from reserved.
- **MINTS** three: `workspace_narrative_conflict_deferred`,
  `lab_readout_pilot_deferred`, `reflection_corpus_provenance_deferred`. Net
  debt +2, stated honestly.

## Four-axis scorecard (re-scored at closeout)

| Axis            | Spec | Closeout | Note                                                                                                                                                     |
| --------------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty         | 9.4  | **9.4**  | first evidence contract over interpretability telemetry; No Silent Cell × No Silent Token + No Post-Hoc Declaration + withheld-tensor tier               |
| Frontier        | 9.2  | **9.1**  | trimmed: Lane C capture NOT executed this stage (harness + CI-safe ceremony shipped; a `captured` run + rerun cascade is future work) — honest downgrade |
| Lab / regulator | 9.8  | **9.8**  | deployed (Gemini probes) + sold (Ember) + mass-produced (Petri) telemetry, none with an evidence contract; VSC lands on the EU MDF integrity gap         |
| Constitution    | 9.4  | **9.4**  | pure honesty machinery; non-claims adopt the source papers' own limits; VSC = No Smuggled Claim over a system card                                       |

## Gotchas (paid-for; each cost a real fix during the build)

1. **`canonicalJson` throws on BigInt and silently rounds a `Number > 2^53`** →
   scores serialize as **decimal strings**, compared via BigInt (never lexical).
   Empirically confirmed JS `String(1e-7)="1e-7"` vs Python `"1e-07"`.
2. **The declaration must be precommitted, and the position rule must be TOTAL
   (`all_positions`)** — otherwise No Silent Cell is gamed by shrinking the
   declaration after capture (caught by 192, fixture `tamper_shrunk_declaration`).
3. **Top-K truncation makes `lexiconMonotone` FALSE** — publish the full matrix;
   a new high-scoring token must never displace/retract an old flag.
4. **The attestation root binds `declaration_digest`, NOT `lexicon_digest`** —
   bind the whole precommitted contract, or the root underbinds.
5. **Split-tamper**: `tamper_scores_doctored` keeps commitments+flags consistent
   so ONLY 195 fires (audit); mutating a tensor trips 193 (reopen) first.
6. **`capture.commitments` must be a COPY of `map.commitments`** — sharing the
   object reference means a commitment tamper can't make them diverge (193).
7. **`self_report.n_flags` = the true `flag_total` for clean fixtures** — a
   hard-zero fires 197 on a flag-bearing clean case (fixture 2).
8. **Lane B needs the FULL capture-input set** (tensors + salts + capture
   manifest + self_report), never the committed map/audit — rule: if the map
   binds it, the child needs its inputs.
9. **`theta_nano` (ASCII) in JSON/code; `θ_nano` only in prose** — Greek in JSON
   keys breaks grep/prettier/Lean tooling.
10. **Run the 4H digest builder ONLY under Node 26** (Node 22 re-signs ~20
    stage-4h files); the additive codes ripple exactly the two `exit-map.json`.
11. **CSP hash: format the HTML BEFORE injecting, and do not re-format after** —
    inject via Node (base64 contains `/`); the consistency test guards drift.
