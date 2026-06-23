// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier OFFLINE verifier for the Stage 3X public VCA timeline. No network. portable: signature
// over canonicalJson(index) + fingerprint + structural gates. --reproduce: re-derive byte-stable
// AND recompute evidence_root_digests, merge_commits, chain_summary. Fails closed; never throws.
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

function portableChecks({ index, sidecar, publicKeyPem }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(index), "utf8");
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
  checks.schema = index.schema === "simurgh.vca.public_timeline.v1";
  checks.not_uniform_claim = index.claim_summary?.claims_uniform_full_reproduction === false;
  return checks;
}

export function verifyTimeline({ index, sidecar, publicKeyPem, reproduce = false, rebuild } = {}) {
  try {
    if (!index || !sidecar || !publicKeyPem) return { ok: false, checks: { input_present: false } };
    const checks = portableChecks({ index, sidecar, publicKeyPem });
    if (reproduce) {
      if (typeof rebuild !== "function")
        return { ok: false, checks: { ...checks, reproduce_rebuild_missing: true } };
      const stable = (v) => JSON.stringify(v, null, 2) + "\n";
      const rebuilt = rebuild();
      checks.reproduce = stable(rebuilt) === stable(index);
      const byStage = (arr) => Object.fromEntries(arr.map((r) => [r.stage, r]));
      const a = byStage(rebuilt.rungs);
      const b = byStage(index.rungs);
      checks.evidence_root_digests_recomputed = Object.keys(b).every(
        (s) => a[s]?.evidence_root_digest === b[s].evidence_root_digest
      );
      checks.merge_commits_recomputed = Object.keys(b).every(
        (s) => a[s]?.merge_commit === b[s].merge_commit
      );
      checks.chain_summary_recomputed =
        canonicalJson(rebuilt.chain_summary) === canonicalJson(index.chain_summary);
    }
    return { ok: Object.values(checks).every(Boolean), checks };
  } catch {
    return { ok: false, checks: { threw: true } };
  }
}

async function cli() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const EV = "docs/research/llm-shield/evidence/stage-3x";
  const reproduce = process.argv.includes("--reproduce");
  const index = JSON.parse(await readFile(join(EV, "timeline.index.json"), "utf8"));
  const sidecar = JSON.parse(await readFile(join(EV, "timeline.signature.json"), "utf8"));
  const pub = JSON.parse(
    await readFile(join(EV, "keys", "stage3x-public-key.json"), "utf8")
  ).public_key_pem;
  let rebuild;
  if (reproduce) ({ buildIndexFile: rebuild } = await import("./build-3x-timeline.mjs"));
  const result = verifyTimeline({ index, sidecar, publicKeyPem: pub, reproduce, rebuild });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}
if (import.meta.url === `file://${process.argv[1]}`)
  cli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
