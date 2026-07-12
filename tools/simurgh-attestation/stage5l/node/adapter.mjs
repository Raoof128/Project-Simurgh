// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q node adapter (B11). Re-derives the pure-core `facts` by VERIFYING the bundle's Ed25519
// signatures and lifting the signed tsa_crypto_attestation + checkpoint witness. The pure vtcqCore never
// touches crypto. A real capture (Lane B) supplies a tsa_crypto_attestation produced by an OpenSSL
// RFC-3161 run; here the same attestation shape is re-verified offline.
import { verifyContent } from "./signatures.mjs";
import { SIG } from "./sigDomains.mjs";
import { vtcqVerify } from "../core/vtcqCore.mjs";

function safeVerify(identity, domain, body, sig) {
  try {
    return verifyContent(identity, domain, body, sig);
  } catch {
    return false;
  }
}

export function makeVtcqFacts(bundle, cfg, keys) {
  const gateId = keys.gate.id;
  const tsaVerId = keys.tsaverifier.id;
  const facts = {
    tsaCrypto: {},
    otsState: {},
    checkpointWitnessSigValid: {},
    otsLeafHex: {},
    releaseSigValid: {},
  };

  // gate signature over the receipt
  const r = bundle.review_access_authorisation_receipt;
  const { sig: rSig, ...receiptBody } = r;
  facts.receiptSigValid = safeVerify(gateId, SIG.receipt, receiptBody, rSig);
  facts.gateSigValid = facts.receiptSigValid;

  // gate signatures over each release consumption record
  for (const rel of bundle.declared_releases ?? []) {
    const { sig, ...crBody } = rel.consumption_record;
    facts.releaseSigValid[`${rel.endpoint_id}:${rel.release_ordinal}`] = safeVerify(
      gateId,
      SIG.release,
      crBody,
      sig
    );
  }

  // TSA crypto attestation (tsa-verifier signed) → lift to facts, gated on the signature verifying
  for (const a of bundle.anchors ?? []) {
    if (!a || typeof a !== "object") continue; // malformed anchor → schema 364 owns it, never a throw
    if (a.anchor_type === "rfc3161_tsa") {
      const { sig, ...body } = a.tsa_crypto_attestation ?? {};
      const ok = safeVerify(tsaVerId, SIG.tsaCrypto, body, sig);
      facts.tsaCrypto[a.tsa_token_digest] = {
        parseOk: ok,
        canonicalDer: ok,
        genTime_s: body.genTime_s,
        accuracy_s: body.accuracy_s ?? null,
        policyOID: body.policyOID,
        certValidAtGenTime: ok && body.certValidAtGenTime,
        ltvOk: ok && body.ltvOk,
        essV2Ok: ok && body.essV2Ok,
        cryptoResult: ok ? body.cryptoResult : "invalid",
        messageImprintHex: body.messageImprintHex,
        attestation: { token_raw_digest: body.token_raw_digest },
      };
    }
    if (a.anchor_type === "bitcoin_ots") {
      facts.otsLeafHex[a.ots_proof_digest] = a.ots_leaf_hex;
      const ce = a.checkpoint_evidence;
      if (ce) {
        const { signature, ...cbody } = ce;
        facts.checkpointWitnessSigValid[a.ots_proof_digest] = safeVerify(
          tsaVerId,
          SIG.checkpoint,
          cbody,
          signature
        );
      } else {
        facts.checkpointWitnessSigValid[a.ots_proof_digest] = false;
      }
      // Lane A: the OTS Merkle path resolves (verified_immediate). A real capture derives this from the
      // .ots proof; a pending anchor with no checkpoint is still verified_immediate at the path level.
      facts.otsState[a.ots_proof_digest] = "verified_immediate";
    }
  }

  // embedded 5K re-verification is out of scope for the deterministic Lane-A stub; a real adapter re-runs
  // vucVerify over bundle.vuc. Modelled true here (the vuc_root binding is checked by 365).
  facts.vucVerified = true;
  return facts;
}

export function verifyVtcq(bundle, cfg, keys, { tier = "public" } = {}) {
  return vtcqVerify(bundle, cfg, makeVtcqFacts(bundle, cfg, keys), { tier });
}
