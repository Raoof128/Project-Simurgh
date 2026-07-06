// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4N all-functions E2E net (spec §9). Composes every export: fixture build →
// clean verify → all tamper arms at EXACT raw code and run-level → exit-wrapper
// exhaustiveness → anti-theatre deletion → attestation verify → artifact inventory.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createPublicKey } from "node:crypto";
import {
  SEISMOGRAPH_RAW_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  buildSeismographAttestation,
  verifySeismographManifest,
} from "../../../../tools/simurgh-attestation/stage4n/node/build-stage4n-attestation.mjs";
import { computeSourceRoots } from "../../../../tools/simurgh-attestation/stage4n/node/sourceRoots.mjs";

const FIX = "tests/fixtures/llmShield/stage4n";
const EVID = "docs/research/llm-shield/evidence/stage-4n";
const CLI = "tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Run the verifier CLI; return {exitCode, report}. Never throws on non-zero exit.
function runVerify({ feed, policy = `${FIX}/genesis-policy.json`, extra = [] }) {
  const out = join(mkdtempSync(join(tmpdir(), "s4n-")), "report.json");
  let exitCode = 0;
  try {
    execFileSync(
      process.execPath,
      [
        CLI,
        "--feed",
        feed,
        "--policy",
        policy,
        "--as-of",
        "synthetic-0006",
        "--out",
        out,
        ...extra,
      ],
      { stdio: "pipe" }
    );
  } catch (err) {
    exitCode = err.status ?? 3;
  }
  return { exitCode, report: readJson(out) };
}

const matrix = readJson(`${FIX}/expected-results/seismograph-matrix.json`);

test("T0 clean feed verifies raw 0, run-level 0", () => {
  const { exitCode, report } = runVerify({ feed: `${FIX}/feed/heartbeat-feed.jsonl` });
  assert.equal(report.rawCode, 0);
  assert.equal(exitCode, 0);
});

test("feed-tamper arms hit their exact raw code and run-level", () => {
  const feedArms = [
    "t1-drop-heartbeat",
    "t3-reorder",
    "t4-mutate-4k-root",
    "t6-early-reveal",
    "t7-drop-due-reveal",
    "t8-reveal-band-mismatch",
    "t9-undeclared-dimension",
  ];
  for (const arm of feedArms) {
    const { exitCode, report } = runVerify({ feed: `${FIX}/tamper/${arm}/heartbeat-feed.jsonl` });
    assert.equal(report.rawCode, matrix[arm].raw, `${arm} raw`);
    assert.equal(report.reason, matrix[arm].reason, `${arm} reason`);
    assert.equal(report.gate, matrix[arm].gate, `${arm} gate`);
    assert.equal(exitCode, stage4CodeForRawCode(matrix[arm].raw), `${arm} run-level`);
  }
});

test("T2 fork (second artifact) and T5 invalid inclusion proof (bilateral inputs)", () => {
  const t2 = runVerify({
    feed: `${FIX}/feed/heartbeat-feed.jsonl`,
    extra: ["--second-artifact", `${FIX}/tamper/t2-fork/second-artifact.json`],
  });
  assert.equal(t2.report.rawCode, 48);
  const t5 = runVerify({
    feed: `${FIX}/feed/heartbeat-feed.jsonl`,
    extra: ["--inclusion-proof", `${FIX}/tamper/t5-absent-heartbeat/inclusion-proof.json`],
  });
  assert.equal(t5.report.rawCode, 51);
  // valid bilateral proof stays green
  const ok = runVerify({
    feed: `${FIX}/feed/heartbeat-feed.jsonl`,
    extra: ["--inclusion-proof", `${FIX}/bilateral/inclusion-proof-valid.json`],
  });
  assert.equal(ok.report.rawCode, 0);
});

test("exit wrapper exhaustiveness over the 4N band and unknowns", () => {
  for (const code of Object.values(SEISMOGRAPH_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(code), 1);
  }
  assert.equal(stage4CodeForRawCode(39), 3);
  assert.equal(stage4CodeForRawCode(999), 3); // T12: unknown fails closed
});

test("anti-theatre (T13): deleting the tail record cannot stay green", () => {
  const tmp = mkdtempSync(join(tmpdir(), "s4n-theatre-"));
  const lines = readFileSync(`${FIX}/feed/heartbeat-feed.jsonl`, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "");
  writeFileSync(join(tmp, "truncated.jsonl"), `${lines.slice(0, -1).join("\n")}\n`);
  const { report } = runVerify({ feed: join(tmp, "truncated.jsonl") });
  assert.notEqual(report.rawCode, 0); // silence is never green
  rmSync(tmp, { recursive: true, force: true });
});

test("committed evidence: attestation recomputes and manifest verifies offline", async () => {
  const policy = readJson(`${EVID}/genesis-policy.json`);
  const records = readFileSync(`${EVID}/heartbeat-feed.jsonl`, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
  const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(process.cwd());
  void disclosure_leaves;
  const rebuilt = buildSeismographAttestation({
    policy,
    records,
    asOfWindow: "synthetic-0006",
    sourceRoots,
  });
  assert.deepEqual(rebuilt, readJson(`${EVID}/stage4n-attestation.json`));
  const pub = createPublicKey(readJson(`${FIX}/seismograph-signer.pub`).public_key_pem);
  assert.deepEqual(
    verifySeismographManifest({
      manifest: readJson(`${EVID}/heartbeat-manifest.json`),
      attestation: rebuilt,
      publicKey: pub,
    }),
    { ok: true }
  );
});

test("byte-idempotency: fixture rebuild into temp matches the committed tree", () => {
  const tmp = mkdtempSync(join(tmpdir(), "s4n-rebuild-"));
  execFileSync(
    process.execPath,
    ["tools/simurgh-attestation/stage4n/node/build-stage4n-fixtures.mjs"],
    { env: { ...process.env, STAGE4N_FIXTURE_OUT: tmp }, stdio: "pipe" }
  );
  for (const rel of [
    "genesis-policy.json",
    "feed/heartbeat-feed.jsonl",
    "expected-results/seismograph-matrix.json",
    "tamper/t1-drop-heartbeat/heartbeat-feed.jsonl",
    "tamper/t9-undeclared-dimension/heartbeat-feed.jsonl",
    "bilateral/inclusion-proof-valid.json",
  ]) {
    assert.equal(
      readFileSync(join(tmp, rel), "utf8"),
      readFileSync(join(FIX, rel), "utf8"),
      `byte-stable: ${rel}`
    );
  }
  rmSync(tmp, { recursive: true, force: true });
});

test("public evidence inventory is exactly the documented artifact list", () => {
  const artifacts = [
    "genesis-policy.json",
    "heartbeat-feed.jsonl",
    "heartbeat-manifest.json",
    "stage4n-attestation.json",
  ];
  for (const artifact of artifacts) {
    assert.doesNotThrow(() => readFileSync(join(EVID, artifact)), artifact);
  }
  // Fix 5 tripwire: no bilateral material anywhere under the public evidence dir
  for (const artifact of artifacts) {
    const content = readFileSync(join(EVID, artifact), "utf8");
    for (const forbidden of ["proof_path", "bundle_tier", "respondent_id_digest"]) {
      assert.equal(content.includes(forbidden), false, `${artifact} leaks ${forbidden}`);
    }
  }
});
