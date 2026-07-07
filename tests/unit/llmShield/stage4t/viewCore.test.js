// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC views (148/149). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildView,
  verifyView,
  verifyViewAgainstCommitments,
  deriveCommitments,
  deterministicSalt,
  sectionKey,
} from "../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs";

const capsule = () => ({
  epoch: "ep1",
  projected_sections: [
    { regime: "gpai_art55", section_id: "incident_dates", class: "evidence_backed", value: "r" },
    { regime: "gpai_art55", section_id: "submitter_information", class: "requires_human_input" },
    { regime: "gpai_art55", section_id: "model_involved", class: "requires_human_input" },
  ],
});

const salts = (c) =>
  Object.fromEntries(
    c.projected_sections.map((s) => [sectionKey(s), deterministicSalt(sectionKey(s))])
  );

test("regulator view (no redactions) verifies", () => {
  const c = capsule();
  const s = salts(c);
  const v = buildView(c, "regulator", [], s);
  assert.equal(verifyView(v, c, s), null);
});

test("public view with redactions verifies and ledgers them", () => {
  const c = capsule();
  const s = salts(c);
  const v = buildView(
    c,
    "public",
    ["gpai_art55/submitter_information", "gpai_art55/model_involved"],
    s
  );
  assert.equal(v.redactions.count, 2);
  assert.equal(verifyView(v, c, s), null);
});

test("148 when a disclosed section value is tampered", () => {
  const c = capsule();
  const s = salts(c);
  const v = buildView(c, "regulator", [], s);
  v.disclosed[0].section = { ...v.disclosed[0].section, value: "TAMPERED" };
  assert.equal(verifyView(v, c, s).raw, 148);
});

test("148 when the view root contradicts the capsule", () => {
  const c = capsule();
  const s = salts(c);
  const v = buildView(c, "regulator", [], s);
  v.capsule_root = "sha256:" + "0".repeat(64);
  assert.equal(verifyView(v, c, s).raw, 148);
});

test("149 when a section is omitted from both disclosed and redactions", () => {
  const c = capsule();
  const s = salts(c);
  const v = buildView(c, "public", ["gpai_art55/model_involved"], s);
  v.disclosed = v.disclosed.filter((d) => d.key !== "gpai_art55/submitter_information");
  assert.equal(verifyView(v, c, s).raw, 149);
});

test("149 when the redaction count is understated", () => {
  const c = capsule();
  const s = salts(c);
  const v = buildView(c, "public", ["gpai_art55/model_involved"], s);
  v.redactions.count = 0;
  assert.equal(verifyView(v, c, s).raw, 149);
});

test("149 when a redaction advertises a fabricated commitment", () => {
  const c = capsule();
  const s = salts(c);
  const v = buildView(c, "public", ["gpai_art55/model_involved"], s);
  v.redactions.commitments[0] = "sha256:" + "1".repeat(64);
  assert.equal(verifyView(v, c, s).raw, 149);
});

test("fully-redacted view still verifies (redact-all is legal, contradiction is not)", () => {
  const c = capsule();
  const s = salts(c);
  const allKeys = c.projected_sections.map(sectionKey);
  const v = buildView(c, "public", allKeys, s);
  assert.equal(v.disclosed.length, 0);
  assert.equal(verifyViewAgainstCommitments(v, deriveCommitments(c, s)), null);
});
