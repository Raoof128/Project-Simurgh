// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — build the Lane-A pack twice into two temp dirs and assert every file is byte-identical.
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { buildLaneAEvidence } from "./build-vrc-evidence.mjs";

export function verifyByteStability() {
  const a = mkdtempSync(join(tmpdir(), "vrc-a-"));
  const b = mkdtempSync(join(tmpdir(), "vrc-b-"));
  buildLaneAEvidence(a);
  buildLaneAEvidence(b);
  const files = readdirSync(a).sort();
  for (const f of files) {
    const ba = readFileSync(join(a, f));
    const bb = readFileSync(join(b, f));
    if (!ba.equals(bb)) throw new Error(`byte-stability FAILED: ${f} differs`);
  }
  return { files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  const { files } = verifyByteStability();
  console.log(`BYTE-STABLE (${files.length} files: ${files.join(", ")})`);
}
