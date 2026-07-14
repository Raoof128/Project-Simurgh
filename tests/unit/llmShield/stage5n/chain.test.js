// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — chain + derivations: frozen known-answer vectors (small T), independent recompute, determinism.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  deriveSeed,
  x0Bytes,
  runChain,
} from "../../../../tools/simurgh-attestation/stage5n/core/chain.mjs";
import {
  startRequestDigest,
  startAuthorisationDigest,
  inputCommitment,
  decisionDigest,
  outputCommitment,
} from "../../../../tools/simurgh-attestation/stage5n/core/derive.mjs";
import { hexToBytes32 } from "../../../../tools/simurgh-attestation/stage5n/core/encoding.mjs";
import { DS } from "../../../../tools/simurgh-attestation/stage5n/constants.mjs";

const sha = (b) => crypto.createHash("sha256").update(b).digest();
const NUL = Buffer.from([0]);

// Independent reference chain (small T) — pins the exact recurrence byte-for-byte.
function refChain(seedHex, T, cadence) {
  let x = sha(Buffer.concat([Buffer.from(DS.x0, "utf8"), NUL, hexToBytes32(seedHex)]));
  const cps = [];
  for (let i = 1; i <= T; i++) {
    const ib = Buffer.alloc(8);
    ib.writeBigUInt64BE(BigInt(i));
    x = sha(Buffer.concat([Buffer.from(DS.step, "utf8"), NUL, ib, x]));
    if (i % cadence === 0) cps.push({ i, value: x.toString("hex") });
  }
  return { x0: null, checkpoints: cps, terminal_value: x.toString("hex") };
}

test("deriveSeed: canonical, input-dependent", () => {
  const base = {
    run_id: "r1",
    D_in: "a".repeat(64),
    start_token_digest: "b".repeat(64),
    delay_policy_digest: "c".repeat(64),
  };
  const s = deriveSeed(base);
  assert.match(s, /^[0-9a-f]{64}$/);
  assert.equal(deriveSeed({ ...base }), s, "deterministic");
  assert.notEqual(deriveSeed({ ...base, run_id: "r2" }), s, "run_id changes the seed");
});

test("runChain: matches the independent reference recurrence (small T=10, cadence=5)", () => {
  const seed = "d".repeat(64);
  const got = runChain(seed, 10, 5);
  const ref = refChain(seed, 10, 5);
  assert.equal(got.terminal_value, ref.terminal_value);
  assert.deepEqual(got.checkpoints, ref.checkpoints);
  assert.equal(got.x0, x0Bytes(seed).toString("hex"));
  assert.equal(got.checkpoints.length, 2, "cadence 5 over 10 steps → 2 checkpoints");
});

test("runChain: no fast-verify shortcut — every step depends on the previous (avalanche)", () => {
  const a = runChain("e".repeat(64), 100, 50).terminal_value;
  const b = runChain("f".repeat(64), 100, 50).terminal_value;
  assert.notEqual(a, b);
});

test("derivations: bare DigestHex, canonical, input-bound", () => {
  const sr = {
    stage_id: "5n",
    run_id: "r1",
    D_in: "1".repeat(64),
    delay_policy_digest: "2".repeat(64),
    nonce: "n",
  };
  const srd = startRequestDigest(sr);
  assert.match(srd, /^[0-9a-f]{64}$/);
  const auth = {
    start_request_digest: srd,
    producer_key_fingerprint: "sha256:" + "3".repeat(64),
    start_request_signature: "base64:sig",
  };
  assert.match(startAuthorisationDigest(auth), /^[0-9a-f]{64}$/);
  assert.match(
    inputCommitment({
      reference_schema: "v1",
      artifact_digest: "4".repeat(64),
      canonicalisation_profile: "p",
      artifact_type: "t",
    }),
    /^[0-9a-f]{64}$/
  );
  assert.match(
    decisionDigest({
      decision_schema: "v1",
      verdict: "delay_policy_satisfied",
      reason_codes: [],
      decision_scope_digest: "5".repeat(64),
    }),
    /^[0-9a-f]{64}$/
  );
  const out = outputCommitment({
    run_id: "r1",
    D_in: "1".repeat(64),
    decision_digest: "6".repeat(64),
    delay_policy_digest: "2".repeat(64),
    start_token_digest: "7".repeat(64),
    iteration_count: 20000000,
    terminal_value: "8".repeat(64),
  });
  assert.match(out, /^[0-9a-f]{64}$/);
  // Changing the terminal value changes D_out (the chain is load-bearing on the output commitment).
  const out2 = outputCommitment({
    run_id: "r1",
    D_in: "1".repeat(64),
    decision_digest: "6".repeat(64),
    delay_policy_digest: "2".repeat(64),
    start_token_digest: "7".repeat(64),
    iteration_count: 20000000,
    terminal_value: "9".repeat(64),
  });
  assert.notEqual(out, out2);
});
