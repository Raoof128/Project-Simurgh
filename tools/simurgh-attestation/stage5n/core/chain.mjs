// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the dependent sequential hash chain. Verifier RE-RUNS all T steps (no fast-verify, no trusted
// setup — deliberately NOT a VDF). Chain state is raw 32-byte buffers throughout (digest contract P0-8).
import crypto from "node:crypto";
import { hdsStepBytes, hexToBytes32, hdsObject } from "./encoding.mjs";
import { DS } from "../constants.mjs";

const NUL = Buffer.from([0]);

// seed = H_DS(seed.v1, canonical({run_id, D_in, start_token_digest, delay_policy_digest})) -> DigestHex.
export function deriveSeed({ run_id, D_in, start_token_digest, delay_policy_digest }) {
  return hdsObject(DS.seed, { run_id, D_in, start_token_digest, delay_policy_digest });
}

// x_0 bytes = sha256(x0.v1 || 0x00 || seedBytes).
export function x0Bytes(seedHex) {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(DS.x0, "utf8"))
    .update(NUL)
    .update(hexToBytes32(seedHex))
    .digest();
}

// Full chain: x_i = step(i, x_{i-1}) for i=1..T. Returns hex x0/terminal + committed checkpoint ladder.
export function runChain(seedHex, T, cadence) {
  let x = x0Bytes(seedHex);
  const x0 = x.toString("hex");
  const checkpoints = [];
  for (let i = 1; i <= T; i++) {
    x = hdsStepBytes(i, x);
    if (cadence > 0 && i % cadence === 0) checkpoints.push({ i, value: x.toString("hex") });
  }
  return { x0, checkpoints, terminal_value: x.toString("hex") };
}
