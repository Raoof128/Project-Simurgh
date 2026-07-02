# Stage 4J PCTA — Threat Model (v0)

## Scope: the dishonest-producer model, variant A

Stage 4J verifies **consistency and provenance of the declared evidence**, not the reality of
the run behind it. The adversary is a producer who holds the pinned signing key and full
control of the evidence bytes. Within that scope the verifier guarantees: every claim it
accepts recomputes from the signed artifacts, and every single-field tampering it models flips
a clean 0 to a typed rejection (see the validation matrix).

## What each gate holds against

- **P4-pre (mandatory 4H re-verify).** A signature-authentic pack whose certificate fails the
  4H recompute surfaces the 4H band code verbatim (20–26). PCTA on top of an unverified DFI
  substrate would be theatre; this is the anti-theatre precondition.
- **P1/P2/P3.** Proof presence, shape, Ed25519 signature under a pinned keyset, pack-local
  epoch freshness. An unpinned key and a bad signature are deliberately the same code (32): a
  reviewer must not learn anything from the difference.
- **P8 before P4 — the 38-over-34 precedence (chosen semantic).** Authority-sink membership in
  the certificate's `sink_safety_claims` derives from the same per-action `authority_sink`
  flag P8 cross-checks (premise lock: `premiseCoupling.test.js`). An under-declared
  high-consequence action therefore has **no** sink claim; running P8 before P4 reports the
  root cause (38, `authority_sink_underdeclared`) instead of the generic 34. An action that is
  both under-declared and untrusted-sourced reports 38. A bogus `action_id` with no receipt
  skips P8 (receipt null-guard) and stays fail-closed at 34 (`no_authority_sink_claim`).
- **P4.** Authority non-derivability, read from the re-verified certificate's sink claim —
  sound only because P4-pre already re-ran the derivation; the claim is recomputed truth, not
  a producer assertion. `untrusted_context` as an authority source is rejected outright, and a
  producer's own "clean" declaration is never believed over the certificate.
- **P5/P7.** Action and policy digests live in the 4H digest space and reuse the receipt's
  `resolved_args_digest`; the proof signature binds every field, so digests cannot move
  without the pinned key (unsigned tamper → 32; re-signed mismatch → 35/37).
- **P6.** `enforcement.applied` is recomputed as _applied-supported_: a recorded
  allow-decision whose digest matches the authorized action.

## Named non-claims (v0)

- `applied` means **recorded-as-allowed**, not executed — this is a non-claim about execution
  reality; T2's left side is `recorded_allowed`.
- Authority-sink membership is **declared** by the producer's flag, not derived from a runtime
  trust tracker — a non-claim; P8 bounds one consequence of a false declaration (the
  high-consequence/underdeclared cell), it is not a membership oracle.
- Epoch freshness is pack-local (fixed anchor, wide window) — a non-claim about wall-clock
  time. Nonce-set uniqueness across multiple proofs in one pack is deferred (one proof per run
  in v0; the check is structural until multi-proof packs exist).
- The verifier never dispatches or blocks anything — "attest, don't own" is a non-claim about
  enforcement; the host owns allow/deny.

## The two omission surfaces and their closers (both deferred)

1. **Applied-action reality.** A producer can record an action it did not perform, or perform
   one it did not record. Closing this needs a witnessed transcript (zkTLS/DECO class) —
   deferred; PCTA v0 does not see egress truth.
2. **Internal-flow and sink-membership reality.** The flow graph and the `authority_sink`
   flags are producer-declared. Closing this needs an attested runtime (R6 / 4M class,
   TEE-eBPF) — deferred.

The transparency-anchor question (who countersigns the evidence root) is likewise deferred to
the witness/DAP line (3W lineage), never solved by adding more self-signatures.
