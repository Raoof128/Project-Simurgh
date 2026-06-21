// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: a regression diff's signature + lattice sanity. No-op clean pass
// when there are zero committed diffs (genesis).
import crypto from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "../simurgh-attestation/canonicalise.mjs";
import { detectCrossTargetRankingExport } from "./temporalLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";

export function verifyDiff({ diff, sidecar, publicKeyPem }) {
  const checks = {};
  checks.no_cross_target_ranking = detectCrossTargetRankingExport(diff) === null;
  // lattice sanity: a regressed/improved transition must match the only allowed path.
  checks.lattice_sane = Object.values(diff.cell_transitions ?? {}).every((c) => {
    if (c.transition === "regressed") return c.before === "contained" && c.after === "allowed";
    if (c.transition === "improved") return c.before === "allowed" && c.after === "contained";
    return true;
  });
  const canonical = Buffer.from(canonicalJson(diff), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match = sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(null, canonical, crypto.createPublicKey(publicKeyPem), sig);
  return { ok: Object.values(checks).every(Boolean), checks };
}

async function listDiffFiles(dir) {
  const out = [];
  let lineages;
  try {
    lineages = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const l of lineages) {
    if (!l.isDirectory()) continue;
    for (const pair of await readdir(join(dir, l.name), { withFileTypes: true })) {
      if (pair.isDirectory()) out.push(join(dir, l.name, pair.name, "regression-diff.json"));
    }
  }
  return out;
}

async function main() {
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3q-public-key.json"), "utf8"));
  const files = await listDiffFiles(join(EV, "diffs"));
  if (files.length === 0) {
    console.log("stage3q diff verify: PASS (no committed diffs at genesis)");
    return;
  }
  for (const f of files) {
    const diff = JSON.parse(await readFile(f, "utf8"));
    const sidecar = JSON.parse(await readFile(f.replace(/\.json$/, ".signature.json"), "utf8"));
    const { ok, checks } = verifyDiff({ diff, sidecar, publicKeyPem: pub.public_key_pem });
    if (!ok) {
      console.error("stage3q diff verify: FAIL", f, JSON.stringify(checks));
      process.exit(1);
    }
  }
  console.log(`stage3q diff verify: PASS (${files.length} diffs)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
