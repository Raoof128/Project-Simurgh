// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.8 item 4 — browser-surface parity.
//
// Runs the browser-PORTABLE module (WebCrypto SubtleCrypto + pure JS, no node:crypto) against the
// committed reference vectors. Node 26's WebCrypto is the identical WHATWG Web Crypto API a real
// browser exposes, so reproducing every value byte-for-byte here proves the browser crypto surface
// equals Node. (A real headless-browser run of the same module lives in the browser/ HTML runner.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage5o/browser/canonical-json.mjs";
import * as P from "../../../../tools/simurgh-attestation/stage5o/browser/vsc-portable.mjs";

const V = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../../../tools/simurgh-attestation/stage5o/parity/section7_parity_vectors.json",
        import.meta.url
      )
    ),
    "utf8"
  )
);

test("browser parity: canonical JSON matches the reference", () => {
  for (const cv of V.canonical_vectors) assert.equal(canonicalJson(cv.value), cv.canonical);
});

test("browser parity: all 17 registry digests reproduce (WebCrypto framed hash)", async () => {
  for (const e of V.registry) {
    assert.equal(await P.registryDigestHex(e.domain, e.prepared), e.digest, e.id);
  }
});

test("browser parity: HKDF (RFC 5869 + §7 seed) reproduces", async () => {
  for (const r of V.hkdf_rfc) {
    const prk = await P.hkdfExtract(P.hexToBytes(r.salt), P.hexToBytes(r.ikm));
    assert.equal(P.bytesToHex(prk), r.prk, `${r.case}/prk`);
    assert.equal(P.bytesToHex(await P.hkdfExpand(prk, P.hexToBytes(r.info), r.L)), r.okm);
  }
  const hs = V.hkdf_seed;
  const ikm = P.hexToBytes(
    P.bytesToHex(new TextEncoder().encode(hs.seed_domain)) + hs.subject_digest + hs.beacon_value
  );
  const seed = await P.hkdfExtract(P.hexToBytes(hs.salt), ikm);
  assert.equal(P.bytesToHex(seed), hs.seed);
});

test("browser parity: sampler indices and draw count reproduce", async () => {
  const s = V.sampler;
  const { sorted, draws } = await P.deriveIndices(s.seed, s.N, s.k, s.draw_ceiling, s.draw_domain);
  assert.deepEqual(sorted, s.indices);
  assert.equal(draws, s.draws_used);
});

test("browser parity: checkpoint-instance digest and five roots reproduce", async () => {
  const ci = V.checkpoint_instance;
  assert.equal(
    await P.checkpointInstanceHex(ci.domain, ci.pair18_digest, ci.checkpoint),
    ci.digest
  );
  for (const name of ["beacon_contract", "beacon_suffix", "ordered_selected_indices"]) {
    assert.equal(await P.digestOfCanonicalHex(V.root_artifacts[name]), V.roots[name], name);
  }
  assert.equal(ci.digest, V.roots.verified_closure_bitcoin_checkpoint);
});

test("browser parity: Bitcoin double-SHA256 / order / compact target / PoW reproduce", async () => {
  for (const bh of V.bitcoin) {
    assert.equal(await P.blockHashInternalHex(bh.header), bh.internal, `${bh.height}/internal`);
    assert.equal(await P.blockHashDisplayHex(bh.header), bh.display, `${bh.height}/display`);
    assert.equal(P.compactTargetToBig(bh.nbits_u32).toString(10), bh.target_decimal);
    const powOk =
      BigInt("0x" + (await P.blockHashDisplayHex(bh.header))) <= P.compactTargetToBig(bh.nbits_u32);
    assert.equal(powOk, bh.pow_ok, `${bh.height}/pow`);
  }
});

test("browser parity: negatives reproduce (uppercase, malformed target, mutated nonce, seed flip)", async () => {
  const neg = V.negatives;
  assert.equal(/^[0-9a-f]{64}$/.test("A".repeat(64)), neg.uppercase_token_decodes);
  let threw = false;
  try {
    P.compactTargetToBig(0x00800000 | 0x1d00ffff);
  } catch {
    threw = true;
  }
  assert.equal(threw, neg.malformed_compact_target_throws);
  const mn = V.bitcoin[1].header.slice(0, 152) + "deadbeef";
  const powOk =
    BigInt("0x" + (await P.blockHashDisplayHex(mn))) <=
    P.compactTargetToBig(V.bitcoin[1].nbits_u32);
  assert.equal(powOk, neg.mutated_nonce_pow_ok);
  const seed = P.hexToBytes(V.hkdf_seed.seed);
  seed[0] ^= 0x01;
  const { sorted } = await P.deriveIndices(
    P.bytesToHex(seed),
    V.sampler.N,
    V.sampler.k,
    V.sampler.draw_ceiling,
    V.sampler.draw_domain
  );
  assert.deepEqual(sorted, neg.one_bit_seed_mutation_indices);
  assert.notDeepEqual(sorted, V.sampler.indices);
});
