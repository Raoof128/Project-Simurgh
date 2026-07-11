import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { verifyPack } from "../../../../tools/simurgh-attestation/stage5i/node/verify-vpc-attestation.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5i/node/build-vpc-evidence.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PY = join(ROOT, "tools/simurgh-attestation/stage5i/python/vpc_parity.py");

function python3OrSkip(t) {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    t.skip("python3 not available");
    return false;
  }
}

test("JS ↔ Python parity on the committed pack: same raw code + byte-identical digests", (t) => {
  if (!python3OrSkip(t)) return;
  const py = JSON.parse(execFileSync("python3", [PY], { encoding: "utf8" }));
  const js = verifyPack(EVIDENCE_DIR, "audit");
  const att = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8")).attestation
    .content;

  assert.equal(js.raw, 0);
  assert.equal(py.raw, 0, "python raw must equal JS raw");
  assert.equal(py.partition_digest, att.partition_digest);
  assert.equal(py.panel_subject_root, att.panel_subject_root);
  assert.equal(py.panel_evidence_root, att.panel_evidence_root);
});
