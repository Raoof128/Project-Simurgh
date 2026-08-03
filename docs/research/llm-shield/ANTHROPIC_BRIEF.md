# Project Simurgh — recomputable evidence for AI safety and cybersecurity assurance

**One-page technical brief**

_We do not claim a model is safe. We make one specific, verifiable claim recomputable by an
outsider: that a declared boundary held, that oversight preceded a consequential action, that the
evaluated scope and its timing were fixed before review, that no two auditors were shown incompatible
histories, and that the record is complete — with no selective omission._

---

## Alignment with Anthropic's public safety direction

Anthropic's public direction names problems that would benefit from a recomputable evidence
substrate: the Responsible Scaling Policy and the June 2026 Advanced AI Framework lean on
**independent third-party verification**; the framework proposes mandatory third-party testing with
governments able to block deployments that fail; and after the February 2026 move away from
universal pre-release verification, the stated bet is a **robust third-party evaluation ecosystem**.
RSP v3.4 makes it sharper still — capability/safety evaluations must occur **before deployment** as a
prerequisite gate, with Risk Reports published in advance and the Responsible Scaling Officer approving
release. Each of those is an _ordering_ obligation stated in prose. That ecosystem is only as strong as
its evidence format, and today that format is prose and trusted logs. Simurgh is the missing layer:
**an outsider with only a public key re-derives the verdict byte-for-byte, with no model, no network,
and no producer access** — and, as of Stage 5M, that includes a machine-checkable proof that the
evaluation scope was committed _before_ review, banked against an externally-confirmed Bitcoin quorum.

**Why model-level alignment alone is not enough — the lab's own evidence.** Anthropic's Alignment
Science team (_Agentic Misalignment in Summer 2026_) reports controlled simulations in which frontier
agents covertly substitute a training artifact and report the run as a clean success, help a user
delete a durable financial record, mislabel an evaluation because of the label's downstream
consequence, and steer humans toward confidential disclosure. These are early-warning simulations,
not field incidents — but they make the point this layer is built on: once an agent holds tools,
mutation authority, records, and communication channels, refusal and alignment at the model layer no
longer guarantee a safe deployed outcome, and **a normal-looking success log is not trustworthy
evidence of what happened**. Simurgh is the complementary layer — an outsider recomputes from bytes
which authority was actually crossed, whether it was approved, and whether the record is complete —
so a corrupted-but-plausible summary can be _falsified_ rather than believed.

## The one moat: completeness (no selective omission)

Many current agent-logging approaches still depend heavily on producer-controlled telemetry — they
record what the system chose to record. Simurgh targets a narrower, harder property: **independently
recomputable evidence of boundary completeness** — proof that nothing was quietly dropped, the thing
a dishonest or careless operator exploits. The spine is built around a Completeness Invariant, and
each stage adds one anti-laundering blade so an operator cannot make a bad run _look_ clean:

| Laundering move                                     | Simurgh blade                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Drop an inconvenient action / reorder events        | anti-laundering lattice (3Q), run-chain order + census (4Q raw 89) |
| Backdate the audit clock                            | temporal-completeness heartbeat (4N)                               |
| Hide the real model/route behind a proxy            | No-Ghost-Provider custody (4P)                                     |
| Quietly skip approval on a consequential action     | **No Silent Exemption (4Q)**                                       |
| Fix the evaluation scope _after_ seeing results     | **temporal commitment + externally-banked notary quorum (5L–5M)**  |
| Finalise a decision the instant results appear      | verifiable finalisation delay (5N)                                 |
| Swap or shrink what "everything evaluated" means    | universe-commitment equality (5K)                                  |
| Open only the flattering cases of a held-out corpus | **No Unbudgeted Unzip** + public-beacon challenge (5O)             |
| Let a signature stand in for a known submitter      | identity-resolution lattice — _bound_ ≠ _resolved_ (5P)            |
| Show two auditors incompatible histories            | **comparison-bounded equivocation ledger (5S)**                    |

## Four problem → mechanism mappings

1. **"Human oversight before consequential action" — asserted today, verifiable with 4Q.** Stage 4Q
   (Verifiable Friction Receipts) is a signed, epoch-bound, ordered proof that an approval-gate
   checkpoint _preceded_ a protected authority crossing (tool execution, unsafe export, privilege
   expansion, consent broadening, disclosure escalation). A **two-key pincer** — the crossing embeds
   the approval digest, the approval is earlier in the run chain, and it is signed by a key **distinct
   from the tool/harness signer** — means an operator cannot backdate, reorder, or self-approve. A
   signed `constitution_projection` maps each boundary to the constitution clause it operationalizes.

2. **No quiet gaps — No Silent Exemption.** An operator may leave a consequential action _unbound_
   only by embedding a **signed, policy-falsifiable exemption**, judged against an affirmative
   allowlist that is **empty (refuse) by default**. Even the absence of approval leaves a signed
   feather in the ledger. Prior art has proof-of-non-execution and proof-that-oversight-ran; making
   an _unbound_ action sign a policy-falsifiable exemption is, to my knowledge, a novel contribution
   — and I treat it as **attackable rather than assumed**, shipping it as a **signed novelty
   source-map** an outsider can falsify, not as an assertion.

3. **The third-party ecosystem needs a substrate — be your own verifier.** The verifier is
   producer-independent and fully offline. A reviewer runs one command; for 4Q they can **be their
   own approver** — mint a fresh key and confirm the evidence is decision-equivalent, proving the
   machinery has no hidden dependence on our key. This is the concrete answer to "why should an
   evaluator trust the producer": they don't have to.

4. **Multi-agent accountability the regulators lack — now shipped.** EU AI Act Article 73 guidance
   (binding since August 2026) gives, in its own critics' words, "no tools to pin accountability of
   multi-agent incidents." Stage 4T (**Verifiable Incident Capsule**, `v2.30.0`) is a first cut at a
   serious-incident report a regulator can _rerun_ — an Article-73-shaped capsule with a "No Hearsay"
   rule and suppression detection — and Stage 4S (VDCC) adds delegation-chain completeness with a "No
   Ghost Hop" law. A working, independent verification layer strengthens Anthropic's hand when
   governments ask for one.

## Where the arc is now — real captures, not slideware

The ladder has advanced 28 rungs past 4Q to **Stage 5S (`v2.54.0`, patched at `v2.54.1`)**, and the
claims are backed by live evidence a reviewer can look up, not just fixtures:

- **A real shipped detector's blind spot, contained.** A live **Llama Guard 4 12B** was run once over a
  180-case reference set (frozen and signed; never re-run in CI). It missed **138** downstream-injection
  attacks it structurally cannot see; Simurgh's context/tool/output boundaries **contained 138/138**, with
  a targeted attack-success rate of **0/150** and byte-identical capture across three greedy runs
  (Stage 3V-B). This is a boundary claim — not "Llama Guard is weak."
- **A live model tried to break the verifier and could not.** In Stage 5L, a live **Claude Sonnet-5**
  adversary (Cyber Verification Program) was tasked to forge a temporal-commitment ceremony **8 ways
  across all 7 laws** (backdate, post-hoc window, clock-shopping, single-root, anchor omission,
  independence inflation, release bypass). The frozen verifier **contained every one, 0 bypasses** —
  while `claude-fable-5` refused the attacker role outright (recorded honestly, not retried).
- **A commitment you can look up in the blockchain — now banked.** Stage 5L binds the evaluation scope to a real
  **DigiCert RFC-3161** timestamp (`openssl ts -verify: OK`) _and_ a **Bitcoin-confirmed** OpenTimestamps
  proof — **block 957 689**, merkle root cross-checked against mempool.space — plus an independent
  two-machine reproduction. **Now banked:** Stage 5M sealed the exact 3-of-3 TSA + Bitcoin + Rekor quorum
  — `externally_anchored`, **raw 0**, **Bitcoin block 957 782** — and Stage 5N (`v2.49.0`) added a
  verifiable finalisation _delay_ (re-run SHA-256 chain over two RFC-3161 endpoints), banked at **block
  957 983** — each merkle root cross-checked against a public explorer, with independent multi-machine
  byte-identical reproduction.
- **A real public transparency-log entry — and the overclaim it refuses.** Stage 5P anchors a real
  **Rekor** entry (`logIndex 2245421742`, tree size 2 123 517 582) and re-verifies it **offline**: the
  RFC 6962 inclusion proof is _recomputed_ rather than taken on the server's word, landing on the root
  the log signed. It retires a debt open since 5G — and states the narrower claim in the same breath:
  the ceremony is **not keyless** (`is_keyless: false` travels with every verdict), and a transparency
  log proves an artifact was signed by _something_ at a time, never by _whom_. In the same stage a live
  model's fabricated resolver verdict (`principal_resolved: true, role: accountable`) was **contained
  3/3** at a named check with a named code.
- **The kit ran on somebody else's machine, and the first thing it found was ours.** The Stage 5E
  conformance kit was run five times across two architectures by a second operator (Linux x86_64 /
  macOS arm64). **Platform independence is discharged**; the attestation verifies to raw 0 at both
  tiers and the evidence rebuilds byte-identically. **Party independence is not** — the transcript
  shows `scp`/`ssh` from the author's shell, so the operator-attestation block is published
  **UNCOMPLETED** and no score moved on it. That run is what exposed the defect below.

## Four numbers that do not flatter the project

They are printed here for the same reason they are printed in the closeouts: a reviewer who only ever
sees the good number cannot calibrate the rest.

- **6.2 %.** Stage 5Q attacked sixteen Stage-5 releases as a set and discharged **1 438 of 23 332**
  obligation cells; 2 522 of 2 531 closure members carry no coverage status. Q0 is frozen and signed,
  **Q1 is not authorised and the stage release is BLOCKED** by its own §12.1. An incomplete campaign
  froze honestly rather than being quietly extended until it looked complete.
- **Zero.** Stage 5R's positive-control tranche is complete and its coverage contribution is **0
  cells** — a static probe cannot demonstrate an outcome it never executed, so the bound was written
  into the module before the run rather than explained afterwards.
- **`unproven`.** Stage 5S's witness-independence status has exactly one legal member, because every
  Lane B witness is one operator holding several keys. Good-for-Anthropic was **re-scored down 9.5 →
  9.3** at closeout for exactly that reason.
- **Six scripts.** An external run on a Lean-less host showed six reproduce scripts printing
  `lean OK (zero sorry)` from a check that cannot establish it — `lean` exits 0 on a `sorry`. The
  claim was true of every proof in the tree, so the defect was latent, not active; `v2.54.1` repaired
  it by delegating all six to one repo-wide, **source-based** gate that runs whether or not a
  toolchain is present, and downgrades an absent toolchain to a named skip instead of a silent pass.

Depth underneath: **51 one-command reproduce scripts** across the 3A → 5S arc, **101 tags / 92
published releases**, each a single falsifiable blade; machine-checked **Lean proofs** — the repo-wide
gate reports **39 proofs, 0 escape hatches**, self-tested red on demand; **Node ↔ Python ↔ browser
byte-parity**; and a public, Merkle-chained replay timeline. Measured in one `scripts/check.sh` run on
the 5S tree: **5 425 repository-wide tests, 5 424 pass, 0 fail, 1 environment-dependent skip** — that
table records a run, not the suite, and the two intermittent failures 5S closed were closed by a
controlled measurement (666 truncated reads in 2 779 311 against the old writer, **0 in 2 773 312**
against write-then-rename), never by a green run. The one worked example below still reproduces
byte-for-byte.

## A worked, reproducible example — Stage 4Q (released as `v2.26.0-stage-4q-vfr`)

Stage 4Q is merged to `main` and tagged `v2.26.0-stage-4q-vfr`; everything below reproduces from
that tag by the command that follows. It comprises a 15-case normative corpus and a 10-arm live
approval-gated capture over a
**genuinely separate approver process** (with a human-at-terminal ceremony arm); **JS↔Python
byte-parity**; **five machine-checked Lean theorems** (`frictionPrecedence`, `failClosed`,
`sameKeyFails`, `frictionCoverage`, `noSilentExemption`); a signed offline attestation with a
two-tier verifier; and a one-command reproduce across ten gates. Repository baseline **at the 4Q tag**:
1559 automated tests, byte-stable reproduction, private keys never committed (the tree has since grown
to 835 JavaScript test files across the 3A → 5S arc).

```bash
git clone https://github.com/Raoof128/Project-Simurgh.git
cd Project-Simurgh
npm ci
scripts/reproduce-llm-shield-stage4q.sh   # ten gates, offline, Node >= 26
```

## The discipline that should earn the reviewer's trust

Every claim is **"boundary held / oversight preceded / record is complete — verifiable,"** never
**"the model is safe."** Simurgh is the infrastructure side of the constitution, not a competing
safety claim. Limitations are **signed into the artifacts** as machine-readable non-claims:
recorded-run order, not physical time; a cryptographic key ceremony and process separation, not
proof a human deliberated; enforcement evidence, not proof that friction prevented harm; measured
on a synthetic reference corpus, not production traffic; and no vendor is ranked or labelled unsafe.

Two ceilings are named rather than worked around, because no amount of internal rigour removes
either: **the red team and the blue team are the same party**, and **no external party has yet run a
verifier under credential separation** — the conformance run above establishes an independent
platform, not an independent party. Both are the explicit "what would move it higher" on the
scorecards, and the second is the single thing an outside reviewer could settle in an afternoon.

---

Research prototype and technical demonstrator, AGPL-3.0. Methodology is LLM-assisted and disclosed.
Repository: https://github.com/Raoof128/Project-Simurgh · Author: Mohammad Raouf Abedini.
Technical feedback on the attestation contract and the reproduction packet is welcome.
