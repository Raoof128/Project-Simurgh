// Offline documentation observations, not changes to the frozen campaign.
import assert from "node:assert/strict";
import { evaluateSignal, SIGNALS } from "../../tools/simurgh-attestation/stage5r/core/signals.mjs";
import {
  assessFamily,
  structurallyComparable,
} from "../../tools/simurgh-attestation/stage5r/core/admissibility.mjs";
import {
  dischargeCell,
  buildDeltaLedger,
  validateDeltaSet,
} from "../../tools/simurgh-attestation/stage5r/core/deltaLedger.mjs";
import {
  assertBlind,
  verdictReceiptDigest,
  verifyVerdictReceipt,
} from "../../tools/simurgh-attestation/stage5r/core/laneB.mjs";
import {
  makePremiseReceipt,
  recomputePremise,
} from "../../tools/simurgh-attestation/stage5r/core/controls.mjs";
const results = [];
const record = (name, observed, expected) => {
  assert.deepEqual(observed, expected, name);
  results.push({ name, observed });
};
const f8 = Object.keys(SIGNALS).find((k) => SIGNALS[k].family === "F8");
const keys = ["z", "é", "a", "😀", "\uffff"];
record(
  "F8 declared defective and repaired string sorts agree",
  JSON.stringify([...keys].sort()) ===
    JSON.stringify([...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
  true
);
record(
  "F8 flags the default sort",
  evaluateSignal(f8, SIGNALS[f8].specimens.defective).verdict,
  "detected"
);
record(
  "F8 clears equivalent comparator",
  evaluateSignal(f8, SIGNALS[f8].specimens.repaired).verdict,
  "not_detected"
);
const f4 = Object.keys(SIGNALS).find((k) => SIGNALS[k].family === "F4");
record(
  "F4 defective control detected",
  evaluateSignal(f4, SIGNALS[f4].specimens.defective).verdict,
  "detected"
);
record(
  "unrelated TRUSTED_ROOTS token clears F4",
  evaluateSignal(f4, "const TRUSTED_ROOTS = {};\n" + SIGNALS[f4].specimens.defective).verdict,
  "not_detected"
);
const obs = Object.fromEntries(
  ["vulnerable", "safe", "orthogonal"].map((k) => [
    k,
    {
      verdict: k === "vulnerable" ? "detected" : "not_detected",
      premise_recomputed: true,
      restoration_proven: true,
      security_role: "trust_decision",
      function_id: "synthetic",
    },
  ])
);
record(
  "asserted triad without actual orthogonal failure admissible",
  assessFamily({
    family: { target_security_role: "trust_decision" },
    observations: obs,
    closure: new Set(["synthetic"]),
  }).admissible,
  true
);
record(
  "missing descriptors pass structural comparison with asserted path",
  structurallyComparable({
    vulnerable: { span_bytes: 100 },
    safe: { span_bytes: 100, exercises_detector_signal_path: true },
  }).ok,
  true
);
const cell = {
  family_admissible: true,
  obligation_in_committed_pair: true,
  member_source_digest_matches: true,
  execution_completed: true,
  deterministic: true,
  schema_valid: true,
  function_id: "synthetic",
  obligation_id: "synthetic",
  restoration_valid: true,
  verdict: "detected",
  signal_evidence_verified: true,
  class_specific_outcome_matched: true,
  suppression_invariant: true,
  premise_applies: true,
};
record("asserted cell with both signals absent discharges", dischargeCell(cell).discharged, true);
record(
  "missing detection blocks discharge",
  dischargeCell({ ...cell, verdict: "not_detected" }).discharged,
  false
);
record(
  "ledger builder accepts outside ID",
  buildDeltaLedger({ newlyDischarged: ["outside"] }).newly_discharged_count,
  1
);
record(
  "separate set validator rejects outside ID",
  validateDeltaSet(["outside"], {
    universe: new Set(),
    pairCells: new Set(),
    q0Discharged: new Set(),
  }).ok,
  false
);
record(
  "nested label passes shallow blindness check",
  assertBlind({ metadata: { label: "vulnerable" } }).ok,
  true
);
const receipt = { verdict: "detected" };
receipt.receipt_digest = verdictReceiptDigest(receipt);
record("minimal self-hashed verdict receipt passes", verifyVerdictReceipt(receipt).ok, true);
const premise = makePremiseReceipt({
  function_id: "synthetic",
  source: "return true;",
  predicate: "unverified claim",
  holds: false,
});
record(
  "supplied current holds overrides false recorded premise",
  recomputePremise(premise, { source: "return true;", holds: true }).ok,
  true
);
console.log(
  JSON.stringify(
    {
      scope:
        "Fourteen synthetic direct-module observations; no campaign rerun or frozen-artifact change.",
      results,
    },
    null,
    2
  )
);
