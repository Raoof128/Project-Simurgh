import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { buildIndex } from "../index.mjs";
import { parseBundle, queryRecords, summary } from "../core.mjs";
test("current transfer study preserves all 288 branches and 96 distinct model generations", () => {
  const b = buildIndex();
  assert.equal(b.records.length, 288);
  assert.equal(summary(b).generations, 96);
  assert.equal(queryRecords(b, { model: "llama" }).length, 144);
  assert.equal(queryRecords(b, { model: "luna", kind: "unauthorized" }).length, 0);
  assert.equal(queryRecords(b, { model: "llama", kind: "unauthorized" }).length, 17);
  assert.equal(b.records.filter((r) => r.outcome.proposal === "invalid").length, 3);
  assert.ok(b.records.every((r) => r.source.sha256 && r.source.pointer));
  assert.equal(b.verification, "not_verified_by_explorer");
});
test("full transfer imports refuse omitted, duplicate and relabeled identities; selected exports retain scope", () => {
  const b = buildIndex();
  for (const mutate of [
    (x) => x.records.pop(),
    (x) => (x.records[1] = x.records[0]),
    (x) => (x.records[0].model = "luna"),
  ]) {
    const c = structuredClone(b);
    mutate(c);
    assert.throws(() => parseBundle(JSON.stringify(c)));
  }
  const records = queryRecords(b, { model: "llama", kind: "unauthorized" });
  const selected = { ...b, records, selection: { total: 288, retained: 17 } };
  assert.equal(parseBundle(JSON.stringify(selected)).records.length, 17);
  selected.selection.retained = 16;
  assert.throws(() => parseBundle(JSON.stringify(selected)), /selection/);
});
test("CLI model filter agrees with browser interpretation, and legacy study stays available", () => {
  const b = buildIndex();
  const cli = new URL("../cli.mjs", import.meta.url).pathname;
  const r = JSON.parse(
    execFileSync(process.execPath, [cli, "records", "--model", "llama", "--kind", "unauthorized"], {
      encoding: "utf8",
    })
  );
  assert.deepEqual(r.data, queryRecords(b, { model: "llama", kind: "unauthorized" }));
  assert.equal(buildIndex({ study: "phase10" }).records.length, 144);
  assert.throws(() => buildIndex({ study: "invented" }), /study/);
  assert.throws(() => queryRecords(b, { model: "invented" }), /model/);
});

test("transfer imports cannot evade inventory checks by dropping the study label", () => {
  const b = buildIndex();
  b.records.pop();
  delete b.study;
  assert.throws(() => parseBundle(JSON.stringify(b)), /inventory/);
  b.study = "phase10";
  assert.throws(() => parseBundle(JSON.stringify(b)), /study/);
  const c = buildIndex();
  c.records = c.records.slice(0, 3);
  c.selection = { total: 3, retained: 3 };
  assert.throws(() => parseBundle(JSON.stringify(c)), /selection/);
});

// Audit F-4 (31 October 2026): the loader checks ROOT.sha256 against sha256(manifest.json) and the
// members it reads against the manifest; a mismatch is refused, never loaded with a quiet label.
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readBound } from "../index.mjs";
import { loadTransfer } from "../transfer.mjs";

// npm runs these tests from tools/simurgh-explorer; the evidence lives at the repository root.
const REPO = fileURLToPath(new URL("../../../", import.meta.url));

function scratchRoot() {
  const root = mkdtempSync(join(tmpdir(), "simurgh-explorer-root-"));
  const dir = join(root, "docs/research/transfer-phase-17");
  mkdirSync(dir, { recursive: true });
  for (const name of ["evidence.zip", "tasks.json", "ROOT.sha256"]) {
    cpSync(join(REPO, "docs/research/transfer-phase-17", name), join(dir, name));
  }
  return { root, dir };
}

test("loader records the manifest root and refuses a ROOT.sha256 that does not match it", (t) => {
  const { root, dir } = scratchRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bundle = loadTransfer(root, readBound, false);
  assert.equal(bundle.provenance.root_file_matches_manifest, true);
  assert.match(bundle.provenance.archive_manifest_root, /^[0-9a-f]{64}$/);
  writeFileSync(join(dir, "ROOT.sha256"), "0".repeat(64) + "\n");
  assert.throws(() => loadTransfer(root, readBound, false), /archive_root_mismatch/);
});

test("loader refuses a member whose bytes no longer match the manifest", (t) => {
  const { root, dir } = scratchRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("python3", [
    "-I",
    "-c",
    [
      "import sys, zipfile",
      "src, dst = sys.argv[1], sys.argv[2]",
      "with zipfile.ZipFile(src) as z:",
      "    members = {n: z.read(n) for n in z.namelist()}",
      "members['llama.json'] = members['llama.json'] + b' '  # still valid JSON, different bytes",
      "with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as out:",
      "    [out.writestr(n, b) for n, b in members.items()]",
    ].join("\n"),
    join(REPO, "docs/research/transfer-phase-17/evidence.zip"),
    join(dir, "evidence.zip"),
  ]);
  assert.throws(() => loadTransfer(root, readBound, false), /archive_member_mismatch/);
});
