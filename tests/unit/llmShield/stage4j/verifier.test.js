// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runPctaCore } from "../../../../tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs";
import { stage4CodeForRawCode } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const MATRIX = JSON.parse(
  readFileSync("tests/fixtures/llmShield/stage4j/expected-results/pcta-matrix.json", "utf8")
);

for (const [name, expected] of Object.entries(MATRIX)) {
  test(`P-gate: ${name} -> raw ${expected.raw}, typed ${expected.typed}`, async () => {
    const { rawCode } = await runPctaCore({
      fixture: `tests/fixtures/llmShield/stage4j/${name}.json`,
      pinnedPubkeyPath: "tests/fixtures/llmShield/stage4j/pcta-signer.pub",
    });
    assert.equal(rawCode, expected.raw, name);
    assert.equal(stage4CodeForRawCode(rawCode), expected.typed, name);
  });
}
