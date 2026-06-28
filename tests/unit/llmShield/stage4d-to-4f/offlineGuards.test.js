// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertNoForbiddenProviderEnv,
  scanSourceForForbiddenNetworkUse,
  scrubOfflineEnv,
} from "../../../../tools/simurgh-attestation/stage4d-to-4f/offlineGuards.mjs";

test("scrubOfflineEnv removes provider and browser variables while preserving deterministic pins", () => {
  const env = scrubOfflineEnv({
    OPENAI_API_KEY: "sk-test-secret",
    ANTHROPIC_API_KEY: "secret",
    PLAYWRIGHT_BROWSERS_PATH: "/tmp/browser",
    PATH: "/usr/bin",
  });
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
  assert.equal(env.PLAYWRIGHT_BROWSERS_PATH, undefined);
  assert.equal(env.NO_NETWORK, "1");
  assert.equal(env.PYTHONHASHSEED, "0");
  assert.equal(env.TZ, "UTC");
  assert.equal(env.LC_ALL, "C");
  assert.equal(env.LANG, "C");
  assert.equal(env.SOURCE_DATE_EPOCH, "0");
  assert.equal(env.SIMURGH_STAGE4D_TO_4F_OFFLINE, "1");
});

test("assertNoForbiddenProviderEnv fails when a verifier requires provider env", () => {
  assert.throws(
    () => assertNoForbiddenProviderEnv({ OPENAI_API_KEY: "sk-live" }),
    /forbidden_provider_env/
  );
});

test("source scanner finds network and browser automation imports", () => {
  const result = scanSourceForForbiddenNetworkUse(
    'import https from "node:https";\nconst net = require("node:net");\nawait fetch("https://example.com");'
  );
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.failures.map((failure) => failure.reason),
    ["network_required_error", "network_required_error", "network_required_error"]
  );
});
