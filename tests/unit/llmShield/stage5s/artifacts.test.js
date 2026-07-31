// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 7 — the nine artifact schemas.

import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ARTIFACT_NAMES,
  ARTIFACT_REFUSALS as R,
  ARTIFACT_SCHEMAS,
  unavailableStatusCarriesNoView,
  validateArtifact,
} from "../../../../tools/simurgh-attestation/stage5s/core/artifacts.mjs";
import {
  checkpointBodyDigest,
  checkpointEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5s/core/canonical.mjs";
import {
  REQUIRED_ARTIFACT_BINDINGS,
  deriveEquivocationArtifact,
  keyDigestOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/equivocation.mjs";

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

// ---------------------------------------------------------------- the Task 14 seam (5S-F008)
//
// The schema above and `REQUIRED_ARTIFACT_BINDINGS` in `core/equivocation.mjs` are two definitions of
// one artifact, and they drifted: Task 14 renamed the widened `fork_coordinate` to
// `comparison_coordinate_pair` and this file kept the old name, so `validateArtifact` refused every
// genuine artifact as SCHEMA_UNSUPPORTED. That direction is fail-CLOSED and still unacceptable — a
// suppressed finding wearing a refusal's clothes is exactly the outcome §3.6 types absences to avoid.
//
// Nothing caught it because no test ever handed a REAL derived artifact to the validator; each side
// was internally consistent. So the test is the seam itself, not another restatement of either side.

test("[5s-t7] the schema's fields are a subset of the artifact's required bindings", () => {
  const missing = ARTIFACT_SCHEMAS.equivocation_artifact.filter(
    (f) => !REQUIRED_ARTIFACT_BINDINGS.includes(f)
  );
  assert.deepEqual(missing, [], `schema names fields the artifact never binds: ${missing}`);
});

test("[5s-t7] a REAL derived equivocation artifact validates against its schema", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const cp = (over) => {
    const body = {
      scope_id: "scope-1",
      epoch: 7,
      history_root: "root",
      predecessor: "body-6",
      c1_commitment: "c1",
      protocol_version: "vwq.1",
      policy_digest: "pol-1",
      producer_identity: "producer-1",
      ...over,
    };
    return {
      ...body,
      producer_signature: edSign(
        null,
        Buffer.from(checkpointBodyDigest(body), "utf8"),
        privateKey
      ).toString("base64"),
      producer_signature_profile: "ed25519",
    };
  };
  const view = (checkpoint, id) => ({
    checkpoint,
    carried_by: [
      {
        receiver_identity: id,
        receiver_key_digest: `rk-${id}`,
        checkpoint_envelope_digest: checkpointEnvelopeDigest(checkpoint),
        comparison_policy_digest: "cpd-1",
        receiver_sequence: 1,
      },
    ],
  });
  const a = view(cp({ history_root: "root-a" }), "r-a");
  const b = view(cp({ history_root: "root-b" }), "r-b");

  const derived = deriveEquivocationArtifact({
    view_a: a,
    view_b: b,
    comparison_policy: { comparison_policy_digest: "cpd-1" },
    comparison_manifest: { input_envelope_digests: [] },
    producer_key_digest: keyDigestOf(pem),
  });
  assert.equal(derived.ok, true);
  assert.ok(derived.artifact, "the two bodies differ at one coordinate — this IS a fork");

  const v = validateArtifact("equivocation_artifact", derived.artifact);
  assert.equal(v.ok, true, `the validator refused a valid artifact: ${JSON.stringify(v.refusals)}`);
});
