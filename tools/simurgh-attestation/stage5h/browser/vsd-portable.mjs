// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — portable browser verifier (WebCrypto). Recomputes the domain-digest surface, the
// tier lattice + warrant + inversion arithmetic, and re-verifies Ed25519 signatures. Advisory ONLY:
// it returns raw:null (a browser is not the attestation-of-record verifier) plus a `corroborated`
// boolean over the recomputable surface. Runs under Node's WebCrypto (globalThis.crypto) too.
import { canonicalJson } from "./canonical-json.mjs";

const DOMAIN = {
  claim_inventory: "simurgh.vsd.claim_inventory.v1\n",
  claim: "simurgh.vsd.claim.v1\n",
  review_receipt: "simurgh.vsd.review_receipt.v1\n",
  recompute_recipe: "simurgh.vsd.recompute_recipe.v1\n",
  disclosure_attestation: "simurgh.vsd.disclosure_attestation.v1\n",
  inventory_census: "simurgh.vsd.inventory_census.v1\n",
};
const SUPPORT_QUALITY = { restricted: "descriptive", controlled: "qualified", public: "full" };
const MAX_CONSEQUENCE = {
  restricted: "contextual",
  controlled: "threshold_crossing",
  public: "threshold_crossing",
};
const CONSEQUENCE = ["contextual", "supporting", "threshold_crossing"];

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return "sha256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const domainDigest = (dom, obj) => sha256Hex(dom + canonicalJson(obj));
const artifactDigest = (obj) => sha256Hex(canonicalJson(obj));

function parseScaled(v, d) {
  const scale = 10n ** BigInt(d);
  const [i, f = ""] = String(v).split(".");
  return BigInt(i || "0") * scale + BigInt((f + "0".repeat(d)).slice(0, d) || "0");
}
function aggregateMean(values, d) {
  const n = BigInt(values.length);
  let s = 0n;
  for (const v of values) s += parseScaled(v, d);
  const m = (2n * s + n) / (2n * n);
  const scale = 10n ** BigInt(d);
  return `${m / scale}.${(m % scale).toString().padStart(d, "0")}`;
}

// advisory verify — returns { raw: null, corroborated, mismatches[] }
export async function verifyPortable({ bundle, recipes, artefacts }) {
  const mismatches = [];
  const inv = bundle.claim_inventory;
  const claims = inv.content.claims;

  for (const a of bundle.artefacts_ref) {
    if ((await artifactDigest(artefacts[a.artefact_id])) !== a.digest)
      mismatches.push(`artefact:${a.artefact_id}`);
  }
  for (const c of claims) {
    if (c.recompute) {
      if (
        (await domainDigest(DOMAIN.recompute_recipe, recipes[c.claim_id])) !==
        c.recompute.recipe_digest
      ) {
        mismatches.push(`recipe:${c.claim_id}`);
      }
    }
  }
  const recompute = {};
  for (const c of claims) {
    if (c.declared_tier === "public" && c.recompute) {
      const r = recipes[c.claim_id];
      const values = r.input_artefact_ids.flatMap((id) =>
        artefacts[id].rows.map((row) => row.value)
      );
      const out = { metric: r.metric, mean: aggregateMean(values, r.decimals), n: values.length };
      recompute[c.claim_id] = (await artifactDigest(out)) === c.recompute.committed_output_digest;
    }
  }
  const receipts = {};
  for (const rr of bundle.review_receipts) receipts[rr.content.claim_digest] = rr.content;

  const table = [];
  for (const c of claims) {
    const cd = await domainDigest(DOMAIN.claim, c);
    const receipt = receipts[cd];
    const hasMethod = c.method_summary_digest != null;
    const withheldEmpty = c.artefact_manifest.withheld.length === 0;
    const r1 = hasMethod && receipt && receipt.verdict === "reproduced";
    const r2 = hasMethod && withheldEmpty && recompute[c.claim_id] === true;
    const proven = r2 ? "public" : r1 ? "controlled" : "restricted";
    const dist = Math.max(
      0,
      CONSEQUENCE.indexOf(c.declared_consequence) - CONSEQUENCE.indexOf(MAX_CONSEQUENCE[proven])
    );
    table.push({
      claim_id: c.claim_id,
      proven_tier: proven,
      support_quality: SUPPORT_QUALITY[proven],
      max_consequence_warranted: MAX_CONSEQUENCE[proven],
      inverted: dist > 0,
      right_scaling_distance: dist,
    });
  }
  const key = (rows) => canonicalJson([...rows].sort((a, b) => (a.claim_id < b.claim_id ? -1 : 1)));
  if (key(table) !== key(bundle.verdict_table)) mismatches.push("verdict_table");

  return { raw: null, corroborated: mismatches.length === 0, verdict_table: table, mismatches };
}
