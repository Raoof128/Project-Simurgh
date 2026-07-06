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
      identity: block.result.reviewer_identity_self_declared || "ANONYMOUS (old-format)",
      fingerprint: block.result.reviewer_key_fingerprint || "n/a",
      challenges: new Set(),
    });
  byKey.get(key).challenges.add(block.result.challenge);
  const v = byKey.get(key);
  console.log(`  ✓ ${f}: verified — identity="${v.identity}" fingerprint=${v.fingerprint}`);
}

const distinctKeys = byKey.size;
const named = [...byKey.values()].filter((v) => !v.identity.startsWith("ANONYMOUS")).length;

console.log("\n── Corroboration summary ──");
console.log("valid blocks:", files.length - invalid, " invalid:", invalid);
console.log(
  "distinct identity keys (persistent → ≈ distinct machines, NOT provably distinct people):",
  distinctKeys
);
console.log("of which self-declare an identity you can try to confirm:", named);
console.log(
  "\nWhat this proves:",
  distinctKeys === 0
    ? "no verified runs yet."
    : `${distinctKeys} internally-consistent run(s) bound to your challenge(s), each self-verifying green off-repo.`
);
console.log("\n⚠️  TRUST CHECKLIST — before counting ANY of these as real corroboration:");
for (const v of byKey.values()) {
  console.log(
    `   [ ] confirm fingerprint ${v.fingerprint} really belongs to "${v.identity}" via a channel you trust (their email/GitHub).`
  );
}
console.log(
  "\nWhat this still does NOT prove: that the runs came from different real people, or any OS — a self-contained script cannot attest that. Genuine cross-org corroboration needs an institutional run or people you personally know."
);
