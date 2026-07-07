// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — K7 all-functions e2e net (plan Task 14). Composes every export, the full
// 173–180 tamper matrix, cross-stage invariants, and the carved read-only-leakage-kernel check.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateVlr,
  evaluateVlrSafe,
} from "../../../../tools/simurgh-attestation/stage4x/core/vlrCore.mjs";
import { computeLedgerFromSealedOutcomes } from "../../../../tools/simurgh-attestation/stage4x/core/residueLedger.mjs";
import { applyMR } from "../../../../tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage4x/laneb/run-laneb-recompute-ceremony.mjs";
import * as exitCodes from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4x");
const KEY = join(
  ROOT,
  "tests/fixtures/llmShield/stage4x/test-keys/INSECURE_FIXTURE_ONLY_vlr.pub.pem"
);
const rd = (f) => JSON.parse(readFileSync(join(EVID, f), "utf8"));
const pub = readFileSync(KEY, "utf8");
const clone = (o) => JSON.parse(JSON.stringify(o));
const base = () => ({
  corpus: rd("corpus.json"),
  ledger: rd("ledger.json"),
  attestation: rd("attestation.json"),
});

test("green bundle verifies raw 0 in both tiers", () => {
  assert.equal(evaluateVlr(base(), { tier: "public", publicKeyPem: pub }).raw, 0);
  assert.equal(evaluateVlr(base(), { tier: "audit", publicKeyPem: pub }).raw, 0);
});

test("full tamper matrix 173 → 180", () => {
  const ev = (b, tier = "public") => evaluateVlr(b, { tier, publicKeyPem: pub }).raw;

  const b173 = base();
  b173.corpus.schema = "nope";
  assert.equal(ev(b173), 173);

  const b174 = base();
  b174.attestation.signature = "00" + b174.attestation.signature.slice(2);
  assert.equal(ev(b174), 174);

  const b175 = base();
  b175.corpus.coverage_witness.number_word = [];
  assert.equal(ev(b175), 175);

  const b176 = base();
  b176.corpus.ruleset_binding.v1_ruleset_digest = "sha256:" + "0".repeat(64);
  assert.equal(ev(b176), 176);

  // 177 audit-only: sealed outcome diverging from live gate, arithmetic kept consistent.
  const b177 = base();
  const oc = clone(b177.ledger.per_item_outcomes);
  oc.find((o) => o.item_id === "i1").residue_v1 = true;
  b177.ledger = computeLedgerFromSealedOutcomes(b177.corpus, oc);
  assert.equal(ev(b177, "public"), 0); // public-green
  assert.equal(ev(b177, "audit"), 177); // audit-red

  const b178 = base();
  b178.ledger.metamorphic_slip_rate_v2 = "0/6";
  assert.equal(ev(b178), 178);

  const b179 = base();
  b179.ledger.monotone = false;
  assert.equal(ev(b179), 179);

  const b180 = base();
  b180.ledger.per_item_outcomes = 42;
  assert.equal(evaluateVlrSafe(b180, { publicKeyPem: pub }).raw, 180);
});

test("cross-stage invariant: every residue is the metamorphic transform of its seed", () => {
  for (const it of base().corpus.items)
    assert.equal(it.residue_form, applyMR(it.metamorphic_relation, it.seed_form), it.item_id);
});

test("cross-stage invariant: Lane B blind recompute matches committed ledger", () => {
  assert.equal(runCeremony().match, true);
});

test("read-only leakage kernel: additive codes only, no src/llmShield or authorise in 4X", () => {
  // VSN 162–172 intact, VLR 173–180 additive.
  assert.equal(exitCodes.VSN_RAW_CODES.INTERNAL_FAIL_CLOSED, 172);
  assert.equal(exitCodes.VLR_RAW_CODES.VLR_SCHEMA_INVALID, 173);
  assert.equal(exitCodes.VLR_RAW_CODES.INTERNAL_FAIL_CLOSED_VLR, 180);
  // No src/llmShield import and no authorise entry anywhere in the 4X source tree.
  const dir = join(ROOT, "tools/simurgh-attestation/stage4x");
  const walk = (d) =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]
    );
  for (const f of walk(dir).filter((f) => f.endsWith(".mjs"))) {
    const src = readFileSync(f, "utf8");
    assert.ok(!/src\/llmShield/.test(src), `${f} references src/llmShield`);
    assert.ok(!/\bauthorise\b/.test(src), `${f} references authorise`);
  }
});
