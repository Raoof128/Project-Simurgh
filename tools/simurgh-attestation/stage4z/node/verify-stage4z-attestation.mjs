// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — verify the committed evidence (plan Task 9). --tier public|audit.
// Public = structure + signatures + precommitment + binding + grid + flags + conflict WITH
// tensors withheld; audit adds the tensor recompute (195). Each fixture must return its
// EXPECTED code; the withheld set skips audit. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { evaluateVwa } from "../core/vwaCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const KEY = join(
  ROOT,
  "tests/fixtures/llmShield/stage4z/test-keys/INSECURE_FIXTURE_ONLY_vwa.pub.pem"
);

const readJson = (dir, name) => JSON.parse(readFileSync(join(dir, name), "utf8"));

export function verify({ dir = EVID, tier = "public", publicKeyPem } = {}) {
  const pub = publicKeyPem ?? readFileSync(KEY, "utf8");
  const index = readJson(dir, "index.json").fixtures;
  const results = [];
  for (const fx of index) {
    const want = tier === "public" ? fx.expected_public : fx.expected_audit;
    if (want === "SKIPPED") {
      results.push({ id: fx.id, tier, got: "SKIPPED", want, ok: true });
      continue;
    }
    const bundle = readJson(dir, `${fx.id}.bundle.json`);
    const r = evaluateVwa(bundle, { tier, publicKeyPem: pub });
    const got = r.skipped ? "SKIPPED" : r.raw;
    results.push({ id: fx.id, tier, got, want, ok: got === want });
  }
  return { ok: results.every((r) => r.ok), results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tier = process.argv.includes("--tier")
    ? process.argv[process.argv.indexOf("--tier") + 1]
    : "public";
  const { ok, results } = verify({ tier });
  for (const r of results)
    console.log(`  ${r.ok ? "PASS" : "FAIL"} ${r.id} (${r.tier}): raw ${r.got} want ${r.want}`);
  console.log(`Stage 4Z verify (${tier}): ${ok ? "ALL PASS" : "FAILURES"}`);
  process.exit(ok ? 0 : 1);
}
