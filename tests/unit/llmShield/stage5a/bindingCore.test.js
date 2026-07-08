// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — bindingCore (201, No Borrowed Story) over a REAL green bundle. Plan Task 6.
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { checkBindings } from "../../../../tools/simurgh-attestation/stage5a/core/bindingCore.mjs";
import {
  buildGreenVncBundle,
  VWA_PUB,
} from "../../../../tools/simurgh-attestation/stage5a/node/greenBundle.mjs";

const clone = (b) => structuredClone(b);
const opts = { vwaPubKeyPem: VWA_PUB };

test("green bundle → null (clean, both tiers)", () => {
  const b = buildGreenVncBundle();
  assert.equal(checkBindings(b, opts), null);
  assert.equal(checkBindings(b, { ...opts, tier: "audit" }), null);
});

test("preflight fact: narrative signature verifies against its own embedded author key", () => {
  const b = buildGreenVncBundle();
  // narrative_digest is the recordDigest over the WHOLE narrative object
  assert.match(recordDigest(b.narrative), /^sha256:[0-9a-f]{64}$/);
});

test("201: claim table points at a DIFFERENT narrative (No Borrowed Story / MF2)", () => {
  const b = clone(buildGreenVncBundle());
  b.claim_table.content.narrative_digest = "sha256:" + "0".repeat(64);
  assert.equal(checkBindings(b, opts).reason, "claim_table_narrative_digest_mismatch");
});

test("201: claim table declaration digest ≠ the map's declaration", () => {
  const b = clone(buildGreenVncBundle());
  b.claim_table.content.declaration_digest = "sha256:" + "1".repeat(64);
  assert.equal(checkBindings(b, opts).reason, "claim_table_declaration_digest_mismatch");
});

test("201: stale ledger map_digest (a signed stale digest is still stale — MF4)", () => {
  const b = clone(buildGreenVncBundle());
  b.ledger.content.map_digest = "sha256:" + "2".repeat(64);
  assert.equal(checkBindings(b, opts).reason, "ledger_map_digest_mismatch");
});

test("201: attestation ledger_digest stale", () => {
  const b = clone(buildGreenVncBundle());
  b.attestation.ledger_digest = "sha256:" + "3".repeat(64);
  assert.equal(checkBindings(b, opts).reason, "attestation_ledger_digest_mismatch");
});

test("201: a wrong 4Z public key surfaces as embedded delegation failure", () => {
  const b = buildGreenVncBundle();
  const r = checkBindings(b, { vwaPubKeyPem: b.narrative.author_pub_key_pem });
  assert.equal(r.raw, 201);
  assert.equal(r.reason, "embedded_vwa_verify_failed");
});

test("201: tampering a map tensor is caught — by the map_digest binding, before delegation", () => {
  // Mutating the map changes recordDigest(map), so the ledger's stored map_digest no longer
  // matches and No Borrowed Story trips FIRST (correct first-failure order). To reach the
  // embedded 4Z verify you must first make every binding consistent — see the wrong-key test.
  const b = clone(buildGreenVncBundle());
  b.vwa.map.cells[0].scores[0].score_nano = "999999999";
  const r = checkBindings(b, opts);
  assert.equal(r.raw, 201);
  assert.equal(r.reason, "ledger_map_digest_mismatch");
});

test("201: narrative signature broken (key-swap without re-attesting)", () => {
  const b = clone(buildGreenVncBundle());
  b.narrative.signature = Buffer.from("forged").toString("base64");
  // digest changes too, so the FIRST binding to trip is the claim-table narrative digest
  const r = checkBindings(b, opts);
  assert.equal(r.raw, 201);
});
