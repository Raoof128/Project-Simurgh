// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — CSP hash injector (plan Task 13 gotcha). Run AFTER prettier, never reformat
// after. Computes the sha256 of the inline <script>/<style> bytes and writes them into the
// hash-CSP meta. base64 contains '/', so this MUST be a script file, not inline `node -e`.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PATH = join(HERE, "vnc-verifier.html");
let html = readFileSync(PATH, "utf8");

const inner = (tag) => {
  const o = html.indexOf(`<${tag}>`) + `<${tag}>`.length;
  return html.slice(o, html.indexOf(`</${tag}>`, o));
};
const b64 = (s) => createHash("sha256").update(s, "utf8").digest("base64");

html = html
  .replace("PLACEHOLDER_SCRIPT", b64(inner("script")))
  .replace("PLACEHOLDER_STYLE", b64(inner("style")));
writeFileSync(PATH, html);
console.log("CSP hashes injected");
