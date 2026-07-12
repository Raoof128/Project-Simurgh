// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — verify the committed REAL Lane-B DigiCert RFC-3161 token through automated code (OpenSSL-
// backed). Prints the derived tsa_crypto_attestation. Proves an independent verifier re-derives the real
// bounded-time upper bound from the captured .tsr — not just a manual shell.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRealTsaToken } from "./tsaAdapter.mjs";

const LB = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5l/real-laneb"
);
const COMMITMENT_HEX = "3ee8a8c9b8d7ea805fdb4bae192d86d11c22192855526d95761f4b87d89828e8";

export function verifyLaneB() {
  return verifyRealTsaToken({
    tsrPath: join(LB, "response.tsr"),
    commitmentDigestHex: COMMITMENT_HEX,
    caFile: join(LB, "digicert-root-g4.crt"),
    untrustedCerts: join(LB, "tsa-certs.pem"),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = verifyLaneB();
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.cryptoResult === "valid" ? 0 : 1);
}
