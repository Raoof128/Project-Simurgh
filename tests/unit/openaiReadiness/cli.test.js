import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const runner = new URL("../../../tools/openai-readiness/run.mjs", import.meta.url);
const verifier = new URL("../../../tools/openai-readiness/verify.mjs", import.meta.url);
test("offline CLI creates verifiable artifact and refuses overwrites and symlinks", () => {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-cli-"));
  const out = join(dir, "report.json");
  try {
    execFileSync(process.execPath, [runner.pathname, "--out", out]);
    assert.match(
      execFileSync(process.execPath, [verifier.pathname, out], { encoding: "utf8" }),
      /verified/
    );
    const before = readFileSync(out, "utf8");
    assert.notEqual(spawnSync(process.execPath, [runner.pathname, "--out", out]).status, 0);
    const link = join(dir, "link.json");
    symlinkSync(out, link);
    assert.notEqual(spawnSync(process.execPath, [runner.pathname, "--out", link]).status, 0);
    assert.equal(readFileSync(out, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("live CLI requires explicit consent before any API call", () => {
  const result = spawnSync(process.execPath, [runner.pathname, "--live"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /allow-live/);
});
test("mock provider runs through live CLI, records failures and exits nonzero", () => {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-live-cli-"));
  const out = join(dir, "report.json");
  try {
    const preloader = join(dir, "mock.mjs");
    // Replaces fetch in the child before the runner is loaded; never opens a socket.
    const source = `import {getScenarios} from ${JSON.stringify(new URL("../../../tools/openai-readiness/corpus.mjs", import.meta.url).href)};\nlet i=0;const scenarios=getScenarios();globalThis.fetch=async()=>{const p=scenarios[i++].proposal;return Response.json({id:'resp_mock',model:'mock-model',status:'completed',output:[{type:'function_call',name:p.name,arguments:JSON.stringify(p.arguments)}],usage:{input_tokens:1,output_tokens:1}});};`;
    writeFileSync(preloader, source);
    const result = spawnSync(
      process.execPath,
      ["--import", preloader, runner.pathname, "--live", "--allow-live", "--out", out],
      {
        encoding: "utf8",
        env: { ...process.env, OPENAI_MODEL: "mock-model", OPENAI_API_KEY: "mock-key" },
      }
    );
    assert.notEqual(result.status, 0);
    const artifact = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(artifact.payload.track, "live-openai");
    assert.equal(artifact.payload.modes.enforced.metrics.attackSuccesses, 0);
    assert.equal(artifact.payload.modes.enforced.metrics.benignCompletions, 3);
    assert.equal(artifact.payload.modes.enforced.metrics.proposalErrors, 3);
    assert.equal(artifact.payload.validation.passed, false);
    assert.match(
      execFileSync(process.execPath, [verifier.pathname, out], { encoding: "utf8" }),
      /verified/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("output refuses symlink parents", () => {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-symlink-"));
  try {
    symlinkSync(dir, join(dir, "linked"), "dir");
    assert.notEqual(
      spawnSync(process.execPath, [runner.pathname, "--out", join(dir, "linked", "report.json")])
        .status,
      0
    );
    assert.throws(() => readFileSync(join(dir, "report.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("verifier rejects oversized artifacts without echoing their contents", () => {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-large-"));
  try {
    const path = join(dir, "large.json");
    writeFileSync(path, "PRIVATE_SENTINEL".repeat(800000));
    const result = spawnSync(process.execPath, [verifier.pathname, path], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /size/i);
    assert.doesNotMatch(result.stderr, /PRIVATE_SENTINEL/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("verifier rejects FIFO input without blocking", () => {
  const dir = mkdtempSync(join(tmpdir(), "simurgh-fifo-"));
  try {
    const fifo = join(dir, "report.fifo");
    execFileSync("mkfifo", [fifo]);
    const result = spawnSync(process.execPath, [verifier.pathname, fifo], {
      encoding: "utf8",
      timeout: 1000,
    });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /file type invalid/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
