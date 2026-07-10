// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane B process-2 entrypoint. Reads ONLY the evidence dir + host key, performs the
// blind recompute, prints the ceremony transcript as JSON to stdout.
import { readFileSync } from "node:fs";
import { performCeremony } from "./ceremony.mjs";

const [, , evidenceDir, hostKeyPath] = process.argv;
const hostPrivPem = readFileSync(hostKeyPath, "utf8");
process.stdout.write(JSON.stringify(performCeremony({ evidenceDir, hostPrivPem })));
