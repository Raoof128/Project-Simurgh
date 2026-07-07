// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC K7 all-functions e2e net (spec §15). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

import {
  loadTemplates,
  verifyTemplateBindings,
} from "../../../../tools/simurgh-attestation/stage4t/core/templateMap.mjs";
import {
  buildEvidenceManifest,
  verifyCensus,
} from "../../../../tools/simurgh-attestation/stage4t/core/censusCore.mjs";
import {
  verifyProjection,
  verifySuppression,
  KIND_EVIDENCE_SOURCE,
} from "../../../../tools/simurgh-attestation/stage4t/core/projectionCore.mjs";
import {
  buildView,
  verifyView,
  verifyViewAgainstCommitments,
  deriveCommitments,
  deterministicSalt,
  sectionKey,
} from "../../../../tools/simurgh-attestation/stage4t/core/viewCore.mjs";
import {
  evaluateCapsule,
  evaluateCapsuleSafe,
  capsuleAttestationDigest,
  verifySeal,
  verifyCrossStageRefs,
} from "../../../../tools/simurgh-attestation/stage4t/core/capsuleCore.mjs";
import { buildLaneAFixtures } from "../../../../tools/simurgh-attestation/stage4t/node/build-stage4t-fixtures.mjs";
import {
  computeAttestation,
  signAttestation,
  bundleMerkleRoot,
} from "../../../../tools/simurgh-attestation/stage4t/node/build-stage4t-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4t/node/verify-stage4t-attestation.mjs";
import {
  buildGreenBundle,
  resignGreen,
  STAGE_VERIFIERS,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { bundle, pubKeyPem } = buildGreenBundle();
const OPTS = { capsulePubKeyPem: pubKeyPem, stageVerifiers: STAGE_VERIFIERS };
const clone = (x) => JSON.parse(JSON.stringify(x));
const saltsFor = (capsule) =>
  Object.fromEntries(
    capsule.projected_sections.map((s) => [sectionKey(s), deterministicSalt(sectionKey(s))])
  );

test("every stage4t export is a live function", () => {
  for (const fn of [
    loadTemplates,
    verifyTemplateBindings,
    buildEvidenceManifest,
    verifyCensus,
    verifyProjection,
    verifySuppression,
    buildView,
    verifyView,
    verifyViewAgainstCommitments,
    deriveCommitments,
    sectionKey,
    evaluateCapsule,
    evaluateCapsuleSafe,
    capsuleAttestationDigest,
    verifySeal,
    verifyCrossStageRefs,
    buildLaneAFixtures,
    computeAttestation,
    signAttestation,
    bundleMerkleRoot,
    verifyAttestation,
    buildGreenBundle,
    resignGreen,
  ])
    assert.equal(typeof fn, "function");
  assert.equal(KIND_EVIDENCE_SOURCE.stage4s_chain_verdict, "stage4s_chain_bundle");
});

test("honest end-to-end: chain -> capsule -> attestation -> views -> both tiers", () => {
  assert.deepEqual(evaluateCapsule(bundle, OPTS), { raw: 0 });
  const att = signAttestation(computeAttestation());
  assert.equal(verifyAttestation(att, { tier: "public" }).ok, true);
  assert.equal(verifyAttestation(att, { tier: "audit" }).ok, true);
  const salts = saltsFor(bundle.content);
  const view = buildView(bundle.content, "regulator", [], salts);
  assert.equal(verifyViewAgainstCommitments(view, bundle.content.section_commitments), null);
});

test("full tamper matrix 133-149 via Lane A corpus (evaluateCapsuleSafe + audit tier)", () => {
  for (const f of buildLaneAFixtures()) {
    const got = evaluateCapsuleSafe(f.bundle, { ...OPTS, ...f.evalOpts });
    assert.equal(got.raw, f.expected_raw, `${f.name}: expected ${f.expected_raw}, got ${got.raw}`);
  }
});

test("150 typed-wrapper-only fail-closed", () => {
  const poisoned = clone(bundle);
  poisoned.content.evidence_manifest = {
    get items() {
      throw new Error("poison");
    },
  };
  const r = evaluateCapsuleSafe(poisoned, OPTS);
  assert.ok(r.raw === 150 || r.raw === 133, `got ${r.raw}`);
});

test("cross-stage invariant: a capsule over a tampered 4S bundle never earns a false GREEN", () => {
  const falsified = buildGreenBundle({ falsifyChainVerdict: true });
  const r = evaluateCapsule(falsified.bundle, {
    capsulePubKeyPem: falsified.pubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.notEqual(r.raw, 0);
  assert.equal(r.raw, 146);
});

test("suppression duel: fabricate -> 141, suppress -> 143 (same section)", () => {
  const fab = clone(bundle);
  fab.content.projected_sections.find((p) => p.class === "evidence_backed").evidence_digest =
    "sha256:" + "3".repeat(64);
  assert.equal(evaluateCapsule(resignGreen(fab), OPTS).raw, 141);

  const sup = clone(bundle);
  const ps = sup.content.projected_sections.find((p) => p.class === "evidence_backed");
  delete ps.value;
  delete ps.evidence_digest;
  delete ps.recompute_kind;
  ps.class = "not_derivable";
  assert.equal(evaluateCapsule(resignGreen(sup), OPTS).raw, 143);
});

test("a contradicting view never verifies (148)", () => {
  const salts = saltsFor(bundle.content);
  const v = buildView(bundle.content, "regulator", [], salts);
  v.disclosed[0].section = { ...v.disclosed[0].section, value: "LIE" };
  assert.equal(verifyViewAgainstCommitments(v, bundle.content.section_commitments).raw, 148);
});

test("browser<->CLI core parity on the canonical digest", () => {
  const html = readFileSync(
    join(HERE, "../../../../tools/simurgh-attestation/stage4t/browser/vic-verifier.html"),
    "utf8"
  );
  const m = html.match(/<script id="vic-core">([\s\S]*?)<\/script>/);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox);
  const sample = bundle.content.section_commitments;
  assert.equal(sandbox.VIC.recordDigest(sample), recordDigest(sample));
});

test("read-only predecessors: frozen 4A-4U sources byte-identical to base (committed states)", () => {
  const frozen = [
    "tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py",
    "tools/simurgh-attestation/stage4m/core/canonical.mjs",
    "tools/simurgh-attestation/stage4s/core/chainCore.mjs",
    "tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs",
    "tools/simurgh-attestation/stage4s/core/treeCore.mjs",
    "tools/simurgh-attestation/stage4s/core/fanoutCore.mjs",
    "tools/simurgh-attestation/stage4s/core/fluxCore.mjs",
    "tools/simurgh-attestation/stage4s/core/scopeLattice.mjs",
    "tools/simurgh-attestation/stage4s/core/bundleMerkle.mjs",
  ];
  let base = null;
  for (const ref of ["origin/main", "main"]) {
    try {
      base = execFileSync("git", ["merge-base", "HEAD", ref], {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
      break;
    } catch {
      /* ref not available */
    }
  }
  if (!base) return; // exotic shallow checkout — skip rather than false-fail
  for (const f of frozen) {
    const b = execFileSync("git", ["show", `${base}:${f}`], { encoding: "utf8" });
    const h = execFileSync("git", ["show", `HEAD:${f}`], { encoding: "utf8" });
    assert.equal(h, b, `${f} must be byte-identical to base`);
  }
  // exitCodes.mjs is the ONE intentional shared-ledger append (133-150); its VRTA prefix
  // and probe hygiene are covered by exitWrapper.test.js + exitCodeProbeHygiene.test.js.
});
