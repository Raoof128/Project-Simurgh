// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane C campaign gate (plan Task 3.2). completed ⟹ pack present AND verifies raw 0
// under a DISTINCT verifier key; a failing pack (e.g. a 342 adversarial trophy) is sealed, never
// completed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vrcLaneKeys } from "../../../../tools/simurgh-attestation/stage5j/node/laneKeys.mjs";
import { buildSignedVrcBundle } from "../../../../tools/simurgh-attestation/stage5j/node/buildSignedBundle.mjs";
import {
  evaluateCampaign,
  sealAdversarialOutcome,
} from "../../../../tools/simurgh-attestation/stage5j/node/lanec-gate.mjs";
import { runVrcDropletCeremony } from "../../../../tools/simurgh-attestation/stage5j/lanec/run-droplet-ceremony.mjs";

test("pending campaign with no pack stays pending", () => {
  assert.deepEqual(evaluateCampaign({ status: "pending" }, "sha256:ours"), { status: "pending" });
  assert.deepEqual(evaluateCampaign(null, "sha256:ours"), { status: "pending" });
});

test("completed campaign: verifying pack under a DISTINCT verifier key → completed", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  const r = evaluateCampaign(
    { status: "completed", pack: { bundle, cfg } },
    "sha256:some-other-ours"
  );
  assert.equal(r.status, "completed");
  assert.equal(r.raw, 0);
  assert.equal(r.independence, "distinct_key_only");
});

test("completed claim whose pack fails verification is rejected (never completed)", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  bundle.contest_history = bundle.contest_history.filter((ce) => ce.content.section_id !== "3"); // → 342
  const r = evaluateCampaign({ status: "completed", pack: { bundle, cfg } }, "sha256:ours");
  assert.equal(r.status, "rejected");
  assert.equal(r.reason, "pack_does_not_verify");
});

test("completed claim signed by OUR verifier key (not distinct) is rejected", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  const r = evaluateCampaign(
    { status: "completed", pack: { bundle, cfg } },
    cfg.verifier_key_pin.key_fingerprint
  );
  assert.equal(r.status, "rejected");
  assert.equal(r.reason, "verifier_not_distinct");
});

test("adversarial Fable-5 demo: a 342 outcome seals as a trophy, not a completed campaign", () => {
  assert.deepEqual(sealAdversarialOutcome(342), { sealed: "override_caught_trophy" });
  assert.deepEqual(sealAdversarialOutcome(0), { sealed: "system_works" });
});

test("droplet ceremony: fresh keys over the real Opus 4.6 structure → raw 0, distinct verifier", () => {
  const { bundle, cfg, pub, aud, sections, divergences } = runVrcDropletCeremony();
  assert.equal(pub.raw, 0);
  assert.equal(aud.raw, 0);
  assert.ok(sections >= 20, "real Opus structure has many sections");
  assert.ok(divergences >= 1);
  // the gate accepts the freshly-generated pack as completed under its own (distinct) verifier key
  const gated = evaluateCampaign(
    { status: "completed", pack: { bundle, cfg } },
    "sha256:not-the-droplet-verifier"
  );
  assert.equal(gated.status, "completed");
  assert.equal(gated.independence, "distinct_key_only");
});
