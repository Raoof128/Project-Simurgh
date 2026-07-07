// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC constants shape. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATE_REGIMES,
  PARTITION_CLASSES,
  PARTITIONS,
  PARTITION_RECOMPUTE_KIND,
  RECOMPUTE_KINDS,
  VIC_NON_CLAIMS,
  VIC_KNOWN_LIMITATIONS,
  VIC_RAILS,
  VIEW_TIERS,
} from "../../../../tools/simurgh-attestation/stage4t/constants.mjs";

test("lists have the expected lengths and are frozen", () => {
  assert.equal(VIC_NON_CLAIMS.length, 7);
  assert.equal(VIC_KNOWN_LIMITATIONS.length, 7);
  assert.equal(VIC_RAILS.length, 11);
  assert.equal(VIEW_TIERS.length, 3);
  assert.ok(Object.isFrozen(VIC_NON_CLAIMS));
  assert.ok(Object.isFrozen(PARTITIONS));
});

test("every evidence_backed partition entry has a recompute kind in the closed registry", () => {
  for (const regime of TEMPLATE_REGIMES) {
    for (const [sectionId, cls] of Object.entries(PARTITIONS[regime])) {
      assert.ok(PARTITION_CLASSES.includes(cls), `${regime}/${sectionId} class ${cls}`);
      if (cls === "evidence_backed") {
        const kind = PARTITION_RECOMPUTE_KIND[regime][sectionId];
        assert.ok(kind, `${regime}/${sectionId} missing recompute kind`);
        assert.ok(RECOMPUTE_KINDS.includes(kind), `${regime}/${sectionId} unknown kind ${kind}`);
      }
    }
  }
});

test("no recompute kind is declared for a non-evidence_backed section", () => {
  for (const regime of TEMPLATE_REGIMES) {
    for (const sectionId of Object.keys(PARTITION_RECOMPUTE_KIND[regime])) {
      assert.equal(
        PARTITIONS[regime][sectionId],
        "evidence_backed",
        `${regime}/${sectionId} has a recompute kind but is not evidence_backed`
      );
    }
  }
});
