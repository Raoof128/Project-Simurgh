// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyHopChain } from "../../../../tools/simurgh-attestation/stage4p/core/chainCore.mjs";
import { hopReceiptDigest } from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

function buildChain(envelopeDigest, n, responseDigest) {
  const hops = [];
  let prev = envelopeDigest;
  for (let i = 0; i < n; i++) {
    const hop = {
      schema: "simurgh.custody_hop_receipt.v1",
      hop_index: i,
      previous_receipt_digest: prev,
      relay_identity_digest: D(String(i + 1)),
      transform_digest: "genesis",
      input_digest: D("c"),
      output_digest: i === n - 1 ? responseDigest : D("d"),
      signature: "QUJD",
    };
    hops.push(hop);
    prev = hopReceiptDigest(hop);
  }
  return hops;
}

test("well-linked chain verifies and reports path digest + relay identities", () => {
  const hops = buildChain(D("e"), 3, D("f"));
  const r = verifyHopChain({ envelopeDigest: D("e"), hops, responseDigest: D("f") });
  assert.equal(r.ok, true);
  assert.match(r.custody_path_digest, /^sha256:/);
  assert.deepEqual(r.relay_identity_digests, [D("1"), D("2"), D("3")]);
});

// A chain whose two hops share IDENTICAL content (relay/transform/input/output) but
// carry correct hop_index + previous-link — so it reaches the replay check and fires
// duplicated_hop, not reordered/non_linking (MF2).
function contentDuplicateChain(envelopeDigest) {
  const content = {
    schema: "simurgh.custody_hop_receipt.v1",
    relay_identity_digest: D("1"),
    transform_digest: "genesis",
    input_digest: D("c"),
    output_digest: D("d"),
    signature: "QUJD",
  };
  const hop0 = { ...content, hop_index: 0, previous_receipt_digest: envelopeDigest };
  const hop1 = { ...content, hop_index: 1, previous_receipt_digest: hopReceiptDigest(hop0) };
  return [hop0, hop1];
}

test("laundering arms: missing, reordered, duplicated, non-linking, terminal mismatch", () => {
  const good = () => buildChain(D("e"), 3, D("f"));
  const arms = [
    [[], "missing_hop"],
    [
      (() => {
        const h = good();
        h[0] = { ...h[0], hop_index: 5 };
        return h;
      })(),
      "reordered_hop",
    ],
    [
      (() => {
        const h = good();
        h[1] = { ...h[1], previous_receipt_digest: D("0") };
        return h;
      })(),
      "non_linking_previous_digest",
    ],
    [contentDuplicateChain(D("e")), "duplicated_hop"],
    [
      (() => {
        const h = good();
        h[2] = { ...h[2], output_digest: D("9") };
        return h;
      })(),
      "terminal_response_mismatch",
    ],
  ];
  for (const [hops, reason] of arms) {
    const r = verifyHopChain({ envelopeDigest: D("e"), hops, responseDigest: D("f") });
    assert.equal(r.ok, false, reason);
    assert.equal(r.raw, 78, reason);
    assert.equal(r.reason, reason);
  }
});

test("schema-invalid hop inside chain surfaces raw 67, not 78", () => {
  const hops = buildChain(D("e"), 2, D("f"));
  hops[1] = { ...hops[1], surprise: true };
  const r = verifyHopChain({ envelopeDigest: D("e"), hops, responseDigest: D("f") });
  assert.deepEqual(r, { ok: false, raw: 67, reason: "schema_invalid" });
});
