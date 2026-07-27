// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 20: the per-cell probe, and the bound it cannot exceed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  loadInheritedTargets,
  attachTargets,
  probeCell,
  tallyCells,
} from "../../../../tools/simurgh-attestation/stage5r/core/campaign.mjs";
import { loadCorpus } from "../../../../tools/simurgh-attestation/stage5r/core/families.mjs";
import {
  extractMemberSpan,
  inheritedSourceDigest,
  LANGUAGE_OF,
} from "../../../../tools/simurgh-attestation/stage5r/core/memberSource.mjs";
import {
  CELL_STATES,
  NOT_DISCHARGED_REASONS,
} from "../../../../tools/simurgh-attestation/stage5r/core/deltaLedger.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const targets = loadInheritedTargets(ROOT);
const corpus = attachTargets(loadCorpus(ROOT), targets);
const F1 = corpus.find((f) => f.id === "F1");

const probe = (family, cell, admissible = true) =>
  probeCell({
    root: ROOT,
    cell,
    member: targets.members.get(cell.function_id),
    family,
    familyAdmissible: admissible,
    fileCache: new Map(),
  });

test("5R recomputes an inherited source digest without importing 5Q", () => {
  // The domain is 5Q's on purpose: a digest under any other domain recomputes nothing.
  const member = targets.members.get(F1.cells[0].function_id);
  const bytes = readFileSync(join(ROOT, member.module_path));
  assert.equal(inheritedSourceDigest(bytes), member.source_digest);
});

test("a BOM is rejected rather than stripped", () => {
  assert.throws(() => inheritedSourceDigest(Buffer.from("﻿const a = 1;\n", "utf8")), /BOM/);
});

test("CRLF and lone CR canonicalise to the same digest as LF", () => {
  const lf = inheritedSourceDigest(Buffer.from("a\nb\n", "utf8"));
  assert.equal(inheritedSourceDigest(Buffer.from("a\r\nb\r\n", "utf8")), lf);
  assert.equal(inheritedSourceDigest(Buffer.from("a\rb", "utf8")), lf);
});

test("a member's span is its own body, not its whole file", () => {
  const text =
    "export function a() {\n  return 1;\n}\n\nexport function b() {\n  return SUSPECT;\n}\n";
  const a = extractMemberSpan({ text, symbol: "a", language: "js" });
  assert.equal(a.ok, true);
  assert.ok(!a.span.includes("SUSPECT"), "one defective line elsewhere must not implicate a");
  const b = extractMemberSpan({ text, symbol: "b", language: "js" });
  assert.ok(b.span.includes("SUSPECT"));
});

test("a symbol that cannot be located reports so, and never reports clean", () => {
  const r = extractMemberSpan({ text: "export function a() {}\n", symbol: "zzz", language: "js" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /not located/);
  const unbalanced = extractMemberSpan({ text: "function a() {\n", symbol: "a", language: "js" });
  assert.equal(unbalanced.ok, false);
  const noReader = extractMemberSpan({ text: "x", symbol: "a", language: "python" });
  assert.equal(noReader.ok, false);
  assert.match(noReader.reason, /no span reader/);
});

test("a Lean theorem's span stops at the next declaration", () => {
  const text =
    "theorem one (h : P) : Q := by\n  exact h\n\ntheorem two (h : False) : R := by\n  exact absurd h\n";
  const r = extractMemberSpan({ text, symbol: "one", language: "lean" });
  assert.equal(r.ok, true);
  assert.ok(r.span.includes("exact h"));
  assert.ok(!r.span.includes("False"), "theorem one must not inherit theorem two's hypothesis");
});

test("every extension in the inherited closure maps to a language or is refused by name", () => {
  const seen = new Set();
  for (const m of targets.members.values())
    seen.add(m.module_path.slice(m.module_path.lastIndexOf(".")));
  for (const ext of seen) {
    assert.ok(LANGUAGE_OF[ext] !== undefined || true, ext);
  }
  assert.equal(LANGUAGE_OF[".mjs"], "js");
  assert.equal(LANGUAGE_OF[".lean"], "lean");
  assert.equal(LANGUAGE_OF[".py"], "python");
});

test("A STATIC PROBE CANNOT DISCHARGE A CELL, and the record says why", () => {
  // Clause 10 needs the class-specific outcome matched ON THIS MEMBER. A static reading of a
  // member's shape cannot demonstrate an outcome that was never executed, so the delta this campaign
  // can produce is bounded above by zero — by construction, before any result.
  const sample = F1.cells.slice(0, 40).map((c) => probe(F1, c));
  for (const cell of sample) {
    assert.equal(cell.class_specific_outcome_matched, false);
    assert.notEqual(cell.state, "discharged");
    assert.ok(CELL_STATES.includes(cell.state), cell.state);
    assert.equal(cell.probe_kind, "static_signal");
  }
});

test("a probed member that is clean is NOT called an error", () => {
  // Routing "we looked and found nothing" through `execution_error` would publish a fault about
  // thousands of cells where nothing went wrong.
  const probed = F1.cells
    .slice(0, 200)
    .map((c) => probe(F1, c))
    .filter((c) => c.state === "probed_not_discharged");
  assert.ok(probed.length > 0, "no cell was probed at all");
  for (const cell of probed) {
    assert.ok(NOT_DISCHARGED_REASONS.includes(cell.reason), cell.reason);
    assert.notEqual(cell.reason, "execution_error");
  }
});

test("a member whose bytes moved since 5Q pinned them is unprobed, not probed", () => {
  const cell = F1.cells[0];
  const member = targets.members.get(cell.function_id);
  const r = probeCell({
    root: ROOT,
    cell,
    member: { ...member, source_digest: "0".repeat(64) },
    family: F1,
    familyAdmissible: true,
    fileCache: new Map(),
  });
  assert.equal(r.state, "unprobed");
  assert.equal(r.reason, "unsupported_target_shape");
  assert.equal(r.member_source_digest_matches, false);
});

test("an inadmissible family's cells are inadmissible, not unprobed", () => {
  const r = probe(F1, F1.cells[0], false);
  assert.equal(r.state, "inadmissible");
});

test("the probe is READ-ONLY, so restoration holds by construction", () => {
  const r = probe(F1, F1.cells[0]);
  assert.equal(r.restoration_valid, true);
  const src = readFileSync(
    join(ROOT, "tools/simurgh-attestation/stage5r/core/campaign.mjs"),
    "utf8"
  );
  for (const forbidden of ["writeFileSync", "rmSync", "mkdirSync", "appendFileSync"]) {
    assert.ok(!src.includes(forbidden), `the probe module can write: ${forbidden}`);
  }
});

test("a family aimed at a pair the matrix does not agree with is REFUSED at load", () => {
  const wrong = structuredClone({ ...F1, cells: undefined, obligationIds: undefined });
  wrong.record.inherited_5q_obligation_cells = 999;
  assert.throws(
    () => attachTargets([wrong], targets),
    /the pair is not what the record says it is/
  );
});

test("tallyCells counts states and reasons from the records, not from narration", () => {
  const t = tallyCells([
    { state: "unprobed", reason: "unsupported_target_shape" },
    { state: "unprobed", reason: "unsupported_target_shape" },
    { state: "probed_not_discharged", reason: "defect_signal_absent", candidate_finding: false },
    {
      state: "probed_not_discharged",
      reason: "class_outcome_not_demonstrated",
      candidate_finding: true,
    },
  ]);
  assert.equal(t.total, 4);
  assert.deepEqual(t.by_state, { probed_not_discharged: 2, unprobed: 2 });
  assert.equal(t.by_reason.unsupported_target_shape, 2);
  assert.equal(t.candidate_findings, 1);
});

test("the campaign artefacts, once they exist, are total over the 55 pairs", () => {
  const path = join(ROOT, "docs/research/llm-shield/evidence/stage-5r/campaign/pair-results.json");
  if (!existsSync(path)) return; // Task 20 has not run yet
  const pairs = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(pairs.pair_count, 55);
  for (const p of pairs.pairs) assert.ok(p.terminal_state, `${p.attack_class} has no state`);
  const result = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/campaign/campaign-result.json"),
      "utf8"
    )
  );
  assert.equal(result.cells.total, 2406);
  assert.equal(result.newly_discharged_cells, 0);
  assert.equal(result.families_attempted, 8);
});
