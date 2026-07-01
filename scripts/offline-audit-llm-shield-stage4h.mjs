#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { digest } from "../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";
import {
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { runOffline } from "../tools/simurgh-attestation/stage4h/offlineHarness.mjs";
import { privacyGate } from "../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import {
  buildCleanTamperContext,
  buildTamperMatrix,
} from "../tools/simurgh-attestation/stage4h/tamperClosure.mjs";

const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";
const fixtureRoot = "tests/fixtures/llmShield/stage4h";
const deniedSurfaces = Object.freeze([
  "fetch",
  "http",
  "https",
  "net",
  "tls",
  "dns",
  "dns-promises",
  "dgram",
  "child_process",
]);

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJson(nested)])
    );
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

async function stable(value) {
  const json = canonicalJson(value);
  try {
    const prettier = await import("prettier");
    return await prettier.format(json, { parser: "json" });
  } catch {
    return json;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await stable(value));
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function runEgressDouble(surface) {
  return runOffline(async () => {
    const { attemptEgress } =
      await import("../tests/fixtures/llmShield/stage4h/offline/egress-double.mjs");
    return attemptEgress(surface);
  });
}

export async function buildOfflineReport() {
  const clean = await runOffline(async () => buildTamperMatrix(buildCleanTamperContext()));
  const egressEntries = [];
  for (const surface of deniedSurfaces) {
    egressEntries.push([surface, await runEgressDouble(surface)]);
  }
  const egressResults = Object.fromEntries(egressEntries);
  const q7CleanPath = `${fixtureRoot}/privacy/q7-clean-certificate.json`;
  const q7Clean = JSON.parse(await readFile(q7CleanPath, "utf8"));
  const q7 = await runOffline(async () => privacyGate(q7Clean));
  const egressDoubleCaught = deniedSurfaces.every((surface) => egressResults[surface].code === 28);
  return {
    stage: "4H.5",
    gate: "Q3",
    denied_surfaces: deniedSurfaces,
    clean_run_hits: clean.hits.length + q7.hits.length,
    q7_clean_fixture: q7CleanPath,
    egress_double_caught: egressDoubleCaught,
    egress_double_raw_code: egressResults.fetch.code,
    egress_double_reason: egressResults.fetch.reason,
    egress_double_results: Object.fromEntries(
      Object.entries(egressResults).map(([surface, result]) => [
        surface,
        { code: result.code, reason: result.reason },
      ])
    ),
    q3_status:
      clean.hits.length === 0 && q7.hits.length === 0 && egressDoubleCaught ? "pass" : "fail",
    run_level_exit: clean.hits.length === 0 && q7.hits.length === 0 && egressDoubleCaught ? 0 : 2,
  };
}

export function buildHermeticityAttestation(offlineReport) {
  return {
    stage: "4H.5",
    gate: "Q3",
    clean_run_hits: offlineReport.clean_run_hits,
    egress_double_caught: offlineReport.egress_double_caught,
    egress_double_raw_code: offlineReport.egress_double_raw_code,
    denied_surfaces: offlineReport.denied_surfaces,
    node_major: Number(process.versions.node.split(".")[0]),
  };
}

export async function main() {
  const offlineReport = await buildOfflineReport();
  const attestation = buildHermeticityAttestation(offlineReport);
  const hermeticityAttestationDigest = digest(attestation);
  const offlineReportWithDigest = {
    ...offlineReport,
    hermeticity_attestation_digest: hermeticityAttestationDigest,
  };
  const exitMap = {
    stage: "4H.5",
    run_level_by_raw: RUN_LEVEL_BY_RAW,
    unknown_raw_maps_to: stage4CodeForRawCode(999),
  };
  await writeJson(`${evidenceRoot}/offline-report.json`, offlineReportWithDigest);
  await writeJson(`${evidenceRoot}/hermeticity-attestation.json`, attestation);
  await writeJson(`${evidenceRoot}/exit-map.json`, exitMap);
  await writeJson(`${fixtureRoot}/expected-results/offline-matrix.json`, offlineReportWithDigest);
  await writeJson(`${fixtureRoot}/expected-results/exit-map.json`, exitMap);
  const qGatePath = `${evidenceRoot}/q-gate-results.json`;
  const qGate = await readJson(qGatePath);
  qGate.stage = "4H.5";
  qGate.status = "final_4h_closeout";
  qGate.gates.Q3 = {
    status: offlineReport.q3_status,
    clean_run_hits: offlineReport.clean_run_hits,
    egress_double_caught: offlineReport.egress_double_caught,
    egress_double_raw_code: offlineReport.egress_double_raw_code,
  };
  await writeJson(qGatePath, qGate);
  if (offlineReport.q3_status !== "pass") {
    process.exit(stage4CodeForRawCode(28));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h offline audit: ${error.message}`);
    process.exit(stage4CodeForRawCode(29));
  });
}
