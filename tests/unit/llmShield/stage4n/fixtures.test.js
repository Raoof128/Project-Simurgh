// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const FIX = "tests/fixtures/llmShield/stage4n";
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const readFeed = async (p) =>
  (await readFile(p, "utf8"))
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));

test("committed clean feed has the exact 12-record interleave at as_of synthetic-0006", async () => {
  const feed = await readFeed(`${FIX}/feed/heartbeat-feed.jsonl`);
  assert.equal(feed.length, 12);
  assert.deepEqual(
    feed.map((r) => [r.record_type, r.window_id]),
    [
      ["heartbeat", "synthetic-0000"],
      ["heartbeat", "synthetic-0001"],
      ["heartbeat", "synthetic-0002"],
      ["aggregate_reveal", "synthetic-0000"],
      ["heartbeat", "synthetic-0003"],
      ["aggregate_reveal", "synthetic-0001"],
      ["heartbeat", "synthetic-0004"],
      ["aggregate_reveal", "synthetic-0002"],
      ["heartbeat", "synthetic-0005"],
      ["aggregate_reveal", "synthetic-0003"],
      ["heartbeat", "synthetic-0006"],
      ["aggregate_reveal", "synthetic-0004"],
    ]
  );
});

test("expected-results matrix pins one legal answer per arm", async () => {
  const matrix = await readJson(`${FIX}/expected-results/seismograph-matrix.json`);
  assert.deepEqual(matrix["t0-clean"], { raw: 0, reason: null, gate: null });
  assert.deepEqual(matrix["t1-drop-heartbeat"], {
    raw: 47,
    reason: "heartbeat_absent_for_expected_window",
    gate: "Q11",
  });
  assert.deepEqual(matrix["t2-fork"], {
    raw: 48,
    reason: "cross_artifact_digest_mismatch",
    gate: "Q17",
  });
  assert.equal(matrix["t3-reorder"].raw, 49);
  assert.deepEqual(matrix["t4-mutate-4k-root"], {
    raw: 50,
    reason: "source_root_mismatch",
    gate: "Q15",
  });
  assert.deepEqual(matrix["t5-absent-heartbeat"], {
    raw: 51,
    reason: "referenced_heartbeat_absent",
    gate: "Q12",
  });
  assert.deepEqual(matrix["t6-early-reveal"], { raw: 52, reason: "reveal_early", gate: "Q13" });
  assert.deepEqual(matrix["t7-drop-due-reveal"], {
    raw: 52,
    reason: "reveal_overdue",
    gate: "Q13",
  });
  assert.deepEqual(matrix["t8-reveal-band-mismatch"], {
    raw: 50,
    reason: "reveal_commitment_mismatch",
    gate: "Q13",
  });
  assert.equal(matrix["t9-undeclared-dimension"].raw, 53);
  assert.equal(matrix["t10-raw-count"].raw, 54);
  assert.deepEqual(matrix["t11-proof-material-public"], {
    raw: 54,
    reason: "inclusion_proof_material_public",
    gate: "Q16",
  });
});

test("no bilateral material under the public fixture surfaces", async () => {
  // The clean feed and policy must scan clean — proof material lives ONLY under bilateral/
  const feed = await readFeed(`${FIX}/feed/heartbeat-feed.jsonl`);
  const flat = JSON.stringify(feed);
  for (const forbidden of ["proof_path", "bundle_tier", "respondent_id_digest"]) {
    assert.equal(flat.includes(forbidden), false, forbidden);
  }
});
