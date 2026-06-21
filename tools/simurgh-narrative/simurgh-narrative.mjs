// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3S CLI. Drives the REAL gateway via the existing recorded_fixture path to obtain
// model-drafted slots, binds them to the gateway receipt by hash, claim-checks against the
// deterministic evidence digest, renders, and writes the evidence pack. Verify-only in CI.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { hashPrompt } from "../../src/llmShield/promptNormalise.js";
import { buildEvidenceDigest, digestSourceInput } from "./evidenceDigest.mjs";
import { parseModelSlots, verifySlots } from "./claimChecker.mjs";
import { renderNarrative } from "./renderer.mjs";
import { runNarrativeSelfProof } from "./selfProof.mjs";

export const NARRATIVE_CASE_ID = "3e_narrative_001";
const EV = "docs/research/llm-shield/evidence/stage-3s";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

// Receipt-binding: slots must be derived from the gateway output_text whose hash matches
// the gateway receipt's output_hash (the canonical receipt field).
export function buildModelSlotsFromGatewayRun({ outputText, receipt }) {
  const parsed = parseModelSlots(outputText);
  if (!parsed.ok) return { ok: false, violation: parsed.violation };
  const outHash = hashPrompt(outputText);
  if (receipt?.output_hash !== outHash) return { ok: false, violation: "receipt_binding_mismatch" };
  const modelSlots = {
    type: "simurgh.defensive_narrative.model_slots.v1",
    source: {
      gateway_receipt_digest: sha256Hex(canonicalJson(receipt)),
      gateway_output_hash: outHash,
      model_slots_digest: sha256Hex(canonicalJson(parsed.slots)),
    },
    slots: parsed.slots,
  };
  return { ok: true, modelSlots };
}

export function buildVerifiedArtifact({ digest, modelSlots }) {
  const v = verifySlots(modelSlots.slots, digest);
  const rendered = renderNarrative(v.verified);
  return {
    type: "simurgh.defensive_narrative.verified_artifact.v1",
    evidence_digest_hash: sha256Hex(canonicalJson(digest)),
    model_slots_digest: modelSlots.source.model_slots_digest,
    // claim_check_passed means "the checking process completed and unsafe slots were
    // excluded" — NOT "every model claim passed". all_slots_verified makes that explicit.
    claim_check_completed: true,
    claim_check_passed: true,
    all_slots_verified: v.rejected.length === 0,
    verified_slots: v.verified.length,
    unsupported_slots_rejected: v.rejected.filter((r) => r.reason === "unsupported_slot").length,
    narrative_claim_conflicts_rendered: 0,
    narrative_claim_conflict_attempts: v.conflict_attempts,
    automatic_finding_made: rendered.automatic_finding_made,
    rendered_summary: rendered.rendered_summary,
  };
}

// ---- evidence assembly (deterministic; sources are committed real evidence) ----
async function buildDigestFromSources() {
  const regPath = "docs/research/llm-shield/evidence/stage-3q/registry/registry.json";
  const catPath = "docs/research/llm-shield/evidence/stage-3p/catalogue/attestation-catalogue.json";
  const regRaw = await readFile(regPath, "utf8");
  const catRaw = await readFile(catPath, "utf8");
  const sourceInputs = [
    digestSourceInput("temporal_registry", regPath, regRaw),
    digestSourceInput("cross_defence_catalogue", catPath, catRaw),
  ];
  return buildEvidenceDigest({
    sessionHash: sha("stage-3s-reference-session"),
    sourceInputs,
    audit_chain_valid: true,
    daemon_proof_counts: { valid: 0, missing: 0, replayed: 0 },
    gateway: { fallback_used: false, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
    vca: { attestation_verified: true, claim_conflicts: 0 },
    privacy: {
      raw_pixels_captured: false,
      raw_window_titles_captured: false,
      typed_content_captured: false,
    },
  });
}

// Drive the real gateway via _live_server + recorded_fixture to obtain slots + receipt.
async function gatewayDraftSlots() {
  const { startServer, newSession } = await import("../../tests/e2e/_live_server.mjs");
  const srv = await startServer({});
  try {
    const sess = await newSession(srv.base);
    const res = await fetch(`${sess.api}/${sess.sessionId}/run`, {
      method: "POST",
      headers: sess.auth,
      body: JSON.stringify({
        input: "produce a defensive integrity summary",
        provider_mode: "recorded_fixture",
        case_id: NARRATIVE_CASE_ID,
      }),
    });
    const j = await res.json();
    return { outputText: j.output_text ?? "", receipt: j.receipt };
  } finally {
    srv.stop();
  }
}

// Authoring path: run the gateway ONCE to draft slots; the receipt (with its per-run
// timestamp/session id) is captured as committed evidence, never re-derived.
async function assembleForBuild() {
  const digest = await buildDigestFromSources();
  const { outputText, receipt } = await gatewayDraftSlots();
  const ms = buildModelSlotsFromGatewayRun({ outputText, receipt });
  if (!ms.ok) throw new Error(`stage3s model-slots rejected: ${ms.violation}`);
  const artifact = buildVerifiedArtifact({ digest, modelSlots: ms.modelSlots });
  const selfProof = runNarrativeSelfProof();
  if (!selfProof.summary.all_passed) throw new Error("stage3s self-proof failed");
  return { digest, receipt, modelSlots: ms.modelSlots, artifact, selfProof };
}

// Verify path: deterministic, offline, never re-runs the gateway. Re-derives the digest +
// artifact + self-proof from sources + the COMMITTED model-slots, and checks the
// receipt-binding against the committed receipt.
async function deriveForVerify() {
  const digest = await buildDigestFromSources();
  const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
  const modelSlots = await rd("model-slots/model-slots.json");
  const receipt = await rd("model-slots/gateway-receipt.json");
  if (modelSlots.source.gateway_output_hash !== receipt.output_hash)
    throw new Error("stage3s receipt-binding mismatch (model-slots vs committed receipt)");
  if (modelSlots.source.model_slots_digest !== sha256Hex(canonicalJson(modelSlots.slots)))
    throw new Error("stage3s model_slots_digest mismatch");
  const artifact = buildVerifiedArtifact({ digest, modelSlots });
  const selfProof = runNarrativeSelfProof();
  if (!selfProof.summary.all_passed) throw new Error("stage3s self-proof failed");
  return { digest, artifact, selfProof };
}

const HASH_FILES = () => [
  "digest/evidence-digest.json",
  "model-slots/gateway-receipt.json",
  "model-slots/model-slots.json",
  "verified/verified-narrative-artifact.json",
  "verified/verified-narrative-artifact.signature.json",
  "self-proof/self-proof-results.json",
];

async function writeEvidence() {
  const { digest, receipt, modelSlots, artifact, selfProof } = await assembleForBuild();
  await mkdir(join(EV, "digest"), { recursive: true });
  await mkdir(join(EV, "model-slots"), { recursive: true });
  await mkdir(join(EV, "verified"), { recursive: true });
  await mkdir(join(EV, "self-proof"), { recursive: true });
  await writeFile(join(EV, "digest", "evidence-digest.json"), stable(digest));
  await writeFile(join(EV, "model-slots", "gateway-receipt.json"), stable(receipt));
  await writeFile(join(EV, "model-slots", "model-slots.json"), stable(modelSlots));
  await writeFile(join(EV, "verified", "verified-narrative-artifact.json"), stable(artifact));
  await writeFile(join(EV, "self-proof", "self-proof-results.json"), stable(selfProof));
  console.log(
    "stage3s evidence: wrote digest + slots + artifact + self-proof (run sign-3s then hash)"
  );
}

async function verifyEvidence() {
  const { digest, artifact, selfProof } = await deriveForVerify();
  const cmp = [
    [join(EV, "digest", "evidence-digest.json"), digest],
    [join(EV, "verified", "verified-narrative-artifact.json"), artifact],
    [join(EV, "self-proof", "self-proof-results.json"), selfProof],
  ];
  for (const [p, v] of cmp) {
    const committed = JSON.parse(await readFile(p, "utf8"));
    if (stable(committed) !== stable(v))
      throw new Error(`committed ${p} drifted; run build --update`);
  }
  console.log("stage3s evidence: verified committed");
}

export async function rewriteHashes() {
  const hashes = {};
  const missing = [];
  for (const name of HASH_FILES()) {
    try {
      hashes[name] = sha(await readFile(join(EV, name), "utf8"));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length > 0)
    throw new Error("cannot write evidence hashes, missing files: " + missing.join(", "));
  await writeFile(
    join(EV, "evidence-hashes.json"),
    stable({ schema: "simurgh.defensive_narrative.hashes.v1", hashes })
  );
}

export async function verifyHashes() {
  const committed = JSON.parse(await readFile(join(EV, "evidence-hashes.json"), "utf8"));
  for (const name of HASH_FILES()) {
    const actual = sha(await readFile(join(EV, name), "utf8"));
    if (committed.hashes[name] !== actual) throw new Error(`evidence hash mismatch: ${name}`);
  }
  return true;
}

async function mainCli() {
  const sub = process.argv[2];
  if (sub === "build") {
    if (process.argv.includes("--update")) await writeEvidence();
    else await verifyEvidence();
    return;
  }
  if (sub === "hash") {
    await rewriteHashes();
    console.log("stage3s: rewrote evidence-hashes.json");
    return;
  }
  if (sub === "verify-hashes") {
    await verifyHashes();
    console.log("stage3s: evidence hashes match");
    return;
  }
  console.error("usage: simurgh-narrative.mjs build [--update] | hash | verify-hashes");
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
