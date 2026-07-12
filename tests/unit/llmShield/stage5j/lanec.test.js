// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane C campaign gate (plan Task 3.2). completed ⟹ pack present AND verifies raw 0
// under a DISTINCT verifier key; a failing pack (e.g. a 342 adversarial trophy) is sealed, never
// completed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vrcLaneKeys } from "../../../../tools/simurgh-attestation/stage5j/node/laneKeys.mjs";
import { buildSignedVrcBundle } from "../../../../tools/simurgh-attestation/stage5j/node/buildSignedBundle.mjs";
import { verifyVrc } from "../../../../tools/simurgh-attestation/stage5j/node/adapter.mjs";
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

test("REAL Lane C: the committed independent-party pack verifies raw 0 under a DISTINCT verifier key", () => {
  const dir = join(
    import.meta.dirname,
    "../../../../docs/research/llm-shield/evidence/stage-5j/real-structure"
  );
  const bundle = JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(dir, "external-config.json"), "utf8"));
  const outcome = JSON.parse(readFileSync(join(dir, "campaign-outcome.json"), "utf8"));

  // verifies raw 0 under OUR verifier
  assert.equal(verifyVrc(bundle, cfg, { tier: "public" }).raw, 0);
  assert.equal(verifyVrc(bundle, cfg, { tier: "audit" }).raw, 0);
  // real Opus 4.6 public structure (37 leaf sections), status completed
  assert.equal(outcome.status, "completed");
  assert.equal(outcome.committed_run.sections_total, 37);
  // the independent party's verifier key is NOT one we possess (non-possession is the point)
  const OURS = JSON.parse(
    readFileSync(
      join(
        import.meta.dirname,
        "../../../../docs/research/llm-shield/evidence/stage-5j/external-config.json"
      ),
      "utf8"
    )
  ).verifier_key_pin.key_fingerprint;
  assert.notEqual(cfg.verifier_key_pin.key_fingerprint, OURS);
  // the gate marks it completed (distinct_key_only)
  const gated = evaluateCampaign({ status: "completed", pack: { bundle, cfg } }, OURS);
  assert.equal(gated.status, "completed");
  assert.equal(gated.independence, "distinct_key_only");
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
