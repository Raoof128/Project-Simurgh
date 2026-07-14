<div align="center">

<img src="docs/Project-Simurgh-Logo.png" alt="Project Simurgh" width="240"/>

# Project Simurgh

**Verifiable evidence for high-stakes and agentic AI systems.**

_Provider-agnostic Verifiable Containment Attestation (VCA): machine-checkable, offline-reproducible
proof of what happened after a guardrail missed — not another jailbreak detector._

[![Quality gate](https://github.com/Raoof128/Project-Simurgh/actions/workflows/stage-1-checks.yml/badge.svg?branch=main)](https://github.com/Raoof128/Project-Simurgh/actions/workflows/stage-1-checks.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A522.0-1a1a1a?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-AGPL--3.0-d6cfbe?style=flat-square)](#license)
[![Status](https://img.shields.io/badge/status-research%20prototype-2f4a2a?style=flat-square)](#status)
[![Latest](https://img.shields.io/badge/release-v2.49.0-blue?style=flat-square)](https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.49.0-stage-5n-vtc-delay)

</div>

---

## Goal

Most AI safety tooling tries to stop a bad input. Project Simurgh starts from the opposite, more
honest assumption: **input filters and external guardrails will sometimes miss.** The goal is to
produce **signed, offline-reproducible evidence of the consequences** — whether untrusted context
gained authority, whether an unauthorised tool executed, whether unsafe output was exported — so a
third party can _verify_ what a run did instead of taking a vendor's word for it.

In one sentence: **Simurgh gives an agentic system a verifiable receipt, not a passport.**

### For a reviewer in a hurry — the 60-second version

**The bet:** oversight of AI should not rest on trust. Simurgh is an independent, **byte-reproducible
verification layer** — a third party recomputes what a run actually did, offline, without trusting any
vendor, model, or lab. Everything below is signed, non-interactive, and checkable with one command.

- **It maps to Anthropic's own problems, in Anthropic's own words.** The
  [Constitution](#design-alignment-with-claudes-constitution)'s "the model is not the only safeguard" →
  containment measured _after_ a guardrail misses. The July-2026
  [global-workspace interpretability paper](#matching-anthropics-interpretability-research-july-2026)'s
  own "not sufficient" limit → a signed workspace-attestation contract. RSP v3.4's evaluate-**before**-deploy
  → a machine-checkable temporal commitment anchored in Bitcoin.
- **RSP v3.4's newest commitments already have a released evidence protocol here.** The policy
  (effective 8 July 2026) allows external review of a Risk Report to be split across reviewers —
  _"so long as all parts of the unredacted report are evaluated by at least one external
  reviewer"_ — and requires public Risk Reports to indicate where material was redacted. Three
  released verifiers make exactly those commitments offline-recomputable:
  [**VFC** `v2.42.0`](https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.42.0-stage-5g-vfc)
  computes a typed producer↔verifier separation strength instead of accepting an independence
  claim at face value;
  [**VSD** `v2.43.0`](https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.43.0-stage-5h-vsd)
  binds every safety claim to its evidence, declared scope, redactions, and a computed
  reproducibility tier — a consequential claim resting only on restricted evidence fails closed;
  [**VPC** `v2.44.0`](https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.44.0-stage-5i-vpc)
  recomputes grant-bounded section-coverage equality over signed reviewer receipts, and is
  structurally unable to certify "the review was adequate" — full coverage plus an adequacy claim
  fails closed. The confidential report never leaves the lab: the verifier checks signed
  relationships, committed identifiers, and recomputation results, offline.
- **Real, falsifiable results — not slideware.** A live **Llama Guard 4 12B** missed **138/150**
  downstream attacks; Simurgh produced verifiable containment evidence for **138/138** (targeted attack
  success **0/150**) — [Stage 3V-B](#the-concrete-result-stage-3v-b). A live **Sonnet-5 adversary** (CVP)
  tried to forge a temporal-commitment ceremony **8 ways across all 7 laws** — the frozen verifier
  contained **every one, 0 bypasses**, and the commitment is anchored in **Bitcoin block 957 689**
  (independently cross-checked).
- **Depth, not a demo.** 40+ research stages across **94 tagged releases in two months**
  (13 May → 13 July 2026), each stage adding **one falsifiable blade**; Lean proofs (zero `sorry`,
  no user axioms); Node ↔ Python ↔ browser byte-parity; ~3,000 automated unit tests plus per-stage
  tamper suites; a public Merkle-chained replay timeline.
- **Calibrated by construction.** Every artifact carries machine-readable **non-claims**. The honesty
  guardrail is literal: **"boundary held, verifiably" — never "model safe."** No vendor is ranked, no
  immunity is claimed, and no live model is re-executed in CI.

**Who built it:** [Mohammad Raouf Abedini](https://github.com/Raoof128) — sole author, full-loop:
gap-hunt, spec, implementation, Lean proofs, signing ceremonies, and closeout, released in a public
two-month sprint. Live adversarial lanes ran under an approved Cyber Verification Program
organisation, and the independent ceremonies (foreign capture, split-review panel, two-machine
byte-identical reproductions) were executed by unaffiliated third parties with their own keys.
Methodology is LLM-assisted and disclosed in the research write-ups; every claim is bounded by
signed evidence and machine-readable non-claims.

> **Verify it yourself in one command, offline, no private key:** see
> [Reproduce it yourself](#reproduce-it-yourself-offline-no-private-key). That is the whole thesis made
> operational — a receipt you can recompute, not a passport you have to trust.

> 📄 **One-page technical brief:**
> [Verifiable Containment Attestation After Guardrail Failure](docs/research/llm-shield/ONE_PAGE_BRIEF.md)
> — the problem, the concrete Llama Guard 4 result, and the one-command reproduction, on a single
> page. A printable, on-brand version is at
> [`docs/research/llm-shield/one-page-brief.html`](docs/research/llm-shield/one-page-brief.html).
>
> 🔎 **For reviewers from AI labs / assurance teams:**
> [Simurgh — a recomputable evidence layer for Anthropic's assurance stack](docs/research/llm-shield/ANTHROPIC_BRIEF.md)
> maps four named problems (third-party verification, verifiable oversight, completeness vs.
> selective omission, multi-agent accountability) to concrete mechanisms — printable version at
> [`docs/research/llm-shield/anthropic-brief.html`](docs/research/llm-shield/anthropic-brief.html).

**The ladder so far.** Each release below is one falsifiable rung — a single mechanism a hostile reviewer
could reject by attacking exactly one claim. It is a deliberate record of depth, not a changelog; skim the
newest for the current frontier, or jump straight to
[what it is / is not](#what-it-is--and-what-it-is-not), the
[Constitution alignment](#design-alignment-with-claudes-constitution), or the
[concrete result](#the-concrete-result-stage-3v-b).

> 🆕 **Latest — Stage 5N · VTC-Delay: a decision that provably could not have been finalised instantly (`v2.49.0-stage-5n-vtc-delay`).**
> Binds a decision's **finalisation** to two things a producer cannot fake afterwards: a **dependent SHA-256
> chain** of **T = 20,000,000** steps seeded from the _real start timestamp token_, and **two RFC-3161
> endpoints** whose genTimes yield a conservative elapsed **lower bound**. The verifier **re-runs the whole
> chain** — deliberately **not a VDF**: no trusted setup, no fast-verify, no hardware claim. (The VDF paper's
> own defining property is output that is _"efficiently and publicly verified"_; we trade exactly that away
> for a verifier anyone can re-implement from the spec.) Additive on the frozen 5M extension; new codes
> **396–419**. Laws: **No Instant Finalisation** · **No Pre-Input Final Commitment**.
> **Banked, for real:** both endpoints Bitcoin-confirmed in **block 957 983** (our OTS parser's merkle root
> cross-checked against a public explorer; block timestamp after both genTimes) → the real ceremony verifies
> **`raw 0` / `elapsed_lower_bound_ms 90 000`** against a frozen **60 000 ms** floor, with **no injected
> facts**. **13 Lean theorems** (zero proof holes) + a theorem-projection gate, Node↔Python↔browser parity
> (browser core **never** emits a normative raw 0), K7 net over all 24 codes. **Adversary EXECUTED:** live
> **Sonnet-5** (CVP) chose all five temporal-fraud attacks — **all contained**; **Fable-5 refused**, sealed
> honestly as `model_refused`. **Lane D:** 3 machines / 2 architectures / 2 runtimes byte-identical.
> **Honesty boundary:** proves finalisation was _delayed_, **never** that anyone reviewed carefully —
> _"receipt, not passport."_ The real ceremony also caught a production bug that 59 unit tests and 13
> theorems missed. Pays socket **I4**. Scorecard: Novelty 9.4 · Frontier 9.4 · Anthropic-relevance 9.7 ·
> Constitution 9.6.
>
> <details><summary>Previous — Stage 5M · VTC-Quorum (<code>v2.48.0</code>)</summary>
>
> **Stage 5M · VTC-Quorum: exact three-ecology external-anchor quorum (`v2.48.0-stage-5m-vtc-quorum`).**
> The verifier consumes and **independently validates an exact three-of-three** external-anchor ecology —
> **RFC-3161 TSA + Bitcoin-confirmed OpenTimestamps + Rekor transparency-log inclusion** — all binding one
> commitment `D`, and **only then banks `externally_anchored`**. Layered additively on the frozen 5L core
> (codes 364–383 untouched); new codes **384–395**; two-level state (`ecology_confirmed`=0 /
> `ecology_incomplete`=**393** / `false_anchored`=**394**, lie before gap). Laws: **No Anchor Without
> Recompute**, **No Silent Downgrade**, **No Counterfeit Ecology**, **No Two Anchored Stories**. Real Node
> adapter (RFC6962 inclusion + checkpoint STH + SET + submitter, validated offline vs a real Rekor entry),
> two-tier attestation, emit-only **in-toto** candidate predicate, **Node↔Python↔browser parity**, **11 Lean
> theorems** (zero `sorry`), K7 net. Beast-mode: **Ecology Independence Number** (signed rewrite-cost floor) ·
> **crossEcologyEquivocationBound** (a bound the TEE/ZK prior art can't state) · a prior-art seam table.
> **Banked, for real:** a genuine **DigiCert** token (imprint == `D`) + a **Bitcoin-confirmed OTS** (block
> **957 782**, merkle root cross-checked vs mempool.space) + a real **Rekor** entry → the confirmed bundle
> verifies to **`raw 0` / `externally_anchored=true` / `N=3`**. **Adversary EXECUTED:** live **Sonnet-5** (CVP)
>
> - a local **Llama-3.2-1B** fuzzer across all six forgery classes — **0 bypasses**; and a **real two-machine
>   independent reproduction** (Mac Node 22 + remote droplet Node 26, distinct keys, byte-identical decision).
>   Pays socket **I5**. Scorecard: Novelty 9.3 · Frontier 9.5 · Anthropic-relevance 9.6 · Constitution 9.5.
>
> </details>
>
> <details><summary>Prior — Stage 5K · Verifiable Universe Commitment (<code>v2.46.0-stage-5k-vuc</code>)</summary>
>
> Proves the ceremony could not quietly **swap, shrink, or reinterpret what "everything" means after
> commitment**: an authorship-bound, externally-ordered **Merkle-set universe commitment**, chained to exact
> reviewer/producer start obligations and fresh execution outputs, with **independent** equality against each
> downstream component — `U_commit = U_vpc` **and** `U_commit = U_vrc`, **never through a union**. Three laws:
> **No Shrinking Universe** (357), **No Phantom Section** (358), **No Post-Hoc Commitment Record** (354, a
> cycle-free `commitment_session_id` signed pre-anchor → `ceremony_id` post-order). Codes **348–363**, two
> split attestations (`audit ⟹ public` under the same context **and** `policy_digest`), **11 Lean theorems**
> (zero unfinished goals, no user axioms — `commitmentBinding` depends on _none_), **64 unit + 5 K7 e2e**,
> real Ed25519 end-to-end + byte-stable pack, and **Node↔Python↔browser parity**. Beast-mode: the **Scope
> Trilemma** (`noSilentScopeChange`, no fourth branch) · **blind set-equality** (verify a confidential
> report's scope from digests) · regression / commit-first-margin / omission-claim censuses (audit,
> verdict-neutral) · a G13 adequacy-vocabulary belt · an in-toto/SCITT bridge. Design incorporates a
> **32-finding external audit applied to spec + plan before build**. **Real independent Lane C EXECUTED:** an
> independent party byte-reproduced `raw 0` (public + audit) on **two machines / Node builds**, with an
> OpenTimestamps public witness over the commitment digest **pending Bitcoin confirmation**. **Honest to its
> limits:** committed = evaluated ≠ the universe was **adequate** (→ mints `universe_adequacy_deferred`);
> Lane C is reproduction + de-identified witness, **not** a distinct-key ceremony. Scorecard: Novelty 9.0 ·
> Frontier 9.0 (unbanked; needs live Lane C-adv + a confirmed anchor) · Good-for-Anthropic 9.4 · Constitution
> 9.4.
>
> </details>
>
> <details><summary>Prior — Stage 5J · Verifiable Rating Contest (<code>v2.45.0-stage-5j-vrc</code>)</summary>
>
> Turns RSP v3.4's external-review **disagreement** into an offline-recomputable relation: it derives an
> exact **rating-obligation set** from VPC's (5I) coverage relation, requires the ledger to **equal** it on
> both sides (reviewer pairs = C(r), producer sections = S), and preserves every divergence as an
> **append-only contest event** — so **suppression fails closed**. **Contest recorder, not truth arbiter.**
> Because the reviewer chain is append-only and reviewer-signed, **erase-by-supersession** leaves the
> historical divergence recomputable (**342**) and a forged _superseded_ entry is caught even when the head
> is honest (**341**, the fossil attack); revise-after-responding → raw 0. Beast-mode: the **Override
> Trilemma** (`noSilentOverridePath`, no fourth branch) · **`noCorrectnessBit`** (the state space has no
> correct/incorrect value — structurally unable to assert who was right) · the **reviewer rebuttal**
> (silence ≠ agreement) · **Downgrade Depth** · a **content-blind ledger authority** · an in-toto/SCITT
> bridge. Codes **332–347**, two split attestations (public never certifies projections; `audit ⟹ public`),
> **11 Lean theorems** (zero `sorry`), **79 unit + 4 K7 e2e**, real Ed25519 end-to-end + byte-stable pack,
> and **Node↔Python↔browser parity**. **Real independent-party Lane C EXECUTED, de-identified:** an
> anonymous party ran the ceremony over the real **37-section Opus 4.6 public structure** with their **own
> keys** (distinct from ours; we do not possess them), locally and on a **remote droplet under Node 26**,
> both **raw 0**. A de-identified **OpenTimestamps** public witness was submitted and is **pending Bitcoin
> confirmation** — no verified `public_witness` is claimed until it lands. **Honest to its limits:** VRC is
> **not category-creating** on attestation (in-toto/SCITT/C2PA exist) — it is the first executable verifier
> of a two-party rating divergence where omission fails closed. Contest ≠ correctness (→ VRC's own signed
> non-claim); independence is `distinct_key_only`, **not** the identity-anchored `externally_anchored` rung
> (which requires revealing an identity the party declined). Scorecard: Novelty 9.5 · Frontier 9.4 ·
> Good-for-Anthropic 9.5 · Constitution 9.6.
>
> </details>
>
> <details><summary>Prior — Stage 5I · Verifiable Panel Coverage (<code>v2.44.0-stage-5i-vpc</code>)</summary>
>
> Turns RSP v3.4's split-external-review condition — _"all parts of the unredacted report are evaluated by
> at least one external reviewer"_ — into an offline-recomputable relation over a committed report
> partition, signed access grants, and reviewer receipts. The blade is grant-bounded coverage **equality**
> `⋃C(r) = S` with **computed** reviewer + host independence (5G's rung lattice re-instantiated), a
> **no-silent-filter census** (every supplied panel member qualifies or the bundle fails closed), and
> **externally-anchored non-affiliation**. Three laws: **No Section Left Unreviewed** (327), **No Phantom
> Review** (323), **No Self-Vouched Reviewer** (325/326). The headline invention is the **Adequacy Gate**
> (`VPC_ADEQUACY_CLAIMED`, **328**) — a coverage verifier **structurally unable to certify the review was
> adequate**: an adequacy/quality assertion fails closed **even at full coverage** (a bounded vocabulary
> over a bounded surface, honestly not a semantic proof) — the purest anti-overclaim, and exactly the
> **Wirecard** line (EY signed off on evidence sourced from the audited party). Plus two zero-code projections nobody publishes: the **Coverage Depth Census**
> (`single_reviewer_sections` fragility map — "Pathway 5 rested on one reviewer's eyes") and the **Typed
> Coverage State** (covered / assigned_only / unassigned coordination-theater map). Two roots
> (`panel_subject_root` excludes challenge receipts) break the challenge↔root cycle. Codes **316–331**,
> **9 Lean theorems** (zero `sorry`), **37 unit + K7 e2e**, three lanes (**A** byte-stable committed pack
> raw 0 public+audit + byte-stable · **B** deterministic multi-process panel ceremony · **C** the real
> Opus 4.6 Sabotage Risk Report public structure), and **JS↔Python↔browser parity, byte-identical**.
> **Real independent-party ceremony EXECUTED** — the droplet team ran the full split-review with their
> own keys over the 37-section public structure; their pack verifies **raw 0** under our verifier with a
> **verifier key distinct from ours** (non-possession), `coverage_gap = 0`. **Honest to its limits:**
> VPC is **not category-creating** (RSP v3.4 defines the coverage condition; the EU AI Act Art. 55 + GPAI
> Code of Practice mandate independent external evaluation) — it is the executable, byte-reproducible
> verifier under them. Coverage ≠ diligence (→ VRC); Lane C is public-structure-only with a modeled
> affiliation axis; separation is `challenge_bound`, not `externally_anchored`.
>
> </details>
>
> <details><summary>Prior — Stage 5H · Verifiable Safety-claim Disclosure (<code>v2.43.0-stage-5h-vsd</code>)</summary>
>
> Extends the Completeness Invariant to the **reproducibility tier of a safety claim**. Every claim carries
> a **declared consequence** and a verifier-**computed reproducibility tier** (`restricted` → `controlled` →
> `public`), and the verifier enforces the **Right-Scaling Law** — a claim may not outrun its evidence.
> The headline is the **Evidential-Inversion Detector** (raw **312**): a threshold-crossing claim on
> restricted evidence fails closed — Oxford's named _"evidential inversion: the most consequential claims
> are the least reproducible"_ turned into an executable check. `warrant(tier)` is a **typed pair**
> (`max_consequence`, `support_quality`) — a reviewer-only recompute is permanently typed `qualified`, never
> laundered into `full`. Three signed objects (producer inventory / secure-review-host receipt / Simurgh
> attestation; no object signs itself), six domain separators **all consumed by a named check**, external
> pin + host registry from OUTSIDE the bundle. **No Undeclared Redaction** makes redactions typed IOUs;
> **No Scope Substitution** binds the evaluated checkpoint (the _Maverick fixture_ — evaluated ≠ released).
> Codes **300–315**, **10 Lean theorems + 1 lemma** (zero `sorry`), **75 unit + 11 K7 e2e**, a two-process
> Lane-B review ceremony, JS↔Python↔browser parity, and beast inventions (Inversion Census, Right-Scaling
> Distance, Disclosure Debt, Cross-Attestation Chaining). Directly the recomputable substrate a frontier
> lab's RSP-v3.0 disclosure regime (Risk Reports + expert reviewers + gap docs) lacks. **Honest to its
> limits:** VSD is **not category-creating** (Oxford defines the tiers, credited) — it is the executable,
> TEE-free, byte-reproducible _per-claim instantiation_. **Real independent-party reproduction EXECUTED**
> — two unaffiliated hosts (own keys, local + droplet) independently reran our disclosed claim's recipe,
> reproduced its committed output `sha256:9f10dc0d…` **byte-for-byte**, and counter-signed R1 receipts with
> keys distinct from the verifier; `real-disclosure/` verifies `raw 0`. Honest bounds: the producer-side
> runs used **placeholder** data (not a real eval), and no real published-report claim is ingested yet;
> reproducibility ≠ correctness.
>
> </details>
>
> <details><summary>Prior — Stage 5G · Verifiable Foreign Capture (<code>v2.42.0-stage-5g-vfc</code>)</summary>
>
> Extends the Completeness Invariant to the **provenance of production**: for every foreign capture the
> verifier computes a **typed producer/verifier Separation Strength** (`distinct_key_only` →
> `challenge_bound` → `externally_anchored`) and **rejects unsupported upgrades** (raw **296**, the
> headline). "We graded our
> own homework" becomes impossible to _hide_: separation is a checkable rung, not a boolean. Three signed
> objects (no object signs itself, domain-separated), external verifier pin (all three of key·subject·digest),
> a precommitted **challenge receipt** (substitution-resistance, _not_ wall-clock freshness), and an offline
> **Sigstore cross-binding** for rung-2 (Fulcio-certified key attests the producer key — ECDSA-Fulcio ≠
> Ed25519-producer). Codes **283–299**, **10 Lean theorems + 1 lemma** (compile clean, zero `sorry`), **105
> tests**, Lane B sidecar ceremony, JS↔Python parity, a **portable browser verifier** (raw:null, CSP
> no-egress), the **Anchored-Subject Diversity Index** (surfaces producer monoculture), a **Homework Corpus**
> (self-grading failures made impossible), and a standalone **foreign-capture pack** an external actor runs.
> **Honest to its limits — and this one is load-bearing:** VFC is **not category-creating** (OVERT already
> ships tiered independent-attestation levels + a pinned profile); it is the executable, byte-reproducible,
> Lean-modelled _per-capture instantiation_. **Real foreign capture EXECUTED by an independent party** —
> an unaffiliated team ran the pack on their own machines with their own keys (local + droplet, two runs
> agree), and their capture verifies `raw 0` both tiers with the producer key **cryptographically distinct
> from the verifier key**: the first evidence Simurgh did not generate. The CI-byte-stable evidence is a
> synthetic demo (the real capture is verify-only, not rebuildable — we don't hold the foreign key); real
> keyless-Sigstore rung-2 remains the → 9.5 lever. Rung-2 proves the key is _externally anchored_, **never**
> human/organisational non-collusion.
>
> </details>
>
> <details><summary>Prior — Stage 5F · Verifiable Multi-detector Panel Attestation (<code>v2.41.0-stage-5f-vmp</code>)</summary>
> The Completeness Invariant instantiated on a **detector panel**: one signed attestation binds N
> precommitted released detectors (Prompt Guard 2 86M + Llama Guard 4 12B) to one shared committed
> corpus, so every case discloses — for every member — a verdict **or a typed, policy-checkable
> non-result**. Selective omission across detectors becomes impossible to hide; **no aggregate panel
> verdict** is produced (panel completeness ≠ detection completeness). Six laws incl. **No Gerrymandered
> Universe** — precommit the detector universe and publish the signed **Omission Lower Bound**
> (`|universe| − |panel|`), the thing in-toto/C2PA structurally cannot express. Codes **268–282**,
> **8 Lean theorems + 1 lemma** (compile clean, zero `sorry`), **99 tests**, Lane B two-process
> ceremony, JS↔Python parity, a **BYO-Panel contract** (any team attests its own detectors offline),
> and a **strict-vs-attestation-only** policy so a truthful incomplete panel stays verifiable while the
> default CLI refuses to call it clean. **Real dual-detector capture EXECUTED** on live models —
> Prompt Guard 2 86M (CPU) + Llama Guard 3 1B (Apple-Silicon MPS/fp16) captured offline, verifying
> `raw 0` both tiers, with a real inter-detector disagreement (PG2 flags the injection `malicious`; the
> content-safety guard says `allow`) surfaced as observation, never an aggregate. Honest to its limits:
> the CI-byte-stable evidence is a synthetic demonstration; the 12B model on a GPU droplet and an
> independent-party capture remain the → 10 levers.
> </details>
>
> <details><summary>Prior — Stage 5E · Verifiable Deployed-detector Attestation (<code>v2.40.0-stage-5e-vda</code>)</summary>
> The first Simurgh stage whose evidence targets a **real, shipped, third-party detector** — Meta's
> **Llama Prompt Guard 2 (86M)** — at a **pinned open-weights revision, captured offline with zero
> vendor cooperation**. CI recomputes only arithmetic/geometry over a committed score table; the model
> runs once, offline (the 5B split). **Executed grounding (real, not planned):** over 8 published
> injection test vectors, **4 flagged at baseline and all 4 slip** under invisible combining-mark
> obfuscation, with **de-obfuscation recovering the original score exactly** — a real score-inversion
> defect; the other 4 are recorded as `baseline_missed` (full census, no cherry-pick). Evidence verifies
> `raw 0` at both tiers, byte-stable, and reproduces **cross-architecture** on a fresh x86_64 host.
> Inventions: the **score-inversion** ranking defect (two independent slip booleans, not a taxonomy) and
> the **Evasion–Threshold Curve** (evasion as a signed function of the operating point, with its
> false-positive cost). Laws: **No Straw Detector · No Tunable Excuse · No Forbidden Claim · No Silent
> Slip**. Codes **255–267**, **8 Lean theorems + 1 lemma**, JS↔Python parity (40 facts). Honest to its
> limits: a slip is a **chosen-threshold miss on a pinned revision — not a defeat** (the artifact is
> structurally unable to assert otherwise); **offline open weights ≠ a hosted endpoint**; and the
> droplet run is an **independent environment, not an independent party** (the → 10 lever: a real
> external team running the BYO adapter). Hardened by an **external review (12 blocking findings applied)**.
> </details>

<details>
<summary><b>Recent stages — 5D → 4W</b> (click to expand the prior rungs)</summary>

> **Stage 5D · Verifiable Adaptive Red-Team Ledger (`v2.39.0-stage-5d-varl`).**
> The first Simurgh stage whose evidence is a **multi-round arms race**: an untrusted adversary
> proposes evasions of the frozen 5C gate, a watcher recomputes every one against the pinned gate, the
> defender hardens, and the cycle repeats — completeness asserted over **rounds**. The executed
> grounding is **3 rounds, 18 verified slips, the defender losing each**, byte-reproducible, verifying
> to `raw 0` at both tiers. Headline invention: the **Normalization Trilemma** — over the buildable
> single-pass normalizer lattice, no corner has all three of {complete confusable closure, zero
> legit-diacritic over-block, fixed/data-free} (`trilemmaLatticeUnsat`, Lean). Laws: **No Silent Round ·
> No Unverified Slip · A Closure Is Not a Cure · The Adversary Is Untrusted**. Produced by a **key-free
> two-role ceremony** (attacker subagent + watcher); **Lane C executed live** — `claude-sonnet-5`,
> pinned, on the CVP-approved org, its provenance folded into the ledger. Codes **240–254**,
> **8 machine-checked Lean theorems**, Python + browser (WebCrypto Ed25519) parity.

> **Stage 5C · Verifiable Semantic Bypass Ledger (`v2.38.0-stage-5c-vsb`).** The first Simurgh stage
> to report a **non-zero observed slip count** as a first-class result. Over a total (metamorphic-
> relation × base) grid, the frozen 4X leakage engine leaves **9 slipped / 54 grid cells** (19 caught,
> 26 degenerate, 0 not-applicable), signed and byte-reproducible to `raw 0` at both tiers. The slip
> table is a **projection of the total grid**, so audit recomputes it and rejects any laundered-out
> slip. Laws: **No Silent Slip · No Cherry-Picked Mutation.** Ships a **BYO-detector adapter** (any
> external detector fills the same two-artifact contract) with a Prompt Guard worked example. Codes
> 225–239; 82 tests, seven Lean theorems (incl. `gridClosure`, `kernelDisjoint`), Python + browser
> (WebCrypto Ed25519) parity, a two-process blind-severity Lane B. Honest scope: `doc_residue` turned
> out to **share the leakage lexicon** (a distinct code-path, not a semantically independent detector),
> and the real-detector Lane C shipped as **adapter + stub, not an executed capture** — Frontier scored
> down accordingly.
>
> **Stage 5B · Verifiable Adversarial Readout (`v2.37.0-stage-5b-var`).** Executes a
> lexicon-restricted mean-Jacobian workspace-readout capture on an open ~1B model on commodity hardware
> (an 8 GB laptop, offline), captured **twice to byte-identical**, then **red-teams the whole
> introspection stack on a capture the attacker did not author** (No Author's Map). Every one of 46
> attacks binds to a **precommitted readout**, and the attestation confirms no bypass was silently
> laundered or omitted, with the attack-success rate recomputable from pinned inputs (ASR 0/46). As far
> as we know the first time a workspace readout of this kind is not only _attested_ but adversarially
> _stress-tested_ under a signed, offline-reproducible contract — retiring 5A's outstanding real-capture
> residual. Drives six frozen 4V→5A verifiers; seven Lean theorems; JS↔Python parity. Honest scope: a
> method family on open weights, not Anthropic's frontier lens; no live-adversary lane.
>
> **Stage 5A · Verifiable Narrative–Workspace Conflict (`v2.36.0-stage-5a-vnc`).**
> The J-lens paper's sharpest finding is a **disagreement**: the workspace readout shows
> `eval`-awareness firing while the model's verbalized output says nothing of the kind. When a lab
> publishes "the model reported it was not aware of being evaluated," that sentence binds to
> **nothing** — no readout, no completeness law, no recorded conflict. 5A ships the confrontation: a
> signed **conflict ledger** between a 4W span-typed **narrative** (what the system _says_) and a 4Z
> attested **workspace map** (what the telemetry _shows_), under **dual completeness** — every
> introspective claim gets exactly one verdict (`corroborated | contradicted | unreadable`) and every
> flag is either covered or listed unnarrated. Laws: **No Two Stories Inside · No Silent Claim/No
> Silent Flag · No Post-Hoc Claim Table · A Conflict Is Not a Lie.** A recorded contradiction is
> verified _content_; laundering it to corroborated is a failure (205). Codes 199–209; the claim
> table binds the map's **declaration_digest, never the map_digest** (precommitment can't be
> theater); real in-page **WebCrypto Ed25519**; six Lean theorems (incl. `conflictAntitone` — new
> telemetry can only surface conflicts, never launder them); blind two-process recompute; JS↔Python
> parity. **Pays** the `workspace_narrative_conflict` IOU in full (mints one frontier debt — the
> first ledger-shrinking stage). First **cross-species conflict** evidence — introspection vs.
> interpretability. Honest scope: the real 1B Lane C capture and a real external export were **not
> executed this build** (mechanisms shipped + fixture-verified; Frontier scored down accordingly).
> **No live-model adversary lane.**
>
> **Stage 4Z · Verifiable Workspace Attestation (`v2.35.0-stage-4z-vwa`).** Anthropic's
> J-lens paper (Jul 6 2026) shows a cheap internal lens surfaces a model's **silent** cognition and
> proposes it "to flag transcripts for review" — while conceding "monitoring the J-space is not
> sufficient." That flag stream ships with **no evidence contract**. 4Z is the contract: a signed,
> byte-reproducible attestation over **workspace-readout telemetry** — a **total readout grid**
> (every position × layer cell present exactly once: **No Silent Cell**), the **full score matrix**
> (every lexicon token per cell: **No Silent Token**), a **precommitted declaration** (No Post-Hoc
> Declaration — you can't cherry-pick WHAT/WHERE/WHICH-LAYERS after seeing the readouts), a
> dual-signal **self-report conflict** check, and a **withheld-tensor** public tier (the map verifies
> with the model-proprietary tensors kept private). The reference monitor is a lexicon-restricted
> mean-Jacobian lens on an open ~1B model (Lane C, digest-only). Laws: **No Silent Cell · The Readout
> Is Not a Verdict · No Post-Hoc Declaration.** Codes 190–198; scores serialize as **decimal
> strings** (BigInt-exact, JS↔Python-identical); real in-page **WebCrypto Ed25519**; six Lean
> theorems (incl. `lexiconMonotone` — provable only because there is no top-K); blind two-process
> recompute; and the **VSC — Verifiable System Card**, which **pays the three-stage
> `transparency_report_profile` IOU**: a system-card-shaped document whose every safety number
> recomputes from a verified artifact. First activation-derived evidence species. **No live-model
> adversary lane.** Honest scope: method-family replication, not the paper's frontier lens; the
> external-lab pilot is the minted 10-blocker.
>
> **Stage 4Y · Verifiable Document Residue (`v2.34.0-stage-4y-vdr`).** 4X measured the
> gate's residue over a corpus _we_ authored; 4Y hands the instrument to the world. Submit **any**
> UTF-8 document and get back a signed, byte-reproducible, **content-free structural residue map** —
> a total partition of every byte into `caught_v1` / `caught_v2_only` / `redacted` / `unflagged`
> (redaction is **counted, not erased**), plus a metamorphic **shadow** slip-rate — without
> republishing a word of the document. Two tiers: the **public** map + attestation verify by
> structural arithmetic + signed commitments (a withheld document still verifies), the **audit**
> tier re-runs the frozen gate over the bytes and rebuilds the whole map. Laws: **No Silent Region ·
> Same Bytes, Same Map · The Map Is Not a Verdict.** Codes 181–189; the browser verifier does a
> **real in-page WebCrypto Ed25519** check; six Lean theorems, JS↔Python↔browser parity, a blind
> two-process recompute, and an OSCAL projection into NIST's format. Over the 10-fixture corpus:
> **18 caught regions, 34 applicable variants, 15 slip v1, 2 slip v2** — the v2 lexicon shrinks the
> slip set but never closes it. No live-model lane. Honest scope: fixtures are self-authored (the
> external-submitter pilot is the one minted socket).
>
> **Stage 4X · Verifiable Leakage-Residue (`v2.33.0-stage-4x-vlr`).** 4W signed the
> prose limitation "the leakage gate is lexical, not semantic." 4X turns it into a signed,
> byte-reproducible **number** and shrinks the bound: over a frozen dual-provenance corpus, each item
> is a real quantitative seed plus a declared **metamorphic relation**, and the paraphrase residue is
> _derived_ as a pure function of the seed — so a reviewer reproduces the whole residue set. The
> verifier runs the real `vsn.leakage.v1` and an additive `vsn.leakage.v2` and reports the honest
> result: **v1 misses 6/6 metamorphic paraphrases; v2 shrinks the miss to 1/6, the irreducible
> semantic floor.** Laws: **A Signed Limitation Must Bleed a Number · The Gate Reports Its Own
> Misses · A Shrunk Bound Must Be Monotone.** No live-model lane and no adversarial elicitation by
> design; the public tier verifies by arithmetic while the audit tier re-runs the gate; five
> machine-checked Lean theorems, JS↔Python↔browser parity (hash-based CSP), and a one-command
> offline reproduce. Honest scope: the shipped corpus is a 6-item seed, and a lexical v2 shrinks but
> never closes the semantic residue.
>
> **Stage 4W · Verifiable Slot-Bound Narrative (`v2.32.0-stage-4w-vsn`).** The incident
> narrative _around_ the numbers becomes span-typed and contest-addressable: free prose plus a
> signed span map that types every claim-bearing span as `slot_bound` (recomputes against the
> sealed capsule), `judgment` (digest-bound), or `unverified_prose` (zero evidentiary weight, shown
> as voice). A frozen-lexical **leakage gate** fails closed on any undeclared claim-lookalike — so
> the story may say anything but cannot _imply_ evidence. Laws: **No Smuggled Claim · No
> Unanswerable Story · Voice Is Not Evidence.** It pays 4V's reserved narrative-contest socket (a
> `slot_bound` span reuses the 4V status table verbatim), reports an honest evidence-density triple,
> and ships a C2PA/in-toto bridge, five machine-checked Lean theorems, JS↔Python↔browser
> byte-parity, and a one-command offline reproduce. Honest scope: the gate is **lexical, not
> semantic** — paraphrase smuggling is named as the next (4X) attack surface, not claimed solved.

</details>

---

## What it is — and what it is not

| Simurgh **is**                                                       | Simurgh **is not**                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| A research prototype for **verifiable containment attestation**      | A jailbreak detector or a claim of jailbreak immunity          |
| Evidence of **downstream consequences** after a guardrail misses     | A model-level guardrail or a replacement for one               |
| **Offline-reproducible** with a committed public key                 | Dependent on any vendor, network service, or live model re-run |
| Measured over a **synthetic reference corpus** (Stage 3L, 180 cases) | Validated on real-world production traffic                     |
| Honest about its limits, with machine-readable **non-claims**        | A production-ready or compliance-certified system              |

Every signed artifact carries explicit non-claims, including: no jailbreak immunity; no general
jailbreak resistance; live models are not re-executed in CI; the origin of a live capture is
self-reported, not proven; signed evidence is not ground truth; and no vendor is ranked or labelled
unsafe.

---

## Design alignment with Claude's Constitution

In January 2026 Anthropic published
[Claude's Constitution](https://www.anthropic.com/constitution) (CC0 1.0), a public statement of the
values and safety commitments intended to shape its models. Simurgh is independent work, but it
shares the constitution's starting assumption — that no single safeguard is the last line of defence
and that human oversight of AI should not rest on trust alone — and several of its design principles
map directly onto the constitution's commitments:

| Constitution commitment                                                | Simurgh mechanism                                                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| The model "is not the only safeguard"; hard constraints are a backstop | Containment measured _after_ the guardrail misses; four post-guardrail boundaries; explicit non-claims of immunity               |
| Honesty: calibrated, non-deceptive, no misleading selective emphasis   | "Boundary held, verifiable" — never "model safe"; claim-checked ledger (Stage 3N); completeness rules against selective omission |
| Instructions embedded in content are information, not commands         | Intent-source grounding (Stage 4B) and provenance gating (Stage 4C): authority and egress only from trusted provenance           |
| Supporting, not undermining, human oversight of AI                     | Ed25519-signed, offline-reproducible evidence a third party can recompute without trusting any vendor, model, or lab             |
| Legitimacy tests for power: process, accountability, transparency      | Chain-position disclosure binding, a respondent contest path, and an independent browser verifier (Stage 4M)                     |
| Behaving consistently whether or not one is being tested               | Byte-reproducible evidence and tamper suites: the verified behaviour _is_ the behaviour, with no demonstration mode              |

One boundary is worth stating plainly: the constitution assigns good judgment to the model itself,
while Simurgh deliberately builds the mechanical verification layer around it. The two are
complements — a verifiable receipt is not a substitute for good values, and this mapping is a
statement of design orientation, not an endorsement by Anthropic and not a compliance or
certification claim.

### Matching Anthropic's interpretability research (July 2026)

The same complementarity now has a concrete counterpart on the interpretability side. In
[_Verbalizable Representations Form a Global Workspace in Language Models_](https://www.anthropic.com/research/global-workspace)
(Transformer Circuits, 6 July 2026), Anthropic shows a cheap internal instrument — the Jacobian lens —
surfaces a model's **silent** strategic and situational cognition that never reaches its output, and
proposes the readout as a tool "to flag transcripts for review." The same paper signs the honest
limit: it does "not feel comfortable making the stronger claim that monitoring the J-space is
sufficient" — automatic, well-practised computations can bypass it.

That is the seam Simurgh's verification layer is built for. **Stage 4Z (Verifiable Workspace
Attestation)** turns such a readout into a signed, byte-reproducible evidence contract:

- **the paper reads** silent cognition; **Simurgh attests** it — a total readout grid (No Silent
  Cell), a precommitted declaration (you cannot cherry-pick what/where/which-layers to look at after
  the fact), and a self-report conflict check, all recomputable offline by a third party;
- **the paper's own limitation** — monitoring is not sufficient — is precisely why an external,
  post-hoc, recomputable containment guarantee stays load-bearing: interpretability and verification
  are **uncorrelated failure modes**, the layered posture the cross-lab chain-of-thought
  monitorability work also calls for;
- the accompanying **Verifiable System Card** answers the transparency-report integrity gap the EU
  GPAI Code of Practice states but leaves unmechanised: a system-card-shaped document whose every
  safety number recomputes from a verified artifact.

**Stage 5A (Verifiable Narrative–Workspace Conflict)** takes the next step the paper implies. The
J-lens paper's own eval-awareness finding is a _disagreement_ between two witnesses — the readout and
the model's words. 5A makes that confrontation machine-checkable: a signed conflict ledger that
confronts every introspective claim in a model's narrative with every flag in its attested workspace
map, completely and recomputably, preserving disagreements undeniably (a contradiction is verified
content, never a lie). This is the honesty-about-internal-states principle rendered as infrastructure —
and the accompanying **Reflection-Corpus Provenance** manifest makes visible which constitution clause
shaped which reflection example, the scaffolding both the J-lens paper's §7 and _Teaching Claude why_
note is stripped before training.

**Stage 5B (Verifiable Adversarial Readout)** closes the loop from the other direction — and runs
the readout **for real**. It executes a lexicon-restricted mean-Jacobian capture on an open ~1B
model on commodity hardware (an 8 GB laptop, offline), captured **twice to byte-identical**, then
**red-teams the entire introspection stack on a capture the attacker did not author**. That
anti-circularity is the point: you cannot credibly test a conflict/leakage/hidden-cell detector on
evidence you generated, so 5B binds every one of 46 attacks to a **precommitted readout** (No
Author's Map) and attests that no bypass was silently laundered or omitted, with the attack-success
rate recomputable from pinned inputs. It is, as far as we know, the first time a workspace readout of
this kind is not only _attested_ but adversarially _stress-tested_ under a signed, offline-reproducible
contract — and it retires 5A's outstanding real-capture residual in the process.

Honest scope, signed in the stages themselves: Simurgh reproduces a lexicon-restricted **method family**
on open weights, not Anthropic's frontier lens; a flag is not a verdict, a readout is not faithfulness,
a recorded conflict is disagreement (never which side is true), and agreement is not model safety. The
1B Lane C capture is now **executed and byte-reproducible** (Stage 5B, on commodity hardware); what
remains signed as future work is a real external readout export, family-specific semantic red-team
mutations, and a live-adversary lane — all carried as named residuals, none claimed done. Details in
[`docs/research/llm-shield/JLENS_COMPOSITION.md`](docs/research/llm-shield/JLENS_COMPOSITION.md),
[`docs/research/llm-shield/NARRATIVE_WORKSPACE_CONFLICT.md`](docs/research/llm-shield/NARRATIVE_WORKSPACE_CONFLICT.md),
and [`docs/research/llm-shield/STAGE_5B_CLOSEOUT.md`](docs/research/llm-shield/STAGE_5B_CLOSEOUT.md).

---

## Flagship: Verifiable Containment Attestation (LLM Shield)

The current work is a ladder of signed, independently reproducible research rungs (**Stage 3A → 5N**,
releases `v1.6.0` → `v2.49.0`). The attestation rungs produce Ed25519-signed,
metadata-only evidence bundles and offline checkers that re-derive their bounded claims byte-for-byte.

### The concrete result (Stage 3V-B)

A **real, live Llama Guard 4 12B** was run once as an input-only content-safety classifier over the
Stage 3L synthetic 180-case reference set, captured, frozen, and signed (the model is **not**
re-executed in CI):

| Metric                                                              | Result                                    |
| ------------------------------------------------------------------- | ----------------------------------------- |
| Llama Guard 4 allowed / blocked                                     | 168 / 12                                  |
| Malicious cases the guardrail **missed** → **contained by Simurgh** | **138 / 138**                             |
| External-guardrail-plus-Simurgh targeted attack-success rate        | **0 / 150**                               |
| Unsafe tool execution / output export / context escalation          | 0 / 0 / 0                                 |
| Capture determinism                                                 | 3 independent greedy runs, byte-identical |

An input-only guardrail can only judge the user turn; in the 120 downstream-injection cases the
attack lives in untrusted context, tool requests, or provider output, which it structurally cannot
see. Simurgh's context, tool, and output boundaries contained every case it missed. This is a
**boundary claim**, not a statement that Llama Guard 4 is weak.

### The replay map (Stage 3X)

Stage 3X turns the whole chain into a public, externally replayable timeline:

- **12 / 12** rungs tag-and-commit pinned
- **10 / 12** evidence-root manifests pinned and chain-checked
- **5 / 12** deep per-file re-walk (current-format manifests, under strict path-containment rules)
- **3 / 12** full reproduce paths
- **2 / 12** index-only, each with a signed reason

It does **not** claim uniform 12/12 reproduction — the chain tells the truth about its own uneven
history, with a machine-readable summary and a per-rung reason for every classification.

### Proof-carrying containment (Stage 4H)

Stage 4H adds a proof-carrying containment checker on top of the VCA spine. It verifies a signed
evidence digest and binding foundation (4H.0), an explicit-flow DFI certificate with an
independently checkable derivation proof (4H.1), a Q0/Q4 discrimination ledger that distinguishes
clean, forged, unsound, and partial derivations (4H.2), Q6/Q7 tamper-closure and bounded-capacity
privacy gates (4H.3), a Q3 offline-hermetic checker preflight plus a total typed exit wrapper
(4H.4), and a final one-command reproduce path with byte-stable evidence, anti-theatre deletion,
reviewer smokes, and closeout docs (4H.5).

Released as [`v2.18.0-stage-4h-proof-carrying-containment`](https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.18.0-stage-4h-proof-carrying-containment)
at commit `7a2039136d44cf179cca5836a33596a7620c87e5`. The release worktree verified
`scripts/reproduce-llm-shield-stage4h.sh`, `npm test` (`1202` passing), `npm run format:check`,
and `git diff --check`. A follow-up full-chain audit exercises 4H.0 → 4H.5 and the public Stage 4H
checker surface before Stage 4J/PCTA; it is a released-artifact audit, not a new runtime claim.

---

## Architecture & the VCA ladder

The defence acts _after_ the input filter can fail — untrusted input passes through four containment
boundaries, and every run is sealed into signed, offline-reproducible evidence. The ladder below
traces the work from the input shield (3A–3C) through containment (3D–3L), signed attestation
(3M–3X), and proof-carrying containment (4H).

[![Containment architecture and the VCA ladder, 3A to 3X](docs/research/llm-shield/vca-architecture.png)](docs/research/llm-shield/vca-architecture.html)

> Source (self-contained, printable):
> [`docs/research/llm-shield/vca-architecture.html`](docs/research/llm-shield/vca-architecture.html)

---

## Capabilities

Everything below is implemented, tested, and (for the attestation work) shipped as signed,
offline-reproducible evidence. All capabilities are research-prototype grade and bounded by the
documented non-claims.

### Containment gateway (post-guardrail boundaries)

- **Input firewall** — prompt normalisation and classification of direct-input attacks.
- **Context-provenance guard** — blocks untrusted/tool-supplied context from gaining developer or
  system authority.
- **Tool-invocation gate** — refuses unauthorised or self-authorised tool/shell requests.
- **Output-leakage firewall** — prevents export of system prompts, secrets, and internal policy.
- **Containment evaluation** — assumes the input filter can fail and measures whether the downstream
  context/tool/output/audit boundaries prevent unsafe consequences (Stage 3L: 120/120 input-miss
  cases contained at their intended boundary; targeted ASR 0/150; 30/30 benign).

### Verifiable attestation & offline reproducibility

- **Ed25519-signed, metadata-only evidence bundles** over canonical JSON (signature survives
  formatting and merges; raw prompts and model outputs are never exported).
- **Two-tier verifiers** — a portable signature/structure check plus a `--reproduce` mode that
  re-derives the bundle byte-for-byte; all verifiers **fail closed** and never throw.
- **Negative self-proof (tamper) suites** on every rung — mutated evidence is rejected, counters stay
  zero.
- **Generic evidence-hashes verifier** with hardened path-containment (rejects self-inclusion,
  traversal, and escapes).
- **Claim-checked ledger** (Stage 3N) and **attestation registry + signed regression diff** (Stage
  3Q) with anti-laundering lattice.
- **Proof-carrying containment checker** (Stage 4H) — signed digest binding, DFI derivation proof,
  Q0/Q4 discrimination, Q6/Q7 tamper/privacy gates, Q3 offline preflight, total typed exits,
  byte-stable reproduction, and anti-theatre deletion.

### Agent oversight & verifiable friction

- **Capability kernel** (Stage 4A–4C) — a pure, dependency-free authorisation authority: task-grounded
  egress/mutation gates, intent-source grounding, and provenance gating so authority and egress flow
  only from trusted provenance.
- **Verifiable friction receipts** (Stage 4Q) — a signed, epoch-bound, ordered proof that an
  approval-gate checkpoint preceded a protected authority crossing, enforced by a **two-key pincer**
  (causal digest binding + chain-position precedence + a distinct approver key). **No Silent
  Exemption**: an unbound crossing must carry a signed, policy-falsifiable exemption (an affirmative
  policy allowlist, fail-closed by default) rather than a silent gap. Exercised by a 15-case
  normative corpus and a 10-arm live approval-gated capture over a genuinely separate approver
  process, with JS↔Python byte-parity and five machine-checked Lean theorems. Scope is honest and
  signed: recorded-run order, not physical time; enforcement evidence, not proof of prevention.
- **Private custody corroboration** (Stage 4R) — two operators corroborate shared custody-class
  membership without publishing a linkable **herd token**: a real-DDH curve25519 (Edwards form) match
  ceremony with commit-before-reveal, **DLEQ-verified** sealed audit packets (so a single liar can't
  fabricate a match), epoch-bound unlinkability, VFR-gated export, and a count-only window census.
  Zero new dependencies (an in-repo Edwards25519 group gated against RFC 8032 + Node Ed25519), JS↔Python
  byte-parity, a two-real-process Lane B with a distinct-key approver, and six machine-checked Lean
  theorems. Scope is honest and signed: reference research crypto, not production; audit-tier
  DLEQ verification, public tier digest-level; not a full VOPRF.
- **Delegation-chain completeness** (Stage 4S) — a delegated agentic authority **tree** cannot omit,
  invent, replay, over-spend, over-scope, or ghost-hop authority without producing an offline-verifiable
  verifier failure. Each hop is a **dual-signed** receipt (a hidden hop needs both neighbours to
  withhold signatures); every delegator commits its **exact child set** at window close (the liar must
  ledger the lie); scope attenuates as a lattice and budgets conserve as a flux law across the tree
  (structuring-by-delegation cannot exceed the root budget). The **No Ghost Hop** law is enforced at the
  Capability Kernel (`authorise_with_chain`, a sixth additive family member; five predecessors frozen).
  Raw codes 100–118, a deterministic Lane A corpus reaching every reachable code, JS↔Python byte-parity,
  a two-real-process Lane B over a genuine **MCP stdio** delegation hop, a two-tier signed attestation,
  and six machine-checked Lean theorems (including inclusion≠completeness). Scope is honest and signed:
  chain held **verifiable**, never "agents safe"; Merkle inclusion is presence, not completeness;
  attenuation enforcement is prior art — our claim is the offline-recomputable proof.
- **Verifiable Due Process** (Stage 4V) — the first regulator-rerunnable incident report **the accused
  can answer in a rerunnable way**, under three laws: **No Trial in Absentia**, **Same Rules for the
  Defence**, **No Strawman**. A respondent files a signed **counter-capsule** bound to the exact sealed
  4T capsule (root, attestation digest, schema version, signing-key fingerprint, contested-section-set
  digest) and contests each section by one of three verbs: agree, dispute-by-recomputation (carrying its
  own Merkle-sealed evidence census under the operator's identical census laws), or dispute-as-judgment
  (prose sealed by digest only). The verifier derives — deterministically, offline — a **conflict map**
  assigning each section one of five statuses (`AGREED`, `CONFLICT_PROVEN`, `ABSENCE_REBUTTED`,
  `DISPUTE_RECORDED`, `DISPUTE_FAILED`); it never declares a winner. Inventions: **absence rebuttal**
  (contesting what the operator said could NOT be derived — the respondent-side dual of 4T suppression
  detection); the **anchor contest** + `filed_at_beat` (a two-sided recomputable clock over the 4N
  heartbeat); the **Mirror Test** (a self-contest that must return all-`AGREED`, proving the scoring
  function carries no party-bias term — Lean-twinned); and **contest-as-subpoena** (filing forces the
  capsule to re-prove itself, and the sealed outcome envelope records the result). Provider-safe first,
  then reviewer-safe. Raw codes 151–161; five machine-checked Lean theorems (`noTrialInAbsentia`,
  `noStrawman`, `sameRulesForDefence`, `disputeLocality`, `mirrorAllAgreed`); a two-process
  respondent-blind Lane B capture; JS↔Python↔browser parity. The kernel is imported **read-only** (no new
  `authorise_*` entry; 4A–4U byte-frozen). Honest signed limitations: single round (no surrejoinder);
  respondent key proves continuity of one voice, not identity; absence rebuttal is registry-bounded; both
  Lane A parties are built by us.
- **Verifiable red-team attestation** (Stage 4U) — a charter-bound adversarial red-team of the VDCC
  verifier itself, under the **No Silent Bypass** law. Before any attack runs, an Ed25519-signed
  `red_team_charter` precommits the campaign (seed, exact family counts, an attack-manifest Merkle root,
  denial-of-wallet caps); the verifier refuses to score any attack not bound to the charter, so **the
  red-team cannot hide its own wins**. A 58-fixture offline corpus across eight families drives the 4S
  engine to an honest **ASR 0/58** (every malformation contained); a dual-signal lie detector separates a
  dishonest self-report (127) from an invalid classification (128) from a non-reproducing recompute (129);
  a two-tier signed attestation, JS↔Python parity, and two machine-checked Lean theorems
  (`charterBindingSound`, `asrMonotone`) complete it. Raw codes 119–132; the kernel and 4S verifier are
  imported **read-only** (no new `authorise_*` entry). Scope is honest and signed: the charter proves
  **declared scope, not inner intent**; a confirmed bypass is a recorded outcome, not a verification
  failure; a live Fable-5 refusal is recorded as `model_refused`, never rephrased to bypass it.
- **Verifiable Incident Capsule** (Stage 4T) — the first serious-incident report a regulator can
  **rerun**, under the **No Hearsay** law. One signed capsule per incident epoch projects the receipt
  spine onto BOTH pinned European Commission reporting templates (the published GPAI Art-55 systemic-risk
  template and the Art-73 high-risk draft — real transcriptions of record). Every template section either
  recomputes from a Merkle-sealed epoch **census** or signs its absence (`not_derivable` /
  `requires_human_input`); **suppression detection** makes hiding derivable evidence a failure (143/144),
  not just fabricating it (141). The **No Two Stories** law binds regulator / insurer / public audience
  views to one capsule root — a view may redact but never contradict, and every redaction is ledgered
  (148/149). Honest published finding: only **6 of 22** template sections are machine-derivable from the
  spine. Raw codes 133–150; four machine-checked Lean theorems (`noHearsay`, `suppressionDetectable`,
  `censusExactness`, `noTwoStories`); a live two-process MCP Lane B; a static browser verifier
  (convenience view — the CLI two-tier verifier remains authoritative); byte-stable reproduce. No new
  `authorise_*` entry — the kernel and 4S verifier are imported **read-only**. Honest and signed: the
  capsule proves record completeness, never harm causation; the seriousness classification is
  `requires_human_input` — the capsule refuses to invent a legal conclusion.

### External-defence evaluation

- **Provider-agnostic adapter contract** that treats any external guardrail as an untrusted advisory
  signal, with harness-computed hashes (no adapter-supplied hashes).
- **Live model capture** — a transport-only harness runs a real model once, freezes the output, and
  attests it; the model is never re-executed in CI (Stage 3V-B: **Llama Guard 4 12B**).
- **Recorded-fixture mode** (Stage 3V-A) for deterministic, GPU-free evaluation.

### Agent-evaluation integration

- **AgentDojo harness** (Stage 3H–3J) — in-loop mediating defence against a real gateway, scored
  without altering AgentDojo itself; full four-suite deterministic run reported **benign 97/97, UUA
  949/949, attack-success 0/949**.
- **Adaptive-attack readiness probe** (Stage 3K) — deterministic, key-free mutation/action-open
  campaign.

### Supply-chain & release provenance

- **Witnessed release provenance** (Stage 3W) — a dual-root model: a local Ed25519 root plus an
  additive GitHub OIDC/Sigstore CI witness that re-verifies from real command exits, corroborating
  by digest equality without ever gating offline verification.
- **Public VCA timeline + one-command external reproduction** (Stage 3X).

### Capability-extraction attestation

- **Offline, red-team-hardened distillation/extraction detector** (Stage 3T–3U) over synthetic
  metadata, with a frozen versioned detector and signed known-limitations — framed as a reproducible
  recipe, never an accusation.

### Live gateway

- **Provider gateway** (Stage 3E) with an optional, disabled-by-default Anthropic adapter: lazy SDK
  import, minimal-context summaries, denial-of-wallet caps, no provider tools, and a sealed
  containment tail.

### Device-integrity proofs (cross-platform)

- **Metadata-only display-affinity scanning** on macOS, Windows, and Linux (X11 + Wayland portal
  probe), **P-256-signed localhost-daemon proofs** with session/exam/challenge binding, server-side
  tamper/replay/raw-field rejection, and an **HMAC-SHA-256 tamper-evident audit chain** — collecting
  no video, audio, biometric, or personal-identity data.

### Engineering & assurance

- A single **quality gate** (`scripts/check.sh`): per-stage smoke, security/privacy/consistency
  audits, policy-drift guards (tooling stages never touch `src/llmShield`), and function-path
  coverage on the pure attestation/checker libraries. The current baseline (through Stage 4Q)
  verifies **1559 automated tests** passing.

---

## Reproduce it yourself (offline, no private key)

A reviewer with no prior context can replay the chain in three commands. Network is used only to
clone and install dependencies; verification itself is fully offline.

```bash
git clone https://github.com/Raoof128/Project-Simurgh.git
cd Project-Simurgh
npm ci
scripts/reproduce-vca-chain.sh
```

Expected: `Stage 3X VCA chain reproduction: PASS` with `rungs_passed: 12, rungs_failed: 0`.

> Use a full clone (or run `git fetch --tags` after a shallow clone): Stage 3X verifies 12 historical
> release tags, so they must be present locally. The reviewer command preflights this and prints an
> exact instruction if any are missing.

Replay the released Stage 4H proof-carrying containment checker:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected: `Stage 4H.5 final reproduce: PASS`. This verifies the signed Stage 4H evidence, typed
fail-closed exits, offline preflight, byte-stable evidence, and anti-theatre deletion without a
private key.

Replay the Stage 4Q Verifiable Friction Receipts stage (offline, no private key — Node ≥ 26):

```bash
scripts/reproduce-llm-shield-stage4q.sh
```

Expected: `[stage4q] reproduce OK`. This runs all ten gates — unit suites, Python + JS↔Python
parity, both fixture lanes with byte-idempotency, offline attestation verification, **be-your-own-
approver** decision-equivalence, privacy scan, private-key audits, and the K7 all-functions net.
Or be the approver yourself:

```bash
node -e 'const c=require("node:crypto"),fs=require("node:fs");fs.writeFileSync("/tmp/my-approver.pem",c.generateKeyPairSync("ed25519").privateKey.export({type:"pkcs8",format:"pem"}));'
node tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs docs/research/llm-shield/evidence/stage-4q/vfr-attestation.json --approver-key /tmp/my-approver.pem
# -> stage4q verify: byo_decision_equivalent (raw 0)
```

Replay the latest rung — **Stage 5D Verifiable Adaptive Red-Team Ledger**, a signed multi-round
attack↔harden arms race over the frozen 5C gate (offline, no private key):

```bash
scripts/reproduce-llm-shield-stage5d.sh
```

Expected: `Stage 5D VARL reproduce: ALL PASS`. The audit tier **re-verifies all 18 slips across the 3
rounds against the pinned gate** and confirms each recorded code; it also checks byte-stability of the
signed ledger at both tiers, the `trilemmaLatticeUnsat` corners, durability classification, the
in-page WebCrypto Ed25519 browser check, JS↔Python parity, and the K7 all-functions net.

Verify a single signed rung directly, and confirm it fails closed under tampering:

```bash
node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce   # -> { "ok": true, ... }
node tests/e2e/llm_shield_stage3x_tamper_runner.mjs                       # -> { "all_passed": true }
```

---

## Device Integrity track (prior published work)

Simurgh's first arc produced privacy-preserving **device-integrity proofs** for capture-resistant,
high-stakes sessions (e.g. proctoring and voting-adjacent workflows): metadata-only display-affinity
scanning across macOS, Windows, and Linux, P-256-signed localhost-daemon proofs with
session/exam/challenge binding, server-side tamper and replay rejection, and an HMAC-SHA-256
tamper-evident audit chain. It collects no video, audio, biometric data, answer content, raw process
names, window titles, PIDs, usernames, or personal identity data. This track is a frozen research
prototype and makes no production-deployment, MDM, hardware-attestation, or automatic-misconduct
claim. See [`PRIVACY.md`](PRIVACY.md), [`docs/ETHICS.md`](docs/ETHICS.md), and
[`docs/DISCLAIMER.md`](docs/DISCLAIMER.md).

### Research papers (Zenodo preprints)

| Paper                                                                                               | DOI                                                                | Source                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| Privacy-Preserving Device Integrity Proofs for Capture-Resistant High-Stakes Sessions               | [10.5281/zenodo.20374849](https://doi.org/10.5281/zenodo.20374849) | [`papers/project-simurgh/`](papers/project-simurgh/)           |
| Privacy-Preserving Integrity Evidence for Student-Society Voting-Adjacent Workflows (Phase C pilot) | [10.5281/zenodo.20549736](https://doi.org/10.5281/zenodo.20549736) | [`papers/simurgh-voting-pilot/`](papers/simurgh-voting-pilot/) |
| Banking Shield: Machine-Checked Absence Claims for Privacy-Sensitive AI Explanations                | [10.5281/zenodo.20675513](https://doi.org/10.5281/zenodo.20675513) | [`papers/banking-shield/`](papers/banking-shield/)             |

> Abedini, M. R. (2026). Zenodo.

---

## Repository layout

| Path                                 | Contents                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `src/llmShield/`                     | Containment gateway boundaries (input firewall, context-provenance guard, tool gate, output firewall) |
| `tools/simurgh-attestation/`         | Ed25519 signing, canonical-JSON, two-tier verifiers, public VCA timeline, Stage 4H checker tooling    |
| `tools/external-defense-adapters/`   | Adapter contract + Llama Guard 4 adapter (Stage 3V)                                                   |
| `tools/capture/`                     | Transport-only model-capture harness (run once, then frozen)                                          |
| `docs/research/llm-shield/evidence/` | Per-stage signed evidence bundles and checker evidence (3M → 4H)                                      |
| `scripts/`                           | Quality gates, per-stage smoke/audits, and `reproduce-vca-chain.sh`                                   |
| `papers/`                            | Published research preprints                                                                          |

---

## Verification

The full quality gate (`scripts/check.sh`) runs on every push. The current baseline (through Stage
5N, `v2.49.0`) verifies with **3,057 automated unit tests** plus per-stage smoke gates,
security/privacy/consistency audits, policy-drift guards, typed-exit checks, and checker/reproduce
smokes. Every VCA rung is
signed with its own Ed25519 key (private keys are never committed), reproduces byte-identically
including its signature where claimed, and ships a negative self-proof (tamper) suite that the
verifiers reject while failing closed.

---

## Status

Research prototype and technical demonstrator. The VCA / LLM-Shield line is the active front; the
device-integrity track is frozen prior work. Nothing here is deployed in production; no hardware
attestation, notarisation, MDM deployment, or compliance certification is claimed. Methodology is
LLM-assisted and disclosed in the research write-ups; claims are bounded by the signed evidence,
verifier outputs, and documented non-claims.

## License

Licensed under AGPL-3.0. © 2026 Mohammad Raouf Abedini. Authored and owned by the project
maintainer; see the research papers for full citations.
