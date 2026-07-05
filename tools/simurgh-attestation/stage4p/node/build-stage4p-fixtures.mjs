// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4P deterministic fixture-corpus builder (Task 8). Constructs the Lane A custody
// tamper matrix, the Lane C public-report-motivated arm, the five CPC (§9) arms, and the
// four invention-layer arms PROGRAMMATICALLY — never hand-edited JSON. Every digest is
// harness-computed (domainDigest / recordDigest / commitmentDigest / surfaceBindingDigest),
// every signature is a REAL Ed25519 signature over canonicalJson of the unsigned object,
// and every `sig.*_ok` / verification boolean is the FROZEN result of an actual crypto
// verify or an actual call into the Stage 4P core — never hand-typed true/false.
//
// The Stage 4N window anchor and Stage 4O surface-binding commitment are sourced from
// REAL committed fixtures of those stages (never fabricated) — see stage4n-anchor.json and
// stage4o-surface.json below.
//
// `--init-keys` generates the eight Ed25519 test keys into test-keys/ ONCE (pure PEM, no
// comment lines — MF4, mirrors the Stage 4O `INSECURE_FIXTURE_ONLY_<name>.pem` convention
// with letters-and-hyphens-only names). Every subsequent run reads the committed PEMs and
// rebuilds ALL fixture JSON byte-identically.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as edSign,
  verify as edVerify,
} from "node:crypto";
import { canonicalJson, sha256Hex, recordDigest } from "../../stage4m/core/canonical.mjs";
import { validateHeartbeat } from "../../stage4n/core/recordCore.mjs";
import { commitmentDigest } from "../../stage4o/core/manifestCore.mjs";
import {
  domainDigest,
  hopReceiptDigest,
  custodyPathDigest,
  surfaceBindingDigest,
} from "../core/digest.mjs";
import { verifyCustody } from "../core/custodyCore.mjs";
import { buildCpcSignal, verifyCpcEmission } from "../core/cpcCore.mjs";
import {
  validateEnforcementCommitment,
  pincerCorroborated,
  validateRelayContest,
  projectVendorDisclosure,
  verifyVendorDisclosure,
  validateExtractionBridge,
} from "../core/inventionCore.mjs";
import { DOMAINS, SCHEMAS } from "../constants.mjs";

const OUT = "tests/fixtures/llmShield/stage4p";
const KEY_DIR = join(OUT, "test-keys");
const KEY_NAMES = [
  "operator-a",
  "operator-b",
  "operator-c",
  "relay-one",
  "relay-two",
  "relay-hidden",
  "provider",
  "contest-relay",
];

const hexDigest = (label) => `sha256:${sha256Hex(String(label))}`;

function write(rel, obj) {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

function fail(message) {
  console.error(`stage4p fixture builder FAIL: ${message}`);
  process.exit(1);
}

// --- Step 0 / Step 3: key material ------------------------------------------------------
const INIT_KEYS = process.argv.includes("--init-keys");
if (INIT_KEYS) {
  mkdirSync(KEY_DIR, { recursive: true });
  for (const name of KEY_NAMES) {
    const pemPath = join(KEY_DIR, `INSECURE_FIXTURE_ONLY_${name}.pem`);
    if (existsSync(pemPath)) continue;
    const { privateKey } = generateKeyPairSync("ed25519");
    writeFileSync(pemPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    writeFileSync(
      join(KEY_DIR, `INSECURE_FIXTURE_ONLY_${name}.meta.json`),
      JSON.stringify(
        { purpose: "committed-test-fixture-key", not_secret: true, do_not_use_for_evidence: true },
        null,
        2
      ) + "\n"
    );
  }
  console.log(`stage4p: initialized test keys under ${KEY_DIR}`);
}

const keys = {};
for (const name of KEY_NAMES) {
  const pemPath = join(KEY_DIR, `INSECURE_FIXTURE_ONLY_${name}.pem`);
  if (!existsSync(pemPath)) fail(`missing test key ${pemPath} — run with --init-keys first`);
  const privateKey = createPrivateKey(readFileSync(pemPath, "utf8"));
  const publicKey = createPublicKey(privateKey);
  const publicPem = publicKey.export({ type: "spki", format: "pem" });
  keys[name] = { privateKey, publicKey, publicPem, identityDigest: hexDigest(publicPem) };
}

// Real signatures over canonicalJson of the unsigned object (brief Step 3). Verification is
// real Ed25519 too — every boolean stored in a fixture is the frozen result of an actual
// crypto check, never hand-typed.
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
function resolveSigner(unsigned, signatureB64, candidateNames) {
  for (const name of candidateNames) {
    if (verifyObjectSignature(unsigned, signatureB64, name)) return name;
  }
  return null;
}
// Deliberately corrupt a base64 signature (fault-68 family — MF4-adjacent: still valid
// base64 SHAPE, so schema validation passes and only the crypto check fails).
function corruptSignature(sigB64) {
  const chars = sigB64.split("");
  const i = Math.min(2, chars.length - 1);
  chars[i] = chars[i] === "A" ? "B" : "A";
  return chars.join("");
}

// --- Interfaces: real Stage 4N window anchor --------------------------------------------
const FEED_PATH = "tests/fixtures/llmShield/stage4n/feed/heartbeat-feed.jsonl";
const feedRecords = readFileSync(FEED_PATH, "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const currentRecord = feedRecords[0];
const nextRecord = feedRecords[1];
for (const [label, record] of [
  ["current", currentRecord],
  ["next", nextRecord],
]) {
  const v = validateHeartbeat(record);
  if (!v.ok) fail(`4N anchor source (${label}) failed validateHeartbeat: ${JSON.stringify(v)}`);
}
const CURRENT_ANCHOR = recordDigest(currentRecord);
const NEXT_ANCHOR = recordDigest(nextRecord);
const ROGUE_ANCHOR = hexDigest("rogue-window-anchor-not-in-corpus-feed");
write("stage4n-anchor.json", {
  source_path: FEED_PATH,
  current_window_id: currentRecord.window_id,
  record_digest: CURRENT_ANCHOR,
  next_window_id: nextRecord.window_id,
  next_record_digest: NEXT_ANCHOR,
});

// --- Interfaces: real Stage 4O surface-binding commitment ---------------------------------
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
write("stage4o-surface.json", {
  stage4o_manifest_digest,
  stage4o_toolset_digest,
  stage4o_manifest_epoch,
  commitment_digest: SURFACE,
});

// --- Lane A / Lane C input builder ---------------------------------------------------------
// One flexible builder covers every arm: pass only the fields that deviate from the green
// baseline. Interdependent digests (envelope digest, hop chain, custody-path digest) are
// always recomputed from whatever content is ACTUALLY present, so every signature legitimately
// covers the content it appears next to (the one deliberate exception is corrupt*Sig, which
// corrupts bytes AFTER a real signature was computed — the documented fault-68 mechanism).
function buildInput(opts = {}) {
  const o = {
    runEpoch: 15,
    validFrom: 10,
    validUntil: 20,
    providerFamily: "self_hosted",
    relayPolicy: "declared_relays_allowed",
    declaredRelayNames: ["relay-one", "relay-two"],
    accountBoundary: "single_declared",
    traceCustody: "declared_relay",
    modelLabel: "model-standard",
    endpointLabel: "endpoint-standard",
    providerIdentityLabel: "provider-identity-standard",
    transformDeclaredLabels: ["transform-standard"],
    hopSpecs: [
      { relayName: "relay-one", inputLabel: "hop-input-1" },
      { relayName: "relay-two", inputLabel: "hop-input-2" },
    ],
    responseLabel: "response-standard",
    requestLabel: "request-standard",
    relayChainLabel: "relay-chain-standard",
    receiptTraceCustodyObserved: "declared_relay",
    observedTraceCustodyObserved: "declared_relay",
    observedAccountPoolObserved: false,
    observedModelLabel: null,
    observedEndpointLabel: null,
    observedTransformLabels: null,
    observedToolSurfaceOverride: null,
    receiptEpochOverride: null,
    corruptEnvelopeSig: false,
    corruptHopSig: null,
    corruptReceiptSig: false,
    outerRequestDigestOverride: null,
    cpcSignals: [],
    cpcDeclaredCap: 2,
    cpcAnchorDigests: null,
    mutateReceiptPostSign: null,
    ...opts,
  };

  // Envelope
  const unsignedEnvelope = {
    schema: SCHEMAS.ENVELOPE,
    run_epoch: o.runEpoch,
    declared_endpoint_digest: hexDigest(o.endpointLabel),
    provider_family: o.providerFamily,
    provider_identity_digest: hexDigest(o.providerIdentityLabel),
    model_identity_digest: hexDigest(o.modelLabel),
    relay_policy: o.relayPolicy,
    declared_relay_digests: o.declaredRelayNames.map((n) => keys[n].identityDigest),
    declared_transform_digests: o.transformDeclaredLabels.map(hexDigest),
    account_boundary: o.accountBoundary,
    trace_custody: o.traceCustody,
    tool_surface_digest: SURFACE,
    valid_from_epoch: o.validFrom,
    valid_until_epoch: o.validUntil,
  };
  const envelopeSignature = signObject(unsignedEnvelope, "provider");
  let envelope = { ...unsignedEnvelope, signature: envelopeSignature };
  let envelope_ok = verifyObjectSignature(unsignedEnvelope, envelopeSignature, "provider");
  if (o.corruptEnvelopeSig) {
    envelope = { ...envelope, signature: corruptSignature(envelopeSignature) };
    envelope_ok = verifyObjectSignature(unsignedEnvelope, envelope.signature, "provider");
  }
  const envelopeDigest = domainDigest(DOMAINS.ENVELOPE, SCHEMAS.ENVELOPE, unsignedEnvelope);

  // Hop chain
  const responseDigest = hexDigest(o.responseLabel);
  let prev = envelopeDigest;
  const hops = [];
  const hopOks = [];
  o.hopSpecs.forEach((spec, i) => {
    const isLast = i === o.hopSpecs.length - 1;
    const outputLabel = spec.outputLabel ?? (isLast ? null : `hop-intermediate-${i}`);
    const outputDigest = outputLabel ? hexDigest(outputLabel) : responseDigest;
    const unsignedHop = {
      schema: SCHEMAS.HOP_RECEIPT,
      hop_index: spec.hopIndexOverride ?? i,
      previous_receipt_digest: spec.prevDigestOverride ?? prev,
      relay_identity_digest: spec.relayIdentityLabelOverride
        ? hexDigest(spec.relayIdentityLabelOverride)
        : keys[spec.relayName].identityDigest,
      transform_digest:
        (spec.transformLabel ?? "genesis") === "genesis"
          ? "genesis"
          : hexDigest(spec.transformLabel),
      input_digest: hexDigest(spec.inputLabel ?? `hop-input-${i}`),
      output_digest: outputDigest,
    };
    const signature = signObject(unsignedHop, spec.relayName);
    let hop = { ...unsignedHop, signature };
    let ok = verifyObjectSignature(unsignedHop, signature, spec.relayName);
    if (o.corruptHopSig === i) {
      hop = { ...hop, signature: corruptSignature(signature) };
      ok = verifyObjectSignature(unsignedHop, hop.signature, spec.relayName);
    }
    hops.push(hop);
    hopOks.push(ok);
    prev = hopReceiptDigest(hop);
  });
  const hops_ok = hopOks.length === 0 ? true : hopOks.every(Boolean);

  // Custody receipt
  const unsignedReceipt = {
    schema: SCHEMAS.CUSTODY_RECEIPT,
    request_digest: hexDigest(o.requestLabel),
    response_digest: responseDigest,
    custody_path_digest: custodyPathDigest(hops.map(hopReceiptDigest)),
    model_identity_digest: hexDigest(o.modelLabel),
    relay_chain_digest: hexDigest(o.relayChainLabel),
    trace_custody_observed: o.receiptTraceCustodyObserved,
    tool_surface_digest: SURFACE,
    receipt_epoch: o.receiptEpochOverride ?? o.runEpoch,
  };
  const receiptSignature = signObject(unsignedReceipt, "provider");
  let custodyReceipt = { ...unsignedReceipt, signature: receiptSignature };
  let receipt_ok = verifyObjectSignature(unsignedReceipt, receiptSignature, "provider");
  if (o.corruptReceiptSig) {
    custodyReceipt = { ...custodyReceipt, signature: corruptSignature(receiptSignature) };
    receipt_ok = verifyObjectSignature(unsignedReceipt, custodyReceipt.signature, "provider");
  }
  if (o.mutateReceiptPostSign) {
    // Content corrupted AFTER a genuine signature was computed over the honest content —
    // models "the shape was tampered independent of signature validity" (malformed-receipt).
    custodyReceipt = o.mutateReceiptPostSign(custodyReceipt);
  }

  // Observed
  const observed = {
    endpoint_digest: hexDigest(o.observedEndpointLabel ?? o.endpointLabel),
    model_identity_digest: hexDigest(o.observedModelLabel ?? o.modelLabel),
    account_pool_observed: o.observedAccountPoolObserved,
    trace_custody_observed: o.observedTraceCustodyObserved,
    tool_surface_digest: o.observedToolSurfaceOverride ?? SURFACE,
    transform_digests: (o.observedTransformLabels ?? o.transformDeclaredLabels).map(hexDigest),
  };

  return {
    envelope,
    envelopeDigest,
    hops,
    custodyReceipt,
    responseDigest,
    requestDigest: o.outerRequestDigestOverride ?? hexDigest(o.requestLabel),
    sig: { envelope_ok, hops_ok, receipt_ok },
    observed,
    stage4o_surface_commitment_digest: SURFACE,
    cpc: {
      signals: o.cpcSignals,
      declared_cap: o.cpcDeclaredCap,
      anchor_digests: o.cpcAnchorDigests ?? [CURRENT_ANCHOR],
    },
  };
}

// --- Lane A: fixed arm corpus --------------------------------------------------------------
const laneAArms = [
  {
    name: "green-direct",
    opts: {
      relayPolicy: "direct_only",
      declaredRelayNames: ["relay-one"],
      traceCustody: "provider_only",
      receiptTraceCustodyObserved: "provider_only",
      observedTraceCustodyObserved: "provider_only",
      hopSpecs: [{ relayName: "relay-one", inputLabel: "direct-hop-input" }],
    },
    expected: { raw: 0, reason: "accepted" },
  },
  { name: "green-declared-relay", opts: {}, expected: { raw: 0, reason: "accepted" } },
  {
    name: "fault-67",
    opts: {},
    expected: { raw: 67, reason: "absent" },
    forceNullEnvelope: true,
  },
  {
    name: "fault-68",
    opts: { corruptHopSig: 0 },
    expected: { raw: 68, reason: "hop_signature_invalid" },
  },
  {
    name: "fault-69",
    opts: { runEpoch: 25 },
    expected: { raw: 69, reason: "run_epoch_outside_validity_window" },
  },
  {
    name: "fault-70",
    opts: { observedEndpointLabel: "endpoint-rogue" },
    expected: { raw: 70, reason: "declared_endpoint_digest_mismatch" },
  },
  {
    name: "fault-71",
    opts: {
      hopSpecs: [
        { relayName: "relay-one", inputLabel: "hop-input-1" },
        { relayName: "relay-hidden", inputLabel: "hop-input-2" },
      ],
    },
    expected: { raw: 71, reason: "relay_not_declared" },
  },
  {
    name: "fault-72",
    opts: { observedModelLabel: "model-rogue" },
    expected: { raw: 72, reason: "model_identity_digest_mismatch" },
  },
  {
    name: "fault-73",
    opts: { observedAccountPoolObserved: true },
    expected: { raw: 73, reason: "account_boundary_undeclared_pool" },
  },
  {
    name: "fault-74",
    opts: { observedTraceCustodyObserved: "unknown" },
    expected: { raw: 74, reason: "trace_custody_expanded_beyond_declaration" },
  },
  {
    name: "fault-75",
    opts: { observedToolSurfaceOverride: hexDigest("surface-rogue") },
    expected: { raw: 75, reason: "stage4o_surface_binding_mismatch" },
  },
  {
    name: "fault-76",
    opts: { observedTransformLabels: ["transform-rogue"] },
    expected: { raw: 76, reason: "transform_not_declared" },
  },
  {
    name: "fault-77",
    opts: { outerRequestDigestOverride: hexDigest("request-outer-rogue") },
    expected: { raw: 77, reason: "binding_mismatch" },
  },
  {
    name: "fault-78",
    opts: { hopSpecs: [] },
    expected: { raw: 78, reason: "missing_hop" },
  },
  {
    name: "fault-79",
    opts: {},
    expected: { raw: 79, reason: "window_anchor_not_in_feed" },
    isFault79: true,
  },
  {
    name: "laundering-beats-model-swap",
    opts: {
      hopSpecs: [
        { relayName: "relay-one", inputLabel: "hop-input-1", outputLabel: "hop-intermediate-0" },
      ],
      observedModelLabel: "model-rogue",
    },
    expected: { raw: 78, reason: "terminal_response_mismatch" },
  },
  {
    name: "signature-beats-laundering",
    opts: {
      hopSpecs: [
        { relayName: "relay-one", inputLabel: "hop-input-1", outputLabel: "hop-intermediate-0" },
      ],
      corruptReceiptSig: true,
    },
    expected: { raw: 68, reason: "receipt_signature_invalid" },
  },
  {
    name: "endpoint-beats-relay",
    opts: { observedEndpointLabel: "endpoint-rogue", declaredRelayNames: ["relay-one"] },
    expected: { raw: 70, reason: "declared_endpoint_digest_mismatch" },
  },
  { name: "epoch-edge-low", opts: { runEpoch: 10 }, expected: { raw: 0, reason: "accepted" } },
  { name: "epoch-edge-high", opts: { runEpoch: 20 }, expected: { raw: 0, reason: "accepted" } },
  {
    name: "unknown-enum",
    opts: { providerFamily: "quantum" },
    expected: { raw: 67, reason: "schema_invalid" },
  },
  {
    name: "malformed-receipt",
    opts: { mutateReceiptPostSign: (r) => ({ ...r, trace_custody_observed: "psychic" }) },
    expected: { raw: 77, reason: "receipt_schema_invalid" },
  },
  {
    name: "fault-78-reordered-hop",
    opts: {
      hopSpecs: [
        {
          relayName: "relay-one",
          inputLabel: "hop-input-1",
          outputLabel: "hop-intermediate-0",
          hopIndexOverride: 5,
        },
        { relayName: "relay-two", inputLabel: "hop-input-2" },
      ],
    },
    expected: { raw: 78, reason: "reordered_hop" },
  },
  {
    name: "fault-78-non-linking-hop",
    opts: {
      hopSpecs: [
        { relayName: "relay-one", inputLabel: "hop-input-1", outputLabel: "hop-intermediate-0" },
        {
          relayName: "relay-two",
          inputLabel: "hop-input-2",
          prevDigestOverride: hexDigest("wrong-prev-link"),
        },
      ],
    },
    expected: { raw: 78, reason: "non_linking_previous_digest" },
  },
  {
    name: "fault-78-duplicated-hop",
    opts: {
      hopSpecs: [
        { relayName: "relay-one", inputLabel: "dup-input", outputLabel: "dup-output" },
        { relayName: "relay-one", inputLabel: "dup-input", outputLabel: "dup-output" },
      ],
    },
    expected: { raw: 78, reason: "duplicated_hop" },
  },
];

for (const arm of laneAArms) {
  let input = buildInput(arm.opts);
  if (arm.forceNullEnvelope) input = { ...input, envelope: null };
  if (arm.isFault79) {
    const rogueSignal = buildCpcSignal({
      failure_class: "undeclared_proxy_hop",
      stage4n_window_anchor_digest: ROGUE_ANCHOR,
      evidence_kind: "relay_spki_sha256",
      observed_evidence_digest: hexDigest("fault-79-evidence"),
      disclosure_budget_max_signals_per_window: 2,
    });
    input = { ...input, cpc: { ...input.cpc, signals: [rogueSignal] } };
  }
  const result = verifyCustody(input);
  if (result.raw !== arm.expected.raw) {
    fail(`arm ${arm.name}: expected raw ${arm.expected.raw}, got ${result.raw} (${result.reason})`);
  }
  if (arm.expected.raw !== 0 && result.reason !== arm.expected.reason) {
    fail(`arm ${arm.name}: expected reason ${arm.expected.reason}, got ${result.reason}`);
  }
  write(`lane-a/${arm.name}/input.json`, input);
  write(`lane-a/${arm.name}/expected.json`, arm.expected);
}

// --- Lane C: public-report-motivated synthetic arm -----------------------------------------
let laneCInput = buildInput({
  declaredRelayNames: ["provider"],
  modelLabel: "example-base-model",
  observedModelLabel: "example-premium-model",
  hopSpecs: [
    {
      relayName: "relay-hidden",
      relayIdentityLabelOverride: "example-transfer-station",
      inputLabel: "public-report-hop-input",
    },
  ],
  responseLabel: "public-report-response",
  requestLabel: "public-report-request",
});
laneCInput = { ...laneCInput, source_note: "public_report_motivated_synthetic" };
const laneCExpected = { raw: 71, reason: "relay_not_declared" };
const laneCResult = verifyCustody(laneCInput);
if (laneCResult.raw !== laneCExpected.raw || laneCResult.reason !== laneCExpected.reason) {
  fail(`lane-c arm mismatch: ${JSON.stringify(laneCResult)}`);
}
write("lane-c/public-report-motivated/input.json", laneCInput);
write("lane-c/public-report-motivated/expected.json", laneCExpected);

// --- CPC arms (five, §9) ---------------------------------------------------------------
const matchInput = {
  failure_class: "undeclared_proxy_hop",
  stage4n_window_anchor_digest: CURRENT_ANCHOR,
  evidence_kind: "relay_spki_sha256",
  observed_evidence_digest: hexDigest("cpc-match-evidence"),
  disclosure_budget_max_signals_per_window: 2,
};
const operatorASignal = buildCpcSignal(matchInput);
const operatorBSignalMatch = buildCpcSignal({ ...matchInput });
if (operatorASignal.custody_class_digest !== operatorBSignalMatch.custody_class_digest) {
  fail("cpc/match: operator-a and operator-b custody_class_digest did not match");
}
write("cpc/match.json", {
  operator_a: { input: matchInput, signal: operatorASignal },
  operator_b: { input: matchInput, signal: operatorBSignalMatch },
});

const differInputB = { ...matchInput, observed_evidence_digest: hexDigest("cpc-differ-evidence") };
const operatorBSignalDiffer = buildCpcSignal(differInputB);
if (operatorASignal.custody_class_digest === operatorBSignalDiffer.custody_class_digest) {
  fail("cpc/differ: custody_class_digest unexpectedly matched");
}
write("cpc/differ.json", {
  operator_a: { input: matchInput, signal: operatorASignal },
  operator_b: { input: differInputB, signal: operatorBSignalDiffer },
});

const crossWindowInput = { ...matchInput, stage4n_window_anchor_digest: NEXT_ANCHOR };
const operatorBSignalCrossWindow = buildCpcSignal(crossWindowInput);
if (operatorASignal.custody_class_digest === operatorBSignalCrossWindow.custody_class_digest) {
  fail("cpc/cross-window: custody_class_digest unexpectedly matched across windows");
}
if (
  operatorASignal.windowed_evidence_commitment ===
  operatorBSignalCrossWindow.windowed_evidence_commitment
) {
  fail("cpc/cross-window: windowed_evidence_commitment unexpectedly matched across windows");
}
write("cpc/cross-window.json", {
  operator_a: { input: matchInput, signal: operatorASignal },
  operator_b: { input: crossWindowInput, signal: operatorBSignalCrossWindow },
});

const degradedInput = { ...matchInput, evidence_kind: "low_entropy_or_unknown" };
const degradedSignal = buildCpcSignal(degradedInput);
if ("custody_class_digest" in degradedSignal) fail("cpc/degraded: unexpectedly carries a digest");
write("cpc/degraded.json", { operator_a: { input: degradedInput, signal: degradedSignal } });

const budgetSignals = [
  buildCpcSignal({ ...matchInput, failure_class: "undeclared_proxy_hop" }),
  buildCpcSignal({ ...matchInput, failure_class: "model_identity_mismatch" }),
  buildCpcSignal({ ...matchInput, failure_class: "account_pool_ambiguity" }),
];
const budgetResult = verifyCpcEmission({
  signals: budgetSignals,
  declared_cap: 2,
  anchor_digests: [CURRENT_ANCHOR],
});
if (
  budgetResult.ok !== false ||
  budgetResult.raw !== 79 ||
  budgetResult.reason !== "disclosure_budget_exceeded"
) {
  fail(`cpc/budget: unexpected verifyCpcEmission result ${JSON.stringify(budgetResult)}`);
}
write("cpc/budget.json", {
  signals: budgetSignals,
  declared_cap: 2,
  anchor_digests: [CURRENT_ANCHOR],
  expected: { ok: false, raw: 79, reason: "disclosure_budget_exceeded" },
});

// --- Invention layer arms ----------------------------------------------------------------
const pincerSignalInput = {
  failure_class: "undeclared_proxy_hop",
  stage4n_window_anchor_digest: CURRENT_ANCHOR,
  evidence_kind: "relay_spki_sha256",
  observed_evidence_digest: hexDigest("pincer-match-evidence"),
  disclosure_budget_max_signals_per_window: 4,
};
const pincerSignal = buildCpcSignal(pincerSignalInput);

function buildEnforcementCommitment(signerName, customClassDigest, windowAnchor) {
  const unsigned = {
    schema: SCHEMAS.ENFORCEMENT,
    stage4n_window_anchor_digest: windowAnchor,
    custody_class_digest: customClassDigest,
    action_class: "account_cluster_ban",
    count_commitment: hexDigest(`${signerName}-enforcement-count`),
    signer_public_key: Buffer.from(keys[signerName].publicPem).toString("base64"),
  };
  const signature = signObject(unsigned, signerName);
  const commitment = { ...unsigned, signature };
  const shape = validateEnforcementCommitment(commitment);
  if (!shape.ok) fail(`enforcement commitment (${signerName}) failed shape check`);
  return commitment;
}

// pincer-match: operator-a's commitment, corroborated by an independently-computed signal
// sharing BOTH the custody class digest and the window anchor.
const commitmentMatch = buildEnforcementCommitment(
  "operator-a",
  pincerSignal.custody_class_digest,
  CURRENT_ANCHOR
);
const corroboratedMatch = pincerCorroborated({
  commitment: commitmentMatch,
  signals: [pincerSignal],
});
if (corroboratedMatch !== true) fail("invention/pincer-match: expected corroboration");
write("invention/pincer-match.json", {
  commitment: commitmentMatch,
  signals: [pincerSignal],
  expected_corroborated: true,
});

// pincer-window-mismatch: operator-b's commitment (same class digest, same anchor), but the
// submitted signal shares the class digest with a DIFFERENT window anchor — not corroborated.
const commitmentWindowMismatch = buildEnforcementCommitment(
  "operator-b",
  pincerSignal.custody_class_digest,
  CURRENT_ANCHOR
);
const mismatchSignalWindow = { ...pincerSignal, stage4n_window_anchor_digest: NEXT_ANCHOR };
const corroboratedWindowMismatch = pincerCorroborated({
  commitment: commitmentWindowMismatch,
  signals: [mismatchSignalWindow],
});
if (corroboratedWindowMismatch !== false) {
  fail("invention/pincer-window-mismatch: expected non-corroboration");
}
write("invention/pincer-window-mismatch.json", {
  commitment: commitmentWindowMismatch,
  signals: [mismatchSignalWindow],
  expected_corroborated: false,
});

// pincer-class-mismatch: operator-c's commitment (same anchor, same class digest), but the
// submitted signal shares the anchor with a DIFFERENT class digest — not corroborated.
const commitmentClassMismatch = buildEnforcementCommitment(
  "operator-c",
  pincerSignal.custody_class_digest,
  CURRENT_ANCHOR
);
const mismatchSignalClass = {
  ...pincerSignal,
  custody_class_digest: hexDigest("pincer-class-mismatch-forged-digest"),
};
const corroboratedClassMismatch = pincerCorroborated({
  commitment: commitmentClassMismatch,
  signals: [mismatchSignalClass],
});
if (corroboratedClassMismatch !== false) {
  fail("invention/pincer-class-mismatch: expected non-corroboration");
}
write("invention/pincer-class-mismatch.json", {
  commitment: commitmentClassMismatch,
  signals: [mismatchSignalClass],
  expected_corroborated: false,
});

// contest-valid / contest-forged
const contestUnsignedValid = {
  schema: SCHEMAS.CONTEST,
  contested_custody_class_digest: pincerSignal.custody_class_digest,
  stage4n_window_anchor_digest: CURRENT_ANCHOR,
  relay_identity_digest: keys["contest-relay"].identityDigest,
  counter_evidence_digest: hexDigest("contest-counter-evidence"),
};
const contestValidSig = signObject(contestUnsignedValid, "contest-relay");
const contestValid = { ...contestUnsignedValid, signature: contestValidSig };
const signerNameValid = resolveSigner(contestUnsignedValid, contestValidSig, KEY_NAMES);
if (!signerNameValid) fail("contest-valid: could not resolve real signer");
const signerDigestValid = keys[signerNameValid].identityDigest;
const resultValid = validateRelayContest(contestValid, { signerKeyDigest: signerDigestValid });
if (!resultValid.ok)
  fail(`invention/contest-valid: expected ok, got ${JSON.stringify(resultValid)}`);
write("invention/contest-valid.json", {
  contest: contestValid,
  signer_key_digest: signerDigestValid,
  expected: { ok: true },
});

const contestUnsignedForged = {
  ...contestUnsignedValid,
  relay_identity_digest: keys["relay-hidden"].identityDigest,
};
const contestForgedSig = signObject(contestUnsignedForged, "contest-relay");
const contestForged = { ...contestUnsignedForged, signature: contestForgedSig };
const signerNameForged = resolveSigner(contestUnsignedForged, contestForgedSig, KEY_NAMES);
if (!signerNameForged) fail("contest-forged: could not resolve real signer");
const signerDigestForged = keys[signerNameForged].identityDigest;
const resultForged = validateRelayContest(contestForged, { signerKeyDigest: signerDigestForged });
if (
  resultForged.ok !== false ||
  resultForged.raw !== 68 ||
  resultForged.reason !== "contest_signer_mismatch"
) {
  fail(`invention/contest-forged: unexpected result ${JSON.stringify(resultForged)}`);
}
write("invention/contest-forged.json", {
  contest: contestForged,
  signer_key_digest: signerDigestForged,
  expected: { ok: false, raw: 68, reason: "contest_signer_mismatch" },
});

// disclosure
const disclosureSubject = {
  provider_family: "self_hosted",
  declared_relay_digests: [keys["relay-one"].identityDigest, keys["relay-two"].identityDigest],
  trace_custody: "declared_relay",
  verification_raw: 0,
};
const body0Digest = domainDigest(DOMAINS.ATTESTATION_BUNDLE, SCHEMAS.ATTESTATION, {
  corpus: "stage4p-task8-fixtures",
  subject_ref: "green-declared-relay",
});
const disclosure = projectVendorDisclosure(body0Digest, disclosureSubject);
const disclosureCheck = verifyVendorDisclosure(disclosure, body0Digest, disclosureSubject);
if (!disclosureCheck.ok) fail("invention/disclosure: recompute failed");
write("invention/disclosure.json", {
  attestation_digest: body0Digest,
  subject: disclosureSubject,
  disclosure,
  expected: { ok: true },
});

// bridge
const bridgeCpcDigest = operatorASignal.custody_class_digest;
const bridgeStage3tDigest = hexDigest("stage3t-attestation-stand-in-task8");
const bridge = {
  cpc_custody_class_digest: bridgeCpcDigest,
  stage3t_attestation_digest: bridgeStage3tDigest,
  bridge_mode: "digest_binding_only",
};
const bridgeCtx = { knownCpcDigests: [bridgeCpcDigest], known3tDigests: [bridgeStage3tDigest] };
const bridgeResult = validateExtractionBridge(bridge, bridgeCtx);
if (!bridgeResult.ok) fail("invention/bridge: expected ok");
write("invention/bridge.json", {
  bridge,
  known_cpc_digests: bridgeCtx.knownCpcDigests,
  known_3t_digests: bridgeCtx.known3tDigests,
  expected: { ok: true },
});

console.log(
  `stage4p fixtures written to ${OUT}: ${laneAArms.length} lane-a arms, 1 lane-c arm, 5 cpc arms, 7 invention arms`
);
