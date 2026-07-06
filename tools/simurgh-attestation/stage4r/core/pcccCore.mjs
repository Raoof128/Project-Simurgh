// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R ceremony evaluation engine (4R spec §3.3, §6.4). Motto: AnthropicSafe
// First, then ReviewerSafe. `evaluateCeremony` is THE first-failure decision
// function over the frozen order 90→91→94→95→96→93→92→99→97→98: earlier failures
// mask later checks. The order IS the invention; the detectors compose the
// crypto/schema/census modules. Pure — all external state is passed in.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { CRYPTO_DOMAINS } from "../constants.mjs";
import { decodePoint, isSmallOrder } from "./edwards25519.mjs";
import { validateTranscript } from "./schemaCore.mjs";
import { dleqVerify } from "./dleq.mjs";

export const GREEN = Object.freeze({ raw: 0, green: true });
const deny = (raw, reason) => ({ raw, reason, green: false });

// token_commitment = H("simurgh.pccc.token_commit.v1", epoch, run_id, pair_id,
// role, peer_mask_digest, token, token_nonce) — spec §3.3.
export function tokenCommitment({ epoch, runId, pairId, role, peerMaskDigest, token, tokenNonce }) {
  return recordDigest({
    domain: CRYPTO_DOMAINS.TOKEN_COMMIT,
    epoch,
    run_id: runId,
    pair_id: pairId,
    role,
    peer_mask_digest: peerMaskDigest,
    token,
    token_nonce: tokenNonce,
  });
}

export function maskDigest(maskPointHex) {
  return recordDigest({ domain: CRYPTO_DOMAINS.PAIR, mask_point: maskPointHex });
}

// evaluateCeremony(input) → {raw, reason, green}. `input`:
//   transcript          the pccc_match_transcript.v1 object
//   operatorKeys        { a, b } Ed25519 KeyObject/PEM for signature check (91)
//   verifySignature     (role, transcript, sig) => bool  (91) — injectable
//   sealedPoints        { a, b } peer-mask points the z relations use (for dleq 93)
//   replay              { hit, reason } precomputed cross-epoch check (95)
//   reuse               { hit, reason } precomputed reuse ledger check (96)
//   herd                { hit } precomputed public herd-token scan (99)
//   budgetExceeded      bool (97)
//   vfrOk               bool (98)
//   cardinality         { ok, reason } precomputed slot/census check (90)
export function evaluateCeremony(input) {
  const t = input.transcript;

  // ---- 90: structure, phase order, commitment openings, cardinality, census
  const schema = validateTranscript(t);
  if (!schema.ok) return deny(90, schema.reason);
  if (input.cardinality && !input.cardinality.ok) return deny(90, input.cardinality.reason);
  for (const role of ["a", "b"]) {
    const peer = role === "a" ? "b" : "a";
    const expected = tokenCommitment({
      epoch: t.epoch,
      runId: t.run_id,
      pairId: t.pair_id,
      role,
      peerMaskDigest: maskDigest(t.masks[peer]),
      token: t.openings[role].token,
      tokenNonce: t.openings[role].token_nonce,
    });
    if (expected !== t.commitments[role]) {
      return deny(90, "pccc_token_commitment_opening_invalid");
    }
  }

  // ---- 91: both operator identity signatures over the transcript
  for (const role of ["a", "b"]) {
    if (!input.verifySignature(role, t, t.signatures[role])) {
      return deny(91, "operator_identity_signature_invalid");
    }
  }

  // ---- 94: degenerate points in the sealed packet (masks and z)
  for (const role of ["a", "b"]) {
    for (const hex of [t.masks[role], t.z[role]]) {
      let pt;
      try {
        pt = decodePoint(hex);
      } catch {
        return deny(94, "small_order_or_all_zero_fail_closed");
      }
      if (isSmallOrder(pt)) return deny(94, "small_order_or_all_zero_fail_closed");
    }
  }

  // ---- 95: cross-epoch replay (checked before reuse — spec §6.4)
  if (input.replay && input.replay.hit) return deny(95, input.replay.reason);

  // ---- 96: ephemeral key / mask reuse inside the accepted epoch ledger
  if (input.reuse && input.reuse.hit) return deny(96, input.reuse.reason);

  // ---- 93: recompute tokens from z; verify all four DLEQ proofs
  for (const role of ["a", "b"]) {
    for (const proof of t.dleq[role]) {
      const points = input.sealedPoints[role][proof.relation_kind];
      if (!dleqVerify(proof, points)) {
        return deny(
          93,
          proof.relation_kind === "mask" ? "dleq_mask_proof_invalid" : "dleq_z_proof_invalid"
        );
      }
    }
  }
  if (input.recomputedTokens) {
    for (const role of ["a", "b"]) {
      if (input.recomputedTokens[role] !== t.openings[role].token) {
        return deny(93, "token_recompute_mismatch");
      }
    }
  }

  // ---- 92: claimed match must agree with the token comparison
  const tokensEqual = t.openings.a.token === t.openings.b.token;
  if (t.match !== tokensEqual) return deny(92, "match_claim_conflict");

  // ---- 99: public herd-token disclosure scan
  if (input.herd && input.herd.hit) return deny(99, "public_herd_token_violation");

  // ---- 97: disclosure budget
  if (input.budgetExceeded) return deny(97, "disclosure_budget_exceeded");

  // ---- 98: VFR export gate (its refusal is the ledgered expected-GREEN elsewhere)
  if (!input.vfrOk) return deny(98, "vfr_export_gate_failed");

  return GREEN;
}
