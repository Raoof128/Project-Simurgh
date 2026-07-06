// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R Lane A fixture corpus builder (4R spec §9). Motto: AnthropicSafe
// First, then ReviewerSafe. Builds a deterministic, byte-stable corpus that
// exercises the full tamper matrix — every raw code and every subreason — using
// the quarantined INSECURE_FIXTURE_ONLY keys and scalars. Ed25519 (RFC 8032) is
// deterministic, so re-running produces identical bytes. Each case is
// self-checked against evaluateCeremony before it is written.
import crypto from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateCeremony } from "../core/pcccCore.mjs";
import { buildCeremony, reconstructInput, signingDigest } from "../core/ceremonyBuilder.mjs";
import { encodePoint, ID, scalarFromHex } from "../core/edwards25519.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const OUTDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4r/lane-a");

const EPOCH = "sha256:" + "a1".repeat(32);
const CLASS_X = "sha256:" + "b2".repeat(32);
const CLASS_Y = "sha256:" + "c3".repeat(32);
const RUN = "lane-a";

function loadKey(name) {
  return crypto.createPrivateKey(readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}.pem`)));
}
function loadScalar(name) {
  return scalarFromHex(
    readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${name}-scalar.hex`), "utf8").trim()
  );
}
function nonce(name, role) {
  return crypto.createHash("sha256").update(`nonce|${name}|${role}`).digest("hex").slice(0, 16);
}

const keys = { a: loadKey("operator-alpha"), b: loadKey("operator-beta") };
const pubKeys = { a: crypto.createPublicKey(keys.a), b: crypto.createPublicKey(keys.b) };
const scalars = { a: loadScalar("operator-alpha"), b: loadScalar("operator-beta") };
const keyDigests = ["sha256:" + "11".repeat(32), "sha256:" + "22".repeat(32)];

function ceremony(name, classA, classB) {
  return buildCeremony({
    epoch: EPOCH,
    runId: RUN,
    slotIndex: 0,
    classA,
    classB,
    scalarA: scalars.a,
    scalarB: scalars.b,
    keys,
    keyDigests,
    nonces: { a: nonce(name, "a"), b: nonce(name, "b") },
  });
}

// Re-sign a transcript after a legitimate mutation so the signature check (91)
// passes and evaluation reaches the intended downstream code.
function reSign(transcript) {
  const dig = signingDigest(transcript);
  transcript.signatures.a = crypto.sign(null, Buffer.from(dig), keys.a).toString("hex");
  transcript.signatures.b = crypto.sign(null, Buffer.from(dig), keys.b).toString("hex");
}

// Each builder returns { transcript, sealedPacket, publicRecord, overrides }.
function cases() {
  const out = [];
  const add = (name, expect, built, overrides = {}) =>
    out.push({
      name,
      expect,
      transcript: built.transcript,
      sealedPacket: built.sealedPacket,
      publicRecord: built.publicRecord,
      overrides,
    });

  add("green_match", { raw: 0, green: true }, ceremony("green_match", CLASS_X, CLASS_X));
  add("green_non_match", { raw: 0, green: true }, ceremony("green_non_match", CLASS_X, CLASS_Y));

  const phase = ceremony("phase_order", CLASS_X, CLASS_X);
  phase.transcript.phase_order.a = ["commit", "mask", "open", "sign"];
  add("phase_order", { raw: 90, reason: "pccc_phase_order_invalid" }, phase);

  const commit = ceremony("commit_missing", CLASS_X, CLASS_X);
  commit.transcript.commitments.a = "not-a-digest";
  add("commit_missing", { raw: 90, reason: "pccc_token_commitment_missing" }, commit);

  const copy = ceremony("token_copy_liar", CLASS_X, CLASS_Y);
  copy.transcript.openings.b.token = copy.transcript.openings.a.token;
  add("token_copy_liar", { raw: 90, reason: "pccc_token_commitment_opening_invalid" }, copy);

  add(
    "cardinality",
    { raw: 90, reason: "slot_cardinality_mismatch" },
    ceremony("cardinality", CLASS_X, CLASS_X),
    {
      cardinality: { ok: false, reason: "slot_cardinality_mismatch" },
    }
  );
  add(
    "census",
    { raw: 90, reason: "window_match_census_mismatch" },
    ceremony("census", CLASS_X, CLASS_X),
    {
      cardinality: { ok: false, reason: "window_match_census_mismatch" },
    }
  );

  const sig = ceremony("bad_sig", CLASS_X, CLASS_X);
  sig.transcript.signatures.b = "00".repeat(64);
  add("bad_sig", { raw: 91, reason: "operator_identity_signature_invalid" }, sig);

  const zero = ceremony("small_order", CLASS_X, CLASS_X);
  zero.transcript.z.a = encodePoint(ID);
  reSign(zero.transcript); // operator signs a degenerate transcript → reaches 94
  add("small_order", { raw: 94, reason: "small_order_or_all_zero_fail_closed" }, zero);

  add(
    "replay",
    { raw: 95, reason: "cross_epoch_replay_detected" },
    ceremony("replay", CLASS_X, CLASS_X),
    {
      replay: { hit: true, reason: "cross_epoch_replay_detected" },
    }
  );
  add(
    "mask_reuse",
    { raw: 96, reason: "mask_reuse_detected" },
    ceremony("mask_reuse", CLASS_X, CLASS_X),
    {
      reuse: { hit: true, reason: "mask_reuse_detected" },
    }
  );
  add(
    "eph_reuse",
    { raw: 96, reason: "ephemeral_public_digest_reuse_detected" },
    ceremony("eph_reuse", CLASS_X, CLASS_X),
    {
      reuse: { hit: true, reason: "ephemeral_public_digest_reuse_detected" },
    }
  );

  const dz = ceremony("dleq_z", CLASS_X, CLASS_X);
  dz.transcript.dleq.a[1].s = "0".repeat(63) + "1";
  reSign(dz.transcript);
  add("dleq_z", { raw: 93, reason: "dleq_z_proof_invalid" }, dz);
  const dm = ceremony("dleq_mask", CLASS_X, CLASS_X);
  dm.transcript.dleq.a[0].s = "0".repeat(63) + "1";
  reSign(dm.transcript);
  add("dleq_mask", { raw: 93, reason: "dleq_mask_proof_invalid" }, dm);
  add(
    "token_recompute",
    { raw: 93, reason: "token_recompute_mismatch" },
    ceremony("token_recompute", CLASS_X, CLASS_X),
    {
      recomputedTokens: { a: "sha256:" + "0".repeat(64), b: "sha256:" + "0".repeat(64) },
    }
  );

  const claim = ceremony("claim_liar", CLASS_X, CLASS_Y);
  claim.transcript.match = true; // lie about a non-match
  reSign(claim.transcript); // re-sign so 91 passes and 92 is reached
  add("claim_liar", { raw: 92, reason: "match_claim_conflict" }, claim);

  add(
    "herd",
    { raw: 99, reason: "public_herd_token_violation" },
    ceremony("herd", CLASS_X, CLASS_X),
    {
      herd: { hit: true },
    }
  );
  add(
    "budget",
    { raw: 97, reason: "disclosure_budget_exceeded" },
    ceremony("budget", CLASS_X, CLASS_X),
    {
      budgetExceeded: true,
    }
  );
  add("vfr", { raw: 98, reason: "vfr_export_gate_failed" }, ceremony("vfr", CLASS_X, CLASS_X), {
    vfrOk: true,
  });

  return out;
}

function verdictOf(entry) {
  const input = reconstructInput(
    { transcript: entry.transcript, sealedPacket: entry.sealedPacket, operatorPublicKeys: pubKeys },
    entry.overrides
  );
  return evaluateCeremony(input);
}

function main() {
  mkdirSync(OUTDIR, { recursive: true });
  const corpus = { epoch: EPOCH, run_id: RUN, cases: cases() };
  // self-check every case before writing (vfr negative arm is special: it must
  // be GREEN when vfrOk true; the raw-98 arm is asserted with vfrOk false).
  for (const c of corpus.cases) {
    if (c.name === "vfr") {
      c.overrides.vfrOk = false;
      c.expect = { raw: 98, reason: "vfr_export_gate_failed" };
    }
    const v = verdictOf(c);
    const want = c.expect.green
      ? { raw: 0, green: true }
      : { raw: c.expect.raw, reason: c.expect.reason, green: false };
    if (JSON.stringify(v) !== JSON.stringify(want)) {
      throw new Error(
        `Lane A self-check failed for ${c.name}: got ${JSON.stringify(v)} want ${JSON.stringify(want)}`
      );
    }
  }
  writeFileSync(join(OUTDIR, "corpus.json"), JSON.stringify(corpus, null, 2) + "\n");
  console.log(`Lane A corpus written: ${corpus.cases.length} cases`);
}

main();
