// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — verify CLI. Reads a Lane-A case dir (bundle.json + config.json), re-derives facts via the
// adapter, and prints `tier=<t> raw=<n> reason=<r>` for public + audit. Absolute-path dir args supported
// (the 5I droplet fix). Exits non-zero if a tier does not verify to raw 0 (when expected).
import { readFileSync } from "node:fs";
import { join, isAbsolute, resolve } from "node:path";
import { verifyVtcq } from "./adapter.mjs";
import { vtcqLaneKeys } from "./laneKeys.mjs";

export function verifyCaseDir(dir) {
  const base = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  const bundle = JSON.parse(readFileSync(join(base, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
  const keys = vtcqLaneKeys();
  const out = {};
  for (const tier of ["public", "audit"]) out[tier] = verifyVtcq(bundle, cfg, keys, { tier });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: verify-vtcq-attestation.mjs <case-dir>");
    process.exit(2);
  }
  const res = verifyCaseDir(dir);
  let bad = false;
  for (const [tier, r] of Object.entries(res)) {
    console.log(`tier=${tier} raw=${r.raw} reason=${r.reason ?? "verified"}`);
    if (r.raw !== 0) bad = true;
  }
  process.exit(bad ? 1 : 0);
}
