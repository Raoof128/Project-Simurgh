#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — campaign runner (Tasks 15-17).
//
//   node .../runCampaign.mjs --campaign head|seam
//
// Binds every campaign to the L2 commitment before running a single pack, then records what each
// pack established. A pack that throws is `pack_errored` and lands in its OWN denominator: it
// established nothing, and folding it into either column would let a campaign's ratio improve by
// breaking more packs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { runCampaignPack, buildCampaign } from "../core/campaign.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";

async function main(argv) {
  const i = argv.indexOf("--campaign");
  const name = i >= 0 ? argv[i + 1] : null;
  if (!name) {
    console.log("usage: runCampaign.mjs --campaign head|seam");
    return 1;
  }
  const mod = await import(`../campaigns/${name}.mjs`);
  const packs = mod[`${name.toUpperCase()}_PACKS`];
  const committed = readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim();

  const results = [];
  for (const pack of packs) results.push(await runCampaignPack(pack));

  const built = buildCampaign({
    campaign_id: `campaign-${name}`,
    closureDigest: committed,
    committedClosureDigest: committed,
    results,
  });
  if (built.refused) {
    console.log(`REFUSED: ${built.refusal_reason}`);
    return 1;
  }

  console.log(`Stage 5Q campaign — ${built.record.campaign_id}`);
  console.log(`  closure digest    : ${built.record.closure_digest}`);
  for (const r of results) {
    const mark = r.is_finding ? "FINDING" : r.outcome;
    console.log(
      `    ${r.pack_id.padEnd(28)} ${mark.padEnd(24)} premise:${r.premise_established ? "yes" : "NO"}`
    );
    if (r.detail) console.log(`        ${r.detail.slice(0, 110)}`);
  }
  console.log(
    `  established       : ${built.record.packs_establishing_a_result}/${built.record.packs_run}`
  );
  console.log(`  errored           : ${built.record.packs_errored}`);
  console.log(
    `  findings          : ${built.record.findings.length}${built.record.findings.length ? ` (${built.record.findings.join(", ")})` : ""}`
  );
  console.log(`  without premise   : ${built.record.packs_without_premise.length}`);
  console.log(`  summary           : ${built.record.summary}`);

  const out = `${E}/campaigns/${name}.json`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify({ ...built.record, campaign_digest: built.campaign_digest }, null, 2)}\n`
  );
  console.log(`  written           : ${out}`);
  return 0;
}
// THE MAIN GUARD. Without it, `await import(...)` of this file RUNS it — which is finding 5Q-F003,
// the defect this stage froze against Stage 5M, committed here in our own drivers. Ten of them did
// it, and the K7 export census is what found them: it could not enumerate a module that exits
// during enumeration.
if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
