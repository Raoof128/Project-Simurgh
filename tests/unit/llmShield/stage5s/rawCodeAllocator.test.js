// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 5 — the raw-code allocator.
//
// RULING 1: A TABLE, NEVER ARITHMETIC. 5P's allocator states the reason in its own header — an
// offset map "silently re-numbers every later row the moment one is inserted, which is exactly the
// ripple that reddened CI on 4R and 4S". 5S allocates 38 codes at once, the largest band this repo
// has issued, so the rule matters more here than where it was written.
//
// The band is also checked as a SET, not a count (Q1-F002): `added` and `removed` are computed
// against the expected set and printed independently, because a count agrees with itself while two
// different codes swap places.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { VSI_ALLOCATED_HI } from "../../../../tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs";
import {
  VWQ_BAND_HI,
  VWQ_BAND_LO,
  VWQ_CLOSED_BAND,
  codeFor,
  outcomeFor,
} from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";

const SRC = "tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";
const codes = VWQ_CLOSED_BAND.map((r) => r.raw_code);

test("[5s-t5] the band is the exact SET 475..512, compared both ways", () => {
  const expected = new Set(Array.from({ length: 38 }, (_, i) => 475 + i));
  const actual = new Set(codes);
  const added = [...actual].filter((c) => !expected.has(c));
  const removed = [...expected].filter((c) => !actual.has(c));
  assert.deepEqual(added, [], `codes present but not expected: ${added}`);
  assert.deepEqual(removed, [], `codes expected but not present: ${removed}`);
  assert.equal(VWQ_CLOSED_BAND.length, 38);
});

test("[5s-t5] the band opens exactly one above 5P's high-water mark, IMPORTED not retyped", () => {
  assert.equal(VWQ_BAND_LO, VSI_ALLOCATED_HI + 1);
  assert.equal(VWQ_BAND_LO, 475);
  assert.equal(VWQ_BAND_HI, 512);
});

test("[5s-t5] the allocator contains no arithmetic — it is a table", () => {
  // COMMENTS ARE STRIPPED FIRST. The module's own header explains why arithmetic allocation is
  // forbidden, and it does so by writing the forbidden expression down. A scan over raw source
  // therefore matches the documentation warning against the very thing it is checking for — the
  // fourth occurrence of that species in this repository, and it is in the gotcha ledger.
  const raw = readFileSync(SRC, "utf8");
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  // Anti-vacuity: stripping must not be allowed to empty the thing under test.
  assert.ok(code.includes("VWQ_CLOSED_BAND"), "comment stripping removed the allocation itself");
  assert.ok(code.includes("raw_code:"), "comment stripping removed the table rows");

  for (const pattern of [/475\s*\+/, /BAND_LO\s*\+/, /\+\s*index/, /\+\s*idx/]) {
    assert.ok(!pattern.test(code), `arithmetic allocation found: ${pattern}`);
  }
});

test("[5s-t5] 512 is VWQ_UNKNOWN and it is LAST — the fail-closed wrapper", () => {
  const last = VWQ_CLOSED_BAND[VWQ_CLOSED_BAND.length - 1];
  assert.equal(last.raw_code, 512);
  assert.equal(last.policy_outcome, "VWQ_UNKNOWN");
  assert.equal(Math.max(...codes), 512);
});

test("[5s-t5] VWQ_EQUIVOCATION_DETECTED consumes NO raw code", () => {
  // It is a finding id and exits 0. A code here would make a detected fork look like a failure.
  assert.ok(!VWQ_CLOSED_BAND.some((r) => r.policy_outcome === "VWQ_EQUIVOCATION_DETECTED"));
});

test("[5s-t5] every code maps to exactly one outcome, and back", () => {
  assert.equal(new Set(VWQ_CLOSED_BAND.map((r) => r.policy_outcome)).size, 38);
  for (const row of VWQ_CLOSED_BAND) {
    assert.equal(codeFor(row.policy_outcome), row.raw_code);
    assert.equal(outcomeFor(row.raw_code), row.policy_outcome);
  }
});

test("[5s-t5] an unknown outcome allocates nothing rather than guessing", () => {
  assert.equal(codeFor("NOT_A_REAL_OUTCOME"), null);
  assert.equal(outcomeFor(9999), null);
});

test("[5s-t5] the table AGREES WITH THE FROZEN SPEC, parsed from §2.7", () => {
  // The spec is authority. If the table and §2.7 ever disagree, this is where it surfaces.
  const spec = readFileSync(
    "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md",
    "utf8"
  );
  const sec = spec.slice(
    spec.indexOf("### 2.7 Raw codes"),
    spec.indexOf("**`VWQ_EQUIVOCATION_DETECTED` consumes no raw code")
  );
  const fromSpec = [...sec.matchAll(/(\d{3}) `([A-Z0-9_]+)`/g)].map((m) => ({
    raw_code: Number(m[1]),
    policy_outcome: m[2],
  }));
  assert.equal(fromSpec.length, 38, "the spec no longer lists 38 codes");
  assert.deepEqual(
    VWQ_CLOSED_BAND.map((r) => ({ raw_code: r.raw_code, policy_outcome: r.policy_outcome })),
    fromSpec
  );
});
