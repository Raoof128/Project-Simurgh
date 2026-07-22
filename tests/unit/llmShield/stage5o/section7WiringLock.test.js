// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 Lane C — the wiring-lock source census.
//
// Separate unit tests prove the relation works with an injected validator and the real validator
// works alone; neither proves the PRODUCTION export wires the two correctly. This census reads the
// verifier source and proves the exported verifier is bound to the real mainnet validator, with no
// environment variable, config value, or weaker validator able to displace it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../tools/simurgh-attestation/stage5o/core/section7Verifier.mjs",
      import.meta.url
    )
  ),
  "utf8"
);

test("wiring-lock: the production verifier is bound to validateBitcoinMainnetSuffix", () => {
  assert.match(
    src,
    /export const verifySection7Relation = makeSection7Verifier\(\{\s*validateBitcoinSuffix:\s*validateBitcoinMainnetSuffix,?\s*\}\);/,
    "the exported verifier must be wired to the real mainnet validator"
  );
});

test("wiring-lock: no environment variable or config selects the validator", () => {
  assert.equal(/process\.env/.test(src), false, "no env-based validator selection");
  assert.equal(
    /validateSyntheticBitcoinSuffix|synthetic/i.test(src),
    false,
    "production source must not reference any synthetic validator"
  );
});

test("wiring-lock: the sealed factory is the only injection point", () => {
  // exactly one factory definition, and exactly one production construction (assignment call).
  const defs = src.match(/export function makeSection7Verifier/g) || [];
  assert.equal(defs.length, 1);
  const wired = src.match(/=\s*makeSection7Verifier\(\{/g) || [];
  assert.equal(wired.length, 1, "constructed exactly once in production source");
});
