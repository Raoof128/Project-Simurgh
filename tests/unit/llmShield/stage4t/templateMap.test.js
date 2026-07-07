// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC template pinning (135/136/137). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadTemplates,
  verifyTemplateBindings,
} from "../../../../tools/simurgh-attestation/stage4t/core/templateMap.mjs";
import {
  TEMPLATE_SNAPSHOT_DIGESTS,
  PARTITIONS,
} from "../../../../tools/simurgh-attestation/stage4t/constants.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const templates = loadTemplates();

const okBindings = () =>
  Object.entries(TEMPLATE_SNAPSHOT_DIGESTS).map(([regime, d]) => ({
    regime,
    template_snapshot_digest: d,
    partition_digest: recordDigest(PARTITIONS[regime]),
  }));

test("pinned digests match the committed snapshots", () => {
  for (const [regime, d] of Object.entries(TEMPLATE_SNAPSHOT_DIGESTS)) {
    assert.equal(recordDigest(templates[regime]), d, `${regime} digest drift`);
  }
});

test("green bindings verify", () => {
  const capsule = { template_bindings: okBindings(), projected_sections: [] };
  assert.equal(verifyTemplateBindings(capsule, templates), null);
});

test("135 on tampered snapshot digest", () => {
  const b = okBindings();
  b[0].template_snapshot_digest = "sha256:" + "0".repeat(64);
  const r = verifyTemplateBindings({ template_bindings: b, projected_sections: [] }, templates);
  assert.equal(r.raw, 135);
});

test("136 on partition gap (binding digest matches the gappy partition, else 135 fires first)", () => {
  const gappy = { ...PARTITIONS.gpai_art55 };
  delete gappy.incident_dates;
  const b = okBindings();
  b.find((x) => x.regime === "gpai_art55").partition_digest = recordDigest(gappy);
  const r = verifyTemplateBindings({ template_bindings: b, projected_sections: [] }, templates, {
    partitions: { ...PARTITIONS, gpai_art55: gappy },
  });
  assert.equal(r.raw, 136);
});

test("136 on EXTRA partition entry (partition superset of snapshot)", () => {
  const extra = { ...PARTITIONS.gpai_art55, invented_section: "not_derivable" };
  const b = okBindings();
  b.find((x) => x.regime === "gpai_art55").partition_digest = recordDigest(extra);
  const r = verifyTemplateBindings({ template_bindings: b, projected_sections: [] }, templates, {
    partitions: { ...PARTITIONS, gpai_art55: extra },
  });
  assert.equal(r.raw, 136);
});

test("137 on invented projected section", () => {
  const r = verifyTemplateBindings(
    {
      template_bindings: okBindings(),
      projected_sections: [
        { regime: "gpai_art55", section_id: "invented_section", class: "not_derivable" },
      ],
    },
    templates
  );
  assert.equal(r.raw, 137);
});
