import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  verifyIntent,
  buildBundle,
  STAGE4B_BUNDLE_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage4bIntentLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4b-intent";
const bundle = JSON.parse(readFileSync(`${EV}/intent-bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/intent-bundle.signature.json`, "utf8"));
const decisions = JSON.parse(readFileSync(`${EV}/intent-decisions.json`, "utf8"));
const manifest = JSON.parse(readFileSync(`${EV}/manifest.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage4b-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  assert.equal(verifyIntent({ bundle, sidecar, publicKeyPem: pub }).ok, true);
});
test("reproduce recomputes digest and rebuilds bundle", () => {
  const r = verifyIntent({ bundle, sidecar, publicKeyPem: pub, decisions, manifest, reproduce: true });
  assert.equal(r.ok, true);
  assert.equal(r.checks.decisions_sha256_recomputed, true);
  assert.equal(r.checks.bundle_rebuild_matches, true);
});
test("buildBundle is deterministic with the right schema", () => {
  const a = buildBundle({ summary: bundle.summary, manifest, decisions });
  assert.equal(a.schema, STAGE4B_BUNDLE_SCHEMA);
  assert.equal(a.decisions_count, decisions.length);
});
test("fails closed on null input", () => {
  assert.equal(verifyIntent({ bundle: null, sidecar: null, publicKeyPem: null }).ok, false);
});
test("rejects a forged laundering=0 with a tampered count", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.summary.laundering_failures = 5; // honest tamper: now non-zero -> invariant fails AND sig breaks
  assert.equal(verifyIntent({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects a flipped full_containment_preserved", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.summary.full_containment_preserved = false;
  assert.equal(verifyIntent({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects a stripped not_live_confirmed non-claim", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.non_claims.not_live_confirmed = false;
  assert.equal(verifyIntent({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects the wrong key", async () => {
  const c = await import("node:crypto");
  const { publicKey } = c.generateKeyPairSync("ed25519");
  assert.equal(
    verifyIntent({ bundle, sidecar, publicKeyPem: publicKey.export({ type: "spki", format: "pem" }) }).ok,
    false
  );
});
test("reproduce rejects tampered decisions", () => {
  const d = JSON.parse(JSON.stringify(decisions));
  d[0].decision_4b.verdict = d[0].decision_4b.verdict === "allow" ? "block" : "allow";
  const r = verifyIntent({ bundle, sidecar, publicKeyPem: pub, decisions: d, manifest, reproduce: true });
  assert.equal(r.ok, false);
});
