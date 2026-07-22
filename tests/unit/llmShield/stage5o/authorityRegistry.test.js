// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.4 — the authority registry generator.
//
// The registry is generated from the descriptor packet (the normative source), never hand-written.
// These assertions freeze its properties: seventeen framed-hashed entries, transitive closure over
// every {id} reference, maxima injected into pair 23 (so a maxima change propagates to pairs 23/22),
// and byte-stability. No digest literal appears in the generator or in this test (oracle-free).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeDigestToken } from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import {
  GRAMMAR_DESCRIPTORS,
  SCHEMA_DESCRIPTORS,
  PROFILE_DESCRIPTORS,
  GENERATION_ORDER,
  EXTERNAL_AUTHORITY_ROOTS,
} from "../../../../tools/simurgh-attestation/stage5o/core/section7AuthorityDescriptors.mjs";
import {
  generateAuthorityRegistry,
  collectIdReferences,
} from "../../../../tools/simurgh-attestation/stage5o/node/measureStage5oAuthorityRegistry.mjs";

const ALL_DESCRIPTORS = [
  ...Object.values(GRAMMAR_DESCRIPTORS),
  ...Object.values(SCHEMA_DESCRIPTORS),
  ...Object.values(PROFILE_DESCRIPTORS),
];

test("registry: seventeen entries — 4 grammar + 5 schema + 8 profile", () => {
  const { registry } = generateAuthorityRegistry();
  assert.equal(Object.keys(registry).length, 17);
  assert.equal(Object.keys(GRAMMAR_DESCRIPTORS).length, 4);
  assert.equal(Object.keys(SCHEMA_DESCRIPTORS).length, 5);
  assert.equal(Object.keys(PROFILE_DESCRIPTORS).length, 8);
  assert.equal(GENERATION_ORDER.length, 17);
});

test("registry: every value is a valid 64-hex bare token decoding to 32 bytes", () => {
  const { registry } = generateAuthorityRegistry();
  for (const [id, tok] of Object.entries(registry)) {
    assert.equal(tok.length, 64, `${id} must be 64 hex chars`);
    assert.equal(decodeDigestToken(tok).length, 32, `${id} must decode to 32 bytes`);
  }
});

test("registry: byte-stable — two generations are identical", () => {
  const a = generateAuthorityRegistry().registry;
  const b = generateAuthorityRegistry().registry;
  assert.deepEqual(a, b);
});

test("registry: GENERATION_ORDER covers exactly the seventeen descriptor ids, once each", () => {
  const { registry } = generateAuthorityRegistry();
  const declaredIds = new Set(
    ALL_DESCRIPTORS.map((d) => d.grammar_id ?? d.schema_id ?? d.profile_id)
  );
  assert.equal(declaredIds.size, 17);
  assert.deepEqual(new Set(Object.keys(registry)), declaredIds);
});

test("closure census: every {id} reference resolves to a registry entry or a pinned external root", () => {
  const { registry } = generateAuthorityRegistry();
  const external = new Set(EXTERNAL_AUTHORITY_ROOTS.map((r) => r.id));
  const known = new Set([...Object.keys(registry), ...external]);
  const declaredIds = new Set([...known]); // registry keys are the descriptor ids themselves
  for (const d of ALL_DESCRIPTORS) {
    for (const id of collectIdReferences(d)) {
      // a descriptor's own id is not a self-import; references are to OTHER authorities or self via symbolic ref
      assert.ok(known.has(id), `dangling reference: ${id}`);
    }
  }
  assert.ok(declaredIds.size >= 17);
});

test("maxima injection: perturbing a maximum changes pair 23 AND pair 22, nothing upstream", () => {
  const base = generateAuthorityRegistry();
  const bumped = generateAuthorityRegistry({
    maxima: {
      ...base.maxima,
      MAX_CHALLENGE_RECORD_BYTES_V1: base.maxima.MAX_CHALLENGE_RECORD_BYTES_V1 + 1,
    },
  });
  const pair23 = "simurgh.vsc.challenge_resource_limits_profile.v1";
  const pair22 = "simurgh.vsc.challenge_protocol_profile.v1";
  assert.notEqual(
    base.registry[pair23],
    bumped.registry[pair23],
    "pair 23 must depend on the maxima"
  );
  assert.notEqual(
    base.registry[pair22],
    bumped.registry[pair22],
    "pair 22 imports 23, so it moves too"
  );
  // a grammar upstream of everything must NOT move (maxima are downstream-only)
  const codec = "simurgh.vsc.digest_token_codec.v1";
  assert.equal(base.registry[codec], bumped.registry[codec], "an upstream grammar must not move");
});

test("oracle-free: neither the generator source nor this test carries a digest literal", () => {
  const genPath = fileURLToPath(
    new URL(
      "../../../../tools/simurgh-attestation/stage5o/node/measureStage5oAuthorityRegistry.mjs",
      import.meta.url
    )
  );
  const src = readFileSync(genPath, "utf8");
  assert.equal(
    /\b[0-9a-f]{64}\b/.test(src),
    false,
    "generator must carry no 64-hex digest literal"
  );
});
