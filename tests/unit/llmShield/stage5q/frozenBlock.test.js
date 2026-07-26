// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — the frozen-block extractor and its digest.
//
// §§2-5 of the 5Q spec are the four frozen objects. Freezing prose is only meaningful if the
// extraction is mechanical: a human saying "these sections are frozen" is a claim, while a command
// that pins their bytes is a receipt. This tests the extractor that produces those bytes.
//
// The two properties that matter are adversarial, not cosmetic:
//   1. changing ONE byte inside §§2-5 must change the digest;
//   2. changing text OUTSIDE §§2-5 must NOT change it — including the receipt fields in the freeze
//      block itself, which are written AFTER the digest is computed and would otherwise make the
//      digest unable to describe its own document.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  extractFrozenBlock,
  frozenBlockDigest,
  FROZEN_SECTION_IDS,
  FROZEN_BLOCK_DOMAIN,
} from "../../../../tools/simurgh-attestation/stage5q/core/frozenBlock.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const SPEC = join(
  ROOT,
  "docs/superpowers/specs/2026-07-26-stage-5q-vsr-stage-wide-red-team-design.md"
);
const spec = () => readFileSync(SPEC, "utf8");

test("the frozen block covers exactly sections 2 through 5", () => {
  assert.deepEqual(FROZEN_SECTION_IDS, ["§2", "§3", "§4", "§5"]);
});

test("extraction starts at §2 and stops before §6", () => {
  const block = extractFrozenBlock(spec());
  assert.match(block, /^## §2 FROZEN OBJECT 1/, "block must open at §2");
  assert.ok(block.includes("## §5 FROZEN OBJECT 4"), "block must reach §5");
  assert.ok(!block.includes("## §6 "), "block must stop before §6");
  assert.ok(!block.includes("## §1 "), "block must not reach back into §1");
});

test("all four frozen objects are inside the extracted block", () => {
  const block = extractFrozenBlock(spec());
  for (const obj of [
    "stage5_function_closure",
    "stage5_release_tag_closure",
    "stage5_attack_taxonomy",
    "stage5_finding_ledger_schema",
  ]) {
    assert.ok(block.includes(obj), `frozen object ${obj} missing from the block`);
  }
});

test("extraction is deterministic — two runs produce identical bytes", () => {
  const a = Buffer.from(extractFrozenBlock(spec()), "utf8");
  const b = Buffer.from(extractFrozenBlock(spec()), "utf8");
  assert.ok(a.equals(b), "extraction is not byte-stable");
});

test("the digest is domain-separated", () => {
  // A bare sha256 of the block would collide with any other document that happened to contain the
  // same bytes. The domain tag makes the digest mean "this is a 5Q frozen block", not "these bytes".
  assert.equal(FROZEN_BLOCK_DOMAIN, "simurgh.vsr.frozen-block.v1");
  const d = frozenBlockDigest(extractFrozenBlock(spec()));
  assert.match(d, /^[0-9a-f]{64}$/);
});

test("ONE byte changed INSIDE the frozen block changes the digest", () => {
  const original = spec();
  const before = frozenBlockDigest(extractFrozenBlock(original));
  // Flip a single character inside §4's taxonomy table.
  const mutated = original.replace("| R6    | Raw-code collision", "| R6    | Raw code collision");
  assert.notEqual(mutated, original, "mutation did not apply — the anchor text moved");
  const after = frozenBlockDigest(extractFrozenBlock(mutated));
  assert.notEqual(after, before, "a byte changed inside the frozen block did NOT move the digest");
});

test("text changed OUTSIDE the frozen block does NOT change the digest", () => {
  const original = spec();
  const before = frozenBlockDigest(extractFrozenBlock(original));
  // Append rather than replace. An earlier version rewrote the §15 heading, which coupled this test
  // to a real editable heading: the day someone legitimately edited §15, this test failed for a
  // reason that had nothing to do with the freeze. Appending is unambiguously outside §§2-5 and
  // cannot collide with anything.
  const mutated = `${original}\n<!-- appended after the freeze; must not move the digest -->\n`;
  assert.notEqual(mutated, original, "mutation did not apply");
  assert.equal(
    frozenBlockDigest(extractFrozenBlock(mutated)),
    before,
    "an edit outside the frozen block moved the digest"
  );
});

test("the receipt fields themselves are outside the frozen block", () => {
  // This is the property that makes the two-commit convention possible at all. freeze_commit and
  // freeze_digest are written AFTER the digest is computed; if they were inside the frozen block,
  // recording them would invalidate the very digest they record.
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

test("THE FREEZE GATE: the recorded freeze_digest matches the live frozen block", () => {
  // This is the test that makes the freeze real. Without it, freeze_digest is a number somebody
  // typed once; with it, any edit to §§2-5 fails CI and must instead go through an annex.
  const text = spec();
  const recorded = /freeze_digest\s+([0-9a-f]{64})/.exec(text);
  assert.ok(recorded, "the spec must record a freeze_digest");
  assert.equal(
    frozenBlockDigest(extractFrozenBlock(text)),
    recorded[1],
    "§§2-5 have changed since the freeze — amend by numbered annex, never in place"
  );

  const bytes = /frozen_bytes\s+(\d+)/.exec(text);
  assert.ok(bytes, "the spec must record frozen_bytes");
  assert.equal(
    Buffer.byteLength(extractFrozenBlock(text), "utf8"),
    Number(bytes[1]),
    "frozen byte count drifted from the recorded value"
  );
});

test("the freeze gate would CATCH a one-byte edit inside §§2-5", () => {
  // L4 in miniature: a gate that has never rejected anything is not known to work. Prove this one
  // rejects before trusting it to protect the freeze.
  const text = spec();
  const recorded = /freeze_digest\s+([0-9a-f]{64})/.exec(text)[1];
  const tampered = text.replace("| R6    | Raw-code collision", "| R6    | Raw-code  collision");
  assert.notEqual(tampered, text, "tamper anchor moved — rewrite this test");
  assert.notEqual(
    frozenBlockDigest(extractFrozenBlock(tampered)),
    recorded,
    "the freeze gate does not detect tampering inside the frozen sections"
  );
});

test("a spec missing the §2 anchor fails closed instead of digesting nothing", () => {
  assert.throws(
    () => extractFrozenBlock("# a document with no frozen sections\n"),
    /frozen block/i,
    "a missing anchor must throw, never silently return an empty block"
  );
});

test("a spec missing the §6 terminator fails closed", () => {
  const truncated = spec().split("## §6 ")[0];
  assert.throws(
    () => extractFrozenBlock(truncated),
    /terminator|§6/i,
    "an unterminated block must throw rather than swallow the rest of the document"
  );
});
