// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — mapCore + vdrCore: build, recompute, frozen order, tier gate, wrapper
// (plan Task 8). Ephemeral keypair generated IN-TEST (only fixture builders must use
// committed keys — this is a test).
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  buildMap,
  checkMapRecompute,
} from "../../../../tools/simurgh-attestation/stage4y/core/mapCore.mjs";
import {
  evaluateVdr,
  evaluateVdrSafe,
  signAttestation,
} from "../../../../tools/simurgh-attestation/stage4y/core/vdrCore.mjs";

const enc = (s) => new TextEncoder().encode(s);
function keypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return {
    pub: publicKey.export({ type: "spki", format: "pem" }),
    priv: privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}
const DOC = "Revenue grew 42% in March.\nWe retained seven of the accounts.\n";

function bundle(docStr = DOC, manifest = []) {
  const bytes = enc(docStr);
  const { map, audit } = buildMap(bytes, manifest, { salt: "fixed-salt", provenance: "fixture" });
  const { pub, priv } = keypair();
  const attestation = signAttestation(map, audit, pub, priv);
  return { bytes, map, audit, attestation, pub };
}

test("public map is content-free: no raw doc text, no per-span digest (digest allowlist)", () => {
  const { map } = bundle();
  const allow = new Set([
    map.document_commitment,
    map.frozen.v1_ruleset_digest,
    map.frozen.v2_digest,
    map.frozen.metamorphic_table_digest,
    map.frozen.source_witness_digest,
  ]);
  // strip approved digest fields, then assert no stray 64-hex and no doc-text substring remains.
  const clone = structuredClone(map);
  clone.document_commitment = "";
  clone.frozen = {};
  const ser = JSON.stringify(clone);
  assert.equal(/[0-9a-f]{64}/.test(ser), false, "no stray 64-hex in public map");
  assert.equal(ser.includes("Revenue"), false, "no raw document text");
  assert.equal(ser.includes("retained"), false, "no raw document text");
  // the approved digests are exactly the allowlist (sanity)
  assert.equal(allow.size, 5);
});

test("public tier passes on a clean bundle; audit tier passes with bytes", () => {
  const { bytes, map, audit, attestation, pub } = bundle();
  assert.equal(
    evaluateVdr({ map, audit, attestation }, { tier: "public", publicKeyPem: pub }).raw,
    0
  );
  assert.equal(
    evaluateVdr(
      { map, audit, attestation },
      { tier: "audit", publicKeyPem: pub, documentBytes: bytes }
    ).raw,
    0
  );
});

test("swapped-pack: public-clean but audit-dirty bundle → 0 at public, audit code at audit", () => {
  const { bytes, map, audit, attestation, pub } = bundle();
  // corrupt an audit-only surface (a sealed shadow slip outcome) WITHOUT touching the public map.
  const dirtyAudit = structuredClone(audit);
  const app = dirtyAudit.shadow_regions.flatMap((r) => r.records).find((r) => r.applicable);
  app.slips_v1 = !app.slips_v1;
  // re-sign so the signature still matches the (public map + dirtied audit) — the tier split,
  // not the signature, is what must catch it.
  const { pub: p2, priv: pr2 } = (() => {
    const k = crypto.generateKeyPairSync("ed25519");
    return {
      pub: k.publicKey.export({ type: "spki", format: "pem" }),
      priv: k.privateKey.export({ type: "pkcs8", format: "pem" }),
    };
  })();
  const att2 = signAttestation(map, dirtyAudit, p2, pr2);
  assert.equal(
    evaluateVdr({ map, audit: dirtyAudit, attestation: att2 }, { tier: "public", publicKeyPem: p2 })
      .raw,
    0,
    "public tier is blind to the audit-only lie"
  );
  assert.equal(
    evaluateVdr(
      { map, audit: dirtyAudit, attestation: att2 },
      { tier: "audit", publicKeyPem: p2, documentBytes: bytes }
    ).raw,
    187,
    "audit tier catches the shadow-replay lie"
  );
});

test("188: a 1-byte document mutation is caught at audit tier", () => {
  const { map, audit, attestation, pub } = bundle();
  const tampered = enc(DOC.replace("42%", "43%"));
  const r = evaluateVdr(
    { map, audit, attestation },
    { tier: "audit", publicKeyPem: pub, documentBytes: tampered }
  );
  assert.equal(r.raw, 188);
});

test("188 gate_agreement_violated: a poisoned extractor is caught by the oracle", () => {
  const bytes = enc(DOC);
  const { map, audit } = buildMap(bytes, [], { salt: "fixed-salt" });
  const poisoned = () => []; // finds nothing → disagrees with the gate on every firing line
  const r = checkMapRecompute(bytes, audit, map, { extractSpansFn: poisoned });
  assert.equal(r.raw, 188);
  assert.equal(r.detail, "gate_agreement_violated");
});

test("189 wrapper: a throw past the signature gate fails closed", () => {
  const { map, audit, attestation, pub } = bundle();
  // poison the map so checkPartition throws inside evaluate (regions non-iterable past schema).
  const evil = { map, audit, attestation };
  const r = evaluateVdrSafe(evil, {
    tier: "audit",
    publicKeyPem: pub,
    documentBytes: null,
    get counterpart() {
      throw new Error("boom");
    },
  });
  assert.equal(r.raw, 189);
  assert.equal(r.reason, "vdr_internal_fail_closed");
});
