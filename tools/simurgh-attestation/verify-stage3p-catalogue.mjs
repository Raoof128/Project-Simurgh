// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: checks the committed Stage 3P catalogue — signature, digest
// binding to every committed target attestation, silent-drop, and corpus/shape
// agreement — against the 3P public key.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";
import {
  verifyCatalogueBinding,
  checkSilentDrop,
} from "../simurgh-benchmark/crossDefenceCatalogue.mjs";
import { PLANNED_TARGET_IDS } from "../simurgh-benchmark/simurgh-crossdefence.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3p";

export function verifyCatalogue({
  catalogue,
  sidecar,
  attestationsById,
  publicKeyPem,
  plannedIds,
}) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(catalogue), "utf8");
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
  checks.binding_valid = verifyCatalogueBinding(catalogue, attestationsById).ok;
  checks.no_silent_drop = checkSilentDrop(catalogue, plannedIds) === null;
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks };
}

async function main() {
  const catalogue = JSON.parse(
    await readFile(join(EV, "catalogue", "attestation-catalogue.json"), "utf8")
  );
  const sidecar = JSON.parse(
    await readFile(join(EV, "catalogue", "attestation-catalogue.signature.json"), "utf8")
  );
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3p-public-key.json"), "utf8"));
  const attestationsById = {};
  for (const id of PLANNED_TARGET_IDS)
    attestationsById[id] = JSON.parse(
      await readFile(join(EV, "targets", id, "containment-attestation.json"), "utf8")
    );
  const { ok, checks } = verifyCatalogue({
    catalogue,
    sidecar,
    attestationsById,
    publicKeyPem: pub.public_key_pem,
    plannedIds: PLANNED_TARGET_IDS,
  });
  console.log(JSON.stringify(checks, null, 2));
  if (!ok) {
    console.error("stage3p catalogue verify: FAIL");
    process.exit(1);
  }
  console.log("stage3p catalogue verify: PASS");
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
