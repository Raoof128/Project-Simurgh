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
    await assert.rejects(browserResult(chrome, `${base}/empty`, { timeoutMs: 1500 }), /timed out/);
    const result = await browserResult(chrome, `${base}/negative`);
    assert.equal(result.ok, false, "a browser failure result must never be converted to success");
    assert.deepEqual(result.failures, ["negative-control"]);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
