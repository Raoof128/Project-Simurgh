# Stage 4R — reviewer corroboration runs (honest manifest)

Each `*.json` here is a signed block from someone who ran the self-contained
`tools/simurgh-attestation/stage4r/byo/reviewer-run.mjs` on their own machine.
Verify any block with:

```bash
node tools/simurgh-attestation/stage4r/byo/reviewer-run.mjs --verify <file> [<challenge>]
node tools/simurgh-attestation/stage4r/byo/reviewer-aggregate.mjs   # tally all
```

## What a verified block proves — and does not

A valid signature proves the block is **intact, bound to its challenge, and the
ceremony (shared→match, different→non-match) self-verified green** on some
machine. It does **NOT** cryptographically prove *who* ran it or on which OS —
those are self-declared. Attribution rests on the requester confirming the
reviewer's key fingerprint **out of band** (their real email/GitHub). The
persistent per-machine key means repeat runs from one machine keep the same
fingerprint, so re-runs cannot pad the count.

## Ledger

| File                      | Identity (self-declared)          | Challenge     | Fingerprint        | Out-of-band confirmed | Notes                                                                                              |
| ------------------------- | --------------------------------- | ------------- | ------------------ | --------------------- | -------------------------------------------------------------------------------------------------- |
| `reviewer-Raouf4444.json` | anonymous (old-format)            | `Raouf4444`   | n/a (pre-identity) | n/a                   | First run; predates the identity/fingerprint fields.                                               |
| `reviewer-Linda.json`     | `Linda <lala4433@gmail.com>`      | `sage-26175e` | `8686d6f26920fa26` | yes (per Raouf)       | Fresh requester-issued challenge; same machine as an earlier practice run (fingerprint match).      |
| `reviewer-Cameron.json`   | `Cameron <ameronjd41291@gmail.com>` | `fern-a2804f` | `da26fa41573fe0ed` | pending               | Fresh requester-issued challenge; distinct machine (distinct fingerprint). Confirm fingerprint next. |
| `reviewer-James.json`     | `James <james.ja555@outlook.com>` | `oak-6afb78`  | `527b716f8646073d` | pending               | Fresh requester-issued challenge; distinct machine (distinct fingerprint). Confirm fingerprint next. |

All three named runs carry DISTINCT fingerprints → three separate machines.

## Honest tally

**3 named, independent runs across 3 distinct machines** (Linda, Cameron, James),
each with a fresh requester-issued challenge and a valid signature — plus the
earlier anonymous first run. Linda's fingerprint is out-of-band confirmed;
Cameron's and James's confirmations are **pending** (a 10-second "is this your
fingerprint?" to each). This corroborates that the reference crypto runs and
passes on multiple independent machines with named reviewers. It is **not** yet a
cross-organisation or institutional pilot, so the rail
`cross_org_operator_b_not_yet_exercised` stays and the four-axis scores are
unchanged. Padding is impossible: each distinct machine shows a distinct
fingerprint, one machine cannot mint more than one (persistent key), and the
requester confirms each fingerprint out of band.
