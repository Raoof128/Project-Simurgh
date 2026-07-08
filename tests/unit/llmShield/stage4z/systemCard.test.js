// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — VSC (plan Task 15). PAYS transparency_report_profile_deferred.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderVsc,
  verifyVsc,
} from "../../../../tools/simurgh-attestation/stage4z/core/systemCard.mjs";
import {
  VWA_PAID_SLOT,
  VWA_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage4z/constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const wfm = JSON.parse(
  readFileSync(join(EVID, "synthetic_clean_injection_detect.bundle.json"), "utf8")
).map;

function makeVsc(
  narrative = "This system card's numbers each recompute from a verified artifact."
) {
  return renderVsc({
    narrative,
    bindings: [
      { span_id: "flags", recompute_kind: "vwa_flag_total", artifact: wfm },
      { span_id: "cells", recompute_kind: "vwa_n_cells", artifact: wfm },
    ],
  });
}

test("VSC pays the transparency IOU (paid slot absent from reserved)", () => {
  assert.equal(VWA_PAID_SLOT, "transparency_report_profile_deferred");
  assert.ok(!VWA_RESERVED_SLOTS.includes(VWA_PAID_SLOT));
});

test("a rendered VSC verifies: every span recomputes from the sealed WFM", () => {
  const vsc = makeVsc();
  const r = verifyVsc(vsc, [wfm]);
  assert.ok(r.ok, JSON.stringify(r.errors));
});

test("a doctored claimed_value → recompute_mismatch", () => {
  const vsc = makeVsc();
  vsc.spans[0].claimed_value = 999;
  const r = verifyVsc(vsc, [wfm]);
  assert.ok(r.errors.some((e) => e.error === "recompute_mismatch"));
});

test("a flipped evidence_digest → recompute_unavailable", () => {
  const vsc = makeVsc();
  vsc.spans[0].evidence_digest = "sha256:" + "0".repeat(64);
  const r = verifyVsc(vsc, [wfm]);
  assert.ok(r.errors.some((e) => e.error === "recompute_unavailable"));
});

test("No Smuggled Claim: an untyped number in the prose is caught by the reused 4W gate", () => {
  const vsc = makeVsc("We caught 42 percent of cases."); // a number smuggled into prose
  const r = verifyVsc(vsc, [wfm]);
  assert.ok(r.errors.some((e) => e.error === "smuggled_claim_in_prose"));
});
