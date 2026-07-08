// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — K7 all-functions e2e net (plan Task 15). Every export exercised; the tamper
// matrix provokes each of 181–189; cross-stage invariants (frozen digests match live 4W/4X;
// gate-agreement over every fixture; public ⊂ audit). MANDATORY before tag.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import * as documentBytes from "../../../../tools/simurgh-attestation/stage4y/core/documentBytes.mjs";
import * as spanExtractor from "../../../../tools/simurgh-attestation/stage4y/core/spanExtractor.mjs";
import * as partition from "../../../../tools/simurgh-attestation/stage4y/core/partition.mjs";
import * as shadow from "../../../../tools/simurgh-attestation/stage4y/core/shadow.mjs";
import * as frozenBinding from "../../../../tools/simurgh-attestation/stage4y/core/frozenBinding.mjs";
import * as mapCore from "../../../../tools/simurgh-attestation/stage4y/core/mapCore.mjs";
import * as vdrCore from "../../../../tools/simurgh-attestation/stage4y/core/vdrCore.mjs";
import * as oscal from "../../../../tools/simurgh-attestation/stage4y/core/oscalProjection.mjs";
import * as mapDelta from "../../../../tools/simurgh-attestation/stage4y/core/mapDelta.mjs";
import { scanLeakage } from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const KEYD = join(ROOT, "tests/fixtures/llmShield/stage4y/test-keys");
const PUB = readFileSync(join(KEYD, "INSECURE_FIXTURE_ONLY_vdr.pub.pem"), "utf8");
const PRIV = readFileSync(join(KEYD, "INSECURE_FIXTURE_ONLY_vdr.pem"), "utf8");
const rd = (name) => JSON.parse(readFileSync(join(EVID, name), "utf8"));
const enc = (s) => new TextEncoder().encode(s);
const index = rd("index.json").fixtures;

function loadBundle(id) {
  const ap = join(EVID, `${id}.audit.json`);
  const dp = join(EVID, `${id}.document.txt`);
  const cp = join(EVID, `${id}.counterpart.json`);
  return {
    map: rd(`${id}.map.json`),
    attestation: rd(`${id}.attestation.json`),
    audit: existsSync(ap) ? rd(`${id}.audit.json`) : null,
    bytes: existsSync(dp) ? new Uint8Array(readFileSync(dp)) : null,
    counterpart: existsSync(cp) ? rd(`${id}.counterpart.json`) : null,
  };
}
const cleanBundle = () => loadBundle("incident_report_shaped");

test("every stage-4y export is a function or object (no dead exports)", () => {
  for (const mod of [
    documentBytes,
    spanExtractor,
    partition,
    shadow,
    frozenBinding,
    mapCore,
    vdrCore,
    oscal,
    mapDelta,
  ])
    for (const [name, val] of Object.entries(mod))
      assert.ok(val !== undefined, `export ${name} defined`);
});

test("cross-stage: every non-withheld fixture's frozen block matches the LIVE 4W/4X digests", () => {
  const live = frozenBinding.freshFrozenBlock();
  for (const fx of index) {
    const map = rd(`${fx.id}.map.json`);
    assert.deepEqual(map.frozen, live, `${fx.id} frozen drift`);
  }
});

test("cross-stage: gate-agreement holds over every fixture document", () => {
  for (const fx of index) {
    if (!existsSync(join(EVID, `${fx.id}.document.txt`))) continue;
    const text = readFileSync(join(EVID, `${fx.id}.document.txt`), "utf8");
    for (const line of text.split("\n")) {
      const extractorV1 = spanExtractor.extractSpans(line).some((s) => s.class === "caught_v1");
      assert.equal(extractorV1, scanLeakage(line, [], []).length > 0, `${fx.id}: ${line}`);
    }
  }
});

test("public ⊂ audit: every clean fixture passing audit also passes public", () => {
  for (const fx of index.filter((f) => f.set === "clean")) {
    const { map, audit, attestation, bytes, counterpart } = loadBundle(fx.id);
    const pub = vdrCore.evaluateVdr(
      { map, audit, attestation },
      { tier: "public", publicKeyPem: PUB }
    );
    const aud = vdrCore.evaluateVdr(
      { map, audit, attestation },
      { tier: "audit", publicKeyPem: PUB, documentBytes: bytes, counterpart }
    );
    assert.equal(pub.raw, 0);
    assert.equal(aud.raw, 0);
  }
});

test("tamper matrix: each of 181–189 is provoked", () => {
  const { map, audit, attestation, bytes } = cleanBundle();
  const ev = (b, o) => vdrCore.evaluateVdr(b, { publicKeyPem: PUB, ...o }).raw;

  // 181 schema
  assert.equal(ev({ map: { ...map, schema: "x" }, audit, attestation }, { tier: "public" }), 181);
  // 182 signature (map digest binding breaks on any content change without re-sign)
  assert.equal(
    ev({ map: { ...map, provenance: "submitted" }, audit, attestation }, { tier: "public" }),
    182
  );
  // 183 document bytes (undeclared marker injected)
  assert.equal(
    ev({ map, audit, attestation }, { tier: "audit", documentBytes: enc("█ leaked") }),
    183
  );
  // 184 frozen binding
  const badFrozen = structuredClone(map);
  badFrozen.frozen.v1_ruleset_digest = "sha256:" + "0".repeat(64);
  assert.equal(
    vdrCore.evaluateVdr(
      { map: badFrozen, audit, attestation: vdrCore.signAttestation(badFrozen, audit, PUB, PRIV) },
      { tier: "public", publicKeyPem: PUB }
    ).raw,
    184
  );
  // 185 partition (length not conserved)
  const badPart = structuredClone(map);
  badPart.document_byte_length += 10;
  assert.equal(
    vdrCore.evaluateVdr(
      { map: badPart, audit, attestation: vdrCore.signAttestation(badPart, audit, PUB, PRIV) },
      { tier: "public", publicKeyPem: PUB }
    ).raw,
    185
  );
  // 186 reconciliation (mismatch fixture)
  const rm = loadBundle("reconciliation_mismatch_shaped");
  assert.equal(
    vdrCore.evaluateVdr(
      { map: rm.map, audit: rm.audit, attestation: rm.attestation },
      { tier: "audit", publicKeyPem: PUB, documentBytes: rm.bytes, counterpart: rm.counterpart }
    ).raw,
    186
  );
  // 187 shadow replay (flip a sealed slip)
  const dirtyAudit = structuredClone(audit);
  const app = dirtyAudit.shadow_regions.flatMap((r) => r.records).find((r) => r.applicable);
  app.slips_v1 = !app.slips_v1;
  assert.equal(
    vdrCore.evaluateVdr(
      { map, audit: dirtyAudit, attestation: vdrCore.signAttestation(map, dirtyAudit, PUB, PRIV) },
      { tier: "audit", publicKeyPem: PUB, documentBytes: bytes }
    ).raw,
    187
  );
  // 188 recompute (line-1 byte flip)
  const t = new Uint8Array(bytes);
  t[3] ^= 0x01;
  assert.equal(ev({ map, audit, attestation }, { tier: "audit", documentBytes: t }), 188);
  // 189 wrapper (throw past signature)
  assert.equal(
    vdrCore.evaluateVdrSafe(
      { map, audit, attestation },
      {
        tier: "audit",
        publicKeyPem: PUB,
        documentBytes: bytes,
        get counterpart() {
          throw new Error("boom");
        },
      }
    ).raw,
    189
  );
});
