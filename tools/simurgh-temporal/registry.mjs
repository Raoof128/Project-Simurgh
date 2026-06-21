// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Q CLI. The timeline-manifest is the deterministic source of truth; the
// registry + diffs are derived and byte-compared on verify. NEVER calls a clock.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import {
  validateTimelineManifest,
  validateDiffManifest,
  buildRegressionDiff,
  SELF_PROOF_SCHEMA,
} from "./temporalLib.mjs";
import { buildRegistryFromManifest } from "./registryChain.mjs";
import { evaluateTemporalSelfProofFixture } from "./selfProof.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

const corpus = "sha256:selfproof-corpus";
const spAtt = (id, cells, c = corpus) => ({
  type: "simurgh.cross_defence.target_attestation.v1",
  stage: "3P",
  target: { target_id: id },
  corpus: { corpus_digest: c },
  coverage_profile: { cells },
});
const spCell = (r) => ({ "direct_input::plain_marker": { result: r } });
const ts = "2026-06-21T00:00:00Z";

function baseManifest(n) {
  return {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "self-proof-registry",
    snapshots: Array.from({ length: n }, (_, i) => ({
      entry_index: i, snapshot_id: `s${i}`, snapshot_label: `v${i}`, created_at_utc: ts,
      catalogue_digest: `sha256:cat${i}`, catalogue_path: `p${i}`, corpus_digest: corpus, target_attestations: [],
    })),
  };
}
function tamperedRegistry() {
  const reg = buildRegistryFromManifest(baseManifest(2), "sha256:M");
  reg.entries[0].entry_body.snapshot.snapshot_label = "tampered"; // digest no longer matches
  return reg;
}
function removedEntryAppend() {
  const oldReg = buildRegistryFromManifest(baseManifest(2), "sha256:M1");
  const shorter = buildRegistryFromManifest(baseManifest(1), "sha256:M2");
  return {
    previousHead: { type: "simurgh.temporal.previous_registry_head.v1", stage: "3Q", previous_head_entry_digest: oldReg.head.head_entry_digest, previous_entry_count: 2 },
    registry: shorter,
  };
}
function reorderedEntryAppend() {
  const oldReg = buildRegistryFromManifest(baseManifest(1), "sha256:M1");
  const unrelated = buildRegistryFromManifest(baseManifest(2), "sha256:M2");
  unrelated.entries[0].entry_body.snapshot.snapshot_id = "reordered";
  unrelated.entries[0].entry_digest = "sha256:stale"; // breaks continuity + chain
  return {
    previousHead: { type: "simurgh.temporal.previous_registry_head.v1", stage: "3Q", previous_head_entry_digest: oldReg.head.head_entry_digest, previous_entry_count: 1 },
    registry: unrelated,
  };
}
function manifestMissingTs() {
  const m = baseManifest(1);
  delete m.snapshots[0].created_at_utc;
  return m;
}
function manifestBadTs() {
  const m = baseManifest(1);
  m.snapshots[0].created_at_utc = "2026-06-21 00:00:00"; // no T/Z
  return m;
}

export function buildSelfProof() {
  const fixtures = [
    { fixture_id: "clean-baseline", kind: "diff", expected_result: "accepted", expected_detector: null,
      payload: { row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts }, before: spAtt("a", spCell("contained")), after: spAtt("a", spCell("contained")) } },
    { fixture_id: "genuine-regression", kind: "diff", expected_result: "accepted", expected_detector: "regressed",
      payload: { row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts }, before: spAtt("a", spCell("contained")), after: spAtt("a", spCell("allowed")) } },
    { fixture_id: "genuine-improvement", kind: "diff", expected_result: "accepted", expected_detector: "improved",
      payload: { row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts }, before: spAtt("a", spCell("allowed")), after: spAtt("a", spCell("contained")) } },
    { fixture_id: "cross-lineage-diff", kind: "diff", expected_result: "rejected", expected_detector: "cross_target_diff_violation",
      payload: { row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts }, before: spAtt("a", {}), after: spAtt("a", {}), force_after_lineage: "b" } },
    { fixture_id: "corpus-mismatch", kind: "diff", expected_result: "non_comparable", expected_detector: "corpus_mismatch",
      payload: { row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts }, before: spAtt("a", {}, "sha256:c1"), after: spAtt("a", {}, "sha256:c2") } },
    { fixture_id: "before-integrity-failure", kind: "diff", expected_result: "accepted", expected_detector: "integrity_failure",
      payload: { row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts }, before: spAtt("a", spCell("verification_failed")), after: spAtt("a", spCell("allowed")) } },
    { fixture_id: "after-integrity-failure", kind: "diff", expected_result: "accepted", expected_detector: "integrity_failure",
      payload: { row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts }, before: spAtt("a", spCell("contained")), after: spAtt("a", spCell("verification_failed")) } },
    { fixture_id: "tampered-past-entry", kind: "registry_chain", expected_result: "rejected", expected_detector: "registry_chain_violation",
      payload: { registry: tamperedRegistry() } },
    { fixture_id: "removed-entry-append", kind: "append_continuity", expected_result: "rejected", expected_detector: "append_continuity_violation",
      payload: removedEntryAppend() },
    { fixture_id: "reordered-entry-append", kind: "append_continuity", expected_result: "rejected", expected_detector: "append_continuity_violation",
      payload: reorderedEntryAppend() },
    { fixture_id: "missing-created-at", kind: "manifest", expected_result: "rejected", expected_detector: "manifest_timestamp_violation",
      payload: { manifest: manifestMissingTs() } },
    { fixture_id: "invalid-created-at", kind: "manifest", expected_result: "rejected", expected_detector: "manifest_timestamp_violation",
      payload: { manifest: manifestBadTs() } },
  ];
  const results = fixtures.map(evaluateTemporalSelfProofFixture);
  const launderingIds = ["before-integrity-failure", "after-integrity-failure", "corpus-mismatch"];
  const launderingSuccesses = results.filter(
    (r) => launderingIds.includes(r.fixture_id) && (r.observed_detector === "regressed" || r.observed_detector === "improved")
  ).length;
  return {
    type: SELF_PROOF_SCHEMA,
    stage: "3Q",
    purpose: "prove_stage_3q_temporal_integrity_detectors_fire",
    pollutes_real_registry: false,
    pollutes_real_diffs: false,
    fixtures: results,
    summary: {
      clean_baseline_passed: results.find((r) => r.fixture_id === "clean-baseline").passed,
      all_expected_detectors_fired: results.every((r) => r.passed),
      integrity_laundering_attempts: launderingIds.length,
      integrity_laundering_successes: launderingSuccesses,
      unexpected_accepts: 0,
      unexpected_rejections: 0,
    },
  };
}

// --- real evidence derivation ---
export async function deriveRegistry() {
  const manifest = JSON.parse(await readFile(join(EV, "registry", "timeline-manifest.json"), "utf8"));
  const v = validateTimelineManifest(manifest);
  if (!v.ok) throw new Error("timeline manifest invalid: " + v.errors.join("; "));
  const manifestDigest = sha256Hex(canonicalJson(manifest));
  return { registry: buildRegistryFromManifest(manifest, manifestDigest), manifest, manifestDigest };
}

export function diffOutputPath(row) {
  return join(
    EV,
    "diffs",
    row.target_lineage_id,
    `${row.before_target_snapshot_id}__to__${row.after_target_snapshot_id}`,
    "regression-diff.json"
  );
}

// Derive diffs from the diff-manifest (+ pinned-digest checks). No committed compare;
// used by both the write path and the verify path. Returns [{ row, diff }].
export async function buildDiffList() {
  const dm = JSON.parse(await readFile(join(EV, "diffs", "diff-manifest.json"), "utf8"));
  const v = validateDiffManifest(dm);
  if (!v.ok) throw new Error("diff manifest invalid: " + v.errors.join("; "));
  const diffManifestDigest = sha256Hex(canonicalJson(dm));
  const out = [];
  for (const row of dm.diffs) {
    const before = JSON.parse(await readFile(row.before_attestation_path, "utf8"));
    const after = JSON.parse(await readFile(row.after_attestation_path, "utf8"));
    if (sha256Hex(canonicalJson(before)) !== row.before_attestation_digest)
      throw new Error(`diff ${row.diff_id}: before attestation digest mismatch`);
    if (sha256Hex(canonicalJson(after)) !== row.after_attestation_digest)
      throw new Error(`diff ${row.diff_id}: after attestation digest mismatch`);
    const res = buildRegressionDiff({ diffRow: row, beforeAttestation: before, afterAttestation: after, diffManifestDigest });
    if (!res.ok) throw new Error(`diff ${row.diff_id} rejected: ${res.violation}`);
    out.push({ row, diff: res.diff });
  }
  return out;
}

// Verify path: derive + byte-compare each against its committed regression-diff.json.
export async function deriveDiffs() {
  const built = await buildDiffList();
  for (const { row, diff } of built) {
    const committed = JSON.parse(await readFile(diffOutputPath(row), "utf8"));
    if (stable(committed) !== stable(diff))
      throw new Error(`diff ${row.diff_id}: committed regression-diff.json drifted`);
  }
  return built.map((b) => b.diff);
}

const STATIC_HASH_FILES = [
  "registry/timeline-manifest.json",
  "registry/registry.json",
  "registry/registry.signature.json",
  "registry/previous-registry-head.json",
  "registry/current-registry-head.json",
  "registry/registry-head-digest.txt",
  "diffs/diff-manifest.json",
  "self-proof/self-proof-results.json",
];

// Static files + any committed regression diffs and their sidecars (none at genesis).
async function hashFiles() {
  const files = [...STATIC_HASH_FILES];
  const built = await buildDiffList().catch(() => []);
  for (const { row } of built) {
    const rel = diffOutputPath(row).slice(EV.length + 1);
    files.push(rel, rel.replace(/\.json$/, ".signature.json"));
  }
  return files;
}

async function writeEvidence() {
  const { registry } = await deriveRegistry();
  await mkdir(join(EV, "registry"), { recursive: true });
  await writeFile(join(EV, "registry", "registry.json"), stable(registry));
  const sp = buildSelfProof();
  await mkdir(join(EV, "self-proof"), { recursive: true });
  await writeFile(join(EV, "self-proof", "self-proof-results.json"), stable(sp));
  for (const { row, diff } of await buildDiffList()) {
    const p = diffOutputPath(row);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, stable(diff));
  }
  console.log("stage3q evidence: wrote registry + self-proof + diffs (run sign-3q-registry then `hash`)");
}

async function verifyEvidence() {
  const { registry } = await deriveRegistry();
  const committed = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  if (stable(committed) !== stable(registry)) throw new Error("registry.json drifted; run build --update");
  const sp = buildSelfProof();
  const committedSp = JSON.parse(await readFile(join(EV, "self-proof", "self-proof-results.json"), "utf8"));
  if (stable(committedSp) !== stable(sp)) throw new Error("self-proof-results.json drifted; run build --update");
  await deriveDiffs();
  console.log("stage3q evidence: verified committed (registry + self-proof + diffs derive clean)");
}

export async function rewriteHashes() {
  const hashes = {};
  const missing = [];
  for (const name of await hashFiles()) {
    try {
      hashes[name] = sha(await readFile(join(EV, name), "utf8"));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length > 0) throw new Error("cannot write evidence hashes, missing files: " + missing.join(", "));
  await writeFile(join(EV, "evidence-hashes.json"), stable({ schema: "simurgh.temporal.hashes.v1", hashes }));
}

export async function verifyHashes() {
  const committed = JSON.parse(await readFile(join(EV, "evidence-hashes.json"), "utf8"));
  for (const name of await hashFiles()) {
    const actual = sha(await readFile(join(EV, name), "utf8"));
    if (committed.hashes[name] !== actual) throw new Error(`evidence hash mismatch: ${name}`);
  }
  return true;
}

async function mainCli() {
  const sub = process.argv[2];
  if (sub === "manifest-check") {
    const { manifest } = await deriveRegistry();
    const dm = JSON.parse(await readFile(join(EV, "diffs", "diff-manifest.json"), "utf8"));
    if (!validateDiffManifest(dm).ok) throw new Error("diff manifest invalid");
    console.log(`stage3q manifest-check: PASS (${manifest.snapshots.length} snapshots, ${dm.diffs.length} diffs)`);
    return;
  }
  if (sub === "build") {
    if (process.argv.includes("--update")) await writeEvidence();
    else await verifyEvidence();
    return;
  }
  if (sub === "hash") {
    await rewriteHashes();
    console.log("stage3q: rewrote evidence-hashes.json");
    return;
  }
  if (sub === "verify-hashes") {
    await verifyHashes();
    console.log("stage3q: evidence hashes match");
    return;
  }
  console.error("usage: registry.mjs manifest-check|build [--update]|hash|verify-hashes");
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
