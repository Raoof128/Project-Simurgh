// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — attestation build entry (plan Task 9). The signed bundles are produced by
// the Lane A fixture builder (which signs each artifact with the committed fixture key), so
// this entry re-runs that build. Kept as a named CLI for parity with the stage file layout.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "./build-stage4z-fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..", "..", "..", "..", "docs/research/llm-shield/evidence/stage-4z");

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(EVID, { recursive: true });
  const n = build();
  console.log(`stage4z signed bundles written: ${n}`);
}
