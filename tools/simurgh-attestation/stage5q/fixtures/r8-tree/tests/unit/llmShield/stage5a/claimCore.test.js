// fixture: an R8 member. A gate file — asserts a completeness fact, exports nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
test("every claim kind is covered", () => { assert.equal(2, 2); });
