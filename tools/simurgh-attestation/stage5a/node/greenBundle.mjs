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
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildGreenNarrative, resignNarrativeGreen } from "../../stage4w/node/greenNarrative.mjs";
import { buildMap } from "../../stage4z/core/mapCore.mjs";
import { declarationDigest } from "../../stage4z/core/declarationCore.mjs";
import { signAttestation } from "../../stage4z/core/vwaCore.mjs";
import { scoreNano } from "../../stage4z/core/tensorCore.mjs";
import { VNC_CLAIM_TABLE_SCHEMA, VNC_LEDGER_SCHEMA } from "../constants.mjs";
import { classify } from "../core/verdictCore.mjs";
import { partitionFlags, tallies } from "../core/partitionCore.mjs";
import { signArtifact, signVncAttestation } from "../core/vncCore.mjs";

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
  const { map, audit } = buildMap({
    declaration,
    activations,
    lensRows,
    saltFor,
    provenance: "fixture",
  });
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

// Find the pinned narrative's introspective (unverified_prose) span to anchor a claim.
function introspectiveSpanRef(narrative) {
  const s = narrative.content.span_map.find((x) => x.type === "unverified_prose");
  return { span_id: s.span_id, start_byte: s.start_byte, end_byte: s.end_byte };
}

// Assemble a full clean VNC bundle. Default claim: asserts_unflagged over token 2001 (which
// does NOT flag) → corroborated; the 1001 flags are all unnarrated. A conflict variant flips
// the claim to token 1001 → contradicted with evidence.
export function buildGreenVncBundle({ conflict = false } = {}) {
  const { narrative } = buildGreenNarrative();
  const vwa = makeVwaBundle();
  const spanRef = introspectiveSpanRef(narrative);
  const token = conflict ? "1001" : "2001";
  const claims = [
    { claim_id: "c1", span_ref: spanRef, token_ids: [token], polarity: "asserts_unflagged" },
  ];
  const claimTableContent = {
    schema: VNC_CLAIM_TABLE_SCHEMA,
    claims,
    scope_rule_id: "all_cells",
    narrative_digest: recordDigest(narrative),
    declaration_digest: vwa.map.declaration_digest,
  };
  const claim_table = signArtifact(claimTableContent, VNC_AUTHOR_PRIV, VNC_AUTHOR_PUB);

  const verdicts = classify(claim_table, vwa.map);
  // Build a provisional ledger to compute the partition + tallies, then seal the real one.
  const provisional = { content: { verdicts, unnarrated_flags: [] } };
  const { unnarrated } = partitionFlags(provisional, vwa.map);
  const ledgerContent = {
    schema: VNC_LEDGER_SCHEMA,
    verdicts,
    unnarrated_flags: unnarrated,
    claim_table_digest: recordDigest(claim_table),
    narrative_digest: recordDigest(narrative),
    map_digest: recordDigest(vwa.map),
    map_attestation_digest: recordDigest(vwa.attestation),
    provenance: "fixture",
    aggregates: {},
  };
  ledgerContent.aggregates = tallies({ content: ledgerContent });
  const ledger = signArtifact(ledgerContent, VNC_PRIV, VNC_PUB);

  const attestation = signVncAttestation(
    { claimTable: claim_table, ledger, narrative, mapAttestation: vwa.attestation },
    VNC_PUB,
    VNC_PRIV
  );

  return { narrative, vwa, claim_table, ledger, attestation };
}

export { resignNarrativeGreen };
