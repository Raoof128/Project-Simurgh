// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — deterministic Lane C (CI-gated): every frozen mutation is contained by a typed non-zero code.
// The LIVE adversarial variant (a model choosing from this same menu) is digest-only, in tools/.../lanec/.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MUTATION_IDS,
  applyAndVerify,
} from "../../../../tools/simurgh-attestation/stage5n/lanec/run-lanec.mjs";

const EXPECTED = {
  reuse_freshness: 401,
  replace_start_token_digest: 409,
  alter_D_out: 413,
  shave_elapsed_floor: 417,
  swap_endpoint_subject: 404,
};

test("every frozen mutation is contained by its typed code (no false green)", () => {
  for (const id of MUTATION_IDS) {
    const r = applyAndVerify(id);
    assert.equal(r.contained, true, `${id} not contained (raw ${r.raw})`);
    assert.equal(r.raw, EXPECTED[id], `${id}: expected ${EXPECTED[id]}, got ${r.raw}`);
  }
});

test("the menu is exactly the frozen five (no silent surface growth)", () => {
  assert.deepEqual(new Set(MUTATION_IDS), new Set(Object.keys(EXPECTED)));
});
