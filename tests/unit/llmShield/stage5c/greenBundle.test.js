// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — greenBundle + evidence (plan Tasks 8/9/11). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  FLAGGED_BASES,
  VSB_FIXTURE_FAMILIES,
} from "../../../../tools/simurgh-attestation/stage5c/core/corpus.mjs";
import {
  buildGreenBundle,
  auditPrivate,
  buildGreenContent,
} from "../../../../tools/simurgh-attestation/stage5c/node/greenBundle.mjs";
import { evaluateVsb } from "../../../../tools/simurgh-attestation/stage5c/core/vsbCore.mjs";
import { blindSeverity } from "../../../../tools/simurgh-attestation/stage5c/core/blindSeverity.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const KEY = join(
  REPO,
  "tests/fixtures/llmShield/stage5c/test-keys/INSECURE_FIXTURE_ONLY_stage-vsb.pem"
);
const priv = readFileSync(KEY, "utf8");

test("green bundle over the committed corpus verifies raw 0 at both tiers", () => {
  const bundle = buildGreenBundle(priv, FLAGGED_BASES);
  const baseTextById = auditPrivate(FLAGGED_BASES);
  assert.deepEqual(evaluateVsb(bundle, { tier: "audit", baseTextById }), { raw: 0 });
  assert.deepEqual(evaluateVsb(bundle, { tier: "public", baseTextById }), { raw: 0 });
});

test("the corpus produces a NON-ZERO, honest slip count (the point of the stage)", () => {
  const bundle = buildGreenBundle(priv, FLAGGED_BASES);
  const slipped = bundle.grid.filter((c) => c.cell_class === "slipped").length;
  assert.ok(slipped > 0, "expected a non-zero slip count");
  assert.equal(bundle.slip_table.length, slipped); // No Silent Slip: table == slipped cells
});

test("byte-stability: buildGreenContent is deterministic (same corpus → identical canonical bytes)", () => {
  assert.equal(
    canonicalJson(buildGreenContent(FLAGGED_BASES)),
    canonicalJson(buildGreenContent(FLAGGED_BASES))
  );
});

test("severities are the blind-digest function of each slip's mutated_text_digest (reconcilable)", () => {
  const bundle = buildGreenBundle(priv, FLAGGED_BASES);
  const digestOf = new Map(
    bundle.grid.map((c) => [`${c.mr_id}|${c.base_id}`, c.mutated_text_digest])
  );
  for (const e of bundle.slip_table)
    assert.equal(e.severity, blindSeverity(digestOf.get(`${e.mr_id}|${e.base_id}`)));
});

test("committed evidence file matches a fresh build (byte-stable on disk)", () => {
  const onDisk = readFileSync(
    join(REPO, "docs/research/llm-shield/evidence/stage-5c/green-slip-ledger.json"),
    "utf8"
  );
  const fresh = canonicalJson(buildGreenBundle(priv, FLAGGED_BASES)) + "\n";
  assert.equal(onDisk, fresh);
});

test("every named fixture family is represented in the corpus", () => {
  const fams = new Set(FLAGGED_BASES.map((b) => b.family));
  for (const f of VSB_FIXTURE_FAMILIES) assert.ok(fams.has(f), `family ${f}`);
});
