// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createPolicy, evaluate, checkpoint } from "../../../tools/assurance-lab/core.mjs";
import { startSink } from "../../../tools/assurance-lab/sink.mjs";

const action = () => ({
  id: "a",
  run: "run-1",
  principal: "analyst",
  tenant: "demo",
  operation: "write",
  resource: "patch",
  content: "synthetic fix",
  policyRevision: "2",
});
const authority = () => ({ revision: "2", actions: [action()] });

test("policy binds every action field and consumes each grant once", () => {
  for (const field of Object.keys(action())) {
    const policy = createPolicy(authority(), "exact-policy");
    assert.equal(policy.allows({ ...action(), [field]: "changed" }), false, field);
    assert.equal(policy.allows(action()), true, field);
    assert.equal(policy.allows(action()), false, `duplicate ${field}`);
  }
});

test("authority snapshot cannot be amended after policy construction", () => {
  const input = authority();
  const policy = createPolicy(input, "exact-policy");
  input.actions[0].content = "substituted";
  input.actions.push({ ...action(), id: "late" });
  assert.equal(policy.allows(input.actions[0]), false);
  assert.equal(policy.allows(input.actions[1]), false);
  assert.equal(policy.allows(action()), true);
});

test("structural and authority errors fail closed, including bypass", () => {
  for (const mode of ["bypass", "exact-policy", "deny-all"]) {
    const policy = createPolicy(authority(), mode);
    for (const bad of [
      null,
      [],
      {},
      { ...action(), extra: "ignored?" },
      { ...action(), resource: "../../escape" },
      { ...action(), content: "a".repeat(257) },
    ]) {
      assert.equal(policy.allows(bad), false);
    }
    let called = false;
    const getter = {
      ...action(),
      get content() {
        called = true;
        return "synthetic fix";
      },
    };
    assert.equal(policy.allows(getter), false);
    assert.equal(called, false);
  }
  assert.throws(
    () => createPolicy({ revision: "2", actions: [action(), action()] }, "exact-policy"),
    /authority/
  );
  assert.throws(() => createPolicy(authority(), "typo"), /mode/);
  assert.equal(
    createPolicy({ revision: "3", actions: [action()] }, "exact-policy").allows(action()),
    false
  );
});

test("non-enumerable action fields cannot escape exact-action canonical binding", () => {
  const hidden = action();
  Object.defineProperty(hidden, "content", { value: "unapproved", enumerable: false });
  for (const mode of ["bypass", "exact-policy", "deny-all"]) {
    assert.equal(createPolicy(authority(), mode).allows(hidden), false);
    assert.throws(
      () => createPolicy({ revision: "2", actions: [hidden] }, mode),
      /invalid_authority/
    );
  }
});

test("authority arrays must be dense data without accessor evaluation or extra properties", () => {
  const accessor = [action()];
  let reads = 0;
  Object.defineProperty(accessor, "0", {
    get() {
      reads++;
      return { ...action(), content: reads > 2 ? "substituted" : "synthetic fix" };
    },
  });
  const extra = [action()];
  extra.extra = true;
  const overridden = [action()];
  overridden.every = () => true;
  for (const actions of [accessor, Array(1), extra, overridden]) {
    assert.throws(
      () => createPolicy({ revision: "2", actions }, "exact-policy"),
      /invalid_authority/
    );
  }
  assert.equal(reads, 0);
});

test("sparse or accessor observations are unknown without evaluating getters", () => {
  const accessor = [{ sequence: 1, action: action() }];
  let reads = 0;
  Object.defineProperty(accessor, "0", {
    get() {
      reads++;
      return { sequence: 1, action: action() };
    },
  });
  for (const effects of [Array(1), accessor]) {
    assert.equal(evaluate(authority(), [], { available: true, effects }).reconciled, "unknown");
  }
  assert.equal(reads, 0);
});

test("sink performs real disk writes in another process and cleans its directory", async () => {
  const sink = await startSink();
  const directory = sink.directory;
  try {
    assert.notEqual(sink.pid, process.pid);
    const event = await sink.execute(action());
    const names = await readdir(directory);
    assert.equal(names.length, 1);
    assert.deepEqual(JSON.parse(await readFile(join(directory, names[0]), "utf8")), event);
    assert.deepEqual(await sink.snapshot(), { available: true, effects: [event] });
    await assert.rejects(sink.execute({ ...action(), resource: "../outside" }), /invalid_action/);
    assert.equal((await sink.snapshot()).effects.length, 1);
  } finally {
    await sink.close();
  }
  await assert.rejects(access(directory), { code: "ENOENT" });
});

test("observer uses disk state rather than the executor return object", async () => {
  const sink = await startSink();
  try {
    const event = await sink.execute(action());
    event.action.content = "fabricated";
    const snapshot = await sink.snapshot();
    assert.equal(snapshot.effects[0].action.content, "synthetic fix");
    assert.equal(evaluate(authority(), [event], snapshot).reconciled, "mismatch");
    const [file] = await readdir(sink.directory);
    await writeFile(join(sink.directory, file), JSON.stringify(event));
    const changedDisk = await sink.snapshot();
    assert.equal(changedDisk.effects[0].action.content, "fabricated");
    assert.equal(evaluate(authority(), [event], changedDisk).forbiddenEffects, 1);
  } finally {
    await sink.close();
  }
});

test("reconciliation exposes omission and duplication and never treats missing observation as safe", () => {
  const event = { sequence: 1, action: action() };
  const observation = { available: true, effects: [event] };
  const omitted = evaluate(authority(), [], observation);
  assert.equal(omitted.traceOnly, "consistent");
  assert.equal(omitted.checkpoint, "mismatch");
  assert.equal(omitted.reconciled, "mismatch");
  assert.equal(omitted.forbiddenEffects, 0);
  assert.equal(evaluate(authority(), [event], observation).reconciled, "consistent");
  const repeated = [event, { sequence: 2, action: action() }];
  const result = evaluate(authority(), repeated, { available: true, effects: repeated });
  assert.equal(result.forbiddenEffects, 1);
  assert.equal(result.reconciled, "violation");
  const missing = evaluate(authority(), [], { available: false, reason: "observer_unavailable" });
  assert.equal(missing.forbiddenEffects, null);
  assert.equal(missing.reconciled, "unknown");
  assert.equal(missing.checkpoint, "unknown");
  assert.notDeepEqual(checkpoint([]), checkpoint([event]));
});

test("child failure rejects outstanding work and can be cleaned up", async () => {
  const sink = await startSink();
  try {
    await sink.crashForTest();
    await assert.rejects(sink.snapshot(), /sink_closed/);
  } finally {
    await sink.close();
  }
  await assert.rejects(access(sink.directory), { code: "ENOENT" });
});
