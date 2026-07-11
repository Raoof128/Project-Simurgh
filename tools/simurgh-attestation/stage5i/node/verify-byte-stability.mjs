// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — byte-stability via a sorted path+size+sha256 MANIFEST (S11), not a single-file cmp.
// Build the pack twice into fresh dirs and assert identical manifests.
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sha256Hex } from "../core/digests.mjs";
import { buildLaneAEvidence } from "./build-vpc-evidence.mjs";

function manifest(dir) {
  return readdirSync(dir)
    .sort()
    .map((f) => {
      const bytes = readFileSync(join(dir, f));
      return `${f}\t${bytes.length}\t${sha256Hex(bytes.toString("utf8"))}`;
    })
    .join("\n");
}

export function byteStable() {
  const a = join(tmpdir(), `vpc-bs-a-${process.pid}`);
  const b = join(tmpdir(), `vpc-bs-b-${process.pid}`);
  try {
    buildLaneAEvidence(a);
    buildLaneAEvidence(b);
    return { ok: manifest(a) === manifest(b), a: manifest(a), b: manifest(b) };
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { ok } = byteStable();
  console.log(ok ? "byte-stable: PASS" : "byte-stable: FAIL");
  process.exit(ok ? 0 : 1);
}
