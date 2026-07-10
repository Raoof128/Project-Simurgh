import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEvidence } from "../../../../tools/simurgh-attestation/stage5g/node/build-vfc-evidence.mjs";
import { verifyEvidence } from "../../../../tools/simurgh-attestation/stage5g/node/verify-vfc-attestation.mjs";

function freshPack() {
  const d = mkdtempSync(join(tmpdir(), "vfc-cli-"));
  buildEvidence({ evidenceDir: d, stageDir: d });
  return d;
}
const pins = (d) => ({
  dir: d,
  verifierPin: join(d, "pin.json"),
  trustRoot: join(d, "trust-root.json"),
});

test("built evidence verifies raw 0 (public + audit)", () => {
  const d = freshPack();
  assert.equal(verifyEvidence({ ...pins(d), tier: "public" }).raw, 0);
  assert.equal(verifyEvidence({ ...pins(d), tier: "audit" }).raw, 0);
});

test("strict --min-rung externally_anchored on rung-1 evidence → 298", () => {
  const d = freshPack();
  const r = verifyEvidence({ ...pins(d), minRung: "externally_anchored" });
  assert.equal(r.raw, 298);
  assert.equal(r.attestation_valid, true);
});

test("--attestation-only reports proven rung without policy rejection", () => {
  const d = freshPack();
  const r = verifyEvidence({ ...pins(d), minRung: "externally_anchored", attestationOnly: true });
  assert.equal(r.raw, 0);
  assert.equal(r.proven_rung, "challenge_bound");
  assert.equal(r.policy_accepted, null);
});
