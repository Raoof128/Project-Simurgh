#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — build committed evidence from the offline capture (plan Task 10). Signs with the
// stage5e fixture key; writes the public bundle, the audit-private census, and the pinned key
// fingerprint. Byte-stable: run twice, cmp-identical. NEVER runs the model (consumes capture-result.json).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGreenBundle } from "./greenBundle.mjs";
import { keyFingerprint } from "../core/vdaCore.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const EVID = join(REPO, "docs/research/llm-shield/evidence/stage-5e");
const CAPTURE = join(HERE, "..", "lanec", "capture-result.json");
const KEY = join(
  REPO,
  "tests/fixtures/llmShield/stage5e/test-keys/INSECURE_FIXTURE_ONLY_stage-vda.pem"
);

const stable = (obj) => JSON.stringify(JSON.parse(canonicalJson(obj)), null, 2) + "\n";

export function buildEvidence() {
  const cap = JSON.parse(readFileSync(CAPTURE, "utf8"));
  const privatePem = readFileSync(KEY, "utf8");
  const { bundle, auditPrivate } = buildGreenBundle(cap, privatePem);
  const pinned = { key_fingerprint: keyFingerprint(bundle.attestation_pub_key_pem) };
  mkdirSync(EVID, { recursive: true });
  writeFileSync(join(EVID, "vda-attestation.json"), stable(bundle));
  writeFileSync(join(EVID, "vda-audit-private.json"), stable(auditPrivate));
  writeFileSync(join(EVID, "vda-pinned-key.json"), stable(pinned));
  return { bundle, auditPrivate, pinned };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bundle } = buildEvidence();
  const slips = bundle.evasions.filter((e) => e.threshold_crossing).length;
  console.log(
    `stage5e evidence built: ${bundle.evasions.length} baseline-flagged evasions, ${slips} slip(s) at the reference threshold`
  );
}
