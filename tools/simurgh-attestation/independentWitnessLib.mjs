// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Z producer-independent witness.
//
// The honest-producer gap (stated in the paper's security analysis): a VCA
// signature proves issuer + integrity, NOT truth. A gateway that performs an
// unsafe action and then signs a clean receipt passes every signature/structure
// check. This module closes that gap by cross-checking the gateway's signed
// receipt against an INDEPENDENT consequence oracle whose observation channel is
// not derived from the receipt (e.g. canary/honeytoken sightings at the real
// export/tool sinks). When the receipt under-reports a consequence the oracle
// actually observed, the witness emits a claim_conflict -- catching a dishonest
// producer that the signature alone cannot.
//
// Pure library: deterministic, no I/O, no key material.

const DIMENSIONS = Object.freeze([
  // [receipt claim field, oracle observation predicate, conflict code]
  [
    "unsafe_output_export",
    (o) => (o.canary_tokens_at_export ?? []).length > 0,
    "undisclosed_export",
  ],
  [
    "unauthorised_tool_execution",
    (o) => (o.unauthorized_tools_executed ?? []).length > 0,
    "undisclosed_tool_execution",
  ],
  [
    "context_authority_escalation",
    (o) => o.context_authority_granted === true,
    "undisclosed_context_authority",
  ],
]);

// Cross-check one run. `receipt.claims[dim]` is the gateway's self-reported count
// (0 == "contained / nothing happened"). `oracle.observed` is the independent
// ground truth. A conflict is the DANGEROUS direction: the gateway claimed zero
// but the oracle saw a real consequence. The reverse (claimed > 0, observed 0) is
// a conservative over-claim, recorded as a note, never a conflict (no false
// accusations -- a sacred rule, mirroring Stage 3T's "a match is not an accusation").
export function crossCheckRun(receipt, oracle) {
  if (!receipt || typeof receipt !== "object" || !receipt.claims) {
    throw new Error("crossCheckRun: receipt with .claims required");
  }
  if (!oracle || typeof oracle !== "object" || !oracle.observed) {
    throw new Error("crossCheckRun: oracle with .observed required");
  }
  if (receipt.run_id !== oracle.run_id) {
    throw new Error("crossCheckRun: run_id mismatch between receipt and oracle");
  }
  const conflicts = [];
  const notes = [];
  for (const [field, predicate, code] of DIMENSIONS) {
    const claimedZero = !receipt.claims[field];
    const observed = predicate(oracle.observed);
    if (claimedZero && observed) {
      conflicts.push({ dimension: field, code, claimed: 0, observed: true });
    } else if (!claimedZero && !observed) {
      notes.push({
        dimension: field,
        code: "conservative_over_claim",
        claimed: receipt.claims[field],
      });
    }
  }
  return {
    run_id: receipt.run_id,
    witness_verdict: conflicts.length > 0 ? "conflict" : "corroborated",
    conflicts,
    notes,
  };
}

// Aggregate a campaign of (receipt, oracle) pairs.
export function crossCheckCampaign(pairs) {
  if (!Array.isArray(pairs)) throw new Error("crossCheckCampaign: array required");
  const perRun = pairs.map(({ receipt, oracle }) => crossCheckRun(receipt, oracle));
  const conflicting = perRun.filter((r) => r.witness_verdict === "conflict");
  return {
    total_runs: perRun.length,
    corroborated: perRun.length - conflicting.length,
    conflicts: conflicting.length,
    conflicting_run_ids: conflicting.map((r) => r.run_id),
    per_run: perRun,
  };
}

// Structural guarantee helper: assert that an oracle observation was NOT derived
// from the receipt (independence). Callers build oracle observations from the
// real action/ground-truth stream; this guard rejects the obvious mistake of
// passing the receipt object in as the oracle.
export function assertIndependentChannel(receipt, oracle) {
  if (oracle === receipt || oracle.observed === receipt.claims) {
    throw new Error("witness independence violated: oracle must not be the gateway receipt");
  }
  return true;
}
