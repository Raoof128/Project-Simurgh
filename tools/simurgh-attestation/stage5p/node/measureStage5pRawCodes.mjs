#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Annex R — the raw-code allocator census.
//
// The sole authority for whether the 464-472 band is well-formed, complete, and consistent with what
// the frozen verifier ACTUALLY emits. Everything is derived from the live modules and from executed
// runs; nothing is hand-carried.
//
// The gate that earned its place: EMISSION-SITE COVERAGE. A nine-row table maps nine outcomes to
// nine codes, but the verifier emits (check, outcome) PAIRS, and `identity_unresolved` is emitted at
// three different checks. A table that covers every outcome can therefore still leave real
// rejections unmapped. This census enumerates the emission sites two independent ways — statically
// from the verifier source, and dynamically by running a corpus — and fails if either finds a site
// the allocator does not cover.
//
// Byte-stable: no clock, no randomness, no network. One source file is read, by absolute path
// derived from import.meta.url.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import {
  VSI_ALLOCATION,
  VSI_PAIR_ALIASES,
  VSI_BAND_LO,
  VSI_BAND_HI,
  VSI_ALLOCATED_HI,
  VSI_OK_RAW,
  VSI_FAIL_CLOSED_RAW,
  rawCodeFor,
} from "../core/rawCodeAllocator.mjs";
import { SECTION2_CHECK_IDS, POLICY_OUTCOMES, verifySection2 } from "../core/section2Verifier.mjs";
import { S2_FIXTURES, COVERAGE_FIXTURES, cleanAncestor, PINNED } from "./laneAFixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VERIFIER_SOURCE = resolve(HERE, "../core/section2Verifier.mjs");

const pairKey = (check, outcome) => `${check}|${outcome}`;

// The closed band is nine rows. Stated once, module-scope, so the census never has to ask the
// allocator how big the segment it is policing is supposed to be.
const CLOSED_BAND_FROZEN_LEN = 9;

/**
 * EMISSION-SITE PROBES — deliberately NOT fixtures.
 *
 * They witness no attack and discharge no typed outcome; the S2.* matrix and the coverage set do
 * that. Their only job is to drive the verifier to emission sites the fixture corpus never visits,
 * so the census can prove the allocator covers every site rather than every outcome.
 */
const clone = (b) => JSON.parse(JSON.stringify(b));
export const EMISSION_SITE_PROBES = Object.freeze([
  {
    probe_id: "R.P1",
    reaches: "S2.C1 — no evidence presented",
    build() {
      const b = clone(cleanAncestor());
      b.evidences = [];
      return b;
    },
  },
  {
    probe_id: "R.P2",
    reaches: "S2.C1 — the canonical grammar rejects the bundle",
    build() {
      const b = clone(cleanAncestor());
      b.subject.kind = "deity";
      return b;
    },
  },
  {
    probe_id: "R.P3",
    reaches: "S2.C9 — required exceeds actual and the banked identity is NOT ephemeral",
    build() {
      const b = clone(cleanAncestor());
      // Bank a DURABLE identity (inside the registry profile's ceiling), then demand a binding it
      // does not have. Comparable, so S2.C8 passes; the C9 ternary then takes its non-ephemeral arm.
      b.evidences[0].asserted_strength_delta.continuity = "durable";
      b.required = {
        binding: "cryptographically_bound",
        resolution: "provider_asserted",
        continuity: "durable",
        role: "unproven",
      };
      return b;
    },
  },
]);

/** Static net: literal `reject("S2.Cx", "outcome"` sites, plus a count of COMPUTED-outcome sites. */
function scanEmissionSites(source) {
  const literal = [];
  const computed = [];
  const re = /reject\(\s*"(S2\.C\d+)"\s*,\s*("([a-z_]+)"|[A-Za-z_$][\w$]*)/g;
  for (const m of source.matchAll(re)) {
    if (m[3] !== undefined) literal.push({ check_id: m[1], policy_outcome: m[3] });
    else computed.push({ check_id: m[1], expression: m[2] });
  }
  return { literal, computed };
}

/**
 * @param options.allocation the allocation table to measure; defaults to the real one.
 * @param options.aliases    the declared alias set; defaults to the real one.
 *
 * Injection exists so the gate proofs run mutated tables through THIS code rather than through a
 * re-implementation of its predicates. A gate proved only against a copy of itself is not proved.
 */
export function measureRawCodeCensus(options = {}) {
  const problems = [];
  const table = options.allocation ?? VSI_ALLOCATION;
  const aliases = options.aliases ?? VSI_PAIR_ALIASES;
  const allocation = table.map((r) => ({ ...r }));
  const codes = allocation.map((r) => r.raw_code);
  const outcomes = allocation.map((r) => r.policy_outcome);

  // --- completeness: every frozen outcome allocated exactly once ------------------------------
  for (const o of POLICY_OUTCOMES) {
    const n = outcomes.filter((x) => x === o).length;
    if (n !== 1)
      problems.push({ kind: "outcome_not_allocated_exactly_once", outcome: o, count: n });
  }
  for (const o of outcomes) {
    if (!POLICY_OUTCOMES.includes(o))
      problems.push({ kind: "unknown_outcome_allocated", outcome: o });
  }

  // --- uniqueness, contiguity, band membership --------------------------------------------------
  if (new Set(codes).size !== codes.length) {
    problems.push({ kind: "duplicate_raw_code", observed: codes });
  }
  // Contiguity spans BOTH segments — the amendment appends, so there is still no gap anywhere.
  const expectedBand = Array.from({ length: codes.length }, (_, i) => VSI_BAND_LO + i);
  if (JSON.stringify(codes) !== JSON.stringify(expectedBand)) {
    problems.push({
      kind: "band_not_contiguous_in_order",
      expected: expectedBand,
      observed: codes,
    });
  }
  for (const c of codes) {
    if (c < VSI_BAND_LO || c > VSI_ALLOCATED_HI) {
      problems.push({ kind: "code_outside_band", code: c });
    }
  }
  // A5: the closed band must be EXACTLY what it was. An amendment appends; it never renumbers,
  // re-points or reorders an already-allocated row. This is the executable form of "existing codes
  // never move", and it is transcribed from Annex R.1 rather than read off the module.
  const CLOSED_BAND_FROZEN = [
    ["S2.C2", "resolver_binding_invalid", 464],
    ["S2.C3", "identity_provider_untrusted", 465],
    ["S2.C4", "identity_replay_upgrade_attempted", 466],
    ["S2.C5", "identity_principal_mismatch", 467],
    ["S2.C6", "identity_claim_mismatch", 468],
    ["S2.C7", "accountable_role_unproven", 469],
    ["S2.C8", "identity_unresolved", 470],
    ["S2.C8", "identity_strength_incomparable", 471],
    ["S2.C9", "identity_ephemeral_only", 472],
  ];
  // Read POSITIONALLY off the table under measurement, not off the module: a gate that consults the
  // real export can never be falsified by an injected table, which would make it decorative.
  const observedClosed = allocation
    .slice(0, CLOSED_BAND_FROZEN_LEN)
    .map((r) => [r.check_id, r.policy_outcome, r.raw_code]);
  if (JSON.stringify(observedClosed) !== JSON.stringify(CLOSED_BAND_FROZEN)) {
    problems.push({ kind: "closed_band_disturbed_by_amendment", observed: observedClosed });
  }
  for (const r of allocation.slice(CLOSED_BAND_FROZEN_LEN)) {
    if (r.raw_code <= VSI_BAND_HI) {
      problems.push({ kind: "amendment_intrudes_on_closed_band", row: r });
    }
    // Every amendment row names the amendment that minted it. An unattributed code is a code
    // nobody can trace back to a ruling.
    if (typeof r.minted_by !== "string" || r.minted_by.length === 0) {
      problems.push({ kind: "amendment_row_without_provenance", row: r });
    }
  }
  if (codes.includes(VSI_OK_RAW)) problems.push({ kind: "success_allocated_in_band" });
  if (codes.includes(VSI_FAIL_CLOSED_RAW)) problems.push({ kind: "fail_closed_allocated_in_band" });

  // --- ordering follows the frozen check order ---------------------------------------------------
  // Ordering is asserted WITHIN a segment. The closed band follows the frozen check order; the
  // amendment band follows MINT order and asserting check order over it would be asserting something
  // false — 473 sits at S2.C3, above 472's S2.C9, entirely correctly.
  const closedIdx = allocation
    .filter((r) => r.raw_code <= VSI_BAND_HI)
    .map((r) => SECTION2_CHECK_IDS.indexOf(r.check_id));
  if (allocation.some((r) => SECTION2_CHECK_IDS.indexOf(r.check_id) < 0)) {
    problems.push({
      kind: "allocated_check_not_in_frozen_order",
      observed: allocation.map((r) => r.check_id),
    });
  } else if (closedIdx.some((n, i) => i > 0 && n < closedIdx[i - 1])) {
    problems.push({ kind: "allocation_order_contradicts_check_order", observed: closedIdx });
  }

  // --- the S2.C8 internal tie-break is normative --------------------------------------------------
  const c8 = allocation
    .filter((r) => r.check_id === "S2.C8" && r.raw_code <= VSI_BAND_HI)
    .map((r) => r.policy_outcome);
  const C8_FROZEN_ORDER = ["identity_unresolved", "identity_strength_incomparable"];
  if (JSON.stringify(c8) !== JSON.stringify(C8_FROZEN_ORDER)) {
    problems.push({
      kind: "s2c8_internal_order_violated",
      expected: C8_FROZEN_ORDER,
      observed: c8,
    });
  }

  // --- aliases mint nothing and never re-point a code --------------------------------------------
  for (const a of aliases) {
    const owner = allocation.find((r) => r.raw_code === a.raw_code);
    if (!owner) problems.push({ kind: "alias_invents_a_code", alias: a });
    else if (owner.policy_outcome !== a.policy_outcome) {
      problems.push({ kind: "alias_repoints_a_code", alias: a, owner });
    } else if (owner.check_id === a.check_id) {
      problems.push({ kind: "alias_duplicates_allocated_site", alias: a });
    }
  }

  // --- executed agreement: fixtures, then probes -------------------------------------------------
  const ancestor = verifySection2(cleanAncestor(), PINNED);
  if (!ancestor.ok) problems.push({ kind: "ancestor_rejected", detail: ancestor });
  if (rawCodeFor(ancestor) !== VSI_OK_RAW) problems.push({ kind: "success_not_raw_zero" });

  const covered = new Set([...table, ...aliases].map((r) => pairKey(r.check_id, r.policy_outcome)));
  const observedPairs = new Set();

  const fixture_rows = [...S2_FIXTURES, ...COVERAGE_FIXTURES].map((f) => {
    const r = verifySection2(f.build(), PINNED);
    const key = r.ok ? null : pairKey(r.check_id, r.outcome);
    if (key) observedPairs.add(key);
    const raw = rawCodeFor(r);
    if (r.ok) problems.push({ kind: "fixture_accepted", fixture: f.fixture_id });
    else if (!covered.has(key))
      problems.push({ kind: "fixture_pair_unallocated", fixture: f.fixture_id, pair: key });
    else if (raw === VSI_FAIL_CLOSED_RAW) {
      problems.push({ kind: "fixture_failed_closed", fixture: f.fixture_id, pair: key });
    }
    return {
      fixture_id: f.fixture_id,
      check_id: r.ok ? null : r.check_id,
      policy_outcome: r.ok ? null : r.outcome,
      raw_code: raw,
    };
  });

  const probe_rows = EMISSION_SITE_PROBES.map((p) => {
    const r = verifySection2(p.build(), PINNED);
    const key = r.ok ? null : pairKey(r.check_id, r.outcome);
    if (key) observedPairs.add(key);
    if (r.ok) problems.push({ kind: "probe_accepted", probe: p.probe_id, reaches: p.reaches });
    else if (!covered.has(key))
      problems.push({ kind: "probe_pair_unallocated", probe: p.probe_id, pair: key });
    return {
      probe_id: p.probe_id,
      reaches: p.reaches,
      check_id: r.ok ? null : r.check_id,
      policy_outcome: r.ok ? null : r.outcome,
      raw_code: rawCodeFor(r),
    };
  });

  // --- emission-site coverage, both nets ----------------------------------------------------------
  const scan = scanEmissionSites(readFileSync(VERIFIER_SOURCE, "utf8"));
  const static_sites = [
    ...new Set(scan.literal.map((s) => pairKey(s.check_id, s.policy_outcome))),
  ].sort();
  for (const key of static_sites) {
    if (!covered.has(key)) problems.push({ kind: "static_emission_site_unallocated", pair: key });
  }
  // A computed outcome cannot be resolved by reading the source, so each computed site must be
  // covered DYNAMICALLY — the static net is a supplement, never the proof.
  const computed_checks = [...new Set(scan.computed.map((s) => s.check_id))].sort();
  for (const check of computed_checks) {
    const dynamic = [...observedPairs].filter((k) => k.startsWith(`${check}|`));
    if (dynamic.length === 0) {
      problems.push({ kind: "computed_emission_site_never_executed", check_id: check });
    }
  }
  const observed_sites = [...observedPairs].sort();
  for (const key of observed_sites) {
    if (!covered.has(key)) problems.push({ kind: "observed_emission_site_unallocated", pair: key });
  }

  return {
    census_id: "simurgh.vsi.raw_code_census.v1",
    band: {
      lo: VSI_BAND_LO,
      closed_band_hi: VSI_BAND_HI,
      amendment_from: VSI_BAND_HI + 1,
      allocated_hi: VSI_ALLOCATED_HI,
      reserved_from: VSI_ALLOCATED_HI + 1,
    },
    ok_raw: VSI_OK_RAW,
    fail_closed_raw: VSI_FAIL_CLOSED_RAW,
    allocation,
    aliases: aliases.map((r) => ({ ...r })),
    covered_pairs: [...covered].sort(),
    static_emission_sites: static_sites,
    computed_emission_checks: computed_checks,
    observed_emission_sites: observed_sites,
    fixture_rows,
    probe_rows,
    counts: {
      allocated: allocation.length,
      closed_band: CLOSED_BAND_FROZEN_LEN,
      amendment_band: allocation.length - CLOSED_BAND_FROZEN_LEN,
      aliases: aliases.length,
      covered_pairs: covered.size,
      static_emission_sites: static_sites.length,
      observed_emission_sites: observed_sites.length,
      probes: EMISSION_SITE_PROBES.length,
    },
    problems,
    ok: problems.length === 0,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const out = measureRawCodeCensus();
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  if (!out.ok) {
    process.stderr.write("\nRAW CODE CENSUS: PROBLEMS FOUND\n");
    process.exit(1);
  }
  process.stderr.write("\nRAW CODE CENSUS: clean.\n");
}
