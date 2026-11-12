# Stage 4R — reviewer corroboration runs (honest manifest)

> **Redacted 12 November 2026.** The reviewers' email addresses were removed from this file.
> Nothing else changed. The signed blocks beside it are unchanged and still carry the identity each
> reviewer declared. See [the documentation check](../../../../../documentation-audit-2026-11-12/README.md#private-data-redacted).

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
| `reviewer-Raouf4444.json` | anonymous in block; attributed out-of-band to teacher **Amin** (per Raouf) | `Raouf4444` | n/a (pre-identity) | name is a manifest note, NOT signed | First run; predates the identity/fingerprint fields, so "Amin" is an out-of-band annotation only — the signature does not cover it. |
| `reviewer-Linda.json`     | `Linda (address withheld)`      | `sage-26175e` | `8686d6f26920fa26` | yes (per Raouf)       | Fresh requester-issued challenge; same machine as an earlier practice run (fingerprint match).      |
| `reviewer-Cameron.json`   | `Cameron (address withheld)` | `fern-a2804f` | `da26fa41573fe0ed` | yes (per Raouf)       | Fresh requester-issued challenge; distinct machine (distinct fingerprint).                          |
| `reviewer-James.json`     | `James (address withheld)` | `oak-6afb78`  | `527b716f8646073d` | yes (per Raouf)       | Fresh requester-issued challenge; distinct machine (distinct fingerprint).                          |
| `reviewer-Hamed.json`     | `Hamed (address withheld)`     | `reed-cfc093` | `b1752e9596282bfa` | yes (per Raouf)       | Fresh requester-issued challenge; distinct machine (distinct fingerprint).                          |
| `reviewer-Mojgan.json`    | `Mojgan (address withheld)`   | `pine-0b3a78` | `db883fe06e25ac04` | yes (firsthand, requester's family member) | Fresh requester-issued challenge; distinct machine (distinct fingerprint). |

All five named runs carry DISTINCT fingerprints → five separate machines.

## Honest tally

**5 named, independent runs across 5 distinct machines** (Linda, Cameron, James, Hamed, Mojgan),
each with a fresh requester-issued challenge, a valid signature, and its
fingerprint **confirmed out of band by the requester** (Mojgan firsthand as a
family member) — plus the earlier anonymous first run (attributed by note to
teacher Amin). The five named runs span four Node major versions (18/20/22),
which corroborates that the in-repo reference crypto runs and passes across
independent machines and environments. It is **not** yet a cross-organisation or
institutional
pilot, so the rail `cross_org_operator_b_not_yet_exercised` stays and the
four-axis scores are unchanged. Padding is impossible: each distinct machine
shows a distinct fingerprint, one machine cannot mint more than one (persistent
key), and the requester has confirmed each fingerprint out of band.
