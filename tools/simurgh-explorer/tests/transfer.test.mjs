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
