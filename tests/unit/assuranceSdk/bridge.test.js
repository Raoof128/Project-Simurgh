// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { scenarios } from "../../../tools/assurance-lab/corpus.mjs";
import { runCase } from "../../../tools/assurance-lab/study.mjs";

const path = fileURLToPath(new URL("../../../tools/assurance-sdk/bridge.mjs", import.meta.url));
function bridge() {
  const child = spawn(process.execPath, [path], { stdio: ["pipe", "pipe", "pipe"], env: {} });
  let next = 0;
  const pending = new Map();
  const exited = new Promise((resolve) =>
    child.once("exit", (code) => {
      for (const item of pending.values()) item.reject(new Error(`bridge_exit:${code}`));
      resolve(code);
    })
  );
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const reply = JSON.parse(line);
    const request = pending.get(reply.id);
    if (request) {
      pending.delete(reply.id);
      reply.error ? request.reject(new Error(reply.error)) : request.resolve(reply.result);
    }
  });
  function call(op, args = {}) {
    return new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, { resolve, reject });
      child.stdin.write(JSON.stringify({ id, op, ...args }) + "\n");
    });
  }
  return {
    child,
    call,
    exited,
    async close() {
      if (child.exitCode === null) child.stdin.end();
      await exited;
      lines.close();
    },
  };
}

test("bridge commits authority once and serializes duplicate requests", async () => {
  const client = bridge();
  try {
    await client.call("initialize", { scenarioId: "duplicate-action", mode: "exact-policy" });
    await assert.rejects(
      client.call("initialize", { scenarioId: "benign-patch", mode: "bypass" }),
      /already_initialized/
    );
    const action = scenarios().find((s) => s.id === "duplicate-action").proposals[0];
    const [first, second] = await Promise.all([
      client.call("execute", { action }),
      client.call("execute", { action }),
    ]);
    assert.equal(first.status, "executed");
    assert.equal(second.status, "denied");
    assert.equal((await client.call("snapshot")).effects.length, 1);
    await assert.rejects(client.call("execute", { action, authority: {} }), /invalid_request/);
    await assert.rejects(
      client.call("execute", { action: { ...action, resource: "../../escape" } }),
      /invalid_action/
    );
  } finally {
    await client.close();
  }
});

test("bridge projection matches the original experiment, including evidence and fault cases", async () => {
  for (const id of [
    "benign-workflow",
    "changed-content",
    "omitted-middle",
    "observer-unavailable",
    "sink-failure",
  ]) {
    const scenario = scenarios().find((s) => s.id === id);
    const expected = await runCase(scenario, "exact-policy");
    const client = bridge();
    try {
      await client.call("initialize", { scenarioId: id, mode: "exact-policy" });
      for (const action of scenario.proposals) await client.call("execute", { action });
      const result = await client.call("finish");
      for (const field of [
        "authority",
        "trace",
        "observation",
        "attackApplied",
        "benignCompleted",
        "verdict",
      ])
        assert.deepEqual(result[field], expected[field], `${id}:${field}`);
      await assert.rejects(
        client.call("execute", { action: scenario.proposals[0] }),
        /already_finished/
      );
    } finally {
      await client.close();
    }
  }
});

test("oversized and unterminated requests fail closed with a nonzero process exit", async () => {
  for (const bytes of ["x".repeat(65537), '{"id":1,"op":"snapshot"}']) {
    const client = bridge();
    await client.call("initialize", { scenarioId: "benign-patch", mode: "exact-policy" });
    client.child.stdin.end(bytes);
    assert.equal(await client.exited, 1);
    await client.close();
  }
});
