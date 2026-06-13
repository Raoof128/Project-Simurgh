// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalisePairingPayload } from "../../../src/integrity/pairingCanonicalise.js";
import { canonicaliseProofPayload } from "../../../src/integrity/proofCanonicalise.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("pairingCanonicalise", () => {
  test("re-exports the proof canonicaliser by reference identity", () => {
    assert.equal(canonicalisePairingPayload, canonicaliseProofPayload);
  });

  test("golden-pairing-payload SHA-256 matches expected hex", () => {
    const fixturePath = join(__dirname, "__fixtures__", "golden-pairing-payload.json");
    const expectedPath = join(__dirname, "__fixtures__", "golden-pairing-payload.sha256");
    const payload = JSON.parse(readFileSync(fixturePath, "utf8"));
    const expected = readFileSync(expectedPath, "utf8").trim();

    const canonical = canonicalisePairingPayload(payload);
    const actual = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");

    assert.equal(actual, expected, `canonical: ${canonical}`);
  });
});
