// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 14: the parity manifest, written BEFORE the mirrors.
//
// §14 requires Node == Python == browser on the deterministic surface. "Deterministic surface" without
// a manifest permits selective mirroring: implement the easy half in Python, run a parity check that
// only exercises the half that exists, and report parity. The manifest names what must agree, and K7
// fails when an eligible export is missing from it, when an entry has no implementation in some
// runtime, or when a deterministic export is silently excluded.
//
// EVERY ENTRY CARRIES ITS OWN VECTORS. A manifest that lists function names and no inputs is a list
// of promises; a manifest that carries input/output pairs is a test another language can run without
// reading this one's source.

import { tenths } from "./measurements.mjs";
import { spanDigest } from "./controls.mjs";
import { verdictReceiptDigest, permute } from "./laneB.mjs";
import { filePin } from "./inherit.mjs";

/**
 * The deterministic surface: pure functions of their inputs, with no clock, no filesystem, no
 * network and no randomness. Anything that touches those is out of scope BY NAME below, rather than
 * quietly absent.
 */
export const PARITY_ENTRIES = Object.freeze([
  {
    id: "measurements.tenths",
    description: "integer round-half-up percentage, in tenths of a percent",
    fn: (v) => tenths(v.numerator, v.denominator),
    vectors: [
      { input: { numerator: 1438, denominator: 23332 }, expected: 62 },
      { input: { numerator: 2118, denominator: 20213 }, expected: 105 },
      { input: { numerator: 1, denominator: 2 }, expected: 500 },
      { input: { numerator: 1, denominator: 3 }, expected: 333 },
      { input: { numerator: 2, denominator: 3 }, expected: 667 },
      { input: { numerator: 0, denominator: 23332 }, expected: 0 },
    ],
  },
  {
    id: "controls.spanDigest",
    description: "domain-separated digest of a control's source span",
    fn: (v) => spanDigest(v.source),
    vectors: [
      { input: { source: "" } },
      { input: { source: "function v(){}" } },
      // Multi-byte, because span geometry is where byte-offset bugs die in daylight.
      { input: { source: "функция ①②③ 🐦‍🔥" } },
    ],
  },
  {
    id: "inherit.filePin",
    description: "5R's pin over an inherited file's canonical bytes",
    fn: (v) => filePin(v.text),
    vectors: [
      { input: { text: "a" } },
      { input: { text: "a\n" } },
      // CRLF must normalise to the same pin as LF, in every runtime.
      { input: { text: "a\r\nb" } },
      { input: { text: "a\nb" } },
    ],
  },
  {
    id: "laneB.verdictReceiptDigest",
    description: "the digest the child stamps its verdict with",
    fn: (v) => verdictReceiptDigest(v),
    vectors: [
      {
        input: {
          control_digest: "aa",
          detector_digest: "bb",
          declared_signal: "field-set differs",
          verdict: "detected",
          signal_evidence_digest: "cc",
        },
      },
      {
        input: {
          control_digest: "aa",
          detector_digest: "bb",
          declared_signal: "field-set differs",
          verdict: "not_detected",
          signal_evidence_digest: "cc",
        },
      },
    ],
  },
  {
    id: "laneB.permute",
    description: "seeded control ordering, so sequence cannot leak the label",
    fn: (v) => permute(v.items, v.seed).join(","),
    vectors: [
      { input: { items: ["c-01", "c-02", "c-03"], seed: "seed-alpha" } },
      { input: { items: ["c-01", "c-02", "c-03"], seed: "seed-beta" } },
    ],
  },
]);

/**
 * Surfaces deliberately OUT of the parity contract, each with its reason. Named rather than absent,
 * because an unexplained gap and a decision look identical in a manifest.
 */
export const OUT_OF_SCOPE = Object.freeze([
  {
    id: "writeSurface.checkChangeSet",
    reason: "reads git history; not a pure function of its inputs",
  },
  { id: "scratchTree.snapshotTree", reason: "reads the filesystem" },
  {
    id: "inherit.verifyInheritance",
    reason: "Ed25519 verification; crypto parity is a separate contract",
  },
  { id: "detectorChild", reason: "spawns a process; Lane B is a Node-side ceremony" },
]);

/**
 * Build the manifest, computing each vector's expected value from the Node implementation.
 *
 * @returns {object}
 */
export function buildManifest() {
  const entries = PARITY_ENTRIES.map((e) => ({
    id: e.id,
    description: e.description,
    vectors: e.vectors.map((v) => ({
      input: v.input,
      expected: v.expected ?? e.fn(v.input),
    })),
  }));
  return {
    schema: "simurgh.vpf.parity-manifest.v1",
    note:
      "Every function and vector that must agree across Node, Python and browser. K7 fails when an " +
      "eligible export is missing here, when an entry has no implementation in some runtime, or " +
      "when a deterministic export is silently excluded.",
    entry_count: entries.length,
    vector_count: entries.reduce((a, e) => a + e.vectors.length, 0),
    entries,
    out_of_scope: OUT_OF_SCOPE,
  };
}

/**
 * Check a runtime's answers against the manifest.
 *
 * @param {{manifest: object, answers: Record<string, unknown[]>}} input
 * @returns {{ok: boolean, mismatches: Array<object>, missing: string[]}}
 */
export function checkRuntime({ manifest, answers }) {
  const mismatches = [];
  const missing = [];
  for (const entry of manifest.entries) {
    const got = answers[entry.id];
    if (!Array.isArray(got)) {
      missing.push(entry.id);
      continue;
    }
    if (got.length !== entry.vectors.length) {
      mismatches.push({
        id: entry.id,
        reason: `expected ${entry.vectors.length} answers, got ${got.length}`,
      });
      continue;
    }
    entry.vectors.forEach((v, i) => {
      if (got[i] !== v.expected) {
        mismatches.push({ id: entry.id, vector: i, expected: v.expected, got: got[i] });
      }
    });
  }
  return { ok: mismatches.length === 0 && missing.length === 0, mismatches, missing };
}
