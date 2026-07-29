// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 4 — inheritance from 5R's C1 commitment.
//
// 5R named its own ceiling in C1's `note` field: closing the C1→C2 back-fitting gap "needs an
// external witness over C1". 5S supplies that mechanism. It does not become that witness — the stage
// is a protocol and an evidence system, and §1.5 forbids describing it as an independent witness.
//
// RULING 2: `core/` performs no I/O. The loader reads bytes; the validator is pure. Revision 1 of the
// plan had `core/inherit.mjs` reading the file itself, which is how a "pure" core stops being pure.
//
// ROOTS BEFORE SIGNATURES, and the order is asserted rather than assumed: a signature check that runs
// first will happily verify a correctly signed statement about the wrong roots.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  INHERIT_REFUSALS as R,
  c1Binding,
  validateInheritance,
} from "../../../../tools/simurgh-attestation/stage5s/core/inherit.mjs";
import { loadInheritedRoots } from "../../../../tools/simurgh-attestation/stage5s/node/loadInheritedRoots.mjs";

const CORE = "tools/simurgh-attestation/stage5s/core/inherit.mjs";
const loaded = loadInheritedRoots();

test("[5s-t4] the pure core does no I/O", () => {
  const src = readFileSync(CORE, "utf8");
  for (const forbidden of ["node:fs", "node:child_process", "readFileSync", "process.env"]) {
    assert.ok(!src.includes(forbidden), `core/inherit.mjs reaches for ${forbidden}`);
  }
});

test("[5s-t4] the loader binds path, commit and digest, not just content", () => {
  assert.match(loaded.source_path, /stage-5r\/commitments\/campaign-c1\.json$/);
  assert.match(loaded.source_digest, /^[0-9a-f]{64}$/);
  assert.match(loaded.source_commit, /^[0-9a-f]{40}$/);
  assert.ok(loaded.bytes > 0);
});

test("[5s-t4] a correct binding validates", () => {
  const v = validateInheritance({
    bytes: loaded.raw,
    parsed: loaded.parsed,
    expectedDigest: loaded.source_digest,
    verifySignature: () => true,
  });
  assert.equal(v.ok, true, JSON.stringify(v.refusals));
});

test("[5s-t4] a digest mismatch is refused BEFORE the signature is ever consulted", () => {
  const calls = [];
  const v = validateInheritance({
    bytes: loaded.raw,
    parsed: loaded.parsed,
    expectedDigest: "0".repeat(64),
    verifySignature: () => {
      calls.push("signature");
      return true;
    },
  });
  assert.equal(v.ok, false);
  assert.deepEqual(
    v.refusals.map((x) => x.reason),
    [R.ROOT_DIGEST_MISMATCH]
  );
  assert.deepEqual(calls, [], "the signature gate ran despite a root mismatch");
});

test("[5s-t4] a C1 missing a required root is refused", () => {
  const { instrument_lock_digest: _drop, ...maimed } = loaded.parsed;
  const v = validateInheritance({
    bytes: loaded.raw,
    parsed: maimed,
    expectedDigest: loaded.source_digest,
    verifySignature: () => true,
  });
  assert.equal(v.ok, false);
  assert.ok(v.refusals.some((x) => x.reason === R.MISSING_ROOT));
});

test("[5s-t4] the C1 binding 5S carries is the digest of the committed bytes", () => {
  const b = c1Binding(loaded);
  assert.equal(b.c1_digest, loaded.source_digest);
  assert.equal(b.c1_source_path, loaded.source_path);
  assert.equal(b.inherited_from, "5R");
  // Bound, not narrated: the successor records WHICH commitment it witnessed, by digest.
  assert.match(b.c1_domain, /^simurgh\.vpf\./);
});

test("[5s-t4] 5R's own note names the ceiling this stage answers", () => {
  // Not decoration: if 5R ever stops naming the gap, 5S's premise moved and someone must notice.
  assert.match(loaded.parsed.note, /external witness over C1/);
});
