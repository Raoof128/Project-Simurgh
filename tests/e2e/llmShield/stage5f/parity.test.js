// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — JS↔Python↔browser parity net (plan Task 20).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { portableVerify } from "../../../../tools/simurgh-attestation/stage5f/browser/verify-vmp-portable.js";
import { buildPanel } from "../../../../tools/simurgh-attestation/stage5f/node/buildPanel.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

test("Python independently corroborates the committed evidence (exit 0)", () => {
  // ensure the committed evidence is current, then run the Python parity verifier.
  execFileSync(
    "node",
    [join(ROOT, "tools/simurgh-attestation/stage5f/node/build-vmp-evidence.mjs")],
    { stdio: "ignore" }
  );
  const out = execFileSync(
    "python3",
    [join(ROOT, "tools/simurgh-attestation/stage5f/python/vmp_parity.py")],
    { encoding: "utf8" }
  );
  assert.match(out, /"python_parity":\s*"corroborated"/);
});

test("browser portable verify: valid bundle -> portable_valid, raw null (never raw 0)", () => {
  const { bundle } = buildPanel();
  const r = portableVerify(bundle);
  assert.equal(r.portable_valid, true);
  assert.equal(r.raw, null); // must NOT look like a full raw:0
  assert.equal(r.audit_census_verified, false);
  assert.equal(r.historical_verifier_execution, false);
});

test("browser portable verify: inconsistent verdict -> not portable_valid", () => {
  const { bundle } = buildPanel();
  bundle.cells.find((c) => c.decision_evidence?.kind === "binary_softmax").decision_evidence.label =
    "benign";
  assert.equal(portableVerify(bundle).portable_valid, false);
});
