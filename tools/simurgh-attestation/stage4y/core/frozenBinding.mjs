// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — frozen binding (184) + reconciliation (186) (spec §2, plan Task 7).
// Motto: AnthropicSafe First, then ReviewerSafe.
// 184 binds the map to the frozen 4W+4X rulesets by CONTENT digest (v1/v2/MR table) AND a
// SOURCE-BYTE witness over four files. P0-2: 4X's computeSourceWitness is hardcoded to only
// the two 4W files, so it can never catch a 4X code change — VDR writes its OWN witness over
// FOUR_WX_SOURCE_FILES (both 4W + both 4X source files).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { v1RulesetDigest } from "../../stage4x/core/corpusCore.mjs";
import { v2Digest } from "../../stage4x/core/gateV2.mjs";
import { metamorphicTableDigest } from "../../stage4x/core/metamorphicTable.mjs";

const sha = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");
// Repo root = five `..` up from .../stage4y/core/frozenBinding.mjs (core, stage4y,
// simurgh-attestation, tools, root).
const DEFAULT_ROOT = join(fileURLToPath(import.meta.url), "../../../../..");

export const FOUR_WX_SOURCE_FILES = Object.freeze([
  "tools/simurgh-attestation/stage4w/core/leakageGate.mjs",
  "tools/simurgh-attestation/stage4w/constants.mjs",
  "tools/simurgh-attestation/stage4x/core/gateV2.mjs",
  "tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs",
]);

// sourceWitness({rootDir}) → { relpath: "sha256:"+hex } over the four file BYTES. DI seam.
export function sourceWitness({ rootDir = DEFAULT_ROOT } = {}) {
  const out = {};
  for (const rel of FOUR_WX_SOURCE_FILES) out[rel] = sha(readFileSync(join(rootDir, rel)));
  return out;
}

export function sourceWitnessDigest(opts) {
  return sha(Buffer.from(canonicalJson(sourceWitness(opts)), "utf8"));
}

// The live frozen block a well-formed map must carry.
export function freshFrozenBlock(opts) {
  return {
    v1_ruleset_digest: v1RulesetDigest(),
    v2_digest: v2Digest(),
    metamorphic_table_digest: metamorphicTableDigest(),
    source_witness_digest: sourceWitnessDigest(opts),
  };
}

const fail184 = (detail) => ({ raw: 184, reason: "vdr_frozen_binding_mismatch", detail });

export function checkFrozenBinding(map, opts) {
  const f = map?.frozen ?? {};
  const live = freshFrozenBlock(opts);
  if (f.v1_ruleset_digest !== live.v1_ruleset_digest) return fail184("v1_ruleset_digest_mismatch");
  if (f.v2_digest !== live.v2_digest) return fail184("v2_digest_mismatch");
  if (f.metamorphic_table_digest !== live.metamorphic_table_digest)
    return fail184("metamorphic_table_digest_mismatch");
  if (f.source_witness_digest !== live.source_witness_digest)
    return fail184("four_wx_source_drift");
  return null;
}

const fail186 = (detail) => ({ raw: 186, reason: "vdr_reconciliation_mismatch", detail });

// checkReconciliation(map, counterpart) → null | {raw:186,...}. Absence is NOT failure:
// a map with reconciliation:null or a missing counterpart returns null (no counterpart to
// reconcile). When both exist, the unredacted-segment class sequences must agree.
export function checkReconciliation(map, counterpart) {
  const rec = map?.reconciliation;
  if (rec == null || counterpart == null) return null;
  const a = rec.segment_class_sequence ?? [];
  const b = counterpart.segment_class_sequence ?? [];
  if (a.length !== b.length) return fail186("unredacted_segment_count_differs");
  for (let i = 0; i < a.length; i++)
    if (a[i] !== b[i]) return fail186("segment_class_sequence_differs");
  return null;
}
