// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — OSCAL projection + map delta (plan Task 15). Zero new raw codes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toOscalObservations } from "../../../../tools/simurgh-attestation/stage4y/core/oscalProjection.mjs";
import { mapDelta } from "../../../../tools/simurgh-attestation/stage4y/core/mapDelta.mjs";

const EVID = join(import.meta.dirname, "../../../..", "docs/research/llm-shield/evidence/stage-4y");
const rd = (name) => JSON.parse(readFileSync(join(EVID, name), "utf8"));

test("OSCAL projection has the required assessment-results shape and is deterministic", () => {
  const map = rd("incident_report_shaped.map.json");
  const a = toOscalObservations(map);
  const b = toOscalObservations(map);
  assert.deepEqual(a, b, "deterministic (uuids derive from the map digest)");
  const ar = a["assessment-results"];
  assert.ok(ar.uuid && ar.metadata && Array.isArray(ar.results));
  assert.equal(ar.metadata["oscal-version"], "1.1.2");
  const obs = ar.results[0].observations;
  assert.ok(obs.length >= 5, "one per region class + shadow");
  for (const o of obs) {
    assert.match(o.uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.ok(Array.isArray(o.methods) && o.methods.includes("TEST"));
  }
  assert.ok(obs.some((o) => /shadow/.test(o.description)));
});

test("map delta is pure arithmetic over the version pair and emits NO signature (unpaid socket)", () => {
  const v1 = rd("consulting_report_shaped_v1.map.json");
  const v2 = rd("consulting_report_shaped_v2.map.json");
  const d = mapDelta(v1, v2);
  assert.ok("region_class_deltas" in d && "shadow_deltas" in d);
  // b − a arithmetic sanity: caught_v1 delta equals the byte-count difference.
  assert.equal(
    d.region_class_deltas.caught_v1,
    v2.aggregates.bytes_by_class.caught_v1 - v1.aggregates.bytes_by_class.caught_v1
  );
  // it must NOT be a signed attestation (does not pay narrative_version_diff_deferred).
  assert.equal("signature" in d, false);
  assert.equal(JSON.stringify(d).includes("signature"), false);
});
