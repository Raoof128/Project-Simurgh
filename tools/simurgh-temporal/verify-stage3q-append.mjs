// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: append-continuity of the committed registry vs the previous head.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyAppendContinuity } from "./registryChain.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";

export function verifyAppend({ previousHead, registry }) {
  const r = verifyAppendContinuity(previousHead, registry);
  return { ok: r.ok, checks: { append_continuity_valid: r.ok }, errors: r.errors };
}

async function main() {
  const registry = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  const previousHead = JSON.parse(
    await readFile(join(EV, "registry", "previous-registry-head.json"), "utf8")
  );
  const { ok, checks, errors } = verifyAppend({ previousHead, registry });
  console.log(JSON.stringify({ checks, errors }, null, 2));
  if (!ok) {
    console.error("stage3q append verify: FAIL");
    process.exit(1);
  }
  console.log("stage3q append verify: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
