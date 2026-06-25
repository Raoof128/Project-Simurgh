import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyAuthority } from "../../../../tools/simurgh-attestation/verify-stage4a-authority.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4a-lite";
const bundle = JSON.parse(readFileSync(`${EV}/authority-bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/authority-bundle.signature.json`, "utf8"));
const decisions = JSON.parse(readFileSync(`${EV}/authority-decisions.json`, "utf8"));
const manifest = JSON.parse(readFileSync(`${EV}/manifest.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage4a-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  assert.equal(verifyAuthority({ bundle, sidecar, publicKeyPem: pub }).ok, true);
});
test("reproduce recomputes decisions digest and rebuilds bundle", () => {
  const r = verifyAuthority({ bundle, sidecar, publicKeyPem: pub, decisions, manifest, reproduce: true });
  assert.equal(r.ok, true);
  assert.equal(r.checks.decisions_sha256_recomputed, true);
  assert.equal(r.checks.bundle_rebuild_matches, true);
});
test("fails closed on null input (never throws)", () => {
  assert.equal(verifyAuthority({ bundle: null, sidecar: null, publicKeyPem: null }).ok, false);
});
test("rejects a tampered decision summary metric", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.summary.by_verdict.block = 999;
  assert.equal(verifyAuthority({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects an injected requires_confirmation count", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.summary.requires_confirmation_count = 1;
  assert.equal(verifyAuthority({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects a stripped inheritance statement", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.inheritance_statement = "we replayed the live model through the kernel";
  assert.equal(verifyAuthority({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects the wrong key", async () => {
  const { publicKey } = await importWrongKey();
  assert.equal(verifyAuthority({ bundle, sidecar, publicKeyPem: publicKey }).ok, false);
});
test("reproduce rejects a tampered decisions file (digest mismatch)", () => {
  const d = JSON.parse(JSON.stringify(decisions));
  d[0].decision.verdict = "allow";
  const r = verifyAuthority({ bundle, sidecar, publicKeyPem: pub, decisions: d, manifest, reproduce: true });
  assert.equal(r.ok, false);
});

async function importWrongKey() {
  const crypto = await import("node:crypto");
  const { publicKey: pk } = crypto.generateKeyPairSync("ed25519");
  return { publicKey: pk.export({ type: "spki", format: "pem" }) };
}
