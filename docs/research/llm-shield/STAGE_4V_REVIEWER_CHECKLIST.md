# Stage 4V — VDP Reviewer Checklist

**One command:** `bash scripts/reproduce-llm-shield-stage4v.sh` (Node 26; no
network, no model, no key generation).

## What to check

- [ ] **Raw codes 151–161** additive in `stage4h/exitCodes.mjs`; the golden
      ripple (exit-map both copies, exitWrapper literal) is regenerated and the
      probe-hygiene guard passes.
- [ ] **Binding (153/154)** — the five-field tuple binds the exact sealed
      capsule; the contested-section-set digest is over sorted structured
      tuples (collision-safe).
- [ ] **Same Rules (155–158 + referenced-digest 156)** — the respondent census
      is checked by the operator's own `verifyCensus`, remapped; citing evidence
      outside the sealed census fails 156 before any map.
- [ ] **Frozen status table** — `agree` compares to the operator's value;
      dispute is self-consistent then geometry; `KIND_EVIDENCE_SOURCE` gate is
      executable.
- [ ] **Derived-never-filed** — a presented conflict map is only an expected
      value (160); the verifier recomputes.
- [ ] **Subpoena** — the `subpoena-capsule-tampered` fixture seals
      `capsule_reverify_result: 134` and refuses.
- [ ] **Mirror Test** — `mirror_contest_all_agreed` e2e gate + Lean
      `mirrorAllAgreed` both hold.
- [ ] **Status locality** — the locality pair proves a `DISPUTE_FAILED` at one
      section leaves the others byte-identical.
- [ ] **Lane B blindness** — the committed capture's blindness negatives are all
      `false`; component hashes recompute; contest raw 0.
- [ ] **Parity** — Python and browser cores match Node public-tier over the
      corpus (152/subpoena excluded, signed).
- [ ] **Read-only kernel** — `git diff v2.30.0-stage-4t-vic -- src/llmShield`
      empty; no `authorise_*` in stage4v; 4T/4S/4U dirs byte-frozen.
- [ ] **Lean** — five theorems, zero `sorry`.
- [ ] **Honesty** — 8 non-claims + 5 signed limitations present; the "6 of 22
      recomputation-contestable" finding is stated, not buried.

## Banned phrasings (must NOT appear)

"proves the respondent is right", "adjudicates fault", "legal due process",
"decides who wins" — 4V proves _where the parties provably conflict_, never who
is right.
