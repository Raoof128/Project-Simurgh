// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — build byte-stable evidence (plan Task 11). Motto: AnthropicSafe First, then
// ReviewerSafe. Deterministic: fixed committed test key + canonicalJson + deterministic Ed25519.
// Build twice, cmp-identical (Node 26).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildGreenBundle, auditPrivate } from "./greenBundle.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const EVID = join(REPO, "docs/research/llm-shield/evidence/stage-5d");
const KEY = join(
  REPO,
  "tests/fixtures/llmShield/stage5d/test-keys/INSECURE_FIXTURE_ONLY_stage-varl.pem"
);
const j = (o) => JSON.stringify(o, null, 2) + "\n";

export function buildEvidence() {
  mkdirSync(EVID, { recursive: true });
  const priv = readFileSync(KEY, "utf8");
  writeFileSync(join(EVID, "varl-ledger.json"), j(buildGreenBundle(priv)));
  writeFileSync(join(EVID, "varl-audit-private.json"), j(auditPrivate()));
  return EVID;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("wrote:", buildEvidence());
}
