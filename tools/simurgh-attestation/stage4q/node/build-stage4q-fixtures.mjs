// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q Lane-A normative corpus builder (4Q spec §3.1). Deterministic pure function of
// the committed fixture keys + the committed 4N feed. Every signature is a REAL Ed25519
// signature over canonicalJson of the unsigned object — nothing is hand-typed.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from "node:crypto";
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS } from "../constants.mjs";
import {
  approvalReceiptDigest,
  approvalExemptionDigest,
  crossingDigest,
  publicKeyDigest,
} from "../core/digest.mjs";
import { buildChain, verifyChain } from "../core/chainCore.mjs";
import { decide } from "../core/pincerCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const KEY_DIR = join(REPO, "tests/fixtures/llmShield/stage4q/test-keys");
const LANE_A = join(REPO, "tests/fixtures/llmShield/stage4q/lane-a");
const ANCHOR_PATH = join(REPO, "tests/fixtures/llmShield/stage4q/stage4n-anchor.json");
const FEED = "tests/fixtures/llmShield/stage4n/feed/heartbeat-feed.jsonl";

// ---- keys ------------------------------------------------------------------------------
const KEY_NAMES = ["approver", "harness", "human-terminal"];
const keys = {};
for (const name of KEY_NAMES) {
  const priv = createPrivateKey(
    readFileSync(join(KEY_DIR, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8")
  );
  const pub = createPublicKey(priv);
  const pubPem = pub.export({ type: "spki", format: "pem" });
  keys[name] = { priv, pub, pubPem, digest: publicKeyDigest(pubPem) };
}
const APPROVER = keys.approver.digest;
const HARNESS = keys.harness.digest;

function signWith(name, unsigned) {
  return edSign(null, Buffer.from(canonicalJson(unsigned)), keys[name].priv).toString("base64");
}

// ---- 4N anchor -------------------------------------------------------------------------
const firstLine = readFileSync(join(REPO, FEED), "utf8").split("\n").filter(Boolean)[0];
const parsed = JSON.parse(firstLine);
const ANCHOR_DIGEST = `sha256:${sha256Hex(firstLine)}`;
const ANCHOR = {
  source_path: FEED,
  current_window_id: parsed.window_id,
  stage4n_window_anchor_digest: ANCHOR_DIGEST,
};

const RUN_ID = `sha256:${sha256Hex("stage4q-lane-a-run.v1")}`;

// ---- base (fully-valid green) ----------------------------------------------------------
function baseEnvelope(overrides = {}) {
  return {
    schema: SCHEMAS.ENVELOPE,
    policy_id: "vfr-default.v1",
    boundary_kinds_requiring_approval: ["tool_execution", "unsafe_export"],
    admissible_exemption_boundary_kinds: [],
    approver_public_key_digest: APPROVER,
    harness_public_key_digest: HARNESS,
    max_window_straddle: 1,
    run_id_digest: RUN_ID,
    stage4n_window_anchor_digest: ANCHOR_DIGEST,
    ...overrides,
  };
}
function makeReceipt(overrides = {}, signerName = "approver") {
  const unsigned = {
    schema: SCHEMAS.APPROVAL_RECEIPT,
    action_digest: `sha256:${sha256Hex("action.send_email")}`,
    request_digest: `sha256:${sha256Hex("request.user_task")}`,
    boundary_kind: "tool_execution",
    stage4n_window_anchor_digest: ANCHOR_DIGEST,
    run_id_digest: RUN_ID,
    receipt_epoch: 10,
    valid_from_epoch: 10,
    valid_until_epoch: 11,
    nonce_digest: `sha256:${sha256Hex("nonce.0001")}`,
    approval_display_digest: `sha256:${sha256Hex("Approve send_email to bob@declared?")}`,
    approver_public_key_digest: APPROVER,
    ...overrides,
  };
  return { ...unsigned, signature: signWith(signerName, unsigned) };
}
function makeExemption(overrides = {}) {
  const unsigned = {
    schema: SCHEMAS.APPROVAL_EXEMPTION,
    action_digest: `sha256:${sha256Hex("action.read_public")}`,
    request_digest: `sha256:${sha256Hex("request.user_task")}`,
    boundary_kind: "tool_execution",
    run_id_digest: RUN_ID,
    stage4n_window_anchor_digest: ANCHOR_DIGEST,
    exemption_reason: "approval_not_present",
    exemption_policy_id: "vfr-default.v1",
    harness_public_key_digest: HARNESS,
    ...overrides,
  };
  return { ...unsigned, signature: signWith("harness", unsigned) };
}
function makeCrossing(bindingKind, bindingDigest, overrides = {}) {
  const unsigned = {
    schema: SCHEMAS.BOUNDARY_CROSSING,
    action_digest: `sha256:${sha256Hex("action.send_email")}`,
    request_digest: `sha256:${sha256Hex("request.user_task")}`,
    boundary_kind: "tool_execution",
    crossing_epoch: 10,
    run_id_digest: RUN_ID,
    approval_binding_kind: bindingKind,
    approval_binding_digest: bindingDigest,
    harness_public_key_digest: HARNESS,
    ...overrides,
  };
  return { ...unsigned, signature: signWith("harness", unsigned) };
}

// receipt-path chain events (approval before crossing)
function receiptChain(receipt, crossing) {
  return [
    { entry_kind: "approval", entry_digest: approvalReceiptDigest(receipt), raw_code: 0 },
    { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
  ];
}

// ---- the 15 cases ----------------------------------------------------------------------
function buildCases() {
  const cases = [];

  // 1 — green_pincer_complete
  {
    const receipt = makeReceipt();
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    cases.push({
      case_id: "green_pincer_complete",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: receipt.approval_display_digest,
    });
  }
  // 2 — green_refusal_bearing (chain carries a ledgered raw-83 refusal, still GREEN)
  {
    const receipt = makeReceipt();
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    const chain = receiptChain(receipt, crossing);
    chain.splice(1, 0, {
      entry_kind: "refusal",
      entry_digest: `sha256:${sha256Hex("ledgered.refusal.83")}`,
      raw_code: 83,
    });
    cases.push({
      case_id: "green_refusal_bearing",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: chain,
      display_expected: receipt.approval_display_digest,
    });
  }
  // 3 — green_exempt (policy admits the exemption)
  {
    const exemption = makeExemption();
    const crossing = makeCrossing("exemption", approvalExemptionDigest(exemption), {
      action_digest: exemption.action_digest,
      request_digest: exemption.request_digest,
      boundary_kind: exemption.boundary_kind,
    });
    cases.push({
      case_id: "green_exempt",
      envelope: baseEnvelope({ admissible_exemption_boundary_kinds: ["tool_execution"] }),
      receipt: null,
      exemption,
      crossing,
      chain_events: [
        { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
      ],
      display_expected: undefined,
    });
  }
  // 80 — malformed envelope
  {
    const receipt = makeReceipt();
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    cases.push({
      case_id: "code_80_envelope_malformed",
      envelope: { ...baseEnvelope(), smuggled_key: true },
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: receipt.approval_display_digest,
    });
  }
  // 81 — corrupted receipt signature (real verify fails)
  {
    const receipt = makeReceipt();
    receipt.signature =
      receipt.signature.slice(0, -2) + (receipt.signature.endsWith("AA") ? "BB" : "AA");
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    cases.push({
      case_id: "code_81_signature_invalid",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: receipt.approval_display_digest,
    });
  }
  // 82 — window straddle exceeded (freeze-3 worked example)
  {
    const receipt = makeReceipt({ valid_until_epoch: 12 });
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt), {
      crossing_epoch: 12,
    });
    cases.push({
      case_id: "code_82_window_straddle_exceeded",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: receipt.approval_display_digest,
    });
  }
  // 83 — receipt absent
  {
    const crossing = makeCrossing("receipt", `sha256:${sha256Hex("dangling")}`);
    cases.push({
      case_id: "code_83_receipt_missing",
      envelope: baseEnvelope(),
      receipt: null,
      exemption: null,
      crossing,
      chain_events: [
        { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
      ],
      display_expected: undefined,
    });
  }
  // 84 — wrong bound digest
  {
    const receipt = makeReceipt();
    const crossing = makeCrossing("receipt", `sha256:${sha256Hex("wrong.binding")}`);
    cases.push({
      case_id: "code_84_binding_digest_mismatch",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: receipt.approval_display_digest,
    });
  }
  // 85 — approval after crossing in the chain
  {
    const receipt = makeReceipt();
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    cases.push({
      case_id: "code_85_approval_not_before_crossing",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: [
        { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
        { entry_kind: "approval", entry_digest: approvalReceiptDigest(receipt), raw_code: 0 },
      ],
      display_expected: receipt.approval_display_digest,
    });
  }
  // 86 — approver key equals harness key (receipt signed by harness)
  {
    const receipt = makeReceipt({ approver_public_key_digest: HARNESS }, "harness");
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    cases.push({
      case_id: "code_86_approver_key_not_distinct",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: receipt.approval_display_digest,
    });
  }
  // 87 — boundary_kind not covered (receipt path)
  {
    const receipt = makeReceipt({ boundary_kind: "privilege_expansion" });
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt), {
      boundary_kind: "privilege_expansion",
    });
    cases.push({
      case_id: "code_87_boundary_kind_not_covered",
      envelope: baseEnvelope({ boundary_kinds_requiring_approval: ["tool_execution"] }),
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: receipt.approval_display_digest,
    });
  }
  // 88 — display digest mismatch
  {
    const receipt = makeReceipt();
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    cases.push({
      case_id: "code_88_display_mismatch",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: receiptChain(receipt, crossing),
      display_expected: `sha256:${sha256Hex("a DIFFERENT rendered prompt")}`,
    });
  }
  // 89 — census mismatch (chain has 2 crossings, census commits 1)
  {
    const receipt = makeReceipt();
    const crossing = makeCrossing("receipt", approvalReceiptDigest(receipt));
    const crossing2 = makeCrossing("receipt", approvalReceiptDigest(receipt), {
      action_digest: `sha256:${sha256Hex("action.second")}`,
    });
    cases.push({
      case_id: "code_89_census_mismatch",
      envelope: baseEnvelope(),
      receipt,
      exemption: null,
      crossing,
      chain_events: [
        { entry_kind: "approval", entry_digest: approvalReceiptDigest(receipt), raw_code: 0 },
        { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
        { entry_kind: "crossing", entry_digest: crossingDigest(crossing2), raw_code: 0 },
      ],
      census: { committed_crossings: 1 },
      display_expected: receipt.approval_display_digest,
    });
  }
  // exemption_refused — default empty allowlist → 87
  {
    const exemption = makeExemption();
    const crossing = makeCrossing("exemption", approvalExemptionDigest(exemption), {
      action_digest: exemption.action_digest,
      request_digest: exemption.request_digest,
      boundary_kind: exemption.boundary_kind,
    });
    cases.push({
      case_id: "exemption_refused",
      envelope: baseEnvelope(),
      receipt: null,
      exemption,
      crossing,
      chain_events: [
        { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
      ],
      display_expected: undefined,
    });
  }
  // exemption_conflict — both receipt AND exemption supplied → 84 binding_kind_conflict
  {
    const receipt = makeReceipt();
    const exemption = makeExemption();
    const crossing = makeCrossing("exemption", approvalExemptionDigest(exemption));
    cases.push({
      case_id: "exemption_conflict",
      envelope: baseEnvelope({ admissible_exemption_boundary_kinds: ["tool_execution"] }),
      receipt,
      exemption,
      crossing,
      chain_events: [
        { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
      ],
      display_expected: undefined,
    });
  }
  return cases;
}

// ---- replay (verifier-side; used by tests + parity) ------------------------------------
export function replayCorpus(corpus) {
  const pubByDigest = corpus.public_keys;
  const verifySignature = (pubDigest, unsigned, sigB64) => {
    const pem = pubByDigest[pubDigest];
    if (!pem) return false;
    try {
      return edVerify(
        null,
        Buffer.from(canonicalJson(unsigned)),
        createPublicKey(pem),
        Buffer.from(sigB64, "base64")
      );
    } catch {
      return false;
    }
  };
  return corpus.cases.map((c) => {
    const { entries, root } = buildChain(c.chain_events);
    const chainVerdict = verifyChain(entries, { expectedRoot: root, census: c.census });
    const out = decide({
      envelope: c.envelope,
      receipt: c.receipt,
      exemption: c.exemption,
      crossing: c.crossing,
      chainEntries: entries,
      chainVerdict,
      verifySignature,
      displayExpected: c.display_expected,
    });
    return { case_id: c.case_id, raw: out.raw, reason: out.reason };
  });
}

function main() {
  const cases = buildCases();
  const corpus = {
    schema: "simurgh.vfr_lane_a_corpus.v1",
    run_id_digest: RUN_ID,
    public_keys: {
      [APPROVER]: keys.approver.pubPem,
      [HARNESS]: keys.harness.pubPem,
      [keys["human-terminal"].digest]: keys["human-terminal"].pubPem,
    },
    cases,
  };
  const expected = replayCorpus(corpus);
  const stable = (v) => JSON.stringify(v, null, 2) + "\n";
  writeFileSync(join(LANE_A, "corpus.json"), stable(corpus));
  writeFileSync(join(LANE_A, "expected-decisions.json"), stable(expected));
  writeFileSync(ANCHOR_PATH, stable(ANCHOR));
  console.log(`stage4q: wrote ${cases.length} Lane-A cases + expected decisions + 4N anchor`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
