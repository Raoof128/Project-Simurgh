// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — verify the committed evidence (plan Task 10). --tier public|audit.
// Public = structural arithmetic + signed commitments (no bytes); audit = byte recompute +
// replay. Each fixture must return its EXPECTED code (clean→0; tamper→target at audit;
// withheld→0 public-only). Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { evaluateVdr } from "../core/vdrCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4y");
const KEY = join(
  ROOT,
  "tests/fixtures/llmShield/stage4y/test-keys/INSECURE_FIXTURE_ONLY_vdr.pub.pem"
);

const readJson = (dir, name) => JSON.parse(readFileSync(join(dir, name), "utf8"));

function loadFixture(dir, id) {
  const auditP = join(dir, `${id}.audit.json`);
  const docP = join(dir, `${id}.document.txt`);
  const cpP = join(dir, `${id}.counterpart.json`);
  return {
    map: readJson(dir, `${id}.map.json`),
    attestation: readJson(dir, `${id}.attestation.json`),
    audit: existsSync(auditP) ? readJson(dir, `${id}.audit.json`) : null,
    bytes: existsSync(docP) ? new Uint8Array(readFileSync(docP)) : null,
    counterpart: existsSync(cpP) ? readJson(dir, `${id}.counterpart.json`) : null,
  };
}

// expectedCode(fixtureMeta, tier) — the code a faithful verify must return.
function expectedCode(fx, tier) {
  if (fx.set === "tamper") return tier === "audit" ? fx.target : 0; // tamper targets are audit-tier
  return 0; // clean + withheld both expect 0 (withheld is public-only)
}

export function verify({ dir = EVID, tier = "public", publicKeyPem } = {}) {
  const pub = publicKeyPem ?? readFileSync(KEY, "utf8");
  const index = readJson(dir, "index.json").fixtures;
  const results = [];
  for (const fx of index) {
    if (fx.set === "withheld" && tier === "audit") continue; // no bytes to recompute
    const { map, attestation, audit, bytes, counterpart } = loadFixture(dir, fx.id);
    const r = evaluateVdr(
      { map, audit, attestation },
      { tier, publicKeyPem: pub, documentBytes: bytes, counterpart }
    );
    const want = expectedCode(fx, tier);
    results.push({ id: fx.id, tier, got: r.raw, want, ok: r.raw === want });
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
  console.log(`Stage 4Y verify (${tier}): ${ok ? "ALL PASS" : "FAILURES"}`);
  process.exit(ok ? 0 : 1);
}
