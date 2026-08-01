// SPDX-License-Identifier: AGPL-3.0-or-later
//
// A REPO-WIDE GUARD AGAINST TAMPERS THAT DO NOT TAMPER (finding 5S-F014).
//
// `x = "00" + x.slice(2)` leaves `x` UNCHANGED whenever it already begins "00". The verifier is
// then handed valid evidence and asked to reject it, it correctly accepts, and the test — which
// asserts a refusal — fails. Or worse, in the shapes where the assertion is weaker, it passes and
// certifies nothing at all.
//
// The probability matters less than the permanence. Over a freshly generated Ed25519 signature the
// accident is 1 in 256, so the test is merely flaky. Over a COMMITTED fixture the same accident is
// permanent: a tamper test that never tampers, green forever, indistinguishable from a working one.
// Measured across the repository's committed attestation fixtures at the time of writing, none was
// in that state — the defect was latent, not active. Latent is the reason to fix it: the day a
// fixture is regenerated and its signature happens to start with "00", nothing announces it.
//
// This guard DISCOVERS rather than enumerates, which is the Q1-F001 lesson: a hand-kept list of
// known sites is right the day it is written and silently wrong afterwards.
//
// NAMING THE PATTERN IS NOT USING IT. The first version of this guard could not tell a description
// from a use, so the day it met Stage 5S — a stage whose whole tamper matrix exists BECAUSE of this
// finding, and which therefore writes the defect down in prose — it reddened against four passages
// of documentation. That is the same quote/mention confusion the closeout claim gate and the
// toolchain-order guard each hit. Two rules follow, and both are narrow on purpose:
//
//   1. A match inside a COMMENT is not a use. Comments do not execute.
//   2. A match that the surrounding line ASSERTS IS A NO-OP is not a use — it is the defect being
//      demonstrated. `assert.equal("00" + x.slice(2), x)` cannot be a working tamper: a real tamper
//      site asserting its result still equals the original would be asserting its own uselessness.
//
// Neither rule can hide a real defect, because a real defect is executable and does not assert that
// it changed nothing. Both are exercised below against the shapes they must admit AND against a
// near-miss they must still catch.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

/** Source files worth scanning. Discovered from git, so a new file is covered the day it lands. */
function trackedSources() {
  return execFileSync("git", ["ls-files", "tests", "tools", "scripts"], { encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(js|mjs|cjs)$/.test(f));
}

/**
 * The banned shape: a constant prefix concatenated with `.slice(n)` of the SAME expression, with no
 * test of what that expression currently holds. `(x.startsWith("00") ? "11" : "00") + x.slice(2)`
 * is fine — the prefix depends on the value, so the result always differs.
 */
const BANNED = /(?<!\?\s)"([0-9a-fA-F]{2})"\s*\+\s*([A-Za-z_$][\w$.[\]]*)\.slice\(2\)/g;

/**
 * Index of the `//` that starts a line comment, or -1. Quote-aware, because the `//` inside a
 * string such as `"https://example"` must NOT exempt the rest of that line — that would be a false
 * negative, the direction that makes a guard blind, so it is worth the few lines.
 */
export function lineCommentStart(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "/" && line[i + 1] === "/") return i;
  }
  return -1;
}

/** True when `index` falls inside an unterminated block comment. */
function inBlockComment(text, index) {
  const before = text.slice(0, index);
  return before.lastIndexOf("/*") > before.lastIndexOf("*/");
}

/**
 * Scan one source text and return the offending `"XX" + expr.slice(2)` sites.
 *
 * Exported so the tests below can drive it over hand-written sources rather than only over the
 * repository: a guard whose logic is exercised only by a clean tree is a guard nobody has watched
 * work.
 */
export function findOffenders(text, file = "<memory>") {
  const lines = text.split("\n");
  const offenders = [];
  for (const m of text.matchAll(BANNED)) {
    const upto = text.slice(0, m.index);
    const lineNo = upto.split("\n").length;
    const col = m.index - (upto.lastIndexOf("\n") + 1);
    const src = lines[lineNo - 1];

    // Value-dependent forms mention the expression inside a conditional before the prefix.
    if (src.includes("startsWith") || src.includes("?")) continue;

    // Rule 1 — a comment is not a use.
    const cmt = lineCommentStart(src);
    if (cmt !== -1 && cmt < col) continue;
    if (inBlockComment(text, m.index)) continue;

    // Rule 2 — a line asserting the result EQUALS the original is demonstrating the no-op.
    const base = m[2];
    const after = src.slice(col + m[0].length);
    const mentionsBaseAgain = new RegExp(`\\b${base.replace(/[.[\]$]/g, "\\$&")}\\b`).test(after);
    if (/\bassert\.equal\(/.test(src) && mentionsBaseAgain) continue;

    offenders.push(`${file}:${lineNo}  "${m[1]}" + ${base}.slice(2)`);
  }
  return offenders;
}

test("[f014] no committed source tampers by concatenating a CONSTANT prefix", () => {
  const offenders = [];
  for (const file of trackedSources()) {
    // This file builds the pattern as executable test DATA — a scanner cannot distinguish its own
    // fixtures from the defect they imitate, and rules 1 and 2 deliberately do not try.
    if (file === "tests/unit/noopTamperGuard.test.js") continue;
    offenders.push(...findOffenders(readFileSync(file, "utf8"), file));
  }
  assert.deepEqual(
    offenders,
    [],
    `a tamper that may not tamper:\n  ${offenders.join("\n  ")}\n` +
      `use a value-dependent flip: (x.startsWith("00") ? "11" : "00") + x.slice(2)`
  );
});

test("[f014] the guard is not vacuous — it finds the shape when the shape is present", () => {
  // A scanner that matches nothing passes every repository, including a broken one. So the pattern
  // is exercised against a known-bad line here, in memory, every run.
  const bad = 'b.attestation.signature = "00" + b.attestation.signature.slice(2);';
  assert.equal(findOffenders(bad).length, 1, "the pattern no longer matches the defect");

  const good = 'b.sig = (b.sig.startsWith("00") ? "11" : "00") + b.sig.slice(2);';
  assert.equal(findOffenders(good).length, 0, "the repaired form is reported as an offender");
});

test("[f014] naming the pattern is not using it — comments are described, not executed", () => {
  const lineComment = '// `"00" + signature.slice(2)` is a NO-OP whenever it already begins `00`.';
  assert.deepEqual(findOffenders(lineComment), [], "a line comment was treated as a use");

  const blockComment = '/*\n * The idiom this refuses: "00" + x.slice(2)\n */\nconst a = 1;';
  assert.deepEqual(findOffenders(blockComment), [], "a block comment was treated as a use");

  // The exemption must not leak past the comment it belongs to.
  const codeAfterComment = '// explains "00" + a.slice(2)\nsig = "00" + sig.slice(2);';
  assert.equal(findOffenders(codeAfterComment).length, 1, "a real use on the NEXT line was missed");

  // A `//` inside a string must not exempt the rest of that line.
  const urlThenDefect = 'const u = "https://x"; sig = "00" + sig.slice(2);';
  assert.equal(findOffenders(urlThenDefect).length, 1, "a string containing // blinded the guard");
});

test("[f014] a demonstration that ASSERTS the no-op is admitted; a near-miss is not", () => {
  // Stage 5S keeps this executable so the reason `flipFirst` exists cannot be tidied away.
  const demo = 'assert.equal("00" + alreadyZero.slice(2), alreadyZero, "the no-op is real");';
  assert.deepEqual(findOffenders(demo), [], "the executable no-op demonstration was flagged");

  // The near-miss that keeps rule 2 honest: an `assert.equal` on the line, but the tampered value
  // is compared against something else entirely — that IS a tamper, and must still be caught.
  const realTamper = 'assert.equal(verify("00" + sig.slice(2)).code, EXPECTED_REJECTION);';
  assert.equal(findOffenders(realTamper).length, 1, "rule 2 admitted a real tamper site");
});

test("[f014] the repaired idiom actually changes every input, including the pathological one", () => {
  // The property the bare form lacks, asserted over the value that breaks it.
  const flip = (x) => (x.startsWith("00") ? "11" : "00") + x.slice(2);
  for (const input of ["00abcdef", "f2cc0d8c", "0000000000", "11ffffff", "abcdef00"]) {
    assert.notEqual(flip(input), input, `flip left ${input} unchanged`);
    assert.equal(flip(input).length, input.length, "the flip changed the length");
  }
  // And the bare form demonstrably does NOT, which is the whole finding.
  const bare = (x) => "00" + x.slice(2);
  assert.equal(bare("00abcdef"), "00abcdef", "the no-op is real");
});
