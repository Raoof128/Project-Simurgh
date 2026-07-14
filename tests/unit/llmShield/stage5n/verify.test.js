// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the top-level verifier over RAW BYTES: preflight (hostile-JSON) + core + 419 route.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import {
  verifyVtcDelay,
  rekorArtifactHash,
} from "../../../../tools/simurgh-attestation/stage5n/node/verify.mjs";
import { buildValid } from "./_valid.mjs";

// Inject the hermetic facts so we skip the 14 s real chain in unit tests.
function rawAndCfg() {
  const v = buildValid();
  return {
    raw: Buffer.from(canonicalJson(v.envelope), "utf8"),
    vc: v.verifier_config,
    facts: v.facts,
    census: v.census,
  };
}
const inject = (facts) => () => facts;

test("valid canonical envelope bytes → raw 0", () => {
  const { raw, vc, facts, census } = rawAndCfg();
  const r = verifyVtcDelay(raw, vc, { census, _factsAdapter: inject(facts) });
  assert.equal(r.raw, 0, JSON.stringify(r));
});

test("non-canonical bytes (reordered keys) → 396 non_canonical", () => {
  const { vc, facts, census } = rawAndCfg();
  const nonCanon = Buffer.from(
    '{"run_id":"x","envelope_schema":"simurgh.vtc_delay.envelope.v1"}',
    "utf8"
  );
  const r = verifyVtcDelay(nonCanon, vc, { census, _factsAdapter: inject(facts) });
  assert.equal(r.raw, 396);
});

test("__proto__ key → 396 (caught by the canonical-equality gate: canonicalJson cannot emit it)", () => {
  const { vc, facts, census } = rawAndCfg();
  const malicious = Buffer.from('{"__proto__":{"polluted":1},"a":1}', "utf8");
  const r = verifyVtcDelay(malicious, vc, { census, _factsAdapter: inject(facts) });
  assert.equal(r.raw, 396); // rejected either way; detail is non_canonical here
});

test("constructor key (round-trips) → 396 proto_pollution via the recursive scan", () => {
  const { vc, facts, census } = rawAndCfg();
  const malicious = Buffer.from('{"a":1,"constructor":{"x":1}}', "utf8"); // canonical order (a < constructor)
  const r = verifyVtcDelay(malicious, vc, { census, _factsAdapter: inject(facts) });
  assert.equal(r.raw, 396);
  assert.equal(r.detail, "proto_pollution");
});

test("invalid JSON → 396 json_invalid", () => {
  const { vc, facts, census } = rawAndCfg();
  const r = verifyVtcDelay(Buffer.from("{not json", "utf8"), vc, {
    census,
    _factsAdapter: inject(facts),
  });
  assert.equal(r.raw, 396);
  assert.equal(r.detail, "json_invalid");
});

test("raw over max_raw_bytes → 396 raw_too_large", () => {
  const { raw, vc, facts, census } = rawAndCfg();
  const tiny = { ...vc, hard_resource_limits: { ...vc.hard_resource_limits, max_raw_bytes: 10 } };
  const r = verifyVtcDelay(raw, tiny, { census, _factsAdapter: inject(facts) });
  assert.equal(r.raw, 396);
  assert.equal(r.detail, "raw_too_large");
});

// Regression (found by the real Lane-B ceremony, 2026-07-14): defaultFactsAdapter hardcoded
// rekor_artifact_hash: null, which subjectCheck compares against sha256(utf8(subject)) — so EVERY real
// envelope failed 404/414 rekor_artifact_mismatch. Unit tests missed it because they inject facts or call
// runEndpointChild directly; only an end-to-end run over real Rekor evidence reaches this path.
// The hash must be EXTRACTED from the log entry, never asserted by the producer.
test("rekorArtifactHash extracts the artifact hash from a real hashedrekord body", () => {
  const subject = "a".repeat(64);
  const artifact = crypto.createHash("sha256").update(Buffer.from(subject, "utf8")).digest("hex");
  const body = Buffer.from(
    JSON.stringify({
      apiVersion: "0.0.1",
      kind: "hashedrekord",
      spec: { data: { hash: { algorithm: "sha256", value: artifact } } },
    })
  ).toString("base64");
  const entry = { "uuid-1": { body, logIndex: 1 } };
  assert.equal(rekorArtifactHash(entry), artifact);
});

test("rekorArtifactHash fails CLOSED (null) on absent or unparseable evidence", () => {
  assert.equal(rekorArtifactHash(undefined), null);
  assert.equal(rekorArtifactHash({}), null);
  assert.equal(rekorArtifactHash({ u: { body: "not-base64-json" } }), null);
});

test("a throwing facts adapter maps to 419 (the sole 419 route)", () => {
  const { raw, vc, census } = rawAndCfg();
  const r = verifyVtcDelay(raw, vc, {
    census,
    _factsAdapter: () => {
      throw new Error("boom");
    },
  });
  assert.equal(r.raw, 419);
});
