// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 3 — the runtime-visible census.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runtimeCensusFromNamespaces,
  mergeBatchResults,
  canonicalError,
  verifyRuntimeCensus,
  kindOf,
} from "../../../../tools/simurgh-attestation/stage5q/core/censusRuntime.mjs";

const PATH = "tools/simurgh-attestation/stage5a/core/claimCore.mjs";

test("functions and constants are distinguished at runtime", () => {
  const ns = { verifyClaim: () => {}, CLAIM_KINDS: Object.freeze(["a"]) };
  const { members } = runtimeCensusFromNamespaces({
    namespaces: [{ modulePath: PATH, namespace: ns }],
  });
  assert.equal(members.find((m) => m.symbol === "verifyClaim").kind, "function");
  assert.equal(members.find((m) => m.symbol === "CLAIM_KINDS").kind, "constant");
  assert.equal(
    kindOf(() => {}),
    "function"
  );
});

test("a re-export appears — this is what the static census can miss", () => {
  // The runtime surface is the point of a second census: a binding resolved at load looks like an
  // ordinary export here even though the file declared nothing.
  const ns = { reexported: () => {} };
  const { members } = runtimeCensusFromNamespaces({
    namespaces: [{ modulePath: PATH, namespace: ns }],
  });
  assert.equal(members.length, 1);
  assert.equal(members[0].symbol, "reexported");
});

test("Symbol-keyed namespace metadata is EXCLUDED, and no project export is lost", () => {
  // ECMAScript export names are strings. Symbol.toStringTag is metadata, not an export
  // (gauntlet P1-8). The exclusion must not take a real export with it.
  const ns = Object.defineProperty({ realExport: () => {} }, Symbol.toStringTag, {
    value: "Module",
  });
  const { members } = runtimeCensusFromNamespaces({
    namespaces: [{ modulePath: PATH, namespace: ns }],
  });
  assert.equal(members.length, 1, "exactly the project export survives");
  assert.equal(members[0].symbol, "realExport");
});

test("a CRASHED batch yields failures for the WHOLE batch, never a short member list", () => {
  // This is R7 — census truncation — committed by our own tooling. "These modules have no exports"
  // and "we never found out" must never be the same output.
  const merged = mergeBatchResults([
    { index: 0, members: [{ symbol: "a" }], failures: [] },
    { index: 1, crashed: true, modulePaths: ["m1.mjs", "m2.mjs"], error_class: "ExitNonZero" },
  ]);
  assert.equal(merged.members.length, 1, "the surviving batch still contributes");
  assert.equal(merged.failures.length, 2, "every module in the dead batch is accounted for");
  assert.deepEqual(merged.failures.map((f) => f.module_path).sort(), ["m1.mjs", "m2.mjs"]);
  for (const f of merged.failures) assert.equal(f.batch_index, 1);
});

test("error records are canonical — no stack, no absolute path, no PID, no timing", () => {
  // A byte-stable artifact cannot contain machine-varying text (gauntlet P2-5).
  const e = new Error("failed at /Users/someone/repo/tools/x.mjs:120:7 after 148213 ms");
  const c = canonicalError(e, "/Users/someone/repo");
  assert.ok(!c.message.includes("/Users/someone"), "absolute paths must not survive");
  assert.ok(!/\d{3,}/.test(c.message), "large numbers (pids, timings) must not survive");
  assert.equal(c.message.includes("<repo>"), true);
  assert.equal(c.message.includes(":<line>:<col>"), true);
  assert.ok(c.message.length <= 300, "messages are bounded");
});

test("canonicalError is deterministic for the same input", () => {
  const e = new Error("boom at /r/x.mjs:1:2");
  assert.deepEqual(canonicalError(e, "/r"), canonicalError(e, "/r"));
});

test("verify mode REFUSES unresolved failures; collect mode is where they are data", () => {
  assert.equal(verifyRuntimeCensus({ failures: [] }).ok, true);
  const v = verifyRuntimeCensus({ failures: [{ module_path: "m.mjs" }] });
  assert.equal(v.ok, false, "an unimportable module cannot enter a closure commitment");
  assert.match(v.blockers[0].reason, /precommit_blocker/);
  assert.match(v.blockers[0].reason, /no exception mechanism/);
});

test("an empty namespace list is a valid census of zero, not an error", () => {
  const r = runtimeCensusFromNamespaces({ namespaces: [] });
  assert.deepEqual(r.members, []);
  assert.deepEqual(r.failures, []);
});
