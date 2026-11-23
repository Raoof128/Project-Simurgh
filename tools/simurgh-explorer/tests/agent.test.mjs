import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../index.mjs";
import { VIEWS, lanesSummary, queryLanes, trackRecord } from "../core.mjs";
import {
  COMMANDS,
  EXIT,
  NOTICE,
  WATCH_SCHEMA,
  answer,
  commandForView,
  compare,
  run,
} from "../agent.mjs";

const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const b = buildIndex();
const call = (...args) => {
  const r = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr };
};

test("every view of the dashboard has a command, and the tool describes itself", () => {
  for (const view of VIEWS) assert.ok(commandForView(view), `a command for the ${view} view`);
  const listed = call("commands");
  assert.equal(listed.status, EXIT.ok);
  assert.deepEqual(
    listed.out.data.map((c) => c.name),
    COMMANDS.map((c) => c.name)
  );
  assert.deepEqual(
    listed.out.data.filter((c) => c.view).map((c) => c.view),
    VIEWS
  );
  for (const c of listed.out.data) assert.ok(c.summary.length > 10, c.name);
  assert.equal(listed.out.notice, NOTICE);
});

test("the commands return what the views show", () => {
  const record = call("record").out;
  assert.deepEqual(record.data.totals, lanesSummary(b));
  assert.deepEqual(record.data.track_record, trackRecord(b));
  assert.equal(record.data.failed.length, lanesSummary(b).failed);
  assert.deepEqual(
    record.data.lanes.map((l) => [l.id, l.predictions.length]),
    b.lanes.map((l) => [l.id, l.hypotheses.length])
  );
  assert.equal(record.verification, "not_verified_by_explorer");

  const replicate = call("replicate", "--outside", "owed").out.data;
  assert.deepEqual(
    replicate.lanes.map((l) => [l.id, l.verify]),
    queryLanes(b, { outside: "owed" }).map((l) => [l.id, l.verify])
  );
  assert.deepEqual(replicate.handoff, b.handoff);

  const library = call("library", "--collection", "phase19").out.data;
  assert.equal(library.length, b.documents.filter((d) => d.kind === "phase19").length);
  assert.ok(library.every((d) => !("text" in d) && d.length > 0));

  // A document read a part at a time is the document.
  const doc = b.documents.find((d) => d.text.length > 3000 && d.text.length < 60000);
  let text = "",
    offset = 0,
    parts = 0;
  while (offset !== null) {
    const part = call("doc", "--id", doc.id, "--offset", String(offset), "--limit", "2500").out
      .data;
    text += part.text;
    offset = part.more;
    parts += 1;
  }
  assert.equal(text, doc.text);
  assert.ok(parts > 1);

  assert.deepEqual(call("open-work").out.data, b.open_work);
  assert.deepEqual(call("other").out.data, b.other);
  assert.deepEqual(
    call("outcomes", "--kind", "unauthorized").out.data,
    call("records", "--kind", "unauthorized").out.data
  );
});

test("check and watch tell a watcher when to look, by exit code", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-explorer-watch-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const baseline = join(dir, "baseline.json");

  const all = call("check", "--all");
  assert.equal(all.status, EXIT.ok);
  assert.deepEqual(
    [all.out.attention, all.out.data.checked, all.out.data.matching],
    [false, b.lanes.length, b.lanes.length]
  );
  assert.equal(call("check", "--id", "no-such-lane").status, EXIT.refused);

  const first = call("watch", "--write-baseline", baseline);
  assert.equal(first.status, EXIT.ok);
  assert.deepEqual(first.out.data.changes, []);
  assert.equal(first.out.data.packs_matching, b.lanes.length);
  const saved = JSON.parse(readFileSync(baseline, "utf8"));
  assert.equal(saved.schema, WATCH_SCHEMA);

  const again = call("watch", "--baseline", baseline);
  assert.equal(again.status, EXIT.ok, "nothing changed, so nothing to look at");
  assert.deepEqual(again.out.data.changes, []);

  // A baseline that remembers a different past: one root, one outcome, one lane, one owed item.
  const past = structuredClone(saved);
  const ids = Object.keys(past.lanes);
  const withOutcome = ids.find((id) => Object.keys(past.lanes[id].outcomes).length);
  const key = Object.keys(past.lanes[withOutcome].outcomes)[0];
  past.lanes[ids[0]].root = "0".repeat(64);
  past.lanes[withOutcome].outcomes[key] = "something else";
  delete past.lanes[ids.at(-1)];
  past.lanes["gone"] = { root: "1".repeat(64), pack: "match", outcomes: {}, outside: [] };
  past.owed = past.owed.slice(1);
  writeFileSync(baseline, JSON.stringify(past));
  const changed = call("watch", "--baseline", baseline);
  assert.equal(changed.status, EXIT.attention);
  assert.equal(changed.out.attention, true);
  const kinds = changed.out.data.changes.map((c) => `${c.kind}:${c.lane ?? c.item}`);
  for (const expected of [
    `root_changed:${ids[0]}`,
    `outcome_changed:${withOutcome}`,
    `lane_added:${ids.at(-1)}`,
    "lane_removed:gone",
    `owed_added:${saved.owed[0]}`,
  ])
    assert.ok(kinds.includes(expected), expected);

  // News alone is reported and is not an alarm.
  const news = structuredClone(saved);
  news.owed = news.owed.slice(1);
  writeFileSync(baseline, JSON.stringify(news));
  const quiet = call("watch", "--baseline", baseline);
  assert.equal(quiet.status, EXIT.ok);
  assert.deepEqual(
    quiet.out.data.changes.map((c) => c.kind),
    ["owed_added"]
  );

  writeFileSync(baseline, JSON.stringify({ schema: "something else" }));
  assert.equal(call("watch", "--baseline", baseline).status, EXIT.refused);

  // A pack that does not match is serious with or without a baseline.
  const now = structuredClone(saved);
  now.lanes[ids[0]].pack = "differs";
  assert.deepEqual(
    compare(null, now).map((c) => [c.kind, c.serious]),
    [["pack_differs", true]]
  );
});

test("the same commands answer as tools over standard input and output", () => {
  const lane = b.lanes.at(-1);
  const lines = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "simurgh_lane", arguments: { id: lane.id } },
    },
    { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "simurgh_no_such_tool" } },
    {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "simurgh_watch", arguments: { baseline: "/etc/hosts" } },
    },
    { jsonrpc: "2.0", id: 6, method: "no/such/method" },
  ].map((m) => JSON.stringify(m));
  const r = spawnSync(process.execPath, [cli, "mcp"], {
    input: [...lines.slice(0, 3), "this is not JSON", ...lines.slice(3)].join("\n") + "\n",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const replies = r.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const by = (id) => replies.find((m) => m.id === id);
  assert.equal(
    replies.length,
    7,
    "one reply for each request and for the bad line, none for the notification"
  );
  assert.equal(by(1).result.serverInfo.name, "simurgh-explorer");
  assert.ok(by(1).result.instructions.includes(NOTICE));

  const tools = by(2).result.tools;
  assert.ok(tools.length >= VIEWS.length);
  for (const view of VIEWS)
    assert.ok(
      tools.some((t) => t.name === `simurgh_${commandForView(view).name.replaceAll("-", "_")}`),
      `a tool for the ${view} view`
    );
  for (const t of tools) {
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.inputSchema.additionalProperties, false);
    for (const path of ["file", "baseline", "write_baseline"])
      assert.ok(!(path in t.inputSchema.properties), `${t.name} takes no path`);
  }

  const called = by(3).result;
  assert.equal(called.isError, false);
  const envelope = JSON.parse(called.content[0].text);
  assert.deepEqual(envelope.data, lane);
  assert.equal(envelope.notice, NOTICE);
  assert.equal(by(4).result.isError, true);
  assert.equal(by(5).result.isError, true, "a tool refuses a path");
  assert.match(JSON.parse(by(5).result.content[0].text).error, /Unknown argument/);
  assert.equal(by(6).error.code, -32601);
  assert.equal(replies.find((m) => m.id === null).error.code, -32700);
});

test("a command that needs --id says so, and the README lists every command", () => {
  for (const name of ["lane", "inspect", "doc", "check"]) {
    const refused = call(name);
    assert.equal(refused.status, EXIT.refused, name);
    assert.match(refused.err, /--id/, `${name} names the missing option`);
    assert.doesNotMatch(refused.err, /not found/, name);
  }
  assert.match(call("lane", "--id", "no-such-lane").err, /not found/);
  const page = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const c of COMMANDS)
    assert.match(page, new RegExp("`" + c.name + "[` ]"), `the README names ${c.name}`);
});

test("the tool server answers a line that is not a request, and goes on", async () => {
  for (const bad of [null, 5, "text", [], {}])
    assert.equal((await answer(bad, "0")).error.code, -32600, JSON.stringify(bad));
  const r = spawnSync(process.execPath, [cli, "mcp"], {
    input: 'null\n5\n[]\n{"jsonrpc":"2.0","id":1,"method":"ping"}\n',
    encoding: "utf8",
  });
  const replies = r.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(replies.length, 4);
  assert.deepEqual(replies.at(-1), { jsonrpc: "2.0", id: 1, result: {} });
  assert.equal(r.status, 0);
});

test("a tool call with an argument of the wrong type or outside its list is refused", async () => {
  const call = (name, args) =>
    answer(
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
      "0"
    ).then((m) => ({ isError: m.result.isError, ...JSON.parse(m.result.content[0].text) }));
  assert.match((await call("simurgh_library", { q: 5 })).error, /q must be a string/);
  assert.match(
    (await call("simurgh_library", { collection: "nope" })).error,
    /collection must be one of/
  );
  assert.match(
    (await call("simurgh_doc", { id: "x", limit: "ten" })).error,
    /limit must be a whole number/
  );
  assert.equal((await call("simurgh_library", { collection: "phase19" })).isError, false);
  // The command line refuses the same unknown value.
  await assert.rejects(run("library", { collection: "nope" }), /collection must be one of/);
});
