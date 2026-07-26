#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Lane C-adv vacuity probe (finding 5Q-F002).
//
//   node .../probeLaneCVacuity.mjs [--write]
//
// Stage 5M publishes a Lane C-adv local capture that reads:
//
//     summary: { attacks_run: 6, contained: 6, bypasses: 0 }
//
// and a non-claim sentence saying the local fuzzer "exercises EVERY attack class ... against the
// frozen verifier". This probe asks the only question that makes those numbers mean anything:
//
//     DID THE MUTATIONS ACTUALLY APPLY?
//
// It answers by replicating `applyMutations` from the 5M producer EXACTLY — same path split, same
// walk, same guard — and reporting, per attack, which mutation paths resolve against the real
// bundle and which are silently dropped. The producer's loop swallows an unresolvable path:
//
//     try { ...walk... if (o && typeof o === "object") o[last] = m.value } catch { /* skip */ }
//
// A mutation that does not apply leaves the PRISTINE bundle. The verifier then answers a question
// about the genuine artifact, and whatever it says is recorded against an attack that never
// happened. That is a pass with nothing behind it — the exact shape of F001, in a different stage.
//
// THIS PROBE IS READ-ONLY AND NEVER IMPORTS THE PRODUCER. Importing
// `stage5m/lanec/apply-local-adversary.mjs` EXECUTES it — the module is top-level with no main
// guard — and it OVERWRITES the committed capture on the way out. That is finding 5Q-F003, and it
// is why the rule is replicated here rather than reused.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const EV5M = "docs/research/llm-shield/evidence/stage-5m";
const OUT =
  "docs/research/llm-shield/evidence/stage-5q/findings/F002/mutation-application-probe.json";

/** The producer whose rule is replicated. Pinned so a change to it invalidates this probe. */
export const PRODUCER = "tools/simurgh-attestation/stage5m/lanec/apply-local-adversary.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Replicate the producer's path resolution, WITHOUT mutating.
 *
 * Returns `applied` when the producer's guard would have written, and the reason otherwise. The
 * distinction between "the parent walk failed" and "the parent is not an object" is preserved
 * because they are different defects: a wrong path versus a wrong shape.
 */
export function resolvesAgainst(bundle, path) {
  const parts = String(path).split(".");
  let node = bundle;
  for (let i = 0; i < parts.length - 1; i += 1) {
    node = node?.[parts[i]];
    if (node === undefined || node === null) {
      return { applied: false, reason: `path segment '${parts[i]}' does not exist on the bundle` };
    }
  }
  if (!node || typeof node !== "object") {
    return { applied: false, reason: "the parent of the leaf is not an object" };
  }
  const leaf = parts[parts.length - 1];
  return {
    applied: true,
    reason: Object.hasOwn(node, leaf)
      ? `overwrites the existing key '${leaf}'`
      : `creates a NEW key '${leaf}' the verifier may not read`,
  };
}

/**
 * Build the probe record.
 *
 * `claimed_steps` and `execution_records` are shaped for the `executionFabricated` premise
 * predicate (spec §4.4): a claimed step with no execution record is a step that did not run.
 */
export function probeVacuity({ bundle, generation }) {
  const attacks = generation.attacks.map((attack, index) => {
    const mutations = (attack.mutations ?? []).map((m) => ({
      path: String(m.path),
      ...resolvesAgainst(bundle, m.path),
    }));
    const applied = mutations.filter((m) => m.applied).length;
    return {
      index,
      attack: attack.attack,
      declared_mutations: mutations.length,
      applied_mutations: applied,
      // The verifier saw the untouched bundle. Whatever it returned is a fact about the genuine
      // artifact, not about this attack.
      bundle_reached_verifier_unmutated: applied === 0,
      mutations,
    };
  });

  const exercised = attacks.filter((a) => a.applied_mutations > 0);
  return {
    attacks_declared: attacks.length,
    attacks_actually_exercised: exercised.length,
    attacks_that_measured_nothing: attacks.length - exercised.length,
    // Every attack the capture counts as run.
    claimed_steps: attacks.map((a) => `attack:${a.index}`),
    // Only those whose mutations reached the bundle.
    execution_records: exercised.map((a) => `attack:${a.index}`),
    attacks,
  };
}

function main(argv) {
  const bundleBytes = readFileSync(`${EV5M}/real-laneb/laneb-bundle.json`);
  const generationBytes = readFileSync(`${EV5M}/real-lanec/lanec-local-mutations.json`);
  const captureBytes = readFileSync(`${EV5M}/real-lanec/lanec-local-capture.json`);
  const producerBytes = readFileSync(PRODUCER);

  const capture = JSON.parse(captureBytes.toString("utf8"));
  const result = probeVacuity({
    bundle: JSON.parse(bundleBytes.toString("utf8")),
    generation: JSON.parse(generationBytes.toString("utf8")),
  });

  const record = {
    schema: "simurgh.vsr.f002-vacuity-probe.v1",
    discovered_by: "stage5q_q0_attack_pack",
    corroborated_by: [],
    note:
      "Read-only. The producer's applyMutations rule is REPLICATED, never imported: importing it " +
      "runs the ceremony and overwrites the committed capture (5Q-F003).",
    producer: PRODUCER,
    producer_source_digest: sha256(producerBytes),
    inputs: {
      "real-laneb/laneb-bundle.json": sha256(bundleBytes),
      "real-lanec/lanec-local-mutations.json": sha256(generationBytes),
      "real-lanec/lanec-local-capture.json": sha256(captureBytes),
    },
    // What the published capture says, quoted from the artifact rather than paraphrased.
    published_summary: capture.summary,
    published_non_claim: capture.non_claim,
    ...result,
  };

  console.log("Stage 5Q — Lane C-adv vacuity probe (5Q-F002)");
  console.log(`  producer                     : ${PRODUCER}`);
  console.log(
    `  published summary            : attacks_run=${capture.summary.attacks_run} ` +
      `contained=${capture.summary.contained} bypasses=${capture.summary.bypasses}`
  );
  console.log(`  attacks declared             : ${record.attacks_declared}`);
  console.log(`  attacks actually exercised   : ${record.attacks_actually_exercised}`);
  console.log(`  attacks that measured nothing: ${record.attacks_that_measured_nothing}`);
  for (const a of record.attacks) {
    const mark = a.applied_mutations > 0 ? "✔" : "✗";
    console.log(
      `      ${mark} attack ${a.index}: ${a.applied_mutations}/${a.declared_mutations} applied — ${a.attack.slice(0, 62)}`
    );
    for (const m of a.mutations.filter((x) => !x.applied)) {
      console.log(`          dropped '${m.path}': ${m.reason}`);
    }
  }

  if (argv.includes("--write")) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`  written                      : ${OUT}`);
  } else {
    console.log("\n  (dry run — pass --write to emit the finding artifact)");
  }

  // Exit 0: the probe REPORTS. It is not the gate — the ledger is, and a probe that failed the
  // build would make the finding something to be removed rather than something to be recorded.
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
