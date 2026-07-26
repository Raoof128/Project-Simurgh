#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Q0 finding ledger builder. L3 MADE AN ARTIFACT.
//
//   node .../buildFindingLedger.mjs [--write]
//
// Three findings are frozen here. Each one's premise receipt is RECOMPUTED against the frozen
// fixture bytes before it may enter the chain — a receipt that names a predicate and is believed is
// a label, and the whole apparatus exists to refuse labels.
//
//   5Q-F001   the shared Lean workflow type-checks 27 of 33 proof files and exits 0.
//             R7. assurance_only. Found by design review, corroborated by the harness.
//
//   5Q-F002   Stage 5M's Lane C-adv capture reports "6 attacks, 6 contained, 0 bypasses".
//             ONE of the six applied its mutations. Three carried placeholder paths
//             (`a.b.c`, `b.d.e`, `c.f.g`) that the producer silently drops; two declared no
//             mutations at all. Five verdicts describe the PRISTINE bundle.
//             R7. claim_falsifying.
//
//   5Q-F003   importing that producer REWRITES the committed capture. It is a top-level script
//             with no main guard, and any tool that enumerates modules by importing them
//             destroys the evidence as a side effect of reading it.
//             R8. claim_narrowing.
//
// F002 AND F003 CORROBORATE EACH OTHER BY DIFFERENT MECHANISMS, which is why both are recorded
// rather than merged. F002 reads the mutation file and shows the attacks cannot land; F003 runs the
// producer in a scratch worktree and observes it land 1 of 6. Neither borrows the other's method,
// so agreement between them is evidence rather than repetition.
//
// THE LEDGER IS NOT A LIST OF WHAT WE DECIDED TO REPORT. Every record here is chained, and
// `verifyChain` recomputes the chain on every build: an edited record breaks it at a named index.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { emptyLedger, appendFinding, verifyChain, ledgerDigest } from "../core/findingLedger.mjs";
import { makePremiseReceipt, verifyPremise } from "../core/premiseReceipt.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const OUT = `${E}/findings/q0-finding-ledger.json`;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (path) => readFileSync(path);

/**
 * The fixture files, keyed by digest, so `verifyPremise` reads BYTES rather than being handed an
 * object. The digest is the key on purpose: a lookup that succeeds proves the receipt named these
 * exact bytes, and a lookup that fails is a receipt pointing at something that is not here.
 */
function fixtureStore(paths) {
  const byDigest = new Map();
  for (const path of paths) {
    const bytes = read(path);
    byDigest.set(sha256(bytes), bytes);
  }
  return {
    byDigest,
    readFixture(digestHex) {
      const bytes = byDigest.get(digestHex);
      if (!bytes) throw new Error(`no fixture with digest ${digestHex}`);
      return bytes;
    },
  };
}

export function buildLedger({ closureDigest, fixtures, digests }) {
  const records = [
    {
      finding_id: "5Q-F001",
      affected_stage: "cross-stage",
      affected_function_id:
        ".github/workflows/stage-4-lean-proofs.yml:Type-check the Stage 4 formal core",
      affected_tags: [
        "v2.44.0-stage-5i-vpc",
        "v2.45.0-stage-5j-vrc",
        "v2.46.0-stage-5k-vuc",
        "v2.47.0-stage-5l-vtcq",
        "v2.48.0-stage-5m-vtc-quorum",
      ],
      attack_class: "R7",
      premise_receipt: makePremiseReceipt({
        pack_id: "5q-gate-lean-r7-01",
        closure_digest: closureDigest,
        target_function_id:
          ".github/workflows/stage-4-lean-proofs.yml:Type-check the Stage 4 formal core",
        fixture_digest: digests.f001Premise,
        predicate_id: "omitsMember",
      }),
      expected_result:
        "a gate claiming the formal core type-checks covers every .lean file under proofs/",
      observed_result:
        "the gate names 27 files by hand; 33 exist. Six are never type-checked, and the gate " +
        "exits 0 — the green says the named 27 compiled, and is read as saying the core is proved.",
      exploit_fixture_digest: digests.f001Premise,
      severity: "assurance_only",
      claim_impact: {
        file: ".github/workflows/stage-4-lean-proofs.yml",
        claim_digest: digests.leanWorkflow,
        quote: "Type-check the Stage 4 formal core (exit lattice, structuring, anti-monotonicity)",
      },
      scope: "head",
      discovered_at_commit: "41b242ad",
      discovered_by: "pre_stage_design_review",
      corroborated_by: ["5q-gate-lean-r7-01"],
    },
    {
      finding_id: "5Q-F002",
      affected_stage: "5m",
      affected_function_id:
        "tools/simurgh-attestation/stage5m/lanec/apply-local-adversary.mjs:applyMutations",
      affected_tags: ["v2.48.0-stage-5m-vtc-quorum"],
      attack_class: "R7",
      premise_receipt: makePremiseReceipt({
        pack_id: "5q-5m-lanec-r7-01",
        closure_digest: closureDigest,
        target_function_id:
          "tools/simurgh-attestation/stage5m/lanec/apply-local-adversary.mjs:applyMutations",
        fixture_digest: digests.f002Probe,
        predicate_id: "executionFabricated",
      }),
      expected_result:
        "six declared attack classes are applied to the Lane B bundle and each forgery is judged " +
        "by the frozen verifier",
      observed_result:
        "one of six applies its mutations. Three declare paths (a.b.c, a.b.d, b.d.e, c.f.g) that " +
        "resolve against nothing and are silently dropped by the producer's `catch {}`; two " +
        "declare no mutations at all. Five verdicts are the verifier's answer about the PRISTINE " +
        "bundle, recorded as containment of an attack that never reached it.",
      exploit_fixture_digest: digests.f002Probe,
      severity: "claim_falsifying",
      claim_impact: {
        file: "docs/research/llm-shield/evidence/stage-5m/real-lanec/lanec-local-capture.json",
        claim_digest: digests.capture,
        quote:
          "Local uncensored fuzzer (Llama-3.2-1B) exercises EVERY attack class — including those " +
          "a frontier model refuses — against the frozen verifier.",
      },
      scope: "both",
      discovered_at_commit: "2a2bf318",
      discovered_by: "stage5q_q0_attack_pack",
      // A different mechanism reached the same place: F003 RAN the producer and observed 1 of 6.
      corroborated_by: ["5q-5m-import-r8-01"],
    },
    {
      finding_id: "5Q-F003",
      affected_stage: "5m",
      affected_function_id:
        "tools/simurgh-attestation/stage5m/lanec/apply-local-adversary.mjs:<module-evaluation>",
      affected_tags: ["v2.48.0-stage-5m-vtc-quorum"],
      attack_class: "R8",
      premise_receipt: makePremiseReceipt({
        pack_id: "5q-5m-import-r8-01",
        closure_digest: closureDigest,
        target_function_id:
          "tools/simurgh-attestation/stage5m/lanec/apply-local-adversary.mjs:<module-evaluation>",
        fixture_digest: digests.f003Probe,
        predicate_id: "contradicts",
      }),
      expected_result: "importing a module makes its exports available and changes nothing on disk",
      observed_result:
        "a bare `await import(...)` re-runs the Lane C-adv ceremony and writeFileSync's over the " +
        "committed capture. The published file (6 contained, captured 2026-07-13) becomes a fresh " +
        "one (1 contained) with today's timestamp. This is not hypothetical: 5Q's own runtime " +
        "census did it to this branch at commit 659ef95e.",
      exploit_fixture_digest: digests.f003Probe,
      severity: "claim_narrowing",
      claim_impact: {
        file: "docs/research/llm-shield/evidence/stage-5m/real-lanec/lanec-local-capture.json",
        claim_digest: digests.capture,
        quote: '"captured_at": "2026-07-13T01:28:36.366Z"',
      },
      scope: "both",
      discovered_at_commit: "2a2bf318",
      discovered_by: "stage5q_q0_attack_pack",
      corroborated_by: [],
    },
  ];

  // EVERY RECEIPT RECOMPUTES BEFORE ITS RECORD IS APPENDED. A finding whose premise cannot be
  // recomputed is a finding nobody has to believe, and appending it first and checking later would
  // put it in the chain regardless.
  const premiseResults = [];
  for (const record of records) {
    const result = verifyPremise(record.premise_receipt, { readFixture: fixtures.readFixture });
    premiseResults.push({ finding_id: record.finding_id, ...result });
    if (!result.ok) {
      throw new Error(
        `refusing to append ${record.finding_id}: its premise did not recompute — ${result.reason}`
      );
    }
  }

  let ledger = emptyLedger();
  for (const record of records) ledger = appendFinding(ledger, record, { kind: "q0" });
  return { ledger, premiseResults };
}

function main(argv) {
  const closureDigest = readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim();

  const paths = {
    f001Premise: `${E}/findings/F001/premise.json`,
    f002Probe: `${E}/findings/F002/mutation-application-probe.json`,
    f003Probe: `${E}/findings/F003/import-write-probe.json`,
  };
  const claimPaths = {
    leanWorkflow: ".github/workflows/stage-4-lean-proofs.yml",
    capture: "docs/research/llm-shield/evidence/stage-5m/real-lanec/lanec-local-capture.json",
  };

  const digests = {};
  for (const [key, path] of Object.entries({ ...paths, ...claimPaths })) {
    digests[key] = sha256(read(path));
  }

  const fixtures = fixtureStore(Object.values(paths));
  const { ledger, premiseResults } = buildLedger({ closureDigest, fixtures, digests });

  const chain = verifyChain(ledger);
  if (!chain.ok) {
    console.log(`REFUSING: the chain does not verify — ${chain.reason}`);
    return 1;
  }

  console.log("Stage 5Q — Q0 finding ledger (L3)");
  console.log(`  closure digest   : ${closureDigest}`);
  console.log(`  records          : ${ledger.records.length}`);
  for (const r of ledger.records) {
    const p = premiseResults.find((x) => x.finding_id === r.finding_id);
    console.log(
      `      ${r.finding_id}  ${r.attack_class}  ${r.severity.padEnd(17)}  ${r.affected_stage.padEnd(11)}  premise ${p.recomputed ? "RECOMPUTED" : "declared"}`
    );
    console.log(`          ${p.reason}`);
  }
  console.log(`  chain            : verified over ${ledger.records.length} records`);
  console.log(`  head_digest      : ${ledger.head_digest}`);
  console.log(`  ledger_digest    : ${ledgerDigest(ledger)}`);

  if (argv.includes("--write")) {
    const payload = {
      schema: "simurgh.vsr.q0-finding-ledger.v1",
      note:
        "Append-only and hash-chained (L3). A record is never edited and severity is never " +
        "rewritten: escalation mints a new finding with its own id, premise receipt and claim " +
        "impact. Every premise here recomputed against the frozen fixture bytes at build time.",
      closure_digest: closureDigest,
      q0_finding_ledger_digest: ledgerDigest(ledger),
      head_digest: ledger.head_digest,
      record_count: ledger.records.length,
      premise_verification: premiseResults.map((p) => ({
        finding_id: p.finding_id,
        recomputed: p.recomputed,
        reason: p.reason,
      })),
      records: ledger.records,
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`  written          : ${OUT}`);
  } else {
    console.log("\n  (dry run — pass --write to emit the ledger)");
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
