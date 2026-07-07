// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC Lane B — staged incident ceremony (spec §7). Motto: AnthropicSafe First, then ReviewerSafe.
//
// Runs the REAL 4S two-OS-process MCP stdio ceremony (a genuine A->B delegation hop),
// then projects that live delegation window into a dual-template Incident Capsule with
// three tiered audience views (regulator / insurer / public). Ephemeral keys — the
// committed capture is RE-VERIFIED, never regenerated. The seriousness classification
// and narrative sections are requires_human_input: the capsule refuses to invent a legal
// classification, and that refusal is the rail demonstrated in the flagship artifact.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { evaluateChainSafe } from "../../stage4s/core/chainCore.mjs";
import { runCeremony } from "../../stage4s/laneb/run-laneb-ceremony.mjs";
import { buildEvidenceManifest } from "../core/censusCore.mjs";
import { buildCapsule, evaluateCapsule } from "../core/capsuleCore.mjs";
import { buildView, verifyViewAgainstCommitments, sectionKey } from "../core/viewCore.mjs";
import { TEMPLATE_REGIMES, TEMPLATE_SNAPSHOT_DIGESTS, PARTITIONS } from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4t/laneb");
const EPOCH = "vic-laneb-incident-0001";
const RANGE = "2026-07-06/2026-07-06";

const STAGE_VERIFIERS = { stage4s_chain_bundle: (a) => evaluateChainSafe(a.bundle, {}).raw };

function assembleCapsule({ chainBundle, recordedVerdict, privPem, pubPem }) {
  const chainArt = {
    kind: "stage4s_chain_bundle",
    epoch: EPOCH,
    range: RANGE,
    participants: ["delegator-a", "delegatee-b"],
    recorded_verdict: recordedVerdict,
    bundle: chainBundle,
  };
  const kernelArt = {
    kind: "kernel_decision_records",
    epoch: EPOCH,
    decisions: [{ decision: "blocked" }],
  };
  const anchorArt = { kind: "stage4n_temporal_anchor", epoch: EPOCH, beat_index: 7 };
  const evidenceArtifacts = [chainArt, kernelArt, anchorArt];
  const chainDigest = recordDigest(chainArt);
  const kernelDigest = recordDigest(kernelArt);
  const anchorDigest = recordDigest(anchorArt);

  const manifest = buildEvidenceManifest({
    epoch: EPOCH,
    items: evidenceArtifacts.map((a) => ({ kind: a.kind, digest: recordDigest(a), epoch: EPOCH })),
  });

  const backed = {
    gpai_art55: {
      incident_dates: { value: RANGE, evidence_digest: chainDigest, recompute_kind: "epoch_range" },
      chain_of_events: {
        value: recordedVerdict,
        evidence_digest: chainDigest,
        recompute_kind: "stage4s_chain_verdict",
      },
      serious_incident_response: {
        value: 1,
        evidence_digest: kernelDigest,
        recompute_kind: "kernel_block_record",
      },
    },
    art73_high_risk_draft: {
      report_dates_classification: {
        value: RANGE,
        evidence_digest: chainDigest,
        recompute_kind: "epoch_range",
      },
      users_affected: {
        value: 2,
        evidence_digest: chainDigest,
        recompute_kind: "participant_count",
      },
      remedial_actions: {
        value: 1,
        evidence_digest: kernelDigest,
        recompute_kind: "kernel_block_record",
      },
    },
  };

  const projectedSections = [];
  for (const regime of TEMPLATE_REGIMES) {
    for (const [sectionId, cls] of Object.entries(PARTITIONS[regime])) {
      projectedSections.push(
        cls === "evidence_backed"
          ? { regime, section_id: sectionId, class: cls, ...backed[regime][sectionId] }
          : { regime, section_id: sectionId, class: cls }
      );
    }
  }

  const templateBindings = TEMPLATE_REGIMES.map((regime) => ({
    regime,
    template_snapshot_digest: TEMPLATE_SNAPSHOT_DIGESTS[regime],
    partition_digest: recordDigest(PARTITIONS[regime]),
  }));

  // Ephemeral random salts (Lane B) — never deterministic.
  const salts = Object.fromEntries(
    projectedSections.map((s) => [sectionKey(s), crypto.randomBytes(32).toString("hex")])
  );

  const bundle = buildCapsule({
    epoch: EPOCH,
    templateBindings,
    manifest,
    evidenceArtifacts,
    projectedSections,
    anchoredField: {
      value: 7,
      evidence_digest: anchorDigest,
      recompute_kind: "stage4n_beat_index",
    },
    salts,
    privKeyPem: privPem,
    pubKeyPem: pubPem,
  });

  // Three tiered views; the public view redacts identity-bearing sections per regime.
  const redactPublic = [
    "gpai_art55/submitter_information",
    "gpai_art55/model_involved",
    "art73_high_risk_draft/submitter_information",
    "art73_high_risk_draft/system_description",
  ];
  const views = {
    regulator: buildView(bundle.content, "regulator", [], salts),
    insurer: buildView(bundle.content, "insurer", ["gpai_art55/submitter_information"], salts),
    public: buildView(bundle.content, "public", redactPublic, salts),
  };
  return { bundle, views, pubPem };
}

export async function captureLaneB() {
  const ceremony = await runCeremony({ task: "vic staged delegation window" });
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const pubPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const recordedVerdict = ceremony.verdict.raw;
  const { bundle, views } = assembleCapsule({
    chainBundle: ceremony.bundle,
    recordedVerdict,
    privPem,
    pubPem,
  });
  return {
    schema: "simurgh.vic.laneb_capture.v1",
    transport: ceremony.transport,
    process_isolation: ceremony.process_isolation,
    recorded_chain_verdict: recordedVerdict,
    capsule_pubkey_pem: pubPem,
    capsule: bundle,
    views,
  };
}

export function verifyLaneBCapture(capture) {
  const opts = { capsulePubKeyPem: capture.capsule_pubkey_pem, stageVerifiers: STAGE_VERIFIERS };
  const capsuleResult = evaluateCapsule(capture.capsule, opts);
  if (capsuleResult.raw !== 0)
    return { ok: false, reason: "capsule_not_green", detail: capsuleResult };

  for (const [tier, view] of Object.entries(capture.views)) {
    const res = verifyViewAgainstCommitments(view, capture.capsule.content.section_commitments);
    if (res) return { ok: false, reason: `view_${tier}_invalid`, detail: res };
  }

  // The seriousness / narrative sections must be requires_human_input (rail in action).
  const humanInputSections = capture.capsule.content.projected_sections.filter(
    (p) =>
      (p.regime === "gpai_art55" && p.section_id === "resulting_harm") ||
      (p.regime === "art73_high_risk_draft" && p.section_id === "incident_nature")
  );
  if (!humanInputSections.every((p) => p.class === "requires_human_input"))
    return { ok: false, reason: "seriousness_not_human_input" };

  return { ok: true, recorded_chain_verdict: capture.recorded_chain_verdict };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv.includes("--verify") ? "verify" : "capture";
  const path = join(CAPDIR, "capture.json");
  if (mode === "capture") {
    const capture = await captureLaneB();
    mkdirSync(CAPDIR, { recursive: true });
    writeFileSync(path, canonicalJson(capture) + "\n");
    console.error(
      `stage4t Lane B: captured live MCP hop (verdict ${capture.recorded_chain_verdict}) + 3 views`
    );
  } else {
    const capture = JSON.parse(readFileSync(path, "utf8"));
    const res = verifyLaneBCapture(capture);
    console.error("stage4t Lane B verify:", JSON.stringify(res));
    process.exit(res.ok ? 0 : 1);
  }
}
