// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
// Replays the harness-computed Stage 4P fixture corpus (Task 8) through the real core
// functions. No hand-typed expectations here beyond what the builder itself asserted at
// generation time — this is a REPLAY, not a fresh derivation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { verifyCustody } from "../../../../tools/simurgh-attestation/stage4p/core/custodyCore.mjs";
import { buildCpcSignal } from "../../../../tools/simurgh-attestation/stage4p/core/cpcCore.mjs";

const ROOT = join(import.meta.dirname, "../../../fixtures/llmShield/stage4p");
const LANE_A = join(ROOT, "lane-a");
const LANE_C = join(ROOT, "lane-c");
const CPC = join(ROOT, "cpc");
const TEST_KEYS = join(ROOT, "test-keys");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

// Every reason chainCore.mjs's raw-78 laundering path can produce (spec §6.2).
const RAW_78_REASONS = [
  "missing_hop",
  "reordered_hop",
  "non_linking_previous_digest",
  "duplicated_hop",
  "terminal_response_mismatch",
];
const ALL_RAW_CODES = [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79];

test("every lane-a arm replays to its expected {raw, reason}", () => {
  const armDirs = readdirSync(LANE_A);
  assert.ok(armDirs.length > 0, "lane-a must have at least one arm");
  for (const arm of armDirs) {
    const input = readJson(join(LANE_A, arm, "input.json"));
    const expected = readJson(join(LANE_A, arm, "expected.json"));
    const result = verifyCustody(input);
    assert.equal(result.raw, expected.raw, `arm ${arm}: raw mismatch`);
    if (expected.raw !== 0) {
      assert.equal(result.reason, expected.reason, `arm ${arm}: reason mismatch`);
    }
  }
});

test("lane-a covers all 13 raw codes and all five raw-78 reasons", () => {
  const armDirs = readdirSync(LANE_A);
  const seenRaw = new Set();
  const seenReasons78 = new Set();
  for (const arm of armDirs) {
    const expected = readJson(join(LANE_A, arm, "expected.json"));
    seenRaw.add(expected.raw);
    if (expected.raw === 78) seenReasons78.add(expected.reason);
  }
  for (const code of ALL_RAW_CODES) {
    assert.ok(seenRaw.has(code), `raw code ${code} not covered by any lane-a arm`);
  }
  for (const reason of RAW_78_REASONS) {
    assert.ok(seenReasons78.has(reason), `raw-78 reason "${reason}" not covered`);
  }
});

test("lane-a doubly-broken and boundary arms resolve first-failure order", () => {
  const cases = [
    ["laundering-beats-model-swap", 78],
    ["signature-beats-laundering", 68],
    ["endpoint-beats-relay", 70],
    ["epoch-edge-low", 0],
    ["epoch-edge-high", 0],
    ["unknown-enum", 67],
    ["malformed-receipt", 77],
  ];
  for (const [arm, raw] of cases) {
    const input = readJson(join(LANE_A, arm, "input.json"));
    assert.equal(verifyCustody(input).raw, raw, arm);
  }
});

test("lane-c public-report-motivated arm is synthetic-only and replays to raw 71", () => {
  const input = readJson(join(LANE_C, "public-report-motivated", "input.json"));
  const expected = readJson(join(LANE_C, "public-report-motivated", "expected.json"));
  assert.equal(input.source_note, "public_report_motivated_synthetic");
  // Every narrative field is a digest, never a literal label (the synthetic
  // "example-transfer-station" / "example-premium-model" names are hashed pre-images in
  // the builder, not stored in plaintext anywhere in the committed fixture).
  const serialised = JSON.stringify(input);
  assert.doesNotMatch(serialised, /[A-Za-z]+-(inc|corp|llc|ltd)\b/i);
  const result = verifyCustody(input);
  assert.equal(result.raw, expected.raw);
  assert.equal(result.reason, expected.reason);
});

test("cpc arms: match/differ/cross-window/degraded/budget reproduce via buildCpcSignal", () => {
  const match = readJson(join(CPC, "match.json"));
  const a1 = buildCpcSignal(match.operator_a.input);
  const b1 = buildCpcSignal(match.operator_b.input);
  assert.deepEqual(a1, match.operator_a.signal);
  assert.deepEqual(b1, match.operator_b.signal);
  assert.equal(a1.custody_class_digest, b1.custody_class_digest);

  const differ = readJson(join(CPC, "differ.json"));
  const aD = buildCpcSignal(differ.operator_a.input);
  const bD = buildCpcSignal(differ.operator_b.input);
  assert.notEqual(aD.custody_class_digest, bD.custody_class_digest);

  const crossWindow = readJson(join(CPC, "cross-window.json"));
  const aC = buildCpcSignal(crossWindow.operator_a.input);
  const bC = buildCpcSignal(crossWindow.operator_b.input);
  assert.notEqual(aC.custody_class_digest, bC.custody_class_digest);
  assert.notEqual(aC.windowed_evidence_commitment, bC.windowed_evidence_commitment);

  const degraded = readJson(join(CPC, "degraded.json"));
  const dSignal = buildCpcSignal(degraded.operator_a.input);
  assert.deepEqual(dSignal, degraded.operator_a.signal);
  assert.equal(dSignal.signal_mode, "degraded_non_matchable");
  assert.ok(!("custody_class_digest" in dSignal));

  const budget = readJson(join(CPC, "budget.json"));
  assert.equal(budget.expected.raw, 79);
  assert.equal(budget.expected.reason, "disclosure_budget_exceeded");
});

test("MF1: no matchable CPC signal anywhere in the corpus carries observed_evidence_digest", () => {
  function scan(node) {
    if (Array.isArray(node)) {
      for (const v of node) scan(v);
      return;
    }
    if (node && typeof node === "object") {
      if (node.signal_mode === "matchable") {
        assert.ok(
          !("observed_evidence_digest" in node),
          "matchable signal must never carry observed_evidence_digest"
        );
      }
      for (const v of Object.values(node)) scan(v);
    }
  }
  for (const file of walkFiles(ROOT)) {
    if (!file.endsWith(".json")) continue;
    if (file.includes(`${join(ROOT, "test-keys")}`)) continue;
    scan(readJson(file));
  }
});

test("MF4: no private key material outside test-keys/, every test-keys file is allowlist-shaped", () => {
  const pemHeader = /-----BEGIN ([A-Z]+ )?PRIVATE KEY-----/;
  for (const file of walkFiles(ROOT)) {
    const content = readFileSync(file, "utf8");
    const inKeysDir = file.startsWith(TEST_KEYS + "/");
    if (pemHeader.test(content)) {
      assert.ok(inKeysDir, `private key material found outside test-keys/: ${file}`);
    }
  }
  for (const file of readdirSync(TEST_KEYS)) {
    assert.match(
      file,
      /^INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.(pem|meta\.json)$/,
      `test-keys file does not match allowlist prefix: ${file}`
    );
  }
});
