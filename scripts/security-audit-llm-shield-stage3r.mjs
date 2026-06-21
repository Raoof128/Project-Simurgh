// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3R security audit: the fallback path cannot bypass containment.
import { runFallbackSelfProof } from "../src/llmShield/gateway/fallbackSelfProof.js";

const sp = await runFallbackSelfProof();
const errors = [];
if (!sp.summary.all_passed) errors.push("self-proof fixture(s) failed");
if (sp.summary.fallback_bypass_successes !== 0) errors.push("fallback bypass succeeded");
for (const id of ["provider-refusal-unsafe-local-block", "availability-failure-unsafe-local-block"]) {
  const f = sp.fixtures.find((x) => x.fixture_id === id);
  if (!f || f.observed.fallbackUsed === true) errors.push(`anti-bypass lock not enforced: ${id}`);
}
if (errors.length) {
  console.error("stage3r security: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3r security: PASS");
