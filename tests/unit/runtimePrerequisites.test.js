import { test } from "node:test";
import assert from "node:assert/strict";
import {
  discoverBrowser,
  discoverAlternateNode,
  fileNavigationBlocked,
} from "../../scripts/lib/runtimePrerequisites.mjs";

test("an invalid explicit browser refuses instead of falling back", () => {
  assert.throws(
    () => discoverBrowser({ env: { SIMURGH_CHROME: "/missing" }, executable: () => false }),
    /SIMURGH_CHROME/
  );
});
test("browser PATH discovery selects the actual executable", () => {
  assert.equal(
    discoverBrowser({
      env: { PATH: "/custom" },
      platform: "linux",
      executable: (p) => p === "/custom/chromium",
    }),
    "/custom/chromium"
  );
});
test("missing browser is explicit", () => {
  assert.equal(discoverBrowser({ env: {}, executable: () => false }), null);
});
test("wildcard management requires an explicit file exception", () => {
  assert.equal(
    fileNavigationBlocked([{ URLBlocklist: ["*"], URLAllowlist: ["http://localhost:31460"] }]),
    true
  );
  assert.equal(fileNavigationBlocked([{ URLBlocklist: ["*"], URLAllowlist: ["file://*"] }]), false);
  assert.equal(fileNavigationBlocked([]), false);
});
test("alternate Node discovery finds a real older major in PATH", () => {
  assert.equal(
    discoverAlternateNode({
      env: { PATH: "/new:/old" },
      executable: () => true,
      version: (p) => (p === "/old/node" ? "v24.19.0" : "v26.0.0"),
    }),
    "/old/node"
  );
});
test("explicit alternate version must be supported and must be named node", () => {
  for (const name of ["/bad/node", "/bad/other"])
    assert.throws(
      () =>
        discoverAlternateNode({
          env: { SIMURGH_ALTERNATE_NODE: name },
          executable: () => true,
          version: () => "v26.0.0",
        }),
      /SIMURGH_ALTERNATE_NODE/
    );
});
test("no alternate is a missing prerequisite", () => {
  assert.equal(
    discoverAlternateNode({
      env: { PATH: "/new" },
      executable: () => true,
      version: () => "v26.0.0",
    }),
    null
  );
});
