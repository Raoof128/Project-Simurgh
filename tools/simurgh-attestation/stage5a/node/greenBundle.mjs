// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — the green (clean) bundle builder: a full, valid VNC bundle assembled from a
// real 4W narrative (over the pinned 4T capsule) + a synthetic-but-valid 4Z map + a
// precommitted claim table + the recomputed ledger + the VNC attestation. Shared by the
// bindingCore tests (Task 6) and the fixture builder (Task 10). Deterministic: committed
// fixture keys + fixed inputs → byte-stable. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { recordDigest, sha256Hex } from "../../stage4m/core/canonical.mjs";
import { buildGreenNarrative, resignNarrativeGreen } from "../../stage4w/node/greenNarrative.mjs";
import { buildMap } from "../../stage4z/core/mapCore.mjs";
import { declarationDigest } from "../../stage4z/core/declarationCore.mjs";
import { signAttestation } from "../../stage4z/core/vwaCore.mjs";
import { scoreNano } from "../../stage4z/core/tensorCore.mjs";
import {
  VNC_CLAIM_TABLE_SCHEMA,
  VNC_LEDGER_SCHEMA,
  VNC_REFLECTION_MANIFEST_SCHEMA,
  VNC_PILOT_ADAPTATION_SCHEMA,
} from "../constants.mjs";
import { classify } from "../core/verdictCore.mjs";
import { computeUnnarrated, tallies } from "../core/partitionCore.mjs";
import { manifestRoot } from "../core/manifestCore.mjs";
import { signArtifact, signVncAttestation } from "../core/vncCore.mjs";

const sha = (s) => "sha256:" + sha256Hex(s);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const K5 = join(ROOT, "tests/fixtures/llmShield/stage5a/test-keys");
const K4Z = join(ROOT, "tests/fixtures/llmShield/stage4z/test-keys");
const rd = (p) => readFileSync(p, "utf8");

export const VNC_PRIV = rd(join(K5, "INSECURE_FIXTURE_ONLY_vnc.pem"));
export const VNC_PUB = rd(join(K5, "INSECURE_FIXTURE_ONLY_vnc.pub.pem"));
export const VNC_AUTHOR_PRIV = rd(join(K5, "INSECURE_FIXTURE_ONLY_vnc-author.pem"));
export const VNC_AUTHOR_PUB = rd(join(K5, "INSECURE_FIXTURE_ONLY_vnc-author.pub.pem"));
const VWA_PRIV = rd(join(K4Z, "INSECURE_FIXTURE_ONLY_vwa.pem"));
export const VWA_PUB = rd(join(K4Z, "INSECURE_FIXTURE_ONLY_vwa.pub.pem"));

const f32 = (values) => {
  const b = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
};

// A valid synthetic 4Z bundle. tokenVals maps token_id → readout score; score(cell,token) =
// dot([1,0],[val,0]) = val, constant across cells. token flags iff val ≥ thetaVal.
export function makeVwaBundle(
  id = "vnc-green",
  {
    tokens = [{ token_id: 1001 }, { token_id: 2001 }],
    tokenVals = { 1001: 5, 2001: 1 },
    thetaVal = 3,
    prompts = [{ prompt_id: "p1", n_tokens: 2 }],
    layers = [2, 5],
    provenance = "fixture",
    extraMapFields = {},
  } = {}
) {
  const declaration = {
    schema: "simurgh.vwa.declaration.v1",
    tokens,
    theta_nano: scoreNano(thetaVal),
    corpus_manifest: {
      prompts: prompts.map((p) => ({
        prompt_id: p.prompt_id,
        n_tokens: p.n_tokens,
        prompt_digest: "sha256:" + createHash("sha256").update(p.prompt_id).digest("hex"),
      })),
    },
    position_rule_id: "all_positions",
    layers,
    tokenizer: "insecure-fixture-tokenizer-v1",
  };
  const activations = {};
  for (const p of prompts)
    for (let t = 0; t < p.n_tokens; t++)
      for (const layer of layers) activations[`${p.prompt_id}:${t}:${layer}`] = f32([1, 0]);
  const lensRows = {};
  for (const layer of layers)
    for (const tok of tokens)
      lensRows[`${layer}:${tok.token_id}`] = f32([tokenVals[tok.token_id], 0]);
  const saltFor = (key) =>
    createHash("sha256").update(`vnc-fixture-salt:${id}:${key}`).digest("hex").slice(0, 16);
  const { map, audit } = buildMap({ declaration, activations, lensRows, saltFor, provenance });
  Object.assign(map, extraMapFields); // adapter markers etc., bound by the attestation below
  const capture = {
    schema: "simurgh.vwa.capture.v1",
    model_id: "insecure-fixture-model",
    revision_digest:
      "sha256:" +
      createHash("sha256")
        .update("rev:" + id)
        .digest("hex"),
    lens_digest:
      "sha256:" +
      createHash("sha256")
        .update("lens:" + id)
        .digest("hex"),
    declaration_digest: declarationDigest(declaration),
    prompt_token_counts: Object.fromEntries(prompts.map((p) => [p.prompt_id, p.n_tokens])),
    commitments: structuredClone(map.commitments),
    ceremony: { outcome: "captured", timestamp: "2026-07-08T00:00:00Z" },
  };
  const attestation = signAttestation(declaration, capture, map, audit, VWA_PUB, VWA_PRIV);
  return { declaration, capture, map, audit, attestation };
}

// The pinned narrative's introspective (unverified_prose) span, to anchor a claim.
export function introspectiveSpanRef(narrative) {
  const s = narrative.content.span_map.find((x) => x.type === "unverified_prose");
  return { span_id: s.span_id, start_byte: s.start_byte, end_byte: s.end_byte };
}

// Seal a ledger's aggregates + signature over the given content skeleton.
function sealLedger(content) {
  content.aggregates = tallies({ content });
  return signArtifact(content, VNC_PRIV, VNC_PUB);
}

// Rebuild the VNC attestation over the CURRENT artifacts (used after any fixture mutation).
export function rebuildAttestation(bundle) {
  bundle.attestation = signVncAttestation(
    {
      claimTable: bundle.claim_table,
      ledger: bundle.ledger,
      narrative: bundle.narrative,
      mapAttestation: bundle.vwa.attestation,
      reflectionManifest: bundle.reflection_manifest ?? null,
      pilotAdaptation: bundle.pilot_adaptation ?? null,
    },
    VNC_PUB,
    VNC_PRIV
  );
  return bundle;
}

// Re-seal the ledger (recompute aggregates + resign) then rebuild the attestation.
export function resealLedger(bundle) {
  bundle.ledger = sealLedger(bundle.ledger.content);
  return rebuildAttestation(bundle);
}

// Assemble a full, signed VNC bundle from parts. `claims` drives the claim table; the ledger
// is recomputed from (claims, map); optional RCP / pilot artifacts ride the same attestation.
export function assemble({
  narrative,
  vwa,
  claims,
  reflectionManifest = null,
  pilotAdaptation = null,
  pilotRawBytesB64 = null,
}) {
  const claim_table = signArtifact(
    {
      schema: VNC_CLAIM_TABLE_SCHEMA,
      claims,
      scope_rule_id: "all_cells",
      narrative_digest: recordDigest(narrative),
      declaration_digest: vwa.map.declaration_digest,
    },
    VNC_AUTHOR_PRIV,
    VNC_AUTHOR_PUB
  );
  const verdicts = classify(claim_table, vwa.map);
  const ledger = sealLedger({
    schema: VNC_LEDGER_SCHEMA,
    verdicts,
    unnarrated_flags: computeUnnarrated(verdicts, vwa.map),
    claim_table_digest: recordDigest(claim_table),
    narrative_digest: recordDigest(narrative),
    map_digest: recordDigest(vwa.map),
    map_attestation_digest: recordDigest(vwa.attestation),
    provenance: "fixture",
    aggregates: {},
  });
  const bundle = { narrative, vwa, claim_table, ledger };
  if (reflectionManifest) bundle.reflection_manifest = reflectionManifest;
  if (pilotAdaptation) bundle.pilot_adaptation = pilotAdaptation;
  if (pilotRawBytesB64) bundle.pilot_raw_bytes_b64 = pilotRawBytesB64;
  return rebuildAttestation(bundle);
}

// A default clean bundle: asserts_unflagged over token 2001 (does NOT flag) → corroborated;
// the 1001 flags are all unnarrated. conflict:true → claim over 1001 → contradicted w/ evidence.
export function buildGreenVncBundle({ conflict = false } = {}) {
  const { narrative } = buildGreenNarrative();
  const vwa = makeVwaBundle();
  const claims = [
    {
      claim_id: "c1",
      span_ref: introspectiveSpanRef(narrative),
      token_ids: [conflict ? "1001" : "2001"],
      polarity: "asserts_unflagged",
    },
  ];
  return assemble({ narrative, vwa, claims });
}

// A clean RCP manifest over a tiny constitution-shaped corpus (open-scope demo).
export function buildReflectionManifest() {
  const examples = [
    { example_digest: sha("ex:refuse-harm-1"), principle_ids: ["constitution.safety"] },
    {
      example_digest: sha("ex:be-honest-1"),
      principle_ids: ["constitution.honesty", "constitution.safety"],
    },
    { example_digest: sha("ex:be-honest-2"), principle_ids: ["constitution.honesty"] },
  ];
  return {
    content: {
      schema: VNC_REFLECTION_MANIFEST_SCHEMA,
      corpus_id: "claude-constitution",
      corpus_revision: "2026-01-22",
      license: "CC0-1.0",
      examples,
      principle_registry: {
        "constitution.safety": { source_digest: sha("clause:broadly-safe") },
        "constitution.honesty": { source_digest: sha("clause:broadly-honest") },
      },
      merkle_root: manifestRoot(examples.map((e) => e.example_digest)),
    },
  };
}

// A clean pilot: an adapter-derived 4Z bundle + the pilot artifact + the frozen raw export.
export function buildPilotAdaptation() {
  const RAW = Buffer.from("neuronpedia:gemma-2-2b:v1 frozen readout export (fixture)");
  const lossiness = ["salts", "self_report_derived", "ceremony"];
  const vwa = makeVwaBundle("pilot", {
    provenance: "adapter_derived",
    extraMapFields: { adapter_derived_fields: [...lossiness] },
  });
  const pilot = {
    content: {
      schema: VNC_PILOT_ADAPTATION_SCHEMA,
      external_export_id: "neuronpedia:gemma-2-2b:v1",
      source_digest: "sha256:" + createHash("sha256").update(RAW).digest("hex"),
      adapter_version: "vnc.adapter.v1",
      adapter_role: "adapter",
      lossiness: [...lossiness],
      map_attestation_digest: recordDigest(vwa.attestation),
    },
  };
  return { vwa, pilot, rawB64: RAW.toString("base64") };
}

export { resignNarrativeGreen };
