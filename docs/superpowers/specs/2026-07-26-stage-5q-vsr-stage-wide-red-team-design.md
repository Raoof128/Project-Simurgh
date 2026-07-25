# Stage 5Q — VSR: Verifiable Stage-wide Red Team

> **AnthropicSafe First, then ReviewerSafe.**
> Every mechanism in this stage is safe for the provider (content and structural egress) and
> recomputable by a reviewer, and both properties are designed in at SPEC time rather than retrofitted.

|               |                                                            |
| ------------- | ---------------------------------------------------------- |
| Stage id      | `5Q`                                                       |
| Name          | **VSR — Verifiable Stage-wide Red Team**                   |
| Branch        | `stage-5q-vsr-stage-wide-red-team`                         |
| Target tag    | `v2.52.0-stage-5q-vsr`                                     |
| Predecessor   | 5P (VSI), `v2.51.0-stage-5p-vsi`, main `100ead22`          |
| Successor     | 5R (witness co-signing — displaced from 5Q by this ruling) |
| Design ruling | 2026-07-26, recorded verbatim in §0                        |
| Raw codes     | **NONE ALLOCATED IN THIS SPEC.** See §12.4.                |

---

## §0 Ruling provenance and scope of this document

This spec exists to discharge one instruction:

> **Design ruling:** Stage 5Q becomes a federated red-team campaign over current head and every
> Stage 5 release tag, with immutable pre-fix findings and post-fix regression evidence.

The ruling additionally directs that this document freeze **four objects before implementation**:

```text
stage5_function_closure
stage5_release_tag_closure
stage5_attack_taxonomy
stage5_finding_ledger_schema
```

and that no raw codes and no attack counts be allocated yet.

**What this document freezes.** §2–§5 are the four frozen objects. Once §§2–5 are frozen by digest,
they are amended only by a numbered post-freeze annex (the 5P convention: Annex R, A5). The
remaining sections are normative design that the implementation plan compiles into tasks.

**What this document does not do.** It does not enumerate the closure member-by-member — that is a
_generated_ artifact (§2.6), because a hand-written inventory of 1,400 entries would be stale before
it was reviewed. The spec freezes the **rule** that determines membership; the census emits the
membership. This is the §2.12 discipline 5P established: immutable rule in the spec, mutable state in
a generated ledger.

---

## §1 The blade, the laws, and the honest core

### §1.1 The blade

Every stage from 5A to 5P added a mechanism and signed a limitation. Sixteen mechanisms now stand in
a stack that has never been attacked **as a stack**. Each stage tested its own blade against its own
threat model, authored by the same mind that built it, at the moment of maximum optimism.

5Q's blade:

> **A verification layer that has never been adversarially attacked over its own frozen function
> closure is an assertion, not evidence. 5Q inventories every function in Stage 5, assigns each a
> stable identifier, attacks the security-bearing ones across a frozen taxonomy, and freezes every
> finding immutably _before_ any repair is permitted to land.**

The falsifiable claim — the one a hostile reviewer must attack — is deliberately narrow:

> Every function in the frozen Stage 5 function closure was inventoried, assigned a stable
> identifier, and either directly attacked or discharged through a **machine-checkable** reason.

Note what is _not_ claimed: that Stage 5 is secure, that the attacks were sufficient, or that the
closure is the right closure. Those are judgements. Membership, identification, and discharge are
mechanical, and mechanical claims are the only kind this project makes.

### §1.2 The five laws

Each law is a property a reviewer can try to break, not a slogan.

**L1 — No Unexamined Function.**
Every closure member carries exactly one of four statuses. There is no `covered_by_tests`, no
`probably_safe`, no `helper_only`. A function whose status cannot be established fails the census
closed.

**L2 — Universe Before Attack.**
The closure is committed by digest **before** any attack pack runs. A closure that can grow or shrink
after results are known is a gerrymandered universe, and a coverage ratio over a mutable denominator
is a number with no meaning. (Direct descendant of 5F's _No Gerrymandered Universe_ and 5K's Merkle
universe commitment; 5Q reuses the mechanism rather than reinventing it.)

**L3 — No Erased Finding.**
A repair never deletes, rewrites, softens, or re-scopes the finding that motivated it. Q1 records
supersede; they do not overwrite. The ledger is append-only and hash-chained (5Q reuses 5Q's
predecessor machinery from 5J's append-only event log).

**L4 — No Green Without a Red.**
A harness that has never failed proves nothing. Every attack class must be demonstrated to detect a
deliberately seeded fault of that class before its passing results are admissible. An undetected
mutant invalidates the class, not the mutant.

**L5 — No Retroactive Innocence.**
Historical release tags are attacked **as shipped**. A repair at head does not clear a tag. A finding
against `v2.44.0` remains a finding against `v2.44.0` forever, and the ledger records which tags a
fix does and does not reach.

### §1.3 The honest core, signed up front

This is the stage's own weakest number, stated in §1 rather than an appendix, and it is the declared
attack surface for the stage that follows:

> **Coverage over a frozen closure is not absence of vulnerability.** 5Q proves that a defined set of
> functions was attacked by a defined set of methods. It cannot prove the set of methods was
> sufficient, and it cannot prove the closure boundary was drawn in the right place. The closure is a
> **human-authored** boundary; its _internal completeness_ is machine-checkable by dual census, but
> its _external sufficiency_ is a judgement by the same party that built the code.

Three consequences follow, and all three are release-gated non-claims (§13):

1. **Zero findings in a tray is a statement about the attack pack, not about the code.** A silent
   tray is evidence the pack was weak until L4 proves otherwise.
2. **The red team is the blue team.** Self-attack has a known ceiling: an author cannot attack the
   assumption they cannot see. This is precisely what the 5P reproduction receipt could not
   discharge either, and it is the same open item — an external party.
3. **A machine-checkable discharge reason is checkable, not correct.**
   `delegated_to_attacked_caller` is verified to point at a genuinely attacked caller; whether
   delegation is _sound_ for that function is an argument, and arguments are recorded, not proved.

---

## §2 FROZEN OBJECT 1 — `stage5_function_closure`

### §2.1 The membership rule

The closure is the set of all callable or verifiable units reachable from the Stage 5 surface, where
"Stage 5 surface" is defined by these roots and no others:

```text
R1  tools/simurgh-attestation/stage5{a..p}/**       (all .mjs, .py)
R2  tests/e2e/llmShield/stage5{a..p}/**             (K7 nets and e2e drivers)
R3  proofs/stage5{a..p}/*.lean                      (theorem entry points)
R4  scripts/reproduce-llm-shield-stage5{a..p}.sh    (+ stage-5 build scripts)
R5  .github/workflows/**                            (gate definitions that assert stage-5 facts)
R6  package.json scripts matching /stage5|census/
R7  the module closure of R1 under static import, restricted to first-party code
```

**R7 is bounded deliberately.** Transitive imports into `tools/simurgh-attestation/shared/`,
`canonicalise.mjs`, `stage4*` and earlier are **in the closure as `imported_dependency`** but carry
no attack obligation in 5Q unless a stage-5 function's security role depends on them (§2.4). Node
built-ins and npm dependencies are **out of closure**, recorded once as an explicit exclusion with a
reason. 5Q does not audit `node:crypto`; it audits how Stage 5 uses it.

### §2.2 Member categories

The ruling's list, made exact:

| Category                        | Root   | Notes                                                                    |
| ------------------------------- | ------ | ------------------------------------------------------------------------ |
| `exported_function`             | R1     | `export function` / `export const f = (…) =>`                            |
| `internal_function`             | R1     | declared, not exported, reachable from an exported member                |
| `exported_constant`             | R1     | frozen tables carry security weight (allocators, maps, ceilings)         |
| `cli_entry`                     | R1, R6 | modules with a `main`/argv guard, and npm script entry points            |
| `verifier_branch`               | R1     | each distinct `reject(check_id, outcome)` site                           |
| `builder` / `fixture_generator` | R1, R2 | anything that emits evidence                                             |
| `census_generator`              | R1     | anything that emits a completeness claim                                 |
| `canonicalisation_or_digest`    | R1, R7 | the highest-risk category (§2.4)                                         |
| `schema_validator`              | R1     | exact-key and grammar gates                                              |
| `raw_code_allocator`            | R1     | 5P's `rawCodeAllocator` and every predecessor band table                 |
| `compatibility_adapter`         | R1     | cross-stage and cross-version readers                                    |
| `python_mirror`                 | R1     | parity implementations                                                   |
| `browser_mirror`                | R1     | parity implementations                                                   |
| `lean_theorem`                  | R3     | theorem/lemma entry points                                               |
| `shell_step`                    | R4     | each gated step in a reproduce script                                    |
| `gate_definition`               | R5, R6 | each CI job step asserting a stage-5 fact                                |
| `historical_function`           | tags   | a member of a released tag's closure still trusted by a shipped artifact |

### §2.3 The entry record

Frozen field set. Additional fields require an annex.

```text
function_id            stable, content-independent identifier (§2.5)
stage_id               5a … 5p, or "cross" for shared members
module_path            repo-relative, POSIX separators
export_name_or_internal_symbol
source_digest          sha256 of the normalised source span (§2.5)
reachable_from         list of function_ids, or ["root:<Rn>"]
security_role          §2.4 enum
historical_tags        tags whose closure contains an equivalent member
attack_pack_ids        attack packs that name this member
coverage_status        §2.7 enum
```

### §2.4 `security_role` — the filter that makes the stage finite

The raw closure measures ~1,400 members. The attack obligation attaches by role, and the role
assignment is itself frozen and reviewable. This is the mechanism that converts an impossible matrix
into a finite one **without** weakening L1: every member is still inventoried and still carries a
status.

| Role                  | Attack obligation                                                | Rationale                                                                    |
| --------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `trust_decision`      | **full applicable matrix**                                       | signature/digest/trust-root verification, resolver ceilings, authority gates |
| `completeness_claim`  | **full applicable matrix**                                       | censuses, coverage gates, universe commitments — the moat itself             |
| `canonicalisation`    | **full applicable matrix**                                       | one byte of drift invalidates every signature above it                       |
| `code_allocation`     | **full applicable matrix**                                       | raw-code collision/shadowing is a silent misreport                           |
| `evidence_emission`   | R1,R2,R7,R8,R10,R15                                              | builders and generators — vacuity and fabrication risk                       |
| `schema_gate`         | R1,R2,R3,R7,R8,R16                                               | exact-key and grammar enforcement                                            |
| `parity_mirror`       | R2,R3,R11                                                        | divergence is the only interesting failure                                   |
| `formal_statement`    | R7,R10                                                           | does the theorem state what the prose claims?                                |
| `orchestration`       | R9,R16                                                           | scripts, CLI wiring                                                          |
| `pure_transform`      | discharge by delegation unless reachable from a `trust_decision` | formatting, sorting, string helpers                                          |
| `imported_dependency` | out of obligation, recorded                                      | §2.1 R7 boundary                                                             |

**The role assignment is adversarial input.** A member mis-labelled `pure_transform` escapes the
matrix — this is the single highest-value attack against 5Q itself. Mitigation is mandatory and
mechanical: a `pure_transform` member that is reachable from a `trust_decision` member **fails the
census closed** unless it carries a signed, member-specific exception naming the reachability path.
Role is not a self-declaration; it is a claim checked against the reachability graph.

### §2.5 Stable identity under churn

`function_id` must survive reformatting, renaming and file moves well enough to be cited in a frozen
finding, while remaining precise enough to detect that a member changed.

```text
function_id  = "<stage_id>:<module_path>:<symbol>"        # stable across content edits
source_digest = sha256(normalised source span)             # changes when the body changes
```

Normalisation before digest: strip comments, collapse whitespace runs to a single space, strip
trailing commas. Rationale: a prettier reflow must not invalidate a frozen finding, but a semantic
edit must be visible. The normaliser is itself a closure member with role `canonicalisation` and is
therefore attacked by the full matrix — including against itself.

**Rename handling.** A renamed symbol produces a new `function_id`. The census emits a
`succession_hint` when a disappeared id and an appeared id share a `source_digest`; the hint is
advisory and never auto-applied, because silent identity transfer is exactly the laundering 5Q
exists to catch.

### §2.6 Dual census — the anti-vacuity mechanism

Two independent inventories, built by different means, must agree:

|                    | Method                                                  | Blind to                                                          |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------------------- |
| **Static census**  | parse module source; enumerate declarations and exports | dynamically added properties, re-exports, conditional definitions |
| **Runtime census** | `import * as ns`, enumerate the actual callable surface | anything never imported; dead files                               |

**Disagreement fails closed.** A member in one census and not the other is a `census_conflict` and
blocks release, unless discharged by a signed, member-specific exception recording which census is
authoritative and why.

This is not theoretical rigour. The 5P K7 net found 5 dead exports and a further 2 when Lane L
landed; those were found precisely because the runtime surface and the intended surface disagreed. In
5Q the disagreement is promoted from an incidental discovery to a first-class release blocker.

**A third, weaker net is mandated for R5/R6 members: the gate-definition census** (§2.8).

### §2.7 `coverage_status` — the four allowed values

```text
attacked_pass                  attacked by every applicable class; no finding
finding_frozen                 attacked; ≥1 finding recorded in the Q0 ledger
mechanically_unreachable       proven unreachable by a machine-checkable argument
delegated_to_attacked_caller   every call site is itself an attacked member
```

Rules:

- Any member whose status cannot be established is a census failure, not a default.
- `mechanically_unreachable` requires the same rigour 5P's §2.12 demanded: prose is not a discharge.
  The argument must be a reachability computation over the census graph, emitted as evidence.
- `delegated_to_attacked_caller` must name **every** call site and each must be `attacked_pass` or
  `finding_frozen`. One unattacked caller breaks the delegation.
- **Delegation may not form a cycle.** A delegation graph containing a cycle discharges nothing and
  fails closed — two functions cannot vouch for each other.

### §2.8 The gate-definition census — from a real, live defect

Members with role `completeness_claim` include CI gate definitions, and this category earned its own
census before this spec was written. Measured at `ea574df8`:

- `.github/workflows/stage-4-lean-proofs.yml` enumerates proof files **by name**: 27 listed, **32 on
  disk**.
- Five Stage-5 proofs are absent from it. Four are reached by **no CI path at all**
  (`stage5i/PanelCoverage.lean`, `stage5j/RatingContest.lean`, `stage5k/UniverseCommitment.lean`,
  `stage5l/TemporalQuorum.lean`); `stage5m/EcologyQuorum.lean` is reached only via its reproduce
  script in `check-e2e.sh`.
- `proofs/stage5i/PanelCoverage.lean` (9 theorems, 0 `sorry`) is referenced by **nothing automated
  anywhere in the repo** — not `.github/`, not `scripts/`, not `package.json`.

The same repo contains the opposite pattern: `scripts/check-e2e.sh` enumerates with
`find tests/e2e -name '*.test.js'`, so every new stage's K7 net is gated automatically.

**Frozen rule.** Every gate that asserts a completeness fact must be classified
`self_extending | manually_enumerated`. Every `manually_enumerated` gate is a latent vacuous-green
and must carry a drift check comparing its list against the filesystem. This is recorded as
**pre-stage finding `5Q-F001`** (§14) and repaired in Q1, never before.

---

## §3 FROZEN OBJECT 2 — `stage5_release_tag_closure`

### §3.1 Membership

Exactly the sixteen Stage 5 release tags, verified present at `ea574df8`:

```text
v2.36.0-stage-5a-vnc      v2.37.0-stage-5b-var      v2.38.0-stage-5c-vsb
v2.39.0-stage-5d-varl     v2.40.0-stage-5e-vda      v2.41.0-stage-5f-vmp
v2.42.0-stage-5g-vfc      v2.43.0-stage-5h-vsd      v2.44.0-stage-5i-vpc
v2.45.0-stage-5j-vrc      v2.46.0-stage-5k-vuc      v2.47.0-stage-5l-vtcq
v2.48.0-stage-5m-vtc-quorum  v2.49.0-stage-5n-vtc-delay
v2.50.0-stage-5o-vsc      v2.51.0-stage-5p-vsi
```

Plus **current head**, which is a distinct campaign target and not a tag.

The closure is frozen by `(tag_name, commit_sha)` pairs. A tag that moves is itself a finding.

### §3.2 Per-tag record

```text
tag_name
commit_sha
declared_runtime          node/python/lean versions the tag declares
verifier_entry_points     the tag's own reproduce + verify surface
positive_path_result      §3.3 enum
attack_results            finding_ids
downgrade_results         cross-tag replay outcomes
```

### §3.3 Allowed historical outcomes

```text
reproduced_and_attacked        positive path ran; attacks applied
reproduced_with_finding        positive path ran; ≥1 finding
environment_unreproducible     toolchain unavailable — NOT a security result
artifact_missing               evidence referenced by the tag is absent
tag_contract_incomplete        the tag never defined what reproduction means
```

**`environment_unreproducible` is not evidence of security and must never be counted as a pass.**
This is release-gated: the campaign report prints reproducible and unreproducible tags as separate
denominators, never summed.

### §3.4 Isolation requirement

Each tag is exercised in a **separate git worktree** at its own commit. No tag is checked out over
the working tree, and no tag's artifacts are regenerated. Attacks operate on the tag's **signed
artefacts as shipped**; the tag is never rewritten.

Known environmental hazard, carried from memory: several stages are byte-stable **only under Node
26** (4H's digest builder, the 5P reproduce). A tag that fails under a different runtime is
`environment_unreproducible`, and the campaign records the runtime it tried. Node 26 lives at
`/opt/homebrew/opt/node@26/bin` on the development machine.

---

## §4 FROZEN OBJECT 3 — `stage5_attack_taxonomy`

### §4.1 The sixteen classes

Frozen verbatim from the ruling. The identifiers `R1`–`R16` are stable and citable in findings
forever.

| Class | Attack family                                                      |
| ----- | ------------------------------------------------------------------ |
| R1    | Exact-key, type confusion and malformed-object attacks             |
| R2    | Unicode, lexical and canonicalisation laundering                   |
| R3    | Digest, domain-separation and profile-binding confusion            |
| R4    | Signature, key-swap and trust-root substitution                    |
| R5    | Cross-stage and cross-tag replay                                   |
| R6    | Raw-code collision, reordering and first-failure shadowing         |
| R7    | Selective omission, census truncation and fake completeness        |
| R8    | State aliasing, mutation-after-validation and partial commit       |
| R9    | Resource exhaustion, oversized operands and pathological recursion |
| R10   | Generator vacuity, oracle dependence and false-green gates         |
| R11   | Cross-runtime disagreement and browser-only divergence             |
| R12   | Historical downgrade and compatibility laundering                  |
| R13   | Authority laundering from untrusted context or model output        |
| R14   | Selective-disclosure contradiction and two-story evidence          |
| R15   | Honest-looking evidence over fabricated execution reality          |
| R16   | Error-path exceptions, crashes and fail-open wrappers              |

### §4.2 The applicability matrix

Applicability is `security_role × attack_class` (§2.4) and every **omission** carries a mechanical
reason drawn from a frozen enum — never free text:

```text
no_such_input_surface        the class needs an input the member does not accept
no_trust_decision            the class attacks a trust boundary the member does not cross
no_persistent_state          R8 against a pure function
single_runtime               R11 against a member with no mirror
not_in_historical_closure    R12 against a member that never shipped in a tag
delegated                    covered at the attacked caller (§2.7 rules apply)
```

An omission whose reason is not in this enum fails the census closed.

### §4.3 Attack pack structure

Each pack is `(stage_or_campaign, attack_class)` and is a first-class artifact:

```text
attack_pack_id
target_scope          stage tray id, or campaign id
attack_class
premise_receipt       proof the pack generated a genuine negative case (§4.4)
fixture_digests
expected_outcomes     symbolic, never raw codes (§12.4)
observed_outcomes
```

### §4.4 The premise gate, inherited

5P paid for this lesson: a negative fixture claimed "contradictory assertions" while its two vectors
merely _differed_, making contradiction geometrically impossible. The fixture tested an easier rule
than it claimed.

**Frozen rule.** Every negative attack fixture must first prove it generated a genuine negative case.
A pack that cannot produce its premise receipt is vacuous and its passes are inadmissible. This is
the same gate as 5P §2 and it is not relaxed for volume.

---

## §5 FROZEN OBJECT 4 — `stage5_finding_ledger_schema`

### §5.1 Q0 record — frozen at discovery

```text
finding_id             5Q-F###, monotonic, never reused
affected_stage
affected_function_id
affected_tags          tags whose closure contains the affected member
attack_class
premise_receipt        digest of the proof the attack was genuine
expected_result        what the mechanism claims
observed_result        what it did
exploit_fixture_digest
severity               §5.3
claim_impact           which SHIPPED claim is weakened, by name (§5.4)
scope                  head | tags | both
discovered_at_commit
```

### §5.2 Q1 record — appended, never merged into Q0

```text
finding_id                 the Q0 finding this repairs
fixed_at_commit
regression_fixture         the fixture that fails before and passes after
post_fix_result
remaining_scope            what the fix does NOT reach
historical_tags_still_affected
```

A Q1 record without a `regression_fixture` is rejected. A fix with no failing-before witness is an
assertion that a bug existed.

### §5.3 Severity — defined against claims, not vibes

Severity in this project is not CVSS. It measures **which signed claim the finding weakens**:

```text
claim_falsifying    a shipped, signed claim is false as stated
claim_narrowing     the claim holds but over a smaller domain than stated
assurance_only      no claim is weakened; a gate provided less assurance than believed
hygiene             no claim and no assurance effect
```

`5Q-F001` (§14) is `assurance_only`: the proofs may be perfectly valid; what was false is the belief
that CI was checking them.

### §5.4 `claim_impact` is mandatory and specific

A finding must name the claim it touches — a closeout line, a signed limitation, a scorecard
justification, or a README sentence — quoted, with its file. "Weakens confidence" is not a
`claim_impact`. This is what connects the red team to the honesty ledger rather than leaving it as a
bug list.

### §5.5 Ledger integrity

- Append-only, hash-chained; each record commits to its predecessor.
- Q0 is **signed and frozen** before the first Q1 commit lands. The freeze digest is recorded in the
  spec's freeze annex and in the attestation.
- Unresolved findings remain **visible** in every published view. A finding may be superseded,
  disputed, or accepted-as-risk; it may never be dropped.
- **No finding is closed by the fact that no one has exploited it.**

---

## §6 Two-phase lifecycle

### §6.1 Phase Q0 — discovery and freeze

Runs the trays and campaigns against a **frozen closure** (L2) at a fixed head commit. No production
code under `tools/simurgh-attestation/stage5{a..o}/` is modified during Q0. New code lands only under
the 5Q tree and its tests.

Q0 ends with: closure digest, tag closure digest, taxonomy digest, ledger digest — all four signed.

### §6.2 Phase Q1 — remediation and regression

Only after the Q0 freeze may fixes land. Each repair carries its Q1 record (§5.2) and its regression
fixture. The Q0 ledger is immutable input to Q1.

**Deliberate consequence:** 5Q ships with its own defects on the record. That is the point. A red
team that quietly fixes what it finds and reports a clean result is indistinguishable from a red team
that found nothing.

### §6.3 What happens to findings that are not fixed

`accepted_as_risk` with a signed rationale, or `deferred_to_<stage>` minting a reserved socket. Both
remain visible. The release gate counts unresolved findings and prints them; it does not block on
them, because blocking on them creates pressure to under-report.

---

## §7 Mandatory negative self-proof (L4)

### §7.1 The seeded mutants

Representative classes, from the ruling:

```text
M1  skipped signature check
M2  swapped first-failure checks
M3  omitted census row
M4  weakened exact-key validation
M5  cross-stage domain separation removed
M6  resolver ceiling bypassed
M7  selective-disclosure contradiction accepted
M8  model text treated as trusted authority
M9  historical verifier silently upgraded
```

Each maps to the attack class it is meant to exercise. **Every seeded mutant must be detected.** An
undetected mutant invalidates that attack class's results until the pack is strengthened and the
mutant re-run.

### §7.2 Mutants never become production code

Mutants are applied in a scratch worktree and reverted. **Only** the mutation description, the exact
command, and the observed detection enter the evidence pack. No mutated source is committed. The
evidence records enough for a reviewer to re-seed the mutant themselves.

### §7.3 The recursive risk, stated

A mutation-detection harness can itself be vacuous: a mutant "detected" by a test that was already
failing proves nothing. Each detection record must show the **before/after transition** — green
before mutation, red after, green after revert — or the detection is not admissible.

---

## §8 The Claude Fable 5 reference campaign

### §8.1 Status

A named reference family, not a decorative mention. Its Stage 5 mutations test whether
model-controlled or untrusted text can:

- declare itself a trusted resolver;
- assert an accountable role;
- manufacture an approval or witness;
- reinterpret a schema identifier;
- request a stronger raw-code outcome;
- convert a non-claim into a capability claim;
- persuade a generator to omit inconvenient rows;
- smuggle authority through tool output, metadata, fixture names or free-text fields;
- cause unsafe tool use, privilege escalation or export after the initial guardrail misses.

### §8.2 The governing rule, preserved verbatim

> Model output may describe authority, identity, completeness or verification. It can never create
> them.

This is the 5P §2.12 authority rule generalised from identity to every Stage 5 claim type. It is
frozen text.

### §8.3 Privacy and egress contract

The campaign stores **bounded attack metadata and digests** where the existing privacy contract
requires it. It must not turn the red-team pack into a warehouse of raw prompts and secrets.

Concretely, and consistent with every prior live-capture lane:

- Verbatim model output is stored only where a prior stage already established that lane's contract,
  and is truncated to the frozen prefix length used there.
- Attack strings that are purely mechanical (unicode confusables, malformed objects) are stored in
  full — they are not sensitive and reviewers need them.
- Anything sourced from a live provider is digest-pinned with a stored prefix, never a full corpus
  dump.
- **AnthropicSafe First:** no pack, fixture name, or evidence file is a working jailbreak recipe
  optimised for reuse against a live system. The pack demonstrates _containment by the verifier_,
  which is a claim about our code. This is the same bound 5L and 5P shipped under.

### §8.4 Both outcomes are honest

A live lane that refuses is recorded `model_refused` and is a valid result. A lane that produces the
claim and is contained is a verifier demonstration. Neither is re-run until it looks better.

---

## §9 Historical release attack lane

For each tag in §3.1, in an isolated worktree:

1. identify its declared runtime and verifier;
2. reproduce its original positive path where possible;
3. attack its signed artefacts **without rewriting the tag**;
4. test downgrade and cross-tag replay;
5. test whether **current** tooling incorrectly accepts weaker historical semantics;
6. record environmental failures distinctly (§3.3).

Step 5 is the highest-value step and the one isolated stage tests structurally cannot perform: it is
the only place that catches head tooling that has silently become more permissive than the tag it
claims to still support.

**No historical tag may disappear from the report because a modern toolchain dislikes it.** Every tag
in §3.1 appears in the output with an outcome, including `environment_unreproducible`.

---

## §10 Cross-stage seam campaign

The capstone. Targets combinations no isolated tray can see:

- 5A evidence replayed as 5P evidence;
- a lower-strength historical schema accepted under a later profile;
- a 5G identity claim used to satisfy 5P durable resolution;
- a 5L anchor interpreted as stronger than its frozen witness;
- 5O completeness evidence selectively presented through another stage;
- raw-code or symbolic-outcome confusion across adjacent bands;
- valid signatures over semantically **mismatched** stage objects;
- one stage's non-claim silently promoted into another stage's premise;
- conflicting stage artefacts that each verify independently but cannot coexist truthfully.

The last two are the most dangerous and the least likely to be caught by any existing test, because
every component is individually valid. They are the composition analogue of 5P's _No
Frankenidentity_, and the campaign's expected-outcome table treats them as first-class rather than
as an appendix.

---

## §11 Architecture: sixteen trays plus three campaigns

### §11.1 Rejected alternatives, recorded

**One giant fuzz harness.** Fast, loud, impressive-looking, semantically shallow. It hammers parsers
while missing stage-specific laws — beacon closure, resolver ceilings, historical anchors,
selective-disclosure completeness. Rejected.

**Historical releases only.** Strong on downgrade and compatibility, blind to current internal
helpers, generators and never-shipped functions. Rejected.

### §11.2 Selected

Sixteen independent stage trays:

```text
5A  5B  5C  5D
5E  5F  5G  5H
5I  5J  5K  5L
5M  5N  5O  5P
```

plus three cross-cutting campaigns: **current-head composition**, **historical Stage 5 release
tags**, **cross-stage laundering and downgrade paths**.

Trays are independent by construction: one broken tray fails one tray. Trays share only the frozen
objects and the harness, and the harness is itself a closure member under attack.

### §11.3 The one-blade rule, and why this stage still satisfies it

A fair objection: 5Q contains a census mechanism, an attack harness, a finding ledger, a historical
lane and a mutation prover — arguably several blades.

The stage holds together because all five serve a **single falsifiable claim** (§1.1), and splitting
would produce strictly worse stages: a red team without an immutable ledger is a bug list, and a
ledger without a red team is a schema. The risk is scope, not coherence, and it is managed by the
plan's task ordering (frozen objects → harness → self-proof → trays → campaigns), each of which is
independently shippable evidence if the stage must be cut short.

---

## §12 Release gates

### §12.1 The frozen gate list

```text
all frozen functions accounted for
all Stage 5 tags accounted for
all applicable attack classes discharged
all seeded mutants detected
all confirmed findings frozen before repair
all repaired findings retain regression witnesses
all unresolved findings remain visible
all current positive reproduction paths remain green
all negative fixtures prove their premises
all runtimes agree where parity is claimed
all function, tag and attack censuses are byte-stable
```

### §12.2 Inherited structural gates

The standing contract applies unchanged: read-only kernel, two-tier attestation (public structure /
audit rerun), byte-stable evidence built twice and `cmp`-ed, JS↔Python↔browser parity on the
deterministic surface, Lean with zero `sorry`, and the **K7 all-functions net for 5Q's own code** —
the red team's harness is not exempt from the discipline it enforces.

### §12.3 Prior-stage non-disturbance

Every prior stage's reproduce script must remain green. 5Q is additive; sealed history stays sealed.
Q1 repairs are the one exception and each must demonstrate that the affected stage's reproduce still
passes after the fix.

### §12.4 No raw codes in this spec

Per the ruling, **no raw codes are allocated**. Attack outcomes are symbolic throughout Q0. If Q1
repairs require new typed outcomes, they are allocated by a post-freeze annex following the 5P Annex
R contract: one canonical table, lookup never arithmetic, no literals scattered through verifiers,
band closed on completion, existing codes never move. The next free code is **475** (5P closed at
474).

---

## §13 Honest non-claims

Frozen, and published in the attestation and the closeout:

- **not** proof that Stage 5 has no vulnerabilities;
- **not** exhaustive over all possible attacks;
- **not** production penetration testing;
- **not** proof that signed evidence is ground truth;
- **not** proof of real-world identity, execution or human deliberation;
- complete **only** over the frozen function, tag and attack closure;
- historical environmental failure is **not** evidence of security;
- **zero discovered findings is not itself a security result**;
- the red team and the blue team are the same party (§1.3), which is a ceiling no internal rigour
  removes.

---

## §14 Pre-stage finding `5Q-F001`

Recorded here because it was discovered during this spec's research, **before** the harness existed.
Attributing it to the harness would be exactly the fabricated execution reality R15 exists to catch.

```text
finding_id             5Q-F001
affected_stage         cross (5i, 5j, 5k, 5l, 5m)
affected_function_id   cross:.github/workflows/stage-4-lean-proofs.yml:lean-check
attack_class           R10 (generator vacuity, false-green gates)
expected_result        the Lean gate verifies every proof in proofs/
observed_result        it verifies 27 of 32 named files; 4 stage-5 proofs are
                       reached by no CI path; proofs/stage5i/PanelCoverage.lean
                       (9 theorems, 0 sorry) is referenced by nothing automated
severity               assurance_only
claim_impact           the "Lean N theorems, 0 escapes" line in the 5I/5J/5K/5L
                       closeouts was not CI-enforced at any point after its stage shipped
scope                  head | tags (both)
discovered_at_commit   ea574df8
provenance             discovered during 5Q design research, not by the 5Q harness
```

Not repaired in this spec. Repair belongs to Q1 with a regression fixture that fails before it.

**The general lesson, which is bigger than the instance:** when 5P hit this defect, the repair added
5P's file to the list and did not ask whether siblings were missing. Four were. A fix that treats the
instance and not the class is how a repo accumulates exactly this. 5Q's Q1 repair must convert the
gate to `self_extending`, not add five more names.

---

## §15 Scorecard and founder's ledger

### §15.1 Four axes, honest, at spec time

| Axis                   | Score   | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Novelty**            | **8.7** | Red-teaming is not novel; _verifiable red-team completeness over a frozen function closure, with findings frozen before repair and attacks against one's own shipped tags_, is. Extends 4U's VRTA from one stage to sixteen plus history. Held below 9 because the mechanism is an assembly of proven parts (5F universe commitment, 5J append-only log, 5P census discipline) rather than new geometry. |
| **Frontier**           | **8.5** | Directly addresses "why should anyone trust the verification layer?", which is the load-bearing question for any evidence infrastructure. Below 9 because it is inward-facing: it hardens our stack rather than measuring a frontier system. Rises if the cross-stage campaign finds a `claim_falsifying` defect.                                                                                        |
| **Good-for-Anthropic** | **9.2** | A safety-evidence layer that adversarially audits itself and freezes findings before repair is a directly transferable pattern for auditing safety infrastructure. The Q0/Q1 split in particular is a governance primitive, not just an engineering one.                                                                                                                                                 |
| **Constitution**       | **9.6** | The stage is made of non-deception: "zero findings is not a security result", "environmental failure is not evidence of security", "the red team is the blue team". It institutionalises reporting against interest.                                                                                                                                                                                     |

**What moves each higher.** Novelty → 9.3 if the cross-stage seam campaign produces a genuinely new
attack class not in R1–R16 (the taxonomy would then be amended by annex, honestly). Frontier → 9.2 if
a `claim_falsifying` finding lands against a shipped claim and is published unflinchingly.
Good-for-Anthropic → 9.5 with an external reviewer running one tray unaided. Constitution → 9.8 only
by shipping a finding that materially embarrasses the project and refusing to soften it.

### §15.2 Founder's ledger — one external actor, one blocker

**Actor:** a lab or regulator security reviewer asked to answer "has this evidence layer been
attacked, and by whom?" before relying on a Simurgh artifact.

**What they could do tomorrow:** run one stage tray and the mutation self-proof from the frozen
closure, and read the Q0 ledger to see what the producer found against themselves.

**The single blocker:** the same one 5P's reproduction receipt could not discharge — **every attack
in this stage is authored by the party being attacked**. The closure boundary, the taxonomy, and the
severity assignments are all ours. This is tracked as a roadmap debt, not an aspiration: it is the
explicit "what moves it higher" for two of the four axes, and it is the natural first ask of any
external party who receives the 5P bundle.

---

## §16 Deferred to the implementation plan

Named here so their absence is deliberate rather than an omission:

- per-tray attack pack contents and counts (the ruling forbids counts at freeze time);
- the harness module layout and file structure;
- Lean theorem targets for 5Q's own invariants (candidates: delegation-graph acyclicity, ledger
  append-only monotonicity, closure-digest binding);
- attestation payload shape and the two-tier split;
- Python/browser parity surface for 5Q's own deterministic functions;
- CI wiring, including whether the 5Q gate is `self_extending` by construction — it must be, or the
  stage fails its own §2.8 rule on day one.

---

## Freeze block

```text
frozen_sections      §2 §3 §4 §5
freeze_commit        <recorded on freeze, two-commit convention>
freeze_digest        <sha256 of §§2-5 normalised>
amendment_protocol   numbered post-freeze annex only; §§2-5 never reopened
```
