// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage4o/core/digest.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

test("domain separation: same value, different domain => different digest", () => {
  const a = domainDigest(DOMAINS.TOOL_ENTRY, "s", { x: 1 });
  const b = domainDigest(DOMAINS.ACTION, "s", { x: 1 });
  assert.match(a, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(a, b);
});

test("digest is key-order independent (canonical)", () => {
  assert.equal(
    domainDigest(DOMAINS.DELTA, "s", { b: 2, a: 1 }),
    domainDigest(DOMAINS.DELTA, "s", { a: 1, b: 2 })
  );
});

test("an unknown domain throws (fail closed)", () => {
  assert.throws(() => domainDigest("NOT_A_STAGE4O_DOMAIN", "s", {}), /unknown_digest_domain/);
});
