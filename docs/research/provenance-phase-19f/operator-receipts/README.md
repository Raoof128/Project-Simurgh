# Operator receipts

Returned receipts go here unchanged, one JSON file per operator and date
(`<phase-or-all>-<operator>-<YYYY-MM-DD>.json`). The author's review of each, recomputed from the
file by `python -B tools/assurance-provenance/handoff19.py review <receipt>`, is committed under
[`../operator-reviews/`](../operator-reviews/) as `<same-name>.review.json`; a test asserts the
committed review equals the recomputation.

| Receipt                                                    | Host                                  | Verified                             | Not exercised                         |
| ---------------------------------------------------------- | ------------------------------------- | ------------------------------------ | ------------------------------------- |
| [all-Michael-2026-11-10.json](all-Michael-2026-11-10.json) | macOS 13 x86_64, Python 3.12, no Lean | 19a (projection), 19b, 19c, 19e, 19g | 19d, 19a `--replay`, 19b Lean closure |
