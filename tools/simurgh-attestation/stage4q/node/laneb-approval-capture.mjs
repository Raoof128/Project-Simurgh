// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q Lane-B approval-gated capture (4Q spec §3.2). Each arm obtains its approval
// receipt by SPAWNING approver-signer.mjs as a genuinely separate OS process, then gates
// the tool call through the same pincer decide(). Capture is digest-only and replay-only:
// committed once, recomputed offline forever. No network anywhere.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from "node:crypto";
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS } from "../constants.mjs";
import { approvalReceiptDigest, crossingDigest, publicKeyDigest } from "../core/digest.mjs";
import { buildChain, verifyChain } from "../core/chainCore.mjs";
import { decide } from "../core/pincerCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const KEY_DIR = join(REPO, "tests/fixtures/llmShield/stage4q/test-keys");
const LANE_B = join(REPO, "tests/fixtures/llmShield/stage4q/lane-b");
const SIGNER = join(HERE, "approver-signer.mjs");
const FEED = "tests/fixtures/llmShield/stage4n/feed/heartbeat-feed.jsonl";

const KEY_NAMES = ["approver", "harness", "human-terminal"];
const keys = {};
for (const name of KEY_NAMES) {
  const priv = createPrivateKey(
    readFileSync(join(KEY_DIR, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8")
  );
  const pubPem = createPublicKey(priv).export({ type: "spki", format: "pem" });
  keys[name] = {
    path: join(KEY_DIR, `INSECURE_FIXTURE_ONLY_${name}.pem`),
    pubPem,
    digest: publicKeyDigest(pubPem),
  };
}
const APPROVER = keys.approver.digest;
const HARNESS = keys.harness.digest;
const HUMAN = keys["human-terminal"].digest;

const firstLine = readFileSync(join(REPO, FEED), "utf8").split("\n").filter(Boolean)[0];
const ANCHOR_DIGEST = `sha256:${sha256Hex(firstLine)}`;
const RUN_ID = `sha256:${sha256Hex("stage4q-lane-b-run.v1")}`;
const RENDERED = "Approve send_email to bob@declared?";
const DISPLAY = null; // computed below via the signer's own displayDigest

function envelope(overrides = {}) {
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
function unsignedReceipt(overrides = {}) {
  return {
    schema: SCHEMAS.APPROVAL_RECEIPT,
    action_digest: `sha256:${sha256Hex("action.send_email")}`,
    request_digest: `sha256:${sha256Hex("request.user_task")}`,
    boundary_kind: "tool_execution",
    stage4n_window_anchor_digest: ANCHOR_DIGEST,
    run_id_digest: RUN_ID,
    receipt_epoch: 10,
    valid_from_epoch: 10,
    valid_until_epoch: 11,
    nonce_digest: `sha256:${sha256Hex("nonce.laneb")}`,
    // display digest computed by the approver's own displayDigest(RENDERED) — but we need it
    // in the unsigned object BEFORE signing, so compute it the same way here.
    approval_display_digest: displayDigestLocal(RENDERED),
    approver_public_key_digest: APPROVER,
    ...overrides,
  };
}
// Mirror digest.displayDigest without importing to avoid a cycle in this driver context.
function displayDigestLocal(text) {
  const domain = "SIMURGH_STAGE4Q_DISPLAY_V1";
  return `sha256:${sha256Hex(canonicalJson({ domain, schema: SCHEMAS.APPROVAL_RECEIPT, value: { rendered_sha256: `sha256:${sha256Hex(text)}` } }))}`;
}
function harnessCrossing(bindingDigest, overrides = {}) {
  const unsigned = {
    schema: SCHEMAS.BOUNDARY_CROSSING,
    action_digest: `sha256:${sha256Hex("action.send_email")}`,
    request_digest: `sha256:${sha256Hex("request.user_task")}`,
    boundary_kind: "tool_execution",
    crossing_epoch: 10,
    run_id_digest: RUN_ID,
    approval_binding_kind: "receipt",
    approval_binding_digest: bindingDigest,
    harness_public_key_digest: HARNESS,
    ...overrides,
  };
  const sig = edSign(
    null,
    Buffer.from(canonicalJson(unsigned)),
    createPrivateKey(readFileSync(keys.harness.path, "utf8"))
  ).toString("base64");
  return { ...unsigned, signature: sig };
}

// Obtain a signed receipt by SPAWNING the separate approver process (§2.1.5).
function spawnApprover(unsigned, keyName, { interactive = false } = {}) {
  const args = [SIGNER, "--key", keys[keyName].path];
  if (interactive) args.push("--interactive");
  const out = execFileSync("node", args, {
    input: JSON.stringify({ unsigned_receipt: unsigned, rendered_display_text: RENDERED }),
    env: { ...process.env, STAGE4Q_HUMAN_CONFIRM: interactive ? "y" : undefined },
  });
  return JSON.parse(out.toString());
}

function receiptChain(receipt, crossing, extraRefusal = false) {
  const chain = [
    { entry_kind: "approval", entry_digest: approvalReceiptDigest(receipt), raw_code: 0 },
    { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
  ];
  if (extraRefusal)
    chain.splice(1, 0, {
      entry_kind: "refusal",
      entry_digest: `sha256:${sha256Hex("laneb.ledgered.refusal")}`,
      raw_code: 83,
    });
  return chain;
}

function buildArms() {
  const arms = [];
  // approved_and_ordered → 0
  {
    const r = spawnApprover(unsignedReceipt(), "approver");
    const c = harnessCrossing(approvalReceiptDigest(r));
    arms.push({
      arm_id: "approved_and_ordered",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: receiptChain(r, c),
      display_expected: r.approval_display_digest,
    });
  }
  // human_at_terminal → 0 (distinct human key, ceremony confirmed once)
  {
    const r = spawnApprover(
      unsignedReceipt({ approver_public_key_digest: HUMAN }),
      "human-terminal",
      { interactive: true }
    );
    const c = harnessCrossing(approvalReceiptDigest(r));
    arms.push({
      arm_id: "human_at_terminal",
      envelope: envelope({ approver_public_key_digest: HUMAN }),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: receiptChain(r, c),
      display_expected: r.approval_display_digest,
    });
  }
  // refusal_bearing_run → GREEN with a ledgered refusal in-chain
  {
    const r = spawnApprover(unsignedReceipt(), "approver");
    const c = harnessCrossing(approvalReceiptDigest(r));
    arms.push({
      arm_id: "refusal_bearing_run",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: receiptChain(r, c, true),
      display_expected: r.approval_display_digest,
    });
  }
  // no_receipt → 83
  {
    const c = harnessCrossing(`sha256:${sha256Hex("dangling")}`);
    arms.push({
      arm_id: "no_receipt",
      envelope: envelope(),
      receipt: null,
      exemption: null,
      crossing: c,
      chain_events: [{ entry_kind: "crossing", entry_digest: crossingDigest(c), raw_code: 0 }],
      display_expected: undefined,
    });
  }
  // wrong_embedded_digest → 84
  {
    const r = spawnApprover(unsignedReceipt(), "approver");
    const c = harnessCrossing(`sha256:${sha256Hex("wrong.binding")}`);
    arms.push({
      arm_id: "wrong_embedded_digest",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: receiptChain(r, c),
      display_expected: r.approval_display_digest,
    });
  }
  // receipt_after_crossing → 85
  {
    const r = spawnApprover(unsignedReceipt(), "approver");
    const c = harnessCrossing(approvalReceiptDigest(r));
    arms.push({
      arm_id: "receipt_after_crossing",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: [
        { entry_kind: "crossing", entry_digest: crossingDigest(c), raw_code: 0 },
        { entry_kind: "approval", entry_digest: approvalReceiptDigest(r), raw_code: 0 },
      ],
      display_expected: r.approval_display_digest,
    });
  }
  // harness_signer_as_approver → 86 (mandatory negative arm)
  {
    const r = spawnApprover(unsignedReceipt({ approver_public_key_digest: HARNESS }), "harness");
    const c = harnessCrossing(approvalReceiptDigest(r));
    arms.push({
      arm_id: "harness_signer_as_approver",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: receiptChain(r, c),
      display_expected: r.approval_display_digest,
    });
  }
  // expired_epoch → 82
  {
    const r = spawnApprover(unsignedReceipt(), "approver");
    const c = harnessCrossing(approvalReceiptDigest(r), { crossing_epoch: 20 });
    arms.push({
      arm_id: "expired_epoch",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: receiptChain(r, c),
      display_expected: r.approval_display_digest,
    });
  }
  // display_executed_mismatch → 88
  {
    const r = spawnApprover(unsignedReceipt(), "approver");
    const c = harnessCrossing(approvalReceiptDigest(r));
    arms.push({
      arm_id: "display_executed_mismatch",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: receiptChain(r, c),
      display_expected: `sha256:${sha256Hex("a DIFFERENT rendered prompt")}`,
    });
  }
  // census_mismatch → 89
  {
    const r = spawnApprover(unsignedReceipt(), "approver");
    const c = harnessCrossing(approvalReceiptDigest(r));
    const c2 = harnessCrossing(approvalReceiptDigest(r), {
      action_digest: `sha256:${sha256Hex("action.second")}`,
    });
    arms.push({
      arm_id: "census_mismatch",
      envelope: envelope(),
      receipt: r,
      exemption: null,
      crossing: c,
      chain_events: [
        { entry_kind: "approval", entry_digest: approvalReceiptDigest(r), raw_code: 0 },
        { entry_kind: "crossing", entry_digest: crossingDigest(c), raw_code: 0 },
        { entry_kind: "crossing", entry_digest: crossingDigest(c2), raw_code: 0 },
      ],
      census: { committed_crossings: 1 },
      display_expected: r.approval_display_digest,
    });
  }
  return arms;
}

export function replayCapture(capture) {
  const pubByDigest = capture.public_keys;
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
  return capture.arms.map((a) => {
    const { entries, root } = buildChain(a.chain_events);
    const chainVerdict = verifyChain(entries, { expectedRoot: root, census: a.census });
    const out = decide({
      envelope: a.envelope,
      receipt: a.receipt,
      exemption: a.exemption,
      crossing: a.crossing,
      chainEntries: entries,
      chainVerdict,
      verifySignature,
      displayExpected: a.display_expected,
    });
    return { arm_id: a.arm_id, raw: out.raw, reason: out.reason };
  });
}

function main() {
  const arms = buildArms();
  const capture = {
    schema: "simurgh.vfr_lane_b_capture.v1",
    run_id_digest: RUN_ID,
    public_keys: {
      [APPROVER]: keys.approver.pubPem,
      [HARNESS]: keys.harness.pubPem,
      [HUMAN]: keys["human-terminal"].pubPem,
    },
    arms,
  };
  const expected = replayCapture(capture);
  const stable = (v) => JSON.stringify(v, null, 2) + "\n";
  writeFileSync(join(LANE_B, "capture.json"), stable(capture));
  writeFileSync(join(LANE_B, "expected-arms.json"), stable(expected));
  console.log(`stage4q: captured ${arms.length} Lane-B arms via the separate approver process`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
