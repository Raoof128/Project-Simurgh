// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V Lane B respondent child (spec §7). Motto: AnthropicSafe First, then ReviewerSafe.
//
// A genuinely separate OS process. Reads {capsule_bundle, capsule_pubkey_pem,
// forbiddenKeyPath, forbiddenStatePath} on stdin. Generates its OWN ephemeral key,
// files a counter-capsule contesting the live capsule, and PROVES it is blind to the
// operator's private state (env keys/values + argv). Prints the result on stdout.
import crypto from "node:crypto";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildRespondentCensus } from "../core/contestCensus.mjs";
import { buildCounterCapsule } from "../core/counterCapsuleCore.mjs";

function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (buf += d));
    process.stdin.on("end", () => resolve(buf));
  });
}

const input = JSON.parse(await readStdin());
const { capsule_bundle, capsule_pubkey_pem, forbiddenKeyPath, forbiddenStatePath } = input;
const epoch = capsule_bundle.content.epoch;

// P0 #4 — real blindness proof: regex on keys (OPERATOR, OPERATOR_KEY, ... — not COOPERATOR)
// AND substring scan of env VALUES for the forbidden paths, AND argv has no .pem.
const envBlob = JSON.stringify(process.env);
const blindness = {
  env_has_operator_key_path:
    Object.keys(process.env).some((k) => /^OPERATOR(_|$)/.test(k)) ||
    (typeof forbiddenKeyPath === "string" &&
      forbiddenKeyPath.length > 0 &&
      envBlob.includes(forbiddenKeyPath)),
  env_has_operator_state_path:
    typeof forbiddenStatePath === "string" &&
    forbiddenStatePath.length > 0 &&
    envBlob.includes(forbiddenStatePath),
  argv_has_pem: process.argv.slice(2).some((a) => a.includes(".pem")),
};
if (
  blindness.env_has_operator_key_path ||
  blindness.env_has_operator_state_path ||
  blindness.argv_has_pem
) {
  process.stderr.write("respondent child: BLINDNESS VIOLATED\n");
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const privPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const pubPem = publicKey.export({ type: "spki", format: "pem" }).toString();

// Respondent evidence: its own chain artifact showing 3 participants (a genuine dispute).
const chain3 = {
  kind: "stage4s_chain_bundle",
  epoch,
  range: "2026-07-06/2026-07-06",
  participants: ["deployer-x", "deployer-y", "deployer-z"],
  recorded_verdict: 108,
};
const arts = [chain3];
const census = buildRespondentCensus({
  epoch,
  items: arts.map((a) => ({ kind: a.kind, digest: recordDigest(a), epoch })),
});

const counter_capsule = buildCounterCapsule({
  capsuleBundle: capsule_bundle,
  capsulePubKeyPem: capsule_pubkey_pem,
  contests: [
    {
      regime: "art73_high_risk_draft",
      section_id: "users_affected",
      verb: "dispute_by_recomputation",
      claimed_value: 3,
      recompute_kind: "participant_count",
      evidence_digest: recordDigest(chain3),
    },
    {
      regime: "gpai_art55",
      section_id: "root_cause_analysis",
      verb: "dispute_as_judgment",
      judgment_text_digest: recordDigest({ note: "laneb respondent judgment" }),
    },
  ],
  respondentRole: "deployer",
  respondentCensus: census,
  respondentArtifacts: arts,
  privKeyPem: privPem,
  pubKeyPem: pubPem,
});

process.stdout.write(
  JSON.stringify({ counter_capsule, respondent_pubkey_pem: pubPem, blindness }) + "\n"
);
