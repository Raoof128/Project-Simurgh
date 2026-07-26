// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the shared campaign contract (Tasks 15-18).
//
// A campaign attacks COMPOSITIONS: pairs and seams that no single stage tray sees, because each
// tray is scoped to one stage and a composition belongs to none of them. The trays ask "is this
// function sound"; a campaign asks "do these two sound things stay sound together".
//
// THE HARDEST CELLS ARE THE ONES WHERE EVERY COMPONENT IS VALID. A real signature over a real
// artefact, really verified — and still wrong, because authenticity is not aboutness. No existing
// test across sixteen stages can see those, which is exactly why the campaigns exist.
//
// EVERY PACK CARRIES A PREMISE RECEIPT. A campaign pack that cannot prove it generated a genuine
// negative case is vacuous, and its passes are inadmissible (spec §4.4) — the same gate the trays
// answer to, not relaxed because a composition is harder to build.
//
// AN EXPECTATION VIOLATED IS A FINDING, NOT AN ERROR. If a pack expects a refusal and gets an
// acceptance, that is the campaign working. The runner records it and keeps going; it never throws,
// because a campaign that aborts on its first real result reports only the boring prefix of itself.

import { createHash } from "node:crypto";
import { ATTACK_CLASSES } from "./constants.mjs";

export const CAMPAIGN_DOMAIN = "simurgh.vsr.campaign.v1";

/** What a pack observed, symbolically. Never a raw code (spec §12.4). */
export const CAMPAIGN_OUTCOMES = Object.freeze([
  "refused_as_expected",
  "accepted_as_expected",
  "distinct_as_expected",
  "recorded_as_expected",
  "unexpectedly_accepted",
  "unexpectedly_refused",
  "unexpectedly_equal",
  "pack_errored",
]);

/** Outcomes that mean the composition did NOT hold. Each mints a finding. */
export const FINDING_OUTCOMES = Object.freeze([
  "unexpectedly_accepted",
  "unexpectedly_refused",
  "unexpectedly_equal",
]);

const digest = (value) =>
  createHash("sha256")
    .update(Buffer.from(CAMPAIGN_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(JSON.stringify(value), "utf8"))
    .digest("hex");

/**
 * Run one campaign pack.
 *
 * `probe` returns `{ outcome, detail, premise }`. It is executed inside a try/catch: an adversarial
 * composition that throws is `pack_errored`, which is neither a pass nor a finding — it is a run
 * that did not establish anything, and saying so is more useful than either alternative.
 */
export async function runCampaignPack(pack) {
  let result;
  try {
    result = await pack.probe();
  } catch (error) {
    result = { outcome: "pack_errored", detail: String(error?.message ?? error).slice(0, 300) };
  }

  const outcome = CAMPAIGN_OUTCOMES.includes(result?.outcome) ? result.outcome : "pack_errored";
  const isFinding = FINDING_OUTCOMES.includes(outcome);

  for (const cls of pack.attack_classes) {
    if (!ATTACK_CLASSES.includes(cls)) {
      throw new Error(`pack ${pack.pack_id} names ${cls}, which is not a frozen attack class`);
    }
  }

  return {
    pack_id: pack.pack_id,
    target_pair: pack.target_pair,
    attack_classes: [...pack.attack_classes],
    expectation: pack.expectation,
    outcome,
    detail: result?.detail ?? null,
    // The premise the probe actually established, recomputed by the probe itself rather than
    // declared by the pack. A pack that reports no premise has not proved it built a real case.
    premise: result?.premise ?? null,
    premise_established: Boolean(result?.premise),
    is_finding: isFinding,
  };
}

/**
 * Assemble a campaign record.
 *
 * REPRODUCIBLE AND UNREPRODUCIBLE RESULTS ARE SEPARATE DENOMINATORS, NEVER SUMMED. A pack that
 * errored established nothing; folding it into either column would let a campaign's ratio improve
 * by breaking more packs.
 */
export function buildCampaign({ campaign_id, closureDigest, committedClosureDigest, results }) {
  if (closureDigest !== committedClosureDigest) {
    return {
      refused: true,
      refusal_reason: "closure_digest_mismatch",
      detail: `campaign ${campaign_id} is bound to a universe nobody committed (L2)`,
    };
  }

  const established = results.filter((r) => r.outcome !== "pack_errored");
  const errored = results.filter((r) => r.outcome === "pack_errored");
  const findings = results.filter((r) => r.is_finding);
  const withoutPremise = established.filter((r) => !r.premise_established);

  const record = {
    campaign_id,
    closure_digest: closureDigest,
    packs_run: results.length,
    // Two denominators, printed apart. Never `packs_passed / packs_run`.
    packs_establishing_a_result: established.length,
    packs_errored: errored.length,
    findings: findings.map((f) => f.pack_id),
    packs_without_premise: withoutPremise.map((p) => p.pack_id),
    results,
    summary:
      findings.length === 0
        ? `${established.length} of ${results.length} packs established a result; none produced a finding. ${errored.length} pack(s) established nothing.`
        : `${findings.length} finding(s) across ${established.length} established results.`,
  };
  return { refused: false, record, campaign_digest: digest(record) };
}
