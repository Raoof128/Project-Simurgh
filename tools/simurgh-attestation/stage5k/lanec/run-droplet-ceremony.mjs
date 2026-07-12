// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — Lane C independent-party ceremony runner. Rebuilds the deterministic VUC ceremony over the
// committed 5I principals (fresh campaign_nonce → fresh commitment/ceremony/records; VUC builds on the
// committed 5I panel, so reviewer principals are NOT substituted — independence is at the verifier +
// anchor), writes the pack + ceremony-result + ANCHOR_ME.txt (= universe_commitment_digest) for the
// party to (a) verify byte-identically and (b) optionally anchor with cosign/OTS.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildSignedVucBundle } from "../node/buildSignedBundle.mjs";
import { verifyVuc, makeAdapterFacts } from "../node/adapter.mjs";
import { canonicalJson } from "../core/digests.mjs";

export function runDropletCeremony(outDir, { campaign_nonce = "vuc-lanec-droplet" } = {}) {
  const { bundle, cfg } = buildSignedVucBundle(undefined, { campaign_nonce });
  const facts = makeAdapterFacts(bundle, cfg);
  const pub = verifyVuc(bundle, cfg, { tier: "public" }).raw;
  const aud = verifyVuc(bundle, cfg, { tier: "audit" }).raw;
  const subject = bundle.universe_commitment.universe_commitment_digest;
  const result = {
    public_raw: pub,
    audit_raw: aud,
    universe_commitment_digest: subject,
    leaf_count: bundle.universe_commitment.leaf_count,
    ordering_state: facts.orderingState,
    independence_rung: "distinct_key_only",
    note:
      "Independent-party VUC universe-commitment ceremony. Deterministic rebuild is byte-identical; " +
      "verify raw 0 under the repo verifier. For a public witness, stamp ANCHOR_ME.txt with OpenTimestamps; " +
      "for externally_anchored, cosign sign-blob ANCHOR_ME.txt with real OIDC. Send back bundle.json, " +
      "external-config.json, ceremony-result.json (and witness-proof.* if anchored). NEVER any *.pem.",
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "bundle.json"), canonicalJson(bundle) + "\n");
  writeFileSync(join(outDir, "external-config.json"), canonicalJson(cfg) + "\n");
  writeFileSync(join(outDir, "ceremony-result.json"), canonicalJson(result) + "\n");
  writeFileSync(join(outDir, "ANCHOR_ME.txt"), subject + "\n");
  return { outDir, result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2] || join(process.cwd(), "output");
  const { result } = runDropletCeremony(out);
  console.log(
    `VUC Lane C ceremony: public=${result.public_raw} audit=${result.audit_raw} ` +
      `leaves=${result.leaf_count} commitment=${result.universe_commitment_digest.slice(0, 20)}… ` +
      `rung=${result.independence_rung}`
  );
  console.log(
    `Wrote ${out}/{bundle.json,external-config.json,ceremony-result.json,ANCHOR_ME.txt}.`
  );
}
