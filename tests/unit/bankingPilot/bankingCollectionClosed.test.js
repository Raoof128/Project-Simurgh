// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  bankingCollectionClosed,
  rejectBankingWritesIfClosed,
} from "../../../src/bankingPilot/bankingCollectionClosed.js";

test("bankingCollectionClosed reads explicit true only", () => {
  const previous = process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED;
  process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = "true";
  assert.equal(bankingCollectionClosed(), true);
  process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = "false";
  assert.equal(bankingCollectionClosed(), false);
  if (previous === undefined) delete process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED;
  else process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = previous;
});

test("rejectBankingWritesIfClosed returns 410 before auth", () => {
  const previous = process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED;
  process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = "true";

  const req = { headers: {} };
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  let nextCalled = false;
  rejectBankingWritesIfClosed(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 410);
  assert.deepEqual(res.payload, { ok: false, error: "banking_pilot_collection_closed" });
  assert.equal(nextCalled, false);

  if (previous === undefined) delete process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED;
  else process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = previous;
});
