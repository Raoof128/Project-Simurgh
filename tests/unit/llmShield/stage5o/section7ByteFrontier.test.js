// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.7 — the byte-invalidation frontier and dependency census.
//
// Generating the registry digests and revising the §7.3.1 shapes changes BYTES (preimages,
// recomputed digests) but moves NO stored value: no concrete digest is stored (the verifier
// recomputes each), every digest stays fixed 32-byte -> 64-hex, and the four maxima are consumed
// only through pair 23, never serialised into an artifact. This census proves the frontier closed,
// and a tamper check proves each registry digest actually binds its descriptor's bytes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { encodeDigestToken } from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import {
  GRAMMAR_DESCRIPTORS,
  SCHEMA_DESCRIPTORS,
  GRAMMAR_DESCRIPTOR_DIGEST_DOMAIN,
} from "../../../../tools/simurgh-attestation/stage5o/core/section7AuthorityDescriptors.mjs";
import {
  generateAuthorityRegistry,
  framedDescriptorDigest,
} from "../../../../tools/simurgh-attestation/stage5o/node/measureStage5oAuthorityRegistry.mjs";

const coreDir = fileURLToPath(
  new URL("../../../../tools/simurgh-attestation/stage5o/core/", import.meta.url)
);

test("dependency census: no stage5o core module stores a 64-hex digest literal", () => {
  // The verifier recomputes every digest; a stored digest would be an unmaintained oracle.
  for (const f of readdirSync(coreDir).filter((n) => n.endsWith(".mjs"))) {
    const src = readFileSync(coreDir + f, "utf8");
    const hit = src.match(/\b[0-9a-f]{64}\b/);
    assert.equal(hit, null, `${f} carries a stored 64-hex digest literal: ${hit && hit[0]}`);
  }
});

test("width invariant: every registry digest is fixed 64-hex (32 bytes)", () => {
  const { registry } = generateAuthorityRegistry();
  for (const [id, tok] of Object.entries(registry)) {
    assert.match(tok, /^[0-9a-f]{64}$/, `${id} must be fixed 64-hex`);
  }
});

test("maxima are not serialised into any producer-artifact schema field", () => {
  // The four generated maxima live only in pair 23's limit table; an artifact schema that carried a
  // numeric max would double-own the ceiling. Every schema field is a typed string/array descriptor.
  for (const [name, d] of Object.entries(SCHEMA_DESCRIPTORS)) {
    for (const [field, spec] of Object.entries(d.fields)) {
      assert.ok(
        spec.type === "string" || spec.type === "array",
        `${name}.${field} must be a string/array field, not a numeric ceiling`
      );
    }
  }
});

test("byte-invalidation: flipping one descriptor byte changes its registry digest (tamper)", () => {
  const { registry } = generateAuthorityRegistry();
  const codec = GRAMMAR_DESCRIPTORS.digest_token_codec;
  const clean = encodeDigestToken(framedDescriptorDigest(GRAMMAR_DESCRIPTOR_DIGEST_DOMAIN, codec));
  assert.equal(
    clean,
    registry[codec.grammar_id],
    "premise: re-framing the clean descriptor matches"
  );

  const tampered = { ...codec, rule: { ...codec.rule, exact_chars: 63 } }; // 64 -> 63
  const tamperedDigest = encodeDigestToken(
    framedDescriptorDigest(GRAMMAR_DESCRIPTOR_DIGEST_DOMAIN, tampered)
  );
  assert.notEqual(tamperedDigest, clean, "a one-field tamper must change the framed digest");
});

test("byte-invalidation: the injected maxima are inside pair 23's hashed bytes", () => {
  // A registry generated with a perturbed maximum differs at pair 23 -> the maxima are hashed, not
  // appended after the fact. (The propagation to pair 22 is covered in authorityRegistry.test.js.)
  const base = generateAuthorityRegistry();
  const bumped = generateAuthorityRegistry({
    maxima: {
      ...base.maxima,
      MAX_CHALLENGE_PACKAGE_BYTES_V1: base.maxima.MAX_CHALLENGE_PACKAGE_BYTES_V1 + 1,
    },
  });
  const pair23 = "simurgh.vsc.challenge_resource_limits_profile.v1";
  assert.notEqual(base.registry[pair23], bumped.registry[pair23]);
});
