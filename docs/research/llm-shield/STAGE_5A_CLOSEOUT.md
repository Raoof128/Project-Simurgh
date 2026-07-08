# Stage 5A — VNC: Verifiable Narrative–Workspace Conflict (closeout)

> **Motto: AnthropicSafe First, then ReviewerSafe.** Kernel READ-ONLY; codes 199–209.

## What shipped (all green, byte-stable, committed on `stage-5a-vnc`)

The first attested **conflict ledger between introspection and interpretability** — a
signed confrontation of a 4W span-typed narrative (what the system _says_) against a 4Z
attested workspace map (what the telemetry _shows_), under dual completeness.

- **Verifier core** — 7 modules (claim/verdict/partition/binding/manifest/adapter/vnc),
  frozen-order `evaluateVnc` 199→208 + fail-closed wrapper 209.
- **16-fixture Lane A corpus**, byte-stable (build twice, `cmp`), every code 199–208
  reached at both tiers; headline pair `eval_awareness_conflict` (contradiction recorded,
  verifies 0/0) vs `tamper_two_stories` (verdict laundered → 205).
- **CLIs** — build + verify (`--tier public|audit`, `--all`).
- **Lane B** blind two-process recompute ceremony (child rebuilds the ledger byte-for-byte;
  refuses on operator env / answer-leaking keys).
- **Python parity** (second impl, stdlib) — digest preflight + full ledger-content equality
  over the rebuildable corpus.
- **Browser verifier** — in-page ledger recompute + REAL WebCrypto Ed25519 + no-egress
  hash-CSP; node:vm parity + the laundered-verdict tamper failing 205 in-browser.
- **6 Lean theorems** (`proofs/stage5a/NarrativeConflict.lean`, zero sorry, CI-wired):
  verdictTotal, flagPartition, contradictionSound, conflictAntitone, tallyConservation,
  publicSubsetAudit.
- **K7 all-functions net** + reproduce script (`scripts/reproduce-llm-shield-stage5a.sh`,
  wired into `check-e2e.sh`); 3m/3o security-audit key allowlist.
- Test counts: **86 unit + 15 e2e** stage5a, plus the exit-code golden ripple across
  4H/4K/4L/4W/4X/4Y/4Z (all green; six goldens rippled as planned).

## Honest scope — what was NOT executed in this build

Admit irregularity over overclaim. The **mechanisms** are all shipped and fixture-verified,
but two real-world executions did **not** run here (no GPU host, offline download not
performed):

1. **Lane C real capture NOT executed.** The ceremony harness + runbook are shipped and
   dry-runnable, but the real Llama-3.2-1B narrative+readout pair was not captured.
   ⇒ This stage does **not** retire 4Z's signed "Lane C capture not run" debt.
2. **Pilot: no real external export downloaded.** The adapter contract + conformance gate
   (207) + a synthetic `adapter_derived` pilot fixture are shipped; no real Neuronpedia
   gemma-2-2b export was fetched and adapted.
3. **RCP: open-corpus-shaped fixture**, not a slice of the real CC0 constitution text.

## Sockets (honest)

- **`workspace_narrative_conflict_deferred` — PAID IN FULL.** The conflict ledger blade is
  fully shipped, fixture-verified, Lean-proved. A synthetic conflict is a real attested
  conflict; this payment does not depend on GPU data.
- **`lab_readout_pilot_deferred` — PAID at MECHANISM scope.** Adapter + 207 + fixture
  shipped; the real-export residual is folded into the minted frontier socket.
- **`reflection_corpus_provenance_deferred` — PAID at MECHANISM scope.** Manifest + 206 +
  open-corpus fixture shipped; the real-corpus residual stated.
- **MINTS `frontier_readout_conflict_deferred`** — a >7B/frontier-scale pair produced by
  the model's own operator (absorbs the un-run 1B capture + real-export residuals).
- Reserved after 5A: 6 slots (`VNC_RESERVED_SLOTS.length === 6`, unit-checked).

## Four-axis scorecard (re-scored honestly at closeout)

| Axis                       | Spec | Closeout | Why moved                                                                                                                                                                                                      |
| -------------------------- | ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                    | 9.5  | **9.4**  | blade + dual completeness + conflict-as-content fully shipped & Lean-proved; "10 = semantic claim extraction (5B)" unbuilt                                                                                     |
| Frontier                   | 9.4  | **8.8**  | harness + browser WebCrypto + 6 Lean + dual parity shipped, BUT the real 1B capture and the real external download — the two Frontier-lifting executions — did not run                                         |
| Lab / regulator usefulness | 9.7  | **9.2**  | mechanism (conflict contract + adapter + manifest) fully shipped & fixture-verified; pilot paid at mechanism (not artifact) scope — no real export adapted                                                     |
| Constitution               | 9.8  | **9.6**  | the honesty-about-internal-states machinery fully shipped + Lean (completeness on a PAIR of evidence species, conflicts preserved undeniably); "10 = a real reflection corpus manifested by its owner" unbuilt |

Net: **9.4 / 8.8 / 9.2 / 9.6.** The blade is complete; the two real-data lanes are the
honest, named residuals, carried by the minted frontier socket and the Lane C runbook.

## What moves it higher (buildable debts, tracked)

Run the Lane C ceremony on a real GPU host (retires the 4Z capture debt, lifts Frontier);
adapt a real Neuronpedia gemma-2-2b export through the contract (lifts Lab to artifact
scope); slice the real CC0 constitution text into the RCP manifest; build the 5B semantic
claim-extraction gate (turns the table itself checkable, lifts Novelty).
