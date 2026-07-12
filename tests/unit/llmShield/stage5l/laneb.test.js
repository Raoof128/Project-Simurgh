// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — Lane B: the OpenSSL-backed adapter verifies the committed REAL DigiCert RFC-3161 token
// (integration; shells openssl). Skips gracefully if openssl or the captured .tsr is unavailable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyLaneB } from "../../../../tools/simurgh-attestation/stage5l/node/verify-laneb.mjs";

const LB = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5l/real-laneb"
);
function opensslOk() {
  try {
    execFileSync("openssl", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test(
  "Lane B: real DigiCert RFC-3161 token verifies + binds the commitment digest",
  {
    skip:
      !(opensslOk() && existsSync(join(LB, "response.tsr"))) &&
      "openssl or captured .tsr unavailable",
  },
  () => {
    const r = verifyLaneB();
    assert.equal(r.cryptoResult, "valid");
    assert.equal(
      r.messageImprintHex,
      "3ee8a8c9b8d7ea805fdb4bae192d86d11c22192855526d95761f4b87d89828e8"
    );
    assert.equal(r.policyOID, "2.16.840.1.114412.7.1"); // DigiCert timestamping policy
    assert.ok(typeof r.genTime_s === "number" && r.genTime_s > 1_700_000_000);
  }
);
