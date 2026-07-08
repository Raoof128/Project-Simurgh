// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — finding ledger / No Silent Bypass (plan Task 6). Motto: AnthropicSafe First,
// then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  outcomeForRaw,
  checkFindingClassification,
  checkNoSilentBypass,
  checkBypassLabelMismatch,
  checkSeverityLock,
  detectOmittedBypasses,
} from "../../../../tools/simurgh-attestation/stage5b/core/findingLedger.mjs";

const survived = { attack_id: "a#0", target_raw: 205, outcome: "survived" };
const bypass = { attack_id: "a#1", target_raw: 0, outcome: "bypass", severity: "low" };

test("outcomeForRaw: 0 → bypass, non-zero → survived", () => {
  assert.equal(outcomeForRaw(0), "bypass");
  assert.equal(outcomeForRaw(205), "survived");
});

test("216: an unknown/absent outcome class is rejected; a valid one passes", () => {
  assert.equal(checkFindingClassification(survived).raw, 0);
  assert.equal(checkFindingClassification({ ...survived, outcome: "vanished" }).raw, 216);
  assert.equal(checkFindingClassification({ ...survived, outcome: undefined }).raw, 216);
});

test("217: a GREEN target labelled survived is a LAUNDERED bypass", () => {
  // target_raw 0 (target emitted GREEN) but outcome claims survived → laundering.
  assert.equal(
    checkNoSilentBypass({ attack_id: "a#2", target_raw: 0, outcome: "survived" }).raw,
    217
  );
  assert.equal(checkNoSilentBypass(survived).raw, 0);
  assert.equal(checkNoSilentBypass(bypass).raw, 0);
});

test("218: a bypass label with a non-zero target_raw is the reverse mislabel", () => {
  assert.equal(checkBypassLabelMismatch({ ...bypass, target_raw: 205 }).raw, 218);
  assert.equal(checkBypassLabelMismatch(bypass).raw, 0);
  assert.equal(checkBypassLabelMismatch(survived).raw, 0);
});

test("220: a bypass without a severity signed into known_limitations is rejected", () => {
  const kl = ["a_confirmed_bypass_if_any_is_disclosed_here_by_id_and_severity_no_silent_bypass"];
  // severity present but NOT disclosed in known_limitations → 220
  assert.equal(checkSeverityLock(bypass, kl).raw, 220);
  // disclosed (id + severity appear in a signed limitation) → green
  const disclosed = [...kl, "bypass a#1 severity low confirmed"];
  assert.equal(checkSeverityLock(bypass, disclosed).raw, 0);
  // a bypass with no severity at all → 220
  assert.equal(checkSeverityLock({ ...bypass, severity: undefined }, disclosed).raw, 220);
  // survived findings never need a severity
  assert.equal(checkSeverityLock(survived, kl).raw, 0);
});

test("217 set-level: a driven bypass with no finding is an OMITTED bypass", () => {
  const findings = [survived]; // a#0 only
  const driven = [
    { attack_id: "a#0", target_raw: 205 },
    { attack_id: "a#9", target_raw: 0 }, // a real bypass, absent from findings
  ];
  const r = detectOmittedBypasses(findings, driven);
  assert.equal(r.raw, 217);
  assert.deepEqual(r.detail.omitted, ["a#9"]);
  // when every bypass is recorded, green
  assert.equal(
    detectOmittedBypasses(
      [survived, bypass],
      [
        { attack_id: "a#0", target_raw: 205 },
        { attack_id: "a#1", target_raw: 0 },
      ]
    ).raw,
    0
  );
});
