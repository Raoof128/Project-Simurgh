// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — deterministic synthetic bundle builder (Lane A). The SINGLE production source for the
// "Redacted Risk Report" (Oxford worked-example family). No Date.now(), no randomness → byte stable.
// The unit fixture (_validBundle.mjs) imports this and adds resign() test helpers.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createPublicKey } from "node:crypto";
import { DOMAIN, VSD_SCHEMAS } from "../constants.mjs";
import { domainDigest, artifactDigest, identityDigest } from "../core/digests.mjs";
import { fingerprint, signContent } from "../core/signatures.mjs";
import { runRecipe, runRecomputeKernel } from "./recomputeKernelRunner.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage5h/test-keys");

function loadKey(role) {
  const priv = readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${role}.pem`), "utf8");
  const pubPem = createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
  return { priv, pubPem, fp: fingerprint(pubPem) };
}
const identity = (subject, key) => ({
  identity_subject: subject,
  public_key_pem: key.pubPem,
  key_fingerprint: key.fp,
});

export function buildArtefacts() {
  const rows = (prefix, val, n) =>
    Array.from({ length: n }, (_, i) => ({
      case_id: `${prefix}-${i + 1}`,
      metric: "refusal_rate",
      value: val,
    }));
  return {
    "redteam-summary": {
      schema: "vsd.fixture.eval_results.v1",
      metric: "refusal_rate",
      rows: rows("rt", "0.90", 4),
    },
    "judge-rubric": { schema: "vsd.fixture.rubric.v1", panel: "judges-of-3", version: "1.0" },
    "eval-results": {
      schema: "vsd.fixture.eval_results.v1",
      metric: "refusal_rate",
      rows: rows("hb", "0.94", 6),
    },
  };
}

const recipeFor = (inputIds) => ({
  schema: VSD_SCHEMAS.recompute_recipe,
  op: "aggregate_mean",
  input_artefact_ids: inputIds,
  metric: "refusal_rate",
  decimals: 4,
});
const scope = (kind) => ({
  checkpoint_kind: kind,
  environment: "offline",
  pipeline_components: ["constitutional_training", "refusal_head"],
  uncertainty_note: "distribution shift + evaluation-awareness not excluded",
});

export function claimDigest(claim) {
  return domainDigest(DOMAIN.claim, claim);
}

export function buildSyntheticBundle() {
  const producerKey = loadKey("producer");
  const hostKey = loadKey("host");
  const verifierKey = loadKey("verifier");
  const producer_identity = identity("frontier-lab@example.org", producerKey);
  const host_identity = identity("aisi-review-host@example.org", hostKey);
  const verifier_identity = identity("simurgh-verifier@example.org", verifierKey);

  const artefacts = buildArtefacts();
  const cbrnRecipe = recipeFor(["redteam-summary"]);
  const harmbenchRecipe = recipeFor(["eval-results"]);
  const recipes = {
    "frontier7b-cbrn-threshold": cbrnRecipe,
    "frontier7b-harmbench-public": harmbenchRecipe,
  };
  const cbrnOutput = runRecipe(cbrnRecipe, artefacts);
  const harmbenchOutput = runRecipe(harmbenchRecipe, artefacts);

  const claims = [
    {
      claim_id: "frontier7b-cbrn-threshold",
      claim_text_digest: artifactDigest("Frontier-7B does not exceed CCL-3 CBRN uplift."),
      declared_consequence: "threshold_crossing",
      declared_tier: "controlled",
      method_summary_digest: artifactDigest(
        "N=2400 red-team prompts, panel-of-judges adjudication."
      ),
      scope_statement: scope("refusal_relaxed_checkpoint"),
      artefact_manifest: {
        present: [
          { artefact_id: "redteam-summary", digest: artifactDigest(artefacts["redteam-summary"]) },
          { artefact_id: "judge-rubric", digest: artifactDigest(artefacts["judge-rubric"]) },
        ],
        withheld: [
          {
            artefact_id: "redteam-prompts",
            justification_type: "safety_hazard",
            available_at_tier: "controlled",
            reason: "raw CBRN elicitation prompts",
          },
          {
            artefact_id: "model-weights",
            justification_type: "security_sensitive",
            available_at_tier: "controlled",
            reason: "frontier weights",
          },
        ],
      },
      recompute: {
        recipe_digest: domainDigest(DOMAIN.recompute_recipe, cbrnRecipe),
        committed_output_digest: artifactDigest(cbrnOutput),
      },
    },
    {
      claim_id: "frontier7b-harmbench-public",
      claim_text_digest: artifactDigest(
        "Constitutional training raises HarmBench-public refusal to 0.94."
      ),
      declared_consequence: "supporting",
      declared_tier: "public",
      method_summary_digest: artifactDigest("Public HarmBench-CBRN-public subset, N=6."),
      scope_statement: scope("representative_launch_checkpoint"),
      artefact_manifest: {
        present: [
          { artefact_id: "eval-results", digest: artifactDigest(artefacts["eval-results"]) },
        ],
        withheld: [],
      },
      recompute: {
        recipe_digest: domainDigest(DOMAIN.recompute_recipe, harmbenchRecipe),
        committed_output_digest: artifactDigest(harmbenchOutput),
      },
    },
    {
      claim_id: "frontier7b-monitoring-context",
      claim_text_digest: artifactDigest(
        "90-day deployment monitoring suggests no incident escalation."
      ),
      declared_consequence: "contextual",
      declared_tier: "restricted",
      scope_statement: scope("production_configuration"),
      artefact_manifest: { present: [], withheld: [] },
      restriction: {
        reason: "operational monitoring data confidential",
        right_scaling_note: "context only; not a release-justifying warrant",
      },
    },
  ];

  const inventoryContent = {
    inventory_id: "vsd-inv-frontier7b-2026-07",
    producer_identity_digest: identityDigest(producer_identity),
    report_ref: { title_digest: artifactDigest("Frontier-7B Risk Report"), period: "2026-Q3" },
    claims,
  };
  const claim_inventory = {
    schema: VSD_SCHEMAS.claim_inventory,
    content: inventoryContent,
    inventory_digest: domainDigest(DOMAIN.claim_inventory, inventoryContent),
    producer_signature: signContent(producerKey.priv, DOMAIN.claim_inventory, inventoryContent),
  };

  const receiptContent = {
    claim_digest: claimDigest(claims[0]),
    inventory_digest: claim_inventory.inventory_digest,
    host_identity_digest: identityDigest(host_identity),
    host_key_fingerprint: hostKey.fp,
    recomputed_output_digest: artifactDigest(cbrnOutput),
    verdict: "reproduced",
  };
  const review_receipts = [
    {
      schema: VSD_SCHEMAS.review_receipt,
      content: receiptContent,
      receipt_digest: domainDigest(DOMAIN.review_receipt, receiptContent),
      host_signature: signContent(hostKey.priv, DOMAIN.review_receipt, receiptContent),
    },
  ];

  const verdict_table = [
    {
      claim_id: "frontier7b-cbrn-threshold",
      proven_tier: "controlled",
      support_quality: "qualified",
      max_consequence_warranted: "threshold_crossing",
      inverted: false,
      right_scaling_distance: 0,
    },
    {
      claim_id: "frontier7b-harmbench-public",
      proven_tier: "public",
      support_quality: "full",
      max_consequence_warranted: "threshold_crossing",
      inverted: false,
      right_scaling_distance: 0,
    },
    {
      claim_id: "frontier7b-monitoring-context",
      proven_tier: "restricted",
      support_quality: "descriptive",
      max_consequence_warranted: "contextual",
      inverted: false,
      right_scaling_distance: 0,
    },
  ];

  const artefacts_ref = [
    {
      artefact_id: "redteam-summary",
      path: "artefacts/redteam-summary.json",
      digest: artifactDigest(artefacts["redteam-summary"]),
    },
    {
      artefact_id: "judge-rubric",
      path: "artefacts/judge-rubric.json",
      digest: artifactDigest(artefacts["judge-rubric"]),
    },
    {
      artefact_id: "eval-results",
      path: "artefacts/eval-results.json",
      digest: artifactDigest(artefacts["eval-results"]),
    },
  ];
  const inventory_census_digest = domainDigest(DOMAIN.inventory_census, {
    claim_ids: claims.map((c) => c.claim_id).sort(),
    artefact_ids: artefacts_ref.map((a) => a.artefact_id).sort(),
  });

  const attContent = {
    claim_inventory,
    review_receipts,
    producer_identity,
    verifier_identity,
    artefacts_ref,
    verdict_table,
    inventory_census_digest,
  };
  const bundle = {
    schema: VSD_SCHEMAS.disclosure_attestation,
    ...attContent,
    attestation_signature: signContent(verifierKey.priv, DOMAIN.disclosure_attestation, attContent),
  };

  const pin = {
    key_fingerprint: verifierKey.fp,
    identity_subject: verifier_identity.identity_subject,
    identity_digest: identityDigest(verifier_identity),
  };
  const hostRegistry = [
    {
      host_subject: host_identity.identity_subject,
      host_key_fingerprint: hostKey.fp,
      public_key_pem: hostKey.pubPem,
    },
  ];
  const recomputeResult = runRecomputeKernel({ claims, recipes, artefactBytes: artefacts });

  return {
    bundle,
    artefacts,
    recipes,
    pin,
    hostRegistry,
    recomputeResult,
    keys: { producerKey, hostKey, verifierKey },
  };
}
