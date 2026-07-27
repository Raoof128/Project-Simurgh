// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 13: the two independent scanners, G7 and G10.
//
// They are separate on purpose. An earlier matrix listed G10 and nothing built it, so P3 was false:
// a gate can appear in a table and exist nowhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  scanProse,
  scanAll,
  Q0_PUBLISHED_PERCENT,
} from "../../../../tools/simurgh-attestation/stage5r/core/prose.mjs";
import {
  readAllocatedHi,
  bandFromAllocator,
  scanDocument,
  scanDocuments,
  literalVariants,
  stripComments,
  maskHexRuns,
  ALLOCATOR_PATH,
} from "../../../../tools/simurgh-attestation/stage5r/core/rawCodeScan.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
/** The band is DERIVED from the allocator, never written here — this file is scanned by G10 too. */
const BAND = bandFromAllocator(read("tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs"));
const LO = BAND[0];
const HI = BAND.at(-1);

// ---- G7: the prose gate ------------------------------------------------------------------------------

test("G7 permits the figure 5Q actually published", () => {
  const r = scanProse({ path: "x.md", text: "5Q shipped 6.2% with the denominator intact." });
  assert.equal(r.ok, true);
  assert.equal(Q0_PUBLISHED_PERCENT, "6.2");
});

test("G7 CATCHES a post-5Q figure attributed to 5Q", () => {
  const r = scanProse({ path: "x.md", text: "After this stage, 5Q reached 11.4% coverage." });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].percent, "11.4");
  assert.match(r.violations[0].excerpt, /5Q/);
});

test("G7 catches the reversed word order too", () => {
  const r = scanProse({ path: "x.md", text: "A cumulative 9.9% for 5Q." });
  assert.equal(r.ok, false);
  assert.equal(r.violations[0].percent, "9.9");
});

test("G7 does not match its own explanation once comments are stripped", () => {
  const text = [
    "<!-- a forbidden sentence looks like: 5Q reached 12.0% -->",
    "// and in code: 5Q reached 12.0%",
    "The stage publishes 5R cumulative separately from 5Q's 6.2%.",
  ].join("\n");
  assert.equal(scanProse({ path: "x.md", text }).ok, true);
});

test("G7's anti-vacuity assertion fires if stripping eats the canary", () => {
  // A scanner that strips everything finds nothing and reports success.
  const doc = { path: "x.md", text: "<!-- CANARY-TOKEN lives only in a comment -->" };
  assert.throws(() => scanAll({ documents: [doc], canary: "CANARY-TOKEN" }), /vacuous/);
});

test("G7 passes over 5R's own committed documents", () => {
  const documents = [
    "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md",
    "docs/superpowers/plans/2026-07-27-stage-5r-vpf-implementation-plan.md",
  ].map((p) => ({ path: p, text: read(p) }));
  const r = scanAll({ documents, canary: "5R cumulative" });
  assert.equal(r.ok, true, JSON.stringify(r.violations, null, 2));
  assert.equal(r.scanned, 2);
});

// ---- G10: the raw-code gate ---------------------------------------------------------------------------

test("the band is READ from the allocator's source, never imported", () => {
  // §2.4 forbids importing a stage5{a..q} module. Reading a predecessor's file as data is not
  // importing it: an import executes, a read does not.
  const hi = readAllocatedHi(read(ALLOCATOR_PATH));
  assert.ok(Number.isInteger(hi) && hi > 0);
  assert.equal(hi, HI);
});

test("a source without the declaration fails closed rather than guessing a band", () => {
  assert.throws(() => readAllocatedHi("export const SOMETHING_ELSE = 12;"), /refusing to guess/);
});

test("the band is derived from the allocator, and this file prints none of it", () => {
  // This test file is itself scanned by the predecessor's raw-code census, so it may not write a
  // band value either — which is how the first version of it failed.
  assert.ok(BAND.length >= 10);
  assert.equal(
    HI,
    readAllocatedHi(read(ALLOCATOR_PATH)),
    "the top of the band is the declared bound"
  );
  assert.deepEqual(
    BAND,
    [...BAND].sort((a, b) => a - b)
  );
  assert.equal(new Set(BAND).size, BAND.length, "the band is a set");
  assert.equal(LO, Math.min(...BAND));
  assert.throws(() => bandFromAllocator("no codes here"), /refusing to guess/);
});

test("G10 catches a plain band literal", () => {
  const r = scanDocument({ path: "x.md", text: `the code is ${BAND[6]} here`, band: BAND });
  assert.equal(r.ok, false);
  assert.equal(r.hits[0].value, BAND[6]);
});

test("G10 catches ENCODED variants — underscored, zero-padded and spaced", () => {
  const v = String(BAND[6]).split("");
  for (const text of [v.join("_"), `0${v.join("")}`, v.join(" ")]) {
    const r = scanDocument({ path: "x.md", text, band: BAND });
    assert.equal(r.ok, false, text);
  }
  assert.equal(literalVariants(BAND[6]).length, 4);
});

test("G10 fires REGARDLESS of adjacent phrasing — the accident that saved the first draft", () => {
  // 5Q's census fired only when a band literal AND a stage-mention pattern both appeared, and this
  // spec's first draft passed it because it wrote the stage id without the completing word.
  const withoutMention = scanDocument({
    path: "x.md",
    text: `value ${HI} appears alone`,
    band: BAND,
  });
  assert.equal(withoutMention.ok, false, "no stage mention, still caught");
});

test("G10 ignores a number outside the band, and does not fire on substrings", () => {
  assert.equal(
    scanDocument({ path: "x.md", text: `${HI + 1} is the next free value`, band: BAND }).ok,
    true
  );
  assert.equal(scanDocument({ path: "x.md", text: `${HI}0 and 1${HI}1`, band: BAND }).ok, true);
  assert.equal(scanDocument({ path: "x.md", text: `1.${BAND[6]}`, band: BAND }).ok, true);
});

test("G10 strips comments before scanning, so documentation about the rule is not a violation", () => {
  const text = `<!-- never write ${BAND[6]} in prose -->\nThe rule is described without printing it.`;
  assert.equal(scanDocument({ path: "x.md", text, band: BAND }).ok, true);
  assert.ok(!stripComments(text).includes(String(BAND[6])));
});

test("G10 does NOT fire inside a hex digest — the false positive it found in its own spec", () => {
  // Discovered by running this gate against 5R's own spec: one allocated code sits inside the
  // attack-taxonomy digest. A digit-boundary check cannot see that: the neighbours are hex LETTERS.
  // This repository is made of digests, so an unmasked scanner would hit almost every document and
  // be switched off — which is how a real gate dies.
  const digest = "f5e03d1193263afc7966263c466c7794cd2c1d7dd8105e45e1e5124103c5f2e7";
  const r = scanDocument({ path: "x.md", text: `taxonomy ${digest}`, band: BAND });
  assert.equal(r.ok, true, JSON.stringify(r.hits));
  assert.equal(maskHexRuns(digest).trim(), "");
  // A real literal on the same line is still caught.
  const both = scanDocument({
    path: "x.md",
    text: `taxonomy ${digest} and code ${BAND[6]}`,
    band: BAND,
  });
  assert.equal(both.ok, false);
  assert.equal(both.hits[0].value, BAND[6]);
});

test("G10 passes over 5R's own committed documents", () => {
  const documents = [
    "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md",
    "docs/superpowers/plans/2026-07-27-stage-5r-vpf-implementation-plan.md",
  ].map((p) => ({ path: p, text: read(p) }));
  const r = scanDocuments({ documents, band: BAND });
  assert.equal(r.ok, true, JSON.stringify(r.hits, null, 2));
});

test("G10's anti-vacuity assertion fires if stripping eats the canary", () => {
  const doc = { path: "x.md", text: "/* CANARY-TOKEN */" };
  assert.throws(
    () => scanDocuments({ documents: [doc], band: [1], canary: "CANARY-TOKEN" }),
    /vacuous/
  );
});
