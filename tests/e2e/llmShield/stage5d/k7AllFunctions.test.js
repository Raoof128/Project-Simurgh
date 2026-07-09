// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — K7 all-functions e2e net (plan Task 17). Motto: AnthropicSafe First, then
// ReviewerSafe. Exercises every export, the full tamper matrix in frozen first-failure order, the
// committed-evidence verify, and the read-only-predecessor assertion (4w/4x/4y/5c untouched).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  evaluateVarl,
  evaluateVarlSafe,
  signBundle,
  contentOf,
} from "../../../../tools/simurgh-attestation/stage5d/core/varlCore.mjs";
import {
  buildGreenBundle,
  buildGreenContentWithKey,
  auditPrivate,
} from "../../../../tools/simurgh-attestation/stage5d/node/greenBundle.mjs";
import {
  applyRecipe,
  evasionDigest,
  recipeDigest,
} from "../../../../tools/simurgh-attestation/stage5d/core/recipes.mjs";
import {
  verdictAt,
  sourceDigest,
} from "../../../../tools/simurgh-attestation/stage5d/core/gateRegistry.mjs";
import {
  classifyDurability,
  CLOSURE_RULE_KINDS,
} from "../../../../tools/simurgh-attestation/stage5d/core/durability.mjs";
import {
  cornerOutcomes,
  trilemmaHolds,
} from "../../../../tools/simurgh-attestation/stage5d/core/trilemma.mjs";
import { escalationMonotoneOnCorpus } from "../../../../tools/simurgh-attestation/stage5d/core/ledgerCore.mjs";
import { verifyEvidence } from "../../../../tools/simurgh-attestation/stage5d/node/verify-stage5d-attestation.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const priv = readFileSync(
  join(REPO, "tests/fixtures/llmShield/stage5d/test-keys/INSECURE_FIXTURE_ONLY_stage-varl.pem"),
  "utf8"
);
const log = auditPrivate();
const audit = (b) => evaluateVarl(b, { tier: "audit", auditPrivate: log }).raw;
const pub = (b) => evaluateVarl(b, { tier: "public" }).raw;
const signed = (mutate) => {
  const c = mutate(structuredClone(buildGreenContentWithKey(priv)));
  return { ...c, signature: signBundle(c, priv) };
};

test("committed evidence verifies raw 0 at both tiers", () => {
  const { audit: a, pub: p } = verifyEvidence();
  assert.equal(a.raw, 0);
  assert.equal(p.raw, 0);
});

test("every pure export behaves (recipes, gate, durability, trilemma, monotone)", () => {
  assert.equal(applyRecipe("40", [{ op: "fullwidth_digits" }]), "４０");
  assert.match(evasionDigest("x", [{ op: "literal", args: { text: "y" } }]), /^sha256:/);
  assert.match(recipeDigest([{ op: "literal", args: { text: "y" } }]), /^sha256:/);
  assert.equal(verdictAt("v1", "leakage", "40 percent leaked"), true);
  assert.match(sourceDigest("v1"), /^sha256:/);
  assert.equal(classifyDurability({ rule_kinds: CLOSURE_RULE_KINDS["v3->v4"] }), "durable");
  assert.equal(trilemmaHolds(cornerOutcomes()), true);
  const b = buildGreenBundle(priv);
  assert.ok(escalationMonotoneOnCorpus(b));
  assert.ok(!("signature" in contentOf(b)));
});

test("tamper matrix: every code 240–254 fires at its owning tier, frozen first-failure order", () => {
  const b = buildGreenBundle(priv);
  assert.equal(audit(b), 0);
  assert.equal(pub(b), 0);
  assert.equal(audit({ ...b, smuggled: 1 }), 240);
  assert.equal(audit({ ...b, ruleset_id: "x" }), 241);
  assert.equal(audit(signed((c) => ((c.gate_registry[0].source_digest = "sha256:0"), c))), 242);
  assert.equal(audit(signed((c) => ((c.rungs[0].round = 9), c))), 243);
  assert.equal(
    audit(signed((c) => ((c.rungs[0].evasions[0].evasion_digest = "sha256:0"), c))),
    244
  );
  assert.equal(
    audit(signed((c) => ((c.rungs[0].evasions[0].watcher_verdict_at_target = true), c))),
    245
  );
  assert.equal(audit(signed((c) => ((c.rungs[0].closed_count = 3), c))), 246);
  assert.equal(audit(signed((c) => ((c.rungs[2].residual_class = ""), c))), 247);
  assert.equal(audit(signed((c) => ((c.rungs[0].durability = "durable"), c))), 248);
  assert.equal(
    audit(
      signed(
        (c) => (
          (c.trilemma_corners[1].closes_confusables = true),
          (c.trilemma_corners[1].diacritic_overblock = false),
          c
        )
      )
    ),
    249
  );
  assert.equal(audit(signed((c) => ((c.byo_target = { schema: "wrong" }), c))), 250);
  assert.equal(
    audit(
      signed(
        (c) => (
          (c.attester_provenance = {
            schema: "simurgh.varl.attester_provenance.v1",
            model_id: "m",
            org_id: "o",
            base_id: "synonym_veil_pct",
            response_digest: "sha256:0",
          }),
          c
        )
      )
    ),
    251
  );
  assert.equal(pub(signed((c) => ((c.analyst_note = "now unbreakable"), c))), 252);
  assert.equal(pub(signed((c) => ((c.rungs[0].evasions[0].human_reviewed = false), c))), 252);
  // 253 audit-only
  assert.equal(
    evaluateVarl(b, { tier: "audit", auditPrivate: { ...log, attempt_count: 0 } }).raw,
    253
  );
  assert.equal(evaluateVarl(b, { tier: "public" }).raw, 0);
  // 254 wrapper
  assert.equal(
    evaluateVarlSafe(b, { tier: "audit", auditPrivate: { schema: "x", rounds: [], z: 1n } }).raw,
    254
  );
});

test("read-only predecessor: 4w/4x/4y/5c byte-identical to the merge-base", () => {
  const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], {
    cwd: REPO,
    encoding: "utf8",
  }).trim();
  const changed = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      base,
      "--",
      "tools/simurgh-attestation/stage4w",
      "tools/simurgh-attestation/stage4x",
      "tools/simurgh-attestation/stage4y",
      "tools/simurgh-attestation/stage5c",
    ],
    { cwd: REPO, encoding: "utf8" }
  ).trim();
  assert.equal(changed, "", `predecessor files changed: ${changed}`);
});
