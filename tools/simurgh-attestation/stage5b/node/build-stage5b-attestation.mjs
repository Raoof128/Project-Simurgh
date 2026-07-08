// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — attestation build entry (plan Task 11). Mirrors the stage file layout; the
// signed bundle is produced by the fixture builder. Motto: AnthropicSafe First, then ReviewerSafe.
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFixtures } from "./build-stage5b-fixtures.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  const b = writeFixtures();
  console.log(`stage5b attestation written: ${b.findings.length} attacks`);
}
