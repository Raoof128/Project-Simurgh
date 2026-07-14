// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — RFC-3161 time + imprint extraction and cert-at-genTime validation (P0/TSA: -attime). Shells
// openssl (same pattern as 5L tsaAdapter) but pins historical validity to the token's own genTime. Parse
// failures become typed facts (subject_extractable:false), never throws.
import { execFileSync } from "node:child_process";

function replyText(tsrPath) {
  return execFileSync("openssl", ["ts", "-reply", "-in", tsrPath, "-text"], { encoding: "utf8" });
}

// "Time stamp: Jul 13 03:26:40 2026 GMT" -> epoch ms.
function parseGenTimeMs(text) {
  const m = text.match(/Time stamp:\s*(.+)/);
  if (!m) return null;
  const ms = Date.parse(m[1].trim().replace(/GMT$/, "UTC"));
  return Number.isNaN(ms) ? null : ms;
}

// The "Message data:" hex-dump block -> lowercase hex string.
function parseImprintHex(text) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.trim().startsWith("Message data:"));
  if (i < 0) return null;
  let hex = "";
  for (let j = i + 1; j < lines.length; j++) {
    const m = lines[j].match(/^\s*[0-9a-f]{4}\s-\s([0-9a-f -]+?)\s{2,}/i);
    if (!m) break;
    hex += m[1].replace(/[ -]/g, "");
  }
  return hex ? hex.toLowerCase() : null;
}

export function parseTsaReply(tsrPath) {
  try {
    const text = replyText(tsrPath);
    const policy = text.match(/Policy OID:\s*(\S+)/);
    return {
      subject_extractable: true,
      imprintHex: parseImprintHex(text),
      genTime_ms: parseGenTimeMs(text),
      policyOID: policy ? policy[1] : null,
    };
  } catch (e) {
    return { subject_extractable: false, error: String(e) };
  }
}

// Cryptographic validation at the token's OWN genTime (historical validity; P0/TSA). Returns token_valid.
export function verifyTsaAtGenTime({ tsrPath, tsqPath, caFile, untrustedCerts, genTimeEpochS }) {
  try {
    const args = ["ts", "-verify", "-queryfile", tsqPath, "-in", tsrPath, "-CAfile", caFile];
    if (untrustedCerts) args.push("-untrusted", untrustedCerts);
    if (Number.isSafeInteger(genTimeEpochS)) args.push("-attime", String(genTimeEpochS));
    const out = execFileSync("openssl", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { token_valid: /Verification:\s*OK/.test(out) };
  } catch {
    return { token_valid: false };
  }
}
