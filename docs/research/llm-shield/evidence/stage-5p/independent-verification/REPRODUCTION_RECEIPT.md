# Stage 5P — independent-verification bundle: reproduction receipt

**Run on a remote Linux host, 2026-07-25. `RESULT: ALL CHECKS PASSED`, exit code `0`.**

The bundle was transferred by `scp` to a machine that shares nothing with the development laptop —
different CPU architecture, different operating system, different Python minor version, different
OpenSSL generation — extracted, and run with `python3 verify.py` by an operator with access to that
host.

## The environment delta is the point

| | Producer (development) | Reproduction host |
| --- | --- | --- |
| architecture | `arm64` | **`x86_64`** |
| OS | macOS (Darwin 25.5.0) | **Ubuntu Linux 6.8.0-134-generic** |
| Python | 3.14.6 | **3.12.3** |
| OpenSSL | 3.6.3 | **3.0.13** |

Nothing in the toolchain is shared. Every value below was therefore recomputed by a different
SHA-256 implementation, a different Ed25519/ECDSA implementation, and a different JSON serialiser —
and landed on the same bytes.

| Recomputed value | Result |
| --- | --- |
| artifact digest | `839b7729289f8a10dd2a113b905bff3dcbf3d5738f697644951f5ebe5cddaa80` |
| RFC 6962 Merkle root | `396791ba179f872808a6c5ce3c2aa90abeb02f6d281e097934472bec1e95c416` |
| Rekor log index | `2245421742` |
| lattice pairs agreeing | 576 / 576 |
| incomparable pairs | 276 / 576 |
| signed limitations read | 12 |
| checks failed | **0** |

The canonical-JSON result is worth singling out. The attestation's Ed25519 signature only verifies if
the host reproduces `canonicalJson(payload)` **byte for byte**. A Python two minor versions apart, on
a different architecture, did — so the canonicalisation is a property of the specification rather
than of one interpreter build.

## What this establishes, and what it does NOT

**Establishes: the bundle is portable.** It runs on a stock Linux box with an older Python and an
older OpenSSL, needing nothing but the standard library and the `openssl` binary. A recipient with an
ordinary environment can run it. That claim was previously an assertion; it is now a receipt.

**Does NOT establish: party independence.** An earlier version of this receipt asserted that the
operator was the producer. That was wrong — the run was performed by a third party with access to the
host, not by this repository's author. The correction is recorded here rather than quietly applied,
because what it changes is instructive: it changes the **history** of this run and not its
**evidential weight**.

The reason is the subject of this stage. The transcript binds the run to a shared administrative
account (`whoami` returns a role login, not a person), it carries no signature, and the environment
strings are self-reported by the same shell that reported the results. Nothing in the record
distinguishes *"a third party ran this"* from *"the producer ran this"* — both hypotheses fit the
evidence equally well. In this stage's own vocabulary the operator is **`identity_unresolved`**: the
strongest available claim is an assertion made in conversation, and §2 is precisely the rule that an
assertion of identity, however credible, is not a **resolution** of one. A shared account is an
opaque handle — the `account` principal kind — and handles do not name parties.

So the closeout's open item —

> Anthropic relevance → 9.5 needs one external party running the Lane A verifier unaided from the
> spec

— is **not discharged by this run and must not be reported as discharged**, and the reason is now
sharper than it was: not *"the operator was us"* but *"the record cannot say who the operator was."*
Cross-machine reproduction rules out *"it only works on the author's laptop"*. It cannot rule out
*"the author's judgement is wrong about what the evidence means"*, and only an attributable reviewer
can do that.

**What would discharge it** is small and concrete — the party who ran it returns a result bound to
**them** instead of to a shared login:

```bash
python3 verify.py | tee result.txt              # on their machine
openssl dgst -sha256 -sign their-key.pem -out result.sig result.txt
```

Sending `result.txt`, `result.sig` and the public half, under a name that can be pointed at, is one
signature away — and it is the whole distance between *"someone ran it"* and *"this party ran it"*.
That Stage 5P cannot verify the identity of the party who verified Stage 5P is not an embarrassment
to the thesis; it is the thesis, applied to its own receipt.

No score moved on the strength of this run, and none should move on a run whose operator the record
cannot name. Stage 5P's four axes remain **9.1 / 9.0 / 9.2 / 9.5**.

## Host redaction

The reproduction host's public IP address and login account are deliberately **not** recorded here.
This repository is public, and publishing a live SSH endpoint with its username would be a small,
free gift to anyone scanning for hosts — the run's evidentiary value lives entirely in the
environment delta above, none of which requires naming the machine. The case is stronger than it
first appeared: the host is **shared with other people**, so publishing it would expose third
parties' infrastructure and not only our own. The unredacted transcript is retained privately.

## Reproduce it yourself

```bash
tar xzf stage5p-independent-verification.tar.gz
cd independent-verification
python3 verify.py
```

Then check the transparency-log entry against Rekor's own server, which is the one step no bundle
can fake:

```bash
curl -s https://rekor.sigstore.dev/api/v1/log/entries/108e9186e8c5677a869aaa5794d6c3c8030176e8d23629cb72432c6a1d0177b67edb8ba7c98fc64e
```
