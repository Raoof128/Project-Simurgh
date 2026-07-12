// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — Lane C: campaign gate, independence rung, adversarial sealing, anchor attach, droplet run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSignedVucBundle } from "../../../../tools/simurgh-attestation/stage5k/node/buildSignedBundle.mjs";
import {
  evaluateCampaign,
  sealAdversarialOutcome,
} from "../../../../tools/simurgh-attestation/stage5k/node/lanec-gate.mjs";
import { attachAnchor } from "../../../../tools/simurgh-attestation/stage5k/node/attach-anchor.mjs";
import {
  strongestRung,
  publicWitnessBindingValid,
} from "../../../../tools/simurgh-attestation/stage5k/core/independence.mjs";
import { runDropletCeremony } from "../../../../tools/simurgh-attestation/stage5k/lanec/run-droplet-ceremony.mjs";

test("campaign gate: completed only if pack verifies raw 0 under a DISTINCT verifier key", () => {
  const { bundle, cfg } = buildSignedVucBundle();
  const campaign = { status: "completed", pack: { bundle, cfg } };
  // our verifier == the pack's verifier → rejected (not distinct)
  assert.equal(evaluateCampaign(campaign, cfg.verifier_key_fingerprint).status, "rejected");
  // a distinct verifier fingerprint → completed at distinct_key_only
  const r = evaluateCampaign(campaign, "sha256:" + "f".repeat(64));
  assert.equal(r.status, "completed");
  assert.equal(r.independence, "distinct_key_only");
  assert.equal(r.ordering_state, "verified_immediate");
  assert.equal(r.public_witness, null); // no witness attached
});

test("adversarial sealing: 357/358/354 are trophies, raw 0 is system-works, never completed", () => {
  assert.deepEqual(sealAdversarialOutcome(357), { sealed: "shrinking_caught_trophy" });
  assert.deepEqual(sealAdversarialOutcome(358), { sealed: "phantom_caught_trophy" });
  assert.deepEqual(sealAdversarialOutcome(354), { sealed: "post_signal_commit_caught_trophy" });
  assert.deepEqual(sealAdversarialOutcome(0), { sealed: "system_works_universe_on_record" });
});

test("independence rung refuses to exceed distinct_key_only without a verified anchor", () => {
  const { bundle, cfg } = buildSignedVucBundle();
  const subject = bundle.universe_commitment.universe_commitment_digest;
  const withAnchor = {
    ...cfg,
    anchor_evidence: { kind: "sigstore-keyless", identity: "who", anchored_digest: subject },
  };
  // structural binding alone → still distinct_key_only (needs injected anchorVerified)
  assert.equal(strongestRung(bundle, withAnchor, {}), "distinct_key_only");
  assert.equal(strongestRung(bundle, withAnchor, { anchorVerified: true }), "externally_anchored");
});

test("attachAnchor binds a de-identified public witness and preserves raw 0", () => {
  const { bundle, cfg } = buildSignedVucBundle();
  const subject = bundle.universe_commitment.universe_commitment_digest;
  const anchored = attachAnchor(
    { bundle, cfg },
    {
      kind: "public-witness",
      log: "opentimestamps",
      locator: "sha256:" + "1".repeat(64),
      anchored_digest: subject,
    }
  );
  assert.equal(anchored.anchored_digest, subject);
  assert.equal(publicWitnessBindingValid(bundle, anchored.cfg).ok, true);
  assert.throws(() =>
    attachAnchor(
      { bundle, cfg },
      { kind: "public-witness", anchored_digest: "sha256:" + "0".repeat(64) }
    )
  );
});

test("droplet runner produces a byte-verifiable pack + ANCHOR_ME = universe_commitment_digest", () => {
  const dir = mkdtempSync(join(tmpdir(), "vuc-droplet-"));
  const { result } = runDropletCeremony(dir);
  assert.equal(result.public_raw, 0);
  assert.equal(result.audit_raw, 0);
  const anchorMe = readFileSync(join(dir, "ANCHOR_ME.txt"), "utf8").trim();
  assert.equal(anchorMe, result.universe_commitment_digest);
});
