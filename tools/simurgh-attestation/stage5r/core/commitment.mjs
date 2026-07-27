// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 19: the campaign commitment C1.
//
// WHAT A DIGEST PROVES, AND WHAT IT DOES NOT. A digest proves content has not changed SINCE the
// digest was taken. It does not prove the author chose that content before seeing results. So the
// commitment lands in its own commit C1, the results land in a later commit C2, and the verifier
// asserts both that C1 is an ancestor of C2 and that every byte C1 committed still matches.
//
// THE HONEST BOUND, STATED HERE RATHER THAN IMPLIED. Ancestry raises the cost of back-fitting; it
// does not eliminate it, because the producer controls both commits. Eliminating it needs an external
// witness over C1 — a timestamp authority or a transparency log — which is 5M/5N machinery and
// belongs to a stage carrying it as its blade. §13's "the red team and the blue team remain the same
// party" is that ceiling; this is the same ceiling at commit granularity.
//
// WHAT IS BOUND IS WHAT COULD OTHERWISE BE CHOSEN LATER: which families exist, which bytes each
// control has, which single signal each family reads, which cells each family is aimed at, which
// detector decides, which runner runs, which instrument was locked, and the order the controls are
// presented in. A campaign that could still pick any of those after seeing a result is not a
// campaign, it is a search.

import { createHash } from "node:crypto";
import { permute } from "./laneB.mjs";
import { SURROGATE_TRANSFORMS } from "./suppression.mjs";

export const COMMITMENT_DOMAIN = "simurgh.vpf.campaign-commitment.v1";

/** The committed ordering seed. Fixed, published, and part of the commitment it seeds. */
export const ORDERING_SEED = "5r-t1-control-ordering-v1";

const sha = (text) =>
  createHash("sha256")
    .update(Buffer.from(COMMITMENT_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(String(text), "utf8"))
    .digest("hex");

/**
 * Digest of a set of inherited obligation ids, order-independent by construction.
 *
 * The ids are sorted before digesting, so two runs that enumerate the matrix in different orders
 * commit the same set — and a set that gained or lost one member cannot pretend otherwise.
 *
 * @param {string[]} ids
 * @returns {string}
 */
export function obligationSetDigest(ids) {
  return sha([...ids].sort().join("\n"));
}

/**
 * Build the commitment from parts the caller has already read.
 *
 * Everything here is a pure function of its inputs: the caller does the file reading, so this can be
 * verified against a tree the verifier assembled itself.
 *
 * @param {{families: Array<object>, trancheText: string, detectorDigest: string,
 *          runnerText: string, instrumentLockText: string}} input
 * @returns {object}
 */
export function buildCommitment({
  families,
  trancheText,
  detectorDigest,
  runnerText,
  instrumentLockText,
}) {
  const controlIds = families.flatMap((f) => [
    f.controls.vulnerable.control_id,
    f.controls.safe.control_id,
    f.controls.orthogonal.control_id,
  ]);

  return {
    schema: COMMITMENT_DOMAIN,
    note:
      "C1. What could otherwise be chosen after seeing a result, fixed before any result exists. " +
      "Ancestry over C2 raises the cost of back-fitting; it does not eliminate it, because the " +
      "producer controls both commits. That ceiling is §13's, and it is named rather than papered " +
      "over: an external witness over C1 is 5M/5N machinery and belongs to a stage that carries it.",
    tranche_digest: sha(trancheText),
    detector_implementation_digest: detectorDigest,
    runner_digest: sha(runnerText),
    instrument_lock_digest: sha(instrumentLockText),
    ordering_seed: ORDERING_SEED,
    control_presentation_order: permute(controlIds, ORDERING_SEED),
    forbidden_surrogate_transforms: Object.keys(SURROGATE_TRANSFORMS),
    family_count: families.length,
    families: families.map((f) => ({
      probe_family_id: f.id,
      attack_class: f.record.attack_class,
      target_security_role: f.record.target_security_role,
      detector_signal: f.record.detector_signal,
      models_function_id: f.binding.models_function_id,
      control_digests: {
        vulnerable: f.controls.vulnerable.span_digest,
        safe: f.controls.safe.span_digest,
        orthogonal: f.controls.orthogonal.span_digest,
      },
      orthogonal_failure_mode: f.record.orthogonal_failure_control.failure_mode,
      target_obligation_count: f.obligationIds.length,
      target_obligation_set_digest: obligationSetDigest(f.obligationIds),
    })),
    total_target_cells: families.reduce((a, f) => a + f.obligationIds.length, 0),
  };
}

/**
 * Compare a committed C1 against one rebuilt from the tree as it stands now.
 *
 * @param {{committed: object, rebuilt: object}} input
 * @returns {{ok: boolean, differences: string[]}}
 */
export function compareCommitments({ committed, rebuilt }) {
  const differences = [];
  const scalars = [
    "tranche_digest",
    "detector_implementation_digest",
    "runner_digest",
    "instrument_lock_digest",
    "ordering_seed",
    "family_count",
    "total_target_cells",
  ];
  for (const key of scalars) {
    if (committed?.[key] !== rebuilt?.[key]) {
      differences.push(`${key}: committed ${committed?.[key]} != rebuilt ${rebuilt?.[key]}`);
    }
  }
  if (
    JSON.stringify(committed?.control_presentation_order) !==
    JSON.stringify(rebuilt?.control_presentation_order)
  ) {
    differences.push("control_presentation_order changed");
  }

  const byId = new Map((rebuilt?.families ?? []).map((f) => [f.probe_family_id, f]));
  for (const c of committed?.families ?? []) {
    const r = byId.get(c.probe_family_id);
    if (!r) {
      differences.push(`${c.probe_family_id}: committed, and absent from the tree now`);
      continue;
    }
    for (const kind of ["vulnerable", "safe", "orthogonal"]) {
      if (c.control_digests[kind] !== r.control_digests[kind]) {
        differences.push(`${c.probe_family_id}/${kind}: control bytes moved after the commitment`);
      }
    }
    for (const key of [
      "detector_signal",
      "attack_class",
      "target_security_role",
      "target_obligation_set_digest",
      "target_obligation_count",
    ]) {
      if (c[key] !== r[key]) {
        differences.push(`${c.probe_family_id}.${key}: committed ${c[key]} != rebuilt ${r[key]}`);
      }
    }
    byId.delete(c.probe_family_id);
  }
  for (const id of byId.keys()) {
    differences.push(`${id}: present in the tree and absent from the commitment`);
  }
  return { ok: differences.length === 0, differences };
}
