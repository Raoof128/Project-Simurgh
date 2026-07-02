// SPDX-License-Identifier: AGPL-3.0-or-later
// Comprehensive Stage 4J E2E: exercises EVERY function of the stage — all P-gates P0-P8 via
// the committed fixture matrix (including the P4-pre 4H-band surface and the P8 substrate),
// the CLI + offline pre-flight + evidence emission, the signature-enforced digest-space
// carve-out, the anti-theatre deletion falsifier, and the byte-stable regeneration golden.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runPctaCore } from "../../../tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs";
import { stage4CodeForRawCode } from "../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const FX = "tests/fixtures/llmShield/stage4j";
const PUB = `${FX}/pcta-signer.pub`;
const MATRIX = JSON.parse(readFileSync(`${FX}/expected-results/pcta-matrix.json`, "utf8"));

test("E2E: every P-gate P0-P8 produces its mapped raw + typed exit (10-row matrix)", async () => {
  assert.equal(Object.keys(MATRIX).length, 10, "matrix must carry all ten rows");
  for (const [name, expected] of Object.entries(MATRIX)) {
    const { rawCode } = await runPctaCore({ fixture: `${FX}/${name}.json`, pinnedPubkeyPath: PUB });
    assert.equal(rawCode, expected.raw, `${name} raw`);
    assert.equal(stage4CodeForRawCode(rawCode), expected.typed, `${name} typed`);
  }
});

test("E2E: mandatory 4H re-verify surfaces the 4H band code (24), not a PCTA code", async () => {
  // dirty-cert-reverify binds to the q4 cert with a REAL safe:false sink: the re-verify
  // (P4-pre) must catch it as explicit_flow_integrity_violation before any PCTA gate.
  const r = await runPctaCore({ fixture: `${FX}/dirty-cert-reverify.json`, pinnedPubkeyPath: PUB });
  assert.equal(r.rawCode, 24);
  assert.match(r.reason, /^dfi_reverify_failed:/);
  assert.equal(stage4CodeForRawCode(r.rawCode), 1);
});

test("E2E: P8 fires 38 on its own signed substrate that PASSES the 4H re-verify", async () => {
  const r = await runPctaCore({ fixture: `${FX}/sink-underdeclared.json`, pinnedPubkeyPath: PUB });
  assert.equal(r.rawCode, 38);
  assert.equal(r.reason, "authority_sink_underdeclared");
});

test("E2E: digest-space carve-out is signature-enforced — unsigned digest tamper is 32, re-signed mismatch is 35", async (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pcta-digestspace-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  // Unsigned mutation of the action digests: the Ed25519 signature binds every payload field,
  // so an attacker without the pinned key CANNOT move the digests — verdict 32, never a
  // silent pass and never a bare 35.
  const clean = JSON.parse(readFileSync(`${FX}/clean-authorized.json`, "utf8"));
  clean.proof.payload.enforcement.applied_action_digest = `sha256:${"0".repeat(64)}`;
  clean.proof.payload.authorized_action_digest = `sha256:${"0".repeat(64)}`;
  const p = join(tmp, "mut.json");
  writeFileSync(p, JSON.stringify(clean));
  const unsigned = await runPctaCore({ fixture: p, pinnedPubkeyPath: PUB });
  assert.equal(unsigned.rawCode, 32);
  // A properly RE-SIGNED digest mismatch (producer holds the key but authorized != receipt's
  // resolved_args_digest) is the matrix's action-mismatch fixture: P5 in 4H digest space -> 35.
  const resigned = await runPctaCore({
    fixture: `${FX}/action-mismatch.json`,
    pinnedPubkeyPath: PUB,
  });
  assert.equal(resigned.rawCode, 35);
});

test("E2E: CLI runs the offline pre-flight, emits evidence, exits 0 on clean", async (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pcta-offline-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const out = join(tmp, "r.json");
  execFileSync(process.execPath, [
    "tools/simurgh-attestation/stage4j/verify-stage4j-pcta.mjs",
    "--fixture",
    `${FX}/clean-authorized.json`,
    "--pinned-pubkey",
    PUB,
    "--out",
    out,
  ]);
  const r = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(r.rawCode, 0);
  assert.equal(r.ok, true);
  assert.equal(stage4CodeForRawCode(28), 2); // offline-breach band mapping stays intact
});

test("E2E: anti-theatre deletion — removing the proof flips clean 0 -> 31 (never 0)", async (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pcta-antitheatre-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const before = await runPctaCore({
    fixture: `${FX}/clean-authorized.json`,
    pinnedPubkeyPath: PUB,
  });
  assert.equal(before.rawCode, 0);
  const clean = JSON.parse(readFileSync(`${FX}/clean-authorized.json`, "utf8"));
  clean.proof = null; // delete the authorization proof
  const p = join(tmp, "deleted.json");
  writeFileSync(p, JSON.stringify(clean));
  const after = await runPctaCore({ fixture: p, pinnedPubkeyPath: PUB });
  assert.notEqual(after.rawCode, 0);
  assert.equal(after.rawCode, 31);
});

test("E2E: byte-stable golden — temp regeneration reproduces the matrix byte-for-byte and every verdict", async (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pcta-regen-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  execFileSync(process.execPath, ["tools/simurgh-attestation/stage4j/build-stage4j-fixtures.mjs"], {
    env: { ...process.env, STAGE4J_FIXTURE_OUT: tmp },
  });
  // The matrix is the deterministic semantic contract: regenerated bytes must equal committed.
  const committed = readFileSync(`${FX}/expected-results/pcta-matrix.json`, "utf8");
  const regenerated = readFileSync(`${tmp}/expected-results/pcta-matrix.json`, "utf8");
  assert.equal(regenerated, committed);
  // Fresh keys => different signatures, but every VERDICT must reproduce identically against
  // the regenerated self-contained set (its own pinned key + its own P8 substrate).
  for (const [name, expected] of Object.entries(MATRIX)) {
    const { rawCode } = await runPctaCore({
      fixture: `${tmp}/${name}.json`,
      pinnedPubkeyPath: `${tmp}/pcta-signer.pub`,
    });
    assert.equal(rawCode, expected.raw, `regenerated ${name}`);
  }
});
