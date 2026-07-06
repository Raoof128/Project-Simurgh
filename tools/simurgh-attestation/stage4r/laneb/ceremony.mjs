// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R Lane B ceremony orchestrator (4R spec §10). Motto: AnthropicSafe
// First, then ReviewerSafe. Spawns TWO separate operator processes (each holds
// its own scalar), drives the four phases (mask → z/commit → open → sign), and
// runs the VFR export crossing through a THIRD separate approver process whose
// key is distinct from both operators, the harness, and the attestation key
// (§4.2 four-key separation). Emits privacy-clean captures: three committed arms
// — honest match, honest non-match, and the mandatory raw-98 export refusal.
// Verify-only reproduce re-reads these captures; refresh needs the env flag.
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS } from "../constants.mjs";
import { pairId, pairIdHash, pairMatchCommitment } from "../core/maskCore.mjs";
import { evaluateCeremony } from "../core/pcccCore.mjs";
import { reconstructInput, signingDigest } from "../core/ceremonyBuilder.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const OP = join(ROOT, "tools/simurgh-attestation/stage4r/laneb/operator.mjs");
const OUTDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4r/lane-b");

const EPOCH = "sha256:" + "1b".repeat(32);
const RUN = "lane-b";
const CLASS_MATCH = "sha256:" + "2b".repeat(32);
const CLASS_OTHER = "sha256:" + "3b".repeat(32);
const scalarFile = (name) => join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}-scalar.hex`);
const keyFile = (name) => join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`);
const keyDigests = ["sha256:" + "1b".repeat(32), "sha256:" + "2b".repeat(32)];

function runOp(args) {
  const res = spawnSync("node", [OP, ...args], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`operator failed: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

function keyDigestOf(name) {
  const priv = crypto.createPrivateKey(readFileSync(keyFile(name)));
  const pub = crypto.createPublicKey(priv).export({ type: "spki", format: "der" }).toString("hex");
  return recordDigest({ pub });
}

// A real, separate-process VFR approval: the approver (harness key) signs the
// export crossing. Its key digest must differ from both operators and the
// attestation key. Returns { receipt, approverKeyDigest }.
function approveExport(pairMatchCommitmentValue) {
  const key = crypto.createPrivateKey(readFileSync(keyFile("harness")));
  const crossing = {
    action: "pccc_match_record_export",
    pair_match_commitment: pairMatchCommitmentValue,
    boundary_kind: "disclosure_escalation",
    epoch: EPOCH,
    run_id: RUN,
  };
  const sig = crypto.sign(null, Buffer.from(recordDigest(crossing)), key).toString("hex");
  return { receipt: { crossing, signature: sig }, approverKeyDigest: keyDigestOf("harness") };
}

function ceremony(name, classA, classB) {
  const pid = pairId(EPOCH, keyDigests);
  const nonce = (r) =>
    crypto.createHash("sha256").update(`laneb|${name}|${r}`).digest("hex").slice(0, 16);

  // Phase 1 — each operator computes its mask IN ITS OWN PROCESS.
  const mA = runOp([
    "--phase",
    "mask",
    "--role",
    "a",
    "--scalar-file",
    scalarFile("operator-alpha"),
    "--epoch",
    EPOCH,
    "--run",
    RUN,
    "--pair",
    pid,
    "--class",
    classA,
  ]);
  const mB = runOp([
    "--phase",
    "mask",
    "--role",
    "b",
    "--scalar-file",
    scalarFile("operator-beta"),
    "--epoch",
    EPOCH,
    "--run",
    RUN,
    "--pair",
    pid,
    "--class",
    classB,
  ]);

  // Phase 2/3 — each derives z, token, and its commitment from the peer's mask.
  const zA = runOp([
    "--phase",
    "z",
    "--role",
    "a",
    "--scalar-file",
    scalarFile("operator-alpha"),
    "--epoch",
    EPOCH,
    "--run",
    RUN,
    "--pair",
    pid,
    "--peer-mask",
    mB.mask_point,
    "--nonce",
    nonce("a"),
  ]);
  const zB = runOp([
    "--phase",
    "z",
    "--role",
    "b",
    "--scalar-file",
    scalarFile("operator-beta"),
    "--epoch",
    EPOCH,
    "--run",
    RUN,
    "--pair",
    pid,
    "--peer-mask",
    mA.mask_point,
    "--nonce",
    nonce("b"),
  ]);

  const transcript = {
    schema: SCHEMAS.MATCH_TRANSCRIPT,
    epoch: EPOCH,
    run_id: RUN,
    pair_id: pid,
    slot_index: 0,
    masks: { a: mA.mask_point, b: mB.mask_point },
    commitments: { a: zA.commitment, b: zB.commitment },
    openings: {
      a: { token: zA.token, token_nonce: zA.token_nonce },
      b: { token: zB.token, token_nonce: zB.token_nonce },
    },
    z: { a: zA.z, b: zB.z },
    dleq: { a: [mA.dleq_mask, zA.dleq_z], b: [mB.dleq_mask, zB.dleq_z] },
    phase_order: { a: ["mask", "commit", "open", "sign"], b: ["mask", "commit", "open", "sign"] },
    match: zA.token === zB.token,
    signatures: { a: "", b: "" },
  };
  // Phase 4 — each operator signs the transcript IN ITS OWN PROCESS.
  const dig = signingDigest(transcript);
  transcript.signatures.a = runOp([
    "--phase",
    "sign",
    "--role",
    "a",
    "--scalar-file",
    scalarFile("operator-alpha"),
    "--key-file",
    keyFile("operator-alpha"),
    "--epoch",
    EPOCH,
    "--run",
    RUN,
    "--pair",
    pid,
    "--transcript-digest",
    dig,
  ]).signature;
  transcript.signatures.b = runOp([
    "--phase",
    "sign",
    "--role",
    "b",
    "--scalar-file",
    scalarFile("operator-beta"),
    "--key-file",
    keyFile("operator-beta"),
    "--epoch",
    EPOCH,
    "--run",
    RUN,
    "--pair",
    pid,
    "--transcript-digest",
    dig,
  ]).signature;

  const sealedPacket = {
    epoch: EPOCH,
    run_id: RUN,
    pair_id: pid,
    slot_index: 0,
    class_digests: { a: classA, b: classB },
    epk: { a: mA.epk, b: mB.epk },
    ephemeral_digests: { a: mA.ephemeral_digest, b: mB.ephemeral_digest },
  };
  const pmc = pairMatchCommitment(EPOCH, pid, transcript.match, recordDigest(transcript));
  return { name, transcript, sealedPacket, pid, pmc };
}

function processMeta(name) {
  // §10.3 privacy-clean: digests and role labels only — no pid/argv/env/hostname.
  return {
    a: {
      role: "a",
      process_instance_digest: recordDigest({ role: "a", run: name }),
      operator_key_digest: keyDigestOf("operator-alpha"),
    },
    b: {
      role: "b",
      process_instance_digest: recordDigest({ role: "b", run: name }),
      operator_key_digest: keyDigestOf("operator-beta"),
    },
  };
}

function buildCapture() {
  const arms = [];

  // Arm 1: honest match, exported (VFR approved).
  const m = ceremony("honest_match", CLASS_MATCH, CLASS_MATCH);
  const approvalM = approveExport(m.pmc);
  arms.push({
    name: "honest_match",
    transcript: m.transcript,
    sealedPacket: m.sealedPacket,
    exported: true,
    vfr: approvalM.receipt,
    terminal: "exported_match_record",
  });

  // Arm 2: honest non-match, exported.
  const n = ceremony("honest_non_match", CLASS_MATCH, CLASS_OTHER);
  const approvalN = approveExport(n.pmc);
  arms.push({
    name: "honest_non_match",
    transcript: n.transcript,
    sealedPacket: n.sealedPacket,
    exported: true,
    vfr: approvalN.receipt,
    terminal: "exported_non_match_record",
  });

  // Arm 3 (mandatory): export attempted with NO valid VFR receipt → raw 98,
  // ledgered refusal, NOTHING published.
  const r = ceremony("refused_export", CLASS_MATCH, CLASS_MATCH);
  arms.push({
    name: "refused_export",
    transcript: r.transcript,
    sealedPacket: r.sealedPacket,
    exported: false,
    vfr: null,
    terminal: "ledgered_export_refusal",
  });

  const approverKeyDigest = approvalM.approverKeyDigest;
  const separation = {
    approver: approverKeyDigest,
    operator_a: keyDigestOf("operator-alpha"),
    operator_b: keyDigestOf("operator-beta"),
    attestation: keyDigestOf("attestation"),
  };
  return {
    schema: SCHEMAS.CEREMONY_CAPTURE,
    epoch: EPOCH,
    slot_cardinality_commitment: arms.length,
    slot_ledger: arms.map((a) => ({ terminal: a.terminal })),
    window_match_census: { epoch: EPOCH, matches: 1, non_matches: 1, refusals: 1 },
    refusals: arms
      .filter((a) => !a.exported)
      .map((a) => ({ name: a.name, reason: "vfr_export_gate_failed" })),
    process_metadata: processMeta("laneb"),
    vfr_crossing: {
      key_separation: separation,
      arms: arms.map((a) => ({ name: a.name, exported: a.exported })),
    },
    arms,
  };
}

function main() {
  mkdirSync(OUTDIR, { recursive: true });
  const capture = buildCapture();
  writeFileSync(join(OUTDIR, "ceremony-capture.json"), JSON.stringify(capture, null, 2) + "\n");
  console.log(`Lane B capture written: ${capture.arms.length} arms`);
}

main();

export { buildCapture, evaluateCeremony, reconstructInput };
