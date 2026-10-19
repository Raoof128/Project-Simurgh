// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, writeFileSync, mkdirSync, realpathSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { adaptPublic, validateBundle } from "./core.mjs";
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export function readBound(root, path) {
  const base = realpathSync(root),
    actual = realpathSync(resolve(base, path));
  const rel = relative(base, actual);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Source path escapes repository");
  if (statSync(actual).size > 32 * 1024 * 1024) throw new Error("Source exceeds 32 MiB");
  const bytes = readFileSync(actual);
  return { text: bytes.toString("utf8"), sha256: createHash("sha256").update(bytes).digest("hex") };
}
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
export function buildIndex({ root = ROOT, detail = false } = {}) {
  const path = "docs/research/export-phase-14/public.json";
  const source = readBound(root, path),
    b = adaptPublic(JSON.parse(source.text));
  b.created = new Date().toISOString();
  b.records.forEach((r) => (r.source.sha256 = source.sha256));
  b.documents = DOCS.map((path) => {
    const doc = readBound(root, path);
    return {
      id: path,
      path,
      title: doc.text.match(/^#\s+(.+)/m)?.[1] || path,
      text: doc.text,
      reviewed: "2026-10-19",
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
  if (detail) {
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
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2),
    i = args.indexOf("--output");
  if (i < 0 || !args[i + 1]) throw new Error("Usage: node index.mjs --output file.json [--detail]");
  const out = resolve(args[i + 1]);
  if (!relative(resolve(ROOT, "docs"), out).startsWith(".."))
    throw new Error("Generated index must not overwrite research documents");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(buildIndex({ detail: args.includes("--detail") }), null, 2) + "\n",
    {
      flag:
        out ===
        resolve(
          dirname(fileURLToPath(import.meta.url)),
          "node_modules/.simurgh-explorer-public/evidence.json"
        )
          ? "w"
          : "wx",
    }
  );
  console.log(`Wrote ${out}`);
}
