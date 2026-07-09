// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — verify committed evidence (plan Task 11). Reads the public ledger + audit-private
// log, evaluates BOTH tiers → raw 0. CI/verify path never calls a model (byte-stability).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateVarl } from "../core/varlCore.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const EVID = join(REPO, "docs/research/llm-shield/evidence/stage-5d");

export function verifyEvidence() {
  const bundle = JSON.parse(readFileSync(join(EVID, "varl-ledger.json"), "utf8"));
  const auditPrivate = JSON.parse(readFileSync(join(EVID, "varl-audit-private.json"), "utf8"));
  return {
    audit: evaluateVarl(bundle, { tier: "audit", auditPrivate }),
    pub: evaluateVarl(bundle, { tier: "public" }),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { audit, pub } = verifyEvidence();
  console.log("audit:", JSON.stringify(audit), "public:", JSON.stringify(pub));
  if (audit.raw !== 0 || pub.raw !== 0) process.exit(1);
}
