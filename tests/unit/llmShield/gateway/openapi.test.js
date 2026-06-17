import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

describe("stage3e openapi", () => {
  test("valid JSON, 3.1, Bearer scheme, four routes, no keys/payloads", async () => {
    const spec = JSON.parse(
      await readFile("docs/research/llm-shield/evidence/stage-3e/openapi.json", "utf8")
    );
    assert.match(spec.openapi, /^3\.1/);
    assert.ok(spec.components.securitySchemes.GatewayBearer);
    assert.equal(spec.components.securitySchemes.GatewayBearer.scheme, "bearer");
    for (const p of [
      "/api/llm-shield/gateway/sessions",
      "/api/llm-shield/gateway/{sessionId}/run",
      "/api/llm-shield/gateway/{sessionId}/verify",
      "/api/llm-shield/gateway/openapi.json",
    ]) {
      assert.ok(spec.paths[p], `missing path ${p}`);
    }
    const raw = JSON.stringify(spec);
    assert.ok(!/sk-[A-Za-z0-9]{20,}/.test(raw), "no real-looking keys");
    assert.ok(!raw.includes("ignore previous instructions"), "no jailbreak payloads");
  });
});
