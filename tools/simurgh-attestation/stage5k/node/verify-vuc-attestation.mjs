// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — CLI verify of a VUC Lane-A pack. Usage:
//   verify-vuc-attestation.mjs [--tier public|audit] [dir]
// Verifies the pure core AND the split attestations. Prints `tier=<t> raw=<n> reason=<r>`; exits 0 iff 0.
import { readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyVuc, makeAdapterFacts, makeAttestationFacts } from "./adapter.mjs";
import { verifyAttestation } from "../core/attestation.mjs";
import { makeCtx } from "../core/context.mjs";
import { EVIDENCE_DIR } from "./build-vuc-evidence.mjs";

export function verifyPack(dir = EVIDENCE_DIR, tier = "public") {
  const bundle = JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(dir, "external-config.json"), "utf8"));
  const core = verifyVuc(bundle, cfg, { tier });
  if (core.raw !== 0) return { raw: core.raw, reason: core.reason };

  const pub = JSON.parse(readFileSync(join(dir, "public-attestation.json"), "utf8"));
  const aud = JSON.parse(readFileSync(join(dir, "audit-attestation.json"), "utf8"));
  const facts = { ...makeAdapterFacts(bundle, cfg), ...makeAttestationFacts([pub, aud], cfg) };
  const ctx = makeCtx(bundle, cfg, facts);
  const pv = verifyAttestation(pub.attestation, bundle, cfg, facts);
  if (!pv.ok) return { raw: 1, reason: "public_attestation:" + pv.reason };
  if (tier === "audit") {
    const av = verifyAttestation(aud.attestation, bundle, cfg, facts, {
      publicAtt: pub.attestation,
      ctx,
    });
    if (!av.ok) return { raw: 1, reason: "audit_attestation:" + av.reason };
  }
  return { raw: 0, reason: "verified" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let tier = "public";
  let dir = EVIDENCE_DIR;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tier") tier = args[++i];
    else dir = isAbsolute(args[i]) ? args[i] : join(process.cwd(), args[i]);
  }
  const r = verifyPack(dir, tier);
  console.log("tier=" + tier + " raw=" + r.raw + " reason=" + (r.reason ?? "verified"));
  process.exit(r.raw === 0 ? 0 : 1);
}
