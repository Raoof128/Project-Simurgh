# Stage 5P — independent-verification bundle: reproduction receipt

**Run on a remote Linux host, 2026-07-25. `RESULT: ALL CHECKS PASSED`, exit code `0`.**

The bundle was transferred by `scp` to a machine that shares nothing with the development laptop —
different CPU architecture, different operating system, different Python minor version, different
OpenSSL generation — extracted, and run with `python3 verify.py`.

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

**Does NOT establish: party independence.** The operator was the **producer**, on the producer's own
infrastructure. This is a different **machine**, not a different **party**. The closeout's open item —

> Anthropic relevance → 9.5 needs one external party running the Lane A verifier unaided from the
> spec

— is **not discharged by this run and must not be reported as discharged.** The distinction matters:
cross-machine reproduction rules out *"it only works on the author's laptop"*. It cannot rule out
*"the author's judgement is wrong about what the evidence means"*, and only a genuinely external
reviewer can do that.

No score moved on the strength of this run. Stage 5P's four axes remain **9.1 / 9.0 / 9.2 / 9.5**.

## Host redaction

The reproduction host's public IP address and login account are deliberately **not** recorded here.
This repository is public, and publishing a live SSH endpoint with its username would be a small,
free gift to anyone scanning for hosts — the run's evidentiary value lives entirely in the
environment delta above, none of which requires naming the machine. The unredacted transcript is
retained privately.

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
