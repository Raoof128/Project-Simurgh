// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashStudentId } from "../../src/privacy/hashIdentity.js";

describe("hashStudentId", () => {
  test("returns a 64-char hex string", () => {
    const result = hashStudentId("john.doe@example.com");
    assert.equal(typeof result, "string");
    assert.equal(result.length, 64);
    assert.match(result, /^[0-9a-f]{64}$/);
  });

  test("same input always produces same hash", () => {
    const a = hashStudentId("student123");
    const b = hashStudentId("student123");
    assert.equal(a, b);
  });

  test("different inputs produce different hashes", () => {
    const a = hashStudentId("alice");
    const b = hashStudentId("bob");
    assert.notEqual(a, b);
  });

  test("coerces non-string input to string", () => {
    const result = hashStudentId(12345);
    assert.equal(result.length, 64);
  });
});
