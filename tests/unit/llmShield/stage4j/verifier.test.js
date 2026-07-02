// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runPctaCore } from "../../../../tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs";
import { stage4CodeForRawCode } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const MATRIX = JSON.parse(
  readFileSync("tests/fixtures/llmShield/stage4j/expected-results/pcta-matrix.json", "utf8")
);

test("matrix includes the P8 row (38): P0-P8 exercised is literal, not aspirational", () => {
  assert.equal(MATRIX["sink-underdeclared"]?.raw, 38);
  assert.equal(MATRIX["sink-underdeclared"]?.typed, 1);
});

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

test("regression: bogus action_id (no receipt) stays fail-closed 34 AFTER the P8-before-P4 reorder", async (t) => {
  // Load-bearing audit row: with P8 ahead of P4, a missing receipt must SKIP P8 (receipt
  // null-guard) and fall through to P4's missing-claim rejection — never a TypeError crash.
  const { mkdtempSync, rmSync, writeFileSync, readFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const tmp = mkdtempSync(join(tmpdir(), "pcta-bogus-action-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const c = JSON.parse(
    readFileSync("tests/fixtures/llmShield/stage4j/clean-authorized.json", "utf8")
  );
  c.action_id = "act_does_not_exist";
  const p = join(tmp, "bogus.json");
  writeFileSync(p, JSON.stringify(c));
  const r = await runPctaCore({
    fixture: p,
    pinnedPubkeyPath: "tests/fixtures/llmShield/stage4j/pcta-signer.pub",
  });
  assert.equal(r.rawCode, 34);
  assert.equal(r.reason, "no_authority_sink_claim");
  assert.equal(stage4CodeForRawCode(r.rawCode), 1);
});
