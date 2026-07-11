// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — Lane C campaign gate (fail-closed). `completed` ⟹ the real-structure dir + a verifying
// droplet-signed pack MUST exist; `pending` is a valid, honestly-labeled state, never masquerading as
// done. Any other/missing state fails closed.
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { REAL_DIR } from "../lanec/build-real-coverage.mjs";
import { verifyPack } from "./verify-vpc-attestation.mjs";

export function laneCGate(dir = REAL_DIR) {
  const outcomePath = join(dir, "campaign-outcome.json");
  if (!existsSync(outcomePath)) return { ok: false, reason: "campaign_record_missing" };
  const c = JSON.parse(readFileSync(outcomePath, "utf8"));
  if (c.status === "pending") {
    return { ok: true, status: "pending", reason: c.reason };
  }
  if (c.status === "completed") {
    // Real ceremony claimed done ⇒ the droplet-signed pack must be present AND verify raw 0 (audit).
    if (!existsSync(join(dir, "bundle.json")))
      return { ok: false, reason: "completed_without_pack" };
    const pub = verifyPack(dir, "public");
    const aud = verifyPack(dir, "audit");
    if (pub.raw !== 0 || aud.raw !== 0) {
      return {
        ok: false,
        reason: `completed_pack_fails_verify:public=${pub.raw},audit=${aud.raw}`,
      };
    }
    return {
      ok: true,
      status: "completed",
      evidence_root: c.evidence_root,
      independent_verifier: c.independent_party_verifier_fingerprint,
    };
  }
  return { ok: false, reason: `unknown_status:${c.status}` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = laneCGate();
  console.log(`Lane C gate: ${JSON.stringify(r)}`);
  process.exit(r.ok ? 0 : 1);
}
