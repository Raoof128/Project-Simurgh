// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC signatures + the role-collision matrix. Low-level Ed25519 + canonical SPKI-DER
// fingerprint ONLY (ported from 5H); the matrix owns the §2.3 separation of duties.
import { sign as edSign, verify as edVerify, createPublicKey } from "node:crypto";
import { canonicalJson, fingerprintPublicKey } from "../../canonicalise.mjs";

export function fingerprint(pem) {
  return fingerprintPublicKey(pem);
}

function message(domainSep, contentObj) {
  return Buffer.from(domainSep + canonicalJson(contentObj), "utf8");
}

export function signContent(privatePem, domainSep, contentObj) {
  return edSign(null, message(domainSep, contentObj), privatePem).toString("base64");
}

// Recompute the fingerprint from the PEM FIRST and assert it matches the declared key_fingerprint
// (never verify against an unauthenticated key), then verify the signature.
export function verifyContent(identity, domainSep, contentObj, sigB64) {
  const fp = fingerprint(identity.public_key_pem);
  if (fp !== identity.key_fingerprint) {
    throw new Error(`key_fingerprint does not match public_key_pem: ${identity.key_fingerprint}`);
  }
  const pub = createPublicKey(identity.public_key_pem);
  return edVerify(null, message(domainSep, contentObj), pub, Buffer.from(sigB64, "base64"));
}

// §2.3 role-collision matrix (with review-2 fixes B5). `roles` is fingerprint sets by role.
// Prohibited: verifier ≠ {producer, grant_issuer, affiliation_issuer, reviewer, host};
//             reviewer ≠ {producer, grant_issuer}; host ≠ producer;
//             affiliation_issuer ≠ {producer, reviewer}.
// ALLOWED (deliberate): reviewer == host ⟹ host separation is non-additive.
export function roleCollisionOk(roles) {
  const asSet = (x) => (x instanceof Set ? x : new Set(x == null ? [] : [].concat(x)));
  const verifier = roles.verifier; // single fingerprint
  const producer = roles.producer; // single fingerprint
  const grantIssuers = asSet(roles.grantIssuers);
  const affiliationIssuers = asSet(roles.affiliationIssuers);
  const reviewers = asSet(roles.reviewers);
  const hosts = asSet(roles.hosts);
  const inAny = (fp, ...sets) => sets.some((s) => asSet(s).has(fp));

  if (inAny(verifier, grantIssuers, affiliationIssuers, reviewers, hosts) || verifier === producer) {
    return { ok: false, reason: "verifier_role_collision" };
  }
  if (reviewers.has(producer)) return { ok: false, reason: "reviewer_is_producer" };
  for (const gi of grantIssuers) if (reviewers.has(gi)) return { ok: false, reason: "reviewer_is_grant_issuer" };
  if (hosts.has(producer)) return { ok: false, reason: "host_is_producer" };
  if (affiliationIssuers.has(producer)) return { ok: false, reason: "affiliation_issuer_is_producer" };
  for (const ai of affiliationIssuers) {
    if (reviewers.has(ai)) return { ok: false, reason: "affiliation_issuer_is_reviewer" }; // B5
  }
  return { ok: true };
}
