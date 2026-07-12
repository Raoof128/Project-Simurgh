// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane C: attach a Sigstore keyless anchor to a ceremony pack (externally_anchored rung).
// After the operator runs `cosign sign-blob` over ANCHOR_ME.txt (the pack's contest_layer_root) with
// their real OIDC identity, this embeds the anchor evidence into external-config.json, bound to THIS
// pack. It does NOT verify the Sigstore cert/Rekor entry — that is `cosign verify-blob` (online), whose
// result our side injects as anchorVerified. Usage:
//   node attach-anchor.mjs <packDir> <sigstore-bundle.json> <oidc-identity-email>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, artifactDigest } from "../core/digests.mjs";
import { contestLayerRoot } from "../core/roots.mjs";
import { anchorBindingValid } from "../core/independence.mjs";

export function attachAnchor(packDir, sigstoreBundlePath, identity) {
  const bundle = JSON.parse(readFileSync(join(packDir, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(packDir, "external-config.json"), "utf8"));
  const sigstore = readFileSync(sigstoreBundlePath, "utf8");

  cfg.anchor_evidence = {
    kind: "sigstore-keyless",
    identity,
    anchored_digest: contestLayerRoot(bundle),
    bundle_digest: artifactDigest(sigstore),
  };
  const check = anchorBindingValid(bundle, cfg);
  if (!check.ok) throw new Error(`anchor binding invalid: ${check.reason}`);

  writeFileSync(join(packDir, "external-config.json"), canonicalJson(cfg) + "\n");
  writeFileSync(join(packDir, "sigstore-bundle.json"), sigstore);
  return { anchored_digest: cfg.anchor_evidence.anchored_digest, identity };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [packDir, sigstorePath, identity] = process.argv.slice(2);
  if (!packDir || !sigstorePath || !identity) {
    console.error(
      "usage: node attach-anchor.mjs <packDir> <sigstore-bundle.json> <oidc-identity-email>"
    );
    process.exit(2);
  }
  const { anchored_digest, identity: id } = attachAnchor(packDir, sigstorePath, identity);
  console.log(`Anchor attached: identity=${id} anchored_digest=${anchored_digest}`);
  console.log(
    `Also send back: sigstore-bundle.json (the cosign bundle). We run 'cosign verify-blob' to reach externally_anchored.`
  );
}
