# Stage 5P (VSI) — independent verification bundle

**You should not have to trust us.** This bundle exists so you can check the claims yourself, with
tools you already have, without running our test suite or importing a line of our code.

```bash
python3 verify.py
```

That is the whole thing. It needs **Python 3 and `openssl`** — both already on macOS and every Linux
distribution — and **no network**. It takes about a second.

Exit code `0` means every check passed. Any failure prints which check, and you should tell us.

---

## What Stage 5P claims

Evidence can bind a submission to an authenticated identity **without** proving that identity stays
resolvable or accountable later. Those are different properties, and systems routinely conflate
them. 5P makes the distinction machine-checkable using four **independent** axes:

| Axis | Question it answers |
| --- | --- |
| `binding` | does a signature actually verify? |
| `resolution` | does anyone vouch for **who** holds the key? |
| `continuity` | will this identity still resolve later? |
| `role` | is this party authorised to act for someone else? |

They are compared **componentwise**, under a partial order — deliberately **not** a score or a
ranking. `verify.py` recomputes this and reports the number that makes the point: **276 of 576
ordered pairs are incomparable**. Any single "identity strength" number has to invent an ordering
for those pairs. That invention is the failure mode this stage exists to prevent.

## What `verify.py` establishes

1. **The attestation is authentic and unaltered.** Ed25519, checked via `openssl` against the public
   key in this bundle. Change one field of the payload and it fails — try it.
2. **Every evidence file matches its committed digest.**
3. **The Rekor entry is genuinely in the public transparency log** — and this is the part worth your
   attention. The script does not take the log server's word for anything: it **recomputes the RFC
   6962 inclusion proof itself**, checks the result equals the root the log actually **signed**, and
   verifies Rekor's Signed Entry Timestamp under Rekor's own published key.
4. **The identity lattice reproduces in an implementation we did not write** — the one inside
   `verify.py`, over all 576 ordered pairs.

## What it does NOT establish

Stated here rather than in an appendix, because these are the claims most likely to be
over-read:

- **Lane B is NOT a Fulcio keyless ceremony.** The signer is a self-managed key. A transparency log
  proves an artifact existed and was signed by **something** at a time. It never says by **whom**.
  Every verdict our code emits carries `is_keyless: false`.
- **Lane C1's registry records are not signed by GLEIF.** Authentication is TLS-at-capture, then
  digest-frozen. If you trust these records, you are trusting the capturer.
- **Lane C2 was never run.** No profile proving durable role authority exists yet anywhere; vLEI OOR
  and eIDAS 2.0 QEAA are the runway. The attestation says so under signature.
- **Lane L is not a measurement.** One model, one day, three prompts. It shows a live model producing
  a fluent authority claim and our verifier refusing it. That is a claim about **our code**, never
  about model safety or about models in general.

All of the above are inside the **signed** `known_limitations`. `verify.py` prints them. If a
producer's limitations list is empty or vague, that tells you something.

## Verify the Rekor entry against the real world

The strongest check is one this bundle cannot fake, because it involves someone else's server:

```bash
curl -s https://rekor.sigstore.dev/api/v1/log/entries/108e9186e8c5677a869aaa5794d6c3c8030176e8d23629cb72432c6a1d0177b67edb8ba7c98fc64e
```

Compare the `body` field to `rekor-ceremony/rekor-response.json`. If they match, the entry is real,
public and permanent — and we did not invent it. Log index `2245421742`.

## Try to break it

A verifier nobody has seen reject is not worth much. Both of these should fail loudly:

```bash
# 1. change one field of the signed payload
python3 -c "import json;d='attestation/stage5p-attestation.json';b=json.load(open(d));\
b['public']['payload']['lane_b_log_index']=999;json.dump(b,open(d,'w'),indent=2)"
python3 verify.py      # -> public tier signature verifies: FAIL

# 2. add one byte to the logged artifact
printf ' ' >> rekor-ceremony/artifact.json
python3 verify.py      # -> digest, signature and log-entry binding all FAIL
```

Restore from your original copy afterwards.

## Contents

| Path | What it is |
| --- | --- |
| `verify.py` | the independent verifier — read it before you run it |
| `attestation/` | the signed two-tier attestation and its public key |
| `rekor-ceremony/` | the real Rekor entry, its inclusion proof, and Rekor's log key |
| `gleif-capture/` | three frozen LEI records (ISSUED / LAPSED / RETIRED) |
| `lane-l-capture/` | verbatim live-model responses, with dispositions |
| `parity-vectors.json` | the full 24-vector, 576-pair lattice space |
| `vsi_parity.py` | our stdlib parity script, for comparison with `verify.py` |
| `browser/` | a zero-dependency browser verifier (open `index.html`) |
| `proofs/Vsi.lean` | 14 Lean theorems, zero proof escapes (`lean proofs/Vsi.lean`) |
| `SPEC.md` | the frozen specification |
| `CLOSEOUT.md` | what shipped, what each gate caught, and the honest remainder |

## Full reproduction

This bundle is the offline subset. To reproduce everything including the test suite:

```bash
git clone https://github.com/Raoof128/Project-Simurgh
cd Project-Simurgh && git checkout v2.51.0-stage-5p-vsi
./scripts/reproduce-llm-shield-stage5p.sh
```

## If you find something wrong

That is the point of sending this. A failed check, an overstated claim, a limitation we should have
listed and did not — all of it is more useful to us than a green tick.
