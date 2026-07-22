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
  document.getElementById("result").textContent =
    fails.length ? "RESULT:FAIL " + fails.join("; ") : "RESULT:PASS " + V.registry.length + " registry + hkdf + sampler + bitcoin";
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
