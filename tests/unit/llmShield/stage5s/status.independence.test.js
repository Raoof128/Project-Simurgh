// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 13 — `witness_independence_status`, the status that cannot currently be earned.
//
// §3.4 and §5.1 say it plainly: a single operator may hold several distinct witness keys, that run
// may still report `witnessed_quorum`, and it MUST carry independence unproven. Every Lane B witness
// is `same_operator_distinct_key`, so the status is `unproven` BY CONSTRUCTION, not by measurement.
//
// THE ENUMERATION HAS ONE MEMBER ON PURPOSE. A stronger value would be a slot waiting to be filled
// by whoever next wants a nicer-looking run. §3.3 names the exact price of widening it — an external
// operator signing the full witness tuple — and records it as a debt rather than deferring silently.
// The test below pins the enumeration, so paying that debt is an explicit, reviewable edit.
//
// AND CORROBORATION NEVER TOUCHES IT. That is the laundering path this whole stage exists to close:
// an RFC-3161 token is cheap, and if a satisfied corroboration status could nudge independence, every
// run would buy its way to "independently witnessed" for the price of a timestamp.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXTERNAL_ANCHOR_CLASS,
  WITNESS_OPERATOR_CLASS,
} from "../../../../tools/simurgh-attestation/stage5s/core/classes.mjs";
import {
  CORROBORATION_STATUS,
  INDEPENDENCE_DEBT,
  WITNESS_INDEPENDENCE_STATUS,
  witnessIndependenceStatusOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/status.mjs";

const SRC = "tools/simurgh-attestation/stage5s/core/status.mjs";

test("[5s-t13] the enumeration has exactly one member, and it is `unproven`", () => {
  assert.deepEqual([...WITNESS_INDEPENDENCE_STATUS], ["unproven"]);
  assert.ok(Object.isFrozen(WITNESS_INDEPENDENCE_STATUS));
});

test("[5s-t13] the debt for widening it is written down, not left implied", () => {
  assert.match(INDEPENDENCE_DEBT, /external operator/i);
  assert.match(INDEPENDENCE_DEBT, /full witness tuple/i);
});

test("[5s-t13] every witness-class mix reports unproven", () => {
  for (const cls of WITNESS_OPERATOR_CLASS) {
    assert.equal(witnessIndependenceStatusOf({ witness_classes: [cls] }), "unproven");
  }
  assert.equal(
    witnessIndependenceStatusOf({ witness_classes: [...WITNESS_OPERATOR_CLASS] }),
    "unproven"
  );
});

test("[5s-t13] `distinct_operator_self_asserted` is an INPUT, not evidence", () => {
  // A third party asserting its own independence is our input. Treating the assertion as the
  // conclusion is how a claim launders itself into a status.
  const allSelfAsserted = witnessIndependenceStatusOf({
    witness_classes: ["distinct_operator_self_asserted", "distinct_operator_self_asserted"],
    self_asserted: true,
  });
  assert.equal(allSelfAsserted, "unproven");
});

test("[5s-t13] a SATISFIED corroboration status never moves independence", () => {
  for (const corroboration of CORROBORATION_STATUS) {
    for (const anchors of [[], [...EXTERNAL_ANCHOR_CLASS]]) {
      assert.equal(
        witnessIndependenceStatusOf({
          witness_classes: ["same_operator_distinct_key"],
          external_corroboration_status: corroboration,
          anchors,
        }),
        "unproven",
        `corroboration ${corroboration} with ${anchors.length} anchors moved independence`
      );
    }
  }
});

test("[5s-t13] a met quorum never moves independence either", () => {
  assert.equal(
    witnessIndependenceStatusOf({
      witness_classes: ["same_operator_distinct_key", "same_operator_distinct_key"],
      quorum_status: "witnessed_quorum",
      distinct_eligible_witnesses: 99,
    }),
    "unproven"
  );
});

test("[5s-t13] absent and malformed inputs report unproven — the honest default", () => {
  for (const bad of [undefined, null, {}, [], "proven"]) {
    assert.equal(witnessIndependenceStatusOf(bad), "unproven");
  }
});

test("[5s-t13] the function reads no corroboration and no anchor — checked over source", () => {
  // Both comment kinds are stripped before the scan: the next function along is the corroboration
  // one, and its JSDoc naturally says "corroboration" all over.
  const code = readFileSync(SRC, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  const body = code.slice(code.indexOf("export function witnessIndependenceStatusOf"));
  const next = body.indexOf("\nexport ", 1);
  const fn = next === -1 ? body : body.slice(0, next);
  assert.ok(fn.includes("unproven"), "the extracted body is not the function");
  for (const forbidden of ["corroborat", "anchor", "rfc3161", "rekor", "bitcoin"]) {
    assert.ok(!fn.toLowerCase().includes(forbidden), `independence reads ${forbidden}`);
  }
});
