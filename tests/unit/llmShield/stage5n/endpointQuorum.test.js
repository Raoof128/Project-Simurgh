// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — endpoint child against the REAL banked capture: both endpoints reach the 5M quorum + OTS
// Bitcoin confirmation + TSA imprint. Skips if the capture or the reused 5M Rekor key is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runEndpointChild } from "../../../../tools/simurgh-attestation/stage5n/node/endpointQuorum.mjs";

const CAP = "/Users/raoof.r12/Desktop/Raouf/test/stage5n-gate-capture";
const REKORKEY =
  "/Users/raoof.r12/Desktop/Raouf/Project-Simurgh/docs/research/llm-shield/evidence/stage-5m/real-laneb/rekor_pubkey.pem";
const have =
  existsSync(`${CAP}/start.tsr`) && existsSync(REKORKEY) && existsSync(`${CAP}/submitter_pub.pem`);

function ev(role) {
  const D = readFileSync(`${CAP}/D_${role}.hex`, "utf8").trim();
  return {
    subjectHex: D,
    tsrPath: `${CAP}/${role}.tsr`,
    otsPath: `${CAP}/D_${role}.ots`,
    rekorEntry: JSON.parse(readFileSync(`${CAP}/${role}_rekor_entry.json`, "utf8")),
    rekorPubPem: readFileSync(REKORKEY, "utf8"),
    submitterPem: readFileSync(`${CAP}/submitter_pub.pem`, "utf8"),
  };
}

test(
  "start endpoint: TSA imprint + OTS Bitcoin confirmed + 5M extension → green (N=3)",
  { skip: !have },
  () => {
    const r = runEndpointChild("start", ev("start"));
    assert.equal(r.green, true, JSON.stringify(r.detail));
    assert.equal(r.raw, 0);
    assert.equal(r.stateFields.ecology_independence_number, 3);
    assert.ok(r.detail.bitcoin_block_heights.length > 0, "real Bitcoin attestation present");
  }
);

test("end endpoint: green (N=3)", { skip: !have }, () => {
  const r = runEndpointChild("end", ev("end"));
  assert.equal(r.green, true, JSON.stringify(r.detail));
  assert.equal(r.stateFields.ecology_independence_number, 3);
});

test("tampered subject → typed 404 (not green, not a throw)", { skip: !have }, () => {
  const e = ev("start");
  e.subjectHex = "0".repeat(64);
  const r = runEndpointChild("start", e);
  assert.equal(r.green, false);
  assert.equal(r.raw, 404);
});
