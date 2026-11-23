// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  copyFileSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { adaptPublic, validateBundle } from "./core.mjs";
import { loadTransfer } from "./transfer.mjs";
import { loadLanes } from "./lanes.mjs";
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export function readBound(root, path) {
  const base = realpathSync(root),
    actual = realpathSync(resolve(base, path));
  const rel = relative(base, actual);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Source path escapes repository");
  if (statSync(actual).size > 32 * 1024 * 1024) throw new Error("Source exceeds 32 MiB");
  const bytes = readFileSync(actual);
  return {
    bytes: new Uint8Array(bytes),
    text: bytes.toString("utf8"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
export const readBytes = readBound;
const PUBLIC = "node_modules/.simurgh-explorer-public";
const DOCS = [
  "docs/REVIEWER_INDEX.md",
  "docs/research/OPENAI_NEEDS_2026-10-16.md",
  "docs/research/SIMURGH_GAP_MAP_2026-10-15.md",
  "docs/research/model-composition-phase-10/RESULTS.md",
  "docs/research/model-composition-phase-10/REVIEW.md",
  "docs/research/reliability-phase-13/RESULTS.md",
  "docs/research/export-phase-14/RESULTS.md",
  "docs/research/validation-phase-15/RESULTS.md",
  "docs/research/validation-phase-15/GAPS.md",
  "docs/research/PHASE_8_REVIEW_2026-10-19.md",
  "docs/research/CONTINUATION_PHASE_16.md",
  "docs/research/CONTINUATION_PHASE_17.md",
  "docs/research/CONTINUATION_PHASE_18.md",
  "docs/research/explorer-phase-18/RESEARCH.md",
];
// These documents were reviewed on 19 October 2026. One that has since gained a dated section
// carries the latest date its own headings give.
const REVIEWED = "2026-10-19";
const MONTH_NAMES =
  "January February March April May June July August September October November December".split(
    " "
  );
export function datedBy(text, today = new Date().toISOString().slice(0, 10)) {
  let latest = REVIEWED;
  const prose = text.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, "");
  for (const [, heading] of prose.matchAll(/^#{1,6}\s+(.+)$/gm))
    for (const [, day, month, year] of heading.matchAll(
      new RegExp(`\\b(\\d{1,2}) (${MONTH_NAMES.join("|")}) (\\d{4})\\b`, "g")
    )) {
      const date = `${year}-${String(MONTH_NAMES.indexOf(month) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
      // A real day that has come: 31 February is not one, and a plan for next year is not a
      // date the page was written.
      const real = new Date(`${date}T00:00:00Z`);
      if (Number.isNaN(real.getTime()) || real.toISOString().slice(0, 10) !== date) continue;
      if (date > latest && date <= today) latest = date;
    }
  return latest;
}

export function buildIndex({ root = ROOT, detail = false, study = "phase17" } = {}) {
  if (!["phase10", "phase17"].includes(study)) throw new Error("Unknown study");
  const path = "docs/research/export-phase-14/public.json";
  const source = readBound(root, path),
    b =
      study === "phase17"
        ? loadTransfer(root, readBound, detail)
        : adaptPublic(JSON.parse(source.text));
  b.created = new Date().toISOString();
  if (study === "phase10") b.records.forEach((r) => (r.source.sha256 = source.sha256));
  b.documents = DOCS.map((path) => {
    const doc = readBound(root, path);
    return {
      id: path,
      path,
      title: doc.text.match(/^#\s+(.+)/m)?.[1] || path,
      text: doc.text,
      reviewed: datedBy(doc.text),
      sha256: doc.sha256,
      url: null,
    };
  });
  const previous = JSON.parse(
    readBound(root, "docs/research/openai-needs-2026-10-16/sources.json").text
  );
  b.documents.push(
    ...previous.sources.map((s) => ({
      id: s.id,
      path: "docs/research/openai-needs-2026-10-16/sources.json",
      title: s.url.split("/").filter(Boolean).at(-1),
      text: `${s.short_excerpt}\nSimurgh interpretation: ${s.simurgh_interpretation}\nScope: ${s.review_scope}`,
      reviewed: previous.review_date,
      url: s.url,
      sha256: s.sha256_response_bytes,
    }))
  );
  const research = JSON.parse(
    readBound(root, "docs/research/explorer-phase-18/research.json").text
  );
  b.documents.push(
    ...research.sources.map((s) => ({
      ...s,
      path: "docs/research/explorer-phase-18/research.json",
    }))
  );
  b.gaps = research.gaps;
  // Phase 19: every pack, its outcomes, the outside-replication status and the README's open work.
  const phase19 = loadLanes(root, readBound);
  b.lanes = phase19.lanes;
  b.handoff = phase19.handoff;
  b.open_work = phase19.open_work;
  b.other = phase19.other;
  b.documents.push(...phase19.documents);
  if (detail && study === "phase10") {
    const path = "docs/research/model-composition-phase-10/capture.json";
    const raw = readBound(root, path),
      capture = JSON.parse(raw.text);
    const generations = new Map(capture.generations.map((g) => [g.id, g]));
    const rows = new Map(capture.rows.map((r, i) => [`${r.generation}:${r.control}`, { r, i }]));
    if (rows.size !== b.records.length) throw new Error("Full capture inventory differs");
    for (const record of b.records) {
      const generation = `g${record.outcome.generation_index}`;
      const hit = rows.get(`${generation}:${record.outcome.control}`),
        gen = generations.get(generation);
      if (
        !hit ||
        !gen ||
        hit.r.status !== record.outcome.status ||
        hit.r.trial !== record.outcome.trial ||
        hit.r.task_id !== gen.task_id
      )
        throw new Error("Full capture join mismatch");
      record.title = hit.r.task_id;
      record.detail = {
        model_output: gen.output.raw,
        generation_status: gen.output.status,
        native: hit.r.native,
        initial: hit.r.initial,
        held: hit.r.held,
        effects: hit.r.effects.map((e) => e.action),
        source: { path, pointer: `/rows/${hit.i}`, sha256: raw.sha256 },
        note: "Selected local synthetic detail; raw databases, prompts and token arrays are omitted. Source verification is separate.",
      };
    }
    b.mode = "local_detail";
    b.omissions = [
      "raw_state_and_credentials",
      "prompt_messages",
      "token_ids",
      "individual_timing",
      "complete_event_history",
    ];
  }
  return validateBundle(b);
}
// Main-module guard. `import.meta.url` is the loader's REAL, percent-encoded path; `process.argv[1]`
// is whatever the shell passed. Compared as text, a verifier launched through a symlinked
// directory (`/tmp` on macOS) or a path containing a space never runs and exits 0 printing
// nothing (audit C-1, 31 October 2026). Both sides are resolved to the physical path here.
function isMainModule(moduleUrl) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  const args = process.argv.slice(2),
    i = args.indexOf("--output");
  if (i < 0 || !args[i + 1]) throw new Error("Usage: node index.mjs --output file.json [--detail]");
  const out = resolve(args[i + 1]);
  if (!relative(resolve(ROOT, "docs"), out).startsWith(".."))
    throw new Error("Generated index must not overwrite research documents");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      buildIndex({
        detail: args.includes("--detail"),
        study: args.includes("--study") ? args[args.indexOf("--study") + 1] : "phase17",
      }),
      null,
      2
    ) + "\n",
    {
      flag:
        out === resolve(dirname(fileURLToPath(import.meta.url)), PUBLIC, "evidence.json")
          ? "w"
          : "wx",
    }
  );
  console.log(`Wrote ${out}`);
  // The built app can recompute each pack's root in the reader's browser, so the packs of this
  // checkout go beside the index. Only the app's own build gets them; a file written elsewhere
  // with --output is an index and nothing more.
  if (out === resolve(dirname(fileURLToPath(import.meta.url)), PUBLIC, "evidence.json")) {
    const packs = resolve(dirname(out), "packs");
    rmSync(packs, { recursive: true, force: true });
    mkdirSync(packs);
    for (const lane of JSON.parse(readFileSync(out, "utf8")).lanes) {
      realpathSync(resolve(ROOT, lane.pack));
      copyFileSync(resolve(ROOT, lane.pack), resolve(packs, `${lane.id}.zip`));
    }
    console.log(`Copied the packs to ${packs}`);
  }
}
