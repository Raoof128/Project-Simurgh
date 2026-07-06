// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R attestation builder (4R spec §5.1, §8). Motto: AnthropicSafe First,
// then ReviewerSafe. Signs canonicalJson of the full Lane A run set with the
// quarantined fixture attestation key (INSECURE_FIXTURE_ONLY, committed so the
// artifact is fully offline-reproducible). Embeds the window match census, the
// frozen non-claims / limitations / rails, the signed novelty source map, the
// constitution projection, and the contest-hook presence. Deterministic:
// Ed25519 is RFC 8032, so re-running yields identical bytes.
import crypto from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, canonicalJson } from "../../stage4m/core/canonical.mjs";
import {
  SCHEMAS,
  PCCC_NON_CLAIMS,
  PCCC_KNOWN_LIMITATIONS,
  PCCC_RAILS,
  VERIFICATION_KINDS,
} from "../constants.mjs";
import { buildWindowMatchCensus } from "../core/censusCore.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const LANE_A = join(ROOT, "docs/research/llm-shield/evidence/stage-4r/lane-a/corpus.json");
const OUTDIR = join(ROOT, "docs/research/llm-shield/evidence/stage-4r");

// Prior art whose limiting rows make the firstness claim falsifiable (§8.2).
const NOVELTY_SOURCE_MAP = {
  claim: "dependency-free DLEQ-verified private custody corroboration with a no-herd-token law",
  prior_art_limiting_rows: [
    {
      name: "Google Private Join and Compute",
      limit:
        "deployed DH-PSI, no signed attestation, no completeness commitment, no export friction",
    },
    {
      name: "Microsoft Password Monitor",
      limit: "OPRF credential checking, not custody-class corroboration",
    },
    { name: "Apple PSI", limit: "content matching, withdrawn; no recomputable evidence" },
    { name: "SCITT / in-toto", limit: "artifact notarization, no private matching" },
  ],
};

const CONSTITUTION_PROJECTION = [
  {
    clause: "cooperate on safety signals",
    mechanism: "two-operator corroboration without a linkable registry",
    check: "no_public_custody_class_digest_emitted",
  },
  {
    clause: "avoid building surveillance infrastructure",
    mechanism: "No Public Herd Token law (epoch-bound, no reusable token)",
    check: "herd_token_scan",
  },
  {
    clause: "give the affected a voice",
    mechanism: "contest-path disclosure hook",
    check: "contest_route_available",
  },
];

function slotTerminal(c) {
  if (!c.expect.green) return "ledgered_export_refusal";
  return c.publicRecord.match ? "exported_match_record" : "exported_non_match_record";
}

function main() {
  const corpus = JSON.parse(readFileSync(LANE_A, "utf8"));
  const slotLedger = corpus.cases.map((c) => ({ terminal: slotTerminal(c) }));
  const census = buildWindowMatchCensus(corpus.epoch, slotLedger);

  const caseRollup = corpus.cases.map((c) => ({
    name: c.name,
    expect: c.expect,
    public_record_digest: recordDigest(c.publicRecord),
  }));

  const body = {
    schema: SCHEMAS.ATTESTATION,
    stage: "4r",
    epoch: corpus.epoch,
    run_id: corpus.run_id,
    evidence_root_digest: recordDigest(corpus),
    window_match_census: census,
    lane_a_verification_kind: VERIFICATION_KINDS.LANE_A,
    lane_b_verification_kind: VERIFICATION_KINDS.LANE_B,
    verification_packet_kind: VERIFICATION_KINDS.PACKET,
    non_claims: [...PCCC_NON_CLAIMS],
    known_limitations: [...PCCC_KNOWN_LIMITATIONS],
    rails: [...PCCC_RAILS],
    novelty_source_map: NOVELTY_SOURCE_MAP,
    constitution_projection: CONSTITUTION_PROJECTION,
    contest_hook_fields: [
      "respondent_notice_hash",
      "contest_pointer_hash",
      "matched_against_operator_commitment",
      "contest_route_available",
    ],
    cases: caseRollup,
  };

  const key = crypto.createPrivateKey(
    readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_attestation.pem"))
  );
  const pub = crypto.createPublicKey(key).export({ type: "spki", format: "pem" });
  const signature = crypto.sign(null, Buffer.from(canonicalJson(body)), key).toString("hex");

  const attestation = {
    body,
    signature,
    public_key: pub,
    key_label: "INSECURE_FIXTURE_ONLY_attestation",
  };
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(join(OUTDIR, "pccc-attestation.json"), JSON.stringify(attestation, null, 2) + "\n");
  console.log(
    `Stage 4R attestation written: ${caseRollup.length} cases, census ${JSON.stringify(census)}`
  );
}

main();
