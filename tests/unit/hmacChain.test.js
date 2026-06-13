// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createChain, appendEntry, verifyChain } from "../../src/audit/hmacChain.js";

const TEST_KEY = "test-hmac-secret-key-for-unit-tests";

describe("hmacChain", () => {
  test("createChain returns a chain with GENESIS prev hash", () => {
    const chain = createChain();
    assert.equal(chain.prevHash, "GENESIS");
    assert.deepEqual(chain.entries, []);
    assert.equal(chain.truncated, false);
  });

  test("appendEntry adds an entry with a signature", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Safe" });
    assert.equal(chain.entries.length, 1);
    assert.ok(chain.entries[0].sig, "entry must have a sig");
    assert.equal(chain.entries[0].type, "verdict");
    assert.equal(chain.entries[0].seq, 0);
  });

  test("chain is valid after several entries", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "start", {});
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Warning" });
    appendEntry(chain, TEST_KEY, "submit", {});
    const { valid, errors } = verifyChain(chain, TEST_KEY);
    assert.ok(valid, `Chain invalid: ${JSON.stringify(errors)}`);
    assert.equal(errors.length, 0);
  });

  test("tampered entry invalidates chain", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Safe" });
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Warning" });
    // Tamper with first entry
    chain.entries[0].payload.risk_level = "Critical";
    const { valid } = verifyChain(chain, TEST_KEY);
    assert.ok(!valid, "Tampered chain should fail verification");
  });

  test("prevHash links entries (each entry prev equals prior sig)", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "a", {});
    appendEntry(chain, TEST_KEY, "b", {});
    assert.equal(chain.entries[1].prev, chain.entries[0].sig);
  });
});
