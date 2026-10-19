import { request } from "node:http";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIndex, readBound } from "../index.mjs";
import { queryRecords, searchDocuments, parseBundle } from "../core.mjs";
import { createExplorerServer } from "../serve.mjs";
const cli = new URL("../cli.mjs", import.meta.url);
test("real CLI and browser query layer agree exactly", () => {
  const b = buildIndex();
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [cli.pathname, "records", "--kind", "unauthorized", "--control", "credential_only"],
      { encoding: "utf8" }
    )
  );
  assert.deepEqual(
    result.data,
    queryRecords(b, { kind: "unauthorized", control: "credential_only" })
  );
  assert.ok(searchDocuments(b, "monitoring", "2026").length > 0);
  assert.equal(b.gaps.length, 8);
});
test("detail joins every record with its captured generation and preserves public outcomes", () => {
  const b = buildIndex({ detail: true }),
    p = buildIndex();
  assert.equal(b.mode, "local_detail");
  assert.ok(b.records.every((r) => r.detail.source.pointer && r.detail.model_output !== undefined));
  assert.deepEqual(
    b.records.map((r) => r.outcome),
    p.records.map((r) => r.outcome)
  );
});
test("filtered JSON round-trips and retains selection denominator", () => {
  const text = execFileSync(process.execPath, [cli.pathname, "export", "--kind", "unknown"], {
    encoding: "utf8",
  });
  const b = parseBundle(text);
  assert.equal(b.records.length, 12);
  assert.equal(b.selection.total, 144);
});
test("CLI refuses absent records and unknown filters", () => {
  for (const args of [
    ["inspect", "--id", "missing"],
    ["records", "--kind", "invented"],
  ])
    assert.equal(spawnSync(process.execPath, [cli.pathname, ...args]).status, 2);
});
test("bounded reads refuse symlink escapes", (t) => {
  const temp = mkdtempSync(join(tmpdir(), "simurgh-bound-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  symlinkSync("/etc/hosts", join(temp, "outside"));
  assert.throws(() => readBound(temp, "outside"), /escapes/);
});
test("server denies writes, host rebinding, cross-origin and filesystem escapes", async (t) => {
  const temp = mkdtempSync(join(tmpdir(), "simurgh-http-"));
  writeFileSync(join(temp, "index.html"), "<h1>Simurgh</h1>");
  symlinkSync("/etc/hosts", join(temp, "outside.json"));
  const server = createExplorerServer({ directory: temp });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    rmSync(temp, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const good = await fetch(base);
  assert.equal(good.status, 200);
  assert.match(good.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal((await fetch(base, { method: "POST" })).status, 405);
  assert.equal(
    await new Promise((resolve, reject) => {
      const r = request(base, { headers: { Host: "attacker.example" } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      r.on("error", reject);
      r.end();
    }),
    403
  );
  assert.equal(
    (await fetch(base, { headers: { Origin: "https://attacker.example" } })).status,
    403
  );
  assert.equal((await fetch(base + "/outside.json")).status, 404);
  assert.equal((await fetch(base + "/%2e%2e%2f/etc/passwd")).status, 404);
});
