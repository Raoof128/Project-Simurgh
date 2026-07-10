// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane C fail-closed gate (reviewer catch: NOT if-exists-skip). A committed
// campaign-outcome.json is REQUIRED. status=completed → the real-disclosure dir must exist and verify
// raw 0. Any other status → the real-disclosure dir must be ABSENT (no silently-dropped capture).
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { validateCampaign } from "../core/campaignOutcome.mjs";
import { verify } from "./verify-vsd-attestation.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5h");
const CAMPAIGN = join(EVID, "lanec/campaign-outcome.json");
const REAL = join(EVID, "real-disclosure");

if (!existsSync(CAMPAIGN)) {
  console.error("[5h] FAIL-CLOSED: lanec/campaign-outcome.json is missing (no silent absence)");
  process.exit(1);
}
const record = JSON.parse(readFileSync(CAMPAIGN, "utf8"));
const status = validateCampaign({ status: record.status, disclosure_present: existsSync(REAL) });

if (status === "completed") {
  if (!existsSync(join(REAL, "vsd-attestation.json"))) {
    console.error("[5h] FAIL-CLOSED: status=completed but real-disclosure/ is absent");
    process.exit(1);
  }
  // the real disclosure carries its OWN external pin + host registry (the real independent host key)
  const res = verify({
    dir: REAL,
    tier: "audit",
    pinPath: join(REAL, "pin.json"),
    hostRegistryPath: join(REAL, "host-registry.json"),
  });
  if (res.raw !== 0) {
    console.error(`[5h] FAIL-CLOSED: real-disclosure verify raw ${res.raw}`);
    process.exit(1);
  }
  console.log("[5h] Lane C: completed — real disclosure verifies raw 0");
} else {
  if (existsSync(REAL)) {
    console.error(`[5h] FAIL-CLOSED: status=${status} but real-disclosure/ exists (inconsistent)`);
    process.exit(1);
  }
  console.log(`[5h] Lane C: ${status} — honest non-completion, no real disclosure evidence`);
}
