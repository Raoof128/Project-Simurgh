// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyCustody } from "../../../../tools/simurgh-attestation/stage4p/core/custodyCore.mjs";
import {
  hopReceiptDigest,
  custodyPathDigest,
  surfaceBindingDigest,
} from "../../../../tools/simurgh-attestation/stage4p/core/digest.mjs";
import { buildCpcSignal } from "../../../../tools/simurgh-attestation/stage4p/core/cpcCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);
const SURFACE = surfaceBindingDigest({
  stage4o_manifest_digest: D("a"),
  stage4o_toolset_digest: D("b"),
  stage4o_manifest_epoch: 1,
});
const ANCHOR = D("f");

function greenInput() {
  const envelope = {
    schema: "simurgh.origin_custody_envelope.v1",
    run_epoch: 12,
    declared_endpoint_digest: D("1"),
    provider_family: "self_hosted",
    provider_identity_digest: D("2"),
    model_identity_digest: D("3"),
    relay_policy: "declared_relays_allowed",
    declared_relay_digests: [D("4"), D("5")],
    declared_transform_digests: [D("6")],
    account_boundary: "single_declared",
    trace_custody: "declared_relay",
    tool_surface_digest: SURFACE,
    valid_from_epoch: 10,
    valid_until_epoch: 20,
    signature: "QUJD",
  };
  const envelopeDigest = D("e");
  const responseDigest = D("9");
  const hops = [];
  let prev = envelopeDigest;
  for (let i = 0; i < 2; i++) {
    const hop = {
      schema: "simurgh.custody_hop_receipt.v1",
      hop_index: i,
      previous_receipt_digest: prev,
      relay_identity_digest: [D("4"), D("5")][i],
      transform_digest: "genesis",
      input_digest: D("7"),
      output_digest: i === 1 ? responseDigest : D("8"),
      signature: "QUJD",
    };
    hops.push(hop);
    prev = hopReceiptDigest(hop);
  }
  const custodyReceipt = {
    schema: "simurgh.custody_receipt.v1",
    request_digest: D("0"),
    response_digest: responseDigest,
    custody_path_digest: custodyPathDigest(hops.map(hopReceiptDigest)),
    model_identity_digest: D("3"),
    relay_chain_digest: D("5"),
    trace_custody_observed: "declared_relay",
    tool_surface_digest: SURFACE,
    receipt_epoch: 12,
    signature: "QUJD",
  };
  return {
    envelope,
    envelopeDigest,
    hops,
    custodyReceipt,
    responseDigest,
    requestDigest: D("0"),
    sig: { envelope_ok: true, hops_ok: true, receipt_ok: true },
    observed: {
      endpoint_digest: D("1"),
      model_identity_digest: D("3"),
      account_pool_observed: false,
      trace_custody_observed: "declared_relay",
      tool_surface_digest: SURFACE,
      transform_digests: [D("6")],
    },
    stage4o_surface_commitment_digest: SURFACE,
    cpc: { signals: [], declared_cap: 2, anchor_digests: [ANCHOR] },
  };
}

test("green input returns raw 0 with custody path digest", () => {
  const r = verifyCustody(greenInput());
  assert.equal(r.raw, 0);
  assert.match(r.custody_path_digest, /^sha256:/);
});

test("each raw code fires in isolation", () => {
  const arms = [
    [67, (x) => ({ ...x, envelope: null })],
    [68, (x) => ({ ...x, sig: { ...x.sig, hops_ok: false } })],
    [69, (x) => ({ ...x, envelope: { ...x.envelope, run_epoch: 25 } })],
    [78, (x) => ({ ...x, hops: [x.hops[0]] })],
    [70, (x) => ({ ...x, observed: { ...x.observed, endpoint_digest: D("z") } })],
    [71, (x) => ({ ...x, envelope: { ...x.envelope, declared_relay_digests: [D("4")] } })],
    [72, (x) => ({ ...x, observed: { ...x.observed, model_identity_digest: D("z") } })],
    [73, (x) => ({ ...x, observed: { ...x.observed, account_pool_observed: true } })],
    [74, (x) => ({ ...x, observed: { ...x.observed, trace_custody_observed: "unknown" } })],
    [75, (x) => ({ ...x, observed: { ...x.observed, tool_surface_digest: D("z") } })],
    [76, (x) => ({ ...x, observed: { ...x.observed, transform_digests: [D("z")] } })],
    [77, (x) => ({ ...x, requestDigest: D("z") })],
    [
      79,
      (x) => ({
        ...x,
        cpc: {
          signals: [
            buildCpcSignal({
              failure_class: "undeclared_proxy_hop",
              // Deviation from brief literal (D("q")): "q" is not a hex character, so
              // D("q") fails DIGEST_RE and validateCpcSignal rejects it as raw 67
              // before this arm's intended raw-79 path is reached. D("a") is valid hex
              // and still absent from ANCHOR = D("f"), preserving "not in anchor feed".
              stage4n_window_anchor_digest: D("a"), // not in anchor feed
              evidence_kind: "relay_spki_sha256",
              // Deviation from brief literal (D("w")): same hex-only constraint: "w" is
              // not hex. This value only feeds the windowed-evidence commitment hash
              // input and is never itself schema-validated, but D("b") keeps it
              // consistent with the fix above.
              observed_evidence_digest: D("b"),
              disclosure_budget_max_signals_per_window: 2,
            }),
          ],
          declared_cap: 2,
          anchor_digests: [ANCHOR],
        },
      }),
    ],
  ];
  for (const [raw, mutate] of arms) {
    const r = verifyCustody(mutate(greenInput()));
    assert.equal(r.raw, raw, `expected raw ${raw}, got ${r.raw} (${r.reason})`);
  }
});

test("first-failure determinism on doubly-broken arms (spec §7.1)", () => {
  // laundering + model swap -> 78, not 72
  let x = greenInput();
  x = { ...x, hops: [x.hops[0]], observed: { ...x.observed, model_identity_digest: D("z") } };
  assert.equal(verifyCustody(x).raw, 78);
  // bad signature + laundering -> 68, not 78
  let y = greenInput();
  y = { ...y, sig: { ...y.sig, receipt_ok: false }, hops: [y.hops[0]] };
  assert.equal(verifyCustody(y).raw, 68);
  // endpoint mismatch + undeclared relay -> 70, not 71
  let z = greenInput();
  z = {
    ...z,
    observed: { ...z.observed, endpoint_digest: D("z") },
    envelope: { ...z.envelope, declared_relay_digests: [D("4")] },
  };
  assert.equal(verifyCustody(z).raw, 70);
});

test("MF3: receipt epoch problems are raw 77, never raw 69", () => {
  // wrong receipt_epoch but envelope window fine -> 77 binding_mismatch (not 69)
  let a = greenInput();
  a = { ...a, custodyReceipt: { ...a.custodyReceipt, receipt_epoch: 13 } };
  const ra = verifyCustody(a);
  assert.equal(ra.raw, 77);
  assert.equal(ra.reason, "binding_mismatch");
  // malformed receipt (bad enum) -> 77 receipt_schema_invalid (not 69)
  let b = greenInput();
  b = { ...b, custodyReceipt: { ...b.custodyReceipt, trace_custody_observed: "psychic" } };
  const rb = verifyCustody(b);
  assert.equal(rb.raw, 77);
  assert.equal(rb.reason, "receipt_schema_invalid");
  // missing receipt field the 72 check would read -> caught by the parseability gate as
  // 77, never misread as 72 (MF3 follow-up).
  let c = greenInput();
  c = { ...c, custodyReceipt: { ...c.custodyReceipt } };
  delete c.custodyReceipt.model_identity_digest;
  const rc = verifyCustody(c);
  assert.equal(rc.raw, 77);
  assert.equal(rc.reason, "receipt_schema_invalid");
});
