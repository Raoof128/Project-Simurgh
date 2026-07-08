// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — attestation build entry (plan Task 10). The signed bundles are produced by
// the Lane A fixture builder; this named CLI mirrors the stage file layout. Motto:
// AnthropicSafe First, then ReviewerSafe.
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "./build-stage5a-fixtures.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  const n = build();
  console.log(`stage5a signed bundles written: ${n}`);
}
