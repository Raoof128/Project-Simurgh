// SPDX-License-Identifier: AGPL-3.0-or-later
import { fork } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export async function startSink() {
  const directory = await mkdtemp(join(tmpdir(), "simurgh-assurance-"));
  const child = fork(fileURLToPath(new URL("./sink-worker.mjs", import.meta.url)), [directory], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    execArgv: [],
    env: {},
  });
  const pending = new Map();
  let closed = false;
  let nextId = 0;
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  function failAll(error) {
    closed = true;
    readyReject(error);
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  }
  const exited = new Promise((resolve) =>
    child.once("exit", () => {
      failAll(new Error("sink_closed"));
      resolve();
    })
  );
  child.on("error", (error) => failAll(error));
  child.on("message", (message) => {
    if (message.ready) {
      readyResolve();
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error));
    else request.resolve(message.result);
  });
  const startupTimer = setTimeout(() => {
    failAll(new Error("sink_start_timeout"));
    child.kill("SIGKILL");
  }, 10000);
  try {
    await ready;
  } catch (error) {
    child.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
    throw error;
  } finally {
    clearTimeout(startupTimer);
  }
  function request(operation, action) {
    if (closed || !child.connected) return Promise.reject(new Error("sink_closed"));
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        failAll(new Error("sink_timeout"));
        child.kill("SIGKILL");
      }, 10000);
      pending.set(id, { resolve, reject, timer });
      child.send({ id, operation, action }, (error) => {
        if (error) {
          failAll(error);
          child.kill("SIGKILL");
        }
      });
    });
  }
  return {
    directory,
    pid: child.pid,
    execute: (action) => request("execute", action),
    snapshot: () => request("snapshot"),
    async crashForTest() {
      child.kill("SIGKILL");
      await exited;
    },
    async close() {
      if (!closed) child.kill("SIGKILL");
      await exited;
      await rm(directory, { recursive: true, force: true });
    },
  };
}
