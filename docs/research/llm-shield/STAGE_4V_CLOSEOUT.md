# Stage 4V — VDP (Verifiable Due Process) Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.** Public-facing: provider-safe
first, then reviewer-safe.

- **Shipped:** 2026-07-07 on branch `stage-4v-vdp`. Target tag
  `v2.31.0-stage-4v-vdp`.
- **Laws:** **No Trial in Absentia** · **Same Rules for the Defence** ·
  **No Strawman.**
- **Banner:** the first regulator-rerunnable incident report the accused can
  answer in a rerunnable way. 4T gave the operator a voice bound by No Hearsay;
  4V gives the respondent the same voice, bound by the same recomputation
  discipline. Pays 4T's reserved `counter_capsule_contest_deferred`.

## Core claim (frozen)

For a sealed Stage-4T Incident Capsule, a signed counter-capsule that binds to
the exact capsule (root, attestation digest, schema version, signing-key
fingerprint, contested-section-set digest) may contest any contestable section
by one of three verbs: agree, dispute-by-recomputation, or dispute-as-judgment.
A dispute-by-recomputation carries the respondent's own Merkle-sealed evidence
census under the identical census laws that bind the operator, and recomputes
through the identical shared registry. The verifier derives — deterministically
and offline — a conflict map assigning each contested section exactly one of
five statuses; it never declares an overall winner. Filing a contest forces a
full re-verification of the contested capsule, and the sealed outcome envelope
records that result. A reviewer who trusts neither party can rerun the contest
end-to-end from pinned inputs.

## What shipped

- **Three-verb contest + five-status conflict map** (`AGREED`,
  `CONFLICT_PROVEN`, `ABSENCE_REBUTTED`, `DISPUTE_RECORDED`, `DISPUTE_FAILED`),
  derived — never filed. Status derivation is a frozen total function (verb ×
  class × recompute outcome → status): geometry over intent. The map also
  carries `uncontested_sections[]` (silence recorded as silence) and a binding
  echo (a map cannot be re-attached to a different capsule).
- **Absence rebuttal** — dispute-by-recomputation works against
  `not_derivable` / `requires_human_input` sections too: sealed respondent
  evidence that recomputes a value the operator said could not be derived is
  `ABSENCE_REBUTTED`. The respondent-side dual of 4T's suppression detection.
  Each one emits a `partition_rescore_signals[]` entry — a **review signal, not
  an automatic partition rewrite** (signed non-claim 8).
- **The anchor contest + `filed_at_beat`** — the first two-sided recomputable
  timeliness dispute, over the 4N public heartbeat, using the already-registered
  `stage4n_beat_index` kind. Both clocks (operator knowability, respondent
  filing) in one geometry; a failed self-anchor is ledgered, never voids the
  contest. No new codes, no new machinery.
- **No Strawman binding** — a five-field tuple committing to the exact sealed
  capsule; the contested-section-set digest is over a sorted, structured tuple
  list (collision-safe: `{a/b, c}` ≠ `{a, b/c}`).
- **Contest-as-subpoena** — the verifier's real output is a
  `contest_outcome` envelope sealing the forced 4T re-verification. If the
  capsule fails its own recomputation under contest, that failure is on the
  record **because the respondent filed**.
- **The Mirror Test** — `buildMirrorContest` transforms the capsule's own
  sections into a self-contest that MUST return all-`AGREED`. Enforced by the
  `mirror_contest_all_agreed` e2e hard gate AND the Lean theorem
  `mirrorAllAgreed`: symmetry proven by construction, no party-bias term.
- **`respondent_role`** (`provider | deployer | third_party | unspecified`),
  the Art-73 provider↔deployer pair made concrete; self-declared, guarded by
  the identity non-claim.
- Raw codes **151–161** (161 = fail-closed wrapper); frozen order
  pre(4T)→151→…→160. Read-only kernel: zero `src/llmShield` diff, no
  `authorise_*`; 4A–4U byte-frozen.

## Honest results

- **Lane A** — 19-case deterministic corpus, byte-stable under Node 26: honest
  five-status contest, mirror, subpoena, one fixture per raw 151–160, status
  matrix, and a locality pair. Every case reproduces its `expected_raw` AND a
  byte-identical outcome-envelope digest under the audit tier.
- **Contestability finding (published):** of the 22 pinned template sections,
  **6 are contestable by recomputation** (the `evidence_backed` sections, 3 per
  regime); the other 16 are contestable **only by signed judgment**
  (`dispute_as_judgment`) — 3 `not_derivable` + 13 `requires_human_input`.
  Absence rebuttal can reach a `not_derivable`/`requires_human_input` section
  only through a _registered_ recompute kind, and that bound is signed
  (`absence_rebuttal_registry_bounded`). The right of reply is machine-checkable
  where the evidence is machine-derivable, and honestly prose-only elsewhere.
- **Lane B** — a genuinely two-OS-process, respondent-blind ceremony: process 1
  runs the real 4S MCP hop and builds a fresh 4T capsule (ephemeral key);
  process 2 receives ONLY the sealed public artifacts, generates its own key,
  and files a counter-capsule (role `deployer`, 2 sections, contest raw 0). The
  committed capture records the respondent-blindness negatives
  (`env_has_operator_key_path: false`, `env_has_operator_state_path: false`,
  `argv_has_pem: false`) with harness-computed component hashes; verify-only.
- **Parity** — JS public-tier core reproduced in Python (stdlib) AND in a
  static single-file browser verifier (`node:vm` CLI-parity gate), both
  including full conflict-map derivation. Excludes raw 152 (Ed25519) — Node is
  the authoritative verifier for signatures (signed non-claim).
- **Lean** — five theorems, zero `sorry`, Lean 4.15.0: `noTrialInAbsentia`,
  `noStrawman`, `sameRulesForDefence`, `disputeLocality`, `mirrorAllAgreed`.

## Four-axis re-score (closeout)

| Axis                     | Pre | Closeout | Why                                                                                                                                                           |
| ------------------------ | --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty                  | 9.5 | **9.5**  | First machine-adjudicable contest path for incident reports; absence rebuttal + anchor contest have no matching prior pattern in the source-map.              |
| Frontier                 | 9.3 | **9.3**  | Recomputable disagreement + Mirror Test (party-symmetry by construction) + subpoena; single-round + registry-bounded keeps it honest.                         |
| Lab/regulator usefulness | 9.4 | **9.4**  | Due process is the missing half of the regulator wedge — a filed (or received) report becomes answerable, not just assertable; the Art-73 pair made concrete. |
| Constitution             | 9.4 | **9.4**  | Accountability + contestability made machine-checkable; the accused gets the same evidence law as the accuser.                                                |

## Reserved (signed) slots

`surrejoinder_round_deferred` (multi-round due process) ·
`narrative_claim_contest_deferred` (the declared **4W** socket) ·
`risk_report_contest_profile_deferred` (RSP-style risk-report dissent) ·
`fact_group_projection_deferred` (cross-regime fact aggregation).

## Signed non-claims / limitations

Non-claims (8): not an adjudication of truth/fault, not of legal fault, not a
finding the respondent is right, not a multi-round appeals process, not an
identity/authority verification of the respondent, python core does not verify
Ed25519, not a claim the incident was prevented, and partition rescore signals
do not revise the capsule. Limitations (5, signed into the attestation):
single round; respondent key provenance out-of-band; absence rebuttal
registry-bounded; both Lane A parties built by us (the **4X** hook); judgment
disputes recorded, never scored.

## Reviewer instructions (one command)

```
bash scripts/reproduce-llm-shield-stage4v.sh
```

Rebuilds the Lane A corpus + attestation byte-stably, verifies both attestation
tiers, runs the Python + browser parity gates, re-verifies the committed Lane B
capture, runs the K7 all-functions e2e net, and (if `lean` is on PATH)
type-checks the five theorems. No network, no model, no key generation.

## Gotchas recorded

- The `agree` verb compares the respondent's recompute to the OPERATOR's value
  (an "agreement that disagrees" is `DISPUTE_FAILED{recompute_failed}`), not to
  the claimed value — the spec's frozen table is authoritative.
- A raw-code 158 (census epoch) fixture must set ALL items to the foreign epoch
  and recompute the census root, or 157 (root) fires first.
- The refuse envelope seals only `{refused, raw}` (diagnostics stay out of the
  digest) so JS/Python/browser parity is robust.
- The 161 fail-closed path is reachable only past the signature gate: test it
  in public tier with a non-serialisable respondent artifact (a poisoned stage
  verifier is caught by 4T's `evaluateCapsuleSafe` → 150).
- `keyDigest` hashes the raw PEM, so the attestation digests the PUBLIC key on
  both build and verify sides.
