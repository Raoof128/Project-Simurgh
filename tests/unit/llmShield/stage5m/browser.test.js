// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — browser tier: pure-core parity with Node + WebCrypto Ed25519 verify of a real public
// attestation (signed by the Node signer). Runs in Node via globalThis.crypto.subtle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPublicKey } from "node:crypto";
import {
  extensionVerdict,
  verifyPublicAttestation,
  BROWSER_NON_CLAIM,
} from "../../../../tools/simurgh-attestation/stage5m/browser/vtcq-quorum-portable.mjs";
import { canonicalJson as portableCanon } from "../../../../tools/simurgh-attestation/stage5m/browser/canonical-json.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { checkRekorSeat } from "../../../../tools/simurgh-attestation/stage5m/core/rekorSeat.mjs";
import {
  checkCrossSeat,
  checkDistinctEcologies,
} from "../../../../tools/simurgh-attestation/stage5m/core/crossSeat.mjs";
import { checkState } from "../../../../tools/simurgh-attestation/stage5m/core/state.mjs";
import {
  signAttestation,
  buildPublicAttestationPayload,
} from "../../../../tools/simurgh-attestation/stage5m/node/attestation.mjs";
import { SIG5M } from "../../../../tools/simurgh-attestation/stage5m/node/sigDomains.mjs";
import { vtcQuorumLaneKeys } from "../../../../tools/simurgh-attestation/stage5m/node/laneKeys.mjs";

function jsExtension(f) {
  for (const step of [
    () => checkRekorSeat(f),
    () => checkCrossSeat(f),
    () => checkDistinctEcologies(f),
    () => checkState(f),
  ]) {
    const r = step();
    if (r) return r.raw;
  }
  return 0;
}
const base = (over = {}) => ({
  seat_present: true,
  rekor: { kind: "hashedrekord", artifact_hash: "H" },
  anchor_sha256: "H",
  inclusion_ok: true,
  checkpoint_ok: true,
  set_ok: true,
  submitter_ok: true,
  entry_submitter_fpr: "fp",
  expected_submitter_fpr: "fp",
  commitment: "D",
  anchor_decoded: "D",
  tsa_imprint: "D",
  ots_leaf: "D",
  rekor_artifact_hash: "H",
  present_valid_ecology_classes: ["rfc3161", "bitcoin", "rekor"],
  declared_externally_anchored: true,
  ...over,
});

test("portable canonicalJson is byte-identical to the repo canonicaliser", () => {
  const v = { b: [3, 1], a: { z: 1, k: 2 }, 0: "x" };
  assert.equal(portableCanon(v), canonicalJson(v));
});

test("browser pure core parity with Node on shared vectors", () => {
  for (const f of [
    base(),
    base({ present_valid_ecology_classes: ["rfc3161", "rekor", "rekor"] }),
    base({ anchor_sha256: "X" }),
    base({
      seat_present: false,
      present_valid_ecology_classes: ["rfc3161", "bitcoin"],
      declared_externally_anchored: true,
    }),
  ]) {
    assert.equal(extensionVerdict(f).raw, jsExtension(f));
  }
});

test("WebCrypto verifies a real public attestation; tamper → false", async () => {
  const keys = vtcQuorumLaneKeys();
  const bundle = {
    schema_version: "simurgh.vtcq.bundle.v1",
    envelope_schema: "vtc_quorum_confirmed.v2",
    commitment_session_id: "sha256:0fdfc6cd",
  };
  const verdict = {
    raw: 0,
    outcome_class: "ecology_confirmed",
    ecology_independence_number: 3,
    externally_anchored: true,
  };
  const att = signAttestation(keys.gate.privatePem, "public", bundle, verdict, {});
  const spki = createPublicKey(keys.gate.privatePem).export({ type: "spki", format: "pem" });
  assert.equal(await verifyPublicAttestation(att.payload, att.sig, spki, SIG5M.public), true);
  const tampered = { ...att.payload, ecology_independence_number: 2 };
  assert.equal(await verifyPublicAttestation(tampered, att.sig, spki, SIG5M.public), false);
});

test("browser ships its non-claim", () => {
  assert.match(BROWSER_NON_CLAIM, /does not execute RFC-3161\/OTS\/Bitcoin\/Rekor/);
});
