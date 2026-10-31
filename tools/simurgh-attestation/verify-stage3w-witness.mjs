// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier OFFLINE verifier for the Stage 3W release-witness bundle. No network, no Sigstore,
// no gh attestation. portable: signature over canonicalJson(bundle) + fingerprint + structural
// gates. --reproduce: re-derive the bundle byte-stable AND recompute every 3V-B subject digest
// and the witness-verdict file digest. Fails closed: { ok:false, checks }, never throws.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

function portableChecks({ bundle, sidecar, publicKeyPem }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  checks.bundle_sha256 = sha256Hex(canonical) === sidecar.bundle_sha256;
  checks.fingerprint = fingerprintPublicKey(publicKeyPem) === sidecar.public_key_fingerprint;
  let sigOk = false;
  const sig =
    typeof sidecar.signature === "string" ? sidecar.signature.replace(/^base64:/, "") : "";
  try {
    sigOk = crypto.verify(
      null,
      canonical,
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(sig, "base64")
    );
  } catch {
    sigOk = false;
  }
  checks.signature = !!sigOk;
  checks.type =
    bundle.predicateType === "https://project-simurgh.dev/predicates/vca-release-witness/v1";
  checks.witnessed_stage = bundle.predicate?.witnessed_stage === "3V-B";
  checks.model_not_reexecuted = bundle.predicate?.model_reexecuted_in_ci === false;
  return checks;
}

export function verifyWitness({
  bundle,
  sidecar,
  publicKeyPem,
  reproduce = false,
  rebuild,
  rebuildVerdict,
} = {}) {
  try {
    if (!bundle || !sidecar || !publicKeyPem)
      return { ok: false, checks: { input_present: false } };
    const checks = portableChecks({ bundle, sidecar, publicKeyPem });
    if (reproduce) {
      if (typeof rebuild !== "function" || typeof rebuildVerdict !== "function")
        return { ok: false, checks: { ...checks, reproduce_rebuild_missing: true } };
      const stable = (v) => JSON.stringify(v, null, 2) + "\n";
      const rebuilt = rebuild();
      checks.reproduce = stable(rebuilt) === stable(bundle);
      const rebuiltSubjects = Object.fromEntries(
        rebuilt.subject.map((s) => [s.name, s.digest.sha256])
      );
      const bundleSubjects = Object.fromEntries(
        bundle.subject.map((s) => [s.name, s.digest.sha256])
      );
      checks.subjects_recomputed = Object.keys(rebuiltSubjects).every(
        (k) => rebuiltSubjects[k] === bundleSubjects[k]
      );
      const verdictDigest = "sha256:" + sha256Hex(stable(rebuildVerdict())).replace(/^sha256:/, "");
      const boundVerdict =
        "sha256:" + (bundleSubjects["stage-3w/github-witness-verdict.json"] || "");
      checks.witness_verdict_recomputed = verdictDigest === boundVerdict;
    }
    return { ok: Object.values(checks).every(Boolean), checks };
  } catch {
    return { ok: false, checks: { threw: true } };
  }
}

async function cli() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const EV = "docs/research/llm-shield/evidence/stage-3w";
  const reproduce = process.argv.includes("--reproduce");
  const bundle = JSON.parse(await readFile(join(EV, "attestation.bundle.json"), "utf8"));
  const sidecar = JSON.parse(await readFile(join(EV, "attestation.signature.json"), "utf8"));
  const pub = JSON.parse(
    await readFile(join(EV, "keys", "stage3w-public-key.json"), "utf8")
  ).public_key_pem;
  let rebuild, rebuildVerdict;
  if (reproduce)
    ({ buildBundle: rebuild, buildWitnessVerdictFile: rebuildVerdict } =
      await import("./build-3w-witness.mjs"));
  const result = verifyWitness({
    bundle,
    sidecar,
    publicKeyPem: pub,
    reproduce,
    rebuild,
    rebuildVerdict,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
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

if (isMainModule(import.meta.url))
  cli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
