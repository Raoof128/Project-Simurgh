// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR Lane A evidence (plan Task 8/10) — the committed corpus/ledger/attestation.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verify } from "../../../../tools/simurgh-attestation/stage4x/node/verify-stage4x-attestation.mjs";
import { checkLeakage } from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import { checkLeakageV2 } from "../../../../tools/simurgh-attestation/stage4x/core/gateV2.mjs";

const EVID = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-4x"
);
const corpus = JSON.parse(readFileSync(join(EVID, "corpus.json"), "utf8"));
const ledger = JSON.parse(readFileSync(join(EVID, "ledger.json"), "utf8"));

test("committed evidence verifies raw 0 in both tiers", () => {
  assert.equal(verify({ tier: "public" }).raw, 0);
  assert.equal(verify({ tier: "audit" }).raw, 0);
});

test("headline: v1 slip 6/6 shrinks to v2 slip 1/6 (irreducible floor)", () => {
  assert.equal(ledger.metamorphic_slip_rate_v1, "6/6");
  assert.equal(ledger.metamorphic_slip_rate_v2, "1/6");
  assert.deepEqual(ledger.residue_delta.irreducible, ["i5"]);
});

test("every residue_form genuinely slips v1", () => {
  for (const it of corpus.items)
    assert.equal(checkLeakage(it.residue_form, [], []), null, it.item_id);
});

test("coverage witness exercises every v1 lexical rule", () => {
  for (const fam of ["digit", "number_word", "percent", "month", "quantifier"])
    assert.ok(corpus.coverage_witness[fam]?.length > 0, fam);
});

test("RSP-shaped incident_sourced item present; NO lab/model/party named (shape-only)", () => {
  assert.ok(corpus.items.some((i) => i.provenance === "incident_sourced"));
  const blob = JSON.stringify(corpus).toLowerCase();
  for (const banned of [
    "anthropic",
    "openai",
    "claude",
    "gpt",
    "llama",
    "gemini",
    "kpmg",
    "deepmind",
  ])
    assert.ok(!blob.includes(banned), `party name leaked: ${banned}`);
});

test("gate handles multi-byte text without error (non-ASCII smoke)", () => {
  assert.doesNotThrow(() => checkLeakageV2("سیمرغ روughly a quarter 🔥", [], []));
});
