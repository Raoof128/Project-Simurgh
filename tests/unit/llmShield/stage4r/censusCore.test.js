// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWindowMatchCensus,
  checkCensus,
  checkSlotTerminality,
  budgetCheck,
  herdTokenScan,
  buildLedgers,
  detectReplay,
  detectReuse,
} from "../../../../tools/simurgh-attestation/stage4r/core/censusCore.mjs";

const EPOCH = "sha256:" + "a".repeat(64);
const ledger = [
  { terminal: "exported_match_record" },
  { terminal: "exported_non_match_record" },
  { terminal: "exported_non_match_record" },
  { terminal: "ledgered_export_refusal" },
];

test("census counts terminals and round-trips through checkCensus", () => {
  const census = buildWindowMatchCensus(EPOCH, ledger);
  assert.deepEqual(census, { epoch: EPOCH, matches: 1, non_matches: 2, refusals: 1 });
  assert.ok(checkCensus(census, EPOCH, ledger).ok);
});

test("tampered census counts are window_match_census_mismatch (raw 90)", () => {
  const census = { epoch: EPOCH, matches: 2, non_matches: 2, refusals: 1 };
  assert.deepEqual(checkCensus(census, EPOCH, ledger), {
    ok: false,
    raw: 90,
    reason: "window_match_census_mismatch",
  });
});

test("slot terminality: three distinct 90 subreasons", () => {
  assert.deepEqual(checkSlotTerminality(null, ledger), {
    ok: false,
    raw: 90,
    reason: "slot_cardinality_commitment_missing",
  });
  assert.deepEqual(checkSlotTerminality(3, ledger), {
    ok: false,
    raw: 90,
    reason: "slot_cardinality_mismatch",
  });
  assert.deepEqual(
    checkSlotTerminality(2, [{ terminal: "exported_match_record" }, { terminal: "oops" }]),
    {
      ok: false,
      raw: 90,
      reason: "slot_terminal_record_missing",
    }
  );
  assert.ok(checkSlotTerminality(4, ledger).ok);
});

test("budget green at 4, exceeded at 5", () => {
  assert.equal(budgetCheck(4).exceeded, false);
  assert.equal(budgetCheck(5).exceeded, true);
});

test("herd-token scan catches a planted class digest and a bare raw point", () => {
  const priv = { classDigests: new Set(["sha256:" + "c".repeat(64)]) };
  assert.equal(herdTokenScan({ ok: true }, priv).hit, false);
  assert.equal(herdTokenScan({ leak: "sha256:" + "c".repeat(64) }, priv).hit, true);
  // a bare 64-hex point (not sha256:-prefixed) is forbidden unless allow-listed
  assert.equal(herdTokenScan({ raw: "d".repeat(64) }, priv).hit, true);
  assert.equal(herdTokenScan({ raw: "d".repeat(64) }, priv, new Set(["d".repeat(64)])).hit, false);
});

test("reuse ledger flags a mask digest repeated within an epoch (raw 96)", () => {
  const runSet = [
    {
      epoch: EPOCH,
      maskDigests: { a: "sha256:dupmask", b: "sha256:mb" },
      ephemeralDigests: { a: "sha256:ea", b: "sha256:eb" },
      tokens: { a: "sha256:ta", b: "sha256:tb" },
    },
    {
      epoch: EPOCH,
      maskDigests: { a: "sha256:dupmask", b: "sha256:mc" }, // duplicate mask digest
      ephemeralDigests: { a: "sha256:ec", b: "sha256:ed" },
      tokens: { a: "sha256:tc", b: "sha256:td" },
    },
  ];
  const ledgers = buildLedgers(runSet);
  assert.deepEqual(detectReuse(EPOCH, ledgers), { hit: true, reason: "mask_reuse_detected" });
});

test("replay: epoch mismatch is cross_epoch_replay_detected", () => {
  assert.deepEqual(detectReplay("sha256:other", EPOCH), {
    hit: true,
    reason: "cross_epoch_replay_detected",
  });
  assert.deepEqual(detectReplay(EPOCH, EPOCH), { hit: false });
});
