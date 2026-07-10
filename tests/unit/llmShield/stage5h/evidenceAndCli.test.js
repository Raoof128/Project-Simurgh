// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane A byte-stability (sorted manifest) + the verify CLI orchestrator (Tasks 20–21).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { buildEvidence } from "../../../../tools/simurgh-attestation/stage5h/node/build-vsd-evidence.mjs";
import { verify } from "../../../../tools/simurgh-attestation/stage5h/node/verify-vsd-attestation.mjs";

function manifest(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1
    )) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else
        out.push(
          `${relative(dir, p)} ${createHash("sha256").update(readFileSync(p)).digest("hex")}`
        );
    }
  };
  walk(dir);
  return out.sort().join("\n");
}

test("Lane A evidence is byte-stable (sorted manifest matches across two clean builds)", () => {
  const a = mkdtempSync(join(tmpdir(), "vsd-a-"));
  const b = mkdtempSync(join(tmpdir(), "vsd-b-"));
  const sa = mkdtempSync(join(tmpdir(), "vsd-sa-"));
  const sb = mkdtempSync(join(tmpdir(), "vsd-sb-"));
  buildEvidence({ evidenceDir: a, stageDir: sa });
  buildEvidence({ evidenceDir: b, stageDir: sb });
  assert.equal(manifest(a), manifest(b));
  assert.equal(manifest(sa), manifest(sb));
});

test("verify CLI: committed evidence → raw 0 public + audit", () => {
  assert.equal(verify({ tier: "public" }).raw, 0);
  const aud = verify({ tier: "audit" });
  assert.equal(aud.raw, 0);
  assert.equal(aud.inventory_census_verified, true);
});

test("verify CLI on a tampered temp copy → nonzero raw", () => {
  const dir = mkdtempSync(join(tmpdir(), "vsd-t-"));
  const sdir = mkdtempSync(join(tmpdir(), "vsd-ts-"));
  buildEvidence({ evidenceDir: dir, stageDir: sdir });
  // perturb a public artefact's bytes → digest mismatch (307)
  const p = join(dir, "artefacts", "eval-results.json");
  const obj = JSON.parse(readFileSync(p, "utf8"));
  obj.rows[0].value = "0.10";
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  const r = verify({
    dir,
    tier: "audit",
    pinPath: join(sdir, "pin.json"),
    hostRegistryPath: join(sdir, "host-registry.json"),
  });
  assert.notEqual(r.raw, 0);
});
