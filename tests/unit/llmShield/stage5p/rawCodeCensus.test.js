// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Annex R — the raw-code census, and the proof that every gate can FAIL.
//
// Three times in this stage a census gate was found vacuous or mis-targeted (a heading literal that
// did not exist, a mutation that landed in the wrong fence, contiguity mistaken for order). Every
// gate below is therefore driven by a MUTATED table through the real census — never by a
// re-implementation of the census's own predicates, which would only prove the copy agrees with
// itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { measureRawCodeCensus } from "../../../../tools/simurgh-attestation/stage5p/node/measureStage5pRawCodes.mjs";
import {
  VSI_ALLOCATION,
  VSI_PAIR_ALIASES,
} from "../../../../tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs";

const REPO = new URL("../../../../", import.meta.url).pathname;
const kinds = (c) => c.problems.map((p) => p.kind);
const mutate = (fn) => {
  const rows = VSI_ALLOCATION.map((r) => ({ ...r }));
  fn(rows);
  return measureRawCodeCensus({ allocation: rows });
};

test("PREMISE: the census is clean on the real allocation — every mutation below is the cause", () => {
  const c = measureRawCodeCensus();
  assert.deepEqual(c.problems, [], JSON.stringify(c.problems, null, 2));
  assert.equal(c.ok, true);
});

test("counts are derived, and agree with the inventories they summarise", () => {
  const c = measureRawCodeCensus();
  assert.equal(c.counts.allocated, c.allocation.length);
  assert.equal(c.counts.aliases, c.aliases.length);
  assert.equal(c.counts.covered_pairs, c.covered_pairs.length);
  assert.equal(c.counts.observed_emission_sites, c.observed_emission_sites.length);
  assert.equal(c.counts.probes, c.probe_rows.length);
});

test("byte-stability: two runs serialise identically", () => {
  assert.equal(JSON.stringify(measureRawCodeCensus()), JSON.stringify(measureRawCodeCensus()));
});

test("the two segments are reported distinctly, and allocation is closed after 474", () => {
  const c = measureRawCodeCensus();
  assert.deepEqual(c.band, {
    lo: 464,
    closed_band_hi: 472,
    amendment_from: 473,
    allocated_hi: 474,
    reserved_from: 475,
  });
  assert.equal(c.ok_raw, 0);
  assert.equal(c.fail_closed_raw, 29);
  assert.equal(c.counts.closed_band, 9);
  assert.equal(c.counts.amendment_band, 2);
});

test("GATE PROOF — an amendment that renumbers or re-points a CLOSED-band row is caught", () => {
  // The promise A5 rests on is "existing codes never move". This is its executable form.
  const renumbered = mutate((rows) => {
    rows[0].raw_code = 999;
  });
  assert.ok(
    kinds(renumbered).includes("closed_band_disturbed_by_amendment"),
    JSON.stringify(kinds(renumbered))
  );
  const repointed = mutate((rows) => {
    rows[0].policy_outcome = "resolver_profile_revoked";
  });
  assert.ok(kinds(repointed).includes("closed_band_disturbed_by_amendment"));
});

// ---- GATE PROOFS: each mutation drives the REAL census ----------------------------------------

test("GATE PROOF — deleting a row fails completeness", () => {
  const c = mutate((rows) => rows.splice(3, 1));
  assert.equal(c.ok, false, "completeness gate is vacuous");
  assert.ok(
    c.problems.some(
      (p) => p.kind === "outcome_not_allocated_exactly_once" && p.count === 0,
      JSON.stringify(kinds(c))
    )
  );
});

test("GATE PROOF — duplicating an outcome fails completeness", () => {
  const c = mutate((rows) => {
    rows[4].policy_outcome = rows[3].policy_outcome;
  });
  assert.equal(c.ok, false);
  const dup = c.problems.find(
    (p) => p.kind === "outcome_not_allocated_exactly_once" && p.count === 2
  );
  assert.ok(dup, JSON.stringify(kinds(c)));
});

test("GATE PROOF — swapping two raw CODES breaks contiguity-in-order", () => {
  const c = mutate((rows) => {
    const t = rows[0].raw_code;
    rows[0].raw_code = rows[1].raw_code;
    rows[1].raw_code = t;
  });
  assert.equal(c.ok, false, "swap gate is vacuous");
  assert.ok(
    c.problems.some((p) => p.kind === "band_not_contiguous_in_order"),
    JSON.stringify(kinds(c))
  );
});

test("GATE PROOF — swapping two OUTCOMES between rows is caught by emission-site coverage", () => {
  // The subtlest swap: codes stay contiguous, order stays legal, every outcome still appears once.
  // Only the (check, outcome) PAIRS change — which is exactly what the emission-site gate exists for.
  const c = mutate((rows) => {
    const t = rows[0].policy_outcome;
    rows[0].policy_outcome = rows[1].policy_outcome;
    rows[1].policy_outcome = t;
  });
  assert.equal(c.ok, false, "an outcome swap slipped past every gate");
  const k = kinds(c);
  assert.ok(k.includes("static_emission_site_unallocated"), JSON.stringify(k));
  assert.ok(k.includes("observed_emission_site_unallocated"));
  assert.ok(k.includes("fixture_pair_unallocated"));
  // ...and the structural gates stay quiet, proving the emission-site gate did the work alone.
  assert.ok(!k.includes("band_not_contiguous_in_order"));
  assert.ok(!k.includes("outcome_not_allocated_exactly_once"));
});

test("GATE PROOF — reordering rows against the frozen check order is caught", () => {
  const c = mutate((rows) => {
    const t = rows[2];
    rows[2] = rows[5];
    rows[5] = t;
  });
  assert.equal(c.ok, false);
  const k = kinds(c);
  assert.ok(
    k.includes("allocation_order_contradicts_check_order") ||
      k.includes("band_not_contiguous_in_order"),
    JSON.stringify(k)
  );
});

test("GATE PROOF — violating the S2.C8 internal tie-break is caught on its own", () => {
  const c = mutate((rows) => {
    // Swap ONLY the two S2.C8 outcomes, keeping their codes: the general relation would then
    // precede the specific condition, which Annex R forbids.
    const i = rows.findIndex((r) => r.policy_outcome === "identity_unresolved");
    const j = rows.findIndex((r) => r.policy_outcome === "identity_strength_incomparable");
    const t = rows[i].policy_outcome;
    rows[i].policy_outcome = rows[j].policy_outcome;
    rows[j].policy_outcome = t;
  });
  assert.equal(c.ok, false, "the S2.C8 tie-break gate is vacuous");
  assert.ok(
    c.problems.some((p) => p.kind === "s2c8_internal_order_violated"),
    JSON.stringify(kinds(c))
  );
});

test("GATE PROOF — a code outside the band, and success allocated into it, both fire", () => {
  assert.ok(
    kinds(mutate((rows) => (rows[8].raw_code = 999))).includes("code_outside_band"),
    "band-membership gate is vacuous"
  );
  assert.ok(kinds(mutate((rows) => (rows[8].raw_code = 0))).includes("success_allocated_in_band"));
  assert.ok(
    kinds(mutate((rows) => (rows[8].raw_code = 29))).includes("fail_closed_allocated_in_band")
  );
});

test("GATE PROOF — an alias that invents or re-points a code is caught", () => {
  const invents = measureRawCodeCensus({
    aliases: [{ check_id: "S2.C1", policy_outcome: "identity_unresolved", raw_code: 888 }],
  });
  assert.ok(kinds(invents).includes("alias_invents_a_code"), JSON.stringify(kinds(invents)));

  const repoints = measureRawCodeCensus({
    aliases: [{ check_id: "S2.C1", policy_outcome: "identity_claim_mismatch", raw_code: 470 }],
  });
  assert.ok(kinds(repoints).includes("alias_repoints_a_code"));

  const noise = measureRawCodeCensus({
    aliases: [
      ...VSI_PAIR_ALIASES,
      { check_id: "S2.C8", policy_outcome: "identity_unresolved", raw_code: 470 },
    ],
  });
  assert.ok(kinds(noise).includes("alias_duplicates_allocated_site"));
});

test("GATE PROOF — dropping the aliases exposes the two unmapped emission sites", () => {
  // This is the defect the aliases exist to prevent: without them, S2.C1 and S2.C9 emissions of
  // identity_unresolved are unmapped and would fail closed to an INTERNAL-error code.
  const c = measureRawCodeCensus({ aliases: [] });
  assert.equal(c.ok, false, "emission-site coverage is vacuous without aliases");
  const unmapped = c.problems
    .filter(
      (p) =>
        p.kind === "static_emission_site_unallocated" ||
        p.kind === "observed_emission_site_unallocated"
    )
    .map((p) => p.pair);
  assert.ok(unmapped.includes("S2.C1|identity_unresolved"), JSON.stringify(unmapped));
  assert.ok(unmapped.includes("S2.C9|identity_unresolved"));
});

// ---- the two independent nets both did real work ------------------------------------------------

test("the static and dynamic nets disagree in scope, and both are required", () => {
  const c = measureRawCodeCensus();
  // The static net cannot resolve a COMPUTED outcome, so it under-reports; the dynamic corpus is
  // what covers S2.C9. Asserting this keeps the static scan honest about being a supplement.
  assert.ok(c.static_emission_sites.length < c.observed_emission_sites.length);
  assert.deepEqual(c.computed_emission_checks, ["S2.C9"]);
  assert.ok(!c.static_emission_sites.some((p) => p.startsWith("S2.C9|")));
  assert.ok(c.observed_emission_sites.includes("S2.C9|identity_unresolved"));
  assert.ok(c.observed_emission_sites.includes("S2.C9|identity_ephemeral_only"));
  // Every static site is nonetheless covered — the supplement is not decorative.
  for (const p of c.static_emission_sites) assert.ok(c.covered_pairs.includes(p));
});

// ---- repo hygiene: the literals live in exactly the approved places -----------------------------

test("raw literals 464-474 occur ONLY in the allocator, the registry, goldens and approved docs", () => {
  const APPROVED = [
    "tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs",
    "tools/simurgh-attestation/stage4h/exitCodes.mjs",
    "tools/simurgh-attestation/stage5p/node/measureStage5pRawCodes.mjs",
    "tests/unit/llmShield/stage5p/rawCodeAllocator.test.js",
    "tests/unit/llmShield/stage5p/rawCodeCensus.test.js",
    // The repo-wide RUN_LEVEL_BY_RAW golden. Every stage extends it additively; it is the golden
    // the ruling explicitly permits, and the 4M lesson is that forgetting it reddens CI.
    "tests/unit/llmShield/stage4h/exitWrapper.test.js",
    // Asserts VSC_RESERVED_FROM === 464 and that the handoff to 5P's band is intact.
    "tests/unit/llmShield/stage5o/exitCodes.test.js",
    "docs/superpowers/specs/2026-07-25-stage-5p-vsi-verifiable-submitter-identity-design.md",
    // The closeout is approved documentation — the ruling permits the literals there by name.
    "docs/research/llm-shield/STAGE_5P_CLOSEOUT.md",
    // The README banner states the stage's code band publicly — that is what a banner is for.
    "README.md",
  ];
  const SKIP = new Set(["node_modules", ".git", "dist", "build", ".remember", "coverage"]);
  // The FULL allocated range, amendment band included. The first version stopped at 472 and left
  // 473-474 unpoliced the moment A5 minted them — a hygiene gate that does not grow with the band
  // silently stops covering the newest codes, which are the ones most likely to leak.
  const BAND = /\b(46[4-9]|47[0-4])\b/;
  // Correlation is PER FILE, not per line. A leak's realistic shape is a bare `const X = 467;` under
  // a `// stage5p` header several lines above — a per-line rule would walk straight past it.
  const MENTIONS_5P = /VSI_|vsi\.|stage5p|Stage 5P|identity_unresolved|resolver_binding_invalid/;
  const offenders = [];

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(mjs|js|py|lean|md|json)$/.test(name)) continue;
      const rel = relative(REPO, full).split(sep).join("/");
      // Generated goldens and captured evidence are allowed to carry the numbers verbatim.
      if (rel.includes("/evidence/") || rel.includes("/goldens/") || rel.includes("/fixtures/"))
        continue;
      if (APPROVED.includes(rel)) continue;
      const text = readFileSync(full, "utf8");
      // A file that never mentions Stage 5P is not a 5P leak — otherwise every unrelated 3-digit
      // number in a 20-stage repo becomes noise, and a noisy gate is a gate people switch off.
      if (!MENTIONS_5P.test(text)) continue;
      text.split("\n").forEach((line, i) => {
        if (BAND.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 90)}`);
      });
    }
  };
  walk(REPO);
  assert.deepEqual(
    offenders,
    [],
    `5P raw literals leaked outside the allocator:\n${offenders.join("\n")}`
  );
});
