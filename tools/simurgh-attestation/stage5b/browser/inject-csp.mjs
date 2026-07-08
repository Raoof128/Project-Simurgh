// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — inject the no-egress hash-CSP into the browser verifier (plan Task 14). Run
// AFTER prettier so the base64 (which contains `/`) is not reformatted. Computes sha256 of the
// inline <script> and writes a CSP meta pinning exactly that hash — no external hosts, no egress.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HTML = join(dirname(fileURLToPath(import.meta.url)), "var-verifier.html");
const html = readFileSync(HTML, "utf8");
const script = html.slice(html.indexOf("<script>") + 8, html.indexOf("</script>"));
const hash = createHash("sha256").update(script, "utf8").digest("base64");
const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'">`;
const withCsp = html.includes("Content-Security-Policy")
  ? html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, csp)
  : html.replace("<main>", csp + "\n<main>");
writeFileSync(HTML, withCsp);
console.log(`CSP injected: sha256-${hash}`);
