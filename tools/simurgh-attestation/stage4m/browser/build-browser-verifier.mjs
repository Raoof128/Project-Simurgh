// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic single-file browser verifier build (spec §4.7). Concatenates the pure core
// modules + constants + the WebCrypto adapter into one <script>, strips their cross-file
// import/export lines (the only inter-module references), and wraps a drag-and-drop UI that
// renders the canonical verdict and the non-claims block verbatim. No network, no CDN, no
// framework. The emitted HTML's digest is committed to evidence (tamper-evident, 3W lineage).
import { readFileSync } from "node:fs";
import { VXD_NON_CLAIMS } from "../constants.mjs";

const ROOT = new URL("../", import.meta.url).pathname;

// Dependency order: constants first, then core leaf-to-root, then the adapter.
const SOURCES = [
  "constants.mjs",
  "core/canonical.mjs",
  "core/mergeLatticeCore.mjs",
  "core/retroScoreCore.mjs",
  "core/disclosureCore.mjs",
  "core/respondentCore.mjs",
  "core/verdictCore.mjs",
  "browser/browser-adapter.mjs",
];

// Strip ESM cross-file wiring: drop `import ... from "...";` blocks and the `export ` keyword.
function inlineSource(text) {
  const noImports = text.replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*$/gm, "");
  return noImports.replace(/^export\s+/gm, "");
}

export function buildBrowserVerifierHtml() {
  const embedded = SOURCES.map((rel) => inlineSource(readFileSync(`${ROOT}${rel}`, "utf8"))).join(
    "\n"
  );
  const nonClaims = JSON.stringify([...VXD_NON_CLAIMS], null, 2);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simurgh Stage 4M / VXD — offline verifier</title>
<style>
  body { font-family: ui-monospace, monospace; margin: 2rem; max-width: 60rem; }
  h1 { font-size: 1.1rem; }
  #drop { border: 2px dashed #888; padding: 2rem; text-align: center; border-radius: 8px; }
  textarea { width: 100%; height: 4rem; }
  pre { background: #f4f4f4; padding: 1rem; overflow: auto; border-radius: 6px; }
  .muted { color: #666; font-size: 0.85rem; }
</style>
</head>
<body>
<h1>Simurgh Stage 4M / VXD — offline verifier</h1>
<p class="muted">Drag a bundle's JSON files onto the box, paste the pinned signer key, and click
verify. Everything recomputes locally: no network, no upload. AnthropicSafe First, then
ReviewerSafe.</p>
<div id="drop">Drop bundle .json files here</div>
<p><label>Pinned signer key (SPKI base64, from vxd-signer.pub):<br />
<textarea id="pinned" placeholder="MCowBQYDK2Vw..."></textarea></label></p>
<p>Tier: <select id="tier"><option value="a">A (auditor, full ledgers)</option>
<option value="p">P (public, aggregates only)</option></select>
<button id="verify">Verify</button></p>
<h2>Verdict</h2>
<pre id="verdict">(none yet)</pre>
<h2>Signed non-claims</h2>
<pre id="nonclaims">${nonClaims.replace(/</g, "&lt;")}</pre>
<script type="module">
${embedded}

const files = {};
const NAME_TO_KEY = {
  "windows.json": ["windows", true],
  "merge-events.json": ["mergeEvents", true],
  "rescore-records.json": ["rescoreRecords", true],
  "disclosure.json": ["disclosure", false],
  "chain.json": ["chain", false],
  "contest.json": ["contests", "maybeArray"],
  "contest-ack.json": ["acks", "maybeArray"],
  "vxd-attestation.json": ["attestation", false],
  "vxd-manifest.json": ["manifest", false],
};
const drop = document.getElementById("drop");
drop.addEventListener("dragover", (e) => e.preventDefault());
drop.addEventListener("drop", async (e) => {
  e.preventDefault();
  for (const f of e.dataTransfer.files) files[f.name] = JSON.parse(await f.text());
  drop.textContent = Object.keys(files).sort().join(", ") || "Drop bundle .json files here";
});

function spkiB64FromPem(pem) {
  return pem.replace(/-----[^-]+-----/g, "").replace(/\\s+/g, "");
}

async function nodelessManifestCheck(bundle, pinnedSpkiB64) {
  if (!bundle.manifest || !bundle.attestation) return { ok: false, reason: "manifest_absent" };
  const digest = recordDigest(bundle.attestation);
  if (bundle.manifest.attestation_digest !== digest)
    return { ok: false, reason: "attestation_digest_mismatch" };
  const sig = bundle.manifest.signature;
  if (typeof sig !== "string" || !sig.startsWith("ed25519:"))
    return { ok: false, reason: "signature_malformed" };
  // domain-separated payload identical to node buildVxdManifest.
  const payload = { schema: bundle.manifest.schema, attestation_digest: bundle.manifest.attestation_digest };
  const message = "SIMURGH_STAGE4M_VXD_MANIFEST_V1\\u0000" + canonicalJson(payload);
  const ok = await webcryptoVerifyEd25519({
    publicKeySpkiB64: pinnedSpkiB64,
    message,
    signatureB64: sig.slice("ed25519:".length),
  });
  return ok ? { ok: true } : { ok: false, reason: "signature_invalid" };
}

document.getElementById("verify").addEventListener("click", async () => {
  const bundle = { windows: [], mergeEvents: [], rescoreRecords: [], disclosure: null,
    chain: null, contests: [], acks: [], attestation: null, manifest: null, present: new Set() };
  for (const [name, val] of Object.entries(files)) {
    const map = NAME_TO_KEY[name];
    if (!map) continue;
    const [key, mode] = map;
    bundle.present.add(name);
    bundle[key] = mode === "maybeArray" ? (Array.isArray(val) ? val : [val]) : val;
  }
  const pinnedSpkiB64 = spkiB64FromPem(document.getElementById("pinned").value.trim());
  const manifestCheck = await nodelessManifestCheck(bundle, pinnedSpkiB64);
  const ackKey = bundle.acks[0]?.respondent_public_key?.slice("ed25519:".length);
  const verdict = await verifyBundleCore({
    bundle, tier: document.getElementById("tier").value,
    verifySig: webcryptoVerifyEd25519, providerPublicKeySpkiB64: ackKey, manifestCheck,
  });
  document.getElementById("verdict").textContent = canonicalJson(verdict);
});
</script>
</body>
</html>
`;
}
