#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { swapEmbeddedKey } from "../../tools/simurgh-attestation/stage4d/tamper.mjs";

const input = process.argv[2];
if (!input) throw new Error("usage: swap-embedded-key-stage4d.mjs <evidence-pack.json>");
const pack = JSON.parse(await readFile(input, "utf8"));
await writeFile(
  input.replace(/\.json$/, ".swap-key.tampered.json"),
  JSON.stringify(swapEmbeddedKey(pack), null, 2) + "\n"
);
