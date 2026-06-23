import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyTimeline } from "../../../../tools/simurgh-attestation/verify-stage3x-timeline.mjs";
import { buildIndexFile } from "../../../../tools/simurgh-attestation/build-3x-timeline.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const index = JSON.parse(readFileSync(`${EV}/timeline.index.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/timeline.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3x-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  assert.equal(verifyTimeline({ index, sidecar, publicKeyPem: pub }).ok, true);
});
test("reproduce recomputes digests + commits + chain summary", () => {
  const r = verifyTimeline({
    index,
    sidecar,
    publicKeyPem: pub,
    reproduce: true,
    rebuild: buildIndexFile,
  });
  assert.equal(r.ok, true);
  assert.equal(r.checks.evidence_root_digests_recomputed, true);
  assert.equal(r.checks.merge_commits_recomputed, true);
  assert.equal(r.checks.chain_summary_recomputed, true);
});
test("fails closed on missing input (never throws)", () => {
  assert.equal(verifyTimeline({ index: null, sidecar: null, publicKeyPem: null }).ok, false);
});
test("rejects a flipped replay_tier", () => {
  const t = JSON.parse(JSON.stringify(index));
  t.rungs[0].replay_tier = "reproduce";
  assert.equal(verifyTimeline({ index: t, sidecar, publicKeyPem: pub }).ok, false);
});
