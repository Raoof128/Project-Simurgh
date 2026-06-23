// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3W runner. Offline + deterministic. Builds the offline in-toto release-witness bundle and
// the deterministic CI witness-verdict file, writes metadata-only evidence, re-verifies byte-stable.
// write-hashes runs AFTER prettier and EXCLUDES evidence-hashes.json itself (no online Sigstore
// object is ever hashed — offline verification must not depend on the online layer).
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "./canonicalise.mjs";
import {
  buildWitnessVerdict,
  buildReleaseWitnessStatement,
  computeStage3vbSubjects,
} from "./stage3wWitnessLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function buildWitnessVerdictFile() {
  return buildWitnessVerdict();
}

export function buildBundle() {
  const subjects = computeStage3vbSubjects();
  const witnessVerdictDigest = sha256Hex(stable(buildWitnessVerdictFile()));
  return buildReleaseWitnessStatement(subjects, witnessVerdictDigest);
}

export function buildProvenance() {
  return {
    schema: "simurgh.stage3w.provenance.v1",
    witnessed_stage: "3V-B",
    witnessed_tag: "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
    witnessed_commit: "b645d80",
    offline_root: "simurgh_ed25519",
    online_root: "github_oidc_sigstore",
    corroboration: "digest_equality_no_signature_nesting",
    sigstore_required_for_offline_verification: false,
  };
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
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
  const bundle = buildBundle();
  const verdict = buildWitnessVerdictFile();
  if (cmd === "build") {
    if (update) {
      await writeFile(join(EV, "github-witness-verdict.json"), stable(verdict));
      await writeFile(join(EV, "provenance.json"), stable(buildProvenance()));
      await writeFile(join(EV, "attestation.bundle.json"), stable(bundle));
      console.log("stage3w: evidence written (update; run prettier then sign + write-hashes)");
      return;
    }
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle drifted");
    if (stable(await rd("github-witness-verdict.json")) !== stable(verdict))
      throw new Error("witness-verdict drifted");
    console.log("stage3w evidence: verified committed");
  } else if (cmd === "hash") {
    console.log(
      JSON.stringify(
        {
          witness_verdict_sha256: sha256Hex(stable(verdict)),
          bundle_sha256: sha256Hex(canonicalJson(bundle)),
        },
        null,
        2
      )
    );
  } else if (cmd === "verify") {
    if (stable(await rd("attestation.bundle.json")) !== stable(bundle))
      throw new Error("bundle reproduction mismatch");
    if (stable(await rd("github-witness-verdict.json")) !== stable(verdict))
      throw new Error("witness-verdict reproduction mismatch");
    console.log("stage3w: bundle + witness-verdict reproduce");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3w: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map))
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    console.log("stage3w: evidence hashes match");
  } else {
    console.error("usage: build [--update] | hash | verify | write-hashes | verify-hashes");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3w runner:", e.message);
    process.exit(1);
  });
