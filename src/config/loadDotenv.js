// SPDX-License-Identifier: AGPL-3.0-or-later
// `.env` loader, imported FIRST by server.js. `src/config/env.js` snapshots process.env at import,
// and the loader used to run after that import, so every limit, TTL and flag written in `.env`
// was silently ignored while the variables read inside server.js applied (audit D-7, 31 October
// 2026). Strips inline `#` comments outside quotes. SIMURGH_SKIP_DOTENV=1 skips the file so
// tests can prove the fail-closed guards against a genuinely empty environment.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");

export function loadDotenv(path = envPath, env = process.env) {
  if (env.SIMURGH_SKIP_DOTENV === "1" || !existsSync(path)) return 0;
  let loaded = 0;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || env[m[1]]) continue;
    let val = m[2];
    const quoted = /^\s*(['"])(.*?)\1\s*(?:#.*)?$/.exec(val);
    if (quoted) val = quoted[2];
    else {
      const hashIdx = val.indexOf("#");
      if (hashIdx >= 0) val = val.slice(0, hashIdx);
    }
    env[m[1]] = val.trim();
    loaded += 1;
  }
  return loaded;
}

loadDotenv();
