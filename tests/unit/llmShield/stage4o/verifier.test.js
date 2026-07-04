// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyEvidence,
  verifySelective,
} from "../../../../tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs";

const EVID = "docs/research/llm-shield/evidence/stage-4o";

test("committed evidence verifies green", () => {
  const out = verifyEvidence(EVID);
  assert.equal(out.ok, true);
  assert.equal(out.verdict, "green");
  assert.equal(out.arms, 18);
});

test("selective disclosure: GREEN arm included, invalid-proof arm rejected", () => {
  assert.equal(verifySelective("green-unchanged").ok, true);
  assert.equal(verifySelective("invalid-inclusion-proof").ok, false);
});

test("one flipped byte in the decision corpus fails verification", () => {
  const dir = mkdtempSync(join(tmpdir(), "vtsa-"));
  mkdirSync(dir, { recursive: true });
  const att = JSON.parse(readFileSync(`${EVID}/vtsa-attestation.json`, "utf8"));
  // Flip a committed arm's raw code without re-signing: digest recompute must catch it.
  att.decision_corpus[0].raw = att.decision_corpus[0].raw === 0 ? 99 : 0;
  writeFileSync(join(dir, "vtsa-attestation.json"), JSON.stringify(att, null, 2) + "\n");
  copyFileSync(`${EVID}/vtsa-manifest.json`, join(dir, "vtsa-manifest.json"));
  copyFileSync(`${EVID}/clean-chain.json`, join(dir, "clean-chain.json"));
  const out = verifyEvidence(dir);
  assert.equal(out.ok, false);
  // digest recompute over the mutated corpus no longer matches the signed bundle digest.
  assert.match(out.verdict, /digest_mismatch|signature_invalid|rederivation/);
});
