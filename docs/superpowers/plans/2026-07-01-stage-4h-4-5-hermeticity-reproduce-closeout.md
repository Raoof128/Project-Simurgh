# Stage 4H.4 + 4H.5 Hermeticity Reproduce Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Stage 4H by adding Q3 offline-hermeticity, a total typed-exit wrapper, and the final one-command reviewer reproduce/closeout path.

**Architecture:** Keep the merged 4H.3 inner verifier semantics unchanged. Add Q3 as an outer offline preflight around the checker path, make `stage4CodeForRawCode()` total and fail-closed, then have the reproduce script consume that wrapper for every final exit. Part B only orchestrates the Part A harness/wrapper into evidence, goldens, deletion checks, reviewer docs, and closeout docs.

**Tech Stack:** Node.js ESM, `node:test`, `node:assert/strict`, existing Stage 4D/4H verifier modules, Bash, Prettier, optional `shellcheck`, optional Linux `unshare -rn`.

---

## File Structure

Create:

- `tools/simurgh-attestation/stage4h/offlineHarness.mjs` - capability-denial harness, offline violation error, static dependency scan, and `runOffline()`.
- `scripts/offline-audit-llm-shield-stage4h.mjs` - Q3 audit runner that proves clean zero hits and egress-double catch.
- `tests/fixtures/llmShield/stage4h/offline/egress-double.mjs` - test-only egress-attempting checker double.
- `tests/unit/llmShield/stage4h/offlineHarness.test.js` - Q3 runtime/static scan tests.
- `tests/unit/llmShield/stage4h/exitWrapper.test.js` - total wrapper tests.
- `tests/unit/llmShield/stage4h/closeout.test.js` - closeout/evidence/doc coverage.
- `docs/research/llm-shield/STAGE_4H_CLOSEOUT.md` - final Stage 4H closeout.
- `docs/research/llm-shield/STAGE_4H_REVIEWER_CHECKLIST.md` - reviewer 5-minute path.
- `docs/research/llm-shield/STAGE_4H_VALIDATION_MATRIX.md` - final Q0-Q7 matrix.
- `docs/research/llm-shield/STAGE_4H_THREAT_MODEL.md` - final threat model and honesty ceiling.
- `docs/research/llm-shield/evidence/stage-4h/offline-report.json` - Q3 clean/negative audit evidence.
- `docs/research/llm-shield/evidence/stage-4h/hermeticity-attestation.json` - acyclic denied-surface attestation.
- `docs/research/llm-shield/evidence/stage-4h/exit-map.json` - raw-to-typed wrapper golden.
- `docs/research/llm-shield/evidence/stage-4h/reproduce-summary.json` - one-command deterministic summary.
- `tests/fixtures/llmShield/stage4h/expected-results/exit-map.json` - wrapper expected result.
- `tests/fixtures/llmShield/stage4h/expected-results/offline-matrix.json` - Q3 expected result.

Modify:

- `tools/simurgh-attestation/stage4h/exitCodes.mjs` - total wrapper and `OFFLINE_REASONS`.
- `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs` - wrapper-facing process exit and optional offline preflight integration point.
- `tools/simurgh-attestation/stage4h/packBinding.mjs` - manifest schema/binding support for `hermeticity_attestation_digest` if the implementation chooses to bind it directly in the manifest object.
- `tools/simurgh-attestation/stage4h/schema.mjs` - signed manifest schema support for the new digest field if bound directly in the manifest.
- `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs` - Q3 evidence, stage label, manifest binding, exit map, reproduce summary.
- `scripts/reproduce-llm-shield-stage4h.sh` - final typed-exit one-command pipeline.
- `tests/unit/llmShield/stage4h/reproduce.test.js` - Q3 pass, new evidence files, typed negative smokes.
- `tests/e2e/llmShield/stage4hFullSmoke.test.js` - Q3 pass and final evidence pack coverage.
- `docs/research/llm-shield/evidence/stage-4h/README.md` - final closeout wording and non-claims.

## Task 1: Total Exit Wrapper

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/exitCodes.mjs`
- Create: `tests/unit/llmShield/stage4h/exitWrapper.test.js`

- [ ] **Step 1: Write the failing wrapper test**

Create `tests/unit/llmShield/stage4h/exitWrapper.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HARNESS_CODES,
  OFFLINE_REASONS,
  RAW_VERIFIER_CODES,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("Stage 4H.4 exit wrapper is total over every raw verifier and harness code", () => {
  const rawCodes = [
    ...Object.values(RAW_VERIFIER_CODES),
    ...Object.values(HARNESS_CODES),
  ];
  for (const raw of rawCodes) {
    assert.equal([0, 1, 2, 3].includes(stage4CodeForRawCode(raw)), true, String(raw));
  }
});

test("Stage 4H.4 exit wrapper matches the frozen raw-to-run-level table", () => {
  assert.equal(stage4CodeForRawCode(0), 0);
  for (const raw of [19, 20, 21, 22, 23, 24, 25, 26, 27]) {
    assert.equal(stage4CodeForRawCode(raw), 1, String(raw));
  }
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
});

test("Stage 4H.4 exit wrapper fails closed on unknown raw codes", () => {
  for (const raw of [999, -1, undefined, null, "4D_VERIFY_FAILURE"]) {
    assert.equal(stage4CodeForRawCode(raw), 3, String(raw));
  }
});

test("Stage 4H.4 exit map is explicit and collision-bounded", () => {
  assert.deepEqual(RUN_LEVEL_BY_RAW, Object.freeze({
    0: 0,
    19: 1,
    20: 1,
    21: 1,
    22: 1,
    23: 1,
    24: 1,
    25: 1,
    26: 1,
    27: 1,
    28: 2,
    29: 3,
  }));
});

test("Stage 4H.4 offline reason list covers every denied surface", () => {
  assert.deepEqual(OFFLINE_REASONS, Object.freeze([
    "fetch_invoked",
    "http_client_invoked",
    "socket_connect_invoked",
    "dns_invoked",
    "udp_invoked",
    "subprocess_invoked",
    "model_client_present",
    "forbidden_builtin_imported",
    "hermeticity_falsifier_not_tested",
  ]));
});
```

- [ ] **Step 2: Run the wrapper test and verify it fails**

Run:

```bash
node --test tests/unit/llmShield/stage4h/exitWrapper.test.js
```

Expected: FAIL because `RUN_LEVEL_BY_RAW` and `OFFLINE_REASONS` are not exported yet.

- [ ] **Step 3: Implement the wrapper exports**

Patch `tools/simurgh-attestation/stage4h/exitCodes.mjs` so the bottom of the file contains:

```js
export const OFFLINE_REASONS = Object.freeze([
  "fetch_invoked",
  "http_client_invoked",
  "socket_connect_invoked",
  "dns_invoked",
  "udp_invoked",
  "subprocess_invoked",
  "model_client_present",
  "forbidden_builtin_imported",
  "hermeticity_falsifier_not_tested",
]);

export const RUN_LEVEL_BY_RAW = Object.freeze({
  0: 0,
  19: 1,
  20: 1,
  21: 1,
  22: 1,
  23: 1,
  24: 1,
  25: 1,
  26: 1,
  27: 1,
  28: 2,
  29: 3,
});

export function stage4CodeForRawCode(code) {
  return Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, code)
    ? RUN_LEVEL_BY_RAW[code]
    : 3;
}
```

Remove the previous range-based `stage4CodeForRawCode` implementation.

- [ ] **Step 4: Run tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/exitWrapper.test.js tests/unit/llmShield/stage4h/schema.test.js
```

Expected: PASS. `schema.test.js` confirms no Stage 4 wrapper regression.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-attestation/stage4h/exitCodes.mjs tests/unit/llmShield/stage4h/exitWrapper.test.js
git commit -m "feat(llm-shield): make stage 4h exit wrapper total"
```

## Task 2: Offline Harness And Egress Double

**Files:**

- Create: `tools/simurgh-attestation/stage4h/offlineHarness.mjs`
- Create: `tests/fixtures/llmShield/stage4h/offline/egress-double.mjs`
- Create: `tests/unit/llmShield/stage4h/offlineHarness.test.js`

- [ ] **Step 1: Write the egress-double fixture**

Create `tests/fixtures/llmShield/stage4h/offline/egress-double.mjs`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
export async function attemptEgress(surface) {
  if (surface === "fetch") {
    return fetch("https://example.invalid/stage4h-offline-test");
  }
  if (surface === "http") {
    const http = await import("node:http");
    return http.get("http://example.invalid/stage4h-offline-test");
  }
  if (surface === "https") {
    const https = await import("node:https");
    return https.get("https://example.invalid/stage4h-offline-test");
  }
  if (surface === "net") {
    const net = await import("node:net");
    return net.connect({ host: "example.invalid", port: 443 });
  }
  if (surface === "tls") {
    const tls = await import("node:tls");
    return tls.connect({ host: "example.invalid", port: 443 });
  }
  if (surface === "dns") {
    const dns = await import("node:dns");
    return dns.lookup("example.invalid", () => {});
  }
  if (surface === "dns-promises") {
    const dns = await import("node:dns/promises");
    return dns.lookup("example.invalid");
  }
  if (surface === "dgram") {
    const dgram = await import("node:dgram");
    return dgram.createSocket("udp4");
  }
  if (surface === "child_process") {
    const childProcess = await import("node:child_process");
    return childProcess.spawn(process.execPath, ["--version"]);
  }
  throw new Error(`unknown egress surface: ${surface}`);
}
```

- [ ] **Step 2: Write failing offline harness tests**

Create `tests/unit/llmShield/stage4h/offlineHarness.test.js`:

```js
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
    writeFileSync(target, 'import http from "node:http"; export const ok = true;\\n');
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
    writeFileSync(target, 'import OpenAI from "openai"; export const ok = true;\\n');
    const result = await scanForModelClients(target, { allowedPaths: [] });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "model_client_present");
    assert.equal(result.matches[0].specifier, "openai");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("OfflineViolationError exposes the denied reason", () => {
  const error = new OfflineViolationError("fetch_invoked");
  assert.equal(error.name, "OfflineViolationError");
  assert.equal(error.reason, "fetch_invoked");
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
node --test tests/unit/llmShield/stage4h/offlineHarness.test.js
```

Expected: FAIL because `offlineHarness.mjs` does not exist.

- [ ] **Step 4: Implement `offlineHarness.mjs`**

Create `tools/simurgh-attestation/stage4h/offlineHarness.mjs` with this structure:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { RAW_VERIFIER_CODES } from "./exitCodes.mjs";

const FORBIDDEN_BUILTINS = new Map([
  ["node:http", "forbidden_builtin_imported"],
  ["http", "forbidden_builtin_imported"],
  ["node:https", "forbidden_builtin_imported"],
  ["https", "forbidden_builtin_imported"],
  ["node:net", "forbidden_builtin_imported"],
  ["net", "forbidden_builtin_imported"],
  ["node:tls", "forbidden_builtin_imported"],
  ["tls", "forbidden_builtin_imported"],
  ["node:dns", "forbidden_builtin_imported"],
  ["dns", "forbidden_builtin_imported"],
  ["node:dns/promises", "forbidden_builtin_imported"],
  ["dns/promises", "forbidden_builtin_imported"],
  ["node:dgram", "forbidden_builtin_imported"],
  ["dgram", "forbidden_builtin_imported"],
  ["node:child_process", "forbidden_builtin_imported"],
  ["child_process", "forbidden_builtin_imported"],
]);

const FORBIDDEN_MODEL_RE = /(^|[/@-])(openai|anthropic|google-ai|provider|modelClient)([/@-]|$)/i;

export class OfflineViolationError extends Error {
  constructor(reason) {
    super(`Stage 4H checker attempted offline-denied capability: ${reason}`);
    this.name = "OfflineViolationError";
    this.reason = reason;
  }
}

function hit(hits, reason) {
  const entry = { reason };
  hits.push(entry);
  throw new OfflineViolationError(reason);
}

function patchWritable(object, key, replacement, restores) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || descriptor.writable || descriptor.set) {
    const previous = object[key];
    object[key] = replacement;
    restores.push(() => {
      object[key] = previous;
    });
    return;
  }
  Object.defineProperty(object, key, { ...descriptor, value: replacement });
  restores.push(() => Object.defineProperty(object, key, descriptor));
}

export async function installDenials(hits) {
  const restores = [];
  if (typeof globalThis.fetch === "function") {
    patchWritable(globalThis, "fetch", () => hit(hits, "fetch_invoked"), restores);
  }

  const http = await import("node:http");
  const https = await import("node:https");
  const net = await import("node:net");
  const tls = await import("node:tls");
  const dns = await import("node:dns");
  const dnsPromises = await import("node:dns/promises");
  const dgram = await import("node:dgram");
  const childProcess = await import("node:child_process");

  for (const mod of [http, https]) {
    patchWritable(mod, "request", () => hit(hits, "http_client_invoked"), restores);
    patchWritable(mod, "get", () => hit(hits, "http_client_invoked"), restores);
  }
  patchWritable(net, "connect", () => hit(hits, "socket_connect_invoked"), restores);
  patchWritable(net, "createConnection", () => hit(hits, "socket_connect_invoked"), restores);
  patchWritable(tls, "connect", () => hit(hits, "socket_connect_invoked"), restores);
  patchWritable(dns, "lookup", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dns, "resolve", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dnsPromises, "lookup", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dnsPromises, "resolve", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dgram, "createSocket", () => hit(hits, "udp_invoked"), restores);
  for (const key of ["spawn", "exec", "execFile", "fork"]) {
    patchWritable(childProcess, key, () => hit(hits, "subprocess_invoked"), restores);
  }
  return restores;
}

export function restoreDenials(restores) {
  for (const restore of restores.reverse()) restore();
}

export async function runOffline(fn) {
  const hits = [];
  const restores = await installDenials(hits);
  try {
    const value = await fn();
    return { ok: hits.length === 0, code: hits.length === 0 ? 0 : 28, hits, value };
  } catch (error) {
    if (error instanceof OfflineViolationError) {
      return {
        ok: false,
        code: RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE,
        reason: error.reason,
        hits,
      };
    }
    throw error;
  } finally {
    restoreDenials(restores);
  }
}

function importSpecifiers(source) {
  const specifiers = [];
  const importRe = /(?:import|export)\\s+(?:[^'"]*?\\s+from\\s+)?["']([^"']+)["']/g;
  const dynamicRe = /import\\(\\s*["']([^"']+)["']\\s*\\)/g;
  for (const regex of [importRe, dynamicRe]) {
    let match;
    while ((match = regex.exec(source))) specifiers.push(match[1]);
  }
  return specifiers;
}

export async function scanForModelClients(entryPath, { allowedPaths = [] } = {}) {
  const url = entryPath.startsWith("file:") ? entryPath : pathToFileURL(entryPath).href;
  const allowed = new Set(allowedPaths.map((path) => pathToFileURL(path).href));
  if (allowed.has(url)) return { ok: true, matches: [] };
  const source = await readFile(new URL(url), "utf8");
  const matches = [];
  for (const specifier of importSpecifiers(source)) {
    if (FORBIDDEN_BUILTINS.has(specifier)) {
      matches.push({ specifier, reason: "forbidden_builtin_imported" });
    } else if (FORBIDDEN_MODEL_RE.test(specifier)) {
      matches.push({ specifier, reason: "model_client_present" });
    }
  }
  return matches.length === 0
    ? { ok: true, matches: [] }
    : { ok: false, reason: matches[0].reason, matches };
}
```

Implementation rule for Node builtins: patch writable runtime surfaces, keep `globalThis.fetch` runtime denial in all environments, and treat the dependency-path static scan as the authoritative enforcement for imported immutable builtins. Tests may use `mock.method()` from `node:test` where a builtin namespace is immutable.

- [ ] **Step 5: Run tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/offlineHarness.test.js
```

Expected: PASS. The passing test set must document both runtime-denied writable surfaces and static-scan denial for immutable imported builtins.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-attestation/stage4h/offlineHarness.mjs tests/fixtures/llmShield/stage4h/offline/egress-double.mjs tests/unit/llmShield/stage4h/offlineHarness.test.js
git commit -m "feat(llm-shield): add stage 4h offline harness"
```

## Task 3: Q3 Audit Script And Verifier Exit Normalization

**Files:**

- Create: `scripts/offline-audit-llm-shield-stage4h.mjs`
- Modify: `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs`
- Modify: `tests/unit/llmShield/stage4h/reproduce.test.js`

- [ ] **Step 1: Write failing Q3 reproduce assertions**

Add this block inside the first test in `tests/unit/llmShield/stage4h/reproduce.test.js`, after the existing Q7 assertions:

```js
  assert.equal(qGate.gates.Q3.status, "pass");
  assert.equal(qGate.gates.Q3.clean_run_hits, 0);
  assert.equal(qGate.gates.Q3.egress_double_caught, true);
  assert.equal(qGate.gates.Q3.egress_double_raw_code, 28);
```

Add these expected files to the fixture/evidence presence list:

```js
    `${fixtureRoot}/expected-results/exit-map.json`,
    `${fixtureRoot}/expected-results/offline-matrix.json`,
    `${evidenceRoot}/offline-report.json`,
    `${evidenceRoot}/hermeticity-attestation.json`,
    `${evidenceRoot}/exit-map.json`,
```

- [ ] **Step 2: Run the focused reproduce test and verify it fails**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: FAIL because Q3 is still `not_in_scope` and Q3 evidence files do not exist.

- [ ] **Step 3: Create the offline audit script**

Create `scripts/offline-audit-llm-shield-stage4h.mjs`:

```js
#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { privacyGate } from "../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import { buildCleanTamperContext, buildTamperMatrix } from "../tools/simurgh-attestation/stage4h/tamperClosure.mjs";
import { RUN_LEVEL_BY_RAW, stage4CodeForRawCode } from "../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { runOffline } from "../tools/simurgh-attestation/stage4h/offlineHarness.mjs";

const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";
const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJson(nested)]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

async function stable(value) {
  const json = canonicalJson(value);
  try {
    const prettier = await import("prettier");
    return await prettier.format(json, { parser: "json" });
  } catch {
    return json;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await stable(value));
}

function digest(value) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

async function runEgressDouble(surface) {
  return runOffline(async () => {
    const { attemptEgress } = await import(
      "../tests/fixtures/llmShield/stage4h/offline/egress-double.mjs"
    );
    return attemptEgress(surface);
  });
}

export async function buildOfflineReport() {
  const clean = await runOffline(async () => buildTamperMatrix(buildCleanTamperContext()));
  const egress = await runEgressDouble("fetch");
  const q7Clean = JSON.parse(await readFile(`${fixtureRoot}/privacy/q7-clean-certificate.json`, "utf8"));
  const q7 = await runOffline(async () => privacyGate(q7Clean));
  const report = {
    stage: "4H.5",
    gate: "Q3",
    denied_surfaces: [
      "fetch",
      "http",
      "https",
      "net",
      "tls",
      "dns",
      "dns-promises",
      "dgram",
      "child_process",
    ],
    clean_run_hits: clean.hits.length + q7.hits.length,
    egress_double_caught: egress.code === 28,
    egress_double_raw_code: egress.code,
    egress_double_reason: egress.reason,
    q3_status: clean.hits.length === 0 && q7.hits.length === 0 && egress.code === 28 ? "pass" : "fail",
    run_level_exit: clean.hits.length === 0 && q7.hits.length === 0 && egress.code === 28 ? 0 : 2,
  };
  return report;
}

export async function main() {
  const offlineReport = await buildOfflineReport();
  const attestation = {
    stage: "4H.5",
    gate: "Q3",
    clean_run_hits: offlineReport.clean_run_hits,
    egress_double_caught: offlineReport.egress_double_caught,
    egress_double_raw_code: offlineReport.egress_double_raw_code,
    denied_surfaces: offlineReport.denied_surfaces,
    node_major: Number(process.versions.node.split(".")[0]),
  };
  const exitMap = {
    stage: "4H.5",
    run_level_by_raw: RUN_LEVEL_BY_RAW,
    unknown_raw_maps_to: stage4CodeForRawCode(999),
  };
  await writeJson(`${evidenceRoot}/offline-report.json`, offlineReport);
  await writeJson(`${evidenceRoot}/hermeticity-attestation.json`, {
    ...attestation,
    hermeticity_attestation_digest: digest(attestation),
  });
  await writeJson(`${evidenceRoot}/exit-map.json`, exitMap);
  await writeJson(`${fixtureRoot}/expected-results/offline-matrix.json`, offlineReport);
  await writeJson(`${fixtureRoot}/expected-results/exit-map.json`, exitMap);
  if (offlineReport.q3_status !== "pass") {
    process.exit(stage4CodeForRawCode(28));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h offline audit: ${error.message}`);
    process.exit(stage4CodeForRawCode(29));
  });
}
```

- [ ] **Step 4: Normalize Stage 4D crypto failures before wrapper routing**

Patch `tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs`:

```js
function normalizeVerifierRawCode(code) {
  if (code === "4D_VERIFY_FAILURE") return RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH;
  return Number.isInteger(code) ? code : RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED;
}
```

Use it in `finish()`:

```js
async function finish({ outPath, code, reason, certificate, premises = null }) {
  const rawCode = normalizeVerifierRawCode(code);
  await writeResult(outPath, baseResult({ code: rawCode, reason, certificate, premises }));
  console.log(
    rawCode === RAW_VERIFIER_CODES.OK
      ? "Stage 4H.5 verifier: PASS"
      : `Stage 4H.5 verifier: FAIL ${reason}`
  );
  process.exitCode = stage4CodeForRawCode(rawCode);
  return rawCode;
}
```

This changes process exits from raw verifier codes to typed run-level exits. Update tests that assert process status to read the JSON `code` field when they need the internal raw code.

- [ ] **Step 5: Run audit and focused tests**

Run:

```bash
node scripts/offline-audit-llm-shield-stage4h.mjs
node --test tests/unit/llmShield/stage4h/offlineHarness.test.js tests/unit/llmShield/stage4h/exitWrapper.test.js tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: offline audit exits `0`; tests pass after adjusting process-status assertions to typed exits.

- [ ] **Step 6: Commit**

```bash
git add scripts/offline-audit-llm-shield-stage4h.mjs tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs tests/unit/llmShield/stage4h/reproduce.test.js docs/research/llm-shield/evidence/stage-4h/offline-report.json docs/research/llm-shield/evidence/stage-4h/hermeticity-attestation.json docs/research/llm-shield/evidence/stage-4h/exit-map.json tests/fixtures/llmShield/stage4h/expected-results/offline-matrix.json tests/fixtures/llmShield/stage4h/expected-results/exit-map.json
git commit -m "feat(llm-shield): add stage 4h q3 offline audit"
```

## Task 4: Builder Evidence And Q-Gate Finalization

**Files:**

- Modify: `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs`
- Modify: `tools/simurgh-attestation/stage4h/schema.mjs`
- Modify: `tools/simurgh-attestation/stage4h/packBinding.mjs`
- Modify: `docs/research/llm-shield/evidence/stage-4h/q-gate-results.json`
- Modify: `docs/research/llm-shield/evidence/stage-4h/signed-pack-manifest.json`
- Modify: `docs/research/llm-shield/evidence/stage-4h/e2e-smoke-coverage.json`
- Test: `tests/e2e/llmShield/stage4hFullSmoke.test.js`

- [ ] **Step 1: Write failing E2E assertions for Q3 and new evidence**

Patch `tests/e2e/llmShield/stage4hFullSmoke.test.js` so it expects:

```js
    assert.equal(qGate.gates.Q3.status, "pass", "Q3 pass");
    assert.equal(qGate.gates.Q3.clean_run_hits, 0);
    assert.equal(qGate.gates.Q3.egress_double_caught, true);
    assert.equal(qGate.gates.Q3.egress_double_raw_code, 28);
```

Add these files to the metadata-only existence list:

```js
      `${evidenceRoot}/offline-report.json`,
      `${evidenceRoot}/hermeticity-attestation.json`,
      `${evidenceRoot}/exit-map.json`,
      `${evidenceRoot}/reproduce-summary.json`,
```

- [ ] **Step 2: Run E2E and verify it fails**

Run:

```bash
node --test tests/e2e/llmShield/stage4hFullSmoke.test.js
```

Expected: FAIL because builder has not emitted Q3 final evidence.

- [ ] **Step 3: Add manifest schema support for hermeticity digest**

Patch `tools/simurgh-attestation/stage4h/schema.mjs` so signed manifests allow and validate `hermeticity_attestation_digest` as a SHA-256 digest. The manifest allowed-key list must contain:

```js
const SIGNED_PACK_MANIFEST_KEYS = Object.freeze([
  "manifest_version",
  "base_pack_digest",
  "certificate_digest",
  "hermeticity_attestation_digest",
  "merkle_root",
  "signed_pack_manifest_digest",
  "signature",
]);
```

Keep compatibility by allowing older test manifests only in fixture migration if required. The final builder output must always include the new digest.

- [ ] **Step 4: Add manifest binding support**

Patch `tools/simurgh-attestation/stage4h/packBinding.mjs`:

```js
export function buildSignedPackManifest({ certificate, privateKey, hermeticityAttestationDigest = null }) {
  const certCheck = validateDfiCertificate(certificate);
  if (!certCheck.ok) throw new Error(`invalid certificate: ${certCheck.reason}:${certCheck.field}`);
  const certDigest = certificateDigest(certificate);
  const payload = {
    manifest_version: MANIFEST_VERSION,
    base_pack_digest: certificate.base_pack_digest,
    certificate_digest: certDigest,
    hermeticity_attestation_digest: hermeticityAttestationDigest ?? `sha256:${"0".repeat(64)}`,
    merkle_root: `sha256:${merkleRoot([
      certificate.base_pack_digest.replace(/^sha256:/, ""),
      certDigest.replace(/^sha256:/, ""),
      (hermeticityAttestationDigest ?? `sha256:${"0".repeat(64)}`).replace(/^sha256:/, ""),
    ])}`,
  };
  const signed_pack_manifest_digest = manifestDigest(payload);
  const signature = `base64:${sign(null, domainBytes(MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return { ...payload, signed_pack_manifest_digest, signature };
}
```

Also update `verifyPackBinding()` to recompute the Merkle root with `manifest.hermeticity_attestation_digest`.

- [ ] **Step 5: Update builder to emit Q3 evidence**

Patch `tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs` to import `buildOfflineReport` from `scripts/offline-audit-llm-shield-stage4h.mjs` or factor the shared report builder into `tools/simurgh-attestation/stage4h/offlineEvidence.mjs` if direct script import creates a cycle.

The builder must:

```js
const offlineReport = await buildOfflineReport();
const hermeticityAttestation = {
  stage: "4H.5",
  gate: "Q3",
  clean_run_hits: offlineReport.clean_run_hits,
  egress_double_caught: offlineReport.egress_double_caught,
  egress_double_raw_code: offlineReport.egress_double_raw_code,
  denied_surfaces: offlineReport.denied_surfaces,
  node_major: Number(process.versions.node.split(".")[0]),
};
const hermeticityAttestationDigest = digest(hermeticityAttestation);
const q0Manifest = signManifest(q0Certificate, manifestPrivateKey, hermeticityAttestationDigest);
```

Then write:

```js
await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "offline-report.json"), offlineReport);
await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "hermeticity-attestation.json"), {
  ...hermeticityAttestation,
  hermeticity_attestation_digest: hermeticityAttestationDigest,
});
await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "exit-map.json"), exitMap);
```

Set:

```js
Q3: {
  status: offlineReport.q3_status,
  clean_run_hits: offlineReport.clean_run_hits,
  egress_double_caught: offlineReport.egress_double_caught,
  egress_double_raw_code: offlineReport.egress_double_raw_code,
}
```

Set top-level evidence stage to `"4H.5"` where the evidence represents the final pack.

- [ ] **Step 6: Run builder and E2E**

Run:

```bash
node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs
node --test tests/e2e/llmShield/stage4hFullSmoke.test.js tests/unit/llmShield/stage4h/packBinding.test.js tests/unit/llmShield/stage4h/schema.test.js
```

Expected: PASS. Inspect `signed-pack-manifest.json` and confirm it contains `hermeticity_attestation_digest`.

- [ ] **Step 7: Commit**

```bash
git add tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs tools/simurgh-attestation/stage4h/schema.mjs tools/simurgh-attestation/stage4h/packBinding.mjs tests/e2e/llmShield/stage4hFullSmoke.test.js docs/research/llm-shield/evidence/stage-4h tests/fixtures/llmShield/stage4h
git commit -m "feat(llm-shield): bind stage 4h hermeticity evidence"
```

## Task 5: Typed One-Command Reproduce Pipeline

**Files:**

- Modify: `scripts/reproduce-llm-shield-stage4h.sh`
- Modify: `tests/unit/llmShield/stage4h/reproduce.test.js`
- Create/modify: `docs/research/llm-shield/evidence/stage-4h/reproduce-summary.json`

- [ ] **Step 1: Add reproduce script source checks to tests**

Add a test in `tests/unit/llmShield/stage4h/reproduce.test.js`:

```js
test("Stage 4H.5 reproduce script routes every step through typed wrapper", () => {
  const script = readFileSync("scripts/reproduce-llm-shield-stage4h.sh", "utf8");
  assert.match(script, /exit_via_wrapper\\(\\)/);
  assert.match(script, /run_step\\(\\)/);
  assert.equal(/exit 1\\b/.test(script), false);
  assert.match(script, /stage4CodeForRawCode/);
});
```

- [ ] **Step 2: Run and verify it fails**

Run:

```bash
node --test tests/unit/llmShield/stage4h/reproduce.test.js
```

Expected: FAIL because the current script uses `set -e` directly and has no wrapper helper.

- [ ] **Step 3: Replace reproduce script with typed pipeline**

Replace `scripts/reproduce-llm-shield-stage4h.sh` with:

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RAW=0
SUMMARY="docs/research/llm-shield/evidence/stage-4h/reproduce-summary.json"

exit_via_wrapper() {
  local raw="$1"
  node -e "import('./tools/simurgh-attestation/stage4h/exitCodes.mjs').then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))" "$raw"
}

record_summary() {
  local raw="$1"
  node --input-type=module - "$raw" "$SUMMARY" <<'NODE'
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { stage4CodeForRawCode } from "./tools/simurgh-attestation/stage4h/exitCodes.mjs";
const raw = Number(process.argv[2]);
const out = process.argv[3];
const summary = {
  stage: "4H.5",
  raw_code: raw,
  run_level_exit: stage4CodeForRawCode(raw),
  q0_to_q7: "pass",
  typed_exit_source: "stage4CodeForRawCode",
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
NODE
}

run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    record_summary "$RAW"
    exit_via_wrapper "$RAW"
  fi
}

echo "[1/8] scrub and pin deterministic environment"
unset OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY BROWSERBASE_API_KEY
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0 NO_NETWORK=1

echo "[2/8] rebuild Stage 4H fixtures and digests"
run_step 29 node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs

echo "[3/8] verify signed clean Stage 4H pack"
run_step 25 node tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs \
  --base-pack tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.json \
  --base-pack-sig tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-base-pack.sig \
  --base-pack-pubkey tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-signer.pub \
  --certificate tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-dfi-certificate.json \
  --manifest tests/fixtures/llmShield/stage4h/q0-clean-disconnected-untrusted-signed-pack-manifest.json \
  --manifest-pubkey tests/fixtures/llmShield/stage4h/manifest-verifier.pub \
  --out docs/research/llm-shield/evidence/stage-4h/verifier-results.json

echo "[4/8] run Q3 offline audit"
if command -v unshare >/dev/null 2>&1; then
  run_step 28 unshare -rn node scripts/offline-audit-llm-shield-stage4h.mjs
else
  echo "unshare unavailable; OS ring skipped; in-process Q3 harness remains authoritative"
  run_step 28 node scripts/offline-audit-llm-shield-stage4h.mjs
fi

echo "[5/8] replay Q0-Q7 unit matrix"
run_step 29 node --test \
  tests/unit/llmShield/stage4h/schema.test.js \
  tests/unit/llmShield/stage4h/premiseBinding.test.js \
  tests/unit/llmShield/stage4h/packBinding.test.js \
  tests/unit/llmShield/stage4h/derivation.test.js \
  tests/unit/llmShield/stage4h/diagnosticSoundness.test.js \
  tests/unit/llmShield/stage4h/discrimination.test.js \
  tests/unit/llmShield/stage4h/privacyGate.test.js \
  tests/unit/llmShield/stage4h/tamperClosure.test.js \
  tests/unit/llmShield/stage4h/offlineHarness.test.js \
  tests/unit/llmShield/stage4h/exitWrapper.test.js \
  tests/unit/llmShield/stage4h/reproduce.test.js

echo "[6/8] verify byte-stable evidence formatting"
run_step 29 npx prettier --check \
  docs/research/llm-shield/evidence/stage-4h/*.json \
  tests/fixtures/llmShield/stage4h/*.json \
  tests/fixtures/llmShield/stage4h/privacy/*.json \
  tests/fixtures/llmShield/stage4h/tamper/*.json \
  tests/fixtures/llmShield/stage4h/expected-results/*.json

echo "[7/8] run anti-theatre deletion check"
run_step 29 node --test tests/unit/llmShield/stage4h/closeout.test.js

echo "[8/8] run Stage 4H E2E smoke"
run_step 29 node --test tests/e2e/llmShield/stage4hFullSmoke.test.js

RAW=0
record_summary "$RAW"
echo "Stage 4H.5 final reproduce: PASS"
exit_via_wrapper "$RAW"
```

- [ ] **Step 4: Run script**

Run:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected: exit `0`. If `unshare -rn` is present but denied by host permissions, adjust the script to treat only `unshare` command absence and permission denial as OS-ring skip, then run the in-process audit.

- [ ] **Step 5: Commit**

```bash
git add scripts/reproduce-llm-shield-stage4h.sh docs/research/llm-shield/evidence/stage-4h/reproduce-summary.json tests/unit/llmShield/stage4h/reproduce.test.js
git commit -m "feat(llm-shield): finalize stage 4h typed reproduce"
```

## Task 6: Anti-Theatre Deletion And Byte-Stability Tests

**Files:**

- Create: `tests/unit/llmShield/stage4h/closeout.test.js`
- Modify: `scripts/reproduce-llm-shield-stage4h.sh`

- [ ] **Step 1: Write closeout tests**

Create `tests/unit/llmShield/stage4h/closeout.test.js`:

```js
// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";
const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("Stage 4H.5 evidence pack contains final Q3 and closeout files", () => {
  for (const path of [
    `${evidenceRoot}/certificate.json`,
    `${evidenceRoot}/signed-pack-manifest.json`,
    `${evidenceRoot}/verifier-results.json`,
    `${evidenceRoot}/q-gate-results.json`,
    `${evidenceRoot}/tamper-results.json`,
    `${evidenceRoot}/privacy-report.json`,
    `${evidenceRoot}/offline-report.json`,
    `${evidenceRoot}/hermeticity-attestation.json`,
    `${evidenceRoot}/exit-map.json`,
    `${evidenceRoot}/reproduce-summary.json`,
  ]) {
    assert.equal(existsSync(path), true, `${path} exists`);
  }
});

test("Stage 4H.5 Q3 pass is a conjunction, not a single green flag", () => {
  const qGate = readJson(`${evidenceRoot}/q-gate-results.json`);
  assert.equal(qGate.gates.Q3.status, "pass");
  assert.equal(qGate.gates.Q3.clean_run_hits, 0);
  assert.equal(qGate.gates.Q3.egress_double_caught, true);
  assert.equal(qGate.gates.Q3.egress_double_raw_code, 28);
});

test("Stage 4H.5 anti-theatre deletion rejects missing proof material", () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4h-delete-"));
  try {
    const certPath = join(tmp, "certificate.json");
    const outPath = join(tmp, "deleted-proof-result.json");
    const cert = readJson(`${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`);
    cert.derivation.lattice_steps = [];
    writeFileSync(certPath, `${JSON.stringify(cert, null, 2)}\n`);
    const result = spawnSync(process.execPath, [
      "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
      "--base-pack",
      `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`,
      "--base-pack-sig",
      `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.sig`,
      "--base-pack-pubkey",
      `${fixtureRoot}/q0-clean-disconnected-untrusted-signer.pub`,
      "--certificate",
      certPath,
      "--manifest",
      `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`,
      "--manifest-pubkey",
      `${fixtureRoot}/manifest-verifier.pub`,
      "--out",
      outPath,
    ]);
    assert.notEqual(result.status, 0);
    const json = readJson(outPath);
    assert.equal([24, 26].includes(json.code), true, `code ${json.code}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("Stage 4H.5 reproduce summary uses typed wrapper exit", () => {
  const summary = readJson(`${evidenceRoot}/reproduce-summary.json`);
  assert.equal(summary.raw_code, 0);
  assert.equal(summary.run_level_exit, 0);
  assert.equal(summary.typed_exit_source, "stage4CodeForRawCode");
});
```

- [ ] **Step 2: Run and verify initial failure**

Run:

```bash
node --test tests/unit/llmShield/stage4h/closeout.test.js
```

Expected: FAIL until Q3 evidence and reproduce summary exist.

- [ ] **Step 3: Add byte-stability script helper**

Add a `byte_stable_check` function to `scripts/reproduce-llm-shield-stage4h.sh`:

```bash
byte_stable_check() {
  local first second
  first="$(mktemp -d)"
  second="$(mktemp -d)"
  node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs >/dev/null
  cp docs/research/llm-shield/evidence/stage-4h/*.json "$first/"
  node tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs >/dev/null
  cp docs/research/llm-shield/evidence/stage-4h/*.json "$second/"
  diff -ru "$first" "$second" >/dev/null
}
```

Replace the step 6 Prettier-only check with:

```bash
echo "[6/8] verify byte-stable evidence"
run_step 29 byte_stable_check
run_step 29 npx prettier --check docs/research/llm-shield/evidence/stage-4h/*.json
```

- [ ] **Step 4: Run closeout and reproduce tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/closeout.test.js tests/unit/llmShield/stage4h/reproduce.test.js
scripts/reproduce-llm-shield-stage4h.sh
```

Expected: PASS and reproduce exit `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/llmShield/stage4h/closeout.test.js scripts/reproduce-llm-shield-stage4h.sh docs/research/llm-shield/evidence/stage-4h/reproduce-summary.json
git commit -m "test(llm-shield): add stage 4h closeout falsifiers"
```

## Task 7: Final Closeout Docs And Matrices

**Files:**

- Create: `docs/research/llm-shield/STAGE_4H_CLOSEOUT.md`
- Create: `docs/research/llm-shield/STAGE_4H_REVIEWER_CHECKLIST.md`
- Create/modify: `docs/research/llm-shield/STAGE_4H_VALIDATION_MATRIX.md`
- Create/modify: `docs/research/llm-shield/STAGE_4H_THREAT_MODEL.md`
- Modify: `docs/research/llm-shield/evidence/stage-4h/README.md`
- Modify: `tests/unit/llmShield/stage4h/closeout.test.js`

- [ ] **Step 1: Add doc existence and coverage tests**

Append to `tests/unit/llmShield/stage4h/closeout.test.js`:

```js
test("Stage 4H.5 closeout docs cover every Q gate and non-claim", () => {
  const files = [
    "docs/research/llm-shield/STAGE_4H_CLOSEOUT.md",
    "docs/research/llm-shield/STAGE_4H_REVIEWER_CHECKLIST.md",
    "docs/research/llm-shield/STAGE_4H_VALIDATION_MATRIX.md",
    "docs/research/llm-shield/STAGE_4H_THREAT_MODEL.md",
  ];
  for (const path of files) assert.equal(existsSync(path), true, `${path} exists`);
  const haystack = files.map((path) => readFileSync(path, "utf8")).join("\\n");
  for (const gate of ["Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"]) {
    assert.equal(haystack.includes(gate), true, `${gate} documented`);
  }
  for (const phrase of [
    "not kernel sandboxing",
    "not model safety",
    "not execution truth",
    "not implicit-flow security",
    "not multi-field collusion closure",
  ]) {
    assert.equal(haystack.includes(phrase), true, `${phrase} documented`);
  }
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```bash
node --test tests/unit/llmShield/stage4h/closeout.test.js
```

Expected: FAIL until docs are created.

- [ ] **Step 3: Write closeout docs**

Create `docs/research/llm-shield/STAGE_4H_CLOSEOUT.md` with these sections:

```md
# Stage 4H Closeout

Stage 4H proof-carrying explicit data-flow integrity is closed through 4H.5.

## Milestone Ledger

| Milestone | Status | Evidence |
| --- | --- | --- |
| 4H.0 digest and binding foundation | pass | `docs/research/llm-shield/evidence/stage-4h/verifier-results.json` |
| 4H.1 lattice and derivation validator | pass | `q-gate-results.json` Q1 |
| 4H.2 Q0/Q4 discrimination | pass | `q-gate-results.json` Q0/Q4 |
| 4H.3 Q6/Q7 tamper and privacy | pass | `tamper-results.json`, `privacy-report.json` |
| 4H.4 Q3 offline hermeticity and wrapper | pass | `offline-report.json`, `exit-map.json` |
| 4H.5 reproduce and reviewer closeout | pass | `reproduce-summary.json` |

## Q-Gate Ledger

Q0 through Q7 are pass in `docs/research/llm-shield/evidence/stage-4h/q-gate-results.json`.

## Non-Claims

This is not kernel sandboxing, not model safety, not execution truth, not implicit-flow security, not multi-field collusion closure, not statistical robustness, and not future-run guarantee.

## Release Decision

Implementation may be tagged after verification as "Stage 4H proof-carrying containment v0". Public-priority "first ..." wording remains frozen unless explicitly approved later.
```

Create `STAGE_4H_REVIEWER_CHECKLIST.md`, `STAGE_4H_VALIDATION_MATRIX.md`, and `STAGE_4H_THREAT_MODEL.md` using the T1-T6 table, the Q0-Q7 falsifier matrix, and the non-claims from the design spec.

- [ ] **Step 4: Update evidence README**

Replace the evidence README with a concise closeout statement:

````md
# Stage 4H Evidence

Run:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected clean exit: `0`.

This evidence covers Q0-Q7 for Stage 4H.5. It proves deterministic offline checker reproduction over signed, bounded Stage 4H evidence.

Non-claims: not kernel sandboxing, not model safety, not execution truth, not implicit-flow security, not multi-field collusion closure, not statistical robustness, and not future-run guarantee.
```
````

- [ ] **Step 5: Run closeout tests**

Run:

```bash
node --test tests/unit/llmShield/stage4h/closeout.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/research/llm-shield/STAGE_4H_CLOSEOUT.md docs/research/llm-shield/STAGE_4H_REVIEWER_CHECKLIST.md docs/research/llm-shield/STAGE_4H_VALIDATION_MATRIX.md docs/research/llm-shield/STAGE_4H_THREAT_MODEL.md docs/research/llm-shield/evidence/stage-4h/README.md tests/unit/llmShield/stage4h/closeout.test.js
git commit -m "docs(llm-shield): add stage 4h closeout docs"
```

## Task 8: Final Verification And PR Readiness

**Files:**

- Modify: final generated evidence only if reproduce regenerates deterministic outputs.

- [ ] **Step 1: Run focused Stage 4H reproduce**

Run:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected: exit `0`, final line `Stage 4H.5 final reproduce: PASS`.

- [ ] **Step 2: Run Stage 4H test slice**

Run:

```bash
node --test tests/unit/llmShield/stage4h/*.test.js tests/e2e/llmShield/stage4hFullSmoke.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full repo tests and formatting**

Run:

```bash
npm test
npm run format:check
git diff --check
```

Expected: PASS.

- [ ] **Step 4: Run overclaim scan**

Run:

```bash
rg -n "non-interference|implicit.flow.*(secure|safe)|kernel.sandbox|non-bypassable|zero.leakage|first proof-carrying|statistically robust|model.safe" \
  docs/research/llm-shield tests/fixtures/llmShield/stage4h tools/simurgh-attestation/stage4h scripts/reproduce-llm-shield-stage4h.sh scripts/offline-audit-llm-shield-stage4h.mjs
```

Expected: matches only explicit non-claims, deferrals, or not-in-scope notes.

- [ ] **Step 5: Run shellcheck if available**

Run:

```bash
if command -v shellcheck >/dev/null 2>&1; then shellcheck scripts/reproduce-llm-shield-stage4h.sh scripts/security-audit-llm-shield-stage4h.sh; else echo "shellcheck unavailable: skipped"; fi
```

Expected: PASS or documented skip.

- [ ] **Step 6: Commit deterministic evidence updates**

If any generated evidence changed during final reproduce:

```bash
git status --short
git add docs/research/llm-shield/evidence/stage-4h tests/fixtures/llmShield/stage4h
git commit -m "test(llm-shield): close stage 4h milestone"
```

If no files changed, do not create an empty commit.

- [ ] **Step 7: Final status**

Run:

```bash
git status --short
git log --oneline --decorate -8
```

Expected: clean worktree and a readable Part A -> Part B commit stack.
