// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import { forbiddenFieldsIn } from "../../e2e/forbiddenFields.mjs";

const TERMS = ["process_name", "pid", "username", "screenshot"];

test("a forbidden term used as a field name is found at any depth", () => {
  assert.deepEqual(forbiddenFieldsIn({ pid: 123 }, TERMS), ["pid"]);
  assert.deepEqual(forbiddenFieldsIn({ a: [{ b: { username: "x" } }] }, TERMS), ["username"]);
  assert.deepEqual(forbiddenFieldsIn({ daemon_pid: 7, meta: { process_name: "x" } }, TERMS), [
    "process_name",
    "pid",
  ]);
});

test("a forbidden term standing as a word inside a string value is found", () => {
  assert.deepEqual(forbiddenFieldsIn({ note: "saw pid 4 in the log" }, TERMS), ["pid"]);
  assert.deepEqual(forbiddenFieldsIn(["field=screenshot"], TERMS), ["screenshot"]);
  assert.deepEqual(forbiddenFieldsIn("pid", TERMS), ["pid"]);
});

test("random identifiers that merely contain the letters are not a leak", () => {
  // the flake this replaces: a base64url challenge or signature that happens to spell "pid"
  const value = {
    challenge: "Qk9pidZ3xT_a8-Lm2wEusernameR",
    signature: "AAscreenshotBB",
    sessionId: "stage24_25_0f3apid9",
    nested: [{ token: "xpidy" }, { rapid: true, stupidity: 0 }],
  };
  assert.deepEqual(forbiddenFieldsIn(value, TERMS), []);
});

test("numbers, booleans and null carry no field names", () => {
  assert.deepEqual(forbiddenFieldsIn({ a: 1, b: true, c: null, d: [2, false] }, TERMS), []);
  assert.deepEqual(forbiddenFieldsIn(null, TERMS), []);
});
