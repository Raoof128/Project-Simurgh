// SPDX-License-Identifier: AGPL-3.0-or-later
// Generic, stage-agnostic evidence-hashes verifier. Re-walks any stage's evidence-hashes.json and
// confirms every listed file still matches its committed sha256. Pure, offline, never throws.
// Hardened: rejects a map that lists evidence-hashes.json itself; rejects absolute paths, raw ".."
// segments (checked BEFORE normalisation, which can erase them), and any key that resolves outside
// stageDir. `_injectMap` is a test-only seam (replaces the on-disk map).
import { readFileSync } from "node:fs";
import { join, isAbsolute, resolve, relative } from "node:path";
import { sha256Hex } from "./canonicalise.mjs";

export function verifyEvidenceHashes(stageDir, { _injectMap } = {}) {
  try {
    let map;
    if (_injectMap) {
      map = _injectMap;
    } else {
      try {
        map = JSON.parse(readFileSync(join(stageDir, "evidence-hashes.json"), "utf8"));
      } catch {
        return { ok: false, checked: 0, mismatches: [], reason: "evidence_hashes_missing" };
      }
    }
    const stageRoot = resolve(stageDir);
    const entries = Object.entries(map);
    for (const [p] of entries) {
      if (p.endsWith("evidence-hashes.json"))
        return { ok: false, checked: 0, mismatches: [], reason: "self_inclusion" };
      // Raw segment check FIRST — normalisation can erase a "..".
      if (p.split(/[\\/]+/).includes("..") || isAbsolute(p))
        return { ok: false, checked: 0, mismatches: [], reason: "unsafe_path" };
      // Containment: the resolved path must stay inside stageDir.
      const rel = relative(stageRoot, resolve(p));
      if (rel.startsWith("..") || isAbsolute(rel))
        return { ok: false, checked: 0, mismatches: [], reason: "outside_stage_dir" };
    }
    const mismatches = [];
    let checked = 0;
    for (const [p, expected] of entries) {
      checked += 1;
      let actual;
      try {
        actual = sha256Hex(readFileSync(p, "utf8"));
      } catch {
        mismatches.push(p);
        continue;
      }
      if (actual !== expected) mismatches.push(p);
    }
    if (mismatches.length > 0) return { ok: false, checked, mismatches, reason: "digest_mismatch" };
    return { ok: true, checked, mismatches: [], reason: "ok" };
  } catch {
    return { ok: false, checked: 0, mismatches: [], reason: "threw" };
  }
}
