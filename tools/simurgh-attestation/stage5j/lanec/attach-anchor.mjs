// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane C: attach an anchor to a ceremony pack, bound to the pack's contest_layer_root.
// Two modes:
//   IDENTITY (externally_anchored rung): --identity <oidc-email> --sigstore <cosign-bundle.json>
//   DE-IDENTIFIED public witness (no identity revealed): --witness <opentimestamps|rekor> --proof <file>
// Neither verifies the proof itself (that is our online `ots verify` / `cosign verify-blob` / rekor
// inclusion check, injected as witnessVerified/anchorVerified). Usage:
//   node attach-anchor.mjs <packDir> --witness opentimestamps --proof ANCHOR_ME.txt.ots
//   node attach-anchor.mjs <packDir> --identity you@org.org --sigstore sigstore-bundle.json
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, artifactDigest } from "../core/digests.mjs";
import { contestLayerRoot } from "../core/roots.mjs";
import { anchorBindingValid, publicWitnessBindingValid } from "../core/independence.mjs";

export function attachAnchor(packDir, opts) {
  const bundle = JSON.parse(readFileSync(join(packDir, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(packDir, "external-config.json"), "utf8"));
  const anchored_digest = contestLayerRoot(bundle);

  if (opts.mode === "identity") {
    const sigstore = readFileSync(opts.sigstore, "utf8");
    cfg.anchor_evidence = {
      kind: "sigstore-keyless",
      identity: opts.identity,
      anchored_digest,
      bundle_digest: artifactDigest(sigstore),
    };
    if (!anchorBindingValid(bundle, cfg).ok) throw new Error("anchor binding invalid");
    writeFileSync(join(packDir, "sigstore-bundle.json"), sigstore);
  } else {
    // de-identified public-transparency-log witness — NO identity field
    const proof = readFileSync(opts.proof); // binary (ots) or text (rekor) — hashed, not embedded
    cfg.anchor_evidence = {
      kind: "public-witness",
      log: opts.log,
      locator: artifactDigest(proof.toString("base64")),
      proof_filename: basename(opts.proof),
      anchored_digest,
    };
    if (!publicWitnessBindingValid(bundle, cfg).ok) throw new Error("witness binding invalid");
    writeFileSync(join(packDir, `witness-proof.${opts.log}`), proof);
  }
  writeFileSync(join(packDir, "external-config.json"), canonicalJson(cfg) + "\n");
  return { anchored_digest, kind: cfg.anchor_evidence.kind };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const packDir = a[0];
  const flag = (n) => (a.includes(n) ? a[a.indexOf(n) + 1] : undefined);
  const identity = flag("--identity");
  const opts = identity
    ? { mode: "identity", identity, sigstore: flag("--sigstore") }
    : { mode: "witness", log: flag("--witness"), proof: flag("--proof") };
  const bad = !packDir || (opts.mode === "identity" ? !opts.sigstore : !opts.log || !opts.proof);
  if (bad) {
    console.error(
      "usage:\n  attach-anchor.mjs <packDir> --witness <opentimestamps|rekor> --proof <file>   (de-identified)\n  attach-anchor.mjs <packDir> --identity <email> --sigstore <bundle.json>            (reveals identity)"
    );
    process.exit(2);
  }
  const { anchored_digest, kind } = attachAnchor(packDir, opts);
  console.log(`Anchor attached: kind=${kind} anchored_digest=${anchored_digest}`);
  console.log(
    kind === "public-witness"
      ? "Send back the FOUR files incl. witness-proof.* — NO identity is included. We run the public-log check to record public_witness."
      : "Send back the FOUR files incl. sigstore-bundle.json. We run cosign verify-blob to reach externally_anchored."
  );
}
