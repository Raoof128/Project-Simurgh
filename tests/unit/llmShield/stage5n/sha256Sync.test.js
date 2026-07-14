// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the browser sync SHA-256 vs NIST KAT + 5000 random cross-checks vs node:crypto + chain-step
// equality (proves the browser tier can recompute the dependent chain without crypto.subtle).
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  sha256Hex,
  sha256Bytes,
  fromHex,
} from "../../../../tools/simurgh-attestation/stage5n/browser/sha256-sync.mjs";

test("NIST known-answer vectors", () => {
  assert.equal(
    sha256Hex(new Uint8Array(0)),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
  assert.equal(
    sha256Hex(new TextEncoder().encode("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
  assert.equal(
    sha256Hex(new TextEncoder().encode("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")),
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
  );
});

test("5000 random inputs match node:crypto", () => {
  for (let i = 0; i < 5000; i++) {
    const len = i % 200;
    const buf = crypto.randomBytes(len);
    const ref = crypto.createHash("sha256").update(buf).digest("hex");
    assert.equal(sha256Hex(new Uint8Array(buf)), ref, `len ${len}`);
  }
});

test("chain step equality: sync sha256 reproduces the node chain-step recurrence", () => {
  const NUL = new Uint8Array([0]);
  const step = new TextEncoder().encode("simurgh.vtc_delay.step.v1");
  let x = fromHex("aa".repeat(32));
  // 2000 sync steps
  let syncX = x;
  for (let i = 1; i <= 2000; i++) {
    const ib = new Uint8Array(8);
    new DataView(ib.buffer).setBigUint64(0, BigInt(i), false);
    const msg = new Uint8Array(step.length + 1 + 8 + 32);
    msg.set(step, 0);
    msg.set(NUL, step.length);
    msg.set(ib, step.length + 1);
    msg.set(syncX, step.length + 9);
    syncX = sha256Bytes(msg);
  }
  // Same 2000 steps via node:crypto
  let nodeX = Buffer.from(x);
  for (let i = 1; i <= 2000; i++) {
    const ib = Buffer.alloc(8);
    ib.writeBigUInt64BE(BigInt(i));
    nodeX = crypto
      .createHash("sha256")
      .update(Buffer.from("simurgh.vtc_delay.step.v1"))
      .update(Buffer.from([0]))
      .update(ib)
      .update(nodeX)
      .digest();
  }
  assert.equal(Buffer.from(syncX).toString("hex"), nodeX.toString("hex"));
});
