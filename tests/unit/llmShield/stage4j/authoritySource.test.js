// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUTHORITY_RANK,
  canCarry,
  resolveP4,
} from "../../../../tools/simurgh-attestation/stage4j/authoritySource.mjs";

test("lattice ranks are correct and carry rules hold", () => {
  assert.equal(AUTHORITY_RANK.user_confirmed, 3);
  assert.equal(AUTHORITY_RANK.untrusted_context, 0);
  assert.equal(canCarry("user_confirmed", false), true);
  assert.equal(canCarry("policy_preauthorized", false), true);
  assert.equal(canCarry("agent_derived", false), false);
  assert.equal(canCarry("agent_derived", true), true);
  assert.equal(canCarry("untrusted_context", true), false); // never
});

test("P4 accepts a clean authority sink", () => {
  assert.deepEqual(
    resolveP4({
      authoritySource: "user_confirmed",
      declaredUntrustedReachedAuthority: false,
      sinkSafetyClaim: { node: "action:act_001", node_label: "trusted", safe: true },
    }),
    { ok: true }
  );
});

test("P4 rejects untrusted-labelled sink EVEN when the proof declares clean", () => {
  const r = resolveP4({
    authoritySource: "user_confirmed",
    declaredUntrustedReachedAuthority: false, // producer lies
    sinkSafetyClaim: { node: "action:act_001", node_label: "untrusted", safe: false },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "authority_from_untrusted_context");
});

test("P4 rejects an untrusted_context authority source outright", () => {
  const r = resolveP4({
    authoritySource: "untrusted_context",
    declaredUntrustedReachedAuthority: false,
    sinkSafetyClaim: { node: "action:act_001", node_label: "trusted", safe: true },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "authority_from_untrusted_context");
});

test("P4 missing claim rejects with its OWN reason (not mislabelled as untrusted-context)", () => {
  const r = resolveP4({
    authoritySource: "user_confirmed",
    declaredUntrustedReachedAuthority: false,
    sinkSafetyClaim: undefined, // action absent from the re-verified cert's sink claims
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no_authority_sink_claim");
});
