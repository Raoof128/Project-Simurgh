import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { scoreAcademicRisk } from "../../src/academic/riskScoring.js";

const baseline = {
  keystrokes: 20,
  chars_typed: 80,
  effective_wpm: 60,
  focus_losses: 0,
  time_off_window_ms: 0,
  pastes: 0,
  paste_payload_chars: 0,
  max_idle_gap_ms: 0,
  window_seconds: 5,
};

describe("scoreAcademicRisk", () => {
  test("returns Safe for normal exam behaviour", () => {
    const result = scoreAcademicRisk(
      baseline,
      { connected: true, hostileCount: 0 },
      { reconnects: 0 }
    );
    assert.equal(result.risk_level, "Safe");
    assert.ok(result.risk_score < 40);
  });

  test("returns all required output fields", () => {
    const result = scoreAcademicRisk(baseline, {}, {});
    assert.ok("risk_level" in result);
    assert.ok("risk_score" in result);
    assert.ok("confidence" in result);
    assert.ok("categories" in result);
    assert.ok("recommendation" in result);
    assert.ok("source" in result);
    assert.equal(result.source.score, "local_heuristic");
  });

  test("raises Warning for a medium paste", () => {
    const t = { ...baseline, paste_payload_chars: 90, pastes: 1 };
    const result = scoreAcademicRisk(t, { connected: true, hostileCount: 0 }, { reconnects: 0 });
    assert.equal(result.risk_level, "Warning");
  });

  test("raises Critical for large paste with minimal typing", () => {
    const t = { ...baseline, paste_payload_chars: 250, pastes: 1, chars_typed: 5 };
    const result = scoreAcademicRisk(t, { connected: true, hostileCount: 0 }, { reconnects: 0 });
    assert.equal(result.risk_level, "Critical");
    assert.ok(result.risk_score >= 70);
  });

  test("raises Critical when helper reports excluded window (affinity override)", () => {
    const result = scoreAcademicRisk(
      baseline,
      { connected: true, hostileCount: 1 },
      { reconnects: 0 }
    );
    assert.equal(result.risk_level, "Critical");
    assert.ok(result.risk_score >= 85);
    assert.equal(result.categories.affinity_risk, 100);
  });

  test("raises Critical when daemon reports capture-excluded risk", () => {
    const result = scoreAcademicRisk(
      baseline,
      {
        connected: true,
        hostileCount: 0,
        daemonRisk: 100,
        daemonForceCritical: true,
      },
      { reconnects: 0 }
    );
    assert.equal(result.risk_level, "Critical");
    assert.ok(result.risk_score >= 85);
    assert.equal(result.categories.daemon_risk, 100);
    assert.match(result.recommendation, /No automatic misconduct finding/);
  });

  test("risk_score is between 0 and 100", () => {
    const extreme = { ...baseline, paste_payload_chars: 999, focus_losses: 99, effective_wpm: 999 };
    const result = scoreAcademicRisk(
      extreme,
      { connected: false, hostileCount: 3 },
      { reconnects: 5 }
    );
    assert.ok(result.risk_score >= 0 && result.risk_score <= 100);
  });

  test("recommendation says manual review for Critical", () => {
    const t = { ...baseline, paste_payload_chars: 250, chars_typed: 5 };
    const result = scoreAcademicRisk(t, { connected: true, hostileCount: 0 }, { reconnects: 0 });
    assert.match(result.recommendation, /[Mm]anual review/);
    assert.match(result.recommendation, /[Nn]o automatic/);
  });

  test("confidence is between 0 and 1", () => {
    const result = scoreAcademicRisk(baseline, {}, {});
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
  });
});
