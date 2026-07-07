# Stage 4V — VDP: Verifiable Due Process (Counter-Capsule Contest)

**MOTTO: AnthropicSafe First, then ReviewerSafe.** (Standing project
convention since Stage 4M: "safe for the lab audience in content AND structural
egress, then recomputable by any reviewer" — a design-order tie-break, not an
endorsement claim. Public-facing surfaces carry the provider-agnostic gloss:
"provider-safe first, then reviewer-safe.")

- **Date:** 2026-07-07
- **Laws:** **No Trial in Absentia** · **Same Rules for the Defence** ·
  **No Strawman.**
- **Definition (frozen, public wording):** Verifiable Due Process means the
  incident capsule is answerable through the same recomputation discipline
  that produced it. It is **technical due-process contestability**, not an
  adjudication of legal fault.
- **Banner:** the first regulator-rerunnable incident report **the accused can
  answer in a rerunnable way**. 4T gave the operator a voice bound by No
  Hearsay; 4V gives the respondent the same voice, bound by the same
  discipline. Pays 4T's reserved `counter_capsule_contest_deferred` (and its
  4M respondent-path / 4P contest-path ancestors).
- **Arc (declared here, designed to compose):** **4V Contest → 4W
  Verified-Slot Narrative → 4X Novel-Attack Discovery.** 4V's schema reserves
  the socket 4W plugs into (`narrative_claim_contest_deferred`); 4X red-teams
  the grown verifier surface (capsule + contest + narrative), paying 4U's
  signed "regression-resistance NOT novel-attack discovery" limitation at the
  moment it is most meaningful.
- **Branch:** `stage-4v-vdp` · **Target tag:** `v2.31.0-stage-4v-vdp`
  (plan verifies against `git tag --sort=-creatordate` before versioning —
  standing 4J gotcha).
- **Raw codes:** 151–161, headroom reserved to 170 (additive in
  `tools/simurgh-attestation/stage4h/exitCodes.mjs`; probe hygiene is
  permanent — `UNKNOWN_RAW_PROBE=999` + `exitCodeProbeHygiene.test.js` — and
  the golden ripple is expected and enumerated in §8).
- **Kernel posture:** **no new Capability Kernel entry.** 4V is an
  evidence-contest layer; the frozen `authorise_*` families and 4A–4U
  artifacts are untouched (differential-equivalence holds trivially).

**Core claim (verbatim, frozen):**

> For a sealed Stage-4T Incident Capsule, a signed counter-capsule that binds
> to the exact capsule (root, attestation digest, schema version, signing-key
> fingerprint, contested-section-set digest) may contest any contestable
> projected section by one of three verbs: agree, dispute-by-recomputation, or
> dispute-as-judgment. A dispute-by-recomputation must carry the respondent's
> own Merkle-sealed evidence census under the identical census laws that bind
> the operator, and must recompute through the identical shared recompute
> registry. The verifier derives — deterministically and offline — a conflict
> map assigning each contested section exactly one of five statuses; it never
> declares an overall winner. A counter-capsule that fails binding, signature,
> schema, census, or payload discipline produces an offline-verifiable
> raw-code failure and no conflict map. A reviewer who trusts neither party
> can rerun the contest end-to-end from pinned inputs.

**The three laws of 4V** (each maps to a code cluster, 4S/4T-style):

1. **No Trial in Absentia** — a VIC capsule is contestable by construction:
   the counter-capsule format, binding rule, and verifier are published with
   the capsule format itself. Answerability is a verified property, not a
   policy promise. (Lean: `noTrialInAbsentia`; structurally, codes 151/154
   police the contest's form, never its existence.)
2. **Same Rules for the Defence** — the respondent is bound by the operator's
   own discipline: a dispute-by-recomputation carries its own Merkle-sealed
   census (identical 4T census laws) and must actually recompute through the
   shared registry. A defence that does not recompute **fails and is
   ledgered** — the lie detector cuts both ways. Codes 155/156/157/158; the
   per-section `DISPUTE_FAILED{recompute_failed}` status.
3. **No Strawman** — the counter-capsule binds cryptographically to the exact
   sealed capsule it contests. You cannot dispute a capsule that was never
   filed, a superseded version, or a redacted view — only the sealed thing
   itself. Codes 153/154.

---

## 0. Why this stage — due process is the missing half of the wedge

4T shipped the wedge artifact: a serious-incident report a regulator can
rerun. But a report that cannot be answered is one voice with a lab coat on.
Every governance surface the receipt spine now touches — Commission incident
templates, insurer views, public timelines — assumes a **respondent** exists:
the party named in, blamed by, or bound to the incident. Today that party's
options are prose (a press release, a legal filing, a "we disagree" letter) —
hearsay, exactly the thing 4T forbids the operator.

The 2024–2026 contestability literature names this gap explicitly:
contestable-AI research calls for "arenas for adversarial debate between
decision subjects and system operators" but concedes that existing work
"does not translate into actionable dispute processes," with "no consensus on
the dimensions of contestability, no quantitative metrics" (see §13 for the
pinned source map). The EU Art-73/Art-55 templates have **no dispute path at
all** — the regulator receives one story and has no machine-checkable way to
receive a second one about the same sealed evidence.

The July-2026 field sharpens this three ways (web sweep 2026-07-07; URLs
re-pinned at plan time):

- **The regulation forces the pair and abandons the disagreement.** Art-73
  obliges a deployer who identifies a serious incident to inform the provider
  immediately (guidance: within 24 hours) and the provider to file within 15
  days — but defines **no mechanism for resolving provider–deployer
  disagreement** about the incident
  (https://www.taylorwessing.com/en/insights-and-events/insights/2025/10/eu-ai-act-deep-dive,
  https://artificialintelligenceact.eu/article/73/). The disagreement is
  structurally inevitable and structurally unresolved — and the Act applies
  from 2 August 2026.
- **No Empty Chair.** California AB 316 (effective 2026-01-01) prohibits a
  party who "developed, modified, or used" an AI system from asserting the AI
  autonomously caused the harm
  (https://btlj.org/2026/06/multi-agent-ai-is-outpacing-the-liability-frameworks-built-for-single-agent-systems/).
  Nobody may blame the model; the parties must answer **each other** — and no
  recomputable way to do that exists.
- **The incident-report ecosystem has no respondent channel.** OECD AIM does
  not accept open submissions; AIID/AIAAIC run on media coverage, "lacking
  robust mechanisms for technical input"
  (https://oecd.ai/en/incidents-methodology, https://arxiv.org/pdf/2501.14778).
  A company named in an incident entry has no evidence-grade reply anywhere.

4V's answer: **machine-checkable right of reply.** The respondent answers in
the same recomputation language the operator was forced to speak. Not "the
accused can complain" — **the accused can recompute back.**

Buyers, honestly stated: (a) the regulator, who receives provable conflict
geometry instead of duelling PDFs; (b) the operator, whose capsule gains
credibility precisely because it is answerable; (c) the respondent —
frequently a _downstream deployer or upstream provider_ named in someone
else's incident report — who today has no evidence-grade voice at all.

## 1. Problem — a dispute today is hearsay all the way down

Concretely, after 4T there remain four unanswered failure modes:

1. **Unanswerable reports.** A sealed capsule is rerunnable but monologic; the
   named party cannot respond inside the evidence discipline. Trial in
   absentia.
2. **Hearsay defences.** Any response that does exist is prose — unverifiable,
   unfalsifiable, and structurally weaker than the operator's sealed capsule,
   regardless of merit.
3. **Uncontestable silence.** The operator's `not_derivable` /
   `requires_human_input` markers are signed claims of absence, and today
   nobody can rebut them with evidence. The easiest place to hide is the
   hardest place to challenge.
4. **Strawman contests.** Absent a binding rule, a "response" can quietly
   address a different version, a redacted view, or a paraphrase of the
   report — contest theatre.
5. **Uncontestable clock.** Art-73's 15-day deadline runs from when a causal
   link is "established"; 4T made the operator's knowability instant
   recomputable (`evidence_anchored_at_beat` over the 4N heartbeat), but that
   instant is still one party's assertion — today nobody can contest WHEN the
   operator knowably knew.

4V makes each of these a machine-checkable object: (1) a published
counter-capsule format + verifier; (2) the same census/recompute laws applied
to the defence; (3) absence rebuttal (§4); (4) the five-field binding tuple
(§5); (5) the anchor contest (§4a).

## 2. Non-claims, known limitations, honesty rails (from birth)

**Signed non-claims (8, in `constants.mjs` and asserted by schema check):**

1. `not_an_adjudication_of_truth_or_fault` — the verifier proves _where the
   parties provably conflict_, never who is right.
2. `not_an_adjudication_of_legal_fault` — technical contestability only.
3. `not_a_finding_the_respondent_is_right` — `CONFLICT_PROVEN` and
   `ABSENCE_REBUTTED` are geometry, not vindication.
4. `not_a_multi_round_appeals_process` — single round; see reserved slots.
5. `not_an_identity_or_authority_verification_of_the_respondent` — the
   respondent key proves continuity of one respondent voice, not identity;
   the self-declared `respondent_role` (§6) is equally unverified.
6. `python_public_core_does_not_verify_ed25519_signatures` — parity honesty.
7. `not_a_claim_the_incident_was_prevented_by_this_stage`.
8. `not_a_claim_partition_rescore_signals_revise_the_capsule` — an
   `ABSENCE_REBUTTED` never rewrites 4T truth; it is a review signal only.

**Known limitations (signed into the attestation, 5):**

1. **Single round.** No surrejoinder, no reply-to-the-reply. Reserved slot
   `surrejoinder_round_deferred` carries it.
2. **Respondent key provenance is out-of-band.** Self-asserted identity is
   spoofable (the 4R honesty lesson); we sign the gap instead of pretending.
   External closure path: NIST's AI Agent Standards Initiative (launched
   2026-02-17) and the NCCoE agent identity/authorization concept paper make
   verifiable agent identity a live standards track
   (https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure);
   when it lands, it slots into this limitation without schema change.
3. **Absence rebuttal is registry-bounded.** The defence can only rebut
   absence through a _registered_ recompute kind; the shared registry bounds
   what can be proven, and we sign that bound.
4. **Both parties in Lane A are built by us.** No independent adversarial
   respondent yet — precisely the 4X hook, named here.
5. **Judgment disputes are recorded, never scored** — by design; restated as
   a limitation so nobody reads `DISPUTE_RECORDED` as adjudication.

**Reserved (signed) slots:** `surrejoinder_round_deferred` (multi-round due
process); `narrative_claim_contest_deferred` (the declared 4W socket:
contesting prose claims once 4W makes prose claim-checked); and
`risk_report_contest_profile_deferred` (projecting the contest mechanism onto
lab risk-report surfaces — e.g. RSP v3.0 Risk Reports carry external expert
review with no structured, recomputable dissent channel; the reviewer's
disagreement today is a quote in a PDF. Signed as ambition, shipped only when
a real reviewer wants it).

**Rails (each becomes a test or a gate):**

| Rail                                                                                                                                                   | Enforcement                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Registry authority — no respondent-only recompute logic; only a caller/adapter may change; `RECOMPUTE_REGISTRY` (stage4t) remains the shared authority | e2e invariant: stage4v imports the registry from stage4t and defines zero `recompute` functions of its own |
| Derived-never-filed — a _filed_ conflict map is at most an expected value to check (code 160), never authority                                         | verifier recomputes the map unconditionally                                                                |
| Prose by digest — no raw free text inside the signed contest artifact (judgment text sealed by digest)                                                 | code 159 + schema check                                                                                    |
| Read-only kernel — zero `src/llmShield` diff, no `authorise_*` entry                                                                                   | e2e scan (4U pattern)                                                                                      |
| Provider-agnostic public wording                                                                                                                       | closeout/README use "provider-safe first, then reviewer-safe" gloss                                        |
| Reference-capsule immutability — the Lane A operator capsule is the real 4T green capsule, pinned by digest                                            | `STAGE4T_REFERENCE_CAPSULE` constants + e2e rebuild-and-compare (§7)                                       |
| Status locality — a `DISPUTE_FAILED` at section X cannot alter any other section's status                                                              | named e2e hard gate + Lean `disputeLocality`                                                               |
| Node public verifier is authoritative for raw 152                                                                                                      | parity contract line                                                                                       |

## 3. Invention 1 — the three-verb contest and the five-status conflict map

Per contested section the respondent chooses exactly one **verb**:

- `agree` — respondent recomputes the same value from their own evidence.
- `dispute_by_recomputation` — respondent supplies `{ claimed_value,
recompute_kind, evidence_digest }` where the evidence lives in their own
  sealed census and the kind is in the shared registry. Machine-adjudicable.
- `dispute_as_judgment` — signed human disagreement, sealed by
  `judgment_text_digest`. Recorded, never machine-resolved.

The verifier derives the **conflict map** (`simurgh.vdp.conflict_map.v1`)
deterministically from `(capsule, counter_capsule)`. Per contested section,
exactly one **status** (statuses, not verdicts):

```text
AGREED:
  both sides recompute the same value for the contested section.

CONFLICT_PROVEN:
  both sides recompute validly, but the values differ.

ABSENCE_REBUTTED:
  the operator claimed absence / non-derivability, but the respondent
  supplies sealed evidence that recomputes the disputed value.

DISPUTE_RECORDED:
  the dispute is structurally valid but needs human, legal, or contextual
  judgement.

DISPUTE_FAILED:
  the respondent submission fails recomputation or contestability checks
  for THIS section only. Subreasons: recompute_failed |
  section_not_contestable.
```

**Status derivation is a frozen total function — geometry over intent**
(verb × section class × recompute outcome → status; mirrored byte-identically
in JS, Python, and the browser core):

```text
agree      | evidence_backed | recomputes operator's value → AGREED
agree      | evidence_backed | recomputes a DIFFERENT value → DISPUTE_FAILED{recompute_failed}
                               (an agreement that disagrees is a failed submission)
agree      | absence-class   → DISPUTE_FAILED{section_not_contestable}
                               (nothing recomputable to agree with; endorse absence
                                by leaving the section uncontested or by judgment)
dispute_by_recomputation | evidence_backed | different value → CONFLICT_PROVEN
dispute_by_recomputation | evidence_backed | same value      → AGREED
                               (geometry over intent: if your evidence agrees,
                                the map says agreement, whatever you called it)
dispute_by_recomputation | absence-class   | value derived   → ABSENCE_REBUTTED
dispute_by_recomputation | any             | evidence fails to recompute
                                            → DISPUTE_FAILED{recompute_failed}
dispute_as_judgment      | any contestable section           → DISPUTE_RECORDED
any verb   | section outside the pinned template's section set
                                            → DISPUTE_FAILED{section_not_contestable}
```

("absence-class" = the section's normative partition class is
`not_derivable` or `requires_human_input`.)

Two-tier failure discipline (the due-process cut): **whole-artifact**
structural failures (schema, signature, binding, set-digest, census, raw
payload) are raw exit codes — a strawman contest never gets scored and no
conflict map exists. **Per-section** evidence failures are `DISPUTE_FAILED`
statuses inside the map — one bad dispute is ledgered against the respondent
without voiding their valid disputes elsewhere. A blunt whole-contest failure
for one bad section would punish the respondent for trying; that is
anti-due-process and this spec forbids it.

The map also carries:

- `uncontested_sections[]` — silence about a section is recorded as silence,
  never spun as agreement (the 4T "signed absence" move applied to the
  contest itself).
- `partition_rescore_signals[]` — see §4.
- `anchor_status` (when an anchor contest is present) — see §4a.
- the respondent's self-declared `respondent_role`, echoed verbatim so the
  reader sees WHO (by role) answered — without any identity claim.
- a binding echo (the §5 tuple), so a conflict map cannot be re-attached to a
  different capsule.

Determinism contract: any reviewer re-running the verifier over the same pair
obtains a byte-identical conflict map (canonicalJson; asserted by the audit
tier and the Python parity lane).

## 4. Invention 2 — absence rebuttal (contesting what was NOT said)

`dispute_by_recomputation` works against `evidence_backed` sections **and**
against sections the operator's normative partition classes `not_derivable`
or `requires_human_input`. If the respondent supplies sealed evidence that
recomputes a value for a section the operator said could not be derived, the
status is `ABSENCE_REBUTTED` — machine-proven: _the section WAS derivable._

This is the respondent-side dual of 4T's suppression detection: 4T's codes
143/144 catch suppression visible in the operator's OWN census; 4V's
`ABSENCE_REBUTTED` catches it from the respondent's evidence — a second,
independent searchlight on the same dark corner. You can contest what they
said AND what they refused to say. No contest system in the §13 source map
adjudicates absence.

Every `ABSENCE_REBUTTED` also emits an entry in
`partition_rescore_signals[]` naming the section — evidence that the
normative 4T partition may have under-claimed derivability.
**`partition_rescore_signals` are review signals, not automatic partition
rewrites** (non-claim 8): 4V never mutates 4T truth; it proves the partition
has a contestable pressure point and feeds the next template-revision cycle
honestly.

## 4a. Invention 2b — the anchor contest (contesting the clock)

Art-73's deadline arguments hinge on WHEN the operator knowably knew; 4T made
that instant recomputable (`evidence_anchored_at_beat` over the 4N public
heartbeat) but one-sided. 4V makes it **contestable**: the counter-capsule
may carry one optional `anchor_contest` — a `dispute_by_recomputation`
against the capsule's knowability anchor, using the **already-registered**
`stage4n_beat_index` recompute kind over the respondent's own sealed census.

Mechanics (no new codes, no new machinery — the anchor flows through the
existing pipeline as the pseudo-section key `meta/evidence_anchored_at_beat`):

- the key participates in `contested_section_set_digest` like any section
  (so 154 covers it, and a duplicate anchor contest dies there);
- status derivation uses the `evidence_backed` rows of the §3 table: same
  beat → `AGREED`; both recompute, different beats → `CONFLICT_PROVEN`;
  respondent evidence fails → `DISPUTE_FAILED{recompute_failed}`;
- the conflict map records it as `anchor_status`, alongside the sections.

The first two-sided recomputable timeliness dispute: "we knowably knew at
beat N" can now be answered with "the public heartbeat shows beat M" — and a
reviewer adjudicates neither; the geometry speaks. (Standing non-claims
apply: no deadline-compliance verdict is derived — that is a legal question;
we prove only where the parties' recomputable clocks conflict.)

## 5. Invention 3 — No Strawman binding + derived-never-filed conflict map

The counter-capsule's `binding` block commits to five fields:

```text
binding:
  capsule_root                      ← 4T Merkle root over section commitments
  attestation_digest                ← 4T two-stage outer digest
  capsule_schema_version            ← simurgh.vic.capsule.v1
  capsule_signing_key_fingerprint   ← keyDigest of the operator capsule key
  contested_section_set_digest      ← recordDigest of the SORTED
                                      "regime/section_id" list being contested
```

Any mismatch is raw code 153; a `contested_section_set_digest` that does not
match the actual contests[] (or a duplicate contest for one section) is raw
code 154. Committing to the _digest of the sorted set_ rather than a raw
array makes the binding order-insensitive and byte-stable — "same root,
different framing" produces a different digest and dies at 154.

The conflict map is **derived, never filed**: it is verifier output, not
party evidence. If a party presents an expected conflict map, the verifier
recomputes and compares (mismatch = raw 160) — the presented copy is never
authority. This kills the last laundering channel: you cannot negotiate the
geometry, only recompute it.

## 6. The counter-capsule — schema and shape

`simurgh.vdp.counter_capsule.v1`, signed by the **respondent Ed25519 key**
(new fixture key `INSECURE_FIXTURE_ONLY_vdp-respondent.pem`, path-regex
allowlisted per the 4P/4O gotcha). The `schema` field sits INSIDE the signed
canonical payload — no unsigned costume jewellery.

```text
counter_capsule
├── schema: "simurgh.vdp.counter_capsule.v1"     (signed)
├── respondent_role: provider | deployer |        ← self-declared (No Empty
│                    third_party | unspecified       Chair projection onto the
│                                                    Art-73 pair; guarded by
│                                                    non-claim 5; 151 enforces
│                                                    the enum)
├── binding                                       ← §5 five-field tuple
├── contests[]                                    ← one per contested section
├── anchor_contest (optional)                     ← §4a; pseudo-section key
│                                                    meta/evidence_anchored_at_beat
│   ├── regime / section_id
│   ├── verb: agree | dispute_by_recomputation | dispute_as_judgment
│   ├── claimed_value + recompute_kind            (recomputation verbs)
│   ├── evidence_digest → respondent_census       (recomputation verbs)
│   └── judgment_text_digest                      (judgment verb; prose
│                                                  sealed by digest only)
├── respondent_census                             ← Same Rules for the
│   ├── items[] { digest, kind, epoch }              Defence: IDENTICAL 4T
│   ├── census_root (merkleRootSorted)               census laws
│   └── epoch (must equal the contested capsule's epoch)
├── respondent_evidence_artifacts[]               ← raw artifacts, digest-
│                                                    linked into the census
├── non_claims[]                                  ← the 8 of §2, frozen order
└── signature (respondent Ed25519, over canonicalJson of the body)
```

Verification consumes the **sealed 4T capsule bundle** (with its own inner
signature and outer attestation digest intact — 4T checks re-run first as a
precondition: a contest over an invalid capsule is meaningless and refused).

## 7. The two lanes

**Lane A — deterministic contest corpus (Node 26, byte-stable).**

The operator side is the **real 4T green capsule** — the deterministic
capsule embedding the genuine 4S verdict-108 over-scoped delegation crossing.
Pinned in `constants.mjs`:

```text
STAGE4T_REFERENCE_CAPSULE:
  source_stage: "4T"
  incident_anchor: "stage4s_verdict_108"
  capsule_root: <pinned at implementation time from the deterministic build>
  attestation_digest: <pinned at implementation time, same build>
  reference_capsule_not_synthetic: true
```

An e2e invariant rebuilds the 4T green capsule via `buildGreenBundle()` and
asserts digest equality with the pinned constants — swapping in a synthetic
capsule while still saying "real 4T" is a red build, not a footnote.

Fixture families:

1. **Honest contest (green):** ONE counter-capsule exercising all five
   statuses at once — an `AGREED`, a `CONFLICT_PROVEN` (respondent's own
   sealed evidence recomputes a different `participant_count`), an
   `ABSENCE_REBUTTED` (a `not_derivable` section rebutted via a registered
   kind over respondent evidence), a `DISPUTE_RECORDED` (signed judgment
   against `root_cause_analysis`), and a `DISPUTE_FAILED{recompute_failed}`
   (the defence caught lying, ledgered, while its other disputes stay
   valid) — PLUS an anchor contest yielding `CONFLICT_PROVEN` on the
   knowability beat (§4a) and `respondent_role: deployer` (the Art-73 pair
   made concrete). Proves mixed outcomes coexist in one contest.
2. **Tamper matrix:** one fixture per raw code 151–160, built with
   `resignCounterCapsule` (the 4T lesson: mutations break the respondent
   signature first, so 153–160 fixtures are re-signed; only the 152 fixture
   keeps a broken sig). The e2e net asserts, as a loop over the corpus:
   `only_152_fixture_has_invalid_signature` and
   `all_153_to_160_fixtures_are_validly_resigned`.
3. **Status matrix:** one fixture per status and per `DISPUTE_FAILED`
   subreason, including the **status-locality hard gate**: a
   `DISPUTE_FAILED` at section X leaves every other section's status
   byte-identical to the same contest without X.

**Lane B — live two-party ceremony (respondent-blind).**

Two OS processes, genuinely split:

- **Operator process:** owns operator private state; runs the real 4S
  `runCeremony()` two-process MCP hop to produce a fresh incident window;
  builds a fresh capsule over it with 4T machinery (ephemeral capsule key).
- **Respondent process:** owns the respondent key (ephemeral); receives
  **only the sealed public artifacts** — no operator private key, no operator
  working state; files a counter-capsule contesting the live capsule.
- **Verifier:** derives the conflict map.

Negative assertions, recorded in the committed capture: the respondent
process env/args/manifest contain **no operator private-key path** and **no
operator working-state path** (`respondent_process_cannot_read_operator_private_key`,
`respondent_process_cannot_read_operator_working_state`). Verify-only,
ephemeral keys, harness-computed hashes (the 3V-A rule); committed under
`evidence/stage-4v/` (fully prettier-ignored, the 4N lesson).

## 8. Raw codes 151–161 + frozen check order + ripple discipline

```text
151 vdp_counter_capsule_schema_invalid    shape/verbs/role enum/non-claims (4T-133 analogue)
152 vdp_respondent_signature_invalid      Ed25519 over canonical body (4T-134)
153 vdp_binding_mismatch                  any of the five tuple fields   ← No Strawman
154 vdp_contested_section_set_mismatch    set digest ≠ contests[] OR duplicate section
155 vdp_respondent_census_item_mismatch   (4T-138 analogue)
156 vdp_respondent_census_omits_evidence  referenced but unlisted (4T-139)
157 vdp_respondent_census_root_mismatch   merkleRootSorted (4T-140)
158 vdp_respondent_census_epoch_mismatch  epoch ≠ contested capsule epoch (4T-145)
159 vdp_forbidden_raw_payload             raw prose inside signed artifact
160 vdp_conflict_map_mismatch             presented map ≠ recomputed map (only if presented)
161 vdp_internal_fail_closed              evaluateContestSafe wrapper (4T-150 analogue)
0   contest scoreable → conflict map emitted
```

Frozen check order: `pre(4T capsule re-verify) → 151 → 152 → 153 → 154 →
155 → 156 → 157 → 158 → 159 → 160`; 161 wraps everything fail-closed.
All codes `RUN_LEVEL_BY_RAW` level 1. Headroom 162–170 reserved.

**Ripple discipline (enumerated, from 4L/4M/4N/4T scars):** additive raw
codes are expected to break the known goldens — 4H exit-map.json (both
copies), the 4H exitWrapper inline map, exitWrapper.test.js's
RUN_LEVEL_BY_RAW literal, the 4L e2e net, 4K/4H pack digests — plus
`exitCodeProbeHygiene.test.js` extended over 151–170 with
`UNKNOWN_RAW_PROBE=999`. The plan budgets a dedicated task for the ripple,
runs the full Node-26 e2e nets, and re-runs ALL prior stages' reproduce
scripts before tag.

## 9. Two-tier attestation, Python parity, browser verifier

House pattern, all inherited:

- **Attestation:** stage4v Ed25519 key (`INSECURE_FIXTURE_ONLY_vdp.pem`),
  four sealed groups under `content` (lane_a_fixtures, lane_b_capture_ref,
  parity_contract, honesty_ledger), `bundle_merkle_root`, two-stage
  `attestation_digest` over `body.content` via the 4P re-canonicalise
  round-trip.
- **Two tiers:** public = structure/signature/key digest/Merkle/two-stage
  seal; audit = additionally reruns `evaluateContestSafe` over every Lane A
  fixture asserting each recorded `expected_raw` AND byte-identical
  recomputed conflict maps.
- **Python parity (stdlib only):** public-tier decision core INCLUDING full
  conflict-map derivation (digests + comparisons; sha256 only). Excludes 152
  signature checks and the 4T-capsule pre-verify's signature layer, exactly
  as the JS public tier treats them; the parity contract signs
  `python_public_core_does_not_verify_ed25519_signatures` and
  `node_public_verifier_is_authoritative_for_raw_152`.
- **Browser verifier:** static single-file `vdp-verifier.html`, inlined pure
  core (id="vdp-core"), CSP `default-src 'none'`, `node:vm` CLI-parity gate.
  Convenience view; CLI authoritative.

## 10. Reproduce + hermeticity

`scripts/reproduce-llm-shield-stage4v.sh` — verify-only: rebuild Lane A
fixtures byte-stable under Node 26 (`cmp` against committed), re-verify
attestation both tiers, re-run Python parity over the corpus, re-run the
browser-parity gate, re-verify the Lane B capture hashes. No network, no
model, no key generation. `evidence/stage-4v/` fully prettier-ignored;
`.prettierignore` entry added the same commit that creates the directory
(4N lesson). `check.sh` run locally before any push (4U lesson).

## 11. Lean obligations (`proofs/stage4v/DueProcess.lean`)

Lean 4.15.0 (pinned `lean-toolchain`, matching `proofs/stage4t`), no mathlib,
zero `sorry`, and NOT wired into `check.sh` (standing lean-not-in-check
gotcha; CI job `lean-check` covers it). Small formal model: sections,
partitions, verbs, censuses as finite maps; statuses as an inductive.

1. **`noTrialInAbsentia`** — for every well-formed sealed capsule, a
   well-formed counter-capsule exists for every **contestable** section.
   (Contestable = in the pinned template snapshot of a bound regime — the 4T
   partition is exhaustive by construction (4T-136), so every template
   section carries a signed class and is reachable by contest whether or not
   the capsule projects it; the model carries `section_not_contestable`
   explicitly so the theorem does not accidentally claim arbitrary section
   IDs are contestable.)
2. **`noStrawman`** — if any binding-tuple field mismatches, no conflict map
   is derivable (the derivation function is undefined off the exact sealed
   capsule).
3. **`sameRulesForDefence`** — the acceptance predicate for respondent
   evidence IS the operator's census predicate — one shared definition
   applied to both parties, so the theorem states defence obligations =
   operator obligations, not merely "similar".
4. **`disputeLocality`** — given a scoreable counter-capsule whose binding,
   signature, census, Merkle-root, epoch, and raw-payload checks pass, the
   status of section X is a function only of X's contest and X's referenced
   evidence; a `DISPUTE_FAILED` at X cannot change any other section's
   status. (Determinism of the whole map falls out as a corollary: statuses
   are total functions of per-section inputs.)

## 12. Kernel touch

None. Zero diff under `src/llmShield/`; no new `authorise_*` entry; 4A–4U
artifacts byte-frozen (e2e asserts via `git show` against committed state,
not working tree — the 4U CI lesson). 4V consumes 4T/4S artifacts read-only.

## 13. Prior-art / field scan (web sweep run 2026-07-07; URLs re-pinned at plan time)

Treated as **attackable, not assumed**: "no matching prior pattern in our
current source-map" is the claim; the map is below.

| Neighbour                                                                                                                                                                                                                    | What it has                                                                                          | What it lacks (the 4V gap)                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contestable-AI literature (From Stem to Stern, arXiv:2408.01051; Contestable AI by Design, Minds & Machines 2022; Explainable AI Must Be Contestable, arXiv:2506.01662; Challenging the Machine, arXiv:2406.10430 / Lawfare) | Frameworks, design guidance, "arenas for adversarial debate"                                         | Concedes "existing work does not translate into actionable dispute processes"; no cryptographic binding, no recomputation, no metrics                        |
| Computational argumentation for contestability (arXiv:2405.10729)                                                                                                                                                            | Formal adjudication of structured arguments — the closest technical relative                         | Adjudicates asserted premises, not sealed recomputable evidence; no binding to a signed report; no census discipline                                         |
| Multi-agent failure-attribution benchmarks (Agents_Failure_Attribution, ICML 2025 spotlight; "Seeing the Whole Elephant", arXiv:2604.22708)                                                                                  | Automated blame assignment over multi-agent traces                                                   | Attribution by LLM judge — not recomputable, not cryptographically bound, not answerable by the blamed party                                                 |
| IETF SCITT                                                                                                                                                                                                                   | Append-only transparency for supply-chain statements; multiple statements may reference one artifact | No dispute semantics: statements coexist, nothing adjudicates conflict or rebuts absence                                                                     |
| C2PA                                                                                                                                                                                                                         | Cryptographic provenance assertions                                                                  | Explicitly no dispute path; assertions accumulate, never contest                                                                                             |
| CVE/CVD dispute processes                                                                                                                                                                                                    | A real-world "DISPUTED" tag                                                                          | Prose adjudicated by humans at the registry; no recomputation, no evidence discipline                                                                        |
| EU Art-55/Art-73 templates (pinned in 4T)                                                                                                                                                                                    | The reports 4V makes contestable                                                                     | No respondent path of any kind                                                                                                                               |
| Internal ancestors: 4M respondent contest path, 4P contest/pincer, 4T suppression detection                                                                                                                                  | The lineage 4V composes                                                                              | 4M/4P contest scalar claims about disclosures/custody; none contests a full incident report section-by-section, and nothing anywhere adjudicates **absence** |

## 14. Four-axis scorecard (pre-score)

Design-time internal scorecard, not shipped evidence and not a
literature-complete novelty claim.

| Axis               | Score | Why / what moves it higher                                                                                                                                                                                                                                                                                                              |
| ------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Novelty            | 9.5   | First machine-adjudicable contest path for incident reports; absence rebuttal (contesting what was NOT said) and the anchor contest (contesting WHEN they knowably knew) have no matching prior pattern in our current source-map; treated as attackable, not assumed. Higher: an independent third party files a real counter-capsule. |
| Frontier           | 9.2   | Recomputable disagreement is new verifier geometry; single-round + registry-bounded keeps it short of full due process. Higher: surrejoinder round + narrative contest (the 4W/4X arc).                                                                                                                                                 |
| Good-for-Anthropic | 9.4   | Due process is the missing half of the regulator wedge — reports a lab files (or is named in) become answerable, not just assertable. Higher: real-regime pilot.                                                                                                                                                                        |
| Constitution       | 9.4   | Accountability + contestability made machine-checkable; the accused gets the same evidence law as the accuser. Higher: respondent identity attestation (closing signed limitation 2).                                                                                                                                                   |

Re-score at closeout against shipped evidence.

## 15. Comprehensive E2E net + docs-accuracy pass (mandatory before tag)

K7-style all-functions net composing EVERY export: unit suites per module
(explicit `*.test.js` globs — never a bare dir, 4K gotcha); the 151–160
tamper matrix + 161 wrapper; the five-status matrix + anchor-contest
fixtures (§4a) + `DISPUTE_FAILED`
subreasons + status-locality hard gate; tamper-matrix meta-assertions
(`only_152_fixture_has_invalid_signature`,
`all_153_to_160_fixtures_are_validly_resigned`); cross-stage invariants (4T
green capsule digest-pinned rebuild; 4S/4T/4U artifacts byte-frozen;
read-only kernel scan; registry-authority invariant — stage4v defines zero
recompute functions); exit-code probe hygiene over the new block; prior
stages' reproduce scripts re-run; view/read-only invariants; and the
docs-accuracy pass verifying every closeout claim against shipped code. No
`rg` in unit tests (Linux CI lacks it). All green under Node 26 before tag.

## 16. File structure (locked at plan time)

```text
tools/simurgh-attestation/stage4v/
├── constants.mjs                     schemas, statuses, non-claims,
│                                     limitations, rails, reserved slots,
│                                     STAGE4T_REFERENCE_CAPSULE
├── core/
│   ├── bindingCore.mjs               five-field tuple + set digest (153/154)
│   ├── contestCensus.mjs             respondent census (155–158) — thin
│   │                                 caller over shared census discipline
│   ├── conflictMap.mjs               five-status derivation + locality +
│   │                                 rescore signals + uncontested[]
│   └── counterCapsuleCore.mjs        schema/signature/payload (151/152/159),
│                                     160 check, evaluateContest(Safe), 161
├── node/
│   ├── greenContest.mjs              honest five-status counter-capsule +
│   │                                 resignCounterCapsule
│   ├── build-stage4v-fixtures.mjs    Lane A corpus (tamper + status matrix)
│   ├── build-stage4v-attestation.mjs four sealed groups, Merkle, sign
│   └── verify-stage4v-attestation.mjs two tiers + CLI
├── laneb/run-laneb-contest-ceremony.mjs   two-party respondent-blind ceremony
├── python/vdp_parity.py              public-tier core incl. conflict map
├── browser/vdp-verifier.html         static single-file, CSP 'none'
proofs/stage4v/DueProcess.lean + lean-toolchain
scripts/reproduce-llm-shield-stage4v.sh
tests/unit/llmShield/stage4v/*.test.js
tests/e2e/llmShield/stage4v/{k7AllFunctions,laneb,browserParity}.test.js
tests/fixtures/llmShield/stage4v/test-keys/INSECURE_FIXTURE_ONLY_{vdp,vdp-respondent}.pem(+.pub)
evidence/stage-4v/   (prettier-ignored)
docs/research/llm-shield/STAGE_4V_{THREAT_MODEL,REVIEWER_CHECKLIST,CLOSEOUT}.md
```

## 17. Closeout obligations

Closeout with re-scored four-axis table + honest findings (including how many
sections proved contestable-by-recomputation vs judgment-only in practice);
NORTH_STAR_VDCC.md status update (the wedge grows a right of reply);
README stage row; memory update; both reserved slots restated; the 4W socket
explicitly pointed at. Neutral commit/PR/release messages throughout
(standing attribution rule).
