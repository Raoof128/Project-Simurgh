// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPrivateKey, createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  campaignHash,
  campaignIdFromConfig,
  campaignMerkleRoot,
  goldenDigestForCampaign,
  signCampaignPayload,
} from "./campaignCrypto.mjs";
import { buildCampaignRecord, buildEvidencePackRecord, signRecordEnvelope } from "./records.mjs";
import { deriveCanonicalSeed, deriveSchedule } from "./schedule.mjs";
import { verifyCampaign } from "./verifyCampaign.mjs";

const TEST_PRIVATE_KEY_PATH =
  "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem";

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

function config() {
  return {
    target_commit: "0123456789abcdef0123456789abcdef01234567",
    library_hash: "sha256:" + "a".repeat(64),
    policy_hash: "sha256:" + "b".repeat(64),
    driver_hash: "sha256:" + "c".repeat(64),
    budget: { queries_total: 4, per_class: { I: 1, II: 1, III: 1, IV: 1 } },
  };
}

function recordFor(slot, privateKey) {
  const byClass = {
    I: { resolved_class: "I", verdict: "caught", reason_codes: ["decision_replay_blocked"] },
    II: {
      resolved_class: "II",
      verdict: "caught",
      reason_codes: ["verifier_deception_rejected"],
    },
    III: { resolved_class: "III", verdict: "out_of_scope", reason_codes: ["unmediated_action"] },
    IV: { resolved_class: "IV", verdict: "escaped", reason_codes: ["boundary_escape_recorded"] },
  };
  const outcome = byClass[slot.target_class];
  const builder = ["I", "II"].includes(slot.target_class)
    ? buildEvidencePackRecord
    : buildCampaignRecord;
  return signRecordEnvelope(
    builder({
      attempt_id: slot.id,
      target_class: slot.target_class,
      resolved_class: outcome.resolved_class,
      verdict: outcome.verdict,
      reason_codes: outcome.reason_codes,
      sealed_inputs_hash: slot.schedule_hash,
      evidence_pack_hash: campaignHash({ kind: "stage4g-demo-ep", attempt_id: slot.id }),
      evidence_pack_sig_hash: campaignHash({
        kind: "stage4g-demo-ep-sig",
        attempt_id: slot.id,
      }),
    }),
    privateKey
  );
}

function manifestFor({ cfg, seed, attempts, records }) {
  const manifestBase = {
    manifest_version: "simurgh.stage4g.campaign.v1",
    campaign_id: campaignIdFromConfig({ ...cfg, seed }),
    seed,
    budget: cfg.budget,
    library_hash: cfg.library_hash,
    target_commit: cfg.target_commit,
    policy_hash: cfg.policy_hash,
    driver_hash: cfg.driver_hash,
    campaign_merkle_root: campaignMerkleRoot(attempts.map((attempt) => attempt.record_hash)),
    attempt_count: attempts.length,
    attempts,
    counts: { resolved: 4, caught: 2, escaped: 1, out_of_scope: 1, aborted: 0 },
  };
  return {
    ...manifestBase,
    golden_digest: goldenDigestForCampaign({ manifest: manifestBase, records }),
  };
}

export async function buildStage4gDemo({ outDir }) {
  const privateKeyPem = await readFile(TEST_PRIVATE_KEY_PATH, "utf8");
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(privateKey);
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const cfg = config();
  const seed = deriveCanonicalSeed(cfg);
  const schedule = deriveSchedule({ ...cfg, seed });
  const records = schedule.map((slot) => recordFor(slot, privateKey));
  const attempts = records.map((envelope) => ({
    id: envelope.payload.attempt_id,
    target_class: envelope.payload.target_class,
    resolved_class: envelope.payload.resolved_class,
    verdict: envelope.payload.verdict,
    record_type: envelope.payload.record_type,
    record_ref: `stage4g://records/${envelope.payload.attempt_id}`,
    record_hash: envelope.record_hash,
    reason_codes: envelope.payload.reason_codes,
  }));
  const manifest = manifestFor({ cfg, seed, attempts, records });
  const signedManifest = {
    payload: manifest,
    signature: signCampaignPayload(manifest, privateKey),
  };
  const clean = verifyCampaign({ signedManifest, records, publicKey });

  const missing = verifyCampaign({ signedManifest, records: records.slice(0, -1), publicKey });
  const relabelManifest = structuredClone(signedManifest);
  relabelManifest.payload.attempts[0].resolved_class = "III";
  relabelManifest.signature = signCampaignPayload(relabelManifest.payload, privateKey);
  const classRelabel = verifyCampaign({ signedManifest: relabelManifest, records, publicKey });
  const leakRecords = structuredClone(records);
  leakRecords[0].payload.raw_prompt = "sk-proj-secret";
  const privacyLeak = verifyCampaign({ signedManifest, records: leakRecords, publicKey });

  await mkdir(join(outDir, "clean"), { recursive: true });
  await mkdir(join(outDir, "records"), { recursive: true });
  await mkdir(join(outDir, "red-arms"), { recursive: true });
  await mkdir(join(outDir, "boundary"), { recursive: true });
  await mkdir(join(outDir, "golden"), { recursive: true });
  await mkdir(join(outDir, "reports"), { recursive: true });
  await writeFile(join(outDir, "clean", "campaign-manifest.json"), stable(signedManifest));
  await writeFile(join(outDir, "records", "records.json"), stable(records));
  await writeFile(join(outDir, "red-arms", "missing-attempt-results.json"), stable(missing));
  await writeFile(join(outDir, "red-arms", "class-relabel-results.json"), stable(classRelabel));
  await writeFile(join(outDir, "red-arms", "privacy-leak-results.json"), stable(privacyLeak));
  await writeFile(
    join(outDir, "boundary", "class-iv-recorded.json"),
    stable(records.find((record) => record.payload.target_class === "IV").payload)
  );
  await writeFile(
    join(outDir, "golden", "golden-summary.json"),
    stable({ byte_stable: true, golden_digest: manifest.golden_digest })
  );
  await writeFile(
    join(outDir, "reports", "stage4g-report.json"),
    stable({
      campaign_verified: clean.campaign_verified,
      security_escapes: clean.security_escapes,
      claim_scope: "within the canonical precommitted campaign for this build configuration",
    })
  );
  await writeFile(join(outDir, "public-key.pem"), publicKeyPem);
  await writeFile(
    join(outDir, "README.md"),
    [
      "# Stage 4G Adaptive Red-Team Campaign",
      "",
      "This artifact is verified within the canonical precommitted campaign for this build configuration: 4 scheduled attempts (2 caught, 1 escaped, 1 out-of-scope).",
      "",
      "Scope: the campaign verifies the integrity of the evidence layer — that no scheduled attempt can be hidden, relabelled, or falsely claimed contained under the offline verifier. It does not prove model safety, jailbreak immunity, or statistical robustness, and its scale (4 attempts) is not an adversarial-robustness measurement.",
      "",
      "The 1 recorded containment escape is disclosed in the signed campaign manifest and reported as `security_escapes: 1`; a verified campaign can pass while honestly recording escapes.",
      "",
    ].join("\n")
  );

  return {
    clean,
    red_arms: { missing_attempt: missing, class_relabel: classRelabel, privacy_leak: privacyLeak },
    boundary: {
      class_iv_recorded: records.find((record) => record.payload.target_class === "IV").payload,
    },
  };
}
