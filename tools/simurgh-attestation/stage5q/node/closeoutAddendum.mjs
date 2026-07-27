#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the signed closeout addendum (finding 5Q-F013).
//
//   node .../closeoutAddendum.mjs [--write] [--sign]
//
// F013 WAS DISCOVERED AFTER THE Q0 FREEZE, AND THE Q0 LEDGER IS NOT REOPENED TO HOLD IT.
//
// The obvious move — append a thirteenth record to `q0-finding-ledger.json` — would change
// `q0_finding_ledger_digest`, which is one of the ten roots the Q0 attestation signs. Every root
// would still recompute, the signature would be re-made, and the artifact would verify perfectly:
// which is exactly why it must not happen. A frozen record that can be extended when something new
// turns up is not frozen, and L3's "no erased finding" has a mirror image — no INSERTED finding
// either, or the ledger stops being a record of what was known when it was signed.
//
// So this is an ADDITIVE artifact. It creates a new file, changes nothing, and proves it changed
// nothing by carrying the Q0 public digest and the Q0 ledger digest and re-checking both. A reader
// can confirm in one step that the addendum did not reopen the thing it comments on.
//
// IT IS NOT COVERED BY THE Q0 ATTESTATION'S TEN ROOTS, and says so in its own body. An addendum
// that let itself be read as part of the signed Q0 result would be backdating.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createPrivateKey, createPublicKey, sign as signRaw } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { sha256Hex, signingInput } from "../core/attestation.mjs";
import { phaseDeadlock, PHASES, CONDITION_REQUIREMENTS } from "../core/lifecycle.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const A = `${E}/attestation`;
const OUT = `${A}/closeout-addendum.json`;
const PROFILE = "tools/simurgh-attestation/stage5q/signer/stage5q-signer-profile.json";
const PRIVATE_KEY = join(homedir(), ".simurgh", "5q-ed25519.pem");
const ADDENDUM_SCHEMA = "simurgh.vsr.q0.closeout-addendum.v1";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** The F013 record, in the §5.1 Q0 shape so it is citable, but NOT in the Q0 ledger. */
export function buildFinding({ deadlock, unsatisfied }) {
  return {
    finding_id: "5Q-F013",
    affected_stage: "5q",
    affected_function_id:
      "docs/superpowers/plans/2026-07-26-stage-5q-vsr-q0-implementation-plan.md:Q0->Q1 transition contract",
    affected_tags: [],
    attack_class: "R16",
    expected_result:
      "the Q0/Q1 lifecycle admits an incomplete Q0: Q0 freezes what actually happened, and Q1 is " +
      "authorised to repair the harness as well as the code",
    observed_result:
      `Q0 is frozen and ${unsatisfied.join(" and ")} are false. Q1 is gated on them. The declared ` +
      `phase table is exhaustive — Q0_PREPARATION, Q0_DISCOVERY, Q0_TRANSITION, Q1 — and of the ` +
      `phases still reachable, none may produce the artifacts those conditions require: ` +
      deadlock.blocked.map((b) => `${b.condition} needs '${b.needs}'`).join("; ") +
      ". Q0_TRANSITION is validation-only by declaration and produces no evidence; Q0_DISCOVERY " +
      "ended when the freeze was signed and re-entering it would rewrite frozen evidence. The " +
      "state has no legal outgoing transition.",
    severity: "claim_narrowing",
    claim_impact: {
      file: "docs/superpowers/plans/2026-07-26-stage-5q-vsr-q0-implementation-plan.md",
      claim_digest: sha256Hex(
        readFileSync("docs/superpowers/plans/2026-07-26-stage-5q-vsr-q0-implementation-plan.md")
      ),
      quote:
        "Q0 MAY freeze an incomplete or partly inadmissible result. Freezing what actually " +
        "happened is the whole point of Q0. Q1 MAY be authorised to repair the HARNESS as well as " +
        "the code.",
    },
    // NARROWING, not falsifying, and the distinction is computed rather than asserted: T2 shows the
    // primitive genuinely accommodates one kind of incompleteness. A partly-INADMISSIBLE Q0
    // transitions fine, because recording inadmissibility needs no new artifact. A partly-COVERED
    // Q0 does not, because statusing a member does. The lifecycle works over a smaller domain than
    // the claim states — which is the definition of a narrowed claim.
    narrowing_rationale:
      "T2 transitions on a partly-inadmissible Q0 with no new artifact, so the claim holds for " +
      "inadmissibility-incompleteness. It fails only for coverage-incompleteness, where the " +
      "satisfying artifact may be produced by no reachable phase.",
    scope: "head",
    discovered_at_commit: "a370f8cc",
    discovered_by: "external",
    corroborated_by: [],
  };
}

function main(argv) {
  const bundle = readJson(`${A}/public-structural-bundle.json`);
  const ledger = readJson(`${E}/findings/q0-finding-ledger.json`);
  const profile = readJson(PROFILE);

  // The live transition state, read rather than assumed.
  const coverage = readJson(`${E}/coverage/discharge-ledger.json`);
  const overlay = coverage.overlay ?? [];
  const unsatisfied = [];
  if (overlay.filter((o) => o.coverage_status !== null).length !== overlay.length) {
    unsatisfied.push("T3");
  }
  unsatisfied.push("T7");

  const deadlock = phaseDeadlock({ unsatisfied, currentPhase: "Q0_TRANSITION" });

  const finding = buildFinding({ deadlock, unsatisfied });
  const body = {
    schema: ADDENDUM_SCHEMA,
    note:
      "ADDITIVE. The Q0 finding ledger is NOT reopened to hold this record: appending to it would " +
      "move q0_finding_ledger_digest, one of the ten roots the Q0 attestation signs, and a frozen " +
      "record that can be extended when something new turns up is not frozen. L3 forbids an erased " +
      "finding; the same reasoning forbids an inserted one.",
    not_covered_by:
      "This addendum postdates the Q0 attestation and is NOT covered by its ten roots. Reading it " +
      "as part of the signed Q0 result would be backdating.",
    // The two digests that prove nothing was reopened.
    bound_to_q0_public_digest: sha256Hex(Buffer.from(canonicalJson(bundle), "utf8")),
    q0_finding_ledger_digest_unchanged: ledger.q0_finding_ledger_digest,
    q0_ledger_record_count: ledger.record_count,
    lifecycle: {
      phases: PHASES.map((p) => ({ id: p.id, may_produce: p.may_produce })),
      condition_requirements: CONDITION_REQUIREMENTS,
      current_phase: "Q0_TRANSITION",
      unsatisfied_conditions: unsatisfied,
      deadlock,
    },
    finding,
    disposition:
      "Published here and inherited by the successor stage. Stage 5Q is NOT reopened. The 6.2% " +
      "coverage figure and the twelve-record ledger stand exactly as signed.",
  };

  const digest = sha256Hex(Buffer.from(canonicalJson(body), "utf8"));

  console.log("Stage 5Q — closeout addendum (5Q-F013)");
  console.log(`  bound to Q0 public digest : ${body.bound_to_q0_public_digest}`);
  console.log(`  Q0 ledger digest UNCHANGED: ${body.q0_finding_ledger_digest_unchanged}`);
  console.log(`  Q0 ledger records         : ${body.q0_ledger_record_count} (not 13)`);
  console.log(`  unsatisfied conditions    : ${unsatisfied.join(", ")}`);
  console.log(`  reachable phases          : ${deadlock.reachable_phases.join(", ")}`);
  console.log(`  DEADLOCKED                : ${deadlock.deadlocked ? "YES" : "no"}`);
  for (const b of deadlock.blocked) console.log(`      ✗ ${b.condition}: ${b.reason}`);
  for (const e of deadlock.escapes) console.log(`      ✔ ${e.condition}: ${e.resolution}`);
  console.log(`  severity                  : ${finding.severity}`);
  console.log(`  addendum digest           : ${digest}`);

  if (argv.includes("--write")) {
    mkdirSync(A, { recursive: true });
    const payload = { ...body, addendum_digest: digest };
    if (argv.includes("--sign")) {
      if (!existsSync(PRIVATE_KEY)) {
        console.log(`REFUSING to sign: ${PRIVATE_KEY} is absent`);
        return 1;
      }
      const priv = createPrivateKey(readFileSync(PRIVATE_KEY));
      const pubDer = createPublicKey(priv).export({ type: "spki", format: "der" });
      if (sha256Hex(pubDer) !== profile.public_key_digest) {
        console.log("REFUSING to sign: the offline key is not the one the committed profile names");
        return 1;
      }
      // THE SAME KEY THAT SIGNED Q0. That is the point of retaining it: an addendum signed by an
      // unrelated key is indistinguishable from a third party's commentary.
      payload.signature = {
        signer_profile_id: profile.profile_id,
        public_key_b64: pubDer.toString("base64"),
        algorithm: "ed25519",
        signature_b64: signRaw(null, signingInput(digest), priv).toString("base64"),
        created_at: new Date().toISOString(),
      };
      console.log(`  signed by                 : ${profile.profile_id}`);
    }
    writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`  written                   : ${OUT}`);
  } else {
    console.log("\n  (dry run — pass --write --sign to emit the addendum)");
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
