// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — shadow replay (spec §1, plan Task 6). Motto: AnthropicSafe First, then ReviewerSafe.
// Per caught REGION (gate-native unit — the MR transforms are sentence-designed), replay all
// six frozen 4X transforms and re-scan each variant with the REAL gates run over the variant as
// a whole body. There is NO single-text checkV1/checkV2 predicate — scanLeakage(variant, [], [])
// is the idiom. Slips are counted over APPLICABLE (non-no-op) variants only.
import { createHash } from "node:crypto";
import { scanLeakage } from "../../stage4w/core/leakageGate.mjs";
import { scanLeakageV2 } from "../../stage4x/core/gateV2.mjs";
import { MR_IDS, applyMR } from "../../stage4x/core/metamorphicTable.mjs";

const digest = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const slipsV1 = (variant) => scanLeakage(variant, [], []).length === 0;
const slipsV2 = (variant) => scanLeakageV2(variant, [], []).length === 0;

// computeShadow(regionText) → one record per MR id. A byte-identical variant is applicable:false.
export function computeShadow(regionText) {
  return MR_IDS.map((mr_id) => {
    const variant = applyMR(mr_id, regionText);
    if (variant === regionText) return { mr_id, applicable: false };
    return {
      mr_id,
      applicable: true,
      variant_digest: digest(variant),
      slips_v1: slipsV1(variant),
      slips_v2: slipsV2(variant),
    };
  });
}

// aggregateShadow(perRegionRecords[][]) → the signed headline numbers. Slips over APPLICABLE only.
export function aggregateShadow(perRegion) {
  let a = 0;
  let k1 = 0;
  let k2 = 0;
  for (const recs of perRegion)
    for (const r of recs)
      if (r.applicable) {
        a += 1;
        if (r.slips_v1) k1 += 1;
        if (r.slips_v2) k2 += 1;
      }
  return {
    n_caught_regions: perRegion.length,
    a_applicable_variants: a,
    k_slip_v1: k1,
    k_slip_v2: k2,
  };
}

const fail = (detail) => ({ raw: 187, reason: "vdr_shadow_replay_mismatch", detail });

// checkShadowReplay(sealed[]) → null | {raw:187,...}. sealed[i] = {region_text, records}.
// Recomputes every record from region_text and compares digest, applicable flag, and slips.
export function checkShadowReplay(sealed) {
  const perRegion = [];
  for (const { region_text, records } of sealed ?? []) {
    const fresh = computeShadow(region_text);
    if (!Array.isArray(records) || records.length !== fresh.length)
      return fail("record_count_mismatch");
    const byId = new Map(fresh.map((r) => [r.mr_id, r]));
    for (const rec of records) {
      const f = byId.get(rec.mr_id);
      if (!f) return fail("unknown_mr_id");
      if (rec.applicable !== f.applicable) return fail("applicable_flag_mismatch");
      if (f.applicable) {
        if (rec.variant_digest !== f.variant_digest) return fail("variant_digest_mismatch");
        if (rec.slips_v1 !== f.slips_v1 || rec.slips_v2 !== f.slips_v2)
          return fail("slip_outcome_mismatch");
      }
    }
    perRegion.push(fresh);
  }
  return null;
}

export { aggregateShadow as aggregate };
