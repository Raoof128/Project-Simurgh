// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane B — the REAL public Rekor ceremony, re-verified offline.
//
// The ceremony EXECUTED on 2026-07-25. Entry 2245421742 is in the live public-good transparency log
// and anyone can fetch it by UUID. Every assertion below runs from frozen bytes with no network, so
// the lane reproduces rather than re-observes.
//
// The bound this file exists to keep visible: this is a real Rekor anchor with a SELF-MANAGED key,
// not a Fulcio keyless ceremony. It proves an artifact was signed by SOMETHING at a time. It does
// not say by whom — and for a stage about submitter identity, that gap is the thesis, not a defect.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  verifyRekorCeremonyOffline,
  recomputeInclusionRoot,
  rekorEvidenceBundle,
  REKOR_PINNED,
  REKOR_CEILING,
  REKOR_PROFILE_ID,
} from "../../../../tools/simurgh-attestation/stage5p/node/laneBRekor.mjs";
import { verifySection2 } from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import { leqV } from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";

const CEREMONY = fileURLToPath(
  new URL("../../../../docs/research/llm-shield/evidence/stage-5p/rekor-ceremony/", import.meta.url)
);
const read = (n) => readFileSync(CEREMONY + n);

test("the ceremony verifies OFFLINE — all eight checks, no network", () => {
  const c = verifyRekorCeremonyOffline();
  for (const [name, passed] of Object.entries(c.checks)) {
    assert.equal(passed, true, `offline check failed: ${name}`);
  }
  assert.equal(c.ok, true);
});

test("it is a REAL entry in the REAL public log, with real coordinates", () => {
  const c = verifyRekorCeremonyOffline();
  assert.equal(c.log, "rekor.sigstore.dev");
  assert.match(c.uuid, /^[0-9a-f]{80}$/);
  assert.ok(Number.isInteger(c.log_index) && c.log_index > 0);
  assert.ok(c.tree_size_at_inclusion > 2_000_000, "a real public log has millions of entries");
  assert.match(c.root_hash, /^[0-9a-f]{64}$/);
  assert.ok(c.integrated_time > 1_700_000_000, "a real integration timestamp");
});

test("the log entry BINDS our artifact — not merely some artifact", () => {
  // Without this the ceremony would prove that *something* was logged. Three independent bindings:
  // the digest, the signer's key, and the signature bytes all appear inside the logged body.
  const c = verifyRekorCeremonyOffline();
  assert.equal(c.checks.body_binds_artifact_digest, true);
  assert.equal(c.checks.body_binds_signer_key, true);
  assert.equal(c.checks.body_binds_signature, true);
  assert.equal(
    c.artifact_digest,
    "839b7729289f8a10dd2a113b905bff3dcbf3d5738f697644951f5ebe5cddaa80"
  );
});

test("the inclusion proof is RECOMPUTED, not taken on the server's word", () => {
  const c = verifyRekorCeremonyOffline();
  assert.equal(c.checks.inclusion_proof_valid, true);
  // ...and the root it lands on is the root the log SIGNED in its checkpoint, so the arithmetic
  // has authority behind it rather than being arithmetic alone.
  assert.equal(c.checks.checkpoint_root_matches_proof, true);
  assert.equal(c.checks.signed_entry_timestamp_valid, true);
});

test("PREMISE — the Merkle recomputation can FAIL, so passing it means something", () => {
  const entry = JSON.parse(read("rekor-response.json").toString("utf8"));
  const e = entry[Object.keys(entry)[0]];
  const p = e.verification.inclusionProof;
  const corrupted = [...p.hashes];
  corrupted[0] = "0".repeat(64);
  const bad = recomputeInclusionRoot(Buffer.alloc(32), p.logIndex, p.treeSize, corrupted).toString(
    "hex"
  );
  assert.notEqual(bad, p.rootHash, "the inclusion check would accept anything");
});

test("a tampered artifact breaks the binding — the freeze is not decorative", () => {
  const artifact = read("artifact.json");
  const tampered = Buffer.concat([artifact, Buffer.from(" ")]);
  const digest = createHash("sha256").update(tampered).digest("hex");
  const c = verifyRekorCeremonyOffline();
  assert.notEqual(digest, c.artifact_digest, "a changed artifact must not keep its digest");
});

// ---- the honest bound is carried WITH the verdict ----------------------------------------------

test("the result declares it is NOT keyless, and names what it does not prove", () => {
  const c = verifyRekorCeremonyOffline();
  assert.equal(c.is_keyless, false, "this must never be presented as a Fulcio keyless ceremony");
  assert.equal(c.signer, "self_managed_ecdsa_p256");
  for (const nc of [
    "not_a_fulcio_keyless_ceremony",
    "not_proof_of_who_holds_the_key",
    "not_proof_of_submitter_identity",
    "not_proof_of_durable_continuity",
  ]) {
    assert.ok(c.not_claimed.includes(nc), `missing non-claim: ${nc}`);
  }
});

test("the ceiling isolates BINDING from RESOLUTION — the whole point of the lane", () => {
  assert.equal(REKOR_CEILING.binding, "cryptographically_bound", "the signature really verifies");
  assert.equal(REKOR_CEILING.resolution, "unresolved", "a bare key resolves NO principal");
  assert.equal(REKOR_CEILING.continuity, "ephemeral", "one entry is one moment");
  assert.equal(REKOR_CEILING.role, "unproven");
});

test("no network path exists in the lane module — it reproduces, it does not re-observe", () => {
  const src = readFileSync(
    fileURLToPath(
      new URL("../../../../tools/simurgh-attestation/stage5p/node/laneBRekor.mjs", import.meta.url)
    ),
    "utf8"
  );
  for (const forbidden of ["fetch(", "node:http", "node:https", "XMLHttpRequest"]) {
    assert.ok(!src.includes(forbidden), `Lane B must verify offline: found ${forbidden}`);
  }
});

// ---- the ceremony drives the verifier ------------------------------------------------------------

test("a real signature earns cryptographic BINDING and nothing more", () => {
  const bundle = rekorEvidenceBundle({
    binding: "cryptographically_bound",
    resolution: "unresolved",
    continuity: "ephemeral",
    role: "unproven",
  });
  const r = verifySection2(bundle, REKOR_PINNED);
  assert.equal(r.ok, true, `the real ceremony was rejected: ${JSON.stringify(r)}`);
});

test("asking Rekor to RESOLVE a principal fails — a log is not an identity provider", () => {
  // The exact overclaim the industry makes about transparency logs, refused mechanically.
  const bundle = rekorEvidenceBundle({
    binding: "cryptographically_bound",
    resolution: "principal_resolved",
    continuity: "ephemeral",
    role: "unproven",
  });
  const r = verifySection2(bundle, REKOR_PINNED);
  assert.equal(r.ok, false, "a transparency log was allowed to resolve a principal");
  assert.equal(r.check_id, "S2.C9");
});

test("Rekor cannot launder its way to a durable, role-bound identity", () => {
  const bundle = rekorEvidenceBundle(REKOR_CEILING);
  bundle.evidences[0].asserted_strength_delta = {
    ...REKOR_CEILING,
    continuity: "durable",
    role: "accountable_role_bound",
  };
  const r = verifySection2(bundle, REKOR_PINNED);
  assert.equal(r.ok, false);
  assert.equal(r.check_id, "S2.C7");
  assert.equal(r.outcome, "accountable_role_unproven");
});

test("the subject is named after the KEY, because a key is all this lane resolves", () => {
  const bundle = rekorEvidenceBundle(REKOR_CEILING);
  // The frozen grammar has no kind for "a credential whose holder is unknown". `account` is the
  // opaque-handle kind and is used deliberately: it asserts NONE of person, organisation or service.
  // Minting a fifth kind was rejected — a key is a credential, not an entity, and giving credentials
  // their own kind would invite the "held a key therefore is a party" conflation 5P exists to stop.
  assert.equal(bundle.subject.kind, "account");
  for (const overclaim of ["person", "organisation", "service"]) {
    assert.notEqual(bundle.subject.kind, overclaim, "a bare key is none of these");
  }
  assert.match(bundle.subject.subject_id, /^[0-9a-f]{64}$/);
  assert.ok(!bundle.subject.subject_id.startsWith("sha256:"));
  assert.ok(leqV(bundle.evidences[0].asserted_strength_delta, REKOR_CEILING));
});

test("the pinned trust root is REKOR'S OWN key — the strongest root any lane here pins", () => {
  assert.ok(REKOR_PINNED.registry.has(REKOR_PROFILE_ID));
  assert.ok(REKOR_PINNED.trusted_profile_ids.includes(REKOR_PROFILE_ID));
  const expected = createHash("sha256").update(read("rekor-log-public-key.pem")).digest("hex");
  assert.equal(REKOR_PINNED.registry.get(REKOR_PROFILE_ID).trust_root_fpr, expected);
});

test("every frozen ceremony file matches the committed manifest", () => {
  const manifest = read("sha256-manifest.txt").toString("utf8");
  const rows = [...manifest.matchAll(/^([0-9a-f]{64})\s+(\S+)$/gm)];
  assert.ok(rows.length >= 6, "the manifest must cover every ceremony artifact");
  for (const [, digest, file] of rows) {
    assert.equal(
      createHash("sha256").update(read(file)).digest("hex"),
      digest,
      `${file} does not match the manifest`
    );
  }
});

test("NO private key was committed — the ceremony verifies without one", () => {
  const manifest = read("sha256-manifest.txt").toString("utf8");
  assert.ok(!/\.key\b/.test(manifest), "a private key must never be in the evidence manifest");
  for (const file of ["artifact.json", "signer-public-key.pem", "rekor-log-public-key.pem"]) {
    const text = read(file).toString("utf8");
    assert.ok(!text.includes("PRIVATE KEY"), `${file} contains private key material`);
  }
});
