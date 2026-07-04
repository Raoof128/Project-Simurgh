// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4O deterministic fixture builder (4O spec §7). Constructs the clean commitment
// chain and every tamper arm PROGRAMMATICALLY (never hand-edited JSON), signs commitments
// with the committed fixture manifest key, and emits the expected-results matrix + parity
// vectors. Honours STAGE4O_FIXTURE_OUT for temp regeneration (reproduce `cmp`).
//
// The `signature-mismatch` arm uses the literal string "TAMPERED" as its signature so BOTH
// the Node Ed25519 verify AND the Python injected stub detect it (Python stays crypto-free).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createPrivateKey, sign as edSign } from "node:crypto";
import { domainDigest } from "../core/digest.mjs";
import { surfacePath } from "../core/merkleSurface.mjs";
import {
  computeToolsetRoot,
  toolEntryDigest,
  commitmentDigest,
  deltaDigest,
} from "../core/manifestCore.mjs";
import {
  DOMAINS,
  TOOL_MANIFEST_SCHEMA,
  COMMITMENT_SCHEMA,
  RECEIPT_SCHEMA,
  ACTION_SCHEMA,
  GENESIS,
} from "../constants.mjs";

const OUT = process.env.STAGE4O_FIXTURE_OUT ?? "tests/fixtures/llmShield/stage4o";
const KEY = "tests/fixtures/llmShield/stage4o/test-keys/INSECURE_FIXTURE_ONLY_manifest-signer.pem";
const manifestKey = createPrivateKey(readFileSync(KEY, "utf8"));
const manifestPubPem = JSON.parse(
  readFileSync("tests/fixtures/llmShield/stage4o/vtsa-manifest-signer.pub", "utf8")
).public_key_pem;
const write = (rel, obj) => {
  const p = join(OUT, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
};

const entry = (i, over = {}) => ({
  tool_name_digest: domainDigest(DOMAINS.SERVER_ID, "fx-name", `tool-${i}`),
  tool_schema_digest: domainDigest(DOMAINS.SERVER_ID, "fx-schema", `schema-${i}`),
  authority_class: "read_only",
  declared_sinks: [],
  risk_class: "low",
  ...over,
});
const manifest = (entries) => {
  const tools = [...entries].sort((a, b) => (a.tool_name_digest < b.tool_name_digest ? -1 : 1));
  const m = {
    schema: TOOL_MANIFEST_SCHEMA,
    server_id_digest: domainDigest(DOMAINS.SERVER_ID, "fx", "srv"),
    toolset_digest: "sha256:" + "0".repeat(64),
    tools,
  };
  m.toolset_digest = computeToolsetRoot(m);
  return m;
};

// Build a signed envelope. `signAs` = "valid" | "tampered". `preSign` overrides fields
// BEFORE signing (so the signature stays valid over a deliberately-inconsistent body).
function envelope(m, epoch, prevEnv, consent, signAs = "valid", preSign = {}) {
  const env = {
    schema: COMMITMENT_SCHEMA,
    manifest: m,
    manifest_epoch: epoch,
    valid_from_epoch: epoch * 10,
    valid_until_epoch: epoch * 10 + 9,
    previous_manifest_digest: prevEnv ? commitmentDigest(prevEnv) : GENESIS,
    delta_digest: prevEnv ? deltaDigest(prevEnv.manifest, m) : GENESIS,
    consent_binding: consent,
    signer_public_key_pem: manifestPubPem,
    signature: "PLACEHOLDER",
    ...preSign,
  };
  if (signAs === "tampered") {
    env.signature = "TAMPERED";
  } else {
    env.signature = edSign(null, Buffer.from(commitmentDigest(env)), manifestKey).toString(
      "base64"
    );
  }
  return env;
}

function receiptFor(m, toolNameDigest, over = {}) {
  const idx = m.tools.findIndex((t) => t.tool_name_digest === toolNameDigest);
  const e = m.tools[idx];
  return {
    schema: RECEIPT_SCHEMA,
    tool_name_digest: e.tool_name_digest,
    tool_schema_digest: e.tool_schema_digest,
    authority_class: e.authority_class,
    sinks_used: [],
    inclusion_proof: surfacePath(m.tools.map(toolEntryDigest), idx),
    run_epoch: 12,
    run_id_digest: domainDigest(DOMAINS.RECEIPT, "run", "fx-run"),
    ...over,
  };
}
const actDigest = (tag = "egress") => domainDigest(DOMAINS.ACTION, ACTION_SCHEMA, { family: tag });

// --- The clean 3-epoch chain (committed for docs/verifier) -----------------------------
const egressTool = entry(3, { authority_class: "egress" });
const m0 = manifest([entry(1), entry(2)]);
const m1 = manifest([entry(1), entry(2), egressTool]); // broaden: add egress tool
const m2 = manifest([entry(1), entry(2)]); // narrow: drop it
const c0 = envelope(m0, 0, null, "state");
const c1 = envelope(m1, 1, c0, "delta"); // delta-bound broadening
const c2 = envelope(m2, 2, c1, "state"); // state-bound narrowing
const cleanChain = [c0, c1, c2];
write("chains/clean-chain.json", { chain: cleanChain });

// --- Arms ------------------------------------------------------------------------------
const arms = [];
const add = (arm, chain, receipt, action_digest, expected_raw, expected_reason) =>
  arms.push({ arm, chain, receipt, action_digest, expected_raw, expected_reason });

// Head for the healthy arms is a signed genesis with two tools. Genesis validity window
// is [0,9], so the receipt's run_epoch must sit inside it (stale-replay overrides to 999).
const gEnv = envelope(m0, 0, null, "state");
const gReceipt = receiptFor(m0, entry(1).tool_name_digest, { run_epoch: 5 });
const ad = actDigest();

add("missing-manifest", null, gReceipt, ad, 55, "absent");
add("schema-invalid-manifest", [{ ...gEnv, extra: 1 }], gReceipt, ad, 55, "schema_invalid");
add(
  "signature-mismatch",
  [envelope(m0, 0, null, "state", "tampered")],
  gReceipt,
  ad,
  56,
  "commitment_signature_invalid"
);
add(
  "stale-manifest-replay",
  [gEnv],
  { ...gReceipt, run_epoch: 999 },
  ad,
  57,
  "run_epoch_outside_validity_window"
);

// 58: single genesis, valid-format-but-wrong toolset root, RE-SIGNED so the sig is valid.
const tampered58 = { ...m0, toolset_digest: "sha256:" + "d".repeat(64) };
add(
  "server-toolset-change-genesis",
  [envelope(tampered58, 0, null, "state")],
  gReceipt,
  ad,
  58,
  "toolset_root_recompute_mismatch"
);

add(
  "tool-added-post-approval",
  [gEnv],
  { ...gReceipt, tool_name_digest: entry(9).tool_name_digest },
  ad,
  59,
  "tool_not_in_manifest"
);
add(
  "invalid-inclusion-proof",
  [gEnv],
  { ...gReceipt, inclusion_proof: [] },
  ad,
  59,
  "inclusion_proof_invalid"
);
add(
  "schema-changed",
  [gEnv],
  { ...gReceipt, tool_schema_digest: entry(9).tool_schema_digest },
  ad,
  60,
  "schema_digest_mismatch"
);
add(
  "readonly-to-write",
  [gEnv],
  { ...gReceipt, authority_class: "write" },
  ad,
  61,
  "authority_class_upgrade"
);
add(
  "destructive-under-harmless-name",
  [gEnv],
  { ...gReceipt, authority_class: "destructive" },
  ad,
  61,
  "authority_class_upgrade"
);
add(
  "sink-expansion",
  [gEnv],
  { ...gReceipt, sinks_used: [entry(9).tool_schema_digest] },
  ad,
  62,
  "sink_not_declared"
);
add("receipt-binding-mismatch", [gEnv], gReceipt, "not-a-digest", 63, "binding_mismatch");

// 64: epoch-1 body is the malicious m1prime, but delta_digest was computed for the
// innocent m1 and the envelope is RE-SIGNED (so the signature is valid, 56 passes, and
// the verifier's delta recompute over the real bodies exposes the swap -> 64).
const launderC0 = envelope(m0, 0, null, "state");
const m1prime = manifest([entry(1), entry(2), entry(4, { authority_class: "egress" })]);
const launderC1 = envelope(m1prime, 1, launderC0, "delta", "valid", {
  delta_digest: deltaDigest(m0, m1),
});
add(
  "laundering-chain",
  [launderC0, launderC1],
  receiptFor(m0, entry(1).tool_name_digest),
  ad,
  64,
  "delta_digest_mismatch"
);

// 65: broaden with state binding.
const blindC0 = envelope(m0, 0, null, "state");
const blindC1 = envelope(m1, 1, blindC0, "state");
add(
  "blind-reapproval",
  [blindC0, blindC1],
  receiptFor(m1, entry(1).tool_name_digest),
  ad,
  65,
  "state_bound_broadening"
);

// GREEN arms (anti-theatre).
add("green-unchanged", [gEnv], gReceipt, ad, 0, "accepted");
const narrowC0 = envelope(m0, 0, null, "state");
const narrowC1 = envelope(manifest([entry(1)]), 1, narrowC0, "state");
add(
  "green-state-narrowing",
  [narrowC0, narrowC1],
  receiptFor(manifest([entry(1)]), entry(1).tool_name_digest, { run_epoch: 12 }),
  ad,
  0,
  "accepted"
);
const broadenC0 = envelope(m0, 0, null, "state");
const broadenC1 = envelope(m1, 1, broadenC0, "delta");
add(
  "green-delta-broadening",
  [broadenC0, broadenC1],
  receiptFor(m1, egressTool.tool_name_digest, { authority_class: "egress", run_epoch: 12 }),
  ad,
  0,
  "accepted"
);

arms.sort((a, b) => (a.arm < b.arm ? -1 : 1));
for (const a of arms) write(`arms/${a.arm}.json`, a);
write(
  "expected-results/vtsa-matrix.json",
  arms.map((a) => ({
    arm: a.arm,
    expected_raw: a.expected_raw,
    expected_reason: a.expected_reason,
  }))
);

// --- Parity vectors --------------------------------------------------------------------
const parityInputs = [
  { description: "empty object", domain: DOMAINS.TOOL_ENTRY, schema: "s", value: {} },
  {
    description: "nested key sort",
    domain: DOMAINS.DELTA,
    schema: "s",
    value: { b: 2, a: { y: 0, x: 1 } },
  },
  {
    description: "array of objects",
    domain: DOMAINS.ACTION,
    schema: "s",
    value: [1, { z: 9, a: 1 }, 2],
  },
  { description: "unicode string", domain: DOMAINS.SERVER_ID, schema: "s", value: "café ☕ 日本" },
  { description: "empty array", domain: DOMAINS.TOOLSET, schema: "s", value: [] },
  {
    description: "boolean and null",
    domain: DOMAINS.RECEIPT,
    schema: "s",
    value: { a: true, b: false, c: null },
  },
  { description: "integer", domain: DOMAINS.TIMELINE, schema: "s", value: 42 },
  {
    description: "merkle leaf domain",
    domain: DOMAINS.MERKLE_LEAF,
    schema: TOOL_MANIFEST_SCHEMA,
    value: "sha256:" + "a".repeat(64),
  },
  {
    description: "merkle node domain",
    domain: DOMAINS.MERKLE_NODE,
    schema: TOOL_MANIFEST_SCHEMA,
    value: ["sha256:" + "a".repeat(64), "sha256:" + "b".repeat(64)],
  },
  {
    description: "commitment domain",
    domain: DOMAINS.MANIFEST_COMMITMENT,
    schema: COMMITMENT_SCHEMA,
    value: { epoch: 0 },
  },
  {
    description: "decision corpus domain",
    domain: DOMAINS.DECISION_CORPUS,
    schema: "s",
    value: { arms: 18 },
  },
  {
    description: "attestation bundle domain",
    domain: DOMAINS.ATTESTATION_BUNDLE,
    schema: "s",
    value: { v: 1 },
  },
];
write(
  "parity/canonical-parity.json",
  parityInputs.map((v) => ({ ...v, digest: domainDigest(v.domain, v.schema, v.value) }))
);

console.log(
  `stage4o fixtures written to ${OUT}: ${arms.length} arms + clean chain + parity vectors`
);
