import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadConfig(env = {}) {
  const previous = {};
  for (const key of Object.keys(env)) {
    previous[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }

  try {
    const mod = await import(`../../src/config/env.js?test=${Date.now()}-${Math.random()}`);
    return mod.stagingConfig;
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("stagingConfig", () => {
  test("skips Claude on Safe verdicts by default", async () => {
    const config = await loadConfig({ SIMURGH_CLAUDE_ON_SAFE: undefined });
    assert.equal(config.claudeOnSafe, false);
  });

  test("enables Claude on Safe only when explicitly set to true", async () => {
    const enabled = await loadConfig({ SIMURGH_CLAUDE_ON_SAFE: "true" });
    const disabled = await loadConfig({ SIMURGH_CLAUDE_ON_SAFE: "false" });

    assert.equal(enabled.claudeOnSafe, true);
    assert.equal(disabled.claudeOnSafe, false);
  });

  test("keeps Warning and Critical Claude narratives enabled by default", async () => {
    const config = await loadConfig({
      SIMURGH_CLAUDE_ON_WARNING: undefined,
      SIMURGH_CLAUDE_ON_CRITICAL: undefined,
    });

    assert.equal(config.claudeOnWarning, true);
    assert.equal(config.claudeOnCritical, true);
  });
});
