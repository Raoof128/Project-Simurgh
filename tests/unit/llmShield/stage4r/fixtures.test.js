// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { SCALAR_HEX_RE } from "../../../../tools/simurgh-attestation/stage4r/constants.mjs";
import {
  scalarFromHex,
  L,
} from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const KEYS = ["operator-alpha", "operator-beta", "harness", "attestation"];

function keyDigest(name) {
  const priv = crypto.createPrivateKey(
    readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`))
  );
  const pub = crypto.createPublicKey(priv).export({ type: "spki", format: "der" }).toString("hex");
  return recordDigest({ pub });
}

test("all four fixture Ed25519 keys parse", () => {
  for (const name of KEYS) {
    const pem = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`));
    assert.doesNotThrow(() => crypto.createPrivateKey(pem));
  }
});

test("the four key digests are pairwise distinct (§4.2 four-key separation)", () => {
  const digests = KEYS.map(keyDigest);
  assert.equal(new Set(digests).size, KEYS.length);
});

test("fixture curve scalars are valid 64-hex values below L", () => {
  for (const name of ["operator-alpha", "operator-beta"]) {
    const hex = readFileSync(
      join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}-scalar.hex`),
      "utf8"
    ).trim();
    assert.match(hex, SCALAR_HEX_RE);
    assert.ok(scalarFromHex(hex) < L && scalarFromHex(hex) > 0n);
  }
});

test("key names carry no digits (3M/3O audit allowlist regex)", () => {
  for (const name of KEYS) assert.doesNotMatch(name, /[0-9]/);
});
