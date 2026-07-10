#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — verify committed evidence (plan Task 10). Reads the public bundle + audit-private
// census + the externally pinned key fingerprint; evaluates BOTH tiers → raw 0. Never runs the model.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateVda } from "../core/vdaCore.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const EVID = join(REPO, "docs/research/llm-shield/evidence/stage-5e");

export function verifyEvidence() {
  const bundle = JSON.parse(readFileSync(join(EVID, "vda-attestation.json"), "utf8"));
  const auditPrivate = JSON.parse(readFileSync(join(EVID, "vda-audit-private.json"), "utf8"));
  const pinned = JSON.parse(readFileSync(join(EVID, "vda-pinned-key.json"), "utf8"));
  const opts = { pinnedKeyFingerprint: pinned.key_fingerprint, auditPrivate };
  return {
    audit: evaluateVda(bundle, { ...opts, tier: "audit" }),
    pub: evaluateVda(bundle, { ...opts, tier: "public" }),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { audit, pub } = verifyEvidence();
  console.log("audit:", JSON.stringify(audit), "public:", JSON.stringify(pub));
  if (audit.raw !== 0 || pub.raw !== 0) process.exit(1);
}
