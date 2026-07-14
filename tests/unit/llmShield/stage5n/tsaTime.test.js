// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — TSA parse against the REAL banked capture (start.tsr/end.tsr). Skips if the capture is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { parseTsaReply } from "../../../../tools/simurgh-attestation/stage5n/node/tsaTime.mjs";

const CAP = "/Users/raoof.r12/Desktop/Raouf/test/stage5n-gate-capture";
const have = existsSync(`${CAP}/start.tsr`) && existsSync(`${CAP}/D_start.hex`);

test("start.tsr imprint == D_start, genTime parses to ms", { skip: !have }, () => {
  const D_start = readFileSync(`${CAP}/D_start.hex`, "utf8").trim();
  const r = parseTsaReply(`${CAP}/start.tsr`);
  assert.equal(r.subject_extractable, true);
  assert.equal(r.imprintHex, D_start, "TSA imprint binds the start subject");
  assert.ok(
    Number.isSafeInteger(r.genTime_ms) && r.genTime_ms > 1_700_000_000_000,
    `genTime_ms ${r.genTime_ms}`
  );
});

test("end.tsr imprint == D_end, later genTime than start", { skip: !have }, () => {
  const D_end = readFileSync(`${CAP}/D_end.hex`, "utf8").trim();
  const s = parseTsaReply(`${CAP}/start.tsr`);
  const e = parseTsaReply(`${CAP}/end.tsr`);
  assert.equal(e.imprintHex, D_end);
  assert.ok(e.genTime_ms >= s.genTime_ms, "end token not before start token");
});

test("parse failure on a missing file is a typed fact, not a throw", () => {
  const r = parseTsaReply(`${CAP}/does-not-exist.tsr`);
  assert.equal(r.subject_extractable, false);
});
