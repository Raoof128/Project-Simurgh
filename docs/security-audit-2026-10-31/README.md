# Repository audit, red team and remediation — 31 October 2026

**Audited revision:** `fix/pass3-audit-findings` at `e75753d1` (eight commits ahead of `main`
`6e4a1a0b`), continued on `audit/2026-10-31-full-repository`. **Method:** seven independent
read-only reviewers, one per area, each required to reproduce a finding by running code before
reporting it; the lead re-verified, repaired, and ran the regression suites. **Host:** macOS
arm64, Node 24.21.0, Python 3.12.2 and 3.15.2, Lean 4.15.0, cargo 1.97.1, Swift 6.4.2, .NET 7.0.307.
Nothing was pushed, merged, tagged or deployed.

| Deliverable                   | File                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| A. Machine-readable inventory | `inventory.json` (8,940 tracked files, SHA-256, category, mutability, review status) |
| B. Findings register          | `FINDINGS.md`                                                                        |
| C. Remediation record         | `REMEDIATION.md`                                                                     |
| D. Verification matrix        | `VERIFICATION.md`                                                                    |
| E. Research-claim audit       | `RESEARCH_CLAIMS.md`                                                                 |
| F. Residual-risk register     | `RESIDUAL_RISK.md`                                                                   |
| G. Executive report           | this file                                                                            |
| Primary sources consulted     | `SOURCES.md`                                                                         |

## The central question

> Can Project Simurgh enforce its declared authority and containment boundaries, preserve
> evidence of real consequences, and allow an independent verifier to distinguish legitimate
> behaviour from manipulation, omission, forgery and unsupported claims?

**Within the evaluated scope, the composed authorisation boundary held and the research numbers
recompute; the surrounding engineering did not hold until repaired, and several frozen verifiers
cannot distinguish an honest producer from a dishonest one.** In detail:

- **Composed authorisation (A1, A2).** No attack produced an unauthorised receiver effect:
  untrusted output, forged summaries and checkpoints, 19 of 22 canonicalisation variants,
  revoke-then-dispatch, token reuse, stop-then-dispatch on both routes, lease expiry and clock
  rewind, delegation laundering, eight-process races, SIGKILL at four points, replay, truncated
  databases and concurrent budget spend all failed. 600 random-time kills of racing durable
  executors produced one effect every time. The gaps found were in the alert path of the
  post-freeze successor (a signed alert could be dropped over an irrelevant header or an
  unparseable body, and a pending alert did not hold the sibling route); all three are repaired
  and re-tested with the reviewer's own harness.
- **LLM Shield containment (B).** The failure chain holds only because nothing downstream can
  act: no tool executes and the live route returns 410. Tested layer by layer, the output
  firewall is a fixed-marker regex that exports canaries and keys and blocks nine of twelve
  benign code outputs; the frozen gateway exported provider text at blocked cumulative risk; the
  per-IP session bound was bypassed by `//sessions`; and the adapter's egress gate grounds attacker
  addresses by substring. The bypass and the export are repaired (the latter at the mount, since
  `src/llmShield` is frozen); the rest is disclosed with the exact reproduction.
- **Evidence integrity (C, E).** Signatures verify, roots match, 713 of 713 pinned source paths
  match the tree, 39 of 39 proofs compile on the three standard axioms. What a signature does not
  establish is spelled out per stage: the 4F frontier is unsigned (open), the 4N CLI is
  unauthenticated with a Merkle second preimage (open), the 5S verifier never checks a witness
  signature and reads its key from beside the bundle (open), the shared canonical JSON is
  non-injective (disclosed; no committed digest affected). One new High in maintained tooling was
  repaired: a verifier launched through a symlinked or space-containing path exited 0 printing
  nothing.
- **Runtime server (D).** One anonymous 12 KB request crashed the process (P0, repaired), anonymous
  callers could drive paid model calls with no ceiling (P1, repaired), a provider outage blanked
  the evidence behind a Critical verdict, the audit chain truncated silently and kept accepting
  writes after submit, `.env` was loaded after the configuration snapshot, placeholder secrets ran,
  and session ids could be squatted. All repaired, including (second pass) one open session per
  student per exam, purged guard maps and a bounded limiter scan.
- **Research claims (F).** Every headline number in README, BRIEF and RESULTS recomputed from the
  archives without the repository's own scorer; no exclusions, no denominator mismatch, matched
  controls receive identical proposals, effects come from receiver snapshots. Two framing
  corrections were added (the credential-only baseline cannot observe stop state, so 17/24 → 0/24
  mostly measures call emission; the Llama identity rests on the worker's manifest hash) without
  changing a number.
- **CI and supply chain (E, lead).** The three red checks on the pass-3 pull request came from the
  repository's own frozen-stage rules, not from the code; they are repaired without weakening a
  gate. All 79 action references are SHA-pinned (75 on this branch, the last four on the two
  stage-workflow branches), elan and pytest are hash-verified, the base image is digest-pinned,
  and the compose file no longer publishes a demo server with a default secret on every interface.

## Counts

| Severity |  Found |  Fixed | Partially fixed | Disclosed (frozen) | Open (maintained) |
| -------- | -----: | -----: | --------------: | -----------------: | ----------------: |
| P0       |      1 |      1 |               0 |                  0 |                 0 |
| P1       |      8 |      4 |               1 |                  3 |                 0 |
| P2       |     33 |     22 |               4 |                  7 |                 0 |
| P3       |     41 |     22 |               0 |                 19 |                 0 |
| **All**  | **83** | **49** |           **5** |             **29** |             **0** |

"Disclosed" means reproduced in a surface that stays byte-identical (hash-pinned gate modules,
`src/llmShield`, the Stage 4U adapter, stage-owned verifiers) and recorded in SECURITY.md with a
successor or mount-level correction where one exists. Attacks that failed are listed per area in
`FINDINGS.md`; a clean result from an internally authored attack set is not evidence of universal
resistance.

## What is demonstrably better

- The server survives malformed input that killed it, bounds model spend, honours its own
  configuration, and reports what it could not record.
- The composed-gate successor never discards an authentic alert and holds every route while one
  is unresolved.
- Verifiers run (and fail loudly) from any checkout path; the 3M gate pins its signer; evidence
  hashes cover bytes; the Lean gate asks the kernel which axioms each theorem uses.
- The quality gate cannot be made green by rewriting tracked bytecode, and three reproduce
  scripts cannot print `ALL PASS` after a failure.
- The explorer cannot present an imported bundle as repository evidence after one click, and it
  refuses an archive whose root or members disagree with its manifest.
- A maintained export scan at the mount withholds secret-shaped tokens, encoded or spaced policy
  markers, configured canaries and echoes of request contexts that the frozen firewall exported;
  the maintained verifier refuses bundles whose text or value is ambiguous; the successor re-drives
  revocation after a crash.

## What remains risky

The residual-risk register separates the four classes. The items that matter most to a user of
the maintained runtime: the LLM Shield output firewall is a marker filter, not a leakage boundary;
the frozen 4F/4N/5S verifiers do not establish what their names suggest; branch protection on
`main` still requires nothing; and no outside operator has reproduced the study.

## Suitability for the declared research use

The maintained composed-authorisation runtime, its replayable evidence and the explorer are
suitable for the declared research use: a bounded, internally authored comparison whose numbers
an outside reader can recompute from the archives, with the trust assumptions stated. They are
not suitable, and do not claim to be, as a production authorisation layer, as a jailbreak defence,
or as independently certified evidence.

## Verdict

**PARTIALLY REMEDIATED, BLOCKERS REMAIN.** Every reproducible P0/P1 defect in a maintained surface
is repaired with regression coverage, and the frozen-surface defects are disclosed rather than
hidden. The blockers are not code: the seccomp replay, the Linux-only suites, Node 26 reproduce
scripts and the hosted gates could not run on this host, and three P1 findings live in frozen
surfaces (the 4F frontier, the 5S verifier, the Stage 4U adapter) whose repair needs a declared
maintenance surface and a re-run of their lanes. The
hosted CI has not run on these revisions.
