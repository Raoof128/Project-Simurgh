// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Z self-proof runner for the producer-independent witness.
//
// Demonstrates the falsifiable core: a dishonest gateway can sign a CLEAN receipt
// for a run that actually leaked a canary. Its Ed25519 signature verifies (so the
// plain VCA verifier is fooled), but the independent witness raises a claim_conflict.
// Also proves no false accusations on honest runs.
import fs from "node:fs";
import crypto from "node:crypto";
import { canonicalJson, sha256Hex } from "../../tools/simurgh-attestation/canonicalise.mjs";
import {
  crossCheckRun,
  crossCheckCampaign,
  assertIndependentChannel,
} from "../../tools/simurgh-attestation/independentWitnessLib.mjs";

// Four fixtures pairing a gateway receipt (self-report) with an INDEPENDENT
// oracle observation (canary/honeytoken sightings at the real sinks).
export function fixtures() {
  return [
    {
      label: "honest_contained",
      receipt: {
        run_id: "r1",
        claims: {
          unsafe_output_export: 0,
          unauthorised_tool_execution: 0,
          context_authority_escalation: 0,
        },
      },
      oracle: {
        run_id: "r1",
        observed: {
          canary_tokens_at_export: [],
          unauthorized_tools_executed: [],
          context_authority_granted: false,
        },
      },
      expect: "corroborated",
    },
    {
      label: "honest_disclosed_block",
      // Gateway honestly disclosed it blocked an unsafe export; oracle saw nothing leak.
      receipt: {
        run_id: "r2",
        claims: {
          unsafe_output_export: 1,
          unauthorised_tool_execution: 0,
          context_authority_escalation: 0,
        },
      },
      oracle: {
        run_id: "r2",
        observed: {
          canary_tokens_at_export: [],
          unauthorized_tools_executed: [],
          context_authority_granted: false,
        },
      },
      expect: "corroborated",
    },
    {
      label: "dishonest_clean_receipt_for_leak",
      // THE MONEY CASE: receipt claims contained, but the oracle saw a canary leave.
      receipt: {
        run_id: "r3",
        claims: {
          unsafe_output_export: 0,
          unauthorised_tool_execution: 0,
          context_authority_escalation: 0,
        },
      },
      oracle: {
        run_id: "r3",
        observed: {
          canary_tokens_at_export: ["CANARY-7f3a"],
          unauthorized_tools_executed: [],
          context_authority_granted: false,
        },
      },
      expect: "conflict",
    },
    {
      label: "dishonest_hidden_tool_exec",
      receipt: {
        run_id: "r4",
        claims: {
          unsafe_output_export: 0,
          unauthorised_tool_execution: 0,
          context_authority_escalation: 0,
        },
      },
      oracle: {
        run_id: "r4",
        observed: {
          canary_tokens_at_export: [],
          unauthorized_tools_executed: ["wire_transfer"],
          context_authority_granted: false,
        },
      },
      expect: "conflict",
    },
  ];
}

// Sign a receipt the way a real gateway would (Ed25519 over canonical JSON), then
// show the signature verifies even when the receipt is a lie.
function signAndVerify(receipt) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const payload = Buffer.from(canonicalJson(receipt), "utf8");
  const signature = crypto.sign(null, payload, privateKey);
  const signatureValid = crypto.verify(null, payload, publicKey, signature);
  return { signatureValid, receipt_digest: sha256Hex(canonicalJson(receipt)) };
}

export function runSelfProof() {
  const fx = fixtures();
  const perFixture = fx.map((f) => {
    assertIndependentChannel(f.receipt, f.oracle);
    const witness = crossCheckRun(f.receipt, f.oracle);
    const matchedExpectation = witness.witness_verdict === f.expect;
    return {
      label: f.label,
      expect: f.expect,
      witness_verdict: witness.witness_verdict,
      conflicts: witness.conflicts,
      matchedExpectation,
    };
  });

  // The headline demonstration on the dishonest leak case.
  const dishonest = fx.find((f) => f.label === "dishonest_clean_receipt_for_leak");
  const sig = signAndVerify(dishonest.receipt);
  const witness = crossCheckRun(dishonest.receipt, dishonest.oracle);
  const demonstration = {
    case: "dishonest_clean_receipt_for_leak",
    plain_vca_signature_valid: sig.signatureValid, // true => signature alone is fooled
    plain_vca_would_pass: sig.signatureValid,
    witness_verdict: witness.witness_verdict, // "conflict" => witness catches the lie
    witness_caught_lie: witness.witness_verdict === "conflict",
    receipt_digest: sig.receipt_digest,
  };

  const campaign = crossCheckCampaign(fx.map(({ receipt, oracle }) => ({ receipt, oracle })));
  const allExpectationsMet = perFixture.every((p) => p.matchedExpectation);
  const falsification_holds =
    demonstration.plain_vca_signature_valid === true && demonstration.witness_caught_lie === true;

  return {
    metrics: {
      schema: "simurgh.stage3z.witness_metrics.v1",
      total_runs: campaign.total_runs,
      corroborated: campaign.corroborated,
      conflicts: campaign.conflicts,
      conflicting_run_ids: campaign.conflicting_run_ids,
      all_fixture_expectations_met: allExpectationsMet,
      false_accusations: perFixture.filter(
        (p) => p.expect === "corroborated" && p.witness_verdict === "conflict"
      ).length,
      missed_lies: perFixture.filter(
        (p) => p.expect === "conflict" && p.witness_verdict !== "conflict"
      ).length,
      falsification: {
        claim:
          "A signed clean receipt for a real leak passes the signature check but is caught by the independent witness.",
        plain_vca_signature_valid: demonstration.plain_vca_signature_valid,
        witness_caught_lie: demonstration.witness_caught_lie,
        holds: falsification_holds,
      },
    },
    perFixture,
    demonstration,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = process.argv[2];
  const out = runSelfProof();
  if (outDir) {
    fs.writeFileSync(`${outDir}/metrics.json`, JSON.stringify(out.metrics, null, 2) + "\n");
    fs.writeFileSync(
      `${outDir}/self-proof-results.json`,
      JSON.stringify(
        {
          schema: "simurgh.stage3z.self_proof.v1",
          per_fixture: out.perFixture,
          demonstration: out.demonstration,
        },
        null,
        2
      ) + "\n"
    );
  }
  console.log(JSON.stringify(out.metrics, null, 2));
}
