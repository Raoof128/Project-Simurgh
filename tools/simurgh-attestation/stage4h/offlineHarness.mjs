// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RAW_VERIFIER_CODES } from "./exitCodes.mjs";

const require = createRequire(import.meta.url);

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

  const http = require("node:http");
  const https = require("node:https");
  const net = require("node:net");
  const tls = require("node:tls");
  const dns = require("node:dns");
  const dnsPromises = require("node:dns/promises");
  const dgram = require("node:dgram");
  const childProcess = require("node:child_process");

  for (const mod of [http, https]) {
    patchWritable(mod, "request", () => hit(hits, "http_client_invoked"), restores);
    patchWritable(mod, "get", () => hit(hits, "http_client_invoked"), restores);
  }
  patchWritable(net, "connect", () => hit(hits, "socket_connect_invoked"), restores);
  patchWritable(net, "createConnection", () => hit(hits, "socket_connect_invoked"), restores);
  patchWritable(net.Socket.prototype, "connect", () => hit(hits, "socket_connect_invoked"), restores);
  patchWritable(tls, "connect", () => hit(hits, "socket_connect_invoked"), restores);
  patchWritable(dns, "lookup", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dns, "resolve", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dnsPromises, "lookup", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dnsPromises, "resolve", () => hit(hits, "dns_invoked"), restores);
  patchWritable(dgram, "createSocket", () => hit(hits, "udp_invoked"), restores);
  for (const key of ["spawn", "exec", "execFile", "fork"]) {
    patchWritable(childProcess, key, () => hit(hits, "subprocess_invoked"), restores);
  }
  syncBuiltinESMExports();
  return restores;
}

export function restoreDenials(restores) {
  for (const restore of restores.reverse()) restore();
  syncBuiltinESMExports();
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
  const importRe = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicRe = /import\(\s*["']([^"']+)["']\s*\)/g;
  for (const regex of [importRe, dynamicRe]) {
    let match;
    while ((match = regex.exec(source))) specifiers.push(match[1]);
  }
  return specifiers;
}

function shouldSkipScan(url, allowed) {
  const path = new URL(url).pathname;
  return (
    allowed.has(url) ||
    path.endsWith("/tools/simurgh-attestation/stage4h/offlineHarness.mjs") ||
    path.includes("/tests/fixtures/llmShield/stage4h/offline/egress-double.mjs") ||
    path.includes("/tests/")
  );
}

function isLocalSpecifier(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");
}

async function resolveLocalImport(specifier, parentUrl) {
  const parentPath = new URL(parentUrl).pathname;
  const rawPath = specifier.startsWith("/")
    ? specifier
    : resolve(dirname(parentPath), specifier);
  const candidates = extname(rawPath)
    ? [rawPath]
    : [
        `${rawPath}.mjs`,
        `${rawPath}.js`,
        `${rawPath}.cjs`,
        `${rawPath}/index.mjs`,
        `${rawPath}/index.js`,
      ];
  for (const candidate of candidates) {
    try {
      await readFile(candidate, "utf8");
      return pathToFileURL(candidate).href;
    } catch {
      continue;
    }
  }
  return null;
}

export async function scanForModelClients(entryPath, { allowedPaths = [] } = {}) {
  const firstUrl = entryPath.startsWith("file:") ? entryPath : pathToFileURL(entryPath).href;
  const allowed = new Set(allowedPaths.map((path) => pathToFileURL(path).href));
  const matches = [];
  const seen = new Set();
  const stack = [firstUrl];
  while (stack.length > 0) {
    const url = stack.pop();
    if (!url || seen.has(url) || shouldSkipScan(url, allowed)) continue;
    seen.add(url);
    const source = await readFile(new URL(url), "utf8");
    for (const specifier of importSpecifiers(source)) {
      if (FORBIDDEN_BUILTINS.has(specifier)) {
        matches.push({ file: url, specifier, reason: "forbidden_builtin_imported" });
      } else if (FORBIDDEN_MODEL_RE.test(specifier)) {
        matches.push({ file: url, specifier, reason: "model_client_present" });
      } else if (isLocalSpecifier(specifier)) {
        stack.push(await resolveLocalImport(specifier, url));
      }
    }
  }
  return matches.length === 0
    ? { ok: true, matches: [] }
    : { ok: false, reason: matches[0].reason, matches };
}
