// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  accessSync,
  constants,
  mkdirSync,
  mkdtempSync,
  rmdirSync,
  rmSync,
  statSync,
} from "node:fs";
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
// Chrome launches from concurrently running test files are serialised. On a 4-vCPU hosted runner
// three simultaneous cold starts starved each other past the whole budget (run 40320690955). The
// lock is a directory, created atomically, held from spawn until the browser's first CDP reply and
// then released so the next file can launch; a lock older than the launch budget is stale.
// The path is read per launch so a test can give itself a private lock.
export const launchLockPath = () =>
  process.env.SIMURGH_CHROME_LAUNCH_LOCK || join(tmpdir(), "simurgh-chrome-launch.lock");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function acquireLaunchLock(deadline, staleMs) {
  const lock = launchLockPath();
  for (;;) {
    try {
      mkdirSync(lock);
      return () => {
        try {
          rmdirSync(lock);
        } catch {
          /* already released */
        }
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    try {
      if (Date.now() - statSync(lock).mtimeMs > staleMs) rmdirSync(lock);
    } catch {
      /* released by its owner between the two calls */
    }
    if (Date.now() >= deadline) return null;
    await sleep(50);
  }
}

// Use Chrome's local debugging pipe: no listening port and no dependency on --dump-dom.
// Only trusted repository fixture pages may be passed; --no-sandbox is for this owned harness.
//
// Two budgets, both fail-closed. Process start under load is bounded by launchTimeoutMs and
// measured to the first CDP reply; the fixture's work is bounded by timeoutMs from that reply.
// Eight fresh-runner jobs measured Target.createTarget at 10-29 s while the rest of the suite ran,
// so one shared 30 s budget failed whenever startup alone consumed most of it.
export async function browserResult(
  chrome,
  url,
  { timeoutMs = 30000, launchTimeoutMs = 120000 } = {}
) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username ||
    parsed.password
  )
    throw new Error("only loopback fixture URLs are allowed");
  const launchStarted = Date.now();
  let release = await acquireLaunchLock(launchStarted + launchTimeoutMs, launchTimeoutMs + 5000);
  if (!release)
    throw new Error(
      `browser launch lock not acquired within ${launchTimeoutMs}ms: another launch is still starting`
    );
  const profile = mkdtempSync(join(tmpdir(), "simurgh-chrome-"));
  const child = spawn(
    chrome,
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      // Unattended-run defaults, aligned with Puppeteer's launch set: nothing below changes what
      // the fixture page can do, only what the browser process does at startup (no crash
      // handler, keyring, field trials, extensions, sync, Cast/mDNS discovery or hang monitor).
      // Hosted gate runs stalled before the first CDP reply at a rate no diagnostic reproduced
      // (0 of 37 runs); these are the startup paths an unattended CI browser does not need.
      "--password-store=basic",
      "--use-mock-keychain",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-component-update",
      "--disable-breakpad",
      "--disable-crash-reporter",
      "--disable-client-side-phishing-detection",
      "--disable-component-extensions-with-background-pages",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-field-trial-config",
      "--disable-hang-monitor",
      "--disable-ipc-flooding-protection",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-search-engine-choice-screen",
      "--disable-sync",
      "--disable-features=Translate,AcceptCHFrame,MediaRouter,OptimizationHints",
      "--enable-automation",
      "--metrics-recording-only",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      "--remote-debugging-pipe",
      `--user-data-dir=${profile}`,
      // An initial blank tab, as Puppeteer launches, so the profile is initialised before the
      // first Target.createTarget instead of lazily by it under --no-startup-window.
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] }
  );
  let id = 0,
    pending = new Map(),
    buffer = "",
    stderr = "",
    failure,
    lastValue;
  let phase = "launch";
  let phaseStarted = launchStarted;
  let deadline = launchStarted + launchTimeoutMs;
  // A timeout names the budget and the protocol step that stalled, how long each completed step
  // took, and the browser's own output, so a hosted failure is diagnosable from its log rather
  // than reproduced by guesswork. The per-step record matters: within one budget the step named
  // as pending is not necessarily the slow one.
  const completed = [];
  const timedOut = (method) =>
    new Error(
      `browser ${phase} timed out after ${Date.now() - phaseStarted}ms awaiting ${method}; ` +
        `completed: ${completed.join(", ") || "(none)"}; ` +
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
      const sent = Date.now();
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(timedOut(method));
      }, remaining);
      const settle = (fn) => (value) => {
        // Only the first few steps are informative; the evaluate poll repeats until #out fills.
        if (completed.length < 6) completed.push(`${method} ${Date.now() - sent}ms`);
        if (phase === "launch") {
          // The browser has answered: launch is over, the fixture budget starts, the next
          // concurrently running file may launch its own browser.
          phase = "result";
          phaseStarted = Date.now();
          deadline = phaseStarted + timeoutMs;
          release?.();
          release = null;
        }
        fn(value);
      };
      pending.set(requestId, { resolve: settle(resolve), reject: settle(reject), timer });
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
    release?.();
    fail(new Error("browser closed"));
    child.kill();
    const force = setTimeout(() => child.kill("SIGKILL"), 2000);
    await closed;
    clearTimeout(force);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
