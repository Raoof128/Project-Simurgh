// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 10: the three-control runner, premises, and restoration.
//
// §3.2: a vulnerable control whose PREMISE no longer holds is not a passing control, it is a BROKEN
// one, and it fails the family. The premise is recomputed at run time rather than remembered, which
// is 5Q's rule about findings applied to controls.
//
// §3.6: every control that mutates a target must prove restoration, and the proof is a recorded
// receipt rather than an assertion. 5Q's F003 exists because a producer's write went unnoticed for
// three occurrences; a stage that seeds defects into 5A–5Q code ON PURPOSE carries a strictly larger
// version of that risk.
//
// RESTORATION IS PROVEN OVER THE WHOLE TREE, not over the mutated file. A mutation that repairs its
// own target and leaves a stray artefact somewhere else has restored nothing, and a per-file check
// would call that clean.

import { createHash } from "node:crypto";

const sha = (text) =>
  createHash("sha256")
    .update(Buffer.from(String(text), "utf8"))
    .digest("hex");

/** Domain-separated digest of a control's source span. */
export const SPAN_DOMAIN = "simurgh.vpf.control-span.v1";

/**
 * @param {string} source
 * @returns {string}
 */
export function spanDigest(source) {
  return createHash("sha256")
    .update(Buffer.from(SPAN_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(String(source), "utf8"))
    .digest("hex");
}

/**
 * Build a premise receipt: what must be true of the target for the control to mean anything.
 *
 * @param {{function_id: string, source: string, predicate: string, holds: boolean}} input
 * @returns {object}
 */
export function makePremiseReceipt({ function_id, source, predicate, holds }) {
  if (!function_id || !predicate)
    throw new TypeError("premise receipt: function_id and predicate required");
  return {
    function_id,
    predicate,
    source_digest: spanDigest(source),
    span_bytes: Buffer.byteLength(String(source), "utf8"),
    holds: Boolean(holds),
  };
}

/**
 * Recompute a premise against the target as it stands NOW.
 *
 * @param {object} receipt
 * @param {{source: string, holds: boolean}} current
 * @returns {{ok: boolean, reason?: string}}
 */
export function recomputePremise(receipt, current) {
  const digest = spanDigest(current.source);
  if (digest !== receipt.source_digest) {
    return { ok: false, reason: `target moved: ${digest} != recorded ${receipt.source_digest}` };
  }
  if (current.holds !== true) {
    return {
      ok: false,
      reason: `premise "${receipt.predicate}" no longer holds — the control is broken, not passing`,
    };
  }
  return { ok: true };
}

/**
 * Prove restoration over a whole tree snapshot.
 *
 * @param {Record<string,string>} before
 * @param {Record<string,string>} after
 * @returns {{ok: boolean, proven: boolean, differences: string[]}}
 */
export function proveRestoration(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const differences = [...keys].filter((k) => before[k] !== after[k]).sort();
  return { ok: differences.length === 0, proven: differences.length === 0, differences };
}

/**
 * Run one family's three controls through an injected detector, producing observations that
 * admissibility can assess. The detector is injected so the runner has no opinion about how a
 * verdict is reached — Lane B supplies the real, blind one.
 *
 * @param {{family: object, controls: object, detector: Function, snapshot: Function}} input
 * @returns {{observations: object, receipts: Array<object>}}
 */
export function runControls({ family, controls, detector, snapshot }) {
  const observations = {};
  const receipts = [];
  for (const kind of ["vulnerable", "safe", "orthogonal"]) {
    const control = controls[kind];
    if (!control)
      throw new Error(`runControls: ${kind} control is absent — there is no optional control`);

    const treeBefore = snapshot();
    const premise = recomputePremise(control.premise_receipt, control.current);
    const verdict = detector({
      attack_class: family.attack_class,
      source: control.current.source,
      control_id: control.control_id,
    });
    const treeAfter = snapshot();
    const restoration = proveRestoration(treeBefore, treeAfter);

    observations[kind] = {
      function_id: control.function_id,
      security_role: control.security_role,
      verdict: verdict.verdict,
      signal: verdict.signal,
      premise_recomputed: premise.ok,
      premise_detail: premise.reason ?? "recomputed and holds",
      restoration_proven: restoration.proven,
      restoration_detail: restoration.proven
        ? "whole-tree digest equal before and after"
        : `tree changed: ${restoration.differences.join(", ")}`,
    };
    receipts.push({
      control_id: control.control_id,
      kind,
      function_id: control.function_id,
      source_digest: control.premise_receipt.source_digest,
      premise: control.premise_receipt.predicate,
      premise_holds: premise.ok,
      restoration_proven: restoration.proven,
      restoration_differences: restoration.differences,
      verdict_digest: sha(`${verdict.verdict}|${verdict.signal}`),
    });
  }
  return { observations, receipts };
}
