// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — green bundle builder (plan Task 10). Motto: AnthropicSafe First, then ReviewerSafe.
import { createPrivateKey, createPublicKey } from "node:crypto";
import { buildGreenContent, buildAuditPrivate } from "../core/content.mjs";
import { signBundle } from "../core/varlCore.mjs";

export { buildAuditPrivate as auditPrivate };

export function buildGreenContentWithKey(privatePem) {
  const pub = createPublicKey(createPrivateKey(privatePem)).export({ type: "spki", format: "pem" });
  return { ...buildGreenContent(), attestation_pub_key_pem: pub };
}

export function buildGreenBundle(privatePem) {
  const content = buildGreenContentWithKey(privatePem);
  return { ...content, signature: signBundle(content, privatePem) };
}
