import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getStore } from "../../src/storage/memoryStore.js";

describe("memoryStore", () => {
  test("returns a Map for a namespace", () => {
    const store = getStore("exams");
    assert.ok(store instanceof Map);
  });

  test("same namespace returns same Map instance", () => {
    const a = getStore("sessions");
    const b = getStore("sessions");
    assert.equal(a, b);
  });

  test("different namespaces return different Maps", () => {
    const a = getStore("ns_a");
    const b = getStore("ns_b");
    assert.notEqual(a, b);
  });

  test("items set in a namespace persist", () => {
    const store = getStore("test_persist");
    store.set("key1", { value: 42 });
    const store2 = getStore("test_persist");
    assert.deepEqual(store2.get("key1"), { value: 42 });
  });
});
