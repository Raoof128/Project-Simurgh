#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { dropOneReceipt } from "../../tools/simurgh-attestation/stage4d/tamper.mjs";

const input = process.argv[2];
if (!input) throw new Error("usage: drop-one-receipt-stage4d.mjs <evidence-pack.json>");
const pack = JSON.parse(await readFile(input, "utf8"));
await writeFile(
  input.replace(/\.json$/, ".drop-receipt.tampered.json"),
  JSON.stringify(dropOneReceipt(pack), null, 2) + "\n"
);
