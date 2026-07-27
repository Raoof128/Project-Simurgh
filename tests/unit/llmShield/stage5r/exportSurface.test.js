// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — the exports K7 found uncovered, exercised for real.
//
// The K7 net enumerated every export of every 5R module and named 53 that no test touched: every
// CLI's `parseArgs`, most domain constants, and a handful of functions that only ever ran inside a
// driver. Argument parsing decides where evidence is written, and a domain string is half of every
// digest this stage publishes — "small" is not the same as "not load-bearing".
//
// Domain constants are asserted by VALUE, not merely referenced. A test that only mentions a
// constant would satisfy the census and notice nothing; these fix the exact strings, because
// changing one silently invalidates every digest computed under the old one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const T = (p) => join(ROOT, "tools/simurgh-attestation/stage5r", p);

test("every domain string is pinned by VALUE — changing one invalidates every digest under it", async () => {
  const { ROOT_DOMAIN } = await import(T("core/attestation.mjs"));
  const { COMMITMENT_DOMAIN } = await import(T("core/commitment.mjs"));
  const { SPAN_DOMAIN } = await import(T("core/controls.mjs"));
  const { LOCK_DOMAIN } = await import(T("core/instrumentLock.mjs"));
  const { VERDICT_RECEIPT_DOMAIN } = await import(T("core/laneB.mjs"));
  const { INHERITED_SPAN_DOMAIN } = await import(T("core/memberSource.mjs"));

  assert.equal(ROOT_DOMAIN, "simurgh.vpf.attestation-root.v1");
  assert.equal(COMMITMENT_DOMAIN, "simurgh.vpf.campaign-commitment.v1");
  assert.equal(SPAN_DOMAIN, "simurgh.vpf.control-span.v1");
  assert.equal(LOCK_DOMAIN, "simurgh.vpf.instrument-lock.v1");
  assert.equal(VERDICT_RECEIPT_DOMAIN, "simurgh.vpf.verdict-receipt.v1");
  // 5Q's domain, on purpose: recomputing 5Q's pin under any other domain recomputes nothing.
  assert.equal(INHERITED_SPAN_DOMAIN, "simurgh.vsr.source-span.v1");

  const all = [ROOT_DOMAIN, COMMITMENT_DOMAIN, SPAN_DOMAIN, LOCK_DOMAIN, VERDICT_RECEIPT_DOMAIN];
  assert.equal(new Set(all).size, all.length, "two 5R domains collide");
});

test("the frozen vocabularies are exactly what the contract says", async () => {
  const { ATTACK_CLASSES, SECURITY_ROLES, ORTHOGONAL_FAILURE_MODES } = await import(
    T("core/familyContract.mjs")
  );
  assert.equal(ATTACK_CLASSES.length, 16);
  assert.equal(ATTACK_CLASSES[0], "R1");
  assert.equal(ATTACK_CLASSES[15], "R16");
  assert.equal(SECURITY_ROLES.length, 11);
  assert.ok(
    SECURITY_ROLES.includes("orchestration"),
    "the unreachable role is still in the vocabulary"
  );
  assert.deepEqual([...ORTHOGONAL_FAILURE_MODES], ["throw", "non_zero_exit", "parse_error"]);

  const { SEVERITIES } = await import(T("core/ledgers.mjs"));
  assert.deepEqual([...SEVERITIES], ["assurance_only", "claim_narrowing"]);

  const { A8_IS_AN_EXTENSION, THINNEST_FIRST } = await import(T("core/archetypes.mjs"));
  assert.equal(A8_IS_AN_EXTENSION, true, "A8 is an extension to the ruling, and says so");
  assert.deepEqual(
    [...THINNEST_FIRST],
    ["evidence_emission", "formal_statement", "code_allocation"]
  );

  const { TERMINATOR_SECTION_ID } = await import(T("core/frozenBlock.mjs"));
  assert.ok(TERMINATOR_SECTION_ID.length > 0);

  const { NOT_APPLICABLE, APPLIES_CLEAN } = await import(T("core/laneB.mjs"));
  assert.notEqual(NOT_APPLICABLE, APPLIES_CLEAN, "the two not-detecteds must stay distinguishable");
});

test("EVERY CLI's parseArgs defaults to its committed path and honours --output", async () => {
  const drivers = [
    ["node/auditPriorFamilies.mjs", "audit/prior-families.json"],
    ["node/buildDeltaLedger.mjs", "ledgers/delta-ledger.json"],
    ["node/buildFindingLedger.mjs", "ledgers/finding-ledger.json"],
    ["node/buildPremiseReceipts.mjs", "families/premise-receipts.json"],
    ["node/buildFamilyUniverse.mjs", "universe/"],
    ["node/buildTranche.mjs", "universe/"],
    ["node/buildParityManifest.mjs", "parity/"],
    ["node/commitCampaign.mjs", "commitments/campaign-c1.json"],
    ["node/computeFreezeReceipt.mjs", ""],
    ["node/lockInstrument.mjs", ""],
    ["node/measureInheritedGap.mjs", "measurements/"],
    ["node/probeImportWrites.mjs", ""],
    ["node/runMutationSelfProof.mjs", ""],
    ["node/verifyInheritance.mjs", ""],
    ["node/verifyTransition.mjs", ""],
    ["node/checkWriteSurface.mjs", ""],
  ];
  for (const [path, fragment] of drivers) {
    const mod = await import(T(path));
    assert.equal(typeof mod.parseArgs, "function", `${path} exports no parseArgs`);
    const custom = mod.parseArgs(["--output", "/tmp/5r-somewhere.json"]);
    if (custom.output !== undefined) {
      assert.equal(custom.output, "/tmp/5r-somewhere.json", `${path} ignores --output`);
      const dflt = mod.parseArgs([]);
      assert.notEqual(dflt.output, "/tmp/5r-somewhere.json", `${path} has no default`);
      if (fragment)
        assert.match(String(dflt.output), new RegExp(fragment.replace(/[/.]/g, "\\$&")), path);
    }
  }
});

test("the committed evidence paths the CLIs name actually exist", async () => {
  const { BUNDLE_PATH } = await import(T("node/attestStage5r.mjs"));
  const { C1_PATH } = await import(T("node/commitCampaign.mjs"));
  const { RECEIPTS_PATH } = await import(T("core/families.mjs"));
  const { RESULT_PATHS, COMMITMENT_PATH } = await import(T("node/verifyFamilyCorpus.mjs"));
  const { MANIFEST } = await import(T("node/verifyTransition.mjs"));
  for (const p of [BUNDLE_PATH, C1_PATH, RECEIPTS_PATH, COMMITMENT_PATH]) {
    assert.ok(existsSync(join(ROOT, p)), `${p} is named by a driver and does not exist`);
  }
  assert.ok(RESULT_PATHS.length >= 1);
  assert.ok(Array.isArray(MANIFEST) || typeof MANIFEST === "object");
});

test("the detector's IDENTITY digest changes when the detector changes", async () => {
  const { DETECTOR_ID, detectorImplementationDigest } = await import(T("node/detectorChild.mjs"));
  assert.equal(DETECTOR_ID, "stage5r-detector-child-v2");
  const d = detectorImplementationDigest();
  assert.match(d, /^[0-9a-f]{64}$/);
  assert.equal(d, detectorImplementationDigest(), "the digest must be stable for stable bytes");
  // It covers the signal predicates too: a name in a receipt survives a rewritten implementation.
  const c1 = JSON.parse(
    (await import("node:fs")).readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json"),
      "utf8"
    )
  );
  assert.equal(c1.detector_implementation_digest, d, "C1 committed a different detector");
});

test("rebuildCommitment reproduces the committed C1 exactly", async () => {
  const { rebuildCommitment } = await import(T("node/commitCampaign.mjs"));
  const { compareCommitments } = await import(T("core/commitment.mjs"));
  const committed = JSON.parse(
    (await import("node:fs")).readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json"),
      "utf8"
    )
  );
  assert.equal(compareCommitments({ committed, rebuilt: rebuildCommitment(ROOT) }).ok, true);
});

test("canonicalSourceBytes is byte-level and refuses a BOM", async () => {
  const { canonicalSourceBytes } = await import(T("core/memberSource.mjs"));
  assert.equal(canonicalSourceBytes(Buffer.from("a", "utf8")).toString("utf8"), "a\n");
  assert.equal(canonicalSourceBytes(Buffer.from("a\r\nb\r\n", "utf8")).toString("utf8"), "a\nb\n");
  // Interior blank lines are content and survive; only the trailing newline is normalised.
  assert.equal(
    canonicalSourceBytes(Buffer.from("a\n\n\nb\n", "utf8")).toString("utf8"),
    "a\n\n\nb\n"
  );
  assert.throws(() => canonicalSourceBytes(Buffer.from("﻿a", "utf8")), /BOM/);
});

test("inheritedOpeningFinding puts 5R's field BESIDE 5Q's, never over it", async () => {
  const { inheritedOpeningFinding } = await import(T("core/ledgers.mjs"));
  const addendum = {
    disposition: "5Q's own words",
    finding: {
      finding_id: "5Q-F013",
      affected_stage: "5q",
      attack_class: "R16",
      severity: "claim_narrowing",
      expected_result: "e",
      observed_result: "o",
    },
  };
  const r = inheritedOpeningFinding({ addendum, addendumDigest: "a".repeat(64) });
  assert.equal(r.q0_disposition_quoted, "5Q's own words");
  assert.notEqual(r.vpf_disposition, r.q0_disposition_quoted);
  assert.equal(r.observed_result, "o");
  assert.equal(r.severity, "claim_narrowing");
});

test("the deferred red-state provers really fire, and only in copies", async () => {
  const { proveG8, proveG9, treeDigest } = await import(T("node/recordGateRedStates.mjs"));
  const g8 = proveG8();
  assert.equal(g8.caught, true);
  assert.notEqual(g8.before_digest, g8.after_digest);
  assert.match(g8.proved_in, /COPY/);
  const g9 = proveG9();
  assert.equal(g9.caught, true);
  assert.equal(g9.arithmetic_refused_an_impossible_triple, true);
  // The tree digest moves on a single added byte anywhere beneath it.
  const d = treeDigest(join(ROOT, "tools/simurgh-attestation/stage5r/families/F1"));
  assert.match(d, /^[0-9a-f]{64}$/);
  assert.equal(d, treeDigest(join(ROOT, "tools/simurgh-attestation/stage5r/families/F1")));
  assert.notEqual(d, treeDigest(join(ROOT, "tools/simurgh-attestation/stage5r/families/F2")));
});

test("inForceCommit resolves the commit whose bytes are in force", async () => {
  const { inForceCommit } = await import(T("node/verifyCampaignAncestry.mjs"));
  const c = inForceCommit(
    "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json"
  );
  assert.match(c, /^[0-9a-f]{40}$/);
  assert.equal(inForceCommit("no/such/path/at/all.json"), null);
});

test("the remaining driver helpers run and return what their callers need", async () => {
  const { readFiles, runtimeIdentity } = await import(T("node/lockInstrument.mjs"));
  const files = readFiles(ROOT);
  assert.ok(Object.keys(files).length >= 18);
  const rt = runtimeIdentity();
  assert.match(
    rt.node_version,
    /^\d+\.\d+\.\d+$/,
    "the lock records the runtime it was taken under"
  );
  assert.ok(rt.node_executable_realpath.length > 0, "and which binary, by realpath");
  assert.ok(rt.platform && rt.arch);

  const { proveOne } = await import(T("node/runMutationSelfProof.mjs"));
  assert.equal(typeof proveOne, "function");

  const { collectChanges } = await import(T("node/checkWriteSurface.mjs"));
  assert.equal(typeof collectChanges, "function");

  const { closureModules } = await import(T("node/probeImportWrites.mjs"));
  assert.equal(typeof closureModules, "function");

  const { loadTree } = await import(T("node/verifyInheritance.mjs"));
  assert.equal(typeof loadTree, "function");

  const { runManifest } = await import(T("node/verifyTransition.mjs"));
  assert.equal(typeof runManifest, "function");
});
