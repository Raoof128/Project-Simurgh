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
| `reviewer-Raouf4444.json` | anonymous in block; attributed out-of-band to teacher **Amin** (per Raouf) | `Raouf4444` | n/a (pre-identity) | name is a manifest note, NOT signed | First run; predates the identity/fingerprint fields, so "Amin" is an out-of-band annotation only — the signature does not cover it. |
| `reviewer-Linda.json`     | `Linda <lala4433@gmail.com>`      | `sage-26175e` | `8686d6f26920fa26` | yes (per Raouf)       | Fresh requester-issued challenge; same machine as an earlier practice run (fingerprint match).      |
| `reviewer-Cameron.json`   | `Cameron <ameronjd41291@gmail.com>` | `fern-a2804f` | `da26fa41573fe0ed` | yes (per Raouf)       | Fresh requester-issued challenge; distinct machine (distinct fingerprint).                          |
| `reviewer-James.json`     | `James <james.ja555@outlook.com>` | `oak-6afb78`  | `527b716f8646073d` | yes (per Raouf)       | Fresh requester-issued challenge; distinct machine (distinct fingerprint).                          |
| `reviewer-Hamed.json`     | `Hamed <hamedz928@gmail.com>`     | `reed-cfc093` | `b1752e9596282bfa` | pending               | Fresh requester-issued challenge; distinct machine (distinct fingerprint). Confirm fingerprint next. |
| `reviewer-Mojgan.json`    | `Mojgan <Mojgan_m40@yahoo.com>`   | `pine-0b3a78` | `db883fe06e25ac04` | yes (firsthand, requester's family member) | Fresh requester-issued challenge; distinct machine (distinct fingerprint). |

All five named runs carry DISTINCT fingerprints → five separate machines.

## Honest tally

**5 named, independent runs across 5 distinct machines** (Linda, Cameron, James, Hamed, Mojgan),
each with a fresh requester-issued challenge and a valid signature. Linda,
Cameron, James, and Mojgan are fingerprint-confirmed out of band by the requester
(Mojgan firsthand as a family member); Hamed's confirmation is **pending** — plus
the earlier anonymous first run (attributed by note to teacher Amin). This
corroborates that the reference crypto runs and passes on multiple independent
machines with named reviewers. It is **not** yet a cross-organisation or
institutional
pilot, so the rail `cross_org_operator_b_not_yet_exercised` stays and the
four-axis scores are unchanged. Padding is impossible: each distinct machine
shows a distinct fingerprint, one machine cannot mint more than one (persistent
key), and the requester has confirmed each fingerprint out of band.
