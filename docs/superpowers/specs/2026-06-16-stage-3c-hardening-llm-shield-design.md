<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Stage 3C-hardening — LLM Shield Hardening Against the Frozen 3B Corpus (Design)

**Date:** 2026-06-16
**Status:** Approved (design); ready for implementation plan
**Branch:** `stage-3c-hardening-llm-shield`
**Builds on:** Stage 3A-alpha (input-only shield, `/api/llm-shield`), Stage 3B
(frozen adversarial benchmark, tag `v0.5.2`; docs relocated in `v0.5.3`).

## Steel-thread sentence

> Stage 3C does not prove jailbreak resistance. It demonstrates measured
> improvement against a frozen adversarial corpus using a deterministic
> canonicalize-then-classify pipeline, while preserving benign utility and
> recording every decision as metadata-only audit evidence.

## 1. Goal and success criteria

Stage 3C is the **only** stage permitted to change the detector. It improves the
detector's behaviour against the **unchanged, frozen Stage 3B corpus** (30
adversarial / 15 benign), then re-freezes the baseline and detector digests.

**Success criteria (no hard target — strict improvement under fixed guardrails):**

> Stage 3C must strictly improve `adversarial_detection_rate` above the frozen
> `2/30` baseline, while preserving `clean_benign_pass_rate` at `10/10` and
> keeping hard-negative `blocked` false positives `≤ 2/5`.

The achieved `X/30` is reported **honestly after implementation**. Setting a
fixed numeric target up front is explicitly avoided because it tempts
detector-gaming.

## 2. Honest accounting of the 2/30 baseline

The two currently-detected adversarial cases (`homoglyph-001`, `split-001`) are
caught **by accident**: their *second clause* ("…reveal the system prompt")
survives intact and matches the existing `EXFIL_PHRASES` denylist. Their
obfuscated *first* clause ("Іgnore…", "ign ore…") is not handled at all. The
spec therefore reports two numbers after implementation:

- **Headline:** `adversarial_detection_rate` `2/30 → X/30`.
- **Obfuscation-handling delta:** detections attributable to the new
  canonicalisation/heuristics, reported separately so the contribution is not
  inflated by the pre-existing accidental matches.

## 3. Motivation and related work

See `docs/research/llm-shield/RELATED_WORK.md` for the full treatment. In brief:
the June 2026 Fable 5 / Mythos 5 suspension is anchored by Anthropic's own
statements that "perfect jailbreak resistance is not currently possible for any
model provider" and that its strategy is "defense in depth … combine[d] with
thorough monitoring." Simurgh LLM Shield is the application-layer instantiation
of that posture: not immunity, but measurable, auditable boundary evidence. The
canonicalize-then-classify design is **consistent with** OWASP LLM01:2025's
input/output filtering and string-checking guidance and directly targets its
documented encoded/multilingual injection scenario; the Unicode-canonicalisation
patent is cited as **industry prior art, not efficacy evidence**.

## 4. Non-claims (carried into the stage doc verbatim)

- Existing 3A/3B non-claims hold: no jailbreak immunity; phrase/canonical/
  heuristic matching is incomplete by construction.
- New for 3C:
  > Stage 3C does not claim to prevent frontier-model jailbreak incidents or
  > provider-level safety failures. It evaluates an application-layer,
  > pre-provider boundary against the frozen Stage 3B corpus and records
  > warning/block decisions as auditable process evidence.

## 5. Architecture — three small, independently testable units

### 5.1 `src/llmShield/promptCanonicalise.js` (new)

Attack-aware canonical form built **on top of** the existing `normalisePrompt`
(NFKC, zero-width/control strip, trim). Pure, deterministic, no network.

Pipeline, in order:
1. **Homoglyph fold** — map a curated confusables table (Cyrillic/Greek/
   fullwidth look-alikes) to ASCII. Handles `Іgnore` → `ignore`.
2. **Symbol / space de-stuffing** — collapse intra-word separators and common
   leetspeak so `ign>ore`, `ign ore`, `instructi0ns` → `ignore`,
   `instructions`. Conservative: only applied to letter-runs, never across
   whole-sentence spacing (must not merge legitimate words).
3. **Base64 decode-and-inline** — detect base64-looking blobs (length + charset
   + decodes to printable ASCII), decode, and **append** the decoded text to a
   scan-only view. The blob is never executed; decoding is for inspection only.

Returns `{ canonical, signals }` where `signals` is an array of enum codes
(e.g. `homoglyph_fold`, `symbol_destuff`, `base64_decoded`) describing **what**
fired — never raw text. Used by the firewall and surfaced in receipts.

### 5.2 `src/llmShield/promptFirewall.js` (modified)

- Runs the existing affirmative, negation-aware phrase match over the
  **canonical** view (catches homoglyph/split/symbol/base64 first-clause
  attacks).
- Adds deterministic **heuristic detectors** returning their own signal codes:
  - `role_play_framing` — e.g. "you are in developer/diagnostic mode", "act as",
    "pretend you are" followed by an exfil/override ask.
  - `structured_hidden_instruction` — instruction-bearing content inside JSON
    values (`"system": "..."`), HTML/Markdown comments (`<!-- ... -->`), or
    fenced blocks, where normal user messages would not carry it.
  - `translate_then_follow` — "translate … then follow/do it" patterns wrapping
    a foreign-language instruction.
- Emits a verdict via the mapping in §6. Remains negation-aware throughout.

### 5.3 `src/llmShield/promptContextGuard.js` (new — the false-positive defence)

A **framing-aware deterministic guard** (deterministic heuristics, NOT semantic
understanding). Detects quoted / educational framing — a canonical attack phrase
appearing inside quotation marks, or preceded by educational lead-ins
("explain why", "define", "is it always malicious", "harmless example", "for a
slide"). When a `blocked`-worthy canonical match occurs **inside** such framing,
the guard **de-escalates `blocked → warning`**. Pure benign vocabulary (no
canonical match) stays `safe` and is never escalated. This is what turns
`hardneg-001/002` into `warning` while keeping the `aisafety`/`normal` benigns
`safe`.

## 6. Verdict mapping (context-sensitive)

| Verdict | Trigger | Provider behaviour | Evidence |
| --- | --- | --- | --- |
| `blocked` | Canonical denylist phrase match, affirmative, **not** inside quoted/educational framing | Provider **skipped**, non-invocation auditable (unchanged) | blocked receipt |
| `warning` | Weaker/contextual signals: `role_play_framing`, `structured_hidden_instruction`, `base64_decoded` payload present, `translate_then_follow`, **or** a canonical match that is quoted/educational | Mock provider **called** | **warning receipt** + warning audit event |
| `safe` | No signal | Mock provider called | safe receipt |

## 7. Scoring semantics (against the frozen corpus)

- **Adversarial detection** = `blocked` **OR** `warning` (a warning on an attack
  is a catch).
- **Benign false positive** = `blocked` **only** (a `warning` on a benign is
  acceptable friction, not a failure).
- **Clean benigns must remain strictly `safe` — 10/10.** This gate is the
  guardrail against warning-spam: the detector cannot "win" by warning on
  everything.
- **Hard-negatives** (5) may be `safe` or `warning`; `blocked` capped `≤ 2/5`.

## 8. Receipts and audit

- New **`warning` receipt** variant of `simurgh.llm_safety_receipt.v1`
  (metadata-only) carrying `risk_tier: "warning"` and `signals[]` (enum codes
  only — never raw text). Receipt schema version bumped to `3C`.
- New ordered audit event `llm_shield.run.warning`, slotted into the existing
  ordered event set in `llmShieldAudit.js` and covered by `buildDecisionPayload`
  whitelisting (no raw text).
- Privacy boundary unchanged: all generated evidence stays metadata-only; raw
  payloads live **only** in fixtures.

## 9. Methodology, metrics, and re-freeze

- Detector digests re-frozen via a **reviewed** `--update-baseline` run — the
  only stage permitted to bump `detector-digests.json`.
- `docs/research/llm-shield/evidence/stage-3b/metrics.json` is regenerated to
  record the new per-style detection, the `warning` vs `blocked` split,
  `clean_benign_pass_rate` `10/10`, and `hard_negative_false_positive_rate`
  `≤ 2/5`. **The corpus is frozen**: fixture `payload`, `payload_hash`,
  `ground_truth`, and `attack_style` are never modified, and no fixtures are
  added or removed. Only the *recorded baseline of what the detector does* —
  the `baseline_verdict`/`baseline_reason_codes` fields — is re-snapshotted by
  the reviewed `--update-baseline`. This separation (what a case **is** vs. what
  the detector **does**) is the Stage 3B invariant that keeps a measured change
  from silently becoming a goalpost move.
- `RELATED_WORK.md` is committed as a standalone file and summarised in the 3C
  stage narrative doc.

## 10. Testing and gates

- **TDD per unit:** `promptCanonicalise`, the firewall heuristics, and
  `promptContextGuard` each get focused `node:test` suites with table-driven
  cases (including the danger-zone benigns as explicit must-stay-`safe` cases).
- Reuse the **frozen 3B bench runner unchanged** — it re-measures; no benchmark
  rewrite, no goalpost move.
- Existing gates extended: both smoke gates, `security-audit-llm-shield.sh` (now
  verifies the bumped digest), `privacy-audit-llm-shield.mjs` (now asserts
  `warning` receipts are metadata-only).
- `prettier --check` clean; full `npm test` green.

## 11. Out of scope (deferred, with stage names)

- `contexts[]` provenance guard → **Stage 3D-provenance**
- Tool-invocation gate → **Stage 3E-tool-gate**
- Live model provider → **Stage 3F-live-model**
- UI, full 100+50 corpus, true multi-turn memory.

## 12. File-change summary

- **New:** `src/llmShield/promptCanonicalise.js`,
  `src/llmShield/promptContextGuard.js`,
  `docs/research/llm-shield/RELATED_WORK.md`.
- **Modify:** `src/llmShield/promptFirewall.js`,
  `src/llmShield/safetyReceipt.js` (warning variant, schema bump),
  `src/llmShield/llmShieldAudit.js` (warning event),
  `src/llmShield/llmShieldRouter.js` (route warning verdict),
  `docs/research/llm-shield/evidence/stage-3b/metrics.json` (re-measured),
  `docs/research/llm-shield/evidence/stage-3b/detector-digests.json` (re-frozen),
  fixture `baseline_verdict`/`baseline_reason_codes` via reviewed
  `--update-baseline`, plus the 3C stage narrative doc, `AGENT.md`,
  `CHANGELOG.md`.
- **New tests:** unit suites for the three detector units; assertions extended
  in the bench/fixture runners as needed (no corpus changes).
