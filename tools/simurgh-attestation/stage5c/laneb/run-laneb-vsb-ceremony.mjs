// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — Lane B blind-severity ceremony PARENT (plan Task 12; F5). Motto: AnthropicSafe
// First, then ReviewerSafe. Spawns the blind child in a scrubbed env (PATH only), feeds it the
// slipped cells (digest-only inputs), receives blind severities, and seals `severity_binding`. The
// parent NEVER rewrites the child's rows — a rewrite would break the binding (238).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = join(HERE, "severity-child.mjs");

// slips: [{ mr_id, base_id, mutated_text_digest }] — the ONLY thing the child sees.
export function runCeremony(slips, { env, argv } = {}) {
  const childEnv = env ?? { PATH: process.env.PATH };
  const res = spawnSync(process.execPath, [CHILD, ...(argv ?? [])], {
    input: JSON.stringify({ slips }),
    env: childEnv,
    encoding: "utf8",
  });
  if (res.status !== 0) return { ok: false, status: res.status, error: (res.stderr || "").trim() };
  const out = JSON.parse(res.stdout);
  const severity_binding =
    "sha256:" +
    createHash("sha256")
      .update(
        canonicalJson(
          out.rows
            .map((r) => ({
              mr_id: r.mr_id,
              base_id: r.base_id,
              severity: r.severity,
              severity_basis: r.severity_basis,
            }))
            .sort((a, b) => `${a.mr_id}|${a.base_id}`.localeCompare(`${b.mr_id}|${b.base_id}`))
        )
      )
      .digest("hex");
  return { ok: true, rows: out.rows, severity_binding };
}
