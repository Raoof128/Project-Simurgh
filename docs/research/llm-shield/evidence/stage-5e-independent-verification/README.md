# Stage 5E VDA — conformance-kit reproduction, 2026-08-01

**AnthropicSafe First, then ReviewerSafe.**

`RAW_RESULTS.md` beside this file is the operator's own record, committed verbatim. It is the
primary artifact; this file only frames it. Where the two disagree, the raw file wins.

## Scope, stated before the result

This is an **independent ENVIRONMENT and a second OPERATOR**, and those two claims are not equally
evidenced:

- **Platform independence — discharged.** Five runs across two architectures. The committed
  attestation verifies to raw 0 at both tiers, the evidence rebuilds byte-identically, and the
  stdlib-Python parity implementation reproduces 40 deterministic facts with 4 slips at θ=0.5000, on
  Linux x86_64 (Ubuntu 6.8, Node v26.5.0, Python 3.12.3) as on macOS arm64 (Node v26.5.1, Python
  3.14.6).
- **Party independence — NOT discharged by this artifact.** A different operator ran the kit. The
  record does not yet demonstrate that: the commands in Runs 2 and 4 are `scp`/`ssh` invocations
  issued from the author's shell with the author's key, which a reader cannot distinguish from a
  self-run. This project's own standard is that a third party's self-assertion of independence is an
  input rather than evidence, and that standard is applied here to the project's own favour. **No
  score moves on this.** See the attestation block below for what would close it.

Nothing here re-runs Prompt Guard. The kit verifies deterministic arithmetic and geometry over
committed model scores. A slip is a threshold miss on a pinned revision — not a detector "defeat",
and not evidence of downstream harm.

## What the five runs establish, in order

| run | host                         | step 6/6 (Lean)                                          | result   |
| --- | ---------------------------- | -------------------------------------------------------- | -------- |
| 1   | macOS arm64                  | type-check only, claim unearned                          | ALL PASS |
| 2   | Linux x86_64                 | **did not execute** — `lean` absent, skipped silently    | ALL PASS |
| 3   | macOS arm64, new kit         | escape-hatch scan + type-check                           | ALL PASS |
| 4   | Linux x86_64, new kit        | **escape-hatch scan ran**, type-check named as skipped   | ALL PASS |
| 5   | Linux x86_64, new kit + elan | escape-hatch scan + type-check, both on the foreign host | ALL PASS |

`KIT_DIGESTS.txt` records which bytes each run exercised. The filename `simurgh-vda-conformance.zip`
was reused across three artifacts in one afternoon, and **the kit Runs 3-4 used was overwritten in
place and is not retained** — those two runs describe a kit that can no longer be re-examined. Run 5
supersedes them on every point, and nothing here rests on them alone.

Runs 1 and 2 are kept because they are the reason the kit changed, not because they are good news.

**Run 2 is the finding.** On the only architecturally independent host, step 6 skipped entirely and
`ALL PASS` printed over a check that never ran. `lean` exits 0 on a `sorry` — it is a warning, not
an error — so the line `lean OK (zero sorry)` in Run 1 was unearned even where the toolchain was
present. Six shipped reproduce scripts carried that claim. Repaired by delegating to the repo-wide
gate, whose escape-hatch scan is source-based and therefore runs with or without a toolchain.

**Run 5's failed first attempt is also evidence.** `sudo` resets `$HOME` to `/root`, so elan
installed under `eoiadmin` could not resolve its toolchain; the gate returned
`lean_gate_typecheck_failed` with the elan error as its detail and exit 1. A toolchain that is
ABSENT is a named skip; a toolchain that is BROKEN is a failure. That distinction now has a field
witness rather than only a unit test.

## Operator attestation — UNCOMPLETED

Party independence stays open until this block is filled in by the operator, in their words, and
signed with a key the author does not hold. An anchor over a digest does not buy it, and neither
does this paragraph.

```text
operator_name:           <who ran the kit>
operator_affiliation:    <organisation, or "independent">
infrastructure_owner:    <who provisions and pays for the host>
author_shell_access:     <did the author hold a shell on this host during the run? yes/no>
credential_separation:   <did the operator use their own credentials, not the author's key? yes/no>
run_log:                 <path to the operator's own tee log, produced on their side>
kit_sha256:              <sha256 of the zip the operator received>
signature:               <detached signature over this block, by a key the author does not hold>
public_key:              <the verifying key, published independently of this repository>
```

Until `credential_separation: yes` and a signature verifying under a key outside the author's
control are both present, this reproduction is recorded as an independent environment only — the
same status as `../droplet-repro-receipt.txt`, which says so in its own header.
