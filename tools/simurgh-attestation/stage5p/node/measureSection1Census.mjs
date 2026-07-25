#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — Section 1 census. SOLE authority for every count asserted in the 5P design spec.
// Oracle-free: it derives counts from the spec's own normative fences and compares them to the
// counts the prose asserts. It NEVER hard-codes an expected number — a count lives in exactly one
// place (the fence) and the prose is checked against it. Byte-stable: same spec bytes in, same
// JSON out, no clock, no randomness, no network.
//
// House rule this enforces (frozen in Section 1): normative fences contain identifiers and nothing
// else — no inline commentary, no continuation lines. That is what makes them machine-countable.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SPEC_PATH = resolve(
  HERE,
  "../../../../docs/superpowers/specs/2026-07-25-stage-5p-vsi-verifiable-submitter-identity-design.md"
);

const FENCE_LANGS = new Set(["text", "js", "lean"]);

// Extract the body of a "### <heading>" subsection, up to the next heading of any level.
function subsection(spec, heading) {
  const re = new RegExp(
    `###\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n([\\s\\S]*?)(?=\\n###|\\n##\\s|$)`
  );
  const m = spec.match(re);
  if (!m) throw new Error(`section-1 census: heading not found: ${heading}`);
  return m[1];
}

// First fenced block of a subsection, as non-empty lines, with the info-string dropped.
function fenceLines(spec, heading) {
  const parts = subsection(spec, heading).split("```");
  if (parts.length < 2) throw new Error(`section-1 census: no fence under: ${heading}`);
  const inner = parts[1];
  const nl = inner.indexOf("\n");
  const info = inner.slice(0, nl).trim();
  const body = FENCE_LANGS.has(info) ? inner.slice(nl + 1) : inner;
  return body.split("\n").filter((l) => l.trim() !== "");
}

// A normative identifier fence: every line must be a bare identifier. Continuation lines or inline
// commentary are a SPEC defect, reported as such rather than silently tolerated.
function identifierFence(spec, heading) {
  const lines = fenceLines(spec, heading);
  const bad = lines.filter((l) => !/^[a-z][a-z0-9_]*$/.test(l.trim()));
  if (bad.length) {
    throw new Error(
      `section-1 census: non-identifier line(s) in "${heading}" fence — fences hold identifiers ` +
        `only (found: ${JSON.stringify(bad.slice(0, 3))})`
    );
  }
  return lines.map((l) => l.trim());
}

export function measureSection1Census(specText) {
  const spec = specText ?? readFileSync(SPEC_PATH, "utf8");

  // Axis fence is "name  value | value | ..." — one line per axis.
  const axes = fenceLines(spec, "Blade (one)").map((l) => l.trim().split(/\s{2,}|\s\s+/)[0]);

  const laws = (subsection(spec, "The seven laws").match(/^\d+\.\s+\*\*/gm) ?? []).length;
  const leanTargets = fenceLines(spec, "Lean targets")
    .map((l) => l.match(/^([A-Za-z]\w*)\s+:/))
    .filter(Boolean)
    .map((m) => m[1]);
  const typedOutcomes = identifierFence(spec, "Typed outcomes");
  const nonClaims = identifierFence(spec, "Non-claims");
  const attackRows = (spec.match(/^\|\s*S2\.\d+\s*\|/gm) ?? []).length;

  const derived = {
    axes: axes.length,
    laws,
    lean_targets: leanTargets.length,
    typed_outcomes: typedOutcomes.length,
    non_claims: nonClaims.length,
    attack_rows: attackRows,
  };

  // Duplicate detection — a repeated identifier would inflate a count while looking correct.
  const dupes = {};
  for (const [k, list] of Object.entries({
    axes,
    lean_targets: leanTargets,
    typed_outcomes: typedOutcomes,
    non_claims: nonClaims,
  })) {
    const seen = new Set();
    const d = list.filter((x) => (seen.has(x) ? true : (seen.add(x), false)));
    if (d.length) dupes[k] = d;
  }

  // The prose assertions, harvested from the A1/A2 invalidation rule wording. The census does not
  // know the "right" numbers — it only checks that prose and fences agree.
  const WORDS = {
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const asserted = {};
  for (const [label, key] of [
    ["axes", "axes"],
    ["laws", "laws"],
    ["Lean targets", "lean_targets"],
    ["typed outcomes", "typed_outcomes"],
    ["non-claims", "non_claims"],
    ["forward-committed attack rows", "attack_rows"],
  ]) {
    const m = spec.match(
      new RegExp(`the\\s+([a-z]+)\\s+${label.replace(/[-\s]/g, "[-\\s]")}`, "i")
    );
    if (m && WORDS[m[1].toLowerCase()] !== undefined) asserted[key] = WORDS[m[1].toLowerCase()];
  }

  const drift = Object.entries(asserted)
    .filter(([k, v]) => derived[k] !== v)
    .map(([k, v]) => ({ item: k, asserted: v, derived: derived[k] }));

  return {
    census_id: "simurgh.vsi.section1_census.v1",
    derived,
    asserted,
    drift,
    duplicates: dupes,
    identifiers: {
      axes,
      lean_targets: leanTargets,
      typed_outcomes: typedOutcomes,
      non_claims: nonClaims,
    },
    ok: drift.length === 0 && Object.keys(dupes).length === 0,
  };
}

// CLI-main argv guard: importable without executing.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const out = measureSection1Census();
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  if (!out.ok) {
    process.stderr.write("\nSECTION 1 CENSUS: DRIFT — prose and fences disagree.\n");
    process.exit(1);
  }
  process.stderr.write("\nSECTION 1 CENSUS: all counts reconcile.\n");
}
