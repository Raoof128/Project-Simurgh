// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — browser packaging/execution parity (plan Task 4.2). The portable WebCrypto verifier
// reproduces the same raw + byte-identical roots as the Node core on the committed Lane-A pack.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyPortable } from "../../../../tools/simurgh-attestation/stage5j/browser/vrc-portable.mjs";
import {
  ratingLedgerRoot,
  contestLayerRoot,
} from "../../../../tools/simurgh-attestation/stage5j/core/roots.mjs";
import {
  computeProjections,
  projectionRoot,
} from "../../../../tools/simurgh-attestation/stage5j/core/projections.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5j/node/build-vrc-evidence.mjs";

test("browser portable verifier ↔ committed pack: raw 0 + byte-identical roots (WebCrypto)", async () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));
  const r = await verifyPortable(bundle, cfg);
  assert.equal(r.raw, 0);
  assert.equal(r.rating_obligation_root, bundle.rating_obligation_root);
  assert.equal(r.rating_ledger_root, ratingLedgerRoot(bundle));
  assert.equal(r.contest_layer_root, contestLayerRoot(bundle));
  assert.equal(r.projection_root, projectionRoot(computeProjections(bundle)));
});

test("browser portable: a tampered obligation root → 334; a dropped contest event → 342", async () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));
  const t1 = structuredClone(bundle);
  t1.rating_obligation_root = "sha256:tampered";
  assert.equal((await verifyPortable(t1, cfg)).raw, 334);
  const t2 = structuredClone(bundle);
  t2.contest_history = t2.contest_history.filter((ce) => ce.content.section_id !== "3");
  assert.equal((await verifyPortable(t2, cfg)).raw, 342);
});
