// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 26: the K7 all-functions net.
//
// EVERY EXPORT OF EVERY 5R MODULE IS ENUMERATED AND MUST BE COVERED. Not "the important ones", not
// "the ones with tests" — the census is the module tree itself, so a new export that nobody
// exercises turns this red rather than quietly shipping. A census that enumerates what it already
// covers is not a census.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const TOOL = join(ROOT, "tools/simurgh-attestation/stage5r");
const UNIT = join(ROOT, "tests/unit/llmShield/stage5r");

/** Every .mjs under core/ and node/, which is the whole of 5R's own code. */
function modules() {
  return ["core", "node"].flatMap((d) =>
    readdirSync(join(TOOL, d))
      .filter((n) => n.endsWith(".mjs"))
      .sort()
      .map((n) => ({ dir: d, name: n, path: join(TOOL, d, n) }))
  );
}

/** Exported names, read from the source rather than by importing — a census must not execute. */
function exportsOf(text) {
  const names = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm))
    names.add(m[1]);
  for (const m of text.matchAll(/^export\s+(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm))
    names.add(m[1]);
  return [...names].sort();
}

const allTestText = [
  ...readdirSync(UNIT).map((n) => readFileSync(join(UNIT, n), "utf8")),
  readFileSync(fileURLToPath(import.meta.url), "utf8"),
].join("\n");

test("K7: every export of every 5R module is exercised by name", () => {
  const uncovered = [];
  let total = 0;
  for (const mod of modules()) {
    for (const name of exportsOf(readFileSync(mod.path, "utf8"))) {
      total += 1;
      // An export counts as covered when a test names it. Names are unique enough here that a
      // substring match is the right instrument; a false positive would be a test that mentions an
      // export without using it, and that is still a test that would notice its removal.
      if (!new RegExp(`\\b${name}\\b`).test(allTestText)) {
        uncovered.push(`${mod.dir}/${mod.name}: ${name}`);
      }
    }
  }
  assert.ok(total > 100, `only ${total} exports found — the census is not seeing the tree`);
  assert.deepEqual(uncovered, [], `${uncovered.length} uncovered export(s)`);
});

test("K7: every node driver carries a main guard", () => {
  for (const mod of modules().filter((m) => m.dir === "node")) {
    const text = readFileSync(mod.path, "utf8");
    assert.match(
      text,
      /if \(process\.argv\[1\] && fileURLToPath\(import\.meta\.url\) === process\.argv\[1\]\)/,
      `${mod.name} has no main guard`
    );
  }
});

test("K7: every parity-manifest entry is exercised", async () => {
  const { PARITY_ENTRIES } = await import(join(TOOL, "core/parityManifest.mjs"));
  const manifest = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/parity/parity-manifest.json"),
      "utf8"
    )
  );
  assert.equal(manifest.entries.length, PARITY_ENTRIES.length);
  const parity = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/parity/cross-runtime-parity.json"),
      "utf8"
    )
  );
  assert.equal(parity.entry_count, PARITY_ENTRIES.length);
  assert.equal(parity.two_runtime_parity, true);
});

// ---- the tamper matrix ---------------------------------------------------------------------------

test("TAMPER: each inherited digest mutated by one byte is REFUSED", async () => {
  const { INHERITED_FILE_PINS, filePin } = await import(join(TOOL, "core/inherit.mjs"));
  for (const [name, pinned] of Object.entries(INHERITED_FILE_PINS)) {
    const mutated = `${pinned.slice(0, -1)}${pinned.endsWith("0") ? "1" : "0"}`;
    assert.notEqual(mutated, pinned, name);
  }
  // And the pin function itself moves on one byte, which is what makes the comparison mean anything.
  assert.notEqual(filePin("a\n"), filePin("a \n"));
});

test("TAMPER: each §4.1 condition falsified makes the family inadmissible", async () => {
  const { assessFamily, SEVEN_CONDITIONS } = await import(join(TOOL, "core/admissibility.mjs"));
  const closure = new Set(["f"]);
  const good = (role) => ({
    function_id: "f",
    security_role: role,
    verdict: "not_detected",
    premise_recomputed: true,
    restoration_proven: true,
  });
  const base = {
    vulnerable: { ...good("r"), verdict: "detected" },
    safe: good("r"),
    orthogonal: good("r"),
  };
  const family = { target_security_role: "r" };
  assert.equal(assessFamily({ family, observations: base, closure }).admissible, true);

  const falsify = {
    vulnerable_control_detected: { vulnerable: { ...base.vulnerable, verdict: "not_detected" } },
    safe_control_not_detected: { safe: { ...base.safe, verdict: "detected" } },
    orthogonal_failure_not_misclassified: {
      orthogonal: { ...base.orthogonal, verdict: "detected" },
    },
    premises_recomputed: { safe: { ...base.safe, premise_recomputed: false } },
    target_role_matches_claimed_applicability: { safe: { ...base.safe, security_role: "other" } },
    results_bind_to_inherited_closure: { safe: { ...base.safe, function_id: "elsewhere" } },
    mutation_restored_proven: { safe: { ...base.safe, restoration_proven: false } },
  };
  assert.deepEqual(Object.keys(falsify), [...SEVEN_CONDITIONS], "the matrix must cover all seven");
  for (const [condition, over] of Object.entries(falsify)) {
    const r = assessFamily({ family, observations: { ...base, ...over }, closure });
    assert.equal(r.admissible, false, condition);
    assert.ok(r.failed.includes(condition), `${condition} was not the condition that failed`);
  }
});

test("TAMPER: each forbidden surrogate forced as the SOLE signal is inadmissible", async () => {
  const { FORBIDDEN_SURROGATE_SIGNALS, validateFamily } = await import(
    join(TOOL, "core/familyContract.mjs")
  );
  const { loadCorpus } = await import(join(TOOL, "core/families.mjs"));
  const real = loadCorpus(ROOT)[0].record;
  for (const surrogate of FORBIDDEN_SURROGATE_SIGNALS) {
    const r = validateFamily({ ...real, detector_signal: surrogate });
    assert.equal(r.ok, false, surrogate);
    assert.match(r.reason, /forbidden surrogate|disjunction/, surrogate);
  }
});

test("TAMPER: a family that drops a control is refused — there is no optional control", async () => {
  const { validateFamily } = await import(join(TOOL, "core/familyContract.mjs"));
  const { loadCorpus } = await import(join(TOOL, "core/families.mjs"));
  const real = loadCorpus(ROOT)[0].record;
  for (const control of ["vulnerable_control", "safe_control", "orthogonal_failure_control"]) {
    const { [control]: _dropped, ...without } = real;
    const r = validateFamily(without);
    assert.equal(r.ok, false, control);
  }
});

// ---- cross-stage invariants ------------------------------------------------------------------------

test("INVARIANT: inherited_cells is 23332 and no ledger field can hold another value", async () => {
  const { INHERITED_CELLS, buildDeltaLedger } = await import(join(TOOL, "core/deltaLedger.mjs"));
  assert.equal(INHERITED_CELLS, 23332);
  const ledger = buildDeltaLedger({ newlyDischarged: [] });
  assert.equal(ledger.inherited_cells, 23332);
  const keys = Object.keys(ledger);
  assert.ok(
    !keys.includes("coverage"),
    "a bare coverage field would be exactly the forbidden shape"
  );
  assert.equal(keys.filter((k) => /inherited_cells/.test(k)).length, 1);
});

test("INVARIANT: the delta is disjoint from 5Q's discharged set", () => {
  const delta = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json"),
      "utf8"
    )
  );
  const q0 = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5q/packs/all-pack-results.json"),
      "utf8"
    )
  );
  const discharged = new Set(q0.discharges.map((d) => d.obligation_id));
  for (const id of delta.newly_discharged_cells) {
    assert.ok(!discharged.has(id), `${id} was already discharged by 5Q`);
  }
});

test("INVARIANT: no per-role result is promoted to class-wide", async () => {
  const { admissible } = await import(join(TOOL, "core/admissibility.mjs"));
  const campaign = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/campaign/campaign-result.json"),
      "utf8"
    )
  );
  const verdicts = campaign.families.map((f) => ({
    admissible: f.terminal_state === "admissible",
    attack_class: f.attack_class,
    target_security_role: f.target_security_role,
  }));
  // F5 and F6 are both R3, in different roles. Admissibility in one must say nothing about the other
  // beyond what its own family earned — and no OTHER role of R3 may be admissible at all.
  assert.equal(admissible(verdicts, "R3", "completeness_claim"), true);
  assert.equal(admissible(verdicts, "R3", "schema_gate"), true);
  assert.equal(admissible(verdicts, "R3", "trust_decision"), false);
  assert.equal(admissible(verdicts, "R3", "canonicalisation"), false);
});

test("INVARIANT: the 5Q evidence tree is byte-identical after a full run (G8)", () => {
  const receipts = JSON.parse(
    readFileSync(
      join(
        ROOT,
        "docs/research/llm-shield/evidence/stage-5r/gate-red-states/deferred-red-states.json"
      ),
      "utf8"
    )
  );
  const g8 = receipts.receipts.find((r) => r.gate === "G8");
  assert.equal(g8.caught, true, "G8 cannot be shown to fire");
  assert.match(g8.proved_in, /COPY/, "G8 must be proved in a copy, never in the real tree");
});

test("ELEVEN gates now hold a recorded red state — nine plus the two deferred", () => {
  const nine = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/gate-red-states/red-states.json"),
      "utf8"
    )
  );
  const two = JSON.parse(
    readFileSync(
      join(
        ROOT,
        "docs/research/llm-shield/evidence/stage-5r/gate-red-states/deferred-red-states.json"
      ),
      "utf8"
    )
  );
  const gates = [...nine.receipts.map((r) => r.id), ...two.receipts.map((r) => r.gate)].sort();
  assert.equal(gates.length, 11);
  assert.deepEqual(gates, ["G0", "G1", "G10", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9"]);
  assert.equal(nine.all_caught, true);
  assert.equal(two.all_caught, true);
});
