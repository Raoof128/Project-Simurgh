// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
// Replays the committed Stage 4P Lane B relay captures (Task 10) through the REAL
// `verifyCustody` core — no re-capture here, and no trust placed in the `sig.*_ok`
// booleans stored in the committed fixture: every signature is independently
// re-verified with Ed25519 against the committed public test keys before the replay.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createPrivateKey, createPublicKey, verify as edVerify } from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { verifyCustody } from "../../../../tools/simurgh-attestation/stage4p/core/custodyCore.mjs";

const ROOT = join(import.meta.dirname, "../../../fixtures/llmShield/stage4p");
const LANEB = join(ROOT, "lane-b");
const KEY_DIR = join(ROOT, "test-keys");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const hexDigest = (label) => `sha256:${sha256Hex(String(label))}`;

// Independently derive every committed public key from its committed private PEM (the
// PEMs are Task 8's `INSECURE_FIXTURE_ONLY_*` test keys; deriving the public half here
// rather than trusting any stored digest is the point of this test).
function loadPublicKeys() {
  const keys = {};
  for (const file of readdirSync(KEY_DIR)) {
    const m = file.match(/^INSECURE_FIXTURE_ONLY_([A-Za-z-]+)\.pem$/);
    if (!m) continue;
    const name = m[1];
    const privateKey = createPrivateKey(readFileSync(join(KEY_DIR, file), "utf8"));
    const publicKey = createPublicKey(privateKey);
    const publicPem = publicKey.export({ type: "spki", format: "pem" });
    keys[name] = { publicKey, identityDigest: hexDigest(publicPem) };
  }
  return keys;
}
const KEYS = loadPublicKeys();

function verifySig(unsigned, signatureB64, publicKey) {
  try {
    return edVerify(
      null,
      Buffer.from(canonicalJson(unsigned)),
      publicKey,
      Buffer.from(signatureB64, "base64")
    );
  } catch {
    return false;
  }
}

function findKeyByIdentityDigest(digest) {
  return Object.values(KEYS).find((k) => k.identityDigest === digest) ?? null;
}

// REAL Ed25519 verification of every signature in the capture — envelope and custody
// receipt are always provider-signed by Lane B construction; each hop's signer is
// resolved by matching its `relay_identity_digest` against a committed public key (an
// unresolvable identity digest, e.g. an undeclared relay's key not meant to verify here,
// fails closed to `false` rather than throwing).
function recomputeSig(input) {
  const { signature: envSig, ...unsignedEnvelope } = input.envelope;
  const envelope_ok = verifySig(unsignedEnvelope, envSig, KEYS.provider.publicKey);

  let hops_ok = true;
  for (const hop of input.hops) {
    const { signature, ...unsignedHop } = hop;
    const signerKey = findKeyByIdentityDigest(hop.relay_identity_digest);
    const ok = signerKey ? verifySig(unsignedHop, signature, signerKey.publicKey) : false;
    hops_ok = hops_ok && ok;
  }

  const { signature: recSig, ...unsignedReceipt } = input.custodyReceipt;
  const receipt_ok = verifySig(unsignedReceipt, recSig, KEYS.provider.publicKey);

  return { envelope_ok, hops_ok, receipt_ok };
}

const capture = readJson(join(LANEB, "capture-manifest.json"));
const stage4oSurface = readJson(join(ROOT, "stage4o-surface.json"));

test("lane-b capture-manifest.json lists exactly the six frozen arms", () => {
  const names = capture.map((e) => e.arm).sort();
  assert.deepEqual(names, [
    "clean-declared-relay",
    "dropped-hop",
    "model-swap",
    "tool-surface-rewrite",
    "trace-custodian-change",
    "undeclared-relay",
  ]);
});

test("every lane-b arm: signatures re-verify independently and replay to the expected raw/reason", () => {
  for (const entry of capture) {
    const input = readJson(join(LANEB, entry.arm, "input.json"));
    const expected = readJson(join(LANEB, entry.arm, "expected.json"));
    assert.deepEqual(expected, entry.expected, `${entry.arm}: expected.json vs manifest mismatch`);

    const recomputedSig = recomputeSig(input);
    assert.deepEqual(
      recomputedSig,
      input.sig,
      `${entry.arm}: independently-recomputed signature booleans disagree with the stored ones`
    );

    // Run verifyCustody with the INDEPENDENTLY recomputed sig booleans, not the stored
    // ones — the whole point is to never trust a booleans-only fixture at face value.
    const result = verifyCustody({ ...input, sig: recomputedSig });
    assert.equal(result.raw, expected.raw, `${entry.arm}: raw mismatch`);
    if (expected.raw !== 0) {
      assert.equal(result.reason, expected.reason, `${entry.arm}: reason mismatch`);
    } else {
      assert.equal(
        result.custody_path_digest,
        entry.custody_path_digest,
        `${entry.arm}: custody_path_digest mismatch`
      );
    }
  }
});

test("clean-declared-relay's custody receipt tool_surface_digest equals the committed Stage 4O commitment digest", () => {
  const input = readJson(join(LANEB, "clean-declared-relay", "input.json"));
  assert.equal(input.custodyReceipt.tool_surface_digest, stage4oSurface.commitment_digest);
  assert.equal(input.observed.tool_surface_digest, stage4oSurface.commitment_digest);
  assert.equal(input.stage4o_surface_commitment_digest, stage4oSurface.commitment_digest);
});

test("undeclared-relay signs a REAL hop with the relay-hidden key, which is not among the declared relays", () => {
  const input = readJson(join(LANEB, "undeclared-relay", "input.json"));
  assert.equal(input.hops.length, 1);
  assert.equal(input.hops[0].relay_identity_digest, KEYS["relay-hidden"].identityDigest);
  assert.ok(!input.envelope.declared_relay_digests.includes(KEYS["relay-hidden"].identityDigest));
  // The hop signature is still genuinely valid (relay-hidden really did sign it) — it is
  // undeclared, not forged; raw 71 fires on policy, not on signature failure.
  const { signature, ...unsignedHop } = input.hops[0];
  assert.ok(verifySig(unsignedHop, signature, KEYS["relay-hidden"].publicKey));
});

test("tool-surface-rewrite tampers only the observed surface digest, not the signed custody receipt", () => {
  const input = readJson(join(LANEB, "tool-surface-rewrite", "input.json"));
  assert.equal(input.custodyReceipt.tool_surface_digest, stage4oSurface.commitment_digest);
  assert.notEqual(input.observed.tool_surface_digest, stage4oSurface.commitment_digest);
});

test("dropped-hop carries zero hops", () => {
  const input = readJson(join(LANEB, "dropped-hop", "input.json"));
  assert.deepEqual(input.hops, []);
});

test("egress guard: lane-b fixtures carry only digests, closed enums, booleans, and known labels", () => {
  const ALLOWED = new Set([
    "simurgh.origin_custody_envelope.v1",
    "simurgh.custody_hop_receipt.v1",
    "simurgh.custody_receipt.v1",
    "self_hosted",
    "declared_relays_allowed",
    "single_declared",
    "declared_relay",
    "unknown",
    "genesis",
    "accepted",
    "relay_not_declared",
    "model_identity_digest_mismatch",
    "trace_custody_expanded_beyond_declaration",
    "stage4o_surface_binding_mismatch",
    "missing_hop",
    "clean-declared-relay",
    "undeclared-relay",
    "model-swap",
    "trace-custodian-change",
    "tool-surface-rewrite",
    "dropped-hop",
  ]);
  const isBase64Signature = (v) => /^[A-Za-z0-9+/]+=*$/.test(v) && v.length > 40;
  const walk = (v) => {
    if (typeof v === "string") {
      assert.ok(
        /^sha256:[a-f0-9]{64}$/.test(v) || ALLOWED.has(v) || isBase64Signature(v),
        `unexpected raw string in Lane B fixture: ${v}`
      );
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  for (const entry of capture) {
    walk(readJson(join(LANEB, entry.arm, "input.json")));
    walk(readJson(join(LANEB, entry.arm, "expected.json")));
  }
  walk(capture);
});
