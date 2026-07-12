// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Node ↔ independent Python semantic parity on the committed Lane-A pack (plan Task 4.1).
// Injected crypto facts test the pure decision core, not cross-runtime crypto impl. Byte-identical
// verdict + rating_obligation / rating_ledger / contest_layer / projection roots.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { verifyVrc } from "../../../../tools/simurgh-attestation/stage5j/node/adapter.mjs";
import {
  ratingLedgerRoot,
  contestLayerRoot,
} from "../../../../tools/simurgh-attestation/stage5j/core/roots.mjs";
import {
  computeProjections,
  projectionRoot,
} from "../../../../tools/simurgh-attestation/stage5j/core/projections.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5j/node/build-vrc-evidence.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const PY = join(ROOT, "tools/simurgh-attestation/stage5j/python/vrc_parity.py");

test("Node ↔ Python parity: same verdict + byte-identical roots on the Lane-A pack", () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));

  const nodeRaw = verifyVrc(bundle, cfg, { tier: "audit" }).raw;
  const nodeRoots = {
    rating_obligation_root: bundle.rating_obligation_root,
    rating_ledger_root: ratingLedgerRoot(bundle),
    contest_layer_root: contestLayerRoot(bundle),
    projection_root: projectionRoot(computeProjections(bundle)),
  };

  const py = JSON.parse(execFileSync("python3", [PY], { encoding: "utf8" }));

  assert.equal(nodeRaw, 0);
  assert.equal(py.raw, nodeRaw, "verdict parity");
  for (const k of Object.keys(nodeRoots)) {
    assert.equal(py[k], nodeRoots[k], `${k} byte-parity`);
  }
});
