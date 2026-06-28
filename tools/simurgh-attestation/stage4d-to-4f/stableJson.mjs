// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function sortForJson(value) {
  if (Array.isArray(value)) return value.map(sortForJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortForJson(nested)])
  );
}

export function stableStringify(value) {
  return `${JSON.stringify(sortForJson(value), null, 2)}\n`;
}

export async function writeStableJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stableStringify(value), "utf8");
}
