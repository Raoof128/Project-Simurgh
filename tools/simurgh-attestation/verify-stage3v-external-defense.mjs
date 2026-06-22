// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier verifier for the Stage 3V-A external-defence bundle.
//   portable:  signature over canonicalJson(bundle) + fingerprint match + structural gates.
//   --reproduce: additionally re-derive the bundle in-process (via `rebuild`) and require
//                byte-stable equality, PLUS explicit recomputation of the trusted-harness
//                hashes and the Stage 3L corpus manifest hash (makes the 3U R2-B closure
//                visible in machine evidence, not just implied by bundle equality).
// Fails closed: returns { ok:false, checks } and never throws on malformed input.
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const GATEWAY_HASH_KEYS = [
  "external_raw_output_hash",
  "external_normalised_verdict_hash",
  "adapter_config_hash",
  "external_defense_manifest_hash",
];

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
  checks.type = bundle.type === "simurgh.vca.external_defense_run.v1";
  checks.not_live = bundle.target_defense?.live === false;
  checks.zero_unsafe =
    bundle.containment_summary?.unsafe_tool_execution === 0 &&
    bundle.containment_summary?.unsafe_output_export === 0 &&
    bundle.containment_summary?.context_authority_escalation === 0;
  return checks;
}

export function verifyExternalDefense({
  bundle,
  sidecar,
  publicKeyPem,
  reproduce = false,
  rebuild,
} = {}) {
  try {
    if (!bundle || !sidecar || !publicKeyPem)
      return { ok: false, checks: { input_present: false } };
    const checks = portableChecks({ bundle, sidecar, publicKeyPem });
    if (reproduce) {
      if (typeof rebuild !== "function")
        return { ok: false, checks: { ...checks, reproduce_rebuild_missing: true } };
      const rebuilt = rebuild();
      const stable = (v) => JSON.stringify(v, null, 2) + "\n";
      checks.reproduce = stable(rebuilt) === stable(bundle);
      // Amendment 2: explicit recomputation visibility.
      checks.trusted_harness_hashes_recomputed = GATEWAY_HASH_KEYS.every(
        (k) => rebuilt.gateway_computed_hashes?.[k] === bundle.gateway_computed_hashes?.[k]
      );
      checks.stage3l_corpus_manifest_recomputed =
        rebuilt.run_set?.stage3l_corpus_manifest_hash ===
        bundle.run_set?.stage3l_corpus_manifest_hash;
    }
    return { ok: Object.values(checks).every(Boolean), checks };
  } catch {
    return { ok: false, checks: { threw: true } };
  }
}

async function cli() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const EV = "docs/research/llm-shield/evidence/stage-3v";
  const reproduce = process.argv.includes("--reproduce");
  const bundle = JSON.parse(await readFile(join(EV, "attestation.bundle.json"), "utf8"));
  const sidecar = JSON.parse(await readFile(join(EV, "attestation.signature.json"), "utf8"));
  const pub = JSON.parse(
    await readFile(join(EV, "keys", "stage3v-public-key.json"), "utf8")
  ).public_key_pem;
  let rebuild;
  if (reproduce)
    ({ buildExternalDefenseBundle: rebuild } =
      await import("../../tests/e2e/llm_shield_stage3v_external_defense_runner.mjs"));
  const result = verifyExternalDefense({ bundle, sidecar, publicKeyPem: pub, reproduce, rebuild });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}
if (import.meta.url === `file://${process.argv[1]}`)
  cli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
