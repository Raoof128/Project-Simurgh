// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR Lane B — blind two-process recompute ceremony (plan Task 11). For each
// non-withheld fixture: copy the document into a scratch TEMP dir, hand the child ONLY the
// temp path + inputs (never the committed map), and compare the child's canonicalJson map to
// the committed one byte-for-byte. Process-isolated, NOT implementation-independent.
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { saltFor } from "../node/build-stage4y-fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const CHILD = join(HERE, "recompute-child.mjs");
const rd = (name) => JSON.parse(readFileSync(join(EVID, name), "utf8"));

// Reconstruct the manifest from the committed audit bundle (an INPUT, not the answer map).
function inputsFor(id) {
  const audit = rd(`${id}.audit.json`);
  return {
    manifest: audit.redaction_manifest ?? [],
    salt: audit.commitment_salt,
    provenance: "fixture",
  };
}

export function runCeremony() {
  const scratch = mkdtempSync(join(tmpdir(), "vdr-laneb-"));
  const index = rd("index.json").fixtures.filter((f) => f.set !== "withheld");
  const transcript = {
    child_received_committed_map_path: false,
    child_read_evidence_dir: false,
    parent_computed_region_classes: false,
    results: [],
  };
  for (const fx of index) {
    const bytes = readFileSync(join(EVID, `${fx.id}.document.txt`));
    const tmp = join(scratch, `${fx.id}.txt`);
    writeFileSync(tmp, bytes); // parent-made TEMP COPY — child never sees the repo path
    const { manifest, salt, provenance } = inputsFor(fx.id);
    const proc = spawnSync(process.execPath, [CHILD], {
      input: JSON.stringify({ document_path: tmp, manifest, salt, provenance }),
      encoding: "utf8",
      env: { PATH: process.env.PATH }, // NO OPERATOR_* leaks into the child
    });
    if (proc.status !== 0) throw new Error(`child failed for ${fx.id}: ${proc.stderr}`);
    const childMap = proc.stdout.trim();
    const committed = canonicalJson(rd(`${fx.id}.map.json`));
    transcript.results.push({ id: fx.id, match: childMap === committed });
  }
  return { ok: transcript.results.every((r) => r.match), transcript, saltForUnused: saltFor };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { ok, transcript } = runCeremony();
  for (const r of transcript.results) console.log(`  ${r.match ? "MATCH" : "DIVERGE"} ${r.id}`);
  console.log(`Stage 4Y Lane B: ${ok ? "ALL MATCH (blind recompute)" : "DIVERGENCE"}`);
  process.exit(ok ? 0 : 1);
}

void existsSync;
