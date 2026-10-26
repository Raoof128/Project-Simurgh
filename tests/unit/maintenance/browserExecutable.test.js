import test from "node:test";
import assert from "node:assert/strict";
import { findBrowser } from "../../../scripts/lib/browserExecutable.mjs";
test("explicit browser is honored", () => {
  assert.equal(
    findBrowser({ SIMURGH_CHROME: "/owned/chrome" }, (p) => p === "/owned/chrome"),
    "/owned/chrome"
  );
});
test("invalid explicit override refuses instead of falling back", () => {
  assert.throws(() => findBrowser({ SIMURGH_CHROME: "/missing" }, () => false), /SIMURGH_CHROME/);
});
test("discovers a Linux executable on PATH", () => {
  assert.equal(
    findBrowser({ PATH: "/owned/bin" }, (p) => p === "/owned/bin/chromium"),
    "/owned/bin/chromium"
  );
});
test("no available executable is explicit absence", () => {
  assert.equal(
    findBrowser({}, () => false),
    null
  );
});

test("browser execution refuses non-loopback fixture URLs", async () => {
  const { browserResult } = await import("../../../scripts/lib/browserExecutable.mjs");
  for (const url of [
    "https://example.com/",
    "file:///tmp/index.html",
    "http://localhost/",
    "http://user@127.0.0.1/",
  ]) {
    await assert.rejects(browserResult("unused", url), /loopback/);
  }
});
test("browser process failure is a failure, not a skip", async () => {
  const { browserResult } = await import("../../../scripts/lib/browserExecutable.mjs");
  await assert.rejects(
    browserResult(process.execPath, "http://127.0.0.1:1/"),
    /browser (exited|transport failed)/
  );
});
// A stub browser that never answers, plus a lock path private to this test process: the real
// browser files run in parallel processes and must not see these stubs holding the shared lock.
async function silentBrowserStub() {
  const { mkdtempSync, writeFileSync, chmodSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "simurgh-silent-browser-"));
  const stub = join(dir, "chrome");
  writeFileSync(stub, "#!/bin/sh\necho 'stub browser: holding the pipe' >&2\nexec sleep 30\n");
  chmodSync(stub, 0o755);
  const previousLock = process.env.SIMURGH_CHROME_LAUNCH_LOCK;
  process.env.SIMURGH_CHROME_LAUNCH_LOCK = join(dir, "launch.lock");
  const restore = () => {
    if (previousLock === undefined) delete process.env.SIMURGH_CHROME_LAUNCH_LOCK;
    else process.env.SIMURGH_CHROME_LAUNCH_LOCK = previousLock;
  };
  return { dir, stub, restore };
}
test("a browser that never answers fails the LAUNCH budget, naming the step and its stderr", async () => {
  const { browserResult } = await import("../../../scripts/lib/browserExecutable.mjs");
  const { rmSync } = await import("node:fs");
  const { dir, stub, restore } = await silentBrowserStub();
  try {
    await assert.rejects(
      browserResult(stub, "http://127.0.0.1:1/", { timeoutMs: 30000, launchTimeoutMs: 400 }),
      (error) => {
        assert.match(
          error.message,
          /browser launch timed out after \d+ms awaiting Target\.createTarget/
        );
        assert.match(error.message, /completed: \(none\)/);
        assert.match(error.message, /stub browser: holding the pipe/);
        return true;
      }
    );
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("the launch lock is held while a browser starts and released when it fails", async () => {
  const { browserResult, launchLockPath } =
    await import("../../../scripts/lib/browserExecutable.mjs");
  const { existsSync, rmSync } = await import("node:fs");
  const { dir, stub, restore } = await silentBrowserStub();
  try {
    assert.equal(existsSync(launchLockPath()), false, "no launch in progress before the test");
    const attempt = browserResult(stub, "http://127.0.0.1:1/", { launchTimeoutMs: 1200 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(existsSync(launchLockPath()), true, "the lock is held during launch");
    await assert.rejects(attempt, /browser launch timed out/);
    assert.equal(existsSync(launchLockPath()), false, "the lock is released on failure");
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("a second launch waits for the first instead of starting alongside it", async () => {
  const { browserResult, launchLockPath } =
    await import("../../../scripts/lib/browserExecutable.mjs");
  const { existsSync, rmSync } = await import("node:fs");
  const { dir, stub, restore } = await silentBrowserStub();
  try {
    const first = browserResult(stub, "http://127.0.0.1:1/", { launchTimeoutMs: 600 });
    const secondStarted = Date.now();
    const second = browserResult(stub, "http://127.0.0.1:1/", { launchTimeoutMs: 2000 });
    await assert.rejects(first, /browser launch timed out/);
    const firstFailedAt = Date.now();
    await assert.rejects(
      second,
      /browser launch timed out after \d+ms awaiting Target\.createTarget/
    );
    // The launch budget runs from the call, waiting included, so the second attempt is bounded
    // (~2000 ms) yet could only spawn after the first released the lock (~600 ms in): it ends well
    // after the first did, and never before its own budget.
    assert.ok(Date.now() - secondStarted >= 1900, "second launch kept its whole budget");
    assert.ok(
      Date.now() - firstFailedAt >= 1100,
      "second launch spawned only after the first ended"
    );
    assert.equal(existsSync(launchLockPath()), false);
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("a stale launch lock left by a dead process does not block a launch", async () => {
  const { browserResult, launchLockPath } =
    await import("../../../scripts/lib/browserExecutable.mjs");
  const { mkdirSync, utimesSync, existsSync, rmSync } = await import("node:fs");
  const { dir, stub, restore } = await silentBrowserStub();
  try {
    mkdirSync(launchLockPath());
    const old = new Date(Date.now() - 10 * 60 * 1000);
    utimesSync(launchLockPath(), old, old);
    await assert.rejects(
      browserResult(stub, "http://127.0.0.1:1/", { launchTimeoutMs: 400 }),
      /browser launch timed out/
    );
    assert.equal(existsSync(launchLockPath()), false);
  } finally {
    rmSync(launchLockPath(), { recursive: true, force: true });
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("a real browser with no result times out and a subsequent run remains usable", async (t) => {
  const chrome = findBrowser();
  if (!chrome) {
    t.skip("browser absent");
    return;
  }
  const { browserResult } = await import("../../../scripts/lib/browserExecutable.mjs");
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(
      req.url === "/empty"
        ? "<p>no result</p>"
        : '<pre id="out">{"runtime":"browser","ok":false,"failures":["negative-control"]}</pre>'
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    await assert.rejects(
      browserResult(chrome, `${base}/empty`, { timeoutMs: 1500 }),
      /browser result timed out after \d+ms awaiting .*; completed: Target\.createTarget \d+ms.*; last #out /
    );
    const result = await browserResult(chrome, `${base}/negative`);
    assert.equal(result.ok, false, "a browser failure result must never be converted to success");
    assert.deepEqual(result.failures, ["negative-control"]);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
