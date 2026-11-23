// SPDX-License-Identifier: AGPL-3.0-or-later
// End to end in a real browser: the built app, served by the real server, driven in Chrome over
// its debugging protocol. Nothing is mocked and no package is added: Node's own WebSocket talks
// to a Chrome that is already on the machine. Without one, the test is skipped and says so.
//
// Every expected value is computed here from the repository (the index, the receipts, the root
// files). No lane, count or hash is written into this file.
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../../index.mjs";
import { lanesSummary, queryLanes, queryRecords, searchDocuments, summary } from "../../core.mjs";
import { createExplorerServer } from "../../serve.mjs";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const WIDTHS = [375, 768, 1024, 1440];
const VIEWS = ["record", "lanes", "replicate", "outcomes", "library", "open"];

function findChrome() {
  const named = [
    process.env.SIMURGH_CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);
  for (const path of named) if (existsSync(path)) return path;
  for (const name of ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"]) {
    const found = spawnSync("which", [name], { encoding: "utf8" }).stdout.trim();
    if (found) return found;
  }
  return null;
}

// A small client for the browser's debugging protocol.
async function openBrowser(executable) {
  const profile = mkdtempSync(join(tmpdir(), "simurgh-explorer-e2e-"));
  const child = spawn(
    executable,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  const endpoint = await new Promise((resolve, reject) => {
    let seen = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not start")), 20000);
    child.stderr.on("data", (chunk) => {
      seen += chunk;
      const m = seen.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    child.on("exit", () => reject(new Error("Chrome exited before it was ready")));
  });
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let next = 0;
  const waiting = new Map(),
    problems = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waiting.has(message.id)) {
      const { resolve, reject } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown")
      problems.push(`exception: ${message.params.exceptionDetails.text}`);
    else if (
      message.method === "Runtime.consoleAPICalled" &&
      ["error", "warning", "assert"].includes(message.params.type)
    )
      problems.push(
        `console ${message.params.type}: ${message.params.args.map((a) => a.value ?? a.description).join(" ")}`
      );
    else if (
      message.method === "Log.entryAdded" &&
      ["error", "warning"].includes(message.params.entry.level)
    )
      problems.push(`log ${message.params.entry.level}: ${message.params.entry.text}`);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      waiting.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  for (const domain of ["Page", "Runtime", "Log"]) await page(`${domain}.enable`);
  const evaluate = async (expression) => {
    const result = await page("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        `In page: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`
      );
    return result.result.value;
  };
  const waitFor = async (expression, what) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`Timed out waiting for ${what}`);
  };
  return {
    page,
    evaluate,
    waitFor,
    problems,
    close() {
      socket.close();
      child.kill();
      rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}

// Helpers that run inside the page. They act as a person does: by what is written on a control.
const IN_PAGE = `
window.t = {
  all: (selector) => [...document.querySelectorAll(selector)],
  text: (selector) => document.querySelector(selector)?.textContent ?? null,
  texts: (selector) => [...document.querySelectorAll(selector)].map((n) => n.textContent),
  count: (selector) => document.querySelectorAll(selector).length,
  click(text) {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === text);
    if (!b) throw new Error("no button " + text);
    b.click();
  },
  view(name) {
    const b = [...document.querySelectorAll("nav button")].find((x) => x.textContent.startsWith(name));
    if (!b) throw new Error("no view " + name);
    b.click();
  },
  set(label, value) {
    const el = document.querySelector('[aria-label="' + label + '"]');
    if (!el) throw new Error("no control " + label);
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  },
  settle: () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  // Text whose contrast with the colour behind it is under the WCAG AA ratio: 4.5, or 3 for
  // large text. Disabled controls are exempt, as the guideline says.
  lowContrast() {
    const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const parse = (css) => (css.match(/[0-9.]+/g) || []).map(Number);
    const luminance = ([r, g, b]) =>
      0.2126 * channel(r / 255) + 0.7152 * channel(g / 255) + 0.0722 * channel(b / 255);
    const behind = (node) => {
      for (let n = node; n; n = n.parentElement) {
        const [r, g, b, a = 1] = parse(getComputedStyle(n).backgroundColor);
        if (a > 0.99) return [r, g, b];
      }
      return [255, 255, 255];
    };
    const bad = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const el = text.parentElement;
      if (!text.nodeValue.trim() || el.closest("[disabled], .visually-hidden, svg, option")) continue;
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const style = getComputedStyle(el);
      const fg = luminance(parse(style.color)), bg = luminance(behind(el));
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5))
        bad.push(text.nodeValue.trim().slice(0, 40) + " " + ratio.toFixed(2));
    }
    return [...new Set(bad)];
  },
  // Controls a finger has to hit that are shorter than 44 pixels.
  smallTargets() {
    return [...document.querySelectorAll("button, select, input[type=search], label.check, summary")]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .filter((el) => el.getBoundingClientRect().height < 43.5)
      .map((el) => el.tagName + " " + el.textContent.trim().slice(0, 30));
  },
};
true`;

const chrome = findChrome();
const dist = fileURLToPath(new URL("../../node_modules/.simurgh-explorer-dist/", import.meta.url));

test(
  "the built explorer, in a real browser, shows every lane as the repository records it",
  {
    skip: !chrome
      ? "no Chrome, Chromium or Edge found; set SIMURGH_CHROME to run this test"
      : !existsSync(join(dist, "evidence.json"))
        ? "the app is not built; run npm run build first"
        : false,
    timeout: 300000,
  },
  async (t) => {
    const b = buildIndex();
    const s = lanesSummary(b);
    // The page must be showing the index this test computed, not an older build.
    const built = JSON.parse(readFileSync(join(dist, "evidence.json"), "utf8"));
    assert.deepEqual(
      built.lanes.map((l) => [l.id, l.root, l.hypotheses]),
      b.lanes.map((l) => [l.id, l.root, l.hypotheses]),
      "the build is stale: run npm run build"
    );
    const server = createExplorerServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await openBrowser(chrome);
    const { evaluate, waitFor, page } = browser;
    const open = async (hash = "") => {
      await page("Page.navigate", { url: `${origin}/${hash}` });
      await waitFor("document.querySelector('main h1')", "the app to render");
      await evaluate(IN_PAGE);
    };
    const go = async (hash) => {
      await evaluate(`(location.hash = ${JSON.stringify(hash)}, t.settle())`);
    };
    const plain = (text) => text.replaceAll("`", "");
    t.after(() => {
      browser.close();
      server.close();
    });

    await t.test("the record: logo, every lane, every prediction, the totals", async () => {
      await page("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await open();
      assert.equal(await evaluate("t.text('main h1')"), "The Phase 19 record");
      assert.equal(await evaluate("document.querySelector('.brand img').naturalWidth > 0"), true);
      assert.equal(await evaluate("t.text('.wordmark')"), "ProjectSimurgh");
      assert.equal(await evaluate("t.count('.strip-lane')"), b.lanes.length);
      assert.deepEqual(
        await evaluate("t.texts('.strip-id')"),
        b.lanes.map((l) => l.id)
      );
      const marks = b.lanes.flatMap((l) => l.hypotheses);
      assert.equal(await evaluate("t.count('.strip .mark')"), marks.length);
      for (const outcome of ["held", "failed", "undecided", "by_model"])
        assert.equal(
          await evaluate(`t.count('.strip .mark-${outcome}')`),
          marks.filter((h) => h.outcome === outcome).length,
          outcome
        );
      assert.equal(await evaluate("t.count('.failed-list li')"), s.failed);
      const ledger = await evaluate("t.text('.ledger')");
      for (const phrase of [
        `Packs${s.packs}`,
        `${s.held} held, ${s.failed} did not`,
        `${s.with_model} of ${s.packs}`,
        `${s.outside_items - s.owed_items} of ${s.outside_items} items`,
        `${s.independent_custody} of ${s.packs}`,
      ])
        assert.ok(ledger.includes(phrase), `ledger says "${phrase}"`);
    });

    await t.test("every lane opens and shows what its own files record", async () => {
      for (const lane of b.lanes) {
        await go(`#lanes/${lane.id}`);
        await waitFor(
          `t.text('.inspector .kicker')?.startsWith('Lane ${lane.id}')`,
          `lane ${lane.id}`
        );
        const seen = await evaluate(`({
          title: t.text('.inspector h2'),
          summary: t.text('.inspector .reading'),
          command: t.text('.inspector .command'),
          root: t.text('.inspector .hash code'),
          selected: t.text('tr.selected .lane-id'),
          hyps: t.all('.inspector .hyp').map((n) => ({
            id: n.querySelector('strong').textContent,
            words: n.querySelector('.hyp-head span').textContent,
            failed: n.classList.contains('hyp-failed'),
          })),
          limits: t.count('.inspector h3 + .plain-list li'),
          models: t.texts('.inspector .models code'),
          outside: t.texts('.inspector .outside-items li'),
        })`);
        const dir = `docs/research/provenance-phase-${lane.id}`;
        const receipt = JSON.parse(readFileSync(join(REPO, dir, "receipt.json"), "utf8"));
        assert.equal(seen.title, plain(lane.title), `${lane.id} title`);
        assert.equal(seen.summary, plain(lane.summary), `${lane.id} summary`);
        assert.equal(seen.selected, lane.id, `${lane.id} is the selected row`);
        assert.equal(seen.command, lane.verify, `${lane.id} command`);
        assert.equal(
          seen.root,
          readFileSync(join(REPO, dir, "ROOT.sha256"), "utf8").trim(),
          `${lane.id} root is the committed root file`
        );
        assert.equal(seen.root, receipt.manifest_sha256, `${lane.id} root is the receipt's`);
        assert.deepEqual(
          seen.hyps.map((h) => h.id),
          lane.hypotheses.map((h) => h.id),
          `${lane.id} predictions`
        );
        const recorded = { ...receipt.hypotheses, ...receipt.hypothesis, ...receipt.predictions };
        for (const h of seen.hyps) {
          if (typeof recorded[h.id] !== "boolean") continue;
          assert.equal(
            h.failed,
            recorded[h.id] === false,
            `${lane.id} ${h.id} against its receipt`
          );
          assert.equal(h.words, recorded[h.id] ? "Held" : "Did not hold", `${lane.id} ${h.id}`);
        }
        assert.equal(seen.limits, lane.limits.length, `${lane.id} limits`);
        assert.deepEqual(seen.models, lane.models, `${lane.id} models`);
        assert.equal(seen.outside.length, 1 + lane.outside.deeper.length, `${lane.id} outside`);
        assert.equal(
          seen.outside[0].endsWith("owed"),
          lane.outside.verify === "owed",
          `${lane.id} outside state`
        );
      }
    });

    await t.test("a column of the record opens its lane, and Back returns", async () => {
      const lane = b.lanes.find((l) => l.hypotheses.length);
      await open("#record");
      await evaluate(
        `(t.all('.strip-lane').find((x) => x.getAttribute('aria-label').startsWith('Lane ${lane.id}:')).click(), t.settle())`
      );
      assert.ok((await evaluate("t.text('.inspector .kicker')")).startsWith(`Lane ${lane.id}`));
      assert.equal(await evaluate("location.hash"), `#lanes/${lane.id}`);
      await evaluate("(t.view('Replicate'), t.settle())");
      assert.equal(await evaluate("t.text('main h1')"), "Replicate");
      await evaluate("(history.back(), new Promise((r) => setTimeout(r, 150)))");
      assert.equal(await evaluate("t.text('main h1')"), "Lanes");
      await evaluate("(history.back(), new Promise((r) => setTimeout(r, 150)))");
      assert.equal(await evaluate("t.text('main h1')"), "The Phase 19 record");
    });

    await t.test("filters and search return what the shared query layer returns", async () => {
      await open("#lanes");
      const rows = () => evaluate("t.texts('.lanes-table tbody .lane-id')");
      const controls = {
        ran: "Filter by model use",
        outcome: "Filter by prediction outcome",
        outside: "Filter by outside check",
      };
      for (const [key, label] of Object.entries(controls)) {
        const values = await evaluate(
          `t.all('[aria-label="${label}"] option').map((o) => o.value)`
        );
        assert.ok(values.length > 1, `${label} offers choices`);
        for (const value of values) {
          await evaluate(`(t.set(${JSON.stringify(label)}, ${JSON.stringify(value)}), t.settle())`);
          assert.deepEqual(
            await rows(),
            queryLanes(b, { [key]: value }).map((l) => l.id),
            `${key}=${value}`
          );
        }
        await evaluate(`(t.set(${JSON.stringify(label)}, "all"), t.settle())`);
      }
      const query = b.lanes.at(-1).title.split(" ").slice(0, 3).join(" ");
      await evaluate(`(t.set("Search lanes", ${JSON.stringify(query)}), t.settle())`);
      assert.deepEqual(
        await rows(),
        queryLanes(b, { q: query }).map((l) => l.id)
      );
      await evaluate(`(t.set("Search lanes", "no lane says this zqxj"), t.settle())`);
      assert.equal((await rows()).length, 0);
      assert.match(await evaluate("t.text('.empty')"), /No lane matches/);
      await evaluate("(t.click('Clear filters'), t.settle())");
      assert.equal((await rows()).length, b.lanes.length);
      assert.equal(await evaluate("t.count('.other-list li')"), b.other.length);
    });

    await t.test("replicate, outcomes, library and open work", async () => {
      await go("#replicate");
      assert.deepEqual(
        await evaluate("t.texts('.command-row .command')"),
        b.lanes.map((l) => l.verify)
      );
      await evaluate("(document.querySelector('.check input').click(), t.settle())");
      assert.equal(
        await evaluate("t.count('.command-row')"),
        queryLanes(b, { outside: "owed" }).length
      );
      await go("#outcomes");
      assert.equal(await evaluate("t.count('.outcomes-table tbody tr')"), b.records.length);
      await evaluate("(t.click('Unauthorized'), t.settle())");
      assert.equal(
        await evaluate("t.count('.outcomes-table tbody tr')"),
        queryRecords(b, { kind: "unauthorized" }).length
      );
      assert.ok(
        (await evaluate("t.text('.ledger')")).includes(`Outcomes kept${summary(b).records}`)
      );
      await go("#library");
      assert.equal(await evaluate("t.count('.result')"), b.documents.length);
      const word = b.lanes.at(-1).unit;
      await evaluate(`(t.set("Search the library", ${JSON.stringify(word)}), t.settle())`);
      assert.equal(await evaluate("t.count('.result')"), searchDocuments(b, word, "").length);
      await evaluate("(document.querySelector('.result').click(), t.settle())");
      assert.ok((await evaluate("t.text('.document-text')")).length > 100);
      await go("#open");
      assert.deepEqual(
        await evaluate("t.texts('.work h3')"),
        b.open_work.map((w) => w.title)
      );
      const chip = await evaluate("t.text('.work .chip')");
      assert.ok(
        b.lanes.some((l) => l.id === chip),
        "a lane named in the open work is a lane"
      );
      await evaluate("(document.querySelector('.work .chip').click(), t.settle())");
      assert.equal(await evaluate("location.hash"), `#lanes/${chip}`);
      assert.equal(await evaluate("t.text('main h1')"), "Lanes");
    });

    await t.test("the page recomputes every pack's root, and reports a wrong file", async () => {
      // One pack checked from its lane is one pack checked: the tally of all of them waits
      // until all of them have been read.
      await open(`#lanes/${b.lanes[0].id}`);
      await evaluate("(t.click('Check this pack in your browser'), t.settle())");
      await waitFor("t.count('.inspector .members li') > 0", "one pack to be checked");
      await go("#replicate");
      const partial = await evaluate("t.text('.sweep-result')");
      assert.match(partial, /^1 checked so far/);
      assert.ok(!partial.includes(`of ${b.lanes.length} packs hash`), partial);
      await open("#replicate");
      await evaluate("(t.click('Check all packs'), t.settle())");
      await waitFor(
        `t.count('.command-row .check-result .hash') === ${b.lanes.length}`,
        "every pack to be checked"
      );
      assert.ok(
        (await evaluate("t.text('.sweep-result')")).startsWith(
          `${b.lanes.length} of ${b.lanes.length} packs hash to their committed root`
        )
      );
      assert.deepEqual(
        await evaluate("t.texts('.command-row .check-result .hash code')"),
        b.lanes.map((l) => l.root),
        "each root shown was computed from the pack's bytes and equals the committed one"
      );
      // One lane's own check keeps the bytes, so the reader can look inside the pack.
      const inside = b.lanes.find((l) => l.served) ?? b.lanes[0];
      await go(`#lanes/${inside.id}`);
      await evaluate("(t.click('Check this pack in your browser'), t.settle())");
      await waitFor("t.count('.inspector .members li') > 0", "the members to be listed");
      const members = await evaluate("t.texts('.inspector .members li code')");
      assert.ok(members.includes("manifest.json"));
      await evaluate(
        "(t.all('.inspector .members button').find((x) => x.textContent === 'manifest.json').click(), t.settle())"
      );
      const manifest = JSON.parse(await evaluate("t.text('.inspector .members pre')"));
      assert.deepEqual(
        Object.keys(manifest.files).sort(),
        members.filter((m) => m !== "manifest.json").sort(),
        "the manifest shown in the page lists the members shown beside it"
      );
      if (inside.served)
        assert.ok(
          (await evaluate("t.text('.inspector .facts')")).includes("Model id the provider returned")
        );
      // Hand one lane the intact pack of another through the real file input.
      const [lane, other] = [b.lanes[0], b.lanes.at(-1)];
      await go(`#lanes/${lane.id}`);
      const { root } = await page("DOM.getDocument", {});
      const { nodeId } = await page("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: ".inspector input[type=file]",
      });
      await page("DOM.setFileInputFiles", { nodeId, files: [join(REPO, other.pack)] });
      await waitFor(
        "t.text('.inspector .check-result')?.includes('does not match')",
        "the wrong file to be reported"
      );
      const told = await evaluate("t.text('.inspector .check-result')");
      assert.ok(told.includes("its manifest does not hash to the committed root"));
      assert.ok(told.includes(other.root), "the root of the file that was given is shown");
    });

    await t.test(
      "keyboard: the first stop is the skip link, and a view opens on Enter",
      async () => {
        await open("#record");
        const key = (name, code) =>
          Promise.all(
            ["keyDown", "keyUp"].map((type) =>
              page("Input.dispatchKeyEvent", {
                type,
                key: name,
                code: name,
                windowsVirtualKeyCode: code,
              })
            )
          );
        await key("Tab", 9);
        assert.equal(await evaluate("document.activeElement.className"), "skip");
        await evaluate("document.querySelectorAll('nav button')[1].focus()");
        assert.equal(
          await evaluate("getComputedStyle(document.activeElement).outlineStyle !== 'none'"),
          true,
          "the focused control shows a ring"
        );
        await page("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "Enter",
          code: "Enter",
          windowsVirtualKeyCode: 13,
          text: "\r",
        });
        await page("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter" });
        await evaluate("t.settle()");
        assert.equal(await evaluate("t.text('main h1')"), "Lanes");
      }
    );

    await t.test("no view scrolls sideways at four widths, in light and in dark", async () => {
      const paper = {};
      for (const scheme of ["light", "dark"]) {
        await page("Emulation.setEmulatedMedia", {
          // Reduced motion switches the short colour transitions off, so a control is read in
          // its settled colours and not part-way through a change of scheme.
          features: [
            { name: "prefers-color-scheme", value: scheme },
            { name: "prefers-reduced-motion", value: "reduce" },
          ],
        });
        for (const width of WIDTHS) {
          await page("Emulation.setDeviceMetricsOverride", {
            width,
            height: 900,
            deviceScaleFactor: 1,
            mobile: width < 760,
          });
          for (const view of VIEWS) {
            await go(`#${view}`);
            const [content, viewport] = await evaluate(
              "[document.documentElement.scrollWidth, document.documentElement.clientWidth]"
            );
            assert.ok(content <= viewport, `${view} at ${width}px, ${scheme}: ${content} wide`);
            if (width === WIDTHS[0] || width === WIDTHS.at(-1))
              assert.deepEqual(
                await evaluate("t.lowContrast()"),
                [],
                `text contrast in ${view} at ${width}px, ${scheme}`
              );
          }
        }
        paper[scheme] = await evaluate("getComputedStyle(document.body).backgroundColor");
      }
      assert.notEqual(paper.light, paper.dark, "the dark scheme is its own palette");
      // The checks above passed. Show that they can fail: plant one pale line and one small
      // button, and expect each to be reported.
      const planted = await evaluate(`(() => {
        const line = document.createElement("p");
        line.textContent = "planted pale text";
        line.style.color = getComputedStyle(document.body).backgroundColor;
        const button = document.createElement("button");
        button.textContent = "planted small button";
        button.style.cssText = "min-height:0;height:20px;padding:0";
        document.querySelector("main").append(line, button);
        const found = [t.lowContrast(), t.smallTargets()];
        line.remove();
        button.remove();
        return found;
      })()`);
      assert.ok(
        planted[0].some((x) => x.startsWith("planted pale text")),
        "the contrast check sees pale text"
      );
      assert.ok(
        planted[1].some((x) => x.includes("planted small button")),
        "the target check sees a small button"
      );
      await evaluate("t.settle()");
      assert.equal(await evaluate("t.count('nav button')"), VIEWS.length);
    });

    await t.test(
      "on a phone: controls a finger can hit, a link that lands on its lane, a table that fits",
      async () => {
        await page("Emulation.setEmulatedMedia", { features: [] });
        await page("Emulation.setDeviceMetricsOverride", {
          width: WIDTHS[0],
          height: 800,
          deviceScaleFactor: 2,
          mobile: true,
        });
        await page("Emulation.setTouchEmulationEnabled", { enabled: true });
        await open("#record");
        assert.equal(await evaluate("matchMedia('(pointer: coarse)').matches"), true);
        for (const view of VIEWS) {
          await go(`#${view}`);
          assert.deepEqual(await evaluate("t.smallTargets()"), [], `targets in ${view}`);
        }
        // The links of the October register sit in a closed section: open it and measure them.
        await go("#open");
        const links = await evaluate(
          "(document.querySelector('details.archive').open = true, t.settle().then(() => t.all('.gap-sources a').map((a) => a.getBoundingClientRect().height)))"
        );
        assert.ok(links.length > 0, "the register has links to measure");
        assert.deepEqual(
          links.filter((height) => height < 43.5),
          [],
          "register links are tall enough for a finger"
        );

        // A pasted link to a lane lands on the lane's panel, which sits below the list here.
        const within =
          "(() => { const r = document.getElementById('lane-inspector')?.getBoundingClientRect(); return Boolean(r) && r.top > -2 && r.top < innerHeight / 2; })()";
        await page("Page.navigate", { url: "about:blank" });
        await page("Page.navigate", { url: `${origin}/#lanes/${b.lanes.at(-1).id}` });
        await waitFor("document.querySelector('main h1')", "the app to render");
        await evaluate(IN_PAGE);
        await waitFor(within, "a loaded link to bring the lane's panel into view");
        await evaluate("(scrollTo(0, 0), t.settle())");
        await go(`#lanes/${b.lanes[0].id}`);
        await waitFor(within, "a changed address to bring the lane's panel into view");
        assert.ok(
          (await evaluate("t.text('.inspector .kicker')")).startsWith(`Lane ${b.lanes[0].id}`)
        );

        // The predictions table fits the screen: no column is cut and it does not scroll sideways.
        await go("#record");
        const fit = await evaluate(`(() => {
        const box = document.querySelector(".track-table").closest(".table-scroll");
        const cells = t.all(".track-table tbody th, .track-table tbody td");
        return {
          scrolls: box.scrollWidth - box.clientWidth,
          cells: cells.length,
          cut: cells.filter((c) => c.getBoundingClientRect().right > innerWidth + 0.5).length,
          labelled: cells
            .filter((c) => c.tagName === "TD")
            .every((c) => c.dataset.label && getComputedStyle(c, "::before").content !== "none"),
        };
      })()`);
        assert.ok(fit.cells > 0 && fit.scrolls <= 0 && fit.cut === 0, JSON.stringify(fit));
        assert.ok(fit.labelled, "each stacked cell shows the name of its column");
        await page("Emulation.setTouchEmulationEnabled", { enabled: false });
      }
    );

    await t.test("the server stays read only and local", async () => {
      const home = await fetch(`${origin}/`);
      assert.equal(home.status, 200);
      assert.match(home.headers.get("content-security-policy"), /default-src 'none'/);
      assert.equal((await fetch(`${origin}/`, { method: "POST" })).status, 405);
      assert.equal((await fetch(`${origin}/..%2f..%2fpackage.json`)).status, 404);
      const logo = (await home.text()).match(/href="(\/assets\/[^"]+\.png)"/)?.[1];
      assert.ok(logo, "the page names the logo as its icon");
      assert.equal((await fetch(origin + logo)).headers.get("content-type"), "image/png");
    });

    assert.deepEqual(browser.problems, [], "no error, warning or exception in the browser");
  }
);
