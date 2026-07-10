// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — external verifier pin + attestation signature (raw 301). Checked BEFORE any other
// signature. The pin is supplied from OUTSIDE the bundle and binds all three of {key_fingerprint,
// identity_subject, identity_digest}.
import { DOMAIN } from "../constants.mjs";
import { identityDigest } from "./digests.mjs";
import { verifyContent } from "./signatures.mjs";

const RAW = 301;
const fail = (reason) => ({ ok: false, raw: RAW, reason });

export function checkAttestationTrust(ctx) {
  const b = ctx.bundle;
  const pin = ctx.pin;
  if (pin == null) return fail("external_pin_missing");
  const v = b.verifier_identity;
  if (
    pin.key_fingerprint !== v.key_fingerprint ||
    pin.identity_subject !== v.identity_subject ||
    pin.identity_digest !== identityDigest(v)
  ) {
    return fail("external_pin_mismatch");
  }
  const { schema, attestation_signature, ...attContent } = b;
  let ok = false;
  try {
    ok = verifyContent(v, DOMAIN.disclosure_attestation, attContent, attestation_signature);
  } catch {
    return fail("attestation_signature_invalid");
  }
  return ok ? { ok: true } : fail("attestation_signature_invalid");
}
