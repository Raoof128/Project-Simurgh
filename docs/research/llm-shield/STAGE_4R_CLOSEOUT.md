# Stage 4R — PCCC Closeout

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Stage 4R — Private Custody Corroboration Ceremony — is implemented on branch
`stage-4r-pccc`. Real-DDH curve25519 (Edwards form) two-operator match ceremony
with commit-before-reveal, DLEQ-verified sealed audit packets, epoch-bound
unlinkability (No Public Herd Token law), VFR-gated export, window match census,
and a BYO-Operator Kit. Raw codes 90–99, zero new dependencies.

## Gate results (all green under Node 26)

- `scripts/reproduce-llm-shield-stage4r.sh` — exit 0, run twice, committed tree
  byte-stable (Lane A corpus + attestation rebuild to identical bytes; Lane B
  capture verified, never regenerated).
- Unit suites (exitCodes, constants, edwards25519, maskCore, dleq, schemaCore,
  pcccCore, censusCore, fixtures, parity, fixturesCorpus, attestation) — pass.
- **RFC 8032 vector gate** — the in-repo Edwards25519 reference group cross-checks
  the canonical basepoint encoding AND Node core Ed25519 key derivation.
- **JS↔Python parity** — the pure-Python kernel reproduces JS match/non-match
  tokens byte-for-byte and independently rejects a forged DLEQ.
- Two-tier offline verify — public (digest-level) and audit (DLEQ-verified,
  unilateral) both exit 0; audit rejects a z-tampered packet, public rejects a
  planted class digest (raw 99).
- Lane B — two real OS operator processes + a distinct-key approver; honest match
  and non-match GREEN, mandatory raw-98 export refusal publishes nothing, four
  key digests distinct, no scalar leak, privacy-clean metadata.
- K7 all-functions net — 5/5 (frozen export inventory, composed replay with
  check-order masking, byte-idempotency, cross-stage invariants, attestation both
  tiers).
- Lean `proofs/stage4r/NoPublicHerdToken.lean` — 6 theorems, exit 0, zero `sorry`.
- Privacy scan + forbidden-live-scalar scan + herd-token scan + 3M/3O key audits
  — pass.

## Four-axis re-score (honest; the number of record)

Unchanged from the amended spec pre-score (§16): **Novelty 9.3 / Frontier 9.3 /
Good-for-Anthropic 9.1 / Constitution 9.0.** DLEQ was paid in-stage (dependency-
free Chaum-Pedersen over an RFC-8032-gated reference group), which is what moved
Novelty/Frontier off the 9.0 floor; Constitution stays 9.0 until CERA is
countersigned by a real external reviewer (no self-granted credit). Nothing
exceeds 9.5 until a real cross-org run or an external prior-art / clause-map /
cryptography review lands.

## Spec deltas (recorded, not papered over)

1. **Sealed packet carries per-operator `epk` and (synthetic) class digest.**
   §5.3 listed transcripts / z / DLEQ / ephemeral-digest ledger; offline DLEQ
   verification also needs each operator's ephemeral public key and, for the
   mask relation, the class point. These live ONLY in the sealed packet, NEVER
   the public bundle — `no_public_custody_class_digest_emitted` holds for the
   public tier, enforced by the herd-token scan. In Lane A/B the classes are
   `INSECURE_FIXTURE_ONLY` synthetic values, so committing the sealed packet is
   fixture material, not real custody data.
2. **Match universe / epoch are well-formed digests, not read from committed 4P /
   4N evidence.** §14 named "match universe ⊆ committed 4P digests" and "epoch ==
   committed 4N anchor". Implemented with synthetic digest-shaped classes and a
   digest-shaped epoch (the K7 invariant asserts the shape). Wiring the live 4P
   corpus + 4N anchor feed is deferred; the honesty rails
   (`epoch_is_4n_window_anchor_not_physical_time`, synthetic-fixture labelling)
   already scope this.
3. **VFR export crossing is a real distinct-key separate-process approval, not the
   full 4Q schema/verifier.** The approver signs the export crossing with a key
   whose digest is distinct from both operators and the attestation key (§4.2
   four-key separation, asserted). Full `simurgh.vfr_approval_receipt` schema +
   shipped-4Q-verifier integration is deferred; the property that matters —
   friction (a separate approver) gates export, not the match — holds.
4. **Attestation is signed with the committed `INSECURE_FIXTURE_ONLY_attestation`
   key**, not an out-of-repo key, so the artifact is fully offline-reproducible
   in a clean clone. The quarantine label + 3M/3O allowlist make this honest;
   a production deployment would move the signing key out of the repo (4Q
   pattern).
5. **Deterministic DLEQ nonce (RFC 6979-style).** `dleqProve` derives its
   commitment nonce from the secret scalar + public inputs via SHA-512, making
   proofs byte-reproducible for the fixture corpus. Standard practice; the nonce
   stays secret (bound to the scalar).

## Next

Tag `v2.27.0-stage-4r-pccc` after PR (re-check `git tag --sort=-creatordate`
first). Raw codes 90–99 consumed; next stage starts at 100. CERA (§8.7) stays
staged for a real external-reviewer countersignature; a cross-org BYO run is the
post-tag pilot that would lift Frontier/Good-for-Anthropic toward 9.5.
