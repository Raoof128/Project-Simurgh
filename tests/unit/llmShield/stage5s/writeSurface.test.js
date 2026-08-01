// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 2 — the write surface.
//
// Ruling 7: authority is READ, never declared in the commit it judges. The surface is parsed out of
// the spec (§6.2 for the stage's own paths, Annex M for the three ripple paths) so there is exactly
// one copy of the declaration and it lives where a reviewer looks.
//
// Annex M is deliberately narrow: six paths, `modify` only. `add` on a Stage 4H path is a
// different act — creating a golden is not rippling one — and is refused. The fourth row is the
// LEDGER SOURCE, added by its own authority commit once Task 5 found that the annex authorised the
// three projections while forbidding the file that generates them (finding 5S-F005).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SURFACE_REFUSALS as R,
  judgeChanges,
  parseAnnexM,
  parseStageSurface,
} from "../../../../tools/simurgh-attestation/stage5s/core/writeSurface.mjs";

const SPEC = "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md";
const specText = readFileSync(SPEC, "utf8");

const RIPPLE = "tests/unit/llmShield/stage4h/exitWrapper.test.js";
const surface = () => [...parseStageSurface(specText), ...parseAnnexM(specText)];
const judge = (changed, over = {}) =>
  judgeChanges({ entries: surface(), changed, rangeCommitCount: 2, dirty: [], ...over });
const reasons = (v) => v.refusals.map((r) => r.reason);

test("[5s-t2] Annex M is PARSED from the spec, not re-declared in code", () => {
  const rows = parseAnnexM(specText);
  assert.equal(rows.length, 6, `expected 6 ripple paths, parsed ${rows.length}`);
  for (const r of rows) {
    assert.equal(r.allowed_operation, "modify", `${r.path} is not modify-only`);
    assert.match(r.id, /^5S-M\d{3}$/);
    assert.notEqual(r.purpose.trim(), "");
  }
  assert.ok(rows.some((r) => r.path === RIPPLE));
});

test("[5s-t2] mutating the spec text changes the parsed surface", () => {
  // Proves the parse is real. A hardcoded list would pass every other test in this file.
  //
  // replaceAll, not replace: the path also appears in §2.10's prose, so replacing the FIRST
  // occurrence mutates the paragraph and leaves the table it claims to be testing untouched. The
  // first draft of this test passed against a hardcoded list for exactly that reason.
  const mutated = specText.replaceAll(RIPPLE, "tests/unit/llmShield/stage4h/somethingElse.test.js");
  assert.ok(!parseAnnexM(mutated).some((r) => r.path === RIPPLE));
  assert.equal(parseAnnexM(mutated).length, 6, "the row should be rewritten, not removed");
});

test("[5s-t2] parsing is bounded to Annex M's own section", () => {
  const decoy = "## Annex Q\n\n| `evil/path.js` | modify | p | 5S-M009 |\n";
  assert.ok(!parseAnnexM(decoy).some((r) => r.path === "evil/path.js"));
});

test("[5s-t2] a 5S-owned path is accepted", () => {
  assert.equal(
    judge([{ path: "tools/simurgh-attestation/stage5s/core/quorum.mjs", op: "add" }]).ok,
    true
  );
});

test("[5s-t2] a path outside the surface is refused", () => {
  const v = judge([{ path: "src/llmShield.js", op: "modify" }]);
  assert.equal(v.ok, false);
  assert.deepEqual(reasons(v), [R.PATH_NOT_IN_SURFACE]);
});

test("[5s-t2] the three Annex M paths are permitted under modify", () => {
  assert.equal(judge([{ path: RIPPLE, op: "modify" }]).ok, true);
});

test("[5s-t2] an Annex M path under ADD is refused — a ripple modifies, it does not create", () => {
  const v = judge([{ path: RIPPLE, op: "add" }]);
  assert.equal(v.ok, false);
  assert.deepEqual(reasons(v), [R.OPERATION_NOT_PERMITTED]);
});

test("[5s-t2] a prior-stage evidence path NOT in Annex M is refused", () => {
  const v = judge([
    { path: "docs/research/llm-shield/evidence/stage-5r/campaign/attempt-log.json", op: "modify" },
  ]);
  assert.equal(v.ok, false);
  assert.deepEqual(reasons(v), [R.PATH_NOT_IN_SURFACE]);
});

test("[5s-t2] an empty change set with a dirty tree is a REFUSAL, not a pass", () => {
  // Q1-F004: the gate that evaluated an empty range while work sat uncommitted, and printed green.
  const v = judge([], {
    rangeCommitCount: 0,
    dirty: ["tools/simurgh-attestation/stage5s/core/x.mjs"],
  });
  assert.equal(v.ok, false);
  assert.ok(reasons(v).includes(R.UNCOMMITTED_NOT_EVALUATED));
});

test("[5s-t2] an empty change set with a CLEAN tree is not a refusal", () => {
  assert.equal(judge([], { rangeCommitCount: 0, dirty: [] }).ok, true);
});

test("[5s-t2] private key material is refused BY PATH REGEX, digits and all", () => {
  // 5P's lesson: the audit allowlist keyed on digit-free filenames, so `key2.pem` slipped a class
  // of names nobody intended to allow. Match on the path shape, not on a naming convention.
  for (const p of [
    "tools/simurgh-attestation/stage5s/signer/5s-ed25519.pem",
    "tools/simurgh-attestation/stage5s/signer/key9.key",
    "tools/simurgh-attestation/stage5s/fixtures/id_rsa",
  ]) {
    const v = judge([{ path: p, op: "add" }]);
    assert.equal(v.ok, false, `${p} was not refused`);
    assert.ok(reasons(v).includes(R.PRIVATE_KEY_MATERIAL), `${p} refused for the wrong reason`);
  }
});

test("[5s-t2] every refusal is reported, not just the first", () => {
  const v = judge([
    { path: "src/llmShield.js", op: "modify" },
    { path: RIPPLE, op: "add" },
  ]);
  assert.equal(v.ok, false);
  assert.equal(v.refusals.length, 2);
});

// ---------------------------------------------------------------- the public-key exemption
//
// A public key is a `.pem` and every stage commits one, so the path rule alone refused legitimate
// evidence — it fired on Stage 5S's own `vwq-public-key.pem`. The exemption is decided by CONTENT,
// never by name: a filename rule would be worse than the problem it solves, because
// `sneaky-public-key.pem` would then carry anything at all.

test("[5s-t6] a committed PUBLIC key is permitted, decided by its content", () => {
  const path = "docs/research/llm-shield/evidence/stage-5s/attestation/vwq-public-key.pem";
  const result = judgeChanges({
    entries: [
      {
        kind: "prefix",
        path: "docs/research/llm-shield/evidence/stage-5s/",
        allowed_operation: "add-modify",
        id: "5S-S005",
      },
    ],
    changed: [{ path, op: "add" }],
    dirty: [],
    readFile: () => "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA\n-----END PUBLIC KEY-----\n",
  });
  assert.equal(result.ok, true, JSON.stringify(result.refusals));
});

test("[5s-t6] a PRIVATE key wearing a public key's NAME is still refused", () => {
  // The reason the exemption reads content. A name-based rule would pass this without hesitating.
  const path = "docs/research/llm-shield/evidence/stage-5s/attestation/vwq-public-key.pem";
  const result = judgeChanges({
    entries: [
      {
        kind: "prefix",
        path: "docs/research/llm-shield/evidence/stage-5s/",
        allowed_operation: "add-modify",
        id: "5S-S005",
      },
    ],
    changed: [{ path, op: "add" }],
    dirty: [],
    readFile: () =>
      "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIA\n-----END PRIVATE KEY-----\n",
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].reason, R.PRIVATE_KEY_MATERIAL);
});

test("[5s-t6] with NO content reader, every key path is refused — fail closed", () => {
  // A checker that cannot read cannot exempt. The absence of a reader must not become a licence.
  const result = judgeChanges({
    entries: [{ kind: "prefix", path: "docs/", allowed_operation: "add-modify", id: "x" }],
    changed: [{ path: "docs/anything.pem", op: "add" }],
    dirty: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].reason, R.PRIVATE_KEY_MATERIAL);
});

test("[5s-t6] an unreadable file is refused rather than exempted", () => {
  const result = judgeChanges({
    entries: [{ kind: "prefix", path: "docs/", allowed_operation: "add-modify", id: "x" }],
    changed: [{ path: "docs/gone.pem", op: "add" }],
    dirty: [],
    readFile: () => {
      throw new Error("ENOENT");
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.refusals[0].reason, R.PRIVATE_KEY_MATERIAL);
});
