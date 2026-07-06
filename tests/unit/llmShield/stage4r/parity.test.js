// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
// JS <-> Python parity: the two independent implementations of the reference
// group + hash-to-point + double-mask + match token must agree byte-for-byte.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { G, mul } from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";
import {
  classPoint,
  maskPoint,
  matchToken,
  pairId,
} from "../../../../tools/simurgh-attestation/stage4r/core/maskCore.mjs";
import { dleqProve } from "../../../../tools/simurgh-attestation/stage4r/core/dleq.mjs";

const KERNEL = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tools/simurgh-attestation/stage4r/python/pccc_kernel.py"
);
const EPOCH = "sha256:" + "a".repeat(64);
const KEYDIGS = ["sha256:" + "1".repeat(64), "sha256:" + "2".repeat(64)];
const A = "0000000000000000000000000000000000000000000000000000000000abcdef";
const B = "0000000000000000000000000000000000000000000000000000000000fedcba";

function jsTokens(classA, classB) {
  const a = BigInt("0x" + A);
  const b = BigInt("0x" + B);
  const mA = maskPoint(a, classPoint(EPOCH, classA));
  const mB = maskPoint(b, classPoint(EPOCH, classB));
  const pid = pairId(EPOCH, KEYDIGS);
  return {
    token_a: matchToken(EPOCH, pid, maskPoint(a, mB)),
    token_b: matchToken(EPOCH, pid, maskPoint(b, mA)),
  };
}

function runKernel(corpus) {
  const dir = mkdtempSync(join(tmpdir(), "pccc-parity-"));
  const path = join(dir, "corpus.json");
  writeFileSync(path, JSON.stringify(corpus));
  const res = spawnSync("python3", [KERNEL, "verify", path], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  return res.stdout
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

test("python kernel reproduces JS match/non-match tokens byte-for-byte", () => {
  const classMatch = "sha256:" + "b".repeat(64);
  const classOther = "sha256:" + "c".repeat(64);
  const corpus = {
    cases: [
      {
        name: "match",
        epoch: EPOCH,
        class_a: classMatch,
        class_b: classMatch,
        scalar_a: A,
        scalar_b: B,
        operator_key_digests: KEYDIGS,
      },
      {
        name: "non-match",
        epoch: EPOCH,
        class_a: classMatch,
        class_b: classOther,
        scalar_a: A,
        scalar_b: B,
        operator_key_digests: KEYDIGS,
      },
    ],
  };
  const out = runKernel(corpus);
  const jsMatch = jsTokens(classMatch, classMatch);
  const jsNon = jsTokens(classMatch, classOther);

  const m = out.find((o) => o.name === "match");
  assert.equal(m.token_a, jsMatch.token_a);
  assert.equal(m.token_b, jsMatch.token_b);
  assert.equal(m.match, true);
  assert.equal(m.raw, 0);

  const n = out.find((o) => o.name === "non-match");
  assert.equal(n.token_a, jsNon.token_a);
  assert.equal(n.token_b, jsNon.token_b);
  assert.equal(n.match, false);
});

test("python kernel independently rejects a forged DLEQ (raw 93)", () => {
  const classMatch = "sha256:" + "b".repeat(64);
  const a = BigInt("0x" + A);
  const pid = pairId(EPOCH, KEYDIGS);
  // honest mask proof for scalar a, but the kernel will verify it against a
  // wrong target (scalar b·Hc) → must reject.
  const proof = dleqProve({
    scalar: a,
    basePoint: classPoint(EPOCH, classMatch),
    epk: mul(a, G),
    targetPoint: mul(a, classPoint(EPOCH, classMatch)),
    relationKind: "mask",
    epoch: EPOCH,
    runId: "run",
    pairId: pid,
    role: "a",
  });
  const corpus = {
    cases: [
      {
        name: "forged",
        epoch: EPOCH,
        class_a: classMatch,
        class_b: classMatch,
        scalar_a: A,
        scalar_b: B,
        operator_key_digests: KEYDIGS,
        forged_dleq: { proof, wrong_scalar: B },
      },
    ],
  };
  const [out] = runKernel(corpus);
  assert.equal(out.raw, 93);
  assert.equal(out.reason, "dleq_z_proof_invalid");
});
