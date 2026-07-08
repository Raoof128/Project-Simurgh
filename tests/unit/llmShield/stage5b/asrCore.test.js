// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — ASR recompute + partition + Signed-Floor (plan Task 7). Motto: AnthropicSafe
// First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  familyOf,
  tallies,
  computeAsr,
  checkPartition,
  checkAsrRecompute,
  checkTallies,
  floorReconcile,
  checkFloorReconciliation,
} from "../../../../tools/simurgh-attestation/stage5b/core/asrCore.mjs";

const S = "stage5b-var-seed-v1";
const f = (fam, i, target_stage, target_raw, outcome, extra = {}) => ({
  attack_id: `${S}:${fam}#${i}`,
  family: fam,
  target_stage,
  target_raw,
  outcome,
  ...extra,
});
const findings = [
  f("conflict_laundering", 0, "5a", 205, "survived"),
  f("conflict_laundering", 1, "5a", 205, "survived"),
  f("residue_paraphrase_slip", 0, "4x", 0, "bypass", { severity: "low" }),
];

test("familyOf parses the family out of an attack_id", () => {
  assert.equal(familyOf(`${S}:conflict_laundering#3`), "conflict_laundering");
});

test("tallies count classes + per-family; sum equals n_attacks", () => {
  const t = tallies(findings);
  assert.equal(t.n_attacks, 3);
  assert.equal(t.survived, 2);
  assert.equal(t.bypass, 1);
  assert.equal(t.per_family.conflict_laundering, 2);
  assert.equal(t.per_family.residue_paraphrase_slip, 1);
});

test("222: ASR denominator is survived+bypass (excludes refused/lane_disabled)", () => {
  assert.equal(computeAsr(findings), "1/3");
  const withDisabled = [...findings, f("crypto_signature", 0, "5a", 0, "lane_disabled")];
  // lane_disabled excluded from denominator → still 1/3, NOT 1/4
  assert.equal(computeAsr(withDisabled), "1/3");
  // guarded 0/0
  assert.equal(computeAsr([f("crypto_signature", 0, "5a", 0, "lane_disabled")]), "0/0");
});

test("222: a hand-edited aggregates.asr is caught", () => {
  assert.equal(checkAsrRecompute({ asr: "1/3" }, findings).raw, 0);
  assert.equal(checkAsrRecompute({ asr: "0/3" }, findings).raw, 222);
});

test("221: partition must equal the scheduled id set exactly", () => {
  const scheduled = findings.map((x) => x.attack_id);
  assert.equal(checkPartition(findings, scheduled).raw, 0);
  assert.equal(checkPartition(findings, [...scheduled, `${S}:ghost#9`]).raw, 221); // uncovered
  assert.equal(checkPartition([...findings, findings[0]], scheduled).raw, 221); // double-covered
});

test("223: tallies mismatch is caught", () => {
  const t = tallies(findings);
  assert.equal(checkTallies({ aggregates: t }, findings).raw, 0);
  assert.equal(checkTallies({ aggregates: { ...t, bypass: 5 } }, findings).raw, 223);
});

test("Signed-Floor: residue bypasses ≤ floor ⇒ corroborated; above floor without new finding ⇒ 223", () => {
  const floors = { "4x": 1, "4y": 2 };
  // 1 bypass on 4x, floor 1 → corroborated
  assert.equal(floorReconcile(findings, floors)["4x"].status, "corroborated");
  assert.equal(checkFloorReconciliation(findings, floors).raw, 0);
  // 2 bypasses on 4x, floor 1, neither marked new_finding → exceeded → 223
  const over = [
    ...findings,
    f("residue_paraphrase_slip", 1, "4x", 0, "bypass", { severity: "low" }),
  ];
  assert.equal(checkFloorReconciliation(over, floors).raw, 223);
  // the excess disclosed as a new signed finding → green
  const disclosed = [
    findings[0],
    findings[1],
    f("residue_paraphrase_slip", 0, "4x", 0, "bypass", { severity: "low" }),
    f("residue_paraphrase_slip", 1, "4x", 0, "bypass", { severity: "high", new_finding: true }),
  ];
  assert.equal(checkFloorReconciliation(disclosed, floors).raw, 0);
});
