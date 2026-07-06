// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R — reviewer corroboration aggregator (self-contained; Node built-ins).
// Verifies a folder of reviewer result blocks, DE-DUPES BY PUBLIC KEY (so nobody
// pads the count by running twice), and reports the honest diversity: distinct
// independent reviewers, distinct platforms, distinct Node versions. Counting
// distinct keys — not blocks — is the same no-padding discipline the stage uses
// everywhere ("the liar must ledger the lie").
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
console.log("DISTINCT independent reviewers (by key):", distinctKeys);
console.log("distinct platforms:", [...platforms].join(", ") || "none");
console.log("distinct Node versions:", [...nodeVersions].join(", ") || "none");
console.log(
  "\nHonest read:",
  distinctKeys === 0
    ? "no verified corroboration yet."
    : distinctKeys === 1
      ? "the mechanism is corroborated by 1 independent reviewer — proves it runs off-repo, but not a cross-platform or cross-org claim."
      : platforms.size >= 2
        ? `corroborated by ${distinctKeys} independent reviewers across ${platforms.size} platforms — a genuine cross-platform portability result for the reference crypto.`
        : `corroborated by ${distinctKeys} independent reviewers, but all on the same platform — add a different OS to strengthen the portability claim.`
);
console.log(
  "Note: a real CROSS-ORG score unlock needs one institutional run, not more individuals."
);
