import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { validateDaemonProof } from "../../src/device/daemonProof.js";

test("Rust-signed Linux proof is accepted by Node validator", () => {
  const raw = fs.readFileSync("tests/fixtures/stage-2-8/linux-proof.json", "utf8");
  const { proof, public_key } = JSON.parse(raw);
  const ts = Date.parse(proof.timestamp);
  const result = validateDaemonProof(proof, {
    now: ts + 1_000,
    expectedSessionId: proof.session_id,
    expectedExamId: proof.exam_id,
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});
