// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyExtractionV2 } from "../../../../tools/simurgh-extraction/verify-stage3u-attestation.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3u";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

async function load() {
  return {
    attestation: await rd("result/attestation.json"),
    sidecar: await rd("result/attestation.signature.json"),
    publicKeyPem: (await rd("keys/stage3u-public-key.json")).public_key_pem,
    mainSet: await rd("meta-set/metadata-set-v2.json"),
    regressionSet: await rd("meta-set/redteam-a10-regression-set.json"),
    detectorConfig: await rd("meta-set/detector-config.json"),
  };
}

test("committed 3U attestation verifies (portable, all bindings)", async () => {
  const { ok, checks } = verifyExtractionV2(await load());
  assert.equal(ok, true, JSON.stringify(checks));
  assert.equal(checks.main_result_digest_binding, true);
  assert.equal(checks.regression_result_digest_binding, true);
  assert.equal(checks.regression_did_not_escalate, true);
});

test("tampered decision breaks signature", async () => {
  const a = await load();
  a.attestation = { ...a.attestation, decision: "no_pattern_observed" };
  assert.equal(verifyExtractionV2(a).ok, false);
});

test("swapped main set breaks digest binding", async () => {
  const a = await load();
  a.mainSet = { ...a.mainSet, runs: [...a.mainSet.runs].slice(1) };
  const { ok, checks } = verifyExtractionV2(a);
  assert.equal(checks.meta_set_digest_binding, false);
  assert.equal(ok, false);
});

test("swapped regression set breaks regression result binding", async () => {
  const a = await load();
  a.regressionSet = { ...a.regressionSet, runs: [...a.regressionSet.runs].slice(1) };
  const { ok, checks } = verifyExtractionV2(a);
  assert.equal(checks.regression_result_digest_binding, false);
  assert.equal(ok, false);
});

test("malformed attestation (missing fields) returns ok:false, does not throw (R2-D)", async () => {
  const a = await load();
  for (const field of ["red_team_hardening", "non_claims", "known_limitations"]) {
    const broken = { ...a.attestation };
    delete broken[field];
    let result;
    assert.doesNotThrow(() => {
      result = verifyExtractionV2({ ...a, attestation: broken });
    }, `missing ${field} must not throw`);
    assert.equal(result.ok, false, `missing ${field} must be ok:false`);
  }
});
