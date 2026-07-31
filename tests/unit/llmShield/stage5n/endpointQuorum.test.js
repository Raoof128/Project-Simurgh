// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — endpoint child against the REAL banked capture: both endpoints reach the 5M quorum + OTS
// Bitcoin confirmation + TSA imprint.
//
// NO SKIPS (5S-F007). The Rekor public key is read from 5N's own committed copy rather than reaching
// sideways into Stage 5M by absolute path — the two files are byte-identical, and a stage that reads
// another stage's tree by machine-local path is the same defect wearing a different hat.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runEndpointChild } from "../../../../tools/simurgh-attestation/stage5n/node/endpointQuorum.mjs";

import {
  realEvidencePath,
  requireRealEvidence,
} from "../../../../tools/simurgh-attestation/stage5n/node/realEvidence.mjs";

requireRealEvidence();

function ev(role) {
  const D = readFileSync(realEvidencePath(`D_${role}_hex`), "utf8").trim();
  return {
    subjectHex: D,
    tsrPath: realEvidencePath(`${role}_tsr`),
    otsPath: realEvidencePath(`${role}_ots`),
    rekorEntry: JSON.parse(readFileSync(realEvidencePath(`${role}_rekor_entry`), "utf8")),
    rekorPubPem: readFileSync(realEvidencePath("rekor_pub_pem"), "utf8"),
    submitterPem: readFileSync(realEvidencePath("submitter_pub_pem"), "utf8"),
  };
}

test("start endpoint: TSA imprint + OTS Bitcoin confirmed + 5M extension → green (N=3)", () => {
  const r = runEndpointChild("start", ev("start"));
  assert.equal(r.green, true, JSON.stringify(r.detail));
  assert.equal(r.raw, 0);
  assert.equal(r.stateFields.ecology_independence_number, 3);
  assert.ok(r.detail.bitcoin_block_heights.length > 0, "real Bitcoin attestation present");
});

test("end endpoint: green (N=3)", () => {
  const r = runEndpointChild("end", ev("end"));
  assert.equal(r.green, true, JSON.stringify(r.detail));
  assert.equal(r.stateFields.ecology_independence_number, 3);
});

test("tampered subject → typed 404 (not green, not a throw)", () => {
  const e = ev("start");
  e.subjectHex = "0".repeat(64);
  const r = runEndpointChild("start", e);
  assert.equal(r.green, false);
  assert.equal(r.raw, 404);
});
