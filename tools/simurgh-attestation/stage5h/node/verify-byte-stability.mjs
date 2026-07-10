// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — byte-stability check: build the evidence twice into clean temp dirs and compare by
// sorted manifest (path + sha256 per file). Catches added/omitted files that a pairwise diff misses.
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { buildEvidence } from "./build-vsd-evidence.mjs";

function manifest(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
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

const a = mkdtempSync(join(tmpdir(), "vsd-bs-a-"));
const b = mkdtempSync(join(tmpdir(), "vsd-bs-b-"));
const sa = mkdtempSync(join(tmpdir(), "vsd-bs-sa-"));
const sb = mkdtempSync(join(tmpdir(), "vsd-bs-sb-"));
buildEvidence({ evidenceDir: a, stageDir: sa });
buildEvidence({ evidenceDir: b, stageDir: sb });
if (manifest(a) !== manifest(b) || manifest(sa) !== manifest(sb)) {
  console.error("[5h] FAIL: evidence is not byte-stable across two clean builds");
  process.exit(1);
}
console.log("[5h] byte-stable (two clean builds, sorted manifests identical)");
