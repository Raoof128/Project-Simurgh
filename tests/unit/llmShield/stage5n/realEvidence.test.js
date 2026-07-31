// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5N — the permanent regression guard for 5S-F007.
//
// THE DEFECT, STATED PRECISELY: a historical verification-path defect discovered during Stage 5S
// execution. The committed 5N evidence existed, but eight tests skipped because they referenced an
// absent machine-local ceremony directory. That is more serious than "tests were skipped" and
// narrower than "the evidence was invalid" — the evidence had simply been left behind while the
// camera stared at an empty chair.
//
// WHAT THIS FILE HOLDS, so the defect cannot recur in any of the shapes it could take:
//
//   * no test path may resolve through a user home or through `process.cwd()`;
//   * the committed file set is pinned BOTH WAYS, so a rename is loud;
//   * an absent required capture REFUSES rather than skips — seeded and watched going red;
//   * corrupted evidence is caught rather than parsed into a green — seeded for both .ots and .tsr;
//   * the real-evidence suite is executed and asserted to report ZERO skips.
//
// The last one is the load-bearing assertion. Every other guard here can be satisfied by a suite that
// silently stopped running; only counting the skips catches that.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import test from "node:test";

import { parseTsaReply } from "../../../../tools/simurgh-attestation/stage5n/node/tsaTime.mjs";
import { verifyOtsOffline } from "../../../../tools/simurgh-attestation/stage5n/node/otsVerify.mjs";
import {
  REAL_EVIDENCE_DIR,
  REAL_EVIDENCE_FILES,
  REAL_EVIDENCE_LISTING,
  REPO_ROOT,
  auditRealEvidence,
  realEvidencePath,
  requireRealEvidence,
} from "../../../../tools/simurgh-attestation/stage5n/node/realEvidence.mjs";

/** The three files that read the real committed ceremony evidence. */
const REAL_EVIDENCE_SUITE = Object.freeze([
  "tests/unit/llmShield/stage5n/otsVerify.test.js",
  "tests/unit/llmShield/stage5n/tsaTime.test.js",
  "tests/unit/llmShield/stage5n/endpointQuorum.test.js",
]);

/** A scratch copy of the committed evidence, so a seed can damage it without touching the tree. */
function damagedCopy(mutate) {
  const dir = mkdtempSync(join(tmpdir(), "stage5n-evidence-"));
  cpSync(REAL_EVIDENCE_DIR, dir, { recursive: true });
  mutate(dir);
  return dir;
}

test("[5n-f007] the committed capture is intact — required, pinned, and nothing unexpected", () => {
  const audit = auditRealEvidence();
  assert.deepEqual(audit.missing, [], "a required committed capture is absent");
  assert.deepEqual(audit.removed, [], "a pinned file was deleted or renamed");
  assert.deepEqual(audit.extra, [], "an undeclared file appeared in the ceremony directory");
  assert.equal(audit.ok, true);
});

test("[5n-f007] evidence resolves from the MODULE, never from a home directory or the cwd", () => {
  // The defect in one assertion: the old path was `/Users/<someone>/Desktop/...`, which exists on
  // exactly one machine and existed on none by the time anybody looked.
  assert.ok(REAL_EVIDENCE_DIR.startsWith(REPO_ROOT), "evidence resolved outside the repository");
  assert.ok(
    !/\/Users\/|\/home\/|\/Desktop\//.test(REAL_EVIDENCE_DIR.slice(REPO_ROOT.length)),
    `evidence path reaches into a home directory: ${REAL_EVIDENCE_DIR}`
  );
  for (const logical of Object.keys(REAL_EVIDENCE_FILES)) {
    assert.ok(realEvidencePath(logical).startsWith(REAL_EVIDENCE_DIR));
  }
});

test("[5n-f007] no 5N test resolves evidence through a home directory", () => {
  // Scanned over source, because a path constant that is never exercised on this machine is exactly
  // how the original defect survived review.
  for (const file of readdirSync("tests/unit/llmShield/stage5n").filter((f) =>
    f.endsWith(".test.js")
  )) {
    const src = readFileSync(join("tests/unit/llmShield/stage5n", file), "utf8");
    const code = src
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert.ok(
      !/["'`]\/Users\/|["'`]\/home\//.test(code),
      `${file} resolves a path through a home directory`
    );
  }
});

test("[5n-f007] the file set is pinned BOTH WAYS — a rename is loud, not silent", () => {
  const onDisk = new Set(
    readdirSync(REAL_EVIDENCE_DIR)
      .filter((f) => !f.startsWith("."))
      .sort()
  );
  const pinned = new Set(REAL_EVIDENCE_LISTING);
  assert.deepEqual(
    [...onDisk].filter((f) => !pinned.has(f)),
    [],
    "added but not declared"
  );
  assert.deepEqual(
    [...pinned].filter((f) => !onDisk.has(f)),
    [],
    "declared but not present"
  );
  assert.equal(REAL_EVIDENCE_LISTING.length, onDisk.size);
});

test("[5n-f007] SEEDED RED — an absent required capture REFUSES, it does not skip", () => {
  const dir = damagedCopy((d) => rmSync(join(d, REAL_EVIDENCE_FILES.start_ots)));
  try {
    const audit = auditRealEvidence(dir);
    assert.deepEqual(audit.missing, ["start.confirmed.ots"]);
    assert.equal(audit.ok, false);
    assert.throws(() => requireRealEvidence(dir), /REFUSAL, never a skip/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[5n-f007] SEEDED RED — a RENAMED capture is caught, which is how this defect began", () => {
  const dir = damagedCopy((d) => {
    cpSync(join(d, "start.confirmed.ots"), join(d, "D_start.ots"));
    rmSync(join(d, "start.confirmed.ots"));
  });
  try {
    const audit = auditRealEvidence(dir);
    assert.ok(audit.missing.includes("start.confirmed.ots"));
    assert.ok(audit.extra.includes("D_start.ots"));
    assert.throws(() => requireRealEvidence(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[5n-f007] SEEDED RED — corrupting the BITCOIN branch changes the attestation", () => {
  // WHAT THIS DOES AND DOES NOT CLAIM. `verifyOtsOffline` states its own bound in its header: it
  // proves the leaf equals D and that D deterministically reaches a DECLARED Bitcoin merkle root at a
  // claimed height. Whether that height and root are on the canonical chain is a committed
  // verifier_config checkpoint — stated, not hidden. So `confirmed: true` is a structural fact, and a
  // test asserting "any corrupted byte must de-confirm" would be asserting something the verifier
  // never claimed. Measured over all 1462 single-byte flips of the real proof:
  //
  //     212  de-confirm outright
  //     966  stay confirmed but report a DIFFERENT height or merkle root
  //     284  change nothing — and every one of them lands in the pending/calendar branches around
  //          offsets 68-460, which carry no Bitcoin claim at all
  //
  // The sharp property, and the one worth guarding, is the last column: corruption of the Bitcoin
  // branch must never silently reproduce the honest attestation.
  const good = readFileSync(realEvidencePath("start_ots"));
  const subject = readFileSync(realEvidencePath("D_start_hex"), "utf8").trim();
  const base = verifyOtsOffline(good, subject);
  assert.equal(base.confirmed, true, "the honest baseline is confirmed");
  assert.equal(base.leaf_ok, true);
  const honest = JSON.stringify(base.attestations);

  const BITCOIN_BRANCH_FROM = 470; // past the last pending branch, measured above
  let silent = 0;
  for (let i = BITCOIN_BRANCH_FROM; i < good.length; i += 1) {
    const corrupted = Buffer.from(good);
    corrupted[i] ^= 0xff;
    const r = verifyOtsOffline(corrupted, subject);
    if (r.confirmed === true && JSON.stringify(r.attestations) === honest) silent += 1;
  }
  assert.equal(silent, 0, `${silent} Bitcoin-branch corruptions reproduced the honest attestation`);
});

test("[5n-f007] the offline verifier's confirmation is STRUCTURAL, and says so", () => {
  // Guard against the overclaim rather than the corruption: nothing in this suite may be read as
  // proof that the attested root is on the canonical Bitcoin chain. That residual pin is committed
  // configuration, and the day someone deletes the sentence saying so, this goes red.
  // Comment prefixes and line wrapping are normalised first: the sentence is wrapped across two
  // comment lines, and a naive scan would report the claim missing when only the margin moved.
  const src = readFileSync("tools/simurgh-attestation/stage5n/node/otsVerify.mjs", "utf8")
    .replace(/^\s*\/\/ ?/gm, "")
    .replace(/\s+/g, " ");
  assert.match(src, /residual pin/i);
  assert.match(src, /canonical chain/i);
  assert.match(src, /no network/i);
});

test("[5n-f007] SEEDED RED — corrupting the IMPRINT region breaks the subject binding", () => {
  // Same discipline as the .ots case. `parseTsaReply` extracts the imprint; it does not validate the
  // TSA certificate chain, so a flipped byte in the signature or certificate region legitimately
  // leaves the imprint intact. The property worth guarding is the binding itself: corrupt the 32
  // imprint bytes and the parser must stop reporting the honest subject.
  const subject = readFileSync(realEvidencePath("D_start_hex"), "utf8").trim();
  const good = parseTsaReply(realEvidencePath("start_tsr"));
  assert.equal(good.subject_extractable, true);
  assert.equal(good.imprintHex, subject, "the honest baseline binds the subject");

  const bytes = readFileSync(realEvidencePath("start_tsr"));
  const at = bytes.indexOf(Buffer.from(subject, "hex"));
  assert.ok(at >= 0, "the imprint is not present in the TSA reply as raw bytes");

  const dir = damagedCopy((d) => {
    const path = join(d, REAL_EVIDENCE_FILES.start_tsr);
    const b = readFileSync(path);
    b[at] ^= 0xff;
    writeFileSync(path, b);
  });
  try {
    const r = parseTsaReply(join(dir, REAL_EVIDENCE_FILES.start_tsr));
    assert.notEqual(r.imprintHex, subject, "a corrupted imprint still reported the honest subject");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("[5n-f007] the real-evidence suite EXECUTES and reports ZERO skips", () => {
  // The assertion the other guards cannot make for themselves. Everything above stays green over a
  // suite that quietly stopped running; only counting executed outcomes catches that.
  // NODE_TEST_CONTEXT MUST BE STRIPPED. A `node --test` child that inherits it sees itself as a
  // nested run, warns "skipping running files", and emits NOTHING — so every count below would read
  // NaN. That is how a skip-counter becomes the very thing it was written to catch.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const out = execFileSync(process.execPath, ["--test", ...REAL_EVIDENCE_SUITE], {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env,
  });
  const read = (label) =>
    Number(new RegExp(`^[#\u2139] ${label} (\\d+)$`, "m").exec(out)?.[1] ?? NaN);

  assert.equal(read("skipped"), 0, `the real-evidence suite skipped tests:\n${out}`);
  assert.equal(read("todo"), 0);
  assert.equal(read("fail"), 0);
  assert.ok(read("pass") >= 10, `only ${read("pass")} real-evidence tests executed`);
});
