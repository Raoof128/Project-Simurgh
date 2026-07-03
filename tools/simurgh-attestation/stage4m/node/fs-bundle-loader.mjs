// SPDX-License-Identifier: AGPL-3.0-or-later
import { existsSync, readFileSync } from "node:fs";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const FILES = {
  windows: "windows.json",
  mergeEvents: "merge-events.json",
  rescoreRecords: "rescore-records.json",
  disclosure: "disclosure.json",
  chain: "chain.json",
  contests: "contest.json",
  acks: "contest-ack.json",
  attestation: "vxd-attestation.json",
  manifest: "vxd-manifest.json",
};

const ARRAY_KEYS = ["windows", "mergeEvents", "rescoreRecords", "contests", "acks"];

export function loadBundle(bundleDir) {
  const present = new Set();
  const out = {};
  for (const [key, file] of Object.entries(FILES)) {
    const p = `${bundleDir}/${file}`;
    if (existsSync(p)) {
      present.add(file);
      const value = readJson(p);
      out[key] = ["contests", "acks"].includes(key) && !Array.isArray(value) ? [value] : value;
    } else {
      out[key] = ARRAY_KEYS.includes(key) ? [] : null;
    }
  }
  return { ...out, present };
}
