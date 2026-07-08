// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — mapCore (spec §2, plan Task 6). Motto: AnthropicSafe First, then ReviewerSafe.
// buildMap assembles the public WFM (total grid + full score matrix + flags + aggregates +
// tensor commitments + digests + self_report) and the sealed audit bundle. recomputeReadout
// (195) rebuilds the matrix from tensors; checkSelfReport (197) is the dual-signal conflict
// check. Scalar of record: the post-final-norm logit is what the capture's lens rows encode,
// so the readout score is dot(activation, lens_row).
import { decodeF32LE, dotF64, scoreNano, tensorCommitment } from "./tensorCore.mjs";
import { expandGrid, buildScores, flagsFor, aggregatesFromFlags } from "./gridCore.mjs";
import { declarationDigest } from "./declarationCore.mjs";
import { VWA_MAP_SCHEMA, VWA_AUDIT_SCHEMA } from "../constants.mjs";

const lensKey = (layer, token_id) => `${layer}:${token_id}`;

// buildMap({declaration, activations, lensRows, saltFor, selfReport?, provenance?})
//   activations: { "prompt:t:layer": bytes }, lensRows: { "layer:token_id": bytes }
//   saltFor(prefixedKey) → salt string. Returns { map, audit }.
export function buildMap({ declaration, activations, lensRows, saltFor, selfReport, provenance }) {
  const decl = { prompts: declaration.corpus_manifest.prompts, layers: declaration.layers };
  const lexicon = { tokens: declaration.tokens };
  const theta = declaration.theta_nano;

  const scoreFn = (c, tok) => {
    const a = decodeF32LE(activations[`${c.prompt_id}:${c.t}:${c.layer}`]);
    const l = decodeF32LE(lensRows[lensKey(c.layer, tok.token_id)]);
    return dotF64(a, l);
  };
  const cells = buildScores(expandGrid(decl), lexicon, scoreFn).map((c) => ({
    ...c,
    flags: flagsFor(c.scores, theta),
  }));
  const aggregates = aggregatesFromFlags(cells);

  const commitments = {};
  const auditTensors = {};
  const auditSalts = {};
  for (const [k, bytes] of Object.entries(activations)) {
    const pk = `act:${k}`;
    commitments[pk] = tensorCommitment(saltFor(pk), bytes);
    auditTensors[pk] = Array.from(bytes);
    auditSalts[pk] = saltFor(pk);
  }
  for (const [k, bytes] of Object.entries(lensRows)) {
    const pk = `lens:${k}`;
    commitments[pk] = tensorCommitment(saltFor(pk), bytes);
    auditTensors[pk] = Array.from(bytes);
    auditSalts[pk] = saltFor(pk);
  }

  const map = {
    schema: VWA_MAP_SCHEMA,
    declaration_digest: declarationDigest(declaration),
    theta_nano: theta,
    position_rule_id: declaration.position_rule_id,
    layers: declaration.layers,
    cells,
    aggregates,
    commitments,
    self_report: { n_flags: selfReport?.n_flags ?? aggregates.flag_total },
    provenance: provenance ?? "fixture",
  };
  const audit = { schema: VWA_AUDIT_SCHEMA, salts: auditSalts, tensors: auditTensors };
  return { map, audit };
}

// recomputeReadout(map, audit, declaration) → null | {raw:195}. Audit tier only: rebuild
// every cell's score matrix from the sealed tensors and compare, nano-for-nano.
export function recomputeReadout(map, audit, declaration) {
  void declaration;
  for (const c of map.cells) {
    const a = decodeF32LE(Uint8Array.from(audit.tensors[`act:${c.prompt_id}:${c.t}:${c.layer}`]));
    for (const s of c.scores) {
      const l = decodeF32LE(Uint8Array.from(audit.tensors[`lens:${lensKey(c.layer, s.token_id)}`]));
      if (scoreNano(dotF64(a, l)) !== s.score_nano)
        return {
          raw: 195,
          reason: "vwa_readout_recompute_mismatch",
          detail: { cell: [c.prompt_id, c.t, c.layer], token_id: s.token_id },
        };
    }
  }
  return null;
}

// checkSelfReport(map) → null | {raw:197}. The monitor's claimed n_flags vs the recomputed
// flag_total. Proves the report and the telemetry disagree — it does NOT adjudicate which
// is true (non-claim).
export function checkSelfReport(map) {
  if (map?.self_report?.n_flags !== map?.aggregates?.flag_total)
    return {
      raw: 197,
      reason: "vwa_self_report_conflict",
      detail: { claimed: map?.self_report?.n_flags, recomputed: map?.aggregates?.flag_total },
    };
  return null;
}
