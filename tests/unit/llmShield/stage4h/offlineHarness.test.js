// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  OfflineViolationError,
  runOffline,
  scanForModelClients,
} from "../../../../tools/simurgh-attestation/stage4h/offlineHarness.mjs";

async function runEgress(surface) {
  return runOffline(async () => {
    const { attemptEgress } = await import(
      "../../../fixtures/llmShield/stage4h/offline/egress-double.mjs"
    );
    return attemptEgress(surface);
  });
}

for (const [surface, reason] of [
  ["fetch", "fetch_invoked"],
  ["http", "http_client_invoked"],
  ["https", "http_client_invoked"],
  ["net", "socket_connect_invoked"],
  ["tls", "socket_connect_invoked"],
  ["dns", "dns_invoked"],
  ["dns-promises", "dns_invoked"],
  ["dgram", "udp_invoked"],
  ["child_process", "subprocess_invoked"],
]) {
  test(`Q3 catches egress via ${surface} as 28/${reason}`, async () => {
    const result = await runEgress(surface);
    assert.equal(result.ok, false);
    assert.equal(result.code, 28);
    assert.equal(result.reason, reason);
    assert.equal(result.hits[0].reason, reason);
  });
}

test("Q3 positive control has zero offline hits", async () => {
  const result = await runOffline(async () => 1 + 1);
  assert.equal(result.ok, true);
  assert.equal(result.code, 0);
  assert.deepEqual(result.hits, []);
  assert.equal(result.value, 2);
});

test("Q3 restore path restores fetch after a denied run", async () => {
  const originalFetch = globalThis.fetch;
  await runEgress("fetch");
  assert.equal(globalThis.fetch, originalFetch);
});

test("Q3 static scan rejects forbidden imports in checker dependency path", async () => {
  const dir = mkdtempSync(join(tmpdir(), "stage4h-static-scan-"));
  try {
    const target = join(dir, "checker.mjs");
    writeFileSync(target, 'import http from "node:http"; export const ok = true;\n');
    const result = await scanForModelClients(target, { allowedPaths: [] });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "forbidden_builtin_imported");
    assert.equal(result.matches[0].specifier, "node:http");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Q3 static scan rejects provider/model imports in checker dependency path", async () => {
  const dir = mkdtempSync(join(tmpdir(), "stage4h-model-scan-"));
  try {
    const target = join(dir, "checker.mjs");
    writeFileSync(target, 'import OpenAI from "openai"; export const ok = true;\n');
    const result = await scanForModelClients(target, { allowedPaths: [] });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "model_client_present");
    assert.equal(result.matches[0].specifier, "openai");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Q3 static scan recursively follows local checker imports", async () => {
  const dir = mkdtempSync(join(tmpdir(), "stage4h-recursive-scan-"));
  try {
    const target = join(dir, "checker.mjs");
    const dependency = join(dir, "dependency.mjs");
    writeFileSync(target, 'import "./dependency.mjs"; export const ok = true;\n');
    writeFileSync(dependency, 'import net from "node:net"; export const leak = net;\n');
    const result = await scanForModelClients(target, { allowedPaths: [] });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "forbidden_builtin_imported");
    assert.equal(result.matches[0].specifier, "node:net");
    assert.match(result.matches[0].file, /dependency\.mjs$/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("OfflineViolationError exposes the denied reason", () => {
  const error = new OfflineViolationError("fetch_invoked");
  assert.equal(error.name, "OfflineViolationError");
  assert.equal(error.reason, "fetch_invoked");
});
