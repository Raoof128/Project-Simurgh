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

test("browser parity: §8 crypto reproduces (case / leaf / case-link / Merkle / disclosure policy)", async () => {
  const s8 = V.section8;
  const d = s8.domains;
  const cb = P.hexToBytes(s8.case.case_bytes_hex);
  assert.equal(await P.caseDigestHex(d.case_domain, cb), s8.case.case_digest);
  const cdBytes = P.hexToBytes(s8.case.case_digest);
  assert.equal(
    await P.leafIdHex(
      d.leaf_domain,
      P.hexToBytes(s8.leaf.epoch),
      s8.leaf.index,
      P.hexToBytes(s8.leaf.salt),
      cdBytes
    ),
    s8.leaf.leaf_id
  );
  assert.equal(
    await P.caseLinkHex(
      d.execution_case_link_domain,
      cdBytes,
      P.hexToBytes(s8.case_link.execution_record_digest)
    ),
    s8.case_link.commitment
  );
  assert.equal(await P.mthHex(s8.merkle.leaves), s8.merkle.root);
  assert.equal(
    await P.verifyInclusionHex(s8.merkle.leaves[s8.merkle.index], s8.merkle.path, s8.merkle.root),
    true
  );
  assert.equal(
    await P.disclosurePolicyDigestHex(d.disclosure_policy_domain, s8.disclosure_policy.policy),
    s8.disclosure_policy.digest
  );
});

test("browser parity: §9 EXACT RATIONAL ARITHMETIC reproduces (form, terms, value, floor, policy)", async () => {
  const s9 = V.section9;
  for (const c of s9.detect) {
    const N = BigInt(c.N);
    const J = BigInt(c.J);
    const k = BigInt(c.k);
    const r = P.pDetectPortable(N, J, k);
    const tag = `N=${c.N} J=${c.J} k=${c.k}`;
    assert.equal(r.form, c.form, `${tag}/form`);
    assert.equal(r.terms, c.terms, `${tag}/terms`);
    assert.deepEqual(P.ratFormat(r.value), c.p_detect, `${tag}/value`);
    const active = P.pairRatioActivePortable(N, k);
    assert.equal(active, c.pair_ratio_active, `${tag}/active`);
    if (active) assert.deepEqual(P.ratFormat(P.pPairPortable(N, k)), c.p_pair, `${tag}/pair`);
    // the two identities must agree in the browser surface too
    if (N - J >= k) {
      assert.deepEqual(
        P.productQkPortable(N, J, k),
        P.productQJPortable(N, J, k),
        `${tag}/identity`
      );
    }
  }
  for (const c of s9.j_star) {
    const f = { n: BigInt(c.f.numerator), d: BigInt(c.f.denominator) };
    assert.equal(P.jStarPortable(f, BigInt(c.N)).toString(10), c.j_star, `j*/N=${c.N}`);
  }
  const fl = s9.floor;
  const pn = BigInt(fl.p_detect.numerator);
  const pd = BigInt(fl.p_detect.denominator);
  assert.equal(
    pn * BigInt(fl.p_min_equal.denominator) >= BigInt(fl.p_min_equal.numerator) * pd,
    true
  );
  assert.equal(
    pn * BigInt(fl.p_min_above.denominator) >= BigInt(fl.p_min_above.numerator) * pd,
    false
  );
  assert.equal(
    await P.probabilityPolicyDigestHex(s9.policy_domain, s9.policy_digest.policy),
    s9.policy_digest.digest
  );
});
