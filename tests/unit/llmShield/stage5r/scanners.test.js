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
  bandValues,
  scanDocument,
  scanDocuments,
  literalVariants,
  stripComments,
  maskHexRuns,
  ALLOCATOR_PATH,
} from "../../../../tools/simurgh-attestation/stage5r/core/rawCodeScan.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

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
  assert.equal(hi, 474);
});

test("a source without the declaration fails closed rather than guessing a band", () => {
  assert.throws(() => readAllocatedHi("export const SOMETHING_ELSE = 12;"), /refusing to guess/);
});

test("the band covers the predecessor's allocated range", () => {
  const band = bandValues(474);
  assert.equal(band[0], 464);
  assert.equal(band.at(-1), 474);
  assert.equal(band.length, 11);
});

test("G10 catches a plain band literal", () => {
  const r = scanDocument({ path: "x.md", text: "the code is 470 here", band: bandValues(474) });
  assert.equal(r.ok, false);
  assert.equal(r.hits[0].value, 470);
});

test("G10 catches ENCODED variants — underscored, zero-padded and spaced", () => {
  for (const text of ["4_7_0", "0470", "4 7 0"]) {
    const r = scanDocument({ path: "x.md", text, band: bandValues(474) });
    assert.equal(r.ok, false, text);
  }
  assert.equal(literalVariants(470).length, 4);
});

test("G10 fires REGARDLESS of adjacent phrasing — the accident that saved the first draft", () => {
  // 5Q's census fired only when a band literal AND a stage-mention pattern both appeared, and this
  // spec's first draft passed it because it wrote the stage id without the completing word.
  const withoutMention = scanDocument({
    path: "x.md",
    text: "value 474 appears alone",
    band: bandValues(474),
  });
  assert.equal(withoutMention.ok, false, "no stage mention, still caught");
});

test("G10 ignores a number outside the band, and does not fire on substrings", () => {
  assert.equal(
    scanDocument({ path: "x.md", text: "475 is the next free value", band: bandValues(474) }).ok,
    true
  );
  assert.equal(
    scanDocument({ path: "x.md", text: "4740 and 14741", band: bandValues(474) }).ok,
    true
  );
  assert.equal(scanDocument({ path: "x.md", text: "1.470", band: bandValues(474) }).ok, true);
});

test("G10 strips comments before scanning, so documentation about the rule is not a violation", () => {
  const text = "<!-- never write 470 in prose -->\nThe rule is described without printing it.";
  assert.equal(scanDocument({ path: "x.md", text, band: bandValues(474) }).ok, true);
  assert.ok(!stripComments(text).includes("470"));
});

test("G10 does NOT fire inside a hex digest — the false positive it found in its own spec", () => {
  // Discovered by running this gate against 5R's own spec: 466 sits inside the attack-taxonomy
  // digest c466c77. A digit-boundary check cannot see that, because the neighbours are hex LETTERS.
  // This repository is made of digests, so an unmasked scanner would hit almost every document and
  // be switched off — which is how a real gate dies.
  const digest = "f5e03d1193263afc7966263c466c7794cd2c1d7dd8105e45e1e5124103c5f2e7";
  const r = scanDocument({ path: "x.md", text: `taxonomy ${digest}`, band: bandValues(474) });
  assert.equal(r.ok, true, JSON.stringify(r.hits));
  assert.equal(maskHexRuns(digest).trim(), "");
  // A real literal on the same line is still caught.
  const both = scanDocument({
    path: "x.md",
    text: `taxonomy ${digest} and code 470`,
    band: bandValues(474),
  });
  assert.equal(both.ok, false);
  assert.equal(both.hits[0].value, 470);
});

test("G10 passes over 5R's own committed documents", () => {
  const documents = [
    "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md",
    "docs/superpowers/plans/2026-07-27-stage-5r-vpf-implementation-plan.md",
  ].map((p) => ({ path: p, text: read(p) }));
  const r = scanDocuments({ documents, band: bandValues(readAllocatedHi(read(ALLOCATOR_PATH))) });
  assert.equal(r.ok, true, JSON.stringify(r.hits, null, 2));
});

test("G10's anti-vacuity assertion fires if stripping eats the canary", () => {
  const doc = { path: "x.md", text: "/* CANARY-TOKEN */" };
  assert.throws(
    () => scanDocuments({ documents: [doc], band: [1], canary: "CANARY-TOKEN" }),
    /vacuous/
  );
});
