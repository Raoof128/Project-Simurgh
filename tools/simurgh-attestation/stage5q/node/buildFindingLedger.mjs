#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Q0 finding ledger builder. L3 MADE AN ARTIFACT.
//
//   node .../buildFindingLedger.mjs [--write]
//
// Every finding's premise receipt is RECOMPUTED against the frozen fixture bytes before it may
// enter the chain — a receipt that names a predicate and is believed is a label, and the whole
// apparatus exists to refuse labels.
//
// Three findings are written out below by hand. The rest are appended mechanically from the attack
// packs, because there are nine of them today and a ledger whose entries must be typed out is a
// ledger that stops being appended to.
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
//   5Q-F004+  from the attack packs. Eight exported constants across 5C, 5D, 5O and 5P are frozen
//             at the top level only, so any importer can write into the nested data — including
//             5O's authority descriptors (115 writable nodes) and 5P's pinned Rekor trust root.
//             One function mutates the object its caller handed it. All R8.
//
// F002 AND F003 CORROBORATE EACH OTHER BY DIFFERENT MECHANISMS, which is why both are recorded
// rather than merged. F002 reads the mutation file and shows the attacks cannot land; F003 runs the
// producer in a scratch worktree and observes it land 1 of 6. Neither borrows the other's method,
// so agreement between them is evidence rather than repetition.
//
// THE LEDGER IS NOT A LIST OF WHAT WE DECIDED TO REPORT. Every record here is chained, and
// `verifyChain` recomputes the chain on every build: an edited record breaks it at a named index.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { emptyLedger, appendFinding, verifyChain, ledgerDigest } from "../core/findingLedger.mjs";
import { makePremiseReceipt, verifyPremise } from "../core/premiseReceipt.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";

/**
 * The digest of `.github/workflows/stage-4-lean-proofs.yml` AS IT STOOD AT Q0, which the frozen
 * ledger committed as F001's `claim_impact.claim_digest`. Pinned here so the Q0 capture verifies
 * against the record rather than the other way round.
 */
const F001_CLAIM_DIGEST_AT_Q0 = "0ff612ac48ea0d7fffa5e6db19fa88e22ac19f1b2bf31cdcf292363caf6e6e9b";

/**
 * The Q0 capture lives OUTSIDE `evidence/stage-5q/`, in a sibling Q1 directory. Stage 5R gates on
 * `git status --porcelain` across the whole inherited 5Q evidence tree, so adding even an untracked
 * subdirectory there fails a shipped stage's reproduce — measured, not predicted. Q1 evidence is
 * not Q0 evidence, and the directory boundary now says so.
 */
const Q1_WORKFLOW_CAPTURE = "docs/research/llm-shield/evidence/stage-5q-q1/f001-workflow-at-q0.yml";
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

/**
 * How each probe family's finding is stated, and which closed-registry predicate recomputes it.
 *
 * The predicate registry is CLOSED (spec §4.4), so a family that cannot be expressed through one of
 * the fifteen does not get a finding record — it gets left out and said so. Both families here map
 * honestly rather than by contortion:
 *
 *   frozen-constant    `omitsMember`. `Object.freeze(X)` is a COMPLETENESS CLAIM over the object
 *                      graph under X. A shallow freeze covers part of its universe, and the
 *                      difference between `universe` and `produced` IS the finding.
 *
 *   argument-aliasing  `contradicts`. One subject — the caller's object — read twice either side
 *                      of a single call, with conflicting values. The verifier recomputes the
 *                      contradiction without calling anything.
 */
const FAMILY_FINDING_SHAPE = Object.freeze({
  "frozen-constant": {
    predicate_id: "omitsMember",
    severity: "claim_narrowing",
    expected_result:
      "an exported constant presented as fixed is immutable through every path an importer can reach",
    quote_prefix: "Object.freeze over",
    observed: (d) =>
      `Object.freeze covers ${d.premise_fixture.produced.length} of ` +
      `${d.premise_fixture.universe.length} reachable node(s). The rest are writable by any module ` +
      `that imports it, so a value the code treats as pinned is shared mutable state.`,
  },
  "argument-aliasing": {
    predicate_id: "contradicts",
    severity: "claim_narrowing",
    expected_result: "a function does not mutate the object its caller handed it",
    quote_prefix: "the caller's object before",
    observed: (d) =>
      `the argument's serialisation changed across a single call: ${String(d.detail).slice(0, 120)}`,
  },
});

/** Build one Q0 record per pack finding. Deterministic order: by function id, then class. */
export function packFindingRecords({ closureDigest, packFindings, fixtures }) {
  const ordered = [...packFindings].sort((a, b) =>
    a.function_id === b.function_id
      ? a.attack_class.localeCompare(b.attack_class)
      : a.function_id.localeCompare(b.function_id)
  );
  const records = [];
  let next = 4;
  for (const d of ordered) {
    const shape = FAMILY_FINDING_SHAPE[d.family_id];
    if (!shape || !d.premise_fixture) continue;
    const fixtureBytes = Buffer.from(JSON.stringify(d.premise_fixture), "utf8");
    const fixtureDigest = sha256(fixtureBytes);
    fixtures.byDigest.set(fixtureDigest, fixtureBytes);
    const [stageId, modulePath] = d.function_id.split(":");
    records.push({
      finding_id: `5Q-F${String(next).padStart(3, "0")}`,
      affected_stage: stageId,
      affected_function_id: d.function_id,
      affected_tags: [],
      attack_class: d.attack_class,
      premise_receipt: makePremiseReceipt({
        pack_id: d.pack_id,
        closure_digest: closureDigest,
        target_function_id: d.function_id,
        fixture_digest: fixtureDigest,
        predicate_id: shape.predicate_id,
      }),
      expected_result: shape.expected_result,
      observed_result: shape.observed(d),
      exploit_fixture_digest: fixtureDigest,
      severity: shape.severity,
      claim_impact: {
        file: modulePath,
        claim_digest: sha256(read(modulePath)),
        quote: `${shape.quote_prefix} ${d.function_id.split(":").pop()}`,
      },
      scope: "head",
      discovered_at_commit: "5e658298",
      discovered_by: "stage5q_q0_attack_pack",
      corroborated_by: [],
    });
    next += 1;
  }
  return records;
}

export function buildLedger({ closureDigest, fixtures, digests, packFindings = [] }) {
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

  // The pack findings, appended AFTER the three hand-written ones and in a deterministic order.
  // Written by a loop rather than by hand because there are nine of them and there will be more:
  // a ledger whose entries must be typed out is a ledger that stops being appended to.
  records.push(...packFindingRecords({ closureDigest, packFindings, fixtures }));

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
    // Q1-F001. This used to read the LIVE workflow. It cannot: F001's claim is a statement about
    // the bytes as they stood at Q0, and Q1 repaired those bytes. A ledger whose premises recompute
    // against the current tree becomes unreproducible the moment one of its findings is FIXED —
    // the ledger would punish the repair it exists to demand. So the claim is recomputed against a
    // capture of the Q0 bytes, and the capture is not trusted: its digest must equal the value the
    // frozen ledger already committed, or this builder refuses to run.
    leanWorkflow: Q1_WORKFLOW_CAPTURE,
    capture: "docs/research/llm-shield/evidence/stage-5m/real-lanec/lanec-local-capture.json",
  };

  const digests = {};
  for (const [key, path] of Object.entries({ ...paths, ...claimPaths })) {
    digests[key] = sha256(read(path));
  }

  if (digests.leanWorkflow !== F001_CLAIM_DIGEST_AT_Q0) {
    console.log(
      `REFUSING: ${claimPaths.leanWorkflow} hashes to ${digests.leanWorkflow}, but F001's frozen ` +
        `claim_digest is ${F001_CLAIM_DIGEST_AT_Q0}. The Q0 capture has been altered, and a ` +
        `finding recomputed against altered evidence is not a finding.`
    );
    return 1;
  }

  const fixtures = fixtureStore(Object.values(paths));
  const packPath = `${E}/packs/all-pack-results.json`;
  const packFindings = existsSync(packPath)
    ? JSON.parse(readFileSync(packPath, "utf8")).discharges.filter(
        (d) => d.discharge_status === "finding_frozen"
      )
    : [];
  const { ledger, premiseResults } = buildLedger({
    closureDigest,
    fixtures,
    digests,
    packFindings,
  });

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
