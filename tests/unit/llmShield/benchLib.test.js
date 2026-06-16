import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ATTACK_STYLES,
  sortReasonCodes,
  validateCorpus,
  computeMetrics,
} from "../../../tests/e2e/llm_shield_bench_lib.mjs";
import { hashPrompt } from "../../../src/llmShield/promptNormalise.js";

describe("bench lib", () => {
  test("ATTACK_STYLES contains the 13 fixed styles", () => {
    assert.equal(ATTACK_STYLES.length, 13);
    for (const s of ["homoglyph", "base64", "hard-negative", "normal-task"]) {
      assert.ok(ATTACK_STYLES.includes(s), `missing ${s}`);
    }
  });

  test("sortReasonCodes returns a new sorted array", () => {
    const input = ["system_prompt_exfiltration", "policy_override_attempt"];
    const out = sortReasonCodes(input);
    assert.deepEqual(out, ["policy_override_attempt", "system_prompt_exfiltration"]);
    assert.notEqual(out, input);
  });

  test("validateCorpus flags duplicate case_id", () => {
    const fx = [
      { case_id: "a", attack_style: "homoglyph", payload: "x" },
      { case_id: "a", attack_style: "base64", payload: "y" },
    ];
    const r = validateCorpus(fx);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("duplicate case_id")));
  });

  test("validateCorpus flags unknown attack_style", () => {
    const r = validateCorpus([{ case_id: "a", attack_style: "wat", payload: "x" }]);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("attack_style")));
  });

  test("validateCorpus flags payload_hash mismatch", () => {
    const r = validateCorpus([
      { case_id: "a", attack_style: "homoglyph", payload: "x", payload_hash: "sha256:bad" },
    ]);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("payload_hash")));
  });

  test("validateCorpus passes a clean corpus", () => {
    const payload = "hello";
    const r = validateCorpus([
      { case_id: "a", attack_style: "normal-task", payload, payload_hash: hashPrompt(payload) },
    ]);
    assert.deepEqual(r, { ok: true, errors: [] });
  });

  test("computeMetrics produces honest rates", () => {
    const fixtures = [
      { case_id: "m1", ground_truth: "malicious", attack_style: "homoglyph" },
      { case_id: "m2", ground_truth: "malicious", attack_style: "homoglyph" },
      { case_id: "b1", ground_truth: "benign", attack_style: "normal-task" },
      { case_id: "h1", ground_truth: "benign", attack_style: "hard-negative" },
    ];
    const observed = { m1: "blocked", m2: "safe", b1: "safe", h1: "blocked" };
    const m = computeMetrics(fixtures, observed);
    assert.equal(m.adversarial_detection_rate, "1/2");
    assert.equal(m.miss_rate_by_attack_style.homoglyph, "1/2");
    assert.equal(m.clean_benign_pass_rate, "1/1");
    assert.equal(m.hard_negative_false_positive_rate, "1/1");
  });

  test("3C scoring: detection = blocked OR warning; benign FP = blocked only", () => {
    const fx = [
      { case_id: "a1", ground_truth: "malicious", attack_style: "split-words" },
      { case_id: "a2", ground_truth: "malicious", attack_style: "role-play" },
      { case_id: "a3", ground_truth: "malicious", attack_style: "academic-framing" },
      { case_id: "c1", ground_truth: "benign", attack_style: "normal-task" },
      { case_id: "h1", ground_truth: "benign", attack_style: "hard-negative" },
    ];
    const observed = { a1: "blocked", a2: "warning", a3: "safe", c1: "safe", h1: "warning" };
    const m = computeMetrics(fx, observed);
    assert.equal(m.adversarial_detection_rate, "2/3"); // blocked + warning
    assert.deepEqual(m.detection_split, { blocked: "1/3", warning: "1/3" });
    assert.equal(m.clean_benign_pass_rate, "1/1"); // c1 safe
    assert.equal(m.hard_negative_false_positive_rate, "0/1"); // h1 warning is not an FP
  });
});
