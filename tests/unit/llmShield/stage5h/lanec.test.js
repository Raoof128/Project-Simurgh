// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane C ingest (fixture keys standing in for the foreign producer) + campaign outcome.
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import {
  assembleRealAttestation,
  verifyAssembled,
} from "../../../../tools/simurgh-attestation/stage5h/lanec/build-real-disclosure.mjs";
import { validateCampaign } from "../../../../tools/simurgh-attestation/stage5h/core/campaignOutcome.mjs";
import { identityDigest } from "../../../../tools/simurgh-attestation/stage5h/core/digests.mjs";

test("Lane C ingest: assembled real attestation verifies raw 0", () => {
  const fx = validBundle();
  // simulate a returned package from an independent producer (fixture keys stand in here)
  const pkg = {
    claim_inventory: fx.bundle.claim_inventory,
    review_receipts: fx.bundle.review_receipts,
    producer_identity: fx.bundle.producer_identity,
    recipes: fx.recipes,
    artefacts: fx.artefacts,
  };
  const verifierIdentity = fx.bundle.verifier_identity;
  const assembled = assembleRealAttestation({
    pkg,
    verifierIdentity,
    verifierPriv: fx.keys.verifierKey.priv,
  });
  const pin = {
    key_fingerprint: verifierIdentity.key_fingerprint,
    identity_subject: verifierIdentity.identity_subject,
    identity_digest: identityDigest(verifierIdentity),
  };
  const res = verifyAssembled(assembled, { pin, hostRegistry: fx.hostRegistry });
  assert.equal(res.raw, 0);
});

test("campaign outcome: only completed may carry disclosure; pending is honest", () => {
  assert.equal(validateCampaign({ status: "pending", disclosure_present: false }), "pending");
  assert.equal(validateCampaign({ status: "completed", disclosure_present: true }), "completed");
  assert.throws(() => validateCampaign({ status: "bogus" }));
  assert.throws(() => validateCampaign({ status: "pending", disclosure_present: true }));
});
