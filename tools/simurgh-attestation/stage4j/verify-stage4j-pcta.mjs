#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { publicKeyFingerprint } from "../stage4d/stage4dCrypto.mjs";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { certificateDigest, diagnose } from "../stage4h/dfiCertificate.mjs";
import { PCTA_RAW_CODES, RAW_VERIFIER_CODES, stage4CodeForRawCode } from "../stage4h/exitCodes.mjs";
import { runOffline, scanForModelClients } from "../stage4h/offlineHarness.mjs";
import { validateProofShape, verifyProofSignature } from "./authorizationProof.mjs";
import { resolveP4 } from "./authoritySource.mjs";

const HIGH_CONSEQUENCE = new Set(["external_egress", "irreversible_external_effect"]);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

function loadPinnedKeyset(pubkeyPath) {
  const pem = readFileSync(pubkeyPath, "utf8");
  const key = createPublicKey(pem);
  const fp = `sha256:${publicKeyFingerprint(pem)}`;
  return new Map([[fp, key]]);
}

// Locate the 4H substrate for a fixture's DFI binding. The stage4j-owned substrate resolves
// RELATIVE TO THE FIXTURE FILE so a temp-regenerated fixture set is self-contained (its
// proofs bind to its own freshly-built substrate, not the committed one).
function loadDfiSubstrate(fixture, fixtureDir) {
  const base =
    fixture.dfi === "q4-dirty-one-edge-delta"
      ? "tests/fixtures/llmShield/stage4h/q4-dirty-one-edge-delta"
      : fixture.dfi === "stage4j-underdeclared-egress"
        ? `${fixtureDir}/substrate/underdeclared-egress`
        : "tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted";
  return {
    pack: readJson(`${base}-base-pack.json`),
    sig: readFileSync(`${base}-base-pack.sig`, "utf8").trim(),
    signerPub: readFileSync(`${base}-signer.pub`, "utf8"),
    cert: readJson(`${base}-dfi-certificate.json`),
    manifest: readJson(`${base}-signed-pack-manifest.json`),
  };
}

export async function runPctaCore({ fixture, pinnedPubkeyPath, epochWindow = 315360000 } = {}) {
  const f = readJson(fixture);
  const substrate = loadDfiSubstrate(f, dirname(fixture));
  const pinned = loadPinnedKeyset(pinnedPubkeyPath);

  // P4-pre — mandatory 4H re-verify (signature-authentic ≠ verifier-passed).
  const packOk = verifyEvidencePack({
    pack: substrate.pack,
    signature: substrate.sig,
    publicKeyPem: substrate.signerPub,
  });
  if (!packOk.ok)
    return finish(fixture, RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH, "base_pack_verify_failed");
  const dfi = diagnose({
    pack: substrate.pack,
    certificate: substrate.cert,
    manifest: substrate.manifest,
  });
  if (!dfi.ok) {
    const raw = Number.isInteger(dfi.code)
      ? dfi.code
      : RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED;
    return finish(fixture, raw, `dfi_reverify_failed:${dfi.reason}`);
  }

  // P1 — proof present for the recorded-allowed action.
  const receipt = substrate.pack.receipts
    .map((r) => r.receipt_payload)
    .find((p) => p.action_id === f.action_id);
  if (!f.proof)
    return finish(
      fixture,
      PCTA_RAW_CODES.AUTHORIZATION_PROOF_MISSING,
      "authorization_proof_missing"
    );

  // P2 — shape + signature + pinned key.
  const shape = validateProofShape(f.proof);
  if (!shape.ok)
    return finish(fixture, PCTA_RAW_CODES.AUTHORIZATION_SIGNATURE_INVALID, shape.reason);
  const sig = verifyProofSignature(f.proof, pinned);
  if (!sig.ok) return finish(fixture, PCTA_RAW_CODES.AUTHORIZATION_SIGNATURE_INVALID, sig.reason);

  const p = f.proof.payload;

  // P3 — pack-local freshness: epoch window only. Nonce uniqueness is structural here (one
  // proof per fixture run); a multi-proof pack needs an explicit nonce-set check — deferred,
  // named in the threat model. The anchor is the pack-local epoch the fixtures commit to.
  const anchor = 1782892800;
  if (Math.abs(p.epoch - anchor) > epochWindow) {
    return finish(fixture, PCTA_RAW_CODES.AUTHORIZATION_PROOF_STALE, "authorization_proof_stale");
  }

  // P7 — policy/intent digest binding.
  if (p.policy_digest !== substrate.cert.policy_digest) {
    return finish(
      fixture,
      PCTA_RAW_CODES.PCTA_POLICY_OR_INTENT_DIGEST_MISMATCH,
      "pcta_policy_or_intent_digest_mismatch"
    );
  }
  if (p.dfi_certificate_digest !== certificateDigest(substrate.cert)) {
    return finish(
      fixture,
      PCTA_RAW_CODES.PCTA_POLICY_OR_INTENT_DIGEST_MISMATCH,
      "dfi_certificate_digest_mismatch"
    );
  }

  // P8 — authority-sink under-declaration cross-check. Runs BEFORE P4 by design: sink
  // membership in the cert's claims derives from the SAME authority_sink flag P8 reads
  // (canonicalPremises.mjs), so an under-declared high-consequence action has no claim and a
  // P4-first order would report the generic 34 — 38 is the correct root-cause diagnosis.
  // Receipt null-guard is load-bearing: a bogus/no-receipt action_id must SKIP P8 and fall
  // through to P4's missing-claim rejection (34), never crash.
  const material = substrate.pack.replay_material[f.action_id];
  const flaggedAuthority = material?.taint_derivation_inputs?.authority_sink === true;
  if (receipt && HIGH_CONSEQUENCE.has(receipt.consequence_class) && !flaggedAuthority) {
    return finish(
      fixture,
      PCTA_RAW_CODES.AUTHORITY_SINK_UNDERDECLARED,
      "authority_sink_underdeclared"
    );
  }

  // P4 — authority non-derivability, read from the RE-VERIFIED cert's authority-sink claim.
  const claim = substrate.cert.derivation.sink_safety_claims.find(
    (c) => c.node === `action:${f.action_id}`
  );
  const p4 = resolveP4({ authoritySource: p.authority_source, sinkSafetyClaim: claim });
  if (!p4.ok) return finish(fixture, PCTA_RAW_CODES.AUTHORITY_FROM_UNTRUSTED_CONTEXT, p4.reason);

  // P5 — applied == authorized == receipt.resolved_args_digest (4H digest space).
  const receiptDigest = `sha256:${receipt.decision_input.resolved_args_digest}`;
  if (
    p.enforcement.applied_action_digest !== p.authorized_action_digest ||
    p.authorized_action_digest !== receiptDigest
  ) {
    return finish(fixture, PCTA_RAW_CODES.AUTHORIZED_ACTION_MISMATCH, "authorized_action_mismatch");
  }

  // P6 — enforcement.applied must be supported by a recorded allow-decision.
  const appliedSupported =
    receipt.decision === "allow" && receiptDigest === p.authorized_action_digest;
  if (p.enforcement.required && !(p.enforcement.applied && appliedSupported)) {
    return finish(
      fixture,
      PCTA_RAW_CODES.ENFORCEMENT_REQUIRED_NOT_APPLIED,
      "enforcement_required_not_applied"
    );
  }

  return finish(fixture, RAW_VERIFIER_CODES.OK, null);
}

function finish(fixture, rawCode, reason) {
  return { rawCode, reason, typed: stage4CodeForRawCode(rawCode), fixture };
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const get = (n) => {
    const i = argv.indexOf(n);
    return i === -1 ? null : argv[i + 1];
  };
  const fixture = get("--fixture");
  const pinnedPubkeyPath = get("--pinned-pubkey");
  const outPath = get("--out");
  const scan = await scanForModelClients(new URL(import.meta.url).pathname, {
    allowedPaths: [new URL("./authorizationProof.mjs", import.meta.url).pathname],
  });
  if (!scan.ok) {
    const r = finish(fixture, RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, scan.reason);
    if (outPath) emit(outPath, r);
    process.exitCode = stage4CodeForRawCode(r.rawCode);
    return r;
  }
  const offline = await runOffline(() => runPctaCore({ fixture, pinnedPubkeyPath }));
  const r = offline.ok
    ? offline.value
    : finish(fixture, RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, offline.reason);
  if (outPath) emit(outPath, r);
  process.exitCode = stage4CodeForRawCode(r.rawCode);
  return r;
}

function emit(outPath, r) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ ...r, ok: r.rawCode === 0 }, null, 2)}\n`);
}

// argv[1] is undefined under `node -e` importers — guard so importing never crashes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`stage4j pcta: ${e.message}`);
    process.exit(3);
  });
}
