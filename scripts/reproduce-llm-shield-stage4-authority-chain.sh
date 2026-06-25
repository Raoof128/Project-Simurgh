#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage-4 authority-chain offline reproduction. No network, public keys only.
#   1. Regenerate every committed 4A/4B/4C evidence file and assert byte-identity;
#      check the digest chain 4A->frozen-1LIVE, 4B->4A, 4C->4B; check cross-stage invariants.
#   2. Verify all three signed bundles in reproduce mode using ONLY the committed public keys.
#   3. Negative control: a tampered headline result MUST be rejected.
# Exit 0 = PASS. Run from anywhere; resolves the repo root from this script's path.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Stage-4 authority chain — offline reproduction"

# (1) reproducibility + digest chain + invariants (stdlib python, no pip)
python3 scripts/lib/stage4_authority_chain_check.py

# (2) signed-bundle reproduce-verify (public keys only) + (3) tamper negative control
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { verifyAuthority } from "./tools/simurgh-attestation/verify-stage4a-authority.mjs";
import { verifyIntent } from "./tools/simurgh-attestation/stage4bIntentLib.mjs";
import { verifyProvenance } from "./tools/simurgh-attestation/stage4cProvenanceLib.mjs";
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const B = "docs/research/llm-shield/evidence";
const stages = [
  ["4A", "stage-4a-lite", "authority-bundle", "authority-decisions", "stage4a", verifyAuthority],
  ["4B", "stage-4b-intent", "intent-bundle", "intent-decisions", "stage4b", verifyIntent],
  ["4C", "stage-4c-provenance", "provenance-bundle", "provenance-decisions", "stage4c", verifyProvenance],
];
let bad = 0;
for (const [name, dir, bun, dec, keyp, fn] of stages) {
  const EV = `${B}/${dir}`;
  const args = {
    bundle: J(`${EV}/${bun}.json`),
    sidecar: J(`${EV}/${bun}.signature.json`),
    publicKeyPem: J(`${EV}/keys/${keyp}-public-key.json`).public_key_pem,
    decisions: J(`${EV}/${dec}.json`),
    manifest: J(`${EV}/manifest.json`),
    reproduce: true,
  };
  const ok = fn(args).ok;
  // negative control: flip one headline number, verification MUST fail
  const t = JSON.parse(JSON.stringify(args.bundle));
  t.summary[Object.keys(t.summary).find((k) => typeof t.summary[k] === "number")] = 987654;
  const tamperedRejected = fn({ ...args, bundle: t, reproduce: false }).ok === false;
  console.log(`  [${ok && tamperedRejected ? "OK" : "FAIL"}] ${name} reproduce-verify=${ok} tamper-rejected=${tamperedRejected}`);
  if (!ok || !tamperedRejected) bad++;
}
if (bad) { console.error(`signed-bundle checks: ${bad} FAILED`); process.exit(1); }
console.log("  signed bundles: 3/3 verify (public key only) + tamper rejected");
'

echo "Stage-4 authority chain reproduction: PASS"
