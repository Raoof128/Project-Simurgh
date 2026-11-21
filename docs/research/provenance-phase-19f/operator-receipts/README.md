# Operator receipts

Returned receipts go here unchanged, with the one exception noted under the table, one JSON
file per operator and date
(`<phase-or-all>-<operator>-<YYYY-MM-DD>.json`). The author's review of each, recomputed from the
file by `python -B tools/assurance-provenance/handoff19.py review <receipt>`, is committed under
[`../operator-reviews/`](../operator-reviews/) as `<same-name>.review.json`; a test asserts the
committed review equals the recomputation.

| Receipt                                                    | Host                                              | Verified                                                           | Not exercised                         |
| ---------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| [all-Michael-2026-11-10.json](all-Michael-2026-11-10.json) | macOS 13 x86_64, Python 3.12, no Lean             | 19a (projection), 19b, 19c, 19e, 19g                               | 19d, 19a `--replay`, 19b Lean closure |
| [all-Jacob-2026-11-15.json](all-Jacob-2026-11-15.json)     | Ubuntu 26.04 x86_64, CPython 3.12.16, Lean 4.15.0 | 19a to 19v (twenty-one lanes), five with `--replay`, 19b with Lean | 19w, 19x, 19q `--dataset`             |
| [all-Mona-2026-11-15.json](all-Mona-2026-11-15.json)       | Windows 10 run natively, Python 3.12.10, no Lean  | none: every verifier refused                                       | everything                            |

The files are stored under this directory's naming rule. The second came back as
`Jacob-Phase19-receipt.json` and the third as `Phase19-Windows-results-2026-11-15.json`. The
second's bytes are unchanged. In the third, the operator's Windows user folder name is replaced by
`<redacted>` in 105 places and nothing else is changed; the file as returned has sha256
`e4f22c47edb7d7472e21d5e0ad5b959273d16e8f4b17b20968c442617bf710a4`. A test pins the sha256 of
each committed file. A file an operator returned beside a receipt is kept
unchanged in `<receipt-name>.attachments/`.
