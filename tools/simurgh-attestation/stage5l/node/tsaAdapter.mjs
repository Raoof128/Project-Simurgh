// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — OpenSSL-backed RFC-3161 verification (Lane B). This is the REAL path a production adapter
// uses: it shells `openssl ts -verify` over a captured .tsr, confirms the messageImprint == the committed
// commitment digest AND the token chains to the pinned root, and extracts genTime/policy for the pure
// core. NOT a handwritten CMS parser. Shells out — integration only, never the default unit run.
import { execFileSync } from "node:child_process";

function opensslText(tsrPath) {
  return execFileSync("openssl", ["ts", "-reply", "-in", tsrPath, "-text"], { encoding: "utf8" });
}

function parseGenTimeEpochS(text) {
  // "Time stamp: Jul 12 09:37:30 2026 GMT"
  const m = text.match(/Time stamp:\s*(.+)/);
  if (!m) return null;
  const ms = Date.parse(m[1].replace(" GMT", " UTC"));
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// Verify a real RFC-3161 token → the tsa_crypto_attestation the pure core consumes as a fact.
export function verifyRealTsaToken({ tsrPath, commitmentDigestHex, caFile, untrustedCerts }) {
  let verifyOk = false;
  try {
    const out = execFileSync(
      "openssl",
      [
        "ts",
        "-verify",
        "-digest",
        commitmentDigestHex,
        "-in",
        tsrPath,
        "-CAfile",
        caFile,
        "-untrusted",
        untrustedCerts,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    verifyOk = /Verification:\s*OK/.test(out);
  } catch (e) {
    verifyOk = /Verification:\s*OK/.test(String(e.stdout ?? "") + String(e.stderr ?? ""));
  }
  const text = opensslText(tsrPath);
  const policyOID = (text.match(/Policy OID:\s*(\S+)/) || [])[1] ?? null;
  const granted = /Status:\s*Granted/.test(text);
  return {
    cryptoResult: verifyOk && granted ? "valid" : "invalid",
    genTime_s: parseGenTimeEpochS(text),
    policyOID,
    // openssl ts -verify already checked messageImprint == commitmentDigestHex, so binding holds on OK.
    messageImprintHex: verifyOk ? commitmentDigestHex : null,
    certValidAtGenTime: verifyOk, // openssl path-validated the chain at verification time
    accuracy_s: null, // DigiCert token: accuracy unspecified — a production policy resolves it or 369
  };
}
