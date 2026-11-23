// SPDX-License-Identifier: AGPL-3.0-or-later
// A person starts the server from a shell. When it cannot start, it says why in one line.
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const serve = fileURLToPath(new URL("../serve.mjs", import.meta.url));
const built = ["../dist", "../node_modules/.simurgh-explorer-dist"].some((path) =>
  existsSync(fileURLToPath(new URL(path, import.meta.url)))
);
const start = (port) =>
  spawnSync(process.execPath, [serve], {
    encoding: "utf8",
    env: { ...process.env, SIMURGH_EXPLORER_PORT: String(port) },
    timeout: 20000,
  });
const oneLine = (run) => {
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  const lines = run.stderr.trim().split("\n");
  assert.equal(lines.length, 1, run.stderr);
  assert.doesNotMatch(run.stderr, /EADDRINUSE|ENOENT|\bat \S+ \(|node:/);
  return lines[0];
};

test("a server that cannot start says why in one line, with what to do", async () => {
  assert.match(oneLine(start("not-a-port")), /SIMURGH_EXPLORER_PORT.*1024 to 65535/);
  const holder = createServer();
  await new Promise((resolve) => holder.listen(0, "127.0.0.1", resolve));
  try {
    const port = holder.address().port;
    const line = oneLine(start(port));
    // Before the first build there is nothing to serve, and that is what it says. Once built,
    // the taken port is the reason.
    if (built)
      assert.ok(line.includes(String(port)) && line.includes("SIMURGH_EXPLORER_PORT"), line);
    else assert.match(line, /npm run build/);
  } finally {
    await new Promise((resolve) => holder.close(resolve));
  }
});
