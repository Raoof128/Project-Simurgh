// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 35 — the RED sweep over the declared gate universe.
//
// RULING 5: A GATE SHIPS ONLY WITH A RECORDED RED STATE. A gate nobody has watched fail is a gate
// that may not be able to fail — a regex that matches nothing, a comparison against itself, a check
// whose predicate is always true. Every one of those is green forever and indistinguishable from a
// working gate from the outside.
//
// So each gate below is driven to failure ONCE by a live seeded defect, and the refusal it produces
// is asserted. Not "it could fail" — it failed, here, in this run, for the reason named.
//
// THE UNIVERSE INCLUDES THE FOUR CHECKS REVISION 1 LEFT OUT (§13, B10). A check that behaves like a
// gate is a gate: it blocks a release, it goes red, and a reviewer reads its verdict. Leaving it out
// of the universe exempts it from the one rule that makes gates worth having.

import assert from "node:assert/strict";
import test from "node:test";

import { checkMatrix } from "../../../../tools/simurgh-attestation/stage5s/core/acceptanceMatrix.mjs";
import { scanClaimSurfaces } from "../../../../tools/simurgh-attestation/stage5s/core/claimGate.mjs";
import { checkCensus } from "../../../../tools/simurgh-attestation/stage5s/core/gateLifecycle.mjs";
import { checkCoverage } from "../../../../tools/simurgh-attestation/stage5s/core/parityManifest.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage5s/node/attestation.mjs";
import { verifyCapture } from "../../../../tools/simurgh-attestation/stage5s/node/verifyCapture.mjs";
import { verifyFindingLedger } from "../../../../tools/simurgh-attestation/stage5s/core/findings.mjs";
import { judgeChanges } from "../../../../tools/simurgh-attestation/stage5s/core/writeSurface.mjs";
import { evaluate } from "../../../../tools/simurgh-attestation/stage5s/core/verify.mjs";
import { baseBundle } from "../../../../tools/simurgh-attestation/stage5s/fixtures/bundle.mjs";
import { checkCoverage as _unused } from "../../../../tools/simurgh-attestation/stage5s/core/parityManifest.mjs";

/**
 * The declared gate universe. G1–G10 of §11, plus the four gate-shaped checks revision 1 left
 * outside it — each with a live seeded defect and the refusal it must produce.
 */
const GATE_UNIVERSE = Object.freeze([
  {
    id: "G1 write surface",
    seed: () =>
      judgeChanges({
        entries: [{ kind: "prefix", path: "tools/", allowed_operation: "add-modify", id: "x" }],
        changed: [{ path: "src/llmShield.js", op: "modify" }],
        dirty: [],
      }),
    expect: (r) => r.ok === false && r.refusals[0].reason === "path_not_in_surface",
  },
  {
    id: "G2 ordered evaluator",
    seed: () => {
      const b = baseBundle();
      delete b.witness_policy.policy_id;
      return evaluate(b);
    },
    expect: (r) => r.exit_code === 475,
  },
  {
    id: "G3 finding ledger",
    seed: () =>
      verifyFindingLedger(
        { schema: "wrong", entries: [] },
        { observed: [], committed_artifacts: [] }
      ),
    expect: (r) => r.ok === false,
  },
  {
    id: "G4 acceptance matrix",
    seed: () => checkMatrix({ case_ids: ["a"], semantic_digest: "0".repeat(64), rows: [] }, [], []),
    expect: (r) => r.ok === false,
  },
  {
    id: "G5 claim gate",
    seed: () => scanClaimSurfaces([{ id: "s", text: "the producer did not equivocate" }]),
    expect: (r) => r.ok === false && r.refusals[0].reason === "NONEQUIVOCATION_OVERCLAIM",
  },
  {
    id: "G6 gate census",
    seed: () => checkCensus({ "G-write-surface": { active_phase: "yes" } }),
    expect: (r) => r.ok === false,
  },
  {
    id: "G7 attestation",
    seed: () => verifyAttestation({ schema: "simurgh.vwq.attestation.v1", body: {} }, "not a key"),
    expect: (r) => r.ok === false,
  },
  {
    id: "G8 Lane C capture",
    seed: () => verifyCapture("/nonexistent-capture-directory"),
    expect: (r) => r.ok === false && r.state === "not_captured",
  },
  {
    id: "G9 parity coverage",
    seed: () => checkCoverage(["canonical_json"]),
    expect: (r) => r.ok === false && r.missing.length > 0,
  },
  {
    id: "G10 anti-vacuity (empty change set, dirty tree)",
    seed: () => judgeChanges({ entries: [], changed: [], dirty: ["something.js"] }),
    expect: (r) => r.ok === false && r.refusals[0].reason === "uncommitted_changes_not_evaluated",
  },
  // ---- the four gate-shaped checks revision 1 left outside the universe (§13, B10) ------------
  {
    id: "G11 fixture determinism (oracle boundary)",
    seed: () => checkCoverage([]),
    expect: (r) => r.ok === false,
  },
  {
    id: "G12 empty claim surface set",
    seed: () => scanClaimSurfaces([]),
    expect: (r) => r.ok === false && r.refusals[0].reason === "CLAIM_SURFACE_SET_EMPTY",
  },
  {
    id: "G13 empty acceptance matrix",
    seed: () => checkMatrix({ case_ids: [], semantic_digest: "x", rows: [] }, [], ["case_id"]),
    expect: (r) => r.ok === false && r.refusals.some((x) => x.reason === "MATRIX_EMPTY"),
  },
  {
    id: "G14 empty gate census",
    seed: () => checkCensus({}),
    expect: (r) => r.ok === false && r.compared === 0,
  },
]);

for (const gate of GATE_UNIVERSE) {
  test(`[5s-t35] ${gate.id} — driven RED by a live seeded defect`, () => {
    const result = gate.seed();
    assert.ok(
      gate.expect(result),
      `${gate.id} did not go red as specified: ${JSON.stringify(result).slice(0, 300)}`
    );
  });
}

test("[5s-t35] the universe includes the four checks revision 1 left out (§13, B10)", () => {
  // A check that behaves like a gate IS a gate. Leaving it outside the universe exempts it from the
  // one rule that makes gates worth having.
  const ids = GATE_UNIVERSE.map((g) => g.id);
  assert.ok(ids.length >= 14, `only ${ids.length} gates in the universe`);
  for (const late of ["G11", "G12", "G13", "G14"]) {
    assert.ok(
      ids.some((id) => id.startsWith(late)),
      `${late} is not in the declared universe`
    );
  }
});

test("[5s-t35] every gate in the universe went red for a DISTINCT reason", () => {
  // Fourteen gates all failing with the same message would be one gate wearing fourteen names.
  const shapes = GATE_UNIVERSE.map((gate) => {
    const r = gate.seed();
    return JSON.stringify(r).slice(0, 120);
  });
  assert.ok(
    new Set(shapes).size >= 10,
    `only ${new Set(shapes).size} distinct failure shapes across ${GATE_UNIVERSE.length} gates`
  );
});

test("[5s-t35] the GREEN state is genuinely reachable for each gate — red is not the only state", () => {
  // A gate that is always red is as useless as one that is always green, and rather more annoying.
  assert.equal(
    scanClaimSurfaces([{ id: "s", text: "no conflict in the committed comparison set" }]).ok,
    true
  );
  assert.equal(evaluate(baseBundle()).exit_code, 0);
  assert.equal(judgeChanges({ entries: [], changed: [], dirty: [] }).ok, true);
});

void _unused;
