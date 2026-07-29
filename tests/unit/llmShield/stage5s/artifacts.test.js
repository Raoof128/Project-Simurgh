// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 7 — the nine artifact schemas.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ARTIFACT_NAMES,
  ARTIFACT_REFUSALS as R,
  ARTIFACT_SCHEMAS,
  unavailableStatusCarriesNoView,
  validateArtifact,
} from "../../../../tools/simurgh-attestation/stage5s/core/artifacts.mjs";

const wellFormed = (name) =>
  Object.fromEntries(
    ARTIFACT_SCHEMAS[name].map((f) => [
      f,
      f === "canonicalisation" ? "simurgh.vwq.canonical-json.v1" : `v-${f}`,
    ])
  );

test("[5s-t7] there are exactly nine artifacts, and they are the SPEC's nine", () => {
  const spec = readFileSync(
    "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md",
    "utf8"
  );
  const sec = spec.slice(spec.indexOf("### 2.1 Nine artifacts"), spec.indexOf("### 2.2"));
  const fromSpec = [...sec.matchAll(/^\| `([a-z_]+)`/gm)].map((m) => m[1]);
  assert.equal(fromSpec.length, 9);
  assert.deepEqual([...ARTIFACT_NAMES].sort(), [...fromSpec].sort());
});

test("[5s-t7] every artifact validates when well formed", () => {
  for (const name of ARTIFACT_NAMES) {
    const v = validateArtifact(name, wellFormed(name));
    assert.equal(v.ok, true, `${name}: ${JSON.stringify(v.refusals)}`);
  }
});

test("[5s-t7] every artifact is REFUSED with each required field removed in turn", () => {
  for (const name of ARTIFACT_NAMES) {
    for (const field of ARTIFACT_SCHEMAS[name]) {
      const mutated = { ...wellFormed(name) };
      delete mutated[field];
      const v = validateArtifact(name, mutated);
      assert.equal(v.ok, false, `${name} accepted without ${field}`);
      assert.ok(v.refusals.some((r) => r.field === field && r.reason === R.SCHEMA_UNSUPPORTED));
    }
  }
});

test("[5s-t7] validators RETURN refusals, they never throw", () => {
  for (const bad of [null, undefined, 42, "string", []]) {
    assert.doesNotThrow(() => validateArtifact("checkpoint", bad));
    assert.equal(validateArtifact("checkpoint", bad).ok, false);
  }
  assert.equal(validateArtifact("not_an_artifact", {}).ok, false);
});

test("[5s-t7] an unknown canonicalisation profile is 476, NOT 475", () => {
  const v = validateArtifact("witness_policy", {
    ...wellFormed("witness_policy"),
    canonicalisation: "made-up",
  });
  assert.equal(v.ok, false);
  assert.deepEqual(
    v.refusals.map((r) => r.reason),
    [R.CANONICALISATION_UNKNOWN]
  );
});

test("[5s-t7] receiver_unavailable_status is an AUTHENTICATED absence carrying no view", () => {
  const ok = wellFormed("receiver_unavailable_status");
  assert.ok(ok.signature && ok.receiver_identity, "absence must still be signed by someone");
  assert.equal(unavailableStatusCarriesNoView(ok), true);
  assert.equal(unavailableStatusCarriesNoView({ ...ok, view: { anything: 1 } }), false);
  assert.equal(unavailableStatusCarriesNoView({ ...ok, checkpoint: {} }), false);
});
