// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runNarrativeSelfProof } from "../../../../tools/simurgh-narrative/selfProof.mjs";

test("self-proof: every detector fires; nothing unsafe renders", () => {
  const sp = runNarrativeSelfProof();
  assert.ok(
    sp.fixtures.every((f) => f.passed),
    JSON.stringify(sp.fixtures.filter((f) => !f.passed))
  );
  assert.equal(sp.summary.narrative_claim_conflicts_rendered, 0);
  assert.equal(sp.summary.automatic_findings_rendered, 0);
  assert.equal(sp.summary.privacy_overclaims_rendered, 0);
  assert.ok(sp.summary.narrative_claim_conflict_attempts >= 1);
  const ids = sp.fixtures.map((f) => f.fixture_id);
  for (const id of [
    "clean-supported-narrative",
    "unsupported-signal-claim",
    "severity-overclaim",
    "privacy-overclaim",
    "missing-evidence-ref",
    "field-value-conflict",
    "freeform-prose-injection",
    "manual-review-wall",
    "renderer-determinism",
  ])
    assert.ok(ids.includes(id), `missing ${id}`);
});
