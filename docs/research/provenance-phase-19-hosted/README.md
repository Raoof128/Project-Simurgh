# Phase 19 hosted receipts

Receipts produced by the hosted workflow `.github/workflows/assurance-provenance.yml`, retained as a
run artifact under P19-CI02 and committed here unchanged. See
[the declaration](../PROVENANCE_PHASE_19.md).

A hosted receipt is the project's own runner recomputing the project's own evidence. It is not
custody evidence and does not pay `IOU-19-OPERATOR`; that needs the outside replay described in
[the 19f handoff](../provenance-phase-19f/HANDOFF.md). The same holds for the second directory
here, a replay on a machine the owner operates.

## run-41623244388

| Field    | Value                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Run      | `41623244388`, workflow "Assurance provenance (Phase 19)", push to `phase-19/authority-provenance`                                                                             |
| Commit   | `94b8217b104eaaa54749facc49fdf1d658b14e60` (each receipt's `tree_state`)                                                                                                       |
| Runner   | GitHub-hosted `ubuntu-24.04`, image `20261025.353.1`, x86_64; CPython 3.12.15                                                                                                  |
| Artifact | `phase-19-receipts`, ID `13226108407`, zip sha256 `f6aac818daf04b29b791c4eaad363e5a7033aac56a1b082eebebb024b29773e4`                                                           |
| Suite    | `tools/assurance-provenance/tests`: 138 tests, OK, 10 skipped (the namespace tests, which run without `sudo` in that step; the 19d pack verifies under `sudo` in its own step) |

The zip was downloaded through the GitHub API and its sha256 matched both the digest the upload step
printed and the digest the API reports. The six files are the zip's members, byte for byte:

| File               | sha256                                                             |
| ------------------ | ------------------------------------------------------------------ |
| `receipt-19a.json` | `c7aa3ef366147370eacebd8a7bfb5b598470f1d441cde5e02515635182f30694` |
| `receipt-19b.json` | `a7d56241a3beef189e7fc6536405fb1d92442557f3275a00556f90185794a2b7` |
| `receipt-19c.json` | `fb326f0dd5812676013146a8cbb5493f91e8333733d20d3a54e4fe0c7cf2adb2` |
| `receipt-19d.json` | `6448a31b6516b28cc9143437230708599bc4e7d0c731c66155b84560a1f66505` |
| `receipt-19e.json` | `cc1b49997451d42d5d5c24ae91cfb74d4d8f4c5c8688892a7891a9b9bac99235` |
| `receipt-19g.json` | `2a7c98678fe43eeb645eee9eb3e3a362b3b23b69490308f9dd8eb4e2f21aae92` |

What they show:

- **19a** ran with `--replay`: `kind` is `frozen_replay_chained` and `replay.result` is `verified`.
  This is the Linux x86_64 run of the frozen Phase 17 replay chain that the 19a pack could not run
  on the authoring Mac.
- **19b** (closed), **19c**, **19d** (inside a user and network namespace, under `sudo`), **19e**
  (instrument, capture not run) and **19g** (the pack regenerated under P19-REPAIR01) verified.
- `handoff19.py check <phase> <receipt>` reports no discrepancy for any of the six against the
  committed receipts. For 19a this needs the comparator repair in `6a93b39a`; before it, the
  instructed `--replay` run read as a `kind` discrepancy.

## droplet-portfolio-2026-11-08

A replay on `portfolio-droplet`, the owner's own DigitalOcean virtual machine, driven by the
project's agent over `ssh` with the project's own key (the owner's rule of 8 Nov 2026). It is a
second project-operated host, not an outside operator: nobody outside the project touched it, so it
does not pay `IOU-19-OPERATOR`. What it adds is a machine class the other two runs did not cover: a
bare VM, root, user and network namespaces available without `sudo`, no Docker, no Lean toolchain.

| Field  | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host   | `portfolio-droplet`, Ubuntu 24.04.3 LTS, Linux 6.8.0-134-generic x86_64, 2 vCPU, 2 GB RAM; CPython 3.12.3, SQLite 3.45.1                                                                                                                                                                                                                                                                                                                                                                                                       |
| Commit | `6a10a4b960bb06432f6f5ba5a925a0833b569026` (each receipt's `tree_state`; the head of PR #149 before its merge commit), fresh clone under `/root/simurgh-replay`                                                                                                                                                                                                                                                                                                                                                                |
| Deps   | venv; `pip install --require-hashes --only-binary=:all:` from `tools/assurance-sdk/requirements.lock` and `tools/assurance-workflow/requirements.lock`; `pip check` clean; `tools/replay-preflight/preflight.py` passed                                                                                                                                                                                                                                                                                                        |
| Steps  | `verify` for 19a (`--replay`), 19b, 19c, 19d, 19e, 19g at `nice -n 15`, each against the committed `ROOT.sha256`; `handoff19.py check <phase> <receipt>` after each                                                                                                                                                                                                                                                                                                                                                            |
| Suite  | `tools/assurance-provenance/tests`: 139 tests, 3 skipped (no Lean toolchain; the two off-host refusal tests), 1 failure: `test_lanes19d.Lanes19dTests.test_covert_probe_reported_not_closed` (`0 not greater than 0`). The probe runs `python -c` in the namespace and stock Ubuntu has `python3` only, so `unshare` exits 127 and the probe reports zero bytes; the 19d `verify` passed because the probe is reported, not compared. Repair declared and owed as P19-REPAIR02 in [the declaration](../PROVENANCE_PHASE_19.md) |

The receipts were copied off the host with `scp` and are committed unchanged:

| File               | sha256                                                             |
| ------------------ | ------------------------------------------------------------------ |
| `receipt-19a.json` | `6ae836b3ec19abc8976931130287a92f09dc694f95fcd79a1169b0073eeb8277` |
| `receipt-19b.json` | `1bf0fed6abbd6afbd60fca796254c3d1ec5141d8e64894b71f5172a3d5ee0aa2` |
| `receipt-19c.json` | `d4028076874609d8bd01c1435a37c7c172a4931d7f4e38ac96bee24a6cf965c1` |
| `receipt-19d.json` | `43d2e81a843efcb7cd3130e5737b0a3b72faac64917dd08eca181799429f0b9d` |
| `receipt-19e.json` | `9595f89c0ebafc150c0c3e9b2604d571e5d5b0a494bb9ed2c44e3f02bc3a9458` |
| `receipt-19g.json` | `26b3425f05bd2a8d78fe72f28ed723088b4ae057145f18f84cfde8a8e13d6ab2` |

What they show:

- All six packs verified, and `handoff19.py check` reports no discrepancy for any of them against
  the committed receipts, on the host and again locally.
- **19a** ran with `--replay`: `kind` is `frozen_replay_chained` and `replay.result` is `verified`.
  This is the second Linux x86_64 host on which the frozen Phase 17 chain replays from the
  hash-locked dependency set.
- **19d** verified as root in a bare VM where user namespaces are available directly; the hosted run
  needed `sudo` and the authoring Mac needed Docker. The receipt's `host` field is the pack's
  recorded production host (`aarch64`, `linuxkit`), not the verifying machine, and the 19f
  comparator excludes it for that reason.
- Field by field, each receipt differs from its hosted counterpart in `run-41623244388/` only in
  `tree_state`. Read with care: before P19-REPAIR03 the 19b, 19d, 19e and 19g verifiers copied the
  fields the receipt reports from the saved pack rather than from the verifying host (the 19b
  receipt here says Lean type-checked on a host with no Lean, and the 19d receipt names the pack's
  Docker Desktop host), so "only `tree_state` differs" corroborates less than it reads: the fields
  that could have differed were never recomputed. Both receipt sets here predate the repair and
  describe the packs of their day; the repaired verifiers derive every receipt field from the
  recomputation.
  The 19d pack was regenerated again under P19-REPAIR04 with the hardened namespace; the droplet
  receipt here (and the P19-REPAIR03 pack's receipt before it) show the five daemon sockets that were
  reachable before that repair.
