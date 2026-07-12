// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane C independence rung (VFC lattice). Structural, offline-testable part: the
// strongest rung a pack can claim given its anchor evidence + digest binding. The online Fulcio/Rekor
// check is injected as anchorVerified; a real Sigstore anchor is what lifts distinct_key_only →
// externally_anchored (the true-9.5 lever, gated on the operator's real OIDC identity).
import { test } from "node:test";
import assert from "node:assert/strict";
import { vrcLaneKeys } from "../../../../tools/simurgh-attestation/stage5j/node/laneKeys.mjs";
import { buildSignedVrcBundle } from "../../../../tools/simurgh-attestation/stage5j/node/buildSignedBundle.mjs";
import { contestLayerRoot } from "../../../../tools/simurgh-attestation/stage5j/core/roots.mjs";
import {
  strongestRung,
  anchorBindingValid,
  rungAtLeast,
  publicWitness,
  publicWitnessBindingValid,
} from "../../../../tools/simurgh-attestation/stage5j/core/independence.mjs";
import { evaluateCampaign } from "../../../../tools/simurgh-attestation/stage5j/node/lanec-gate.mjs";

function withAnchor(bundle, cfg, overrides = {}) {
  cfg.anchor_evidence = {
    kind: "sigstore-keyless",
    identity: "reviewer@example-org.org",
    anchored_digest: contestLayerRoot(bundle),
    bundle_digest: "sha256:sigstore-bundle-digest",
    ...overrides,
  };
  return cfg;
}

test("no anchor evidence → distinct_key_only", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  assert.equal(strongestRung(bundle, cfg, {}), "distinct_key_only");
});

test("valid, digest-bound anchor + verified online check → externally_anchored (true-9.5 rung)", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withAnchor(bundle, cfg);
  assert.equal(strongestRung(bundle, cfg, { anchorVerified: true }), "externally_anchored");
});

test("anchor present but online check NOT done → still distinct_key_only (no unearned upgrade)", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withAnchor(bundle, cfg);
  assert.equal(strongestRung(bundle, cfg, { anchorVerified: false }), "distinct_key_only");
});

test("anchor bound to the WRONG digest is rejected (not this pack)", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withAnchor(bundle, cfg, { anchored_digest: "sha256:some-other-pack" });
  assert.equal(anchorBindingValid(bundle, cfg).ok, false);
  assert.equal(strongestRung(bundle, cfg, { anchorVerified: true }), "distinct_key_only");
});

test("anchorBindingValid: well-formed + bound → ok; missing identity → rejected", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withAnchor(bundle, cfg);
  assert.deepEqual(anchorBindingValid(bundle, cfg), { ok: true });
  cfg.anchor_evidence.identity = "";
  assert.equal(anchorBindingValid(bundle, cfg).reason, "anchor_identity_missing");
});

test("challenge_bound (intermediate rung) when a Simurgh challenge round-trip is verified", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  assert.equal(strongestRung(bundle, cfg, { challengeVerified: true }), "challenge_bound");
  assert.ok(rungAtLeast("externally_anchored", "challenge_bound"));
  assert.ok(!rungAtLeast("distinct_key_only", "challenge_bound"));
});

test("the gate reports externally_anchored when a real anchor is verified", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withAnchor(bundle, cfg);
  const gated = evaluateCampaign({ status: "completed", pack: { bundle, cfg } }, "sha256:ours", {
    anchorVerified: true,
  });
  assert.equal(gated.status, "completed");
  assert.equal(gated.independence, "externally_anchored");
});

// --- DE-IDENTIFIED public transparency-log witness (no identity revealed) ----------------------
function withWitness(bundle, cfg, overrides = {}) {
  cfg.anchor_evidence = {
    kind: "public-witness",
    log: "opentimestamps",
    locator: "sha256:ots-proof-digest",
    anchored_digest: contestLayerRoot(bundle),
    ...overrides,
  };
  return cfg;
}

test("de-identified witness + verified public-log check → public_witness signal, rung stays distinct_key_only", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withWitness(bundle, cfg);
  // no identity anchor ⇒ identity rung unchanged
  assert.equal(strongestRung(bundle, cfg, { witnessVerified: true }), "distinct_key_only");
  // but a de-identified public witness IS recorded
  assert.deepEqual(publicWitness(bundle, cfg, { witnessVerified: true }), {
    log: "opentimestamps",
    verified: true,
    de_identified: true,
  });
});

test("witness that carries an identity is rejected (must stay de-identified)", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withWitness(bundle, cfg, { identity: "someone@org.org" });
  assert.equal(publicWitnessBindingValid(bundle, cfg).reason, "witness_must_be_de_identified");
  assert.equal(publicWitness(bundle, cfg, { witnessVerified: true }), null);
});

test("witness not bound to this pack, or unverified, → no signal", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withWitness(bundle, cfg, { anchored_digest: "sha256:other-pack" });
  assert.equal(publicWitness(bundle, cfg, { witnessVerified: true }), null);
  const c2 = withWitness(bundle, structuredClone(cfg), {});
  c2.anchor_evidence.anchored_digest = contestLayerRoot(bundle);
  assert.equal(publicWitness(bundle, c2, { witnessVerified: false }), null); // not yet verified
});

test("the gate reports the de-identified public_witness alongside distinct_key_only", () => {
  const { bundle, cfg } = buildSignedVrcBundle(vrcLaneKeys());
  withWitness(bundle, cfg);
  const gated = evaluateCampaign({ status: "completed", pack: { bundle, cfg } }, "sha256:ours", {
    witnessVerified: true,
  });
  assert.equal(gated.independence, "distinct_key_only");
  assert.equal(gated.public_witness.de_identified, true);
  assert.equal(gated.public_witness.log, "opentimestamps");
});
