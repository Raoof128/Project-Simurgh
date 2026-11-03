# Phase 19 hosted receipts

Receipts produced by the hosted workflow `.github/workflows/assurance-provenance.yml`, retained as a
run artifact under P19-CI02 and committed here unchanged. See
[the declaration](../PROVENANCE_PHASE_19.md).

A hosted receipt is the project's own runner recomputing the project's own evidence. It is not
custody evidence and does not pay `IOU-19-OPERATOR`; that needs the outside replay described in
[the 19f handoff](../provenance-phase-19f/HANDOFF.md).

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
