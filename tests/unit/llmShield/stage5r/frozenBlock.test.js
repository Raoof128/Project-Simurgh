// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — the frozen-block extractor and its digest.
//
// §§2-5 of the 5R spec are the four frozen objects (inherited commitment, family contract,
// admissibility rules, role archetypes). Freezing prose is only meaningful if the extraction is
// mechanical: a human saying "these sections are frozen" is a claim, a command that pins their bytes
// is a receipt.
//
// 5R's extractor is deliberately STRICTER than 5Q's. 5Q's located its anchors with `indexOf` and
// checked only that the opening anchor and the terminator existed. That accepts three documents it
// should refuse: one where §3 appears twice, one where §4 and §3 have swapped places, and one where
// §4 has been deleted outright — in each case the digest is stable, the gate is green, and it is
// describing something other than the four frozen objects. A freeze that cannot tell those apart is
// a freeze of whatever happens to lie between two strings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  extractFrozenBlock,
  frozenBlockDigest,
  canonicalSourceText,
  freezeReceipt,
  FROZEN_SECTION_IDS,
  FROZEN_BLOCK_DOMAIN,
} from "../../../../tools/simurgh-attestation/stage5r/core/frozenBlock.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const SPEC = join(
  ROOT,
  "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md"
);
const spec = () => readFileSync(SPEC, "utf8");

/** A minimal synthetic document with the same boundary shape as the real spec. */
function synthetic({ headings = ["§2", "§3", "§4", "§5", "§6"], body = "x" } = {}) {
  const title = (id) =>
    id === "§6" ? `## §6 Something after the freeze` : `## ${id} FROZEN OBJECT ${id.slice(1) - 1}`;
  return [
    "# doc",
    "",
    "## §1 Before",
    "",
    ...headings.flatMap((h) => [title(h), "", body, ""]),
  ].join("\n");
}

// ---- what the freeze covers -------------------------------------------------------------------

test("the frozen block covers exactly sections 2 through 5", () => {
  assert.deepEqual(FROZEN_SECTION_IDS, ["§2", "§3", "§4", "§5"]);
});

test("the domain tag is 5R's own, not inherited from 5Q", () => {
  // A digest must mean "this is a 5R frozen block", not merely "these bytes". Reusing 5Q's tag
  // would let a 5Q block and a 5R block collide in any context that stores only the digest.
  assert.equal(FROZEN_BLOCK_DOMAIN, "simurgh.vpf.frozen-block.v1");
  assert.notEqual(FROZEN_BLOCK_DOMAIN, "simurgh.vsr.frozen-block.v1");
});

test("extraction starts at §2 and stops before §6", () => {
  const block = extractFrozenBlock(spec());
  assert.match(block, /^## §2 FROZEN OBJECT 1/, "block must open at §2");
  assert.ok(block.includes("## §5 FROZEN OBJECT 4"), "block must reach §5");
  assert.ok(!block.includes("\n## §6 "), "block must stop before §6");
  assert.ok(!block.includes("## §1 "), "block must not reach back into §1");
});

test("all four frozen objects are inside the extracted block", () => {
  const block = extractFrozenBlock(spec());
  for (const obj of [
    "vpf_inherited_commitment",
    "vpf_family_contract",
    "vpf_admissibility_rules",
    "vpf_role_archetypes",
  ]) {
    assert.ok(block.includes(obj), `frozen object ${obj} missing from the block`);
  }
});

// ---- determinism ------------------------------------------------------------------------------

test("extraction is deterministic — two runs produce identical bytes", () => {
  const a = Buffer.from(extractFrozenBlock(spec()), "utf8");
  const b = Buffer.from(extractFrozenBlock(spec()), "utf8");
  assert.ok(a.equals(b), "extraction is not byte-stable");
  assert.equal(frozenBlockDigest(a.toString("utf8")), frozenBlockDigest(b.toString("utf8")));
});

test("freezeReceipt reports the digest and the byte count of the same bytes", () => {
  const r = freezeReceipt(spec());
  assert.match(r.digest, /^[0-9a-f]{64}$/);
  assert.equal(r.bytes, Buffer.byteLength(r.block, "utf8"));
  assert.equal(r.digest, frozenBlockDigest(r.block));
});

// ---- canonicalisation -------------------------------------------------------------------------

test("CRLF and CR line endings normalise to the same digest as LF", () => {
  const lf = spec();
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.notEqual(crlf, lf, "CRLF conversion did not apply");
  assert.equal(
    frozenBlockDigest(extractFrozenBlock(crlf)),
    frozenBlockDigest(extractFrozenBlock(lf)),
    "line-ending style changed the frozen digest"
  );
});

test("canonical text ends with exactly one trailing newline", () => {
  assert.equal(canonicalSourceText("a"), "a\n");
  assert.equal(canonicalSourceText("a\n"), "a\n");
  assert.ok(extractFrozenBlock(spec()).endsWith("\n"));
  assert.ok(!extractFrozenBlock(spec()).endsWith("\n\n"));
});

test("a BOM is REJECTED, never silently stripped", () => {
  // Stripping would let two materially different files digest identically.
  assert.throws(() => canonicalSourceText(`﻿# doc\n`), /BOM/i);
  assert.throws(() => extractFrozenBlock(`﻿${spec()}`), /BOM/i);
});

// ---- the two properties that make a freeze real ------------------------------------------------

test("ONE byte changed INSIDE the frozen block changes the digest", () => {
  const original = spec();
  const before = frozenBlockDigest(extractFrozenBlock(original));
  const mutated = original.replace(
    "There is no partial admissibility for a family.",
    "There is no partial admissibility for a  family."
  );
  assert.notEqual(mutated, original, "mutation did not apply — the anchor text moved");
  assert.notEqual(
    frozenBlockDigest(extractFrozenBlock(mutated)),
    before,
    "a byte changed inside the frozen block did NOT move the digest"
  );
});

test("text changed OUTSIDE the frozen block does NOT change the digest", () => {
  const original = spec();
  const before = frozenBlockDigest(extractFrozenBlock(original));
  const mutated = `${original}\n<!-- appended after the freeze; must not move the digest -->\n`;
  assert.notEqual(mutated, original, "mutation did not apply");
  assert.equal(
    frozenBlockDigest(extractFrozenBlock(mutated)),
    before,
    "an edit outside the frozen block moved the digest"
  );
});

test("the receipt fields themselves are outside the frozen block", () => {
  // This is what makes the two-commit ceremony possible at all: freeze_commit and freeze_digest are
  // written AFTER the digest is computed. Were they inside the span, recording them would invalidate
  // the very digest they record.
  const original = spec();
  const before = frozenBlockDigest(extractFrozenBlock(original));
  const mutated = original.replace(
    /freeze_digest\s+\S+/,
    "freeze_digest        0000000000000000000000000000000000000000000000000000000000000000"
  );
  assert.notEqual(mutated, original, "freeze_digest field not found to mutate");
  assert.equal(
    frozenBlockDigest(extractFrozenBlock(mutated)),
    before,
    "the freeze receipt fields are INSIDE the frozen block — the digest cannot describe its own document"
  );
});

// ---- fail closed: the four boundary defects ----------------------------------------------------

test("a document missing the §2 anchor fails closed instead of digesting nothing", () => {
  assert.throws(
    () => extractFrozenBlock("# a document with no frozen sections\n"),
    /§2|missing/i,
    "a missing anchor must throw, never silently return an empty block"
  );
});

test("a document missing the §6 terminator fails closed", () => {
  assert.throws(
    () => extractFrozenBlock(synthetic({ headings: ["§2", "§3", "§4", "§5"] })),
    /§6|terminator/i,
    "an unterminated block must throw rather than swallow the rest of the document"
  );
});

test("a DUPLICATE frozen-section heading fails closed", () => {
  // 5Q's indexOf-based extractor accepts this: it takes the first §2 and the first §6 and never
  // notices that §3 occurs twice, so the block silently covers a different span than it names.
  assert.throws(
    () => extractFrozenBlock(synthetic({ headings: ["§2", "§3", "§3", "§4", "§5", "§6"] })),
    /duplicate/i,
    "a duplicated section heading must fail closed"
  );
});

test("REORDERED frozen sections fail closed", () => {
  assert.throws(
    () => extractFrozenBlock(synthetic({ headings: ["§2", "§4", "§3", "§5", "§6"] })),
    /order/i,
    "sections out of document order must fail closed"
  );
});

test("a MISSING interior section fails closed even though §2 and §6 are both present", () => {
  assert.throws(
    () => extractFrozenBlock(synthetic({ headings: ["§2", "§3", "§5", "§6"] })),
    /§4|missing/i,
    "the extractor must verify every frozen section is present, not merely the boundaries"
  );
});

test("a MALFORMED heading is not accepted as an anchor", () => {
  // `### §2` and `##§2` are not the anchor. The extractor must refuse rather than guess.
  const doc = synthetic().replace("## §2 FROZEN OBJECT 1", "### §2 FROZEN OBJECT 1");
  assert.throws(() => extractFrozenBlock(doc), /§2|missing/i);
  const doc2 = synthetic().replace("## §3 FROZEN OBJECT 2", "##§3 FROZEN OBJECT 2");
  assert.throws(() => extractFrozenBlock(doc2), /§3|missing/i);
});

test("headings inside fenced code blocks are not anchors", () => {
  // The spec quotes its own structure in code fences. A quoted heading must not create a phantom
  // duplicate — and must not be mistaken for the real boundary either.
  const doc = synthetic().replace(
    "## §1 Before",
    ["## §1 Before", "", "```text", "## §2 FROZEN OBJECT 1", "```", ""].join("\n")
  );
  const block = extractFrozenBlock(doc);
  assert.match(block, /^## §2 FROZEN OBJECT 1/);
  assert.ok(!block.includes("```text"), "extraction started at the fenced copy, not the real §2");
});

test("digesting an empty block is refused", () => {
  assert.throws(() => frozenBlockDigest(""), /empty/i);
  assert.throws(() => extractFrozenBlock(""), /non-empty|string/i);
});

// ---- domain separation -------------------------------------------------------------------------

test("the digest is domain-separated and not a bare sha256 of the block", () => {
  const block = extractFrozenBlock(spec());
  const bare = createHash("sha256").update(Buffer.from(block, "utf8")).digest("hex");
  assert.notEqual(frozenBlockDigest(block), bare, "the domain tag is not in the preimage");
});
