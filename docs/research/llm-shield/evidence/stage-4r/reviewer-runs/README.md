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

| File                    | Identity (self-declared)        | Challenge     | Fingerprint        | Out-of-band confirmed | Notes                                                              |
| ----------------------- | ------------------------------- | ------------- | ------------------ | --------------------- | ----------------------------------------------------------------- |
| `reviewer-Raouf4444.json` | anonymous (old-format)        | `Raouf4444`   | n/a (pre-identity) | n/a                   | First run; predates the identity/fingerprint fields.              |
| `reviewer-Linda.json`   | `Linda <lala4433@gmail.com>`    | `sage-26175e` | `8686d6f26920fa26` | yes (Linda, per Raouf) | Fresh requester-issued challenge; same machine as an earlier practice/"Test Run" block (fingerprint match), i.e. one genuine reviewer who tested first. |

## Honest tally

**1 genuinely attributable independent run (Linda), fingerprint confirmed by the
requester** — plus the earlier anonymous first run. This corroborates that the
reference crypto runs and passes on an independent machine, with a named,
confirmed reviewer. It is **not** yet a cross-organisation or institutional
pilot, so the rail `cross_org_operator_b_not_yet_exercised` stays and the
four-axis scores are unchanged. Padding is impossible here: distinct machines
show distinct fingerprints, and the requester must confirm each one.
