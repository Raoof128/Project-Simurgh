// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the runtime-visible census (spec §2.6).
//
// THE INTERFACE SPLIT (gauntlet P0-11/M3). An earlier draft took an injected `importer` AND
// mandated child-process isolation. Those cannot both hold: a function cannot cross a process
// boundary. So the pure core takes already-imported namespaces and is unit-testable in-process; the
// driver in node/ owns the spawning and the crash isolation.
//
// WHY A RUNTIME CENSUS AT ALL. The static census sees declarations; it cannot see re-exports
// resolved at load, conditional definitions, or anything a module attaches at import time. The
// projection rule (§2.6) compares the two over the domain where the comparison is meaningful.
//
// IMPORT FAILURES ARE DATA. A module that will not import has no runtime surface, so it cannot be
// projected — but discovering that is a census fact, not an accident. `--mode=collect` records it;
// `--mode=verify` refuses it, because an unresolved failure is not an acceptable input to a closure
// commitment (gauntlet P1-10).

import { makeFunctionId } from "./functionId.mjs";
import { stageFor } from "./censusStatic.mjs";

/**
 * ECMAScript export names are STRINGS. The module namespace object also carries
 * `Symbol.toStringTag`, which is metadata rather than a project export (gauntlet P1-8). Excluded
 * explicitly, and a test asserts no project export is lost by the exclusion.
 */
const NAMESPACE_METADATA_SYMBOLS = new Set(["Symbol(Symbol.toStringTag)"]);

/** Classify what a namespace binding actually is at runtime. */
export function kindOf(value) {
  if (typeof value === "function") return "function";
  return "constant";
}

/**
 * Build the runtime census from already-imported namespaces.
 *
 * @param {{ namespaces: Array<{ modulePath: string, namespace: object }> }} input
 */
export function runtimeCensusFromNamespaces({ namespaces }) {
  const members = [];
  for (const { modulePath, namespace } of namespaces) {
    const stageId = stageFor(modulePath);
    // Own enumerable string keys only. Symbols are namespace metadata, never exports.
    for (const key of Object.keys(namespace)) {
      if (NAMESPACE_METADATA_SYMBOLS.has(key)) continue;
      members.push({
        function_id: makeFunctionId({ stageId, modulePath, symbol: key }),
        module_path: modulePath,
        symbol: key,
        kind: kindOf(namespace[key]),
      });
    }
  }
  return { members, failures: [] };
}

/**
 * Merge per-batch results from the spawning driver.
 *
 * A child that DIES mid-batch yields failure entries for the WHOLE batch, never a silently short
 * member list. That distinction is the difference between "these modules have no exports" and "we
 * never found out" — and conflating them is R7, census truncation, committed by our own tooling.
 */
export function mergeBatchResults(batches) {
  const members = [];
  const failures = [];
  for (const batch of batches) {
    if (batch.crashed) {
      for (const modulePath of batch.modulePaths) {
        failures.push({
          module_path: modulePath,
          error_class: batch.error_class ?? "batch_crashed",
          message: batch.message ?? "the child process died before reporting",
          batch_index: batch.index,
        });
      }
      continue;
    }
    members.push(...(batch.members ?? []));
    failures.push(...(batch.failures ?? []));
  }
  return { members, failures };
}

/**
 * Canonicalise an error for a byte-stable artifact (gauntlet P2-5).
 *
 * No stack traces, no absolute paths, no PIDs, no timings — all of which vary per machine and per
 * run and would make a "byte-stable" census artifact anything but.
 */
export function canonicalError(error, repoRoot) {
  const raw = String(error?.message ?? error ?? "unknown");
  const withoutPaths = repoRoot ? raw.split(repoRoot).join("<repo>") : raw;
  const message = withoutPaths
    .replace(/\/[^\s'"]*\/node_modules\//g, "<node_modules>/")
    .replace(/:\d+:\d+/g, ":<line>:<col>")
    .replace(/\b\d{3,}\b/g, "<n>")
    .slice(0, 300);
  return { error_class: error?.code ?? error?.name ?? "Error", message };
}

/**
 * The verify-mode decision (gauntlet P1-10).
 *
 * Q0 admits no exceptions (Task 6), so an unresolved import failure is either fixed or becomes a
 * finding. It is never waved through into a closure commitment.
 */
export function verifyRuntimeCensus({ failures }) {
  return {
    ok: failures.length === 0,
    blockers: failures.map((f) => ({
      module_path: f.module_path,
      reason:
        "module could not be imported, so it has no runtime surface and cannot be projected " +
        "(§2.6). This is a precommit_blocker: fix it or record it as a finding — Q0 has no " +
        "exception mechanism.",
    })),
  };
}
