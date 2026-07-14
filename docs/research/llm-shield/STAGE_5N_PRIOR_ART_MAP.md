# Stage 5N — VTC-Delay: prior-art map

Seven families that touch "prove time passed". For each: what it does, **the seam it concedes**, and why
5N is not it. Signed with `SIG5N.audit` alongside the closeout.

**Source-precision guard.** Every family names a primary source. The **Quote** column states whether the
seam is a **verbatim** quotation I fetched from that primary source, or **paraphrase** (my own words,
citation pinned, text not extracted). No quotation marks appear around any wording I did not verify — an
anti-fabrication project must not carry a reconstructed quote.

---

## 1. Verifiable Delay Functions — **the closest neighbour, and the one we are honestly not**

**Primary:** Boneh, Bonneau, Bünz, Fisch, _Verifiable Delay Functions_, CRYPTO 2018 — <https://eprint.iacr.org/2018/601>. **Quote: verbatim.**

> "A VDF requires a specified number of sequential steps to evaluate, yet produces a unique output that can be efficiently and publicly verified."

**Seam.** The defining property is that the output is **efficiently** verifiable — an exponential gap
between evaluation and verification. **5N has no such gap: the verifier re-runs all 20,000,000 steps.**

**Why 5N is not it.** This is a deliberate trade, not a shortfall. We buy: no trusted setup, no
group-of-unknown-order assumption, no novel cryptography, and a verifier auditable in ~18 s of plain
SHA-256 that a reviewer can re-implement from the spec in an afternoon (Lane D did exactly this, in Python,
on machines we do not control). We give up: fast verification, and any claim of **universal**
non-parallelisability. `not_universal_non_parallelisability` and `not_hardware_independent_delay` are
signed non-claims precisely because a VDF's headline property is one we do **not** assert.

## 2. Time-lock puzzles

**Primary:** Rivest, Shamir, Wagner, _Time-lock Puzzles and Timed-release Crypto_, MIT/LCS/TR-684, 1996. **Quote: paraphrase** (PDF text not extractable in this environment; not reconstructed from memory).

**Seam.** Time-lock puzzles send a secret **into the future**: work gates _decryption_, and the security
argument rests on sequential squaring in an RSA group. The construction is about **withholding** a value
until work is done.

**Why 5N is not it.** 5N conceals nothing. `D_out` is public the moment it exists. The chain is not a lock
on a secret; it is a **receipt that a dependency existed** — evidence that `D_out` descends from the start
token, which is orthogonal to timed release.

## 3. Proof of History (sequential-hash ordering in ledgers)

**Primary:** Yakovenko, _Solana: A new architecture for a high performance blockchain_ (whitepaper). **Quote: paraphrase.**

**Seam.** PoH uses a sequential SHA-256 chain to establish **relative ordering** of events within one
system's own ledger — it answers "which came first", and its clock is internal to that system.

**Why 5N is not it.** 5N is not ordering events in a ledger it controls; it anchors **two endpoints to
external authorities** (RFC-3161, Bitcoin, Rekor) that have no stake in the claim. The chain gives
descendancy; the **wall-clock number comes only from the two TSA genTimes**, never from chain length.
Chain steps are explicitly _not_ a clock — `not_hardware_independent_delay`.

## 4. RFC-3161 timestamping — **the source of our number, and of our deepest non-claim**

**Primary:** RFC 3161, _Internet X.509 PKI Time-Stamp Protocol (TSP)_ — <https://www.rfc-editor.org/rfc/rfc3161.txt>. **Quote: verbatim.**

> §1: "A time-stamping service supports assertions of proof that a datum existed before a particular time."

> §2.4.2: "By adding the accuracy value to the GeneralizedTime, an upper limit of the time at which the time-stamp token has been created by the TSA can be obtained. In the same way, by subtracting the accuracy to the GeneralizedTime, a lower limit of the time at which the time-stamp token has been created by the TSA can be obtained."

> §1: "This standard does not establish overall security requirements for TSA operation, just like other PKIX standards do not establish such requirements for CA operation. Rather, it is anticipated that a TSA will make known to prospective clients the policies it implements to ensure accurate time-stamp generation, and clients will make use of the services of a TSA only if they are satisfied that these policies meet their needs."

**Seam (two of them).** (a) A token binds **one point** — "existed before" — and the RFC gives no notion of
elapsed time **between** two tokens. (b) The RFC **explicitly declines to establish** that the TSA's clock
is correct, deferring it to policy the client must judge.

**Why 5N is not it.** 5N is the interval RFC-3161 doesn't define: two tokens over **causally chained**
subjects (`D_out` cannot be formed before the start token exists), differenced with the RFC's **own**
accuracy construction (§2.4.2 upper/lower limits) to yield a conservative **lower bound**, never a point
estimate. And seam (b) is why `not_proof_of_tsa_clock_correctness` is a signed non-claim: **the standard we
depend on disclaims the very thing a naive reader would assume we proved.** A pair of tokens without the
chain proves only that two blobs were stamped 92 s apart — not that the second _descends from_ the first.

## 5. OpenTimestamps / blockchain anchoring

**Primary:** OpenTimestamps — <https://opentimestamps.org/>. **Quote: verbatim.**

> "A timestamp proves that some data existed prior to some point in time."

**Seam.** **"Prior to"** is an _upper_ bound only. An OTS proof can never show that data did **not** exist
earlier — a producer who decided the outcome last week and stamps it today produces an identical proof.

**Why 5N is not it.** That seam is exactly law two, **No Pre-Input Final Commitment**. Anchoring alone
cannot exclude a pre-decided verdict; the dependent chain can, because `D_out` is the exact T-step
descendant of a seed containing the _real start token's_ DER. 5N **consumes** OTS (offline, leaf == D, real
`BitcoinBlockHeaderAttestation`) rather than competing with it.

## 6. Workflow / audit-log & provenance evidence (in-toto, C2PA, SCITT)

**Primary:** in-toto attestation spec; C2PA specification; IETF SCITT charter. **Quote: paraphrase.**

**Seam.** These bind **who/what/where** — signed statements about an artifact's provenance and custody.
Any temporal element is a **field inside a signed statement**: the signer asserts a time, and a verifier
who trusts the signer trusts the time. Nothing recomputes it.

**Why 5N is not it.** 5N's elapsed bound is **not a field anyone asserts** — it is _recomputed_ by the
verifier from two independently anchored tokens, and a lying producer cannot move it by editing a value.
5N **emits** an in-toto predicate (`simurgh.vtc_delay.interval.v1`) as a bridge, deliberately emit-only.

## 7. Long-term archival evidence records (RFC 4998 ERS / RFC 6283)

**Primary:** RFC 4998 (_Evidence Record Syntax_); RFC 6283 (_XMLERS_). **Quote: paraphrase.**

**Seam.** ERS chains renewed timestamps so evidence **survives** algorithm ageing — the sequence exists to
preserve a _single_ existence claim across decades against hash/key weakening.

**Why 5N is not it.** ERS's multiple timestamps defend one point-in-time claim; 5N's two timestamps
**construct an interval claim** and bind the endpoints by computation, not by renewal. Opposite purpose.

---

## The gap, stated plainly

Every family above either (a) proves a **point** and concedes it says nothing about elapsed time between
points (RFC-3161, OTS, ERS), (b) proves **sequential work** but demands fast verification and a hardness
assumption 5N declines to make (VDF, time-lock), (c) orders events on a clock **internal** to the system
making the claim (PoH), or (d) carries time as an **asserted field** inside a signature (in-toto/C2PA/SCITT).

**Nothing in the list recomputes "at least this much wall-clock elapsed, and the output provably descends
from its input" from evidence a hostile third party can re-derive offline.** That is the 5N rung — and its
honest price is written into the non-claims: a receipt that finalisation was delayed, **never** a passport
that anyone was paying attention.
