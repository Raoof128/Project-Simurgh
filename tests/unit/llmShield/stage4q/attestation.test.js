// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EVID = "docs/research/llm-shield/evidence/stage-4q";
const VERIFY = "tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs";

test("committed attestation passes both verifier tiers", () => {
  execFileSync("node", [VERIFY, `${EVID}/vfr-attestation.json`]); // throws on non-zero exit
});

test("flipped census digit fails tier 2; paraphrased non-claim fails tier 1", async () => {
  const { verifyBundle } = await import(`../../../../${VERIFY}`);
  const bundle = JSON.parse(readFileSync(`${EVID}/vfr-attestation.json`, "utf8"));
  const censusTamper = structuredClone(bundle);
  censusTamper.census.committed_crossings += 1;
  assert.notEqual(verifyBundle(censusTamper).raw, 0);
  const railTamper = structuredClone(bundle);
  railTamper.non_claims[0] = "not_a_general_friction_taxonomy"; // paraphrase = tamper
  assert.notEqual(verifyBundle(railTamper).raw, 0);
});

test("signing construction is the frozen body0 shape (spec §3.4): digest recomputes", async () => {
  const { recomputeBundleDigest } = await import(`../../../../${VERIFY}`);
  const bundle = JSON.parse(readFileSync(`${EVID}/vfr-attestation.json`, "utf8"));
  const { bundle_digest, signature, ...body0 } = bundle;
  assert.equal(recomputeBundleDigest(body0), bundle_digest);
});

test("byo-approver mode yields decision-equivalent evidence with a throwaway key", () => {
  execFileSync("node", [
    "-e",
    'const c=require("node:crypto"),fs=require("node:fs");const {privateKey}=c.generateKeyPairSync("ed25519");fs.writeFileSync("/tmp/stage4q-byo-test.pem",privateKey.export({type:"pkcs8",format:"pem"}));',
  ]);
  execFileSync("node", [
    VERIFY,
    `${EVID}/vfr-attestation.json`,
    "--approver-key",
    "/tmp/stage4q-byo-test.pem",
  ]);
});
