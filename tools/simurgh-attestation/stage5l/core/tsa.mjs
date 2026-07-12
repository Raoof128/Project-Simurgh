// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q TSA checks 366–369. Facts-driven (the adapter runs the OpenSSL-backed RFC-3161
// verification and hands booleans in; the pure core never shells out). One boundary per function.
import { R } from "./result.mjs";

// 366 — structural parse (canonical DER).
export function checkTsaParse(ctx) {
  if (!ctx.tsaAnchor) return null; // no TSA anchor is a 372 profile-floor concern, not a parse error
  const f = ctx.tsaFact;
  if (!f || f.parseOk !== true || f.canonicalDer !== true) return R(366, "tsa_parse_invalid");
  return null;
}

// 367 — CMS signature / cert-fingerprint / EKU / policy-OID / ESSCertIDv2 + adapter-attestation binding.
export function checkTsaCrypto(ctx) {
  if (!ctx.tsaAnchor) return null;
  const f = ctx.tsaFact;
  if (f.cryptoResult !== "valid") return R(367, "tsa_crypto_invalid");
  if (f.attestation?.token_raw_digest !== ctx.tsaAnchor.tsa_token_digest) {
    return R(367, "tsa_attestation_token_digest_mismatch"); // swapped token_raw_digest (K7 attack)
  }
  return null;
}

// 368 — cert validity at genTime + committed-LTV status evidence (policy-relative, P0 amendment 5).
export function checkTsaValidity(ctx) {
  if (!ctx.tsaAnchor) return null;
  const f = ctx.tsaFact;
  if (f.certValidAtGenTime !== true) return R(368, "tsa_cert_invalid_at_gentime");
  if (f.ltvOk !== true) return R(368, "tsa_ltv_status_invalid");
  return null;
}

// 369 — accuracy fail-closed: unresolved from token AND precommitted policy → reject (No Clock Shopping).
export function checkTsaAccuracy(ctx) {
  if (!ctx.tsaAnchor) return null;
  if (ctx.tsaUpperBound === null) return R(369, "tsa_accuracy_unresolved");
  return null;
}
