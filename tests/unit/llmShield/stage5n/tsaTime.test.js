// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — TSA parse against the REAL banked capture (start.tsr/end.tsr).
//
// NO SKIPS (5S-F007). See `realEvidence.mjs`: committed evidence resolves from the module, and its
// absence is a refusal rather than a skip.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTsaReply } from "../../../../tools/simurgh-attestation/stage5n/node/tsaTime.mjs";

import {
  REAL_EVIDENCE_DIR,
  realEvidencePath,
  requireRealEvidence,
} from "../../../../tools/simurgh-attestation/stage5n/node/realEvidence.mjs";
import { join } from "node:path";

requireRealEvidence();

test("start.tsr imprint == D_start, genTime parses to ms", () => {
  const D_start = readFileSync(realEvidencePath("D_start_hex"), "utf8").trim();
  const r = parseTsaReply(realEvidencePath("start_tsr"));
  assert.equal(r.subject_extractable, true);
  assert.equal(r.imprintHex, D_start, "TSA imprint binds the start subject");
  assert.ok(
    Number.isSafeInteger(r.genTime_ms) && r.genTime_ms > 1_700_000_000_000,
    `genTime_ms ${r.genTime_ms}`
  );
});

test("end.tsr imprint == D_end, later genTime than start", () => {
  const D_end = readFileSync(realEvidencePath("D_end_hex"), "utf8").trim();
  const s = parseTsaReply(realEvidencePath("start_tsr"));
  const e = parseTsaReply(realEvidencePath("end_tsr"));
  assert.equal(e.imprintHex, D_end);
  assert.ok(e.genTime_ms >= s.genTime_ms, "end token not before start token");
});

test("parse failure on a missing file is a typed fact, not a throw", () => {
  const r = parseTsaReply(join(REAL_EVIDENCE_DIR, "does-not-exist.tsr"));
  assert.equal(r.subject_extractable, false);
});
