#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A census — the sole authority for Lane A's counts and identifier inventories.
//
// DELIBERATELY SEPARATE from measureSection1Census.mjs: Section 1 is frozen and its generator stays
// scoped to the material it measures. This one derives everything from the LIVE MODULES, never from
// hard-coded expectations, and rejects the drift classes that let a wrong artifact look right.
//
// Byte-stable: no clock, no randomness, no network, no filesystem read beyond module imports.
import { AXES, AXIS_VALUES, RELATIONS } from "../core/identityLattice.mjs";
import { PRINCIPAL_KINDS, PRINCIPAL_TYPE } from "../core/canonicalPrincipal.mjs";
import { CLAIM_TYPES, RESOLVER_PROFILE_TYPE } from "../core/resolverProfile.mjs";
import { RESOLVER_EVIDENCE_TYPE, CLAIM_ALTERNATIVES } from "../core/resolverEvidence.mjs";
import {
  DELEGATION_EDGE_TYPE,
  LOGICAL_VALIDITY_TYPE,
  DELEGATION_EDGE_DOMAIN,
} from "../core/delegationEdge.mjs";
import { IDENTITY_BANK_TYPE } from "../core/identityBank.mjs";
import { SECTION2_CHECK_IDS, POLICY_OUTCOMES, verifySection2 } from "../core/section2Verifier.mjs";
import { validateDischargeLedger } from "../core/dischargeGate.mjs";
import { buildDischargeLedger, DECLARED_DISCHARGES } from "./typedOutcomeDischarge.mjs";
import {
  S2_FIXTURES,
  COVERAGE_FIXTURES,
  cleanAncestor,
  PINNED,
  REGISTRY,
} from "./laneAFixtures.mjs";

const dupes = (list) => {
  const seen = new Set();
  return [...new Set(list.filter((x) => (seen.has(x) ? true : (seen.add(x), false))))];
};

// A contiguity check over identifiers of the form <prefix><n>. A gap means a check or fixture was
// dropped without anyone noticing the hole.
function contiguity(ids, re) {
  const nums = ids
    .map((id) => id.match(re))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  const expected = Array.from({ length: nums.length }, (_, i) => i + 1);
  return { ok: JSON.stringify(nums) === JSON.stringify(expected), observed: nums };
}

/**
 * @param options.phase    "draft" (default) — is the ledger COMPLETE and well-formed?
 *                         "release"         — is the stage READY? `pending` becomes fatal.
 * @param options.declared non-witnessed discharges; see typedOutcomeDischarge.mjs.
 *
 * The default is deliberately the WEAKER phase: a caller who forgets to say which question they are
 * asking must not be silently told the stage is release-ready.
 */
export function measureLaneACensus(options = {}) {
  const phase = options.phase ?? "draft";
  const declared = options.declared ?? DECLARED_DISCHARGES;
  const problems = [];

  const checkIds = [...SECTION2_CHECK_IDS];
  const outcomes = [...POLICY_OUTCOMES];
  const fixtures = S2_FIXTURES.map((f) => ({
    fixture_id: f.fixture_id,
    expected_check_id: f.expected_check_id,
    expected_policy_outcome: f.expected_policy_outcome,
  }));

  // --- duplicate identifiers ------------------------------------------------------------------
  for (const [name, list] of Object.entries({
    check_ids: checkIds,
    typed_outcomes: outcomes,
    principal_kinds: [...PRINCIPAL_KINDS],
    strength_axes: [...AXES],
    fixture_ids: fixtures.map((f) => f.fixture_id),
  })) {
    const d = dupes(list);
    if (d.length) problems.push({ kind: "duplicate_identifier", where: name, values: d });
  }

  // --- non-contiguous S2.C* and S2.* ----------------------------------------------------------
  const checkContig = contiguity(checkIds, /^S2\.C(\d+)$/);
  if (!checkContig.ok)
    problems.push({ kind: "non_contiguous_check_ids", observed: checkContig.observed });
  const fixtureContig = contiguity(
    fixtures.map((f) => f.fixture_id),
    /^S2\.(\d+)$/
  );
  if (!fixtureContig.ok)
    problems.push({ kind: "non_contiguous_fixture_ids", observed: fixtureContig.observed });

  // --- check ORDER, not merely membership -----------------------------------------------------
  // Found by fault injection: contiguity alone did NOT catch S2.C5 and S2.C6 being swapped in the
  // frozen array. The order is normative, so ascending order is asserted independently.
  const checkNums = checkIds.map((id) => Number(id.match(/^S2\.C(\d+)$/)?.[1] ?? NaN));
  const ascending = checkNums.every((n, i) => i === 0 || n > checkNums[i - 1]);
  if (!ascending) problems.push({ kind: "check_ids_out_of_order", observed: checkIds });

  // --- fixture/check mismatch: every expected check must exist, every outcome must be typed ----
  for (const f of fixtures) {
    if (!checkIds.includes(f.expected_check_id)) {
      problems.push({
        kind: "missing_check_id",
        fixture: f.fixture_id,
        value: f.expected_check_id,
      });
    }
    if (!outcomes.includes(f.expected_policy_outcome)) {
      problems.push({
        kind: "untyped_outcome",
        fixture: f.fixture_id,
        value: f.expected_policy_outcome,
      });
    }
  }

  // --- executed behaviour: the ancestor accepts and each fixture first-fails where it claims ---
  const ancestor = verifySection2(cleanAncestor(), PINNED);
  if (!ancestor.ok) problems.push({ kind: "ancestor_rejected", detail: ancestor });
  const first_failure_rows = S2_FIXTURES.map((f) => {
    const r = verifySection2(f.build(), PINNED);
    const row = {
      fixture_id: f.fixture_id,
      observed_check_id: r.ok ? null : r.check_id,
      observed_policy_outcome: r.ok ? null : r.outcome,
    };
    if (r.ok || r.check_id !== f.expected_check_id || r.outcome !== f.expected_policy_outcome) {
      problems.push({
        kind: "fixture_check_mismatch",
        fixture: f.fixture_id,
        expected: f,
        observed: row,
      });
    }
    return row;
  });

  // --- outcome reachability: a typed outcome no fixture reaches is honest, but it is RECORDED --
  const coverage_rows = COVERAGE_FIXTURES.map((f) => {
    const r = verifySection2(f.build(), PINNED);
    if (r.ok || r.check_id !== f.expected_check_id || r.outcome !== f.expected_policy_outcome) {
      problems.push({ kind: "coverage_fixture_mismatch", fixture: f.fixture_id });
    }
    return {
      fixture_id: f.fixture_id,
      observed_check_id: r.ok ? null : r.check_id,
      observed_policy_outcome: r.ok ? null : r.outcome,
    };
  });
  const reached = new Set(
    [...first_failure_rows, ...coverage_rows].map((r) => r.observed_policy_outcome).filter(Boolean)
  );
  const unreached = outcomes.filter((o) => !reached.has(o));

  // --- §2.12 discharge gate ---------------------------------------------------------------------
  // The ledger is generated from executed fixtures; the gate then asks the phase's question of it.
  // Its problems are the census's problems: a stage cannot be clean while an outcome is undischarged.
  const discharge_ledger = buildDischargeLedger(phase, declared);
  const discharge = validateDischargeLedger(discharge_ledger, { phase, typedOutcomes: outcomes });
  problems.push(...discharge.problems);

  return {
    census_id: "simurgh.vsi.lane_a_census.v1",
    phase,
    schema_types: {
      principal: PRINCIPAL_TYPE,
      resolver_profile: RESOLVER_PROFILE_TYPE,
      resolver_evidence: RESOLVER_EVIDENCE_TYPE,
      delegation_edge: DELEGATION_EDGE_TYPE,
      delegation_edge_digest_domain: DELEGATION_EDGE_DOMAIN,
      logical_validity: LOGICAL_VALIDITY_TYPE,
      identity_bank: IDENTITY_BANK_TYPE,
    },
    principal_kinds: [...PRINCIPAL_KINDS],
    strength_axes: [...AXES],
    axis_values: Object.fromEntries(AXES.map((a) => [a, [...AXIS_VALUES[a]]])),
    strength_relations: [...RELATIONS],
    claim_types: [...CLAIM_TYPES],
    claim_alternatives: [...CLAIM_ALTERNATIVES],
    resolver_profiles: [...REGISTRY.keys()].sort(),
    check_ids: checkIds,
    typed_outcomes: outcomes,
    fixtures,
    first_failure_rows,
    coverage_rows,
    counts: {
      principal_kinds: PRINCIPAL_KINDS.length,
      strength_axes: AXES.length,
      resolver_profiles: REGISTRY.size,
      check_ids: checkIds.length,
      typed_outcomes: outcomes.length,
      fixtures: fixtures.length,
    },
    // Honest, not hidden: outcomes no Lane A fixture reaches. The set is PUBLISHED rather than
    // quietly implied empty — and §2.12's gate is what turns a non-empty set into a release blocker.
    unreached_typed_outcomes: unreached,
    discharge_ledger,
    discharge: {
      phase: discharge.phase,
      counts: discharge.counts,
      pending: discharge.pending,
      ok: discharge.ok,
    },
    // The digest domain must NEVER equal the schema type literal (single-hat).
    check_ids_ascending: ascending,
    single_hat_ok: DELEGATION_EDGE_DOMAIN !== DELEGATION_EDGE_TYPE,
    problems,
    ok: problems.length === 0 && DELEGATION_EDGE_DOMAIN !== DELEGATION_EDGE_TYPE,
  };
}

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  // `--phase=draft` (default) asks whether the ledger is complete; `--phase=release` asks whether
  // the stage may ship. An unrecognised phase is a census problem, never a silent downgrade.
  const flag = process.argv.slice(2).find((a) => a.startsWith("--phase="));
  const phase = flag ? flag.slice("--phase=".length) : "draft";
  const out = measureLaneACensus({ phase });
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  if (!out.ok) {
    process.stderr.write(`\nLANE A CENSUS (--phase=${phase}): PROBLEMS FOUND\n`);
    process.exit(1);
  }
  process.stderr.write(`\nLANE A CENSUS (--phase=${phase}): clean.\n`);
}
