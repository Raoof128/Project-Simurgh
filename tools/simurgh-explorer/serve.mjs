// SPDX-License-Identifier: AGPL-3.0-or-later
import { createServer } from "node:http";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { resolve, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
export function createExplorerServer({
  directory = existsSync(resolve(HERE, "dist"))
    ? resolve(HERE, "dist")
    : resolve(HERE, "node_modules/.simurgh-explorer-dist"),
} = {}) {
  const base = realpathSync(directory);
  return createServer((req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    );
    const hosts = new Set([
      `127.0.0.1:${req.socket.localPort}`,
      `localhost:${req.socket.localPort}`,
    ]);
    if (!hosts.has(req.headers.host)) {
      res.writeHead(403);
      res.end("Invalid host");
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end("Read only");
      return;
    }
    if (
      req.headers.origin &&
      ![
        `http://127.0.0.1:${req.socket.localPort}`,
        `http://localhost:${req.socket.localPort}`,
      ].includes(req.headers.origin)
    ) {
      res.writeHead(403);
      res.end("Cross-origin request refused");
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (pathname.includes("\0") || pathname.split("/").includes("..")) throw new Error("path");
      const path = realpathSync(resolve(base, "." + (pathname === "/" ? "/index.html" : pathname)));
      if (relative(base, path).startsWith("..") || !statSync(path).isFile())
        throw new Error("path");
      const type = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
      }[extname(path)];
      if (!type) throw new Error("type");
      res.setHeader("Content-Type", type);
      res.writeHead(200);
      res.end(req.method === "HEAD" ? undefined : readFileSync(path));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}
// Main-module guard. `import.meta.url` is the loader's REAL, percent-encoded path; `process.argv[1]`
// is whatever the shell passed. Compared as text, a verifier launched through a symlinked
// directory (`/tmp` on macOS) or a path containing a space never runs and exits 0 printing
// nothing (audit C-1, 31 October 2026). Both sides are resolved to the physical path here.
function isMainModule(moduleUrl) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  const port = Number(process.env.SIMURGH_EXPLORER_PORT || 4173);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid SIMURGH_EXPLORER_PORT");
  createExplorerServer().listen(port, "127.0.0.1", () =>
    console.log(`Simurgh explorer: http://127.0.0.1:${port}`)
  );
}
