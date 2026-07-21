// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — A27's regenerated scope_manifest maximum, derived from the frozen schema through the
// production encoder. The number is the script's, not a remembered constant; the quarantined pre-A27
// figure and its freed hypothetical appear NOWHERE in the generator source (the only literals below
// are the anti-oracle search patterns, which must name what they forbid).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  generateScopeManifestMaximum,
  buildMaximalScopeManifest,
  checkScopeManifestShape,
  SCOPE_MANIFEST_KEYS,
  BUNDLE_PROFILES,
  PRODUCER_AUTHORITY_KEYS,
} from "../../../../tools/simurgh-attestation/stage5o/node/measureScopeManifestMaximum.mjs";

const GEN_SRC = new URL(
  "../../../../tools/simurgh-attestation/stage5o/node/measureScopeManifestMaximum.mjs",
  import.meta.url
);
const SPEC = new URL(
  "../../../../docs/superpowers/specs/2026-07-15-stage-5o-vsc-hidden-universe-equality-design.md",
  import.meta.url
);

/** Extract the leading identifiers of a flat `<name> = { ... }` block from the spec (comments stripped). */
function extractBlockKeys(spec, blockName) {
  const start = spec.indexOf(`${blockName} = {`);
  assert.notEqual(start, -1, `spec block "${blockName} = {" not found in the working tree`);
  const open = spec.indexOf("{", start);
  const close = spec.indexOf("}", open); // these three blocks are flat — no nested braces
  const body = spec.slice(open + 1, close);
  const keys = [];
  for (let line of body.split("\n")) {
    line = line.replace(/\/\/.*$/, "").trim(); // strip trailing comment first (may contain commas)
    if (!line) continue;
    for (let frag of line.split(",")) {
      frag = frag.trim();
      const m = frag.match(/^([a-z_][a-z_0-9]*)/); // identifier before any ": type" annotation
      if (m) keys.push(m[1]);
    }
  }
  return keys;
}

test("census: the generator's schema matches the CURRENT working-tree spec (not a reconstruction)", () => {
  const spec = readFileSync(SPEC, "utf8");

  // 12 top-level scope_manifest keys
  const specTop = extractBlockKeys(spec, "scope_manifest").sort();
  assert.deepEqual(
    specTop,
    [...SCOPE_MANIFEST_KEYS].sort(),
    "scope_manifest top-level keys drifted"
  );
  assert.equal(specTop.length, 12, "scope_manifest must have exactly 12 keys");

  // 34 profile_bundle keys = 17 id/digest pairs
  const specBundle = extractBlockKeys(spec, "profile_bundle").sort();
  const genBundle = [];
  for (const [p] of BUNDLE_PROFILES) genBundle.push(`${p}_id`, `${p}_digest`);
  assert.deepEqual(specBundle, [...genBundle].sort(), "profile_bundle keys drifted");
  assert.equal(specBundle.length, 34, "profile_bundle must have exactly 17 id/digest pairs");

  // 5 producer_authority_descriptor keys
  const specAuth = extractBlockKeys(spec, "producer_authority_descriptor").sort();
  assert.deepEqual(
    specAuth,
    [...PRODUCER_AUTHORITY_KEYS].sort(),
    "producer_authority keys drifted"
  );
  assert.equal(specAuth.length, 5, "producer_authority_descriptor must have exactly 5 keys");
});

test("census guard: the maximal manifest passes the exact-key schema; unknown/missing keys reject", () => {
  const m = buildMaximalScopeManifest();
  assert.doesNotThrow(() => checkScopeManifestShape(m));

  const extra = buildMaximalScopeManifest();
  extra.unexpected_field = "0".repeat(64);
  assert.throws(
    () => checkScopeManifestShape(extra),
    /scope_manifest_exact_keys/,
    "unknown key must reject"
  );

  const missing = buildMaximalScopeManifest();
  delete missing.merkle_root;
  assert.throws(
    () => checkScopeManifestShape(missing),
    /scope_manifest_exact_keys/,
    "missing key must reject"
  );
});

test("gate 3 — two independent totals AGREE (production encoder == structural ledger)", () => {
  const m = generateScopeManifestMaximum();
  assert.equal(m.encoderTotal, m.ledgerTotal, "encoder and ledger disagree — derivation rejected");
});

test("the derived maximum, pinned (the script is the authority; change the schema and this moves)", () => {
  const m = generateScopeManifestMaximum();
  assert.equal(m.MAX_SCOPE_CANONICAL_MANIFEST_BYTES_V1, 6809136);
  // labelled leaf-array split, exactly
  assert.equal(m.ledger.leaf_split.entries_plus_inter_commas, 6804633);
  assert.equal(
    m.ledger.leaf_split.entries_plus_inter_commas + m.ledger.leaf_split.array_brackets,
    6804635
  );
});

test("gate 2 — anti-oracle: the quarantined values are ABSENT from the generator source", () => {
  const src = readFileSync(GEN_SRC, "utf8");
  for (const forbidden of ["7267676", "7,267,676"]) {
    assert.ok(!src.includes(forbidden), `generator must not contain the quarantined ${forbidden}`);
  }
  // the derived maximum itself must not be hard-coded in the generator — it must be computed
  for (const derived of ["6809136", "6,809,136"]) {
    assert.ok(!src.includes(derived), `generator must DERIVE the maximum, not assert ${derived}`);
  }
});

test("gate 4 — determinism: two runs are byte-identical", () => {
  const a = canonicalJson(buildMaximalScopeManifest());
  const b = canonicalJson(buildMaximalScopeManifest());
  assert.equal(a, b);
  assert.equal(
    generateScopeManifestMaximum().encoderTotal,
    generateScopeManifestMaximum().encoderTotal
  );
});

test("gate 4 — liveness: a valid one-byte-shorter epoch_sequence reduces the total by exactly one", () => {
  const max20 = generateScopeManifestMaximum().encoderTotal; // epoch_sequence = 20-digit u64 max
  const nineteen = "1844674407370955161"; // valid canonical decimal, 19 digits, < 2^64-1
  assert.equal(nineteen.length, 19);
  const m19 = buildMaximalScopeManifest({ epochSequence: nineteen });
  assert.doesNotThrow(
    () => checkScopeManifestShape(m19),
    "the 19-digit variant is still schema-valid"
  );
  const total19 = Buffer.byteLength(canonicalJson(m19), "utf8");
  assert.equal(max20 - total19, 1, "one fewer epoch digit must remove exactly one manifest byte");
});

test("gate 4 — pin enforcement: a mutated pinned ID is a schema REJECTION, not a valid manifest", () => {
  const m = buildMaximalScopeManifest();
  m.profile_bundle.leaf_profile_id = "simurgh.vsc.hidden_leaf.v2"; // one-byte-changed pinned literal
  assert.throws(
    () => checkScopeManifestShape(m),
    /pinned_id_leaf_profile/,
    "a changed pinned ID must reject"
  );
});

test("dependency census — raw IDs are IN the canonical manifest; downstream carries the 32-byte digest", () => {
  const m = buildMaximalScopeManifest();
  const wire = canonicalJson(m);
  // (1) the raw pinned IDs affect the canonical scope manifest — each appears verbatim, and each is
  //     paired with a 64-hex digest field
  for (const [prefix, literal] of BUNDLE_PROFILES) {
    assert.ok(
      wire.includes(`"${prefix}_id":"${literal}"`),
      `${prefix}_id must appear raw in canonicalJson(manifest)`
    );
    assert.match(
      m.profile_bundle[`${prefix}_digest`],
      /^[0-9a-f]{64}$/,
      `${prefix}_digest is 64-hex`
    );
  }
  // (2) downstream digest fields carry the FIXED 32-byte digest (64 hex), never a re-serialised ID —
  //     so the profile-bundle preimage may change while no downstream canonical size does
  for (const k of [
    "epoch_digest",
    "merkle_root",
    "scope_vector_digest",
    "producer_authority_digest",
    "stage5o_precommitment_digest",
  ]) {
    assert.match(m[k], /^[0-9a-f]{64}$/);
    for (const [, literal] of BUNDLE_PROFILES)
      assert.ok(!m[k].includes(literal), `${k} must not re-serialise a bundle ID`);
  }
  for (const pk of Object.keys(m.policy_bindings))
    assert.match(m.policy_bindings[pk], /^[0-9a-f]{64}$/);
});
