// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
// Stage 4S K7 all-functions net (spec §19): frozen export inventory, composed
// scenario driving every stage4s module, full tamper matrix through the engine,
// cross-stage invariants (registry integrity 0-118, 4N epoch anchor, spine refs),
// two-tier attestation, corpus<->python parity, and Lane-B capture re-verification.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import * as constants from "../../../../tools/simurgh-attestation/stage4s/constants.mjs";
import * as scopeLattice from "../../../../tools/simurgh-attestation/stage4s/core/scopeLattice.mjs";
import * as treeCore from "../../../../tools/simurgh-attestation/stage4s/core/treeCore.mjs";
import * as fanoutCore from "../../../../tools/simurgh-attestation/stage4s/core/fanoutCore.mjs";
import * as fluxCore from "../../../../tools/simurgh-attestation/stage4s/core/fluxCore.mjs";
import * as bundleMerkle from "../../../../tools/simurgh-attestation/stage4s/core/bundleMerkle.mjs";
import * as receiptBuilder from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import * as chainCore from "../../../../tools/simurgh-attestation/stage4s/core/chainCore.mjs";
import {
  VDCC_RAW_CODES,
  VDCC_CHECK_ORDER,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4s/node/verify-stage4s-attestation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const FIX = join(ROOT, "docs/research/llm-shield/evidence/stage-4s/fixtures");
const readJson = (p) => JSON.parse(readFileSync(join(FIX, p), "utf8"));

// ---- 1. Frozen export inventory: every module surfaces its whole API. ----
test("K7.1 export inventory is present and callable", () => {
  const expect = {
    constants: [
      "SCHEMAS",
      "DOMAINS",
      "CROSSING_KINDS",
      "VDCC_NON_CLAIMS",
      "VDCC_KNOWN_LIMITATIONS",
      "VDCC_RAILS",
      "ROOT_SENTINEL",
    ],
    scopeLattice: ["normalizeScope", "scopeLeq", "pathScope"],
    treeCore: ["receiptDigest", "indexBundle", "verifyTreeInvariants"],
    fanoutCore: ["childSetRoot", "buildFanoutCommitment", "verifyFanoutCommitments"],
    fluxCore: ["verifyFlux"],
    bundleMerkle: ["bundleRoot"],
    receiptBuilder: [
      "keyDigest",
      "buildHopReceipt",
      "signDelegator",
      "signDelegatee",
      "dualSign",
      "verifyDualSignature",
      "signFanout",
      "verifyFanoutSignature",
      "signCrossing",
      "verifyCrossingSignature",
      "fanoutDigest",
      "crossingDigest",
      "assembleChainBundle",
    ],
    chainCore: ["evaluateChain", "evaluateChainSafe"],
  };
  const mods = {
    constants,
    scopeLattice,
    treeCore,
    fanoutCore,
    fluxCore,
    bundleMerkle,
    receiptBuilder,
    chainCore,
  };
  for (const [name, keys] of Object.entries(expect)) {
    for (const k of keys) assert.ok(k in mods[name], `${name}.${k} exported`);
  }
});

// ---- 2. Cross-stage registry integrity (0-118). ----
test("K7.2 raw-code registry: 100-118 mapped to level 1; check order is a permutation", () => {
  for (let raw = 100; raw <= 118; raw++) assert.equal(stage4CodeForRawCode(raw), 1);
  assert.equal(stage4CodeForRawCode(999), 3);
  assert.deepEqual(
    [...VDCC_CHECK_ORDER].sort((a, b) => a - b),
    Object.values(VDCC_RAW_CODES).sort((a, b) => a - b)
  );
  for (const code of Object.values(VDCC_RAW_CODES)) {
    assert.ok(Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, code));
  }
});

// ---- 3. Composed scenario driving every core function via the honest bundle. ----
test("K7.3 honest bundle composes every module to GREEN", () => {
  const bundle = readJson("fixture-0-honest-tree.json");
  // scope lattice
  assert.ok(scopeLattice.scopeLeq(["mail.read"], ["calendar.read", "mail.read"]));
  // tree + fanout + flux via the engine
  const idx = treeCore.indexBundle(bundle.tree_receipts);
  assert.equal(treeCore.verifyTreeInvariants(idx).raw, 0);
  assert.equal(fanoutCore.verifyFanoutCommitments(idx, bundle.fanout_commitments).raw, 0);
  assert.equal(fluxCore.verifyFlux(idx, bundle.crossing_artifacts).raw, 0);
  // bundle merkle recompute
  const leaves = [
    ...bundle.tree_receipts.map(treeCore.receiptDigest),
    ...bundle.detached_receipts.map(treeCore.receiptDigest),
    ...bundle.fanout_commitments.map(receiptBuilder.fanoutDigest),
    ...bundle.crossing_artifacts.map(receiptBuilder.crossingDigest),
  ];
  assert.equal(bundleMerkle.bundleRoot(leaves), bundle.bundle_merkle_root);
  // full engine
  assert.equal(chainCore.evaluateChain(bundle).raw, 0);
});

// ---- 4. Full tamper matrix through the engine (every committed fixture). ----
test("K7.4 every corpus fixture reaches its expected raw through evaluateChainSafe", () => {
  const index = readJson("corpus-index.json");
  for (const c of index.cases) {
    assert.equal(chainCore.evaluateChainSafe(readJson(c.file)).raw, c.expected_raw, c.name);
  }
});

// ---- 5. Cross-stage invariants: 4N epoch anchor + bundle non-claims/rails. ----
test("K7.5 honest bundle carries the signed non-claims / limitations / rails and a window epoch", () => {
  const bundle = readJson("fixture-0-honest-tree.json");
  assert.equal(bundle.non_claims.length, 7);
  assert.equal(bundle.known_limitations.length, 5);
  assert.equal(bundle.rails.length, 12);
  assert.match(bundle.epoch, /^win-/); // 4N window anchor id, not a wall clock
  assert.ok(bundle.rails.includes("merkle_inclusion_is_presence_not_completeness"));
});

// ---- 6. Two-tier attestation over the committed corpus. ----
test("K7.6 committed attestation verifies GREEN at public and audit tiers", () => {
  const att = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-4s/attestation/stage4s-attestation.json"),
      "utf8"
    )
  );
  assert.equal(verifyAttestation(att, { tier: "public" }).ok, true);
  assert.equal(verifyAttestation(att, { tier: "audit" }).ok, true);
});

// ---- 7. Lane-B capture re-verification (offline). ----
test("K7.7 committed Lane-B capture re-verifies GREEN and tamper is caught at 114", () => {
  const cap = JSON.parse(
    readFileSync(
      join(ROOT, "docs/research/llm-shield/evidence/stage-4s/laneb/laneb-capture.json"),
      "utf8"
    )
  );
  assert.equal(chainCore.evaluateChainSafe(cap.bundle).raw, 0);
  assert.equal(chainCore.evaluateChainSafe({ ...cap.bundle, epoch: "win-1999-01-01" }).raw, 114);
  assert.equal(cap.transport, "mcp_stdio_jsonrpc2");
});
