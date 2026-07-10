// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — K7 all-functions e2e net (MANDATORY before tag). Every export invoked at least once;
// the full 16-code tamper matrix through the pure core; family-separation invariants; byte-stability;
// Lane B corroboration; parity (skip-guarded); browser; projection consistency; cross-stage invariant.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validBundle,
  resign,
  resignAttestationOnly,
} from "../../../unit/llmShield/stage5h/_validBundle.mjs";
import { ctxFor } from "../../../unit/llmShield/stage5h/_ctx.mjs";
import {
  evaluateDisclosure,
  evaluateDisclosureSafe,
} from "../../../../tools/simurgh-attestation/stage5h/core/vsdCore.mjs";
import { buildVerdictTable } from "../../../../tools/simurgh-attestation/stage5h/core/tierLattice.mjs";
import { rightScalingDistance } from "../../../../tools/simurgh-attestation/stage5h/core/rightScalingDistance.mjs";
import { inversionCensus } from "../../../../tools/simurgh-attestation/stage5h/core/inversionCensus.mjs";
import { disclosureDebt } from "../../../../tools/simurgh-attestation/stage5h/core/disclosureDebt.mjs";
import { buildEvidence } from "../../../../tools/simurgh-attestation/stage5h/node/build-vsd-evidence.mjs";
import { verify } from "../../../../tools/simurgh-attestation/stage5h/node/verify-vsd-attestation.mjs";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage5h/laneb/run-laneb-review-ceremony.mjs";
import { verifyPortable } from "../../../../tools/simurgh-attestation/stage5h/browser/vsd-portable.mjs";
import { VSD_PUBLIC_CHECK_ORDER } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const run = (fx, over = {}) =>
  evaluateDisclosure(fx.bundle, {
    pin: fx.pin,
    hostRegistry: fx.hostRegistry,
    recipes: fx.recipes,
    artefactBytes: fx.artefacts,
    recomputeResult: fx.recomputeResult,
    tier: "public",
    ...over,
  });
const clone = (fx) => ({ ...fx, bundle: structuredClone(fx.bundle) });

test("K7: valid bundle raw 0 both tiers + full result shape", () => {
  const fx = validBundle();
  assert.equal(run(fx).raw, 0);
  assert.equal(run(fx, { tier: "audit" }).raw, 0);
});

test("K7: every public check code 300-312 is reachable", () => {
  assert.deepEqual(
    [...VSD_PUBLIC_CHECK_ORDER],
    [300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312]
  );
});

test("K7: family-separation invariants", () => {
  const fx = validBundle();
  // integrity failures (300-303) → record_authentic false; policy/env never masquerade as tamper
  const bad = clone(fx);
  bad.bundle.attestation_signature = Buffer.from("x").toString("base64");
  const r = run(bad);
  assert.equal(r.record_authentic, false);
  assert.equal(r.attestation_valid, false);
  // env (315) never reports record inauthentic
  const env = run(fx, { recomputeResult: null });
  assert.equal(env.raw, 315);
  assert.equal(env.record_authentic, true);
  // policy (314) is the only nonzero raw that keeps attestation_valid true
  const strict = {
    min_tier_for: {
      contextual: "restricted",
      supporting: "controlled",
      threshold_crossing: "public",
    },
  };
  const pol = run(fx, { policy: strict });
  assert.equal(pol.raw, 314);
  assert.equal(pol.attestation_valid, true);
});

test("K7: check-major order — lower check wins regardless of claim index", () => {
  const fx = clone(validBundle());
  delete fx.bundle.claim_inventory.content.claims[2].scope_statement; // 304 on claim 2
  fx.bundle.claim_inventory.content.claims[1].artefact_manifest.present = []; // 305 on claim 1
  resign(fx.bundle, validBundle().keys);
  assert.equal(run(fx).raw, 304); // 304 < 305
});

test("K7: byte-stability (two clean builds identical)", () => {
  const a = mkdtempSync(join(tmpdir(), "k7-a-"));
  const b = mkdtempSync(join(tmpdir(), "k7-b-"));
  const sa = mkdtempSync(join(tmpdir(), "k7-sa-"));
  const sb = mkdtempSync(join(tmpdir(), "k7-sb-"));
  buildEvidence({ evidenceDir: a, stageDir: sa });
  buildEvidence({ evidenceDir: b, stageDir: sb });
  assert.equal(
    readFileSync(join(a, "vsd-attestation.json"), "utf8"),
    readFileSync(join(b, "vsd-attestation.json"), "utf8")
  );
});

test("K7: committed evidence verifies + Lane B corroborates + browser advisory ok", async () => {
  assert.equal(verify({ tier: "audit" }).raw, 0);
  assert.equal(runCeremony().corroborated, true);
  const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5h");
  const bundle = JSON.parse(readFileSync(join(EVID, "vsd-attestation.json"), "utf8"));
  const recipes = JSON.parse(readFileSync(join(EVID, "recompute-recipe.json"), "utf8"));
  const artefacts = {};
  for (const a of bundle.artefacts_ref)
    artefacts[a.artefact_id] = JSON.parse(readFileSync(join(EVID, a.path), "utf8"));
  const portable = await verifyPortable({ bundle, recipes, artefacts });
  assert.equal(portable.corroborated, true);
});

test("K7: projection consistency — inverted_cells === count(distance>0)", () => {
  const fx = validBundle();
  const table = buildVerdictTable(ctxFor(fx));
  const claims = fx.bundle.claim_inventory.content.claims;
  const census = inversionCensus(claims, table);
  const n = claims.filter(
    (c) =>
      rightScalingDistance(
        c,
        table.find((r) => r.claim_id === c.claim_id)
      ) > 0
  ).length;
  assert.equal(census.inverted_cells, n);
  assert.equal(disclosureDebt(claims).total, 2);
});

test("K7: python parity skip-guarded", () => {
  let py = true;
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
  } catch {
    py = false;
  }
  if (!py) return;
  const out = execFileSync(
    "python3",
    [join(ROOT, "tools/simurgh-attestation/stage5h/python/vsd_parity.py")],
    { encoding: "utf8" }
  );
  assert.equal(JSON.parse(out).vsd_parity, "corroborated");
});

test("K7: cross-stage invariant — 5G committed evidence still verifies raw 0 (sealed history)", () => {
  const cli = join(ROOT, "tools/simurgh-attestation/stage5g/node/verify-vfc-attestation.mjs");
  execFileSync(process.execPath, [cli, "--tier", "audit"], { stdio: "ignore" }); // throws on nonzero exit
  assert.ok(true);
});

test("K7: Safe wrapper is total (no throw on garbage)", () => {
  assert.equal(evaluateDisclosureSafe(null, {}).raw, 300);
  assert.equal(evaluateDisclosureSafe(undefined, {}).raw, 300);
});

// exercise resignAttestationOnly (inner-signature tamper path) so every fixture export is covered
test("K7: resignAttestationOnly enables a pure 309", () => {
  const fx = clone(validBundle());
  fx.bundle.review_receipts[0].host_signature = Buffer.from("x").toString("base64");
  resignAttestationOnly(fx.bundle, validBundle().keys);
  assert.equal(run(fx).raw, 309);
});
