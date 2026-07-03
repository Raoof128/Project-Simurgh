#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, publicKeyFingerprint, sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { CCB_RAW_CODES, RAW_VERIFIER_CODES, stage4CodeForRawCode } from "../stage4h/exitCodes.mjs";
import { runOffline, scanForModelClients } from "../stage4h/offlineHarness.mjs";
import { EbaSchemaError, buildLedger, ledgerDigest } from "../stage4k/extractionLedger.mjs";
import { CcbSchemaError } from "./clusterCommitment.mjs";
import {
  assignmentLedgerDigest,
  buildAssignmentLedger,
  cardinalityDigest,
  checkCompleteness,
  computeClusterCardinality,
} from "./clusterAssignmentLedger.mjs";
import { aggregateClusterExposure, checkClusterBudgets } from "./clusterBudgetGate.mjs";
import {
  ccbAttestationDigest,
  ccbPolicyDigest,
  verifyCcbManifest,
} from "./build-stage4l-attestation.mjs";

// The committed 4K under-budget eba-manifest.json — the substrate this stage binds against.
const K = "tests/fixtures/llmShield/stage4k/bundles/under-budget/eba-manifest.json";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const finish = (bundleDir, rawCode, reason) => ({
  rawCode,
  reason,
  typed: stage4CodeForRawCode(rawCode),
  bundleDir,
});

export async function runCcbCore({ bundleDir, pinnedPubkeyPath } = {}) {
  // 1. Inputs readable (unreadable -> 29 fail closed).
  let events, assignments, policy;
  try {
    events = readJson(`${bundleDir}/events.json`);
    assignments = readJson(`${bundleDir}/cluster-assignments.json`);
    policy = readJson(`${bundleDir}/cluster-budget-policy.json`);
  } catch {
    return finish(bundleDir, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, "bundle_unreadable");
  }

  // 2. Rebuild the exposure ledger from events (4K schema violations fail closed to 29).
  let exposureLedger;
  try {
    exposureLedger = buildLedger(events);
  } catch (err) {
    const reason = err instanceof EbaSchemaError ? err.reason : "exposure_rebuild_failed";
    return finish(bundleDir, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, reason);
  }

  // 3. Rebuild the assignment ledger (schema/privacy/duplicate violations -> 42).
  let assignmentLedger;
  try {
    assignmentLedger = buildAssignmentLedger(assignments);
  } catch (err) {
    const reason = err instanceof CcbSchemaError ? err.reason : "assignment_rebuild_failed";
    return finish(bundleDir, CCB_RAW_CODES.CLUSTER_ASSIGNMENT_MISMATCH, reason);
  }

  // 4. Completeness against the exposure ledger (missing -> 40, dangling -> 42).
  const completeness = checkCompleteness(exposureLedger, assignmentLedger);
  if (!completeness.ok) return finish(bundleDir, completeness.rawCode, completeness.reason);

  // 5. Committed evidence readable (now expected present; unreadable -> 29).
  let committedLedger, committedCardinality, attestation, manifest, pinnedPem, ebaManifest;
  try {
    committedLedger = readJson(`${bundleDir}/cluster-assignment-ledger.json`);
    committedCardinality = readJson(`${bundleDir}/cluster-cardinality.json`);
    attestation = readJson(`${bundleDir}/ccb-attestation.json`);
    manifest = readJson(`${bundleDir}/ccb-manifest.json`);
    pinnedPem = readFileSync(pinnedPubkeyPath, "utf8");
    ebaManifest = readJson(K);
  } catch {
    return finish(bundleDir, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, "artifacts_unreadable");
  }

  // 6. Committed assignment ledger must equal the rebuild (recompute-before-trust -> 42).
  if (canonicalJson(committedLedger) !== canonicalJson(assignmentLedger)) {
    return finish(
      bundleDir,
      CCB_RAW_CODES.CLUSTER_ASSIGNMENT_MISMATCH,
      "ledger_recompute_mismatch"
    );
  }

  // 7. Cardinality recomputes from the rebuilt ledger (F10 tamper -> 42).
  const cardinality = computeClusterCardinality(assignmentLedger);
  if (canonicalJson(committedCardinality) !== canonicalJson(cardinality)) {
    return finish(
      bundleDir,
      CCB_RAW_CODES.CLUSTER_ASSIGNMENT_MISMATCH,
      "cardinality_recompute_mismatch"
    );
  }

  // 8. Manifest signature under the PINNED key; digest chain binds every artifact.
  const ebaManifestDigest = `sha256:${sha256Canonical(ebaManifest)}`;
  const pinnedKey = createPublicKey(pinnedPem);
  if (manifest.public_key_fingerprint !== `sha256:${publicKeyFingerprint(pinnedPem)}`) {
    return finish(bundleDir, RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH, "unpinned_signer");
  }
  const sigOk = verifyCcbManifest({
    manifest,
    assignmentLedger,
    attestation,
    policy,
    cardinality,
    ebaManifestDigest,
    publicKey: pinnedKey,
  });
  if (!sigOk.ok) {
    const raw = ["signature_invalid", "signature_malformed"].includes(sigOk.reason)
      ? RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH
      : RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH;
    return finish(bundleDir, raw, sigOk.reason);
  }

  // 9. Attestation self-consistency (every bound digest recomputes -> else 22).
  if (
    attestation.exposure_ledger_digest !== ledgerDigest(exposureLedger) ||
    attestation.assignment_ledger_digest !== assignmentLedgerDigest(assignmentLedger) ||
    attestation.cluster_budget_policy_digest !== ccbPolicyDigest(policy) ||
    attestation.cluster_cardinality_digest !== cardinalityDigest(cardinality) ||
    attestation.eba_manifest_digest !== ebaManifestDigest ||
    manifest.attestation_digest !== ccbAttestationDigest(attestation)
  ) {
    return finish(
      bundleDir,
      RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
      "attestation_chain_mismatch"
    );
  }

  // 10. Q9 — the cluster-budget gate. Raw 41 means exactly over-cluster-budget.
  const gate = checkClusterBudgets(
    aggregateClusterExposure(exposureLedger, assignmentLedger),
    policy
  );
  if (!gate.ok) return finish(bundleDir, gate.rawCode, gate.reason);
  return finish(bundleDir, RAW_VERIFIER_CODES.OK, null);
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const get = (n) => {
    const i = argv.indexOf(n);
    return i === -1 ? null : argv[i + 1];
  };
  const bundleDir = get("--bundle");
  const pinnedPubkeyPath = get("--pinned-pubkey");
  const outPath = get("--out");
  const scan = await scanForModelClients(new URL(import.meta.url).pathname, {
    allowedPaths: [
      new URL("./constants.mjs", import.meta.url).pathname,
      new URL("./clusterCommitment.mjs", import.meta.url).pathname,
      new URL("./clusterAssignmentLedger.mjs", import.meta.url).pathname,
      new URL("./clusterBudgetGate.mjs", import.meta.url).pathname,
      new URL("./build-stage4l-attestation.mjs", import.meta.url).pathname,
      new URL("../stage4k/constants.mjs", import.meta.url).pathname,
      new URL("../stage4k/extractionLedger.mjs", import.meta.url).pathname,
      new URL("../stage4k/extractionBudgetGate.mjs", import.meta.url).pathname,
      new URL("../stage4d/stage4dCrypto.mjs", import.meta.url).pathname,
    ],
  });
  if (!scan.ok) {
    const r = finish(bundleDir, RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, scan.reason);
    if (outPath) emit(outPath, r);
    process.exitCode = stage4CodeForRawCode(r.rawCode);
    return r;
  }
  const offline = await runOffline(() => runCcbCore({ bundleDir, pinnedPubkeyPath }));
  const r = offline.ok
    ? offline.value
    : finish(bundleDir, RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, offline.reason);
  if (outPath) emit(outPath, r);
  process.exitCode = stage4CodeForRawCode(r.rawCode);
  return r;
}

function emit(outPath, r) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify({ ...r, ok: r.rawCode === 0 }, null, 2)}\n`);
}

// argv[1] is undefined under `node -e` importers — guard so importing never crashes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`stage4l ccb: ${e.message}`);
    process.exit(3);
  });
}
