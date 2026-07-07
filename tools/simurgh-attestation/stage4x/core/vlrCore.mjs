// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR core (spec §2). Motto: AnthropicSafe First, then ReviewerSafe.
// Frozen first-failure order 173→174→175→176→177→178→179; wrapper 180 LAST.
// Tier gating (P0-1): public runs arithmetic + structure and SKIPS 177; audit adds the live
// gate re-run (177). evaluateVlrSafe fails closed to 180 on any throw.
import crypto from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VLR_ATTESTATION_SCHEMA } from "../constants.mjs";
import {
  validateCorpusSchema,
  checkCorpusWellFormed,
  checkFrozenGate,
  checkSourceWitness,
} from "./corpusCore.mjs";
import {
  checkLedgerArithmetic,
  checkOutcomesAgainstGate,
  checkMonotone,
} from "./residueLedger.mjs";

const fail = (raw, reason, detail) => ({ raw, reason, ...(detail ? { detail } : {}) });

// 174 — Ed25519 over canonicalJson(body) + keyDigest over the PUBLIC PEM (4W→4X doctrine).
export function checkSignature(attestation, publicKeyPem) {
  if (!attestation || attestation.schema !== VLR_ATTESTATION_SCHEMA)
    return fail(173, "vlr_schema_invalid", "attestation_schema");
  if (attestation.signing_key_digest !== keyDigest(publicKeyPem))
    return fail(174, "vlr_signature_invalid", "key_digest");
  const { signature, ...body } = attestation;
  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(canonicalJson(body)),
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(signature ?? "", "hex")
    );
  } catch {
    ok = false;
  }
  return ok ? null : fail(174, "vlr_signature_invalid", "signature");
}

// Ordered checks. 177 is gated OFF in public tier (P0-1).
export function evaluateVlr(bundle, { tier = "public", publicKeyPem } = {}) {
  const { corpus, ledger, attestation } = bundle ?? {};

  const schema = validateCorpusSchema(corpus); // 173
  if (schema) return schema;

  const sig = checkSignature(attestation, publicKeyPem); // 174
  if (sig) return sig;

  const well = checkCorpusWellFormed(corpus); // 175
  if (well) return well;

  const frozen = checkFrozenGate(corpus) || checkSourceWitness(corpus); // 176
  if (frozen) return frozen;

  if (tier === "audit") {
    const live = checkOutcomesAgainstGate(corpus, ledger); // 177 (audit only)
    if (live) return live;
  }

  const arith = checkLedgerArithmetic(corpus, ledger); // 178
  if (arith) return arith;

  const mono = checkMonotone(ledger); // 179
  if (mono) return mono;

  return { raw: 0 };
}

export function evaluateVlrSafe(bundle, opts = {}) {
  try {
    return evaluateVlr(bundle, opts);
  } catch (e) {
    return fail(180, "vlr_internal_fail_closed", String(e?.message ?? e).slice(0, 80));
  }
}
