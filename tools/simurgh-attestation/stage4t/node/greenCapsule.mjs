// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC green-capsule builder (shared by fixtures, parity, K7). Motto: AnthropicSafe First, then ReviewerSafe.
//
// Assembles the canonical honest Incident Capsule over a REAL 4S delegation-chain
// bundle (forged-attenuation → verdict 108: a contained over-scoped crossing). Every
// evidence_backed template section recomputes from a sealed census artifact.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { build as buildChain } from "../../stage4s/node/build-stage4s-fixtures.mjs";
import { evaluateChainSafe } from "../../stage4s/core/chainCore.mjs";
import { buildEvidenceManifest } from "../core/censusCore.mjs";
import { buildCapsule, resignBundle } from "../core/capsuleCore.mjs";
import { deterministicSalt, sectionKey } from "../core/viewCore.mjs";
import { TEMPLATE_REGIMES, TEMPLATE_SNAPSHOT_DIGESTS, PARTITIONS } from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4t/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");

export const EPOCH = "vic-incident-epoch-0001";
export const RANGE = "2026-07-01/2026-07-02";

// Real 4S chain with an over-scoped crossing → verdict 108 (contained near-incident).
export function buildIncidentChainBundle() {
  return buildChain({ aScope: ["admin.all", "mail.read"] });
}

export const STAGE_VERIFIERS = Object.freeze({
  stage4s_chain_bundle: (a) => evaluateChainSafe(a.bundle, {}).raw,
});

// Re-sign an edited green bundle with the committed vic key (fixture authorship).
export function resignGreen(bundle) {
  return resignBundle(bundle, readKey("vic"));
}

export function buildGreenBundle({
  privKeyName = "vic",
  pubKeyName = "vic",
  falsifyChainVerdict = false,
} = {}) {
  const chainBundle = buildIncidentChainBundle();
  const realVerdict = evaluateChainSafe(chainBundle, {}).raw; // 108
  const recordedVerdict = falsifyChainVerdict ? 0 : realVerdict;

  const chainArt = {
    kind: "stage4s_chain_bundle",
    epoch: EPOCH,
    range: RANGE,
    participants: ["agent-a", "agent-b"],
    recorded_verdict: recordedVerdict,
    bundle: chainBundle,
  };
  const kernelArt = {
    kind: "kernel_decision_records",
    epoch: EPOCH,
    decisions: [{ decision: "blocked" }, { decision: "blocked" }],
  };
  const anchorArt = { kind: "stage4n_temporal_anchor", epoch: EPOCH, beat_index: 42 };
  const evidenceArtifacts = [chainArt, kernelArt, anchorArt];

  const chainDigest = recordDigest(chainArt);
  const kernelDigest = recordDigest(kernelArt);
  const anchorDigest = recordDigest(anchorArt);

  const manifest = buildEvidenceManifest({
    epoch: EPOCH,
    items: evidenceArtifacts.map((a) => ({ kind: a.kind, digest: recordDigest(a), epoch: EPOCH })),
  });

  // Recompute values for each evidence_backed section (they must match the registry).
  const backed = {
    gpai_art55: {
      incident_dates: { value: RANGE, evidence_digest: chainDigest, recompute_kind: "epoch_range" },
      chain_of_events: {
        value: realVerdict,
        evidence_digest: chainDigest,
        recompute_kind: "stage4s_chain_verdict",
      },
      serious_incident_response: {
        value: 2,
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
        value: 2,
        evidence_digest: kernelDigest,
        recompute_kind: "kernel_block_record",
      },
    },
  };

  // Project every template section per its partition class (faithful capsule).
  const projectedSections = [];
  for (const regime of TEMPLATE_REGIMES) {
    for (const [sectionId, cls] of Object.entries(PARTITIONS[regime])) {
      if (cls === "evidence_backed") {
        projectedSections.push({
          regime,
          section_id: sectionId,
          class: cls,
          ...backed[regime][sectionId],
        });
      } else {
        projectedSections.push({ regime, section_id: sectionId, class: cls });
      }
    }
  }

  const templateBindings = TEMPLATE_REGIMES.map((regime) => ({
    regime,
    template_snapshot_digest: TEMPLATE_SNAPSHOT_DIGESTS[regime],
    partition_digest: recordDigest(PARTITIONS[regime]),
  }));

  const salts = Object.fromEntries(
    projectedSections.map((s) => [sectionKey(s), deterministicSalt(sectionKey(s))])
  );

  const anchoredField = {
    value: 42,
    evidence_digest: anchorDigest,
    recompute_kind: "stage4n_beat_index",
  };

  const bundle = buildCapsule({
    epoch: EPOCH,
    templateBindings,
    manifest,
    evidenceArtifacts,
    projectedSections,
    anchoredField,
    salts,
    privKeyPem: readKey(privKeyName),
    pubKeyPem: readKey(pubKeyName),
  });

  return { bundle, salts, pubKeyPem: readKey(pubKeyName), recordedVerdict, realVerdict };
}
