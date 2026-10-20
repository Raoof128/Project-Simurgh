import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { buildIndex } from "../index.mjs";
import { queryRecords } from "../core.mjs";
await build({
  entryPoints: [new URL("../src/App.jsx", import.meta.url).pathname],
  outfile: new URL("../node_modules/.test-ui/App.mjs", import.meta.url).pathname,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
const { App } = await import("../node_modules/.test-ui/App.mjs");
test("dashboard interactions: shared filter, source record, research, gaps and invalid import", async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: "http://localhost:4173" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById("root")),
    bundle = buildIndex({ study: "phase10" });
  try {
    await act(() => root.render(React.createElement(App, { initial: bundle })));
    const button = (text) =>
      [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
    const click = async (text) => {
      const b = button(text);
      assert.ok(b, `button ${text}`);
      await act(() => b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
    };
    assert.equal(document.querySelectorAll("tbody tr").length, 144);
    await click("Unauthorized");
    assert.equal(
      document.querySelectorAll("tbody tr").length,
      queryRecords(bundle, { kind: "unauthorized" }).length
    );
    let exported;
    const originalCreate = URL.createObjectURL;
    const originalClick = dom.window.HTMLAnchorElement.prototype.click;
    URL.createObjectURL = (blob) => {
      exported = blob;
      return "blob:simurgh-test";
    };
    dom.window.HTMLAnchorElement.prototype.click = () => {};
    try {
      await click("↓ Export 16 records");
      const selection = JSON.parse(await exported.text());
      assert.equal(selection.records.length, 16);
      assert.equal(selection.selection.total, 144);
    } finally {
      URL.createObjectURL = originalCreate;
      dom.window.HTMLAnchorElement.prototype.click = originalClick;
    }
    await click("View source record");
    assert.match(document.querySelector(".raw").textContent, /unauthorized_new_effects/);
    await click("Unknown");
    assert.equal(document.querySelectorAll("tbody tr").length, 12);
    await act(() => document.querySelectorAll("nav button")[2].click());
    assert.equal(document.querySelectorAll(".research-result").length, 48);
    await act(() => document.querySelector(".research-result").click());
    assert.ok(document.querySelector(".document-text").textContent.length > 20);
    await act(() => document.querySelectorAll("nav button")[3].click());
    assert.equal(document.querySelectorAll(".gap").length, 8);
    const input = document.querySelector("input[type=file]");
    Object.defineProperty(input, "files", {
      value: [{ name: "bad.json", size: 2, text: async () => "{}" }],
      configurable: true,
    });
    await act(async () => {
      input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.match(document.querySelector("[role=alert]").textContent, /Unsupported explorer schema/);
    Object.defineProperty(input, "files", {
      value: [
        {
          name: "valid.json",
          size: 100,
          text: async () => JSON.stringify({ ...bundle, records: bundle.records.slice(0, 3) }),
        },
      ],
      configurable: true,
    });
    await act(async () => {
      input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.match(document.querySelector("[role=status]").textContent, /Loaded 3 records/);
    await act(() => document.querySelectorAll("nav button")[1].click());
    await click("Copy CLI");
    assert.match(document.querySelector("[role=status]").textContent, /loaded-bundle.json/);
    await click("Restore repository data");
    assert.match(document.querySelector("[role=status]").textContent, /restored/);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
test("hostile text remains inert and unsafe external links are removed", async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const b = buildIndex({ study: "phase10" });
  b.records[0].title = "<img src=x onerror=alert(1)>";
  b.documents[0].url = "javascript:alert(1)";
  const root = createRoot(document.getElementById("root"));
  try {
    await act(() => root.render(React.createElement(App, { initial: b })));
    assert.equal(document.querySelectorAll("img").length, 0);
    assert.ok(document.body.textContent.includes("<img src=x onerror=alert(1)>"));
    await act(() => document.querySelectorAll("nav button")[2].click());
    await act(() => document.querySelector(".research-result").click());
    assert.equal(document.querySelectorAll('a[href^="javascript:"]').length, 0);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test("current study UI separates model filters and matched controls", async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById("root"));
  try {
    await act(() => root.render(React.createElement(App, { initial: buildIndex() })));
    assert.equal(document.querySelectorAll("tbody tr").length, 288);
    const model = document.querySelector('[aria-label="Filter model"]');
    await act(() => {
      model.value = "luna";
      model.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(document.querySelectorAll("tbody tr").length, 144);
    assert.ok(
      [...document.querySelectorAll("tbody tr")].every((r) => r.textContent.includes("luna"))
    );
    assert.equal(document.querySelectorAll("details div").length, 3);
    const malformed = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Malformed"
    );
    await act(() => malformed.click());
    assert.equal(document.querySelectorAll("tbody tr").length, 0);
    await act(() => {
      model.value = "llama";
      model.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(document.querySelectorAll("tbody tr").length, 3);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
