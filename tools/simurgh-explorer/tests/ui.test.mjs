import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { buildIndex } from "../index.mjs";
import { lanesSummary, queryLanes, queryRecords, tally } from "../core.mjs";
await build({
  entryPoints: [new URL("../src/App.jsx", import.meta.url).pathname],
  outfile: new URL("../node_modules/.test-ui/App.mjs", import.meta.url).pathname,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  loader: { ".png": "dataurl" },
});
const { App } = await import("../node_modules/.test-ui/App.mjs");

// One mounted app per test, with the helpers every test uses to act on it.
async function mount(bundle, url = "http://localhost:4173/") {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  globalThis.history = dom.window.history;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById("root"));
  await act(() => root.render(React.createElement(App, { initial: bundle })));
  const all = (selector) => [...document.querySelectorAll(selector)];
  const fire = (node, event) => act(async () => node.dispatchEvent(event));
  const click = async (text) => {
    const b = all("button").find((x) => x.textContent.trim() === text);
    assert.ok(b, `button ${text}`);
    await fire(b, new dom.window.MouseEvent("click", { bubbles: true }));
  };
  return {
    dom,
    all,
    click,
    nav: async (name) => {
      const b = all("nav button").find((x) => x.textContent.startsWith(name));
      assert.ok(b, `view ${name}`);
      await fire(b, new dom.window.MouseEvent("click", { bubbles: true }));
    },
    choose: async (label, value) => {
      const select = document.querySelector(`[aria-label="${label}"]`);
      assert.ok(select, `select ${label}`);
      select.value = value;
      await fire(select, new dom.window.Event("change", { bubbles: true }));
    },
    upload: async (file) => {
      const input = document.querySelector("input[type=file]");
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      await fire(input, new dom.window.Event("change", { bubbles: true }));
    },
    status: () => document.querySelector("[role=status].message")?.textContent ?? "",
    close: async () => {
      await act(() => root.unmount());
      dom.window.close();
      for (const k of ["window", "document", "location", "history", "IS_REACT_ACT_ENVIRONMENT"])
        delete globalThis[k];
    },
  };
}

test("the record opens first and shows every lane and every prediction", async () => {
  const bundle = buildIndex();
  const ui = await mount(bundle);
  try {
    assert.equal(document.querySelector("h1").textContent, "The Phase 19 record");
    assert.equal(ui.all(".strip-lane").length, bundle.lanes.length);
    assert.equal(
      ui.all(".strip .mark").length,
      bundle.lanes.reduce((n, l) => n + l.hypotheses.length, 0)
    );
    const failed = bundle.lanes.flatMap((l) => l.hypotheses).filter((h) => h.outcome === "failed");
    assert.equal(ui.all(".failed-list li").length, failed.length);
    assert.equal(ui.all(".strip .mark-failed").length, failed.length);
    const s = lanesSummary(bundle);
    assert.ok(
      document
        .querySelector(".ledger")
        .textContent.includes(`Independent custody${s.independent_custody} of ${s.packs}`)
    );
    assert.ok(
      document.querySelector(".brand img").getAttribute("src"),
      "the logo is in the header"
    );
    assert.equal(ui.all(".track-table tbody tr").length, 2);
    assert.equal(document.querySelector(".wordmark").textContent, "ProjectSimurgh");
    // Every mark says what it is in words, so no outcome rests on colour.
    assert.ok(
      ui.all(".strip .mark").every((m) => /Held|Did not hold|Not decided/.test(m.textContent))
    );
    const chosen = bundle.lanes.at(-2);
    const lane = ui
      .all(".strip-lane")
      .find((b) => b.getAttribute("aria-label").startsWith(`Lane ${chosen.id}:`));
    await act(() => lane.click());
    assert.equal(document.querySelector("h1").textContent, "Lanes");
    const kicker = document.querySelector(".inspector .kicker").textContent;
    assert.ok(kicker.includes(`Lane ${chosen.id}`) && kicker.includes(chosen.unit));
    assert.equal(globalThis.location.hash, `#lanes/${chosen.id}`);
  } finally {
    await ui.close();
  }
});

test("lanes: filters, the inspector, the lane's own page and the verify commands", async () => {
  const bundle = buildIndex();
  const linked = bundle.lanes.find((l) => l.hypotheses.length && l.outside.verify === "checked");
  const ui = await mount(bundle, `http://localhost:4173/#lanes/${linked.id}`);
  try {
    assert.equal(
      document.querySelector(".inspector h2").textContent,
      linked.title.replaceAll("`", "")
    );
    assert.equal(ui.all(".lanes-table tbody tr").length, bundle.lanes.length);
    await ui.choose("Filter by prediction outcome", "failed");
    assert.equal(
      ui.all(".lanes-table tbody tr").length,
      queryLanes(bundle, { outcome: "failed" }).length
    );
    await ui.choose("Filter by outside check", "owed");
    const expected = queryLanes(bundle, { outcome: "failed", outside: "owed" });
    assert.equal(ui.all(".lanes-table tbody tr").length, expected.length);
    assert.ok(
      document.body.textContent.includes(`${expected.length} of ${bundle.lanes.length} lanes`)
    );
    const lane = expected.at(-1);
    const row = ui
      .all(".row-button")
      .find((b) => b.querySelector(".lane-id").textContent === lane.id);
    await act(() => row.click());
    assert.equal(ui.all(".inspector .hyp").length, lane.hypotheses.length);
    assert.equal(ui.all(".inspector .hyp-failed").length, tally(lane).failed);
    assert.equal(
      ui.all(".inspector .pointer").length,
      lane.hypotheses.filter((h) => h.pointer).length
    );
    assert.ok(ui.all("button").some((x) => x.textContent === "Check this pack in your browser"));
    assert.equal(document.querySelector(".inspector .command").textContent, lane.verify);
    assert.ok(document.querySelector(".inspector").textContent.includes(lane.root));
    await ui.click("Copy verify command");
    assert.ok(ui.status().includes(lane.verify), "without a clipboard the command is shown");
    await ui.click("Read the lane's page");
    assert.equal(document.querySelector("h1").textContent, "Library");
    assert.equal(
      document.querySelector(".document-text").textContent,
      bundle.documents.find((d) => d.id === lane.pages.readme).text
    );
    await ui.nav("Replicate");
    assert.equal(ui.all(".command-row").length, bundle.lanes.length);
    const box = document.querySelector("input[type=checkbox]");
    await act(() => box.click());
    assert.equal(ui.all(".command-row").length, queryLanes(bundle, { outside: "owed" }).length);
    await ui.nav("Open work");
    assert.equal(ui.all(".work").length, bundle.open_work.length);
    assert.equal(ui.all(".gap").length, bundle.gaps.length);
    const other = bundle.lanes[0];
    await act(() => {
      globalThis.location.hash = `#lanes/${other.id}`;
      window.dispatchEvent(new ui.dom.window.HashChangeEvent("hashchange"));
    });
    assert.ok(
      document.querySelector(".inspector .kicker").textContent.includes(`Lane ${other.id}`)
    );
    assert.equal(ui.all(".other-list li").length, bundle.other.length);
  } finally {
    await ui.close();
  }
});

test("outcomes, library, and imports that stay labelled until the repository is restored", async () => {
  const bundle = buildIndex({ study: "phase10" });
  const ui = await mount(bundle);
  try {
    await ui.nav("Outcomes");
    assert.equal(ui.all("tbody tr").length, 144);
    await ui.click("Unauthorized");
    assert.equal(ui.all("tbody tr").length, queryRecords(bundle, { kind: "unauthorized" }).length);
    let exported;
    const originalCreate = URL.createObjectURL;
    const originalClick = ui.dom.window.HTMLAnchorElement.prototype.click;
    URL.createObjectURL = (blob) => {
      exported = blob;
      return "blob:simurgh-test";
    };
    ui.dom.window.HTMLAnchorElement.prototype.click = () => {};
    try {
      await ui.click("Export 16 records");
      const selection = JSON.parse(await exported.text());
      assert.equal(selection.records.length, 16);
      assert.equal(selection.selection.total, 144);
    } finally {
      URL.createObjectURL = originalCreate;
      ui.dom.window.HTMLAnchorElement.prototype.click = originalClick;
    }
    await ui.click("View source record");
    assert.match(document.querySelector(".inspector .raw").textContent, /unauthorized_new_effects/);
    await ui.click("Unknown");
    assert.equal(ui.all("tbody tr").length, 12);
    await ui.nav("Library");
    assert.equal(ui.all(".result").length, bundle.documents.length);
    await ui.choose("Filter collection", "primary");
    assert.equal(ui.all(".result").length, bundle.documents.filter((d) => d.url).length);
    await ui.choose("Filter collection", "phase19");
    assert.equal(
      ui.all(".result").length,
      bundle.documents.filter((d) => d.kind === "phase19").length
    );
    await act(() => document.querySelector(".result").click());
    assert.ok(document.querySelector(".document-text").textContent.length > 20);
    await ui.upload({ name: "bad.json", size: 2, text: async () => "{}" });
    assert.match(document.querySelector("[role=alert]").textContent, /Unsupported explorer schema/);
    await ui.upload({
      name: "valid.json",
      size: 100,
      text: async () => JSON.stringify({ ...bundle, records: bundle.records.slice(0, 3) }),
    });
    assert.ok(ui.status().includes(`Loaded 3 records and ${bundle.lanes.length} lanes`));
    // Audit F-3: the transient notice disappears on navigation; the import label must not.
    const banner = () => document.querySelector("[data-testid=imported-banner]");
    assert.match(banner().textContent, /Imported from valid\.json: not verified by explorer/);
    await ui.nav("Outcomes");
    assert.ok(banner(), "the imported-evidence banner survives navigation");
    assert.match(document.querySelector("[data-testid=data-source]").textContent, /Imported/);
    await ui.click("Copy CLI");
    assert.match(ui.status(), /loaded-bundle.json/);
    await ui.click("Restore repository data");
    assert.match(ui.status(), /restored/);
    assert.equal(banner(), null, "restoring repository data removes the import label");
  } finally {
    await ui.close();
  }
});

test("a file written before lanes existed loads and says it has none", async () => {
  const bundle = buildIndex({ study: "phase10" });
  const old = { ...bundle, records: bundle.records.slice(0, 3) };
  for (const k of ["lanes", "handoff", "open_work", "other"]) delete old[k];
  const ui = await mount(bundle);
  try {
    await ui.upload({ name: "old.json", size: 100, text: async () => JSON.stringify(old) });
    assert.match(ui.status(), /Loaded 3 records and 0 lanes/);
    for (const view of ["Record", "Lanes", "Replicate"]) {
      await ui.nav(view);
      assert.match(document.querySelector(".empty").textContent, /in this file/);
    }
  } finally {
    await ui.close();
  }
});

test("hostile text remains inert and unsafe external links are removed", async () => {
  const b = buildIndex({ study: "phase10" });
  const hostile = "<img src=x onerror=alert(1)>";
  b.records[0].title = hostile;
  b.lanes[0].title = hostile;
  b.lanes[0].summary = `${hostile} \`<script>alert(1)</script>\``;
  b.lanes[0].hypotheses = [
    {
      id: hostile,
      outcome: "failed",
      source: "receipt",
      columns: [{ label: hostile, text: hostile }],
    },
  ];
  b.open_work[0].text = hostile;
  b.documents[0].url = "javascript:alert(1)";
  const ui = await mount(b);
  try {
    for (const view of ["Record", "Lanes", "Replicate", "Outcomes", "Open work"]) {
      await ui.nav(view);
      // The only image on the page is the logo in the header.
      assert.equal(ui.all("main img, script, iframe").length, 0, view);
      assert.equal(ui.all("img").length, 1, view);
      assert.ok(document.body.textContent.includes(hostile), view);
    }
    await ui.nav("Library");
    await act(() => document.querySelector(".result").click());
    assert.equal(ui.all('a[href^="javascript:"]').length, 0);
  } finally {
    await ui.close();
  }
});

test("current study UI separates model filters and matched controls", async () => {
  const ui = await mount(buildIndex());
  try {
    await ui.nav("Outcomes");
    assert.equal(ui.all("tbody tr").length, 288);
    await ui.choose("Filter model", "luna");
    assert.equal(ui.all("tbody tr").length, 144);
    assert.ok(ui.all("tbody tr").every((r) => r.textContent.includes("luna")));
    assert.equal(ui.all(".compare div").length, 3);
    await ui.click("Malformed");
    assert.equal(ui.all("tbody tr").length, 0);
    await ui.choose("Filter model", "llama");
    assert.equal(ui.all("tbody tr").length, 3);
  } finally {
    await ui.close();
  }
});
