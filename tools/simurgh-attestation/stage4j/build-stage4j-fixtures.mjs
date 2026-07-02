// SPDX-License-Identifier: AGPL-3.0-or-later
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { canonicalJson, publicKeyFingerprint } from "../stage4d/stage4dCrypto.mjs";
import { certificateDigest } from "../stage4h/dfiCertificate.mjs";
import { PCTA_SCHEMA, buildPctaManifest, computeProofDigest } from "./authorizationProof.mjs";

const H = "tests/fixtures/llmShield/stage4h";
const OUT = "tests/fixtures/llmShield/stage4j";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

function signProof(payload, priv, pub) {
  return {
    payload,
    signature: `ed25519:${sign(null, Buffer.from(canonicalJson(payload), "utf8"), priv).toString("base64")}`,
    public_key_fingerprint: `sha256:${publicKeyFingerprint(pub.export({ type: "spki", format: "pem" }))}`,
  };
}

function main() {
  mkdirSync(`${OUT}/expected-results`, { recursive: true });
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  writeFileSync(`${OUT}/pcta-signer.pub`, publicKey.export({ type: "spki", format: "pem" }));

  const pack = readJson(`${H}/q0-clean-disconnected-untrusted-base-pack.json`);
  const cert = readJson(`${H}/q0-clean-disconnected-untrusted-dfi-certificate.json`);
  const manifest = readJson(`${H}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`);
  // authority-sink action from the cert's sink_safety_claims (act_001 in the clean fixture)
  const sinkNode = cert.derivation.sink_safety_claims[0].node; // "action:act_001"
  const actionId = sinkNode.replace(/^action:/, "");
  const receipt = pack.receipts.find(
    (r) => r.receipt_payload.action_id === actionId
  ).receipt_payload;
  const actionDigest = `sha256:${receipt.decision_input.resolved_args_digest}`;

  const base = {
    schema: PCTA_SCHEMA,
    tool: "send_email",
    action_class:
      receipt.consequence_class === "read_only" ? "external_egress" : receipt.consequence_class,
    authorized_action_digest: actionDigest,
    user_intent_digest: `sha256:${"1".repeat(64)}`,
    policy_digest: cert.policy_digest,
    authority_source: "user_confirmed",
    untrusted_context_reached_authority: false,
    dfi_certificate_digest: certificateDigest(cert),
    epoch: 1782892800,
    nonce: "nonce000",
    nonce_scope: "signed_pack",
    enforcement: {
      required: true,
      applied: true,
      applied_action_class:
        receipt.consequence_class === "read_only" ? "external_egress" : receipt.consequence_class,
      applied_action_digest: actionDigest,
    },
  };

  const runRoot = manifest.signed_pack_manifest_digest;
  const dfiDigest = certificateDigest(cert);
  const clean = signProof(base, privateKey, publicKey);
  const pctaManifest = buildPctaManifest({
    proof: clean,
    runRoot,
    dfiCertificateDigest: dfiDigest,
    privateKey,
  });

  const write = (name, obj) => writeFileSync(`${OUT}/${name}`, `${JSON.stringify(obj, null, 2)}\n`);
  write("clean-authorized.json", {
    proof: clean,
    pcta_manifest: pctaManifest,
    action_id: actionId,
  });

  // Negative fixtures (single-field deltas; the verifier test drives these). Digests recomputed here.
  write("missing-proof.json", { proof: null, pcta_manifest: pctaManifest, action_id: actionId });
  write("forged-sig.json", {
    proof: { ...clean, signature: `ed25519:${Buffer.from("x").toString("base64")}` },
    pcta_manifest: pctaManifest,
    action_id: actionId,
  });
  write("stale-proof.json", {
    proof: signProof({ ...base, epoch: 1 }, privateKey, publicKey),
    pcta_manifest: pctaManifest,
    action_id: actionId,
  });
  write("action-mismatch.json", {
    proof: signProof(
      {
        ...base,
        enforcement: { ...base.enforcement, applied_action_digest: `sha256:${"9".repeat(64)}` },
      },
      privateKey,
      publicKey
    ),
    pcta_manifest: pctaManifest,
    action_id: actionId,
  });
  write("enforcement-gap.json", {
    proof: signProof(
      { ...base, enforcement: { ...base.enforcement, applied: false } },
      privateKey,
      publicKey
    ),
    pcta_manifest: pctaManifest,
    action_id: actionId,
  });
  write("digest-mismatch.json", {
    proof: signProof({ ...base, policy_digest: `sha256:${"7".repeat(64)}` }, privateKey, publicKey),
    pcta_manifest: pctaManifest,
    action_id: actionId,
  });

  // dirty-cert-reverify: bind to the DIRTY cert whose act_001 sink is safe:false. The mandatory
  // 4H re-verify (P4-pre) catches this BEFORE PCTA's own P4 can read the claim — 4H `diagnose`
  // fails closed on any safe:false (explicit_flow_integrity_violation, raw 24). This is the
  // spec §0.3 "P4-pre surfaces the 4H band" containment: a genuinely dirty flow never reaches
  // PCTA's authority gate.
  const dCert = readJson(`${H}/q4-dirty-one-edge-delta-dfi-certificate.json`);
  const dManifest = readJson(`${H}/q4-dirty-one-edge-delta-signed-pack-manifest.json`);
  const dPack = readJson(`${H}/q4-dirty-one-edge-delta-base-pack.json`);
  const dActionId = dCert.derivation.sink_safety_claims
    .find((c) => c.safe === false)
    .node.replace(/^action:/, "");
  const dReceipt = dPack.receipts.find(
    (r) => r.receipt_payload.action_id === dActionId
  ).receipt_payload;
  const dDigest = `sha256:${dReceipt.decision_input.resolved_args_digest}`;
  const dBase = {
    ...base,
    dfi_certificate_digest: certificateDigest(dCert),
    policy_digest: dCert.policy_digest,
    authorized_action_digest: dDigest,
    enforcement: { ...base.enforcement, applied_action_digest: dDigest },
    untrusted_context_reached_authority: false,
  };
  const dProof = signProof(dBase, privateKey, publicKey);
  const dPctaManifest = buildPctaManifest({
    proof: dProof,
    runRoot: dManifest.signed_pack_manifest_digest,
    dfiCertificateDigest: certificateDigest(dCert),
    privateKey,
  });
  write("dirty-cert-reverify.json", {
    proof: dProof,
    pcta_manifest: dPctaManifest,
    action_id: dActionId,
    dfi: "q4-dirty-one-edge-delta",
  });

  // untrusted-authority: PCTA's OWN killer invariant (raw 34). Bind to the CLEAN cert (which
  // PASSES the 4H re-verify), but the proof sources authority from `untrusted_context`. This is
  // the case only PCTA catches — the re-verify is clean, yet authority is non-derivable.
  const uBase = { ...base, authority_source: "untrusted_context" };
  const uProof = signProof(uBase, privateKey, publicKey);
  const uPctaManifest = buildPctaManifest({
    proof: uProof,
    runRoot,
    dfiCertificateDigest: dfiDigest,
    privateKey,
  });
  write("untrusted-authority.json", {
    proof: uProof,
    pcta_manifest: uPctaManifest,
    action_id: actionId,
  });

  writeFileSync(
    `${OUT}/expected-results/pcta-matrix.json`,
    `${JSON.stringify(
      {
        "clean-authorized": { raw: 0, typed: 0 },
        "missing-proof": { raw: 31, typed: 1 },
        "forged-sig": { raw: 32, typed: 1 },
        "stale-proof": { raw: 33, typed: 1 },
        "dirty-cert-reverify": { raw: 24, typed: 1 },
        "untrusted-authority": { raw: 34, typed: 1 },
        "action-mismatch": { raw: 35, typed: 1 },
        "enforcement-gap": { raw: 36, typed: 1 },
        "digest-mismatch": { raw: 37, typed: 1 },
      },
      null,
      2
    )}\n`
  );
  console.log("stage4j fixtures written");
}

main();
