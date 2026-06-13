// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { BANKING_PILOT_EVENTS } from "../../../src/bankingPilot/bankingAudit.js";

test("BANKING_PILOT_EVENTS defines the AI explanation export event", () => {
  assert.equal(BANKING_PILOT_EVENTS.AI_EXPLANATION_EXPORTED, "BANKING_AI_EXPLANATION_EXPORTED");
});
