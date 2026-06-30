// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildPremiseSet,
  premiseDigest,
} from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";
import { validateDerivation } from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sortEdges(edges) {
  return [...edges].sort((left, right) =>
    `${left.from}\0${left.to}\0${left.label}`.localeCompare(
      `${right.from}\0${right.to}\0${right.label}`
    )
  );
}

test("Stage 4H.2 Q0 clean fixture exists and verifies as raw 0", () => {
  for (const path of [
    `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.sig`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-signer.pub`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`,
  ]) {
    assert.equal(existsSync(path), true, `${path} exists`);
  }

  const pack = readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`);
  const certificate = readJson(
    `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`
  );
  const premises = buildPremiseSet(pack);
  assert.equal(certificate.premise_digest, premiseDigest(premises));
  const result = validateDerivation({ premises, certificate });
  assert.equal(result.code, 0);
});

test("Stage 4H.2 Q4a forges clean premise digest over dirty replay and dies at Q2", () => {
  const dirtyPack = readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`);
  const cleanPack = readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`);
  const certificate = readJson(`${fixtureRoot}/q4a-forged-premise-digest-certificate.json`);
  assert.equal(certificate.premise_digest, premiseDigest(buildPremiseSet(cleanPack)));
  assert.notEqual(certificate.premise_digest, premiseDigest(buildPremiseSet(dirtyPack)));
});

test("Stage 4H.2 Q0/Q4 base packs differ only by the DFI edge into action:act_001", () => {
  const cleanPack = readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`);
  const dirtyPack = readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`);
  const cleanPremises = buildPremiseSet(cleanPack);
  const dirtyPremises = buildPremiseSet(dirtyPack);

  const cleanA1Edges = cleanPremises.explicit_edges
    .filter((edge) => edge.stable_fields.to === "action:act_001")
    .map((edge) => ({
      from: edge.stable_fields.from,
      label: edge.stable_fields.label,
      to: edge.stable_fields.to,
    }));
  const dirtyA1Edges = dirtyPremises.explicit_edges
    .filter((edge) => edge.stable_fields.to === "action:act_001")
    .map((edge) => ({
      from: edge.stable_fields.from,
      label: edge.stable_fields.label,
      to: edge.stable_fields.to,
    }));

  assert.deepEqual(sortEdges(cleanA1Edges), [
    { from: "source:sys", label: "trusted", to: "action:act_001" },
  ]);
  assert.deepEqual(sortEdges(dirtyA1Edges), [
    { from: "source:doc1", label: "untrusted_web", to: "action:act_001" },
    { from: "source:sys", label: "trusted", to: "action:act_001" },
  ]);

  const cleanWithoutA1Edges = cleanPremises.explicit_edges.filter(
    (edge) => edge.stable_fields.to !== "action:act_001"
  );
  const dirtyWithoutA1Edges = dirtyPremises.explicit_edges.filter(
    (edge) => edge.stable_fields.to !== "action:act_001"
  );
  assert.equal(cleanWithoutA1Edges.length, dirtyWithoutA1Edges.length);
  assert.deepEqual(
    cleanWithoutA1Edges.map((edge) => edge.stable_fields),
    dirtyWithoutA1Edges.map((edge) => edge.stable_fields)
  );
});

test("Stage 4H.2 Q4b forged-safe complete derivation reaches raw 24 reason", () => {
  const pack = readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`);
  const certificate = readJson(
    `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-certificate.json`
  );
  const result = validateDerivation({ premises: buildPremiseSet(pack), certificate });
  assert.equal(result.code, 24);
  assert.equal(result.reason, "proof_accepts_bad_flow");
});

test("Stage 4H.2 Q4c partial omission reaches raw 26 derivation_scope_incomplete", () => {
  const pack = readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`);
  const certificate = readJson(`${fixtureRoot}/q4c-derivation-scope-omission-certificate.json`);
  const actionA0 = certificate.derivation.lattice_steps.find(
    (step) => step.node === "action:act_000"
  );
  const actionA1 = certificate.derivation.lattice_steps.find(
    (step) => step.node === "action:act_001"
  );
  assert.equal(Boolean(actionA0), true);
  assert.equal(Boolean(actionA1), false);
  const result = validateDerivation({ premises: buildPremiseSet(pack), certificate });
  assert.equal(result.code, 26);
  assert.equal(result.reason, "derivation_scope_incomplete");
});
