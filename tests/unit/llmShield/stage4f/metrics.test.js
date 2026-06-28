// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  derivePointMetrics,
  wilsonInterval,
} from "../../../../tools/simurgh-attestation/stage4f/metrics.mjs";
import { paretoFrontier } from "../../../../tools/simurgh-attestation/stage4f/frontier.mjs";

function pack({ scenario_id, label, decisions, utility_observation }) {
  return {
    cell_manifest: { point_id: "P2", scenario_id },
    suite_entry: { label },
    utility_observation,
    pack: {
      receipts: decisions.map((decision, i) => ({
        receipt_payload: {
          action_id: `act_${String(i).padStart(3, "0")}`,
          sink_id: decision.sink_id,
          consequence_class: decision.consequence_class,
          decision: decision.decision,
          decision_input: { untrusted_reached_authority: decision.untrusted_reached_authority },
        },
      })),
    },
  };
}

test("Wilson interval is deterministic", () => {
  assert.deepEqual(wilsonInterval({ successes: 0, total: 10 }), { low: 0, high: 0.277533 });
  assert.deepEqual(wilsonInterval({ successes: 10, total: 10 }), { low: 0.722467, high: 1 });
});

test("metrics derive utility from utility observations", () => {
  const metrics = derivePointMetrics("P2", [
    pack({
      scenario_id: "direct-input/attack-1",
      label: "attack",
      utility_observation: {
        observation_version: "simurgh.stage4f.utility_observation.v1",
        source: "recorded_fixture",
        task_completed: false,
        benign_subtask_completed: true,
      },
      decisions: [
        {
          sink_id: "secret_export",
          consequence_class: "external_egress",
          decision: "block",
          untrusted_reached_authority: true,
        },
      ],
    }),
    pack({
      scenario_id: "benign/benign-1",
      label: "benign",
      utility_observation: {
        observation_version: "simurgh.stage4f.utility_observation.v1",
        source: "recorded_fixture",
        task_completed: true,
        benign_subtask_completed: true,
      },
      decisions: [
        {
          sink_id: "destructive_mutation",
          consequence_class: "internal_mutation",
          decision: "allow",
          untrusted_reached_authority: false,
        },
      ],
    }),
  ]);
  assert.equal(metrics.point_id, "P2");
  assert.equal(metrics.attack_success_rate, 0);
  assert.equal(metrics.benign_utility, 1);
  assert.equal(metrics.over_block_rate, 0);
  assert.equal(metrics.utility_under_attack, 1);
  assert.equal(metrics.verify_coverage, 1);
});

test("Pareto frontier keeps equal vectors and drops dominated green points only", () => {
  const points = [
    {
      point_id: "P0",
      attack_success_rate: 1,
      over_block_rate: 0,
      benign_utility: 1,
      utility_under_attack: 1,
      verified: true,
    },
    {
      point_id: "P2",
      attack_success_rate: 0,
      over_block_rate: 0,
      benign_utility: 1,
      utility_under_attack: 1,
      verified: true,
    },
    {
      point_id: "P4",
      attack_success_rate: 0,
      over_block_rate: 0.5,
      benign_utility: 0.5,
      utility_under_attack: 1,
      verified: true,
    },
  ];
  const result = paretoFrontier(points);
  assert.deepEqual(
    result.plotted_frontier.map((p) => p.point_id),
    ["P2"]
  );
  assert.deepEqual(
    result.excluded_points.map((p) => p.reason),
    ["dominated", "dominated"]
  );
});
