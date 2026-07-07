// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — Lane A fixtures (plan Task 9). Three disjoint sets driven by index.json:
// clean (public+audit {raw:0}), tamper (fires its target FIRST), withheld (public-only).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { evaluateVdr } from "../../../../tools/simurgh-attestation/stage4y/core/vdrCore.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const KEY = join(
  ROOT,
  "tests/fixtures/llmShield/stage4y/test-keys/INSECURE_FIXTURE_ONLY_vdr.pub.pem"
);
const PUB = readFileSync(KEY, "utf8");
const rd = (name) => JSON.parse(readFileSync(join(EVID, name), "utf8"));
const index = rd("index.json").fixtures;

function load(id) {
  const map = rd(`${id}.map.json`);
  const attestation = rd(`${id}.attestation.json`);
  const auditPath = join(EVID, `${id}.audit.json`);
  const docPath = join(EVID, `${id}.document.txt`);
  const cpPath = join(EVID, `${id}.counterpart.json`);
  return {
    map,
    attestation,
    audit: existsSync(auditPath) ? rd(`${id}.audit.json`) : null,
    bytes: existsSync(docPath) ? new Uint8Array(readFileSync(docPath)) : null,
    counterpart: existsSync(cpPath) ? rd(`${id}.counterpart.json`) : null,
  };
}

test("index enumerates ten fixtures with the three set tags", () => {
  assert.equal(index.length, 10);
  const bySet = (s) => index.filter((f) => f.set === s).length;
  assert.equal(bySet("clean"), 7);
  assert.equal(bySet("tamper"), 2);
  assert.equal(bySet("withheld"), 1);
});

test("clean fixtures verify {raw:0} at BOTH public and audit tiers", () => {
  for (const fx of index.filter((f) => f.set === "clean")) {
    const { map, audit, attestation, bytes, counterpart } = load(fx.id);
    assert.equal(
      evaluateVdr({ map, audit, attestation }, { tier: "public", publicKeyPem: PUB }).raw,
      0,
      `${fx.id} public`
    );
    assert.equal(
      evaluateVdr(
        { map, audit, attestation },
        { tier: "audit", publicKeyPem: PUB, documentBytes: bytes, counterpart }
      ).raw,
      0,
      `${fx.id} audit`
    );
  }
});

test("tamper fixtures each fire their target raw code FIRST at audit tier", () => {
  for (const fx of index.filter((f) => f.set === "tamper")) {
    const { map, audit, attestation, bytes, counterpart } = load(fx.id);
    const r = evaluateVdr(
      { map, audit, attestation },
      { tier: "audit", publicKeyPem: PUB, documentBytes: bytes, counterpart }
    );
    assert.equal(r.raw, fx.target, `${fx.id} should fire ${fx.target}, got ${r.raw}`);
  }
});

test("withheld_document verifies public-tier {raw:0} with NO bytes, and ships no audit bundle", () => {
  const { map, attestation, audit, bytes } = load("withheld_document");
  assert.equal(audit, null, "no audit bundle committed");
  assert.equal(bytes, null, "no document bytes committed");
  assert.equal(evaluateVdr({ map, attestation }, { tier: "public", publicKeyPem: PUB }).raw, 0);
});
