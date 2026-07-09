// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — verify the committed attestation (plan Task 11). Motto: AnthropicSafe First, then
// ReviewerSafe. Verifies both tiers over the committed green bundle; audit recomputes from the
// public Lane-A corpus (committed fixtures).
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { FLAGGED_BASES } from "../core/corpus.mjs";
import { auditPrivate } from "./greenBundle.mjs";
import { evaluateVsbSafe } from "../core/vsbCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const EVIDENCE_DIR = join(REPO, "docs/research/llm-shield/evidence/stage-5c");

export function verifyEvidence() {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "green-slip-ledger.json"), "utf8"));
  const baseTextById = auditPrivate(FLAGGED_BASES);
  const audit = evaluateVsbSafe(bundle, { tier: "audit", baseTextById });
  const pub = evaluateVsbSafe(bundle, { tier: "public", baseTextById });
  return { audit, pub };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { audit, pub } = verifyEvidence();
  console.log("audit:", JSON.stringify(audit), "public:", JSON.stringify(pub));
  if (audit.raw !== 0 || pub.raw !== 0) process.exit(1);
}
