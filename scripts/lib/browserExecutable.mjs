// SPDX-License-Identifier: AGPL-3.0-or-later
import { accessSync, constants, mkdtempSync, rmSync } from "node:fs";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
const executable = (path) => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};
export function findBrowser(env = process.env, available = executable) {
  if (env.SIMURGH_CHROME) {
    if (!available(env.SIMURGH_CHROME)) throw new Error("SIMURGH_CHROME is not executable");
    return env.SIMURGH_CHROME;
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ...(env.PATH || "")
      .split(delimiter)
      .filter(Boolean)
      .flatMap((dir) =>
        ["chromium", "chromium-browser", "google-chrome"].map((name) => join(dir, name))
      ),
  ];
  return candidates.find(available) || null;
}
// Use Chrome's local debugging pipe: no listening port and no dependency on --dump-dom.
// Only trusted repository fixture pages may be passed; --no-sandbox is for this owned harness.
export async function browserResult(chrome, url, { timeoutMs = 30000 } = {}) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username ||
    parsed.password
  )
    throw new Error("only loopback fixture URLs are allowed");
  const profile = mkdtempSync(join(tmpdir(), "simurgh-chrome-"));
  const child = spawn(
    chrome,
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      // Unattended-run defaults (as Puppeteer uses): no keyring/D-Bus lookup at startup and no
      // throttling of a page the harness polls but never shows.
      "--password-store=basic",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-component-update",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      "--remote-debugging-pipe",
      "--no-startup-window",
      `--user-data-dir=${profile}`,
    ],
    { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] }
  );
  let id = 0,
    pending = new Map(),
    buffer = "",
    stderr = "",
    failure,
    lastValue;
  const started = Date.now();
  const deadline = started + timeoutMs;
  // A timeout names the protocol step that stalled and keeps the browser's own output, so a
  // hosted failure is diagnosable from its log rather than reproduced by guesswork.
  const timedOut = (method) =>
    new Error(
      `browser result timed out after ${Date.now() - started}ms awaiting ${method}; ` +
        `last #out ${JSON.stringify(lastValue ?? null)}; stderr: ${stderr.slice(-1200) || "(empty)"}`
    );
  const fail = (error) => {
    failure = error;
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
  };
  const closed = new Promise((resolve) => child.once("close", resolve));
  child.on("error", fail);
  child.on("exit", (code) => fail(new Error(`browser exited (${code}): ${stderr.slice(-1200)}`)));
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-4000);
  });
  const transportError = (error) => fail(new Error(`browser transport failed: ${error.message}`));
  child.stdio[3].on("error", transportError);
  child.stdio[4].on("error", transportError);
  child.stdio[4].setEncoding("utf8");
  child.stdio[4].on("data", (chunk) => {
    buffer += chunk.toString();
    let boundary;
    while ((boundary = buffer.indexOf("\0")) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        fail(new Error("invalid browser protocol response"));
        continue;
      }
      const entry = pending.get(message.id);
      if (!entry) continue;
      clearTimeout(entry.timer);
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      if (failure) return reject(failure);
      const remaining = deadline - Date.now();
      if (remaining <= 0) return reject(timedOut(method));
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(timedOut(method));
      }, remaining);
      pending.set(requestId, { resolve, reject, timer });
      child.stdio[3].write(
        JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }) +
          "\0"
      );
    });
  try {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const navigation = await send("Page.navigate", { url }, sessionId);
    if (navigation.errorText) throw new Error(`browser navigation failed: ${navigation.errorText}`);
    while (Date.now() < deadline) {
      const result = await send(
        "Runtime.evaluate",
        {
          expression: 'document.getElementById("out")?.textContent',
          returnByValue: true,
        },
        sessionId
      );
      if (result.exceptionDetails) throw new Error("browser fixture evaluation failed");
      const value = result.result?.value;
      lastValue = value;
      if (value && value !== "running…") return JSON.parse(value);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw timedOut("a fixture result");
  } finally {
    fail(new Error("browser closed"));
    child.kill();
    const force = setTimeout(() => child.kill("SIGKILL"), 2000);
    await closed;
    clearTimeout(force);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
