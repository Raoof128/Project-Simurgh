# Verifiable Containment Attestation After Guardrail Failure

**Project Simurgh - one-page technical brief**

_A receipt for what an AI deployment did, one a third party can verify offline and a dishonest operator cannot fake._

---

## The measurement gap in agent security

Capability evaluations show what a frontier model can do. They do not show what a deployed system
allowed it to do after the model was connected to tools, files, context, and external systems.
Agent-security policy discussions now circle that operational question: when a guardrail fails,
what happened next?

Most defences optimise the first line: stopping the bad input. Simurgh assumes that line will
sometimes fail and produces **signed, offline-reproducible evidence of the consequences**. It is a
receipt, not a passport.

## What Simurgh proves

After a guardrail, router, or agent boundary is stressed: did untrusted context gain authority, did
an unauthorised tool fire, was unsafe output exported? Each run is sealed into an
**Ed25519-signed, metadata-only evidence pack that re-derives byte-for-byte offline**.

The verifier is **producer-independent**. It trusts only the signer's public key and runs with no
network, so an outside reviewer can confirm a real containment claim and **falsify a dishonest
one**. The threat model is a **dishonest producer**: an operator who wants to look contained. That
offline-falsifiable stance is the core difference from receipt-only logging.

## Latest: Stage 4Q — verifiable friction receipts

The same signed-evidence spine now attests **agent oversight**, not just containment. Stage 4Q
(`v2.26.0-stage-4q-vfr`) produces a signed, epoch-bound, ordered proof that an **approval-gate
friction checkpoint preceded a protected authority crossing** (tool execution, unsafe export,
privilege expansion, consent broadening, or disclosure escalation). Enforcement is a **two-key
pincer**: the crossing must embed the approval's digest, the approval must appear earlier in the
recorded run chain, and it must be signed by a key **distinct from the tool/harness signer** — so a
dishonest operator cannot backdate approval, launder run order, or self-approve.

Its completeness closure, **No Silent Exemption**, is the sharp part. An operator may leave a
crossing _unbound_ only by embedding a **signed, policy-falsifiable exemption** — a receipt of
absence — which policy then judges against an affirmative allowlist that is **empty (refuse) by
default**. Even absence leaves a signed feather in the ledger; there is no quiet gap. Internet
survey found prior art for proof-of-non-execution and proof-that-oversight-ran, but none making an
unbound crossing sign a policy-falsifiable exemption, and this claim ships as a **signed,
attackable novelty source-map** rather than an assertion.

The stage is exercised by a 15-case normative corpus and a **10-arm live approval-gated capture**
in which the approver runs as a genuinely separate OS process holding a distinct key (with a
human-at-terminal ceremony arm), carries **JS↔Python byte-parity**, and closes with **five
machine-checked Lean theorems** (`frictionPrecedence`, `failClosed`, `sameKeyFails`,
`frictionCoverage`, `noSilentExemption`). A reviewer can also **be their own approver**: mint a
fresh key and confirm the evidence is decision-equivalent. Scope is honest and signed: this proves
_recorded-run oversight order_, not physical time; a **key ceremony and process separation**, not
that a human mind deliberated; and _enforcement evidence_, not proof that friction prevented harm.

## Headline result: real, live Llama Guard 4

A real **Llama Guard 4 12B** (`meta-llama/Llama-Guard-4-12B`, input-only, 8-bit, greedy) was
captured once on GPU over a 180-case run-set, then frozen, hash-bound, and signed. The model is
**never re-executed in CI**; reviewers replay the frozen capture:

| Measure                                                      | Result                        |
| ------------------------------------------------------------ | ----------------------------- |
| Llama Guard 4 allowed / blocked                              | 168 / 12                      |
| Malicious cases (of 150) Llama Guard 4 **missed**            | 138                           |
| Missed malicious cases **contained by Simurgh**              | **138 / 138**                 |
| External-guardrail-plus-Simurgh targeted attack-success rate | **0 / 150**                   |
| Unsafe tool execution / output export / context escalation   | 0 / 0 / 0                     |
| Capture determinism                                          | 3 greedy runs, byte-identical |

The 138 misses split cleanly. **120** were downstream-injection cases an input-only classifier
structurally cannot see, because the attack lives in untrusted context, tool calls, or provider
output. Simurgh contained those cases at its context, tool, and output boundaries. The other **18**
were direct-input attacks Llama Guard 4 saw and allowed anyway; it caught 12 of 30 direct inputs.
Simurgh contained those at the input boundary. Both paths produced zero successful attacks. This is
a **boundary claim** about where each defence acts, not a ranking of Llama Guard 4.

## Live-agent containment: a real tool-using model

The same evidence spine was driven against a live agent, not just a classifier. A self-hosted
**Llama-3.3-70B** model ran the AgentDojo workspace suite: 10 user tasks x 14 injection goals =
**140 attack cases**, scored against an attack taxonomy that was pre-registered and frozen before
results.

Simurgh's authority gate, covering egress and destructive mutation, cut the targeted attack-success
rate from **9/140 to 0/140**. It contained every baseline success, including the destructive-delete
class an egress-only gate leaves open. Benign utility held, with one borderline regression reported
as likely run-to-run nondeterminism. Containment is claimed **only within the declared taxonomy**;
non-destructive mutation, financial actions, and code actions remain named future work.

## A whole evaluation you can recompute

Simurgh also sweeps a grid of policy operating points and publishes a
**containment-utility Pareto frontier that re-derives offline from the signed packs alone** (released
as `v2.15.0`). A point whose evidence fails to verify, or that ran fewer cases to flatter its
numbers, is structurally excluded from the frontier. An outsider recomputes the curve with no model
and no producer access.

An **adaptive red-team campaign** (released as `v2.17.0`) then moves second against the evidence
layer across a four-class escape taxonomy: containment escape, verifier deception, out-of-scope
behaviour, and gate-boundary evasion. Each attempt is sealed and byte-reproducible from a seed, so
the campaign cannot hide an escape it found, and an unresolved boundary is recorded rather than
buried.

## We attacked our own proof

A red-team sweep hit the attestation core with eight attack classes: **tamper, key-swap,
meta-set-swap, canonical-laundering, digest-collision, cross-stage-replay, self-proof-mutation, and
policy-drift**. The cryptographic trust root held on every class.

The sweep found two weaknesses, both in detector semantics rather than the spine: a volume-driven
false fire (HIGH) and free-text smuggling inside metadata (MEDIUM). Both became a versioned, frozen
detector-v2. A second red-team round held again, and the residual limits that remain are **named and
signed**, not hidden.

## Independence you do not have to take on faith

A second, independent provenance root signs the release verdict with **GitHub's OIDC identity, not
the developer's key**. The two roots corroborate by digest equality, never by nested signatures, and
the runner recomputes its verdict from real command exit codes. If reality diverges from the
committed verdict by a single byte, the workflow fails closed before it signs anything.

Because a valid signature proves only who signed, not that a receipt is true, a producer-independent
witness cross-checks every signed receipt against an independent consequence oracle: canary
sightings at the real export and tool sinks, on a channel not derived from the receipt. A gateway
that signs a clean receipt for a run that leaked is caught. Its Ed25519 signature still verifies,
but the witness raises a conflict. Across the fixtures, the witness produced **zero false
accusations and zero missed lies**.

## Reproduce it yourself: one offline command

The release ladder is **12 signed rungs**, externally replayable by a reviewer with no prior
context, fully offline after dependency install:

```bash
git clone https://github.com/Raoof128/Project-Simurgh.git
cd Project-Simurgh && npm ci
scripts/reproduce-vca-chain.sh            # public VCA ladder
scripts/reproduce-llm-shield-stage4h.sh   # proof-carrying containment checker
scripts/reproduce-llm-shield-stage4q.sh   # verifiable friction receipts (Node >= 26)
```

The first command replays the public VCA ladder. The Stage 4H command replays the proof-carrying
containment checker, including typed exits, offline preflight, byte-stable evidence, and
anti-theatre deletion. The Stage 4Q command runs all ten friction gates — unit suites, JS↔Python
parity, both fixture lanes with byte-idempotency, offline attestation verification,
be-your-own-approver decision-equivalence, privacy scan, key audits, and the K7 all-functions net.
Each replay refuses the fake-clean story. All 12 Stage 3X rungs are tag-and-commit pinned; 10/12 are
evidence-root chain-checked; 5 current-format manifests are deep per-file re-walked under hardened
containment rules; 3/12 fully reproduce; and 2/12 are index-only **with signed reasons**. It does
not claim a uniform 12/12; the receipt records what each rung did and did not prove.

## What this is not

- Not a jailbreak detector, and not a claim of jailbreak immunity or general jailbreak resistance.
- Not a model-level guardrail or a replacement for one; it is complementary, post-filter.
- Not a model-inference-integrity proof; completeness holds only for **gateway-mediated** actions.
  Unmediated actions remain out of scope until a future hardware-isolation stage.
- Determinism is not statistical robustness. Signed evidence is reproducible, not ground truth; a
  live capture's origin is self-reported and signed as such.
- Not validated on production traffic, not production-ready, and it ranks no vendor as unsafe.
- Stage 4H is deterministic offline checker reproduction over signed evidence; it is not kernel
  sandboxing, execution truth, implicit-flow security, deployment safety, or a future-run guarantee.
- Stage 4Q proves _recorded-run_ oversight order, not physical time; a cryptographic key ceremony
  and process separation, not proof that a human deliberated or that friction prevented harm.
- Live Claude Computer Use remains a documented next step, not a completed demo.

## Status & contact

Research prototype and technical demonstrator, AGPL-3.0. Methodology is LLM-assisted and disclosed
in the write-ups. Every claim is bounded by the signed evidence, verifier outputs, and documented
non-claims. Technical feedback on the attestation contract and reproduction packet is welcome.

Repository: https://github.com/Raoof128/Project-Simurgh · Author: Mohammad Raouf Abedini
