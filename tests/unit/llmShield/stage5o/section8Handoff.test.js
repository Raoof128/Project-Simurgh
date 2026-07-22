// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.2 — the sealed §7->§8 handoff. Frozen §7 acceptance is the SOLE minting gate; the
// opaque Section7AcceptedContext is minted only after the PRODUCTION verifier accepts the same
// immutable inputs from which the context is derived. No exported mint; lookalikes reject.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptSection7ForSection8,
  isSection7AcceptedContext,
} from "../../../../tools/simurgh-attestation/stage5o/core/acceptSection7ForSection8.mjs";
import { mintCommittedUniverseContext } from "../../../../tools/simurgh-attestation/stage5o/core/committedUniverseContext.mjs";
import { blockHashInternalHex } from "../../../../tools/simurgh-attestation/stage5o/core/bitcoinMainnetSuffixValidator.mjs";
import { encodeDigestToken } from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import { buildValidSection7Case, bundleOf } from "./section7SyntheticFixture.mjs";
import { genesisCheckpoint, suffixHeaders, REAL_CHAIN } from "./realMainnetChain.mjs";

const tok = (f) => encodeDigestToken(Buffer.alloc(32, f));

// A case the PRODUCTION verifier (real Bitcoin validator) accepts: genesis checkpoint + real headers.
function realCase() {
  return buildValidSection7Case({
    checkpoint: genesisCheckpoint(),
    headers: suffixHeaders(8),
    beaconValueHex: blockHashInternalHex(REAL_CHAIN[2][1]),
    precommittedBeaconHeight: 2,
    k: 8,
    universeSize: 256,
  });
}

function committedUniverse(over = {}) {
  return mintCommittedUniverseContext({
    scope_manifest_identity: "simurgh.vsc.scope_manifest.v1",
    merkle_root: tok(0x71),
    epoch_digest: tok(0x72),
    N: 256,
    execution_census: { 0: tok(0xe0), 1: tok(0xe1), 2: tok(0xe2) },
    disclosure_policy: {
      max_opening_package_transport_bytes: 1048576,
      max_opening_package_canonical_bytes: 524288,
      max_presented_history_transport_bytes: 1048576,
      max_presented_history_canonical_bytes: 524288,
      max_presented_history_entries: 1024,
      max_cumulative_disclosed_indices: 64,
    },
    ...over,
  });
}

test("handoff: a clean production ACCEPT mints a branded Section7AcceptedContext", () => {
  const { context, bundle } = realCase();
  const ctx = acceptSection7ForSection8(context, bundle, committedUniverse());
  assert.equal(isSection7AcceptedContext(ctx), true);
  assert.equal(Object.isFrozen(ctx), true);
  assert.equal(ctx.N, 256);
  assert.equal(ctx.ordered_selected_indices.length, 8);
  assert.match(ctx.challenge_record_digest, /^[0-9a-f]{64}$/);
});

test("handoff: a §7 symbolic rejection yields NO context", () => {
  const { context, parts } = realCase();
  const broken = { ...parts, beaconSuffix: { ...parts.beaconSuffix, headers: ["f".repeat(160)] } };
  const r = acceptSection7ForSection8(context, bundleOf(broken), committedUniverse());
  assert.equal(isSection7AcceptedContext(r), false);
  assert.equal(r, null);
});

test("handoff: an unaccepted §6 context (raw 29 path) yields NO context", () => {
  const { bundle } = realCase();
  const lookalike = { k: 8, universe_size: 256 }; // not a minted §6 context -> §7 throws -> raw 29
  const r = acceptSection7ForSection8(lookalike, bundle, committedUniverse());
  assert.equal(r, null);
});

test("handoff: a context minted from a rejected bundle is never produced", () => {
  const { context, parts } = realCase();
  const broken = {
    ...parts,
    record: { ...parts.record, challenge_seed: tok(0xff) }, // forged seed -> s7_seed_binding
  };
  assert.equal(acceptSection7ForSection8(context, bundleOf(broken), committedUniverse()), null);
});

test("handoff: mutating the source bundle after the call does not change the minted context", () => {
  const { context, bundle } = realCase();
  const mutableBundle = { ...bundle };
  const ctx = acceptSection7ForSection8(context, mutableBundle, committedUniverse());
  const before = ctx.ordered_selected_indices_digest;
  mutableBundle.challenge_record = "tampered";
  assert.equal(ctx.ordered_selected_indices_digest, before);
  assert.equal(Object.isFrozen(ctx.ordered_selected_indices), true);
});

test("handoff: lookalikes are not accepted contexts", () => {
  const { context, bundle } = realCase();
  const ctx = acceptSection7ForSection8(context, bundle, committedUniverse());
  assert.equal(isSection7AcceptedContext({ ...ctx }), false); // spread copy
  assert.equal(isSection7AcceptedContext(JSON.parse(JSON.stringify(ctx))), false); // round-trip
  assert.equal(isSection7AcceptedContext(structuredClone(ctx)), false);
  for (const x of [null, undefined, {}, "x", 0]) assert.equal(isSection7AcceptedContext(x), false);
});

test("handoff: no exported mint bypasses the acceptance gate", async () => {
  const mod =
    await import("../../../../tools/simurgh-attestation/stage5o/core/acceptSection7ForSection8.mjs");
  assert.equal(typeof mod.mintSection7AcceptedContext, "undefined");
  assert.equal(typeof mod.acceptSection7ForSection8, "function");
  assert.equal(typeof mod.isSection7AcceptedContext, "function");
});

test("handoff: a non-branded committed universe is rejected", () => {
  const { context, bundle } = realCase();
  const rawUniverse = { scope_manifest_identity: "x", merkle_root: tok(0x71) }; // not minted
  assert.throws(() => acceptSection7ForSection8(context, bundle, rawUniverse));
});
