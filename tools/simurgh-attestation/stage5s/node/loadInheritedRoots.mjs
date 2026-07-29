#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the loader half of inheritance. This file does the I/O so `core/inherit.mjs` does not.
//
// It binds the SOURCE, not just the content: path, the commit that last touched it, the digest and
// the byte count. A digest alone says "these bytes"; the path and commit say which committed thing
// those bytes were, which is what a reviewer needs to fetch it independently.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const C1_PATH = "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json";

/** @returns {{source_path: string, source_commit: string, source_digest: string, bytes: number, raw: Buffer, parsed: object}} */
export function loadInheritedRoots(path = C1_PATH) {
  const raw = readFileSync(path);
  let source_commit = "0".repeat(40);
  try {
    source_commit = execFileSync("git", ["log", "--format=%H", "-1", "--", path], {
      encoding: "utf8",
    }).trim();
  } catch {
    /* a detached or shallow checkout still loads; the commit is reported as unknown zeros */
  }
  return {
    source_path: path,
    source_commit,
    source_digest: createHash("sha256").update(raw).digest("hex"),
    bytes: raw.length,
    raw,
    parsed: JSON.parse(raw.toString("utf8")),
  };
}
