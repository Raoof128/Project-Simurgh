// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R — reviewer corroboration aggregator (self-contained; Node built-ins).
// Verifies a folder of reviewer result blocks and reports what the signatures
// ACTUALLY prove, and — loudly — what they do NOT.
//
// HONESTY LIMITS (do not overclaim):
//   • Each reviewer-run mints a FRESH ephemeral key, so "distinct keys" counts
//     distinct RUNS, not provably distinct people or machines. One person can
//     produce N keys. The count is a lower-effort-bound, not a headcount.
//   • `platform` / `node_version` are SELF-REPORTED by the run and covered by
//     the signature only for internal consistency — nothing cryptographically
//     binds the run to a real OS. A macOS user can sign "win32". Treat platform
//     as a claim, never as attested evidence.
// The signature DOES prove: a block is internally consistent and unmodified, and
// the two scenarios (match + non-match) were computed and self-verified green.
//
//   node reviewer-aggregate.mjs [<dir>]
// default dir: docs/research/llm-shield/evidence/stage-4r/reviewer-runs
import crypto from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const canon = (v) =>
  JSON.stringify(v, (k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val)
          .sort()
          .reduce((o, kk) => ((o[kk] = val[kk]), o), {})
      : val
  );

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const dir =
  process.argv[2] || join(ROOT, "docs/research/llm-shield/evidence/stage-4r/reviewer-runs");

function verifyBlock(block) {
  try {
    const pub = crypto.createPublicKey({
      key: Buffer.from(block.result.reviewer_public_key_der_hex, "hex"),
      format: "der",
      type: "spki",
    });
    const sigOk = crypto.verify(
      null,
      Buffer.from(canon(block.result)),
      pub,
      Buffer.from(block.signature, "hex")
    );
    const s = block.result.scenarios;
    const scenariosOk =
      Array.isArray(s) &&
      s.length === 2 &&
      s[0].got_match === true &&
      s[0].verdict === "green" &&
      s[1].got_match === false &&
      s[1].verdict === "green";
    return sigOk && scenariosOk && block.result.all_passed === true;
  } catch {
    return false;
  }
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
const byKey = new Map(); // pubkey -> { platform, node, challenges:Set }
let invalid = 0;

for (const f of files) {
  let block;
  try {
    block = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch {
    invalid++;
    continue;
  }
  if (!verifyBlock(block)) {
    invalid++;
    console.log(`  ✗ ${f}: NOT VERIFIED`);
    continue;
  }
  const key = block.result.reviewer_public_key_der_hex;
  if (!byKey.has(key))
    byKey.set(key, {
      platform: block.result.platform || "unknown",
      node: block.result.node_version,
      challenges: new Set(),
    });
  byKey.get(key).challenges.add(block.result.challenge);
  console.log(
    `  ✓ ${f}: verified (key …${key.slice(-12)}, ${block.result.platform || "platform?"}, ${block.result.node_version})`
  );
}

const distinctKeys = byKey.size;
const platforms = new Set([...byKey.values()].map((v) => v.platform));
const nodeVersions = new Set([...byKey.values()].map((v) => v.node));

console.log("\n── Corroboration summary ──");
console.log("valid blocks:", files.length - invalid, " invalid:", invalid);
console.log("distinct signing keys (≈ distinct RUNS, not provably distinct people):", distinctKeys);
console.log(
  "self-reported platforms (CLAIMED, not attested):",
  [...platforms].join(", ") || "none"
);
console.log("self-reported Node versions (CLAIMED):", [...nodeVersions].join(", ") || "none");
console.log(
  "\nWhat this proves:",
  distinctKeys === 0
    ? "no verified runs yet."
    : `${distinctKeys} internally-consistent run(s), each computing match + non-match and self-verifying green off-repo.`
);
console.log(
  "What this does NOT prove: different people, different real machines, or the claimed OSes — those are self-reported and spoofable. A genuine cross-platform or cross-org claim needs runs you personally witnessed on distinct machines, or an institutional run."
);
