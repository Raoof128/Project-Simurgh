// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.8 item 4 — emit a SELF-CONTAINED browser parity page.
//
// Inlines the portable canonical-json + vsc-portable module sources (import/export stripped) and the
// committed reference vectors into one HTML file with a runner that writes RESULT:PASS / RESULT:FAIL
// into #result. A real headless browser loads it under a no-egress CSP (no network, no external
// module) and its WebCrypto reproduces every value. Run: node emit-parity-html.mjs > parity.html
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const strip = (src) =>
  src
    .replace(/^\s*import\b.*$/gm, "")
    .replace(/^\s*export\s+/gm, "")
    .replace(/\bexport\s*\{[^}]*\}\s*;?/g, "");

const canonical = strip(readFileSync(here("./canonical-json.mjs"), "utf8"));
const portable = strip(readFileSync(here("./vsc-portable.mjs"), "utf8"));
const vectors = readFileSync(here("../parity/section7_parity_vectors.json"), "utf8");

const runner = `
async function run() {
  const V = VECTORS;
  const fails = [];
  const eq = (n, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) fails.push(n + ": " + a + " != " + b); };
  for (const cv of V.canonical_vectors) eq("canonical", canonicalJson(cv.value), cv.canonical);
  for (const e of V.registry) eq("registry/" + e.id, await registryDigestHex(e.domain, e.prepared), e.digest);
  for (const r of V.hkdf_rfc) {
    const prk = await hkdfExtract(hexToBytes(r.salt), hexToBytes(r.ikm));
    eq("hkdf/prk", bytesToHex(prk), r.prk);
    eq("hkdf/okm", bytesToHex(await hkdfExpand(prk, hexToBytes(r.info), r.L)), r.okm);
  }
  const hs = V.hkdf_seed;
  const dom = new TextEncoder().encode(hs.seed_domain);
  const ikm = new Uint8Array([...dom, ...hexToBytes(hs.subject_digest), ...hexToBytes(hs.beacon_value)]);
  eq("seed", bytesToHex(await hkdfExtract(hexToBytes(hs.salt), ikm)), hs.seed);
  const s = V.sampler;
  const samp = await deriveIndices(s.seed, s.N, s.k, s.draw_ceiling, s.draw_domain);
  eq("sampler/indices", samp.sorted, s.indices);
  eq("sampler/draws", samp.draws, s.draws_used);
  const ci = V.checkpoint_instance;
  eq("checkpoint", await checkpointInstanceHex(ci.domain, ci.pair18_digest, ci.checkpoint), ci.digest);
  for (const name of ["beacon_contract","beacon_suffix","ordered_selected_indices"])
    eq("root/" + name, await digestOfCanonicalHex(V.root_artifacts[name]), V.roots[name]);
  for (const bh of V.bitcoin) {
    eq("btc/internal", await blockHashInternalHex(bh.header), bh.internal);
    eq("btc/display", await blockHashDisplayHex(bh.header), bh.display);
    eq("btc/target", compactTargetToBig(bh.nbits_u32).toString(10), bh.target_decimal);
  }
  const s8 = V.section8, d8 = s8.domains;
  const cb = hexToBytes(s8.case.case_bytes_hex);
  eq("s8/case", await caseDigestHex(d8.case_domain, cb), s8.case.case_digest);
  const cd8 = hexToBytes(s8.case.case_digest);
  eq("s8/leaf", await leafIdHex(d8.leaf_domain, hexToBytes(s8.leaf.epoch), s8.leaf.index, hexToBytes(s8.leaf.salt), cd8), s8.leaf.leaf_id);
  eq("s8/link", await caseLinkHex(d8.execution_case_link_domain, cd8, hexToBytes(s8.case_link.execution_record_digest)), s8.case_link.commitment);
  eq("s8/merkle", await mthHex(s8.merkle.leaves), s8.merkle.root);
  eq("s8/inclusion", await verifyInclusionHex(s8.merkle.leaves[s8.merkle.index], s8.merkle.path, s8.merkle.root), true);
  eq("s8/policy", await disclosurePolicyDigestHex(d8.disclosure_policy_domain, s8.disclosure_policy.policy), s8.disclosure_policy.digest);
  const s9 = V.section9;
  for (const c of s9.detect) {
    const N = BigInt(c.N), J = BigInt(c.J), kk = BigInt(c.k);
    const r = pDetectPortable(N, J, kk);
    const tag = "s9/N=" + c.N + ",J=" + c.J + ",k=" + c.k;
    eq(tag + "/form", r.form, c.form);
    eq(tag + "/terms", r.terms, c.terms);
    eq(tag + "/value", ratFormat(r.value), c.p_detect);
    const active = pairRatioActivePortable(N, kk);
    eq(tag + "/pair_active", active, c.pair_ratio_active);
    if (active) eq(tag + "/pair", ratFormat(pPairPortable(N, kk)), c.p_pair);
  }
  for (const c of s9.j_star) {
    const f = { n: BigInt(c.f.numerator), d: BigInt(c.f.denominator) };
    eq("s9/j_star/N=" + c.N, jStarPortable(f, BigInt(c.N)).toString(10), c.j_star);
  }
  const fl = s9.floor;
  const pn = BigInt(fl.p_detect.numerator), pd = BigInt(fl.p_detect.denominator);
  const en = BigInt(fl.p_min_equal.numerator), ed = BigInt(fl.p_min_equal.denominator);
  const an = BigInt(fl.p_min_above.numerator), ad = BigInt(fl.p_min_above.denominator);
  eq("s9/floor/equality_accepts", pn * ed >= en * pd, true);
  eq("s9/floor/above_rejects", pn * ad >= an * pd, false);
  eq("s9/policy_digest", await probabilityPolicyDigestHex(s9.policy_domain, s9.policy_digest.policy), s9.policy_digest.digest);
  document.getElementById("result").textContent =
    fails.length ? "RESULT:FAIL " + fails.join("; ") : "RESULT:PASS §7 (registry+hkdf+sampler+bitcoin) + §8 (case+leaf+link+merkle+policy) + §9 (exact rational arithmetic+floor+policy)";
}
run().catch(e => { document.getElementById("result").textContent = "RESULT:FAIL " + e.message; });
`;

const html = `<!doctype html>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<title>Stage 5O §7 browser parity</title>
<body>
<pre id="result">RESULT:PENDING</pre>
<script>
${canonical}
${portable}
const VECTORS = ${vectors};
${runner}
</script>
</body>`;

process.stdout.write(html);
