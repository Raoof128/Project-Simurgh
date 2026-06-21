// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3T CLI. Offline + deterministic: build re-derives the attestation from the
// committed synthetic set; verify re-runs the detector and byte-compares. No gateway,
// no network. Subcommands: build [--update] | hash | verify | verify-hashes.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { validateMetaSet, metaSetDigest } from "./metaSet.mjs";
import { familyMapDigest } from "./signalFamilies.mjs";
import { runDetector } from "./detector.mjs";
import { renderAttestationProse } from "./renderer.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3t";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function buildAttestation(set) {
  validateMetaSet(set);
  const result = runDetector(set);
  const prose = renderAttestationProse(result);
  return {
    schema: "simurgh.capability_extraction.attestation.v1",
    detector_id: result.detector_id,
    family_map_digest: familyMapDigest(),
    meta_set_digest: result.meta_set_digest,
    matched: result.matched,
    matched_families: result.matched_families,
    distinct_family_count: result.distinct_family_count,
    decision: result.decision,
    attestation_claim: result.attestation_claim,
    non_claims: result.non_claims,
    rendered_summary: prose.rendered_summary,
    intent_claim_made: prose.intent_claim_made,
  };
}

export async function deriveForVerify() {
  const set = await rd("meta-set/metadata-set.json");
  const attestation = buildAttestation(set);
  const result = {
    type: "simurgh.capability_extraction.detector_result.v1",
    detector_id: attestation.detector_id,
    meta_set_digest: attestation.meta_set_digest,
    matched: attestation.matched,
    matched_families: attestation.matched_families,
    distinct_family_count: attestation.distinct_family_count,
    decision: attestation.decision,
    attestation_claim: attestation.attestation_claim,
    non_claims: attestation.non_claims,
  };
  return { set, attestation, result };
}

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile() && !p.endsWith("evidence-hashes.json")) out.push(p);
  }
  return out;
}

async function writeEvidenceHashes() {
  const files = (await walk(EV)).sort();
  const map = {};
  for (const f of files) map[f] = sha256Hex(await readFile(f, "utf8"));
  await writeFile(join(EV, "evidence-hashes.json"), stable(map));
}

async function main() {
  const cmd = process.argv[2];
  const update = process.argv.includes("--update");
  if (cmd === "build") {
    const { attestation, result } = await deriveForVerify();
    const cfg = await rd("meta-set/detector-config.json");
    cfg.family_map_digest = familyMapDigest();
    if (update) {
      await writeFile(join(EV, "meta-set/detector-config.json"), stable(cfg));
      await writeFile(join(EV, "result/expected-detector-result.json"), stable(result));
      await writeFile(join(EV, "result/attestation.json"), stable(attestation));
      console.log("stage3t: evidence written (update; run prettier then `write-hashes`)");
      return;
    }
    const committed = await rd("result/attestation.json");
    if (stable(committed) !== stable(attestation))
      throw new Error("attestation drifted from committed set");
    const cr = await rd("result/expected-detector-result.json");
    if (stable(cr) !== stable(result))
      throw new Error("detector result drifted from committed set");
    console.log("stage3t evidence: verified committed");
  } else if (cmd === "hash") {
    const { set, attestation } = await deriveForVerify();
    console.log("meta_set_digest:", metaSetDigest(set));
    console.log("family_map_digest:", attestation.family_map_digest);
  } else if (cmd === "verify") {
    const { result } = await deriveForVerify();
    const cr = await rd("result/expected-detector-result.json");
    if (stable(cr) !== stable(result)) throw new Error("detector result reproduction mismatch");
    console.log("stage3t: detector reproduces committed result");
  } else if (cmd === "write-hashes") {
    // Compute evidence-hashes.json over the FINAL on-disk bytes — run AFTER prettier so
    // the committed files (which prettier may reformat, e.g. collapsing short arrays)
    // hash to their committed form. build/verify compare via stable() so they are
    // format-agnostic; only this byte-hash manifest cares about on-disk formatting.
    await writeEvidenceHashes();
    console.log("stage3t: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map)) {
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    }
    console.log("stage3t: evidence hashes match");
  } else {
    console.error(
      "usage: simurgh-extraction.mjs build [--update] | hash | verify | write-hashes | verify-hashes"
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("stage3t CLI:", e.message);
    process.exit(1);
  });
}
