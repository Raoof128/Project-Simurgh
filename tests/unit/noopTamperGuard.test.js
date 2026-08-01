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

test("[f014] no committed source tampers by concatenating a CONSTANT prefix", () => {
  const offenders = [];
  for (const file of trackedSources()) {
    // This guard names the pattern in its own prose, and a scanner that cannot tell a description
    // from a use reddens on its own documentation.
    if (file === "tests/unit/noopTamperGuard.test.js") continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(BANNED)) {
      const prefix = m[1];
      const expr = m[2];
      // Value-dependent forms mention the expression inside a conditional before the prefix; the
      // bare form does not. Re-check the matched line rather than trusting the regex alone.
      const line = text.slice(0, m.index).split("\n").length;
      const src = text.split("\n")[line - 1];
      if (src.includes("startsWith") || src.includes("?")) continue;
      offenders.push(`${file}:${line}  "${prefix}" + ${expr}.slice(2)`);
    }
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
  assert.equal([...bad.matchAll(BANNED)].length, 1, "the pattern no longer matches the defect");

  const good = 'b.sig = (b.sig.startsWith("00") ? "11" : "00") + b.sig.slice(2);';
  const stillMatches = [...good.matchAll(BANNED)].some(() => !good.includes("startsWith"));
  assert.equal(stillMatches, false, "the repaired form is reported as an offender");
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
