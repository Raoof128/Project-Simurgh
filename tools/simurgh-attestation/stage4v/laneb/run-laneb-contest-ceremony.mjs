// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V Lane B — two-process respondent-blind contest ceremony (spec §7).
// Motto: AnthropicSafe First, then ReviewerSafe.
//
// Process 1 (operator): runs the REAL 4S MCP hop -> fresh 4T capsule (ephemeral key).
// Process 2 (respondent): a genuinely separate OS process fed ONLY sealed public
// artifacts; files a counter-capsule. The verifier derives the outcome. Verify-only:
// the committed capture is re-verified, never regenerated.
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { captureLaneB } from "../../stage4t/laneb/run-laneb-incident-ceremony.mjs";
import { STAGE_VERIFIERS } from "../../stage4t/node/greenCapsule.mjs";
import { evaluateContestSafe } from "../core/counterCapsuleCore.mjs";
import { VDP_LANEB_CAPTURE_SCHEMA } from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = join(HERE, "respondent-child.mjs");
const CAPDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4v/laneb");

function runChild(payload) {
  return new Promise((resolve, reject) => {
    // Minimal env — NO operator paths of any kind reach the child.
    const child = spawn(process.execPath, [CHILD], {
      env: { PATH: process.env.PATH, TZ: "UTC" },
      stdio: ["pipe", "pipe", "inherit"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`respondent child exited ${code}`));
      resolve(JSON.parse(out));
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function captureContestLaneB() {
  const operatorCapture = await captureLaneB();
  // Ephemeral operator-side secrets the child must NOT be able to discover.
  const forbiddenKeyPath = `/ephemeral/operator/${crypto.randomBytes(8).toString("hex")}.pem`;
  const forbiddenStatePath = `/ephemeral/operator-state/${crypto.randomBytes(8).toString("hex")}`;

  const child = await runChild({
    capsule_bundle: operatorCapture.capsule,
    capsule_pubkey_pem: operatorCapture.capsule_pubkey_pem,
    forbiddenKeyPath,
    forbiddenStatePath,
  });

  const { raw, envelope } = evaluateContestSafe(operatorCapture.capsule, child.counter_capsule, {
    capsulePubKeyPem: operatorCapture.capsule_pubkey_pem,
    respondentPubKeyPem: child.respondent_pubkey_pem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  if (raw !== 0) throw new Error(`lane b contest not scoreable: raw ${raw}`);
  if (child.blindness.env_has_operator_key_path || child.blindness.env_has_operator_state_path || child.blindness.argv_has_pem)
    throw new Error("lane b respondent not blind");

  return {
    schema: VDP_LANEB_CAPTURE_SCHEMA,
    transport: operatorCapture.transport,
    process_isolation: operatorCapture.process_isolation,
    respondent_process: { pid_isolated: true, blindness: child.blindness },
    capsule: operatorCapture.capsule,
    capsule_pubkey_pem: operatorCapture.capsule_pubkey_pem,
    counter_capsule: child.counter_capsule,
    respondent_pubkey_pem: child.respondent_pubkey_pem,
    contest_outcome: envelope,
    component_hashes: {
      capsule: recordDigest(operatorCapture.capsule),
      counter_capsule: recordDigest(child.counter_capsule),
      contest_outcome: recordDigest(envelope),
    },
  };
}

export function verifyContestLaneBCapture(capture) {
  const ch = capture.component_hashes ?? {};
  if (recordDigest(capture.capsule) !== ch.capsule)
    return { ok: false, reason: "capsule_hash_mismatch" };
  if (recordDigest(capture.counter_capsule) !== ch.counter_capsule)
    return { ok: false, reason: "counter_capsule_hash_mismatch" };
  const { raw, envelope } = evaluateContestSafe(capture.capsule, capture.counter_capsule, {
    capsulePubKeyPem: capture.capsule_pubkey_pem,
    respondentPubKeyPem: capture.respondent_pubkey_pem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  if (raw !== 0) return { ok: false, reason: "contest_not_scoreable", detail: raw };
  if (recordDigest(envelope) !== ch.contest_outcome)
    return { ok: false, reason: "contest_outcome_hash_mismatch" };
  const b = capture.respondent_process?.blindness ?? {};
  if (b.env_has_operator_key_path !== false)
    return { ok: false, reason: "respondent_process_cannot_read_operator_private_key" };
  if (b.env_has_operator_state_path !== false)
    return { ok: false, reason: "respondent_process_cannot_read_operator_working_state" };
  if (envelope.result?.respondent_role !== "deployer")
    return { ok: false, reason: "respondent_role_not_echoed" };
  return { ok: true, recorded_role: "deployer", contest_raw: raw };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv.includes("--verify") ? "verify" : "capture";
  const path = join(CAPDIR, "capture.json");
  if (mode === "capture") {
    const capture = await captureContestLaneB();
    mkdirSync(CAPDIR, { recursive: true });
    writeFileSync(path, canonicalJson(capture) + "\n");
    console.error(
      `stage4v Lane B: captured 2-process contest (outcome raw ${capture.contest_outcome.result?.refused ? "refused" : 0})`
    );
  } else {
    const capture = JSON.parse(readFileSync(path, "utf8"));
    const res = verifyContestLaneBCapture(capture);
    console.error("stage4v Lane B verify:", JSON.stringify(res));
    process.exit(res.ok ? 0 : 1);
  }
}
