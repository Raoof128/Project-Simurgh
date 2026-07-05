// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4P Lane B: DIGEST-ONLY capture of an in-process "legal relay" inserted between a
// client and the Stage 4O mock provider (4P spec §8 Lane B). Everything here runs in-process
// — no subprocess, no network — and is run ONCE by the implementer; the outputs are
// committed and replayed (never re-captured) by tests/unit/llmShield/stage4p/laneb.test.js.
//
//   client -> local custody relay (signs a hop) -> 4O-fronted provider (signs the receipt)
//
// Reuse of the Stage 4O mock-provider machinery: Stage 4O's own live MCP capture
// (tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs) already produced the
// digest-only tool-surface manifest committed at
// tests/fixtures/llmShield/stage4o/chains/clean-chain.json. Lane B does not re-spawn that
// MCP server (that would touch a subprocess and, in a live-server variant, the network);
// instead it reuses Stage 4O's OWN verifier-grade function — manifestCore.mjs's
// `commitmentDigest` — over that exact committed envelope. This is the same function
// Stage 4O's own verifier calls, so recomputing it here and feeding it through 4P's
// `surfaceBindingDigest` reproduces Task 8's `stage4o-surface.json` byte-for-byte,
// making the 4O -> 4P tool-surface binding a REAL cross-stage invariant rather than a
// modelled convenience (asserted below, and again independently in laneb.test.js).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from "node:crypto";
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { commitmentDigest } from "../../stage4o/core/manifestCore.mjs";
import {
  domainDigest,
  hopReceiptDigest,
  custodyPathDigest,
  surfaceBindingDigest,
} from "../core/digest.mjs";
import { verifyCustody } from "../core/custodyCore.mjs";
import { DOMAINS, SCHEMAS } from "../constants.mjs";

const ROOT = "tests/fixtures/llmShield/stage4p";
const OUT = join(ROOT, "lane-b");
const KEY_DIR = join(ROOT, "test-keys");
const RELAY_KEY_NAMES = ["relay-one", "relay-hidden", "provider"];

function fail(message) {
  console.error(`stage4p lane-b capture FAIL: ${message}`);
  process.exit(1);
}

function write(rel, obj) {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

const hexDigest = (label) => `sha256:${sha256Hex(String(label))}`;

// --- Step 0: key material — reuse Task 8's committed test keys, generate none new ---------
const keys = {};
for (const name of RELAY_KEY_NAMES) {
  const pemPath = join(KEY_DIR, `INSECURE_FIXTURE_ONLY_${name}.pem`);
  if (!existsSync(pemPath)) fail(`missing Task 8 test key ${pemPath}`);
  const privateKey = createPrivateKey(readFileSync(pemPath, "utf8"));
  const publicKey = createPublicKey(privateKey);
  const publicPem = publicKey.export({ type: "spki", format: "pem" });
  keys[name] = { privateKey, publicKey, identityDigest: hexDigest(publicPem) };
}

function signObject(unsigned, signerName) {
  return edSign(null, Buffer.from(canonicalJson(unsigned)), keys[signerName].privateKey).toString(
    "base64"
  );
}
function verifyObjectSignature(unsigned, signatureB64, signerName) {
  try {
    return edVerify(
      null,
      Buffer.from(canonicalJson(unsigned)),
      keys[signerName].publicKey,
      Buffer.from(signatureB64, "base64")
    );
  } catch {
    return false;
  }
}

// --- Step 1: the real 4O -> 4P tool-surface binding, recomputed via Stage 4O's own core ---
const CLEAN_CHAIN_PATH = "tests/fixtures/llmShield/stage4o/chains/clean-chain.json";
const cleanChain = JSON.parse(readFileSync(CLEAN_CHAIN_PATH, "utf8")).chain;
const chosenEnvelope = cleanChain[0];
const stage4o_manifest_digest = commitmentDigest(chosenEnvelope);
const stage4o_toolset_digest = chosenEnvelope.manifest.toolset_digest;
const stage4o_manifest_epoch = chosenEnvelope.manifest_epoch;
const SURFACE = surfaceBindingDigest({
  stage4o_manifest_digest,
  stage4o_toolset_digest,
  stage4o_manifest_epoch,
});
const committedSurface = JSON.parse(readFileSync(join(ROOT, "stage4o-surface.json"), "utf8"));
if (SURFACE !== committedSurface.commitment_digest) {
  fail(
    "recomputed stage4o surface-binding digest does not match Task 8's committed " +
      "stage4o-surface.json — the 4O -> 4P binding is broken"
  );
}

// The 4O-fronted provider's "mock exchange": what a live query against the committed
// Stage 4O tool surface legally returns. Digest-only, sourced from the real committed
// fixture above — never a fresh/synthetic tool list, precisely so the clean arm's
// observed tool surface is byte-identical to the committed 4O commitment digest.
function mockStage4oExchange() {
  return { tool_surface_digest: SURFACE };
}

const CURRENT_ANCHOR = JSON.parse(
  readFileSync(join(ROOT, "stage4n-anchor.json"), "utf8")
).record_digest;

// --- Step 2: shared session constants (frozen labels; digests derived, never hand-typed) --
const RUN_EPOCH = 40;
const VALID_FROM = 35;
const VALID_UNTIL = 45;
const MODEL_LABEL = "model-legal-relay-standard";
const ENDPOINT_LABEL = "endpoint-legal-relay";
const PROVIDER_IDENTITY_LABEL = "provider-identity-legal-relay";
const TRANSFORM_LABEL = "relay-passthrough-transform";

// --- Step 3: the relay — in-process function, one hop, real signatures both ends ---------
// client -> relay (signs a hop receipt with the given relay key) -> mockStage4oExchange()
// (the 4O-fronted provider) -> provider (signs the custody receipt).
function buildArm(armName, opts) {
  const o = {
    relayKeyName: "relay-one",
    declaredRelayNames: ["relay-one"],
    observedModelLabel: MODEL_LABEL,
    observedTraceCustodyObserved: "declared_relay",
    tamperObservedSurface: false,
    dropHop: false,
    ...opts,
  };
  const requestLabel = `laneb-request-${armName}`;
  const responseLabel = `laneb-response-${armName}`;

  const unsignedEnvelope = {
    schema: SCHEMAS.ENVELOPE,
    run_epoch: RUN_EPOCH,
    declared_endpoint_digest: hexDigest(ENDPOINT_LABEL),
    provider_family: "self_hosted",
    provider_identity_digest: hexDigest(PROVIDER_IDENTITY_LABEL),
    model_identity_digest: hexDigest(MODEL_LABEL),
    relay_policy: "declared_relays_allowed",
    declared_relay_digests: o.declaredRelayNames.map((n) => keys[n].identityDigest),
    declared_transform_digests: [hexDigest(TRANSFORM_LABEL)],
    account_boundary: "single_declared",
    trace_custody: "declared_relay",
    tool_surface_digest: SURFACE,
    valid_from_epoch: VALID_FROM,
    valid_until_epoch: VALID_UNTIL,
  };
  const envelopeSignature = signObject(unsignedEnvelope, "provider");
  const envelope = { ...unsignedEnvelope, signature: envelopeSignature };
  const envelope_ok = verifyObjectSignature(unsignedEnvelope, envelopeSignature, "provider");
  const envelopeDigest = domainDigest(DOMAINS.ENVELOPE, SCHEMAS.ENVELOPE, unsignedEnvelope);

  const requestDigest = hexDigest(requestLabel);
  const responseDigest = hexDigest(responseLabel);

  // Relay hop (dropped entirely for the dropped-hop arm — no client-to-relay handoff
  // was ever custody-recorded).
  let hops = [];
  if (!o.dropHop) {
    const unsignedHop = {
      schema: SCHEMAS.HOP_RECEIPT,
      hop_index: 0,
      previous_receipt_digest: envelopeDigest,
      relay_identity_digest: keys[o.relayKeyName].identityDigest,
      transform_digest: "genesis",
      input_digest: requestDigest,
      output_digest: responseDigest,
    };
    const hopSignature = signObject(unsignedHop, o.relayKeyName);
    hops = [{ ...unsignedHop, signature: hopSignature }];
  }
  const hops_ok = hops.every((h) => {
    const { signature, ...unsignedHop } = h;
    const signerName = Object.keys(keys).find(
      (n) => keys[n].identityDigest === h.relay_identity_digest
    );
    return signerName ? verifyObjectSignature(unsignedHop, signature, signerName) : false;
  });

  // The 4O-fronted provider's exchange response — the real committed tool-surface digest.
  const exchange = mockStage4oExchange();

  const unsignedReceipt = {
    schema: SCHEMAS.CUSTODY_RECEIPT,
    request_digest: requestDigest,
    response_digest: responseDigest,
    custody_path_digest: custodyPathDigest(hops.map(hopReceiptDigest)),
    model_identity_digest: hexDigest(MODEL_LABEL),
    relay_chain_digest: hexDigest(`laneb-relay-chain-${armName}`),
    trace_custody_observed: "declared_relay",
    tool_surface_digest: exchange.tool_surface_digest,
    receipt_epoch: RUN_EPOCH,
  };
  const receiptSignature = signObject(unsignedReceipt, "provider");
  const custodyReceipt = { ...unsignedReceipt, signature: receiptSignature };
  const receipt_ok = verifyObjectSignature(unsignedReceipt, receiptSignature, "provider");

  const observed = {
    endpoint_digest: hexDigest(ENDPOINT_LABEL),
    model_identity_digest: hexDigest(o.observedModelLabel),
    account_pool_observed: false,
    trace_custody_observed: o.observedTraceCustodyObserved,
    tool_surface_digest: o.tamperObservedSurface
      ? hexDigest(`laneb-tool-surface-rewrite-tamper-${armName}`)
      : exchange.tool_surface_digest,
    transform_digests: [hexDigest(TRANSFORM_LABEL)],
  };

  const custody_path_digest = custodyPathDigest(hops.map(hopReceiptDigest));

  const input = {
    envelope,
    envelopeDigest,
    hops,
    custodyReceipt,
    responseDigest,
    requestDigest,
    sig: { envelope_ok, hops_ok, receipt_ok },
    observed,
    stage4o_surface_commitment_digest: SURFACE,
    cpc: { signals: [], declared_cap: 1, anchor_digests: [CURRENT_ANCHOR] },
  };
  return { input, custody_path_digest };
}

// --- Step 4: the six frozen arms (4P spec §8 Lane B) --------------------------------------
const ARMS = [
  {
    name: "clean-declared-relay",
    opts: {},
    expected: { raw: 0, reason: "accepted" },
  },
  {
    name: "undeclared-relay",
    opts: { relayKeyName: "relay-hidden" },
    expected: { raw: 71, reason: "relay_not_declared" },
  },
  {
    name: "model-swap",
    opts: { observedModelLabel: "model-legal-relay-swapped" },
    expected: { raw: 72, reason: "model_identity_digest_mismatch" },
  },
  {
    name: "trace-custodian-change",
    opts: { observedTraceCustodyObserved: "unknown" },
    expected: { raw: 74, reason: "trace_custody_expanded_beyond_declaration" },
  },
  {
    name: "tool-surface-rewrite",
    opts: { tamperObservedSurface: true },
    expected: { raw: 75, reason: "stage4o_surface_binding_mismatch" },
  },
  {
    name: "dropped-hop",
    opts: { dropHop: true },
    expected: { raw: 78, reason: "missing_hop" },
  },
];

const manifestEntries = [];
for (const arm of ARMS) {
  const { input, custody_path_digest } = buildArm(arm.name, arm.opts);
  const result = verifyCustody(input);
  if (result.raw !== arm.expected.raw) {
    fail(`arm ${arm.name}: expected raw ${arm.expected.raw}, got ${result.raw} (${result.reason})`);
  }
  if (arm.expected.raw !== 0 && result.reason !== arm.expected.reason) {
    fail(`arm ${arm.name}: expected reason ${arm.expected.reason}, got ${result.reason}`);
  }
  write(`${arm.name}/input.json`, input);
  write(`${arm.name}/expected.json`, arm.expected);
  manifestEntries.push({
    arm: arm.name,
    custody_path_digest,
    expected: arm.expected,
  });
}
write("capture-manifest.json", manifestEntries);

console.log(`stage4p lane-b: ${ARMS.length} relay-capture arms written to ${OUT}`);
