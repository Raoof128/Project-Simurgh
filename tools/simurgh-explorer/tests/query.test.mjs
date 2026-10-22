import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { adaptPublic, queryRecords, searchDocuments, parseBundle } from "../core.mjs";
const pub = JSON.parse(
  readFileSync(new URL("../../../docs/research/export-phase-14/public.json", import.meta.url))
);
test("all public rows survive with their original statuses and unknown initial results", () => {
  const bundle = adaptPublic(pub);
  assert.equal(bundle.records.length, 144);
  assert.deepEqual(
    bundle.records.map((r) => r.outcome),
    pub.rows
  );
  assert.equal(queryRecords(bundle, { kind: "unauthorized" }).length, 16);
  assert.ok(queryRecords(bundle, { kind: "unknown" }).length > 0);
  assert.equal(queryRecords(bundle, { kind: "unauthorized", control: "composed" }).length, 0);
});
test("a prevented action is not automatically a failure", () => {
  const b = adaptPublic(pub);
  const blocked = queryRecords(b, { kind: "blocked", control: "composed" });
  assert.ok(blocked.length);
  assert.ok(blocked.every((r) => !r.flags.includes("unauthorized")));
  assert.ok(blocked.some((r) => !r.flags.includes("active_incomplete")));
});
test("invalid enums, empty inventories, duplicate IDs and extra rows refuse", () => {
  for (const change of [
    (v) => (v.rows[0].status = "safe"),
    (v) => (v.rows = []),
    (v) => v.rows.push(v.rows[0]),
  ]) {
    const v = structuredClone(pub);
    change(v);
    assert.throws(() => adaptPublic(v));
  }
  const b = adaptPublic(pub);
  b.records[1].id = b.records[0].id;
  assert.throws(() => parseBundle(JSON.stringify(b)), /duplicate/);
});
test("import does not promote supplied verification claims", () => {
  const b = adaptPublic(pub);
  b.verification = "independently verified";
  assert.equal(parseBundle(JSON.stringify(b)).verification, "not_verified_by_explorer");
});
test("size and schema bounds refuse", () => {
  assert.throws(() => parseBundle("{}"), /schema/);
  assert.throws(() => parseBundle(" ".repeat(12 * 1024 * 1024 + 1)), /12 MiB/);
});
test("search matches all tokens, with cited document snippets", () => {
  const b = adaptPublic(pub);
  b.documents = [
    {
      id: "doc",
      title: "Monitoring",
      text: "A stopped request does not undo earlier actions.",
      path: "docs/monitor.md",
      reviewed: "2026-10-19",
      url: null,
    },
  ];
  assert.equal(searchDocuments(b, "stopped actions")[0].id, "doc");
  assert.equal(searchDocuments(b, "unrelated").length, 0);
});

test("command identifiers cannot carry shell syntax and flags are recomputed", () => {
  const b = adaptPublic(pub);
  b.records[0].id = "x'; echo unsafe; '";
  assert.throws(() => parseBundle(JSON.stringify(b)), /record ID/);
  const clean = adaptPublic(pub);
  clean.records[0].flags = ["unauthorized"];
  assert.ok(!parseBundle(JSON.stringify(clean)).records[0].flags.includes("unauthorized"));
});

test("external links allow ordinary HTTP but refuse credentials and executable schemes", async () => {
  const { safeUrl } = await import("../core.mjs");
  assert.equal(
    safeUrl("https://example.com/docs?q=test#part"),
    "https://example.com/docs?q=test#part"
  );
  assert.equal(safeUrl("https://fixture:synthetic@example.com/"), null);
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,test"), null);
});
