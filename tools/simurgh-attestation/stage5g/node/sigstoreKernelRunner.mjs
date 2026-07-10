// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC Sigstore kernel runner (Node orchestration, NOT the pure core). Verifies the offline
// sigstore bundle deterministically: the DSSE statement's signature under the Fulcio-certified key, and
// a FROZEN integrated time (never Date.now()). Returns a canonical result the pure anchorBinding check
// consumes. A genuine inability to execute throws (the orchestrator maps that to raw 299); ordinary
// invalid evidence returns { valid:false } (raw 294).
import { verify as nodeVerify, createPublicKey } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { fingerprintPublicKey } from "../../canonicalise.mjs";

const FROZEN_INTEGRATED_TIME = 1700000000;

export function sigstoreKernelRunner(anchorEvidence) {
  const sb = anchorEvidence?.sigstore_bundle;
  if (!sb || !sb.fulcio_cert_pubkey_pem || !sb.dsse_statement || !sb.dsse_signature) {
    throw new Error("sigstore kernel: malformed bundle (cannot execute)");
  }
  const certPub = createPublicKey(sb.fulcio_cert_pubkey_pem);
  const rootFingerprint = fingerprintPublicKey(sb.fulcio_cert_pubkey_pem);

  let sigOk = false;
  try {
    sigOk = nodeVerify(
      "sha256",
      Buffer.from(canonicalJson(sb.dsse_statement)),
      certPub,
      Buffer.from(sb.dsse_signature, "base64")
    );
  } catch {
    sigOk = false;
  }
  const timeOk = sb.integrated_time === FROZEN_INTEGRATED_TIME;

  return {
    valid: sigOk && timeOk,
    root_fingerprint: rootFingerprint,
    issuer: sb.issuer,
    audience: sb.audience,
    subject: sb.subject,
    dsse_statement: sb.dsse_statement,
  };
}
