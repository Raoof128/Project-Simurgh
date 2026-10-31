// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: checks one committed Stage 3P target attestation — signature,
// schema, provenance/brand, overclaim, coverage claims — against the 3P public key.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";
import {
  validateTargetAttestation,
  evaluateCoverageClaims,
} from "../simurgh-benchmark/crossDefenceLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3p";

export function verifyTarget({ bundle, sidecar, publicKeyPem }) {
  const checks = {};
  checks.schema_valid = validateTargetAttestation(bundle).ok;
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match =
    sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    sig
  );
  const cc = evaluateCoverageClaims(bundle);
  checks.no_claim_conflict = cc.claim_conflict.length === 0;
  checks.no_unverified_full_coverage = cc.full_coverage_violation === false;
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks };
}

async function main() {
  const file = process.argv[2];
  const pubPath = process.argv[3] || join(EV, "keys", "stage3p-public-key.json");
  const bundle = JSON.parse(await readFile(file, "utf8"));
  const sidecar = JSON.parse(await readFile(file.replace(/\.json$/, ".signature.json"), "utf8"));
  const pub = JSON.parse(await readFile(pubPath, "utf8"));
  const { ok, checks } = verifyTarget({ bundle, sidecar, publicKeyPem: pub.public_key_pem });
  console.log(JSON.stringify(checks, null, 2));
  if (!ok) {
    console.error("stage3p target verify: FAIL");
    process.exit(1);
  }
  console.log("stage3p target verify: PASS");
}

// Main-module guard. `import.meta.url` is the loader's REAL, percent-encoded path; `process.argv[1]`
// is whatever the shell passed. Compared as text, a verifier launched through a symlinked
// directory (`/tmp` on macOS) or a path containing a space never runs and exits 0 printing
// nothing (audit C-1, 31 October 2026). Both sides are resolved to the physical path here.
function isMainModule(moduleUrl) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
