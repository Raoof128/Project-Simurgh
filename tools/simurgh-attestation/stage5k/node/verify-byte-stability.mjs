// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — build the Lane-A pack twice into two temp dirs and assert every file is byte-identical.
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildLaneAEvidence } from "./build-vuc-evidence.mjs";

export function verifyByteStability() {
  const a = mkdtempSync(join(tmpdir(), "vuc-a-"));
  const b = mkdtempSync(join(tmpdir(), "vuc-b-"));
  buildLaneAEvidence(a);
  buildLaneAEvidence(b);
  const files = readdirSync(a).sort();
  for (const f of files) {
    const ba = readFileSync(join(a, f));
    const bb = readFileSync(join(b, f));
    if (!ba.equals(bb)) throw new Error("byte-stability FAILED: " + f + " differs");
  }
  return { files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { files } = verifyByteStability();
  console.log("BYTE-STABLE (" + files.length + " files: " + files.join(", ") + ")");
}
