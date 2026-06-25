import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  verifyProvenance,
  buildBundle,
  STAGE4C_BUNDLE_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage4cProvenanceLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4c-provenance";
const bundle = JSON.parse(readFileSync(`${EV}/provenance-bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/provenance-bundle.signature.json`, "utf8"));
const decisions = JSON.parse(readFileSync(`${EV}/provenance-decisions.json`, "utf8"));
const manifest = JSON.parse(readFileSync(`${EV}/manifest.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage4c-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  assert.equal(verifyProvenance({ bundle, sidecar, publicKeyPem: pub }).ok, true);
});
test("reproduce recomputes digest and rebuilds bundle", () => {
  const r = verifyProvenance({ bundle, sidecar, publicKeyPem: pub, decisions, manifest, reproduce: true });
  assert.equal(r.ok, true);
  assert.equal(r.checks.bundle_rebuild_matches, true);
});
test("buildBundle deterministic with right schema", () => {
  const a = buildBundle({ summary: bundle.summary, manifest, decisions });
  assert.equal(a.schema, STAGE4C_BUNDLE_SCHEMA);
  assert.equal(a.decisions_count, decisions.length);
});
test("fails closed on null input", () => {
  assert.equal(verifyProvenance({ bundle: null, sidecar: null, publicKeyPem: null }).ok, false);
});
test("rejects tampered laundering count", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.summary.laundering_failures_4c = 3;
  assert.equal(verifyProvenance({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects a forged provenance_closes_naive_gap", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.summary.provenance_closes_naive_gap = false;
  assert.equal(verifyProvenance({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects stripped not_live_confirmed non-claim", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.non_claims.not_live_confirmed = false;
  assert.equal(verifyProvenance({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
test("rejects wrong key", async () => {
  const c = await import("node:crypto");
  const { publicKey } = c.generateKeyPairSync("ed25519");
  assert.equal(
    verifyProvenance({ bundle, sidecar, publicKeyPem: publicKey.export({ type: "spki", format: "pem" }) }).ok,
    false
  );
});
test("reproduce rejects tampered decisions", () => {
  const d = JSON.parse(JSON.stringify(decisions));
  d[0].decision_4c.verdict = d[0].decision_4c.verdict === "allow" ? "block" : "allow";
  const r = verifyProvenance({ bundle, sidecar, publicKeyPem: pub, decisions: d, manifest, reproduce: true });
  assert.equal(r.ok, false);
});
