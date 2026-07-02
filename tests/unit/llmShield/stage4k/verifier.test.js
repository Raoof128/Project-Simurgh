// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stage4CodeForRawCode } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { runEbaCore } from "../../../../tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs";

const FIX = "tests/fixtures/llmShield/stage4k";
const PIN = `${FIX}/eba-signer.pub`;
const MATRIX = JSON.parse(readFileSync(`${FIX}/expected-results/exposure-matrix.json`, "utf8"));

test("matrix has exactly the two v0 bundles and includes the Q8 row", () => {
  assert.deepEqual(Object.keys(MATRIX).sort(), ["over-budget", "under-budget"]);
  assert.equal(MATRIX["over-budget"].raw, 30);
  assert.equal(MATRIX["over-budget"].typed, 1);
});

for (const [name, expected] of Object.entries(MATRIX)) {
  test(`bundle ${name} -> raw ${expected.raw}, typed ${expected.typed}`, async () => {
    const r = await runEbaCore({ bundleDir: `${FIX}/bundles/${name}`, pinnedPubkeyPath: PIN });
    assert.equal(r.rawCode, expected.raw, r.reason);
    assert.equal(r.reason, expected.reason);
    assert.equal(stage4CodeForRawCode(r.rawCode), expected.typed);
  });
}

function tempCopy(t, name) {
  const tmp = mkdtempSync(join(tmpdir(), "eba-verifier-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  cpSync(`${FIX}/bundles/${name}`, `${tmp}/bundle`, { recursive: true });
  return `${tmp}/bundle`;
}

test("deleted ledger fails closed (29 -> 3), never 0", async (t) => {
  const dir = tempCopy(t, "under-budget");
  unlinkSync(`${dir}/extraction-ledger.json`);
  const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: PIN });
  assert.equal(r.rawCode, 29);
  assert.equal(stage4CodeForRawCode(r.rawCode), 3);
});

test("unsigned attestation tamper is caught by the digest chain (22 -> 1)", async (t) => {
  const dir = tempCopy(t, "under-budget");
  const att = JSON.parse(readFileSync(`${dir}/extraction-attestation.json`, "utf8"));
  att.per_consumer[0].weighted_total = 0; // prettify without re-signing
  writeFileSync(`${dir}/extraction-attestation.json`, JSON.stringify(att));
  const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: PIN });
  assert.equal(r.rawCode, 22);
  assert.equal(stage4CodeForRawCode(r.rawCode), 1);
});

test("manifest signature corruption -> 25 -> 1", async (t) => {
  const dir = tempCopy(t, "under-budget");
  const man = JSON.parse(readFileSync(`${dir}/eba-manifest.json`, "utf8"));
  const sig = man.signature.slice("ed25519:".length);
  const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
  man.signature = `ed25519:${flipped}`;
  writeFileSync(`${dir}/eba-manifest.json`, JSON.stringify(man));
  const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: PIN });
  assert.equal(r.rawCode, 25);
  assert.equal(stage4CodeForRawCode(r.rawCode), 1);
});

test("event-stream tamper (count inflation) is caught by ledger recompute (22)", async (t) => {
  const dir = tempCopy(t, "under-budget");
  const events = JSON.parse(readFileSync(`${dir}/events.json`, "utf8"));
  events.push({ ...events[0], event_id: "ev_injected" });
  writeFileSync(`${dir}/events.json`, JSON.stringify(events));
  const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: PIN });
  assert.equal(r.rawCode, 22);
  assert.equal(r.reason, "ledger_recompute_mismatch");
});

test("unknown signal class in the stream fails closed (29), never zero-weighted", async (t) => {
  const dir = tempCopy(t, "under-budget");
  const events = JSON.parse(readFileSync(`${dir}/events.json`, "utf8"));
  events[0] = { ...events[0], signal_class: "raw_logits" };
  writeFileSync(`${dir}/events.json`, JSON.stringify(events));
  const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: PIN });
  assert.equal(r.rawCode, 29);
  assert.equal(r.reason, "unknown_signal_class");
});

test("unpinned signer key is rejected even with a valid signature (25)", async (t) => {
  const dir = tempCopy(t, "under-budget");
  const { generateKeyPairSync } = await import("node:crypto");
  const { publicKey } = generateKeyPairSync("ed25519");
  const tmpPin = join(dir, "other.pub");
  writeFileSync(tmpPin, publicKey.export({ type: "spki", format: "pem" }));
  const r = await runEbaCore({ bundleDir: dir, pinnedPubkeyPath: tmpPin });
  assert.equal(r.rawCode, 25);
  assert.equal(r.reason, "unpinned_signer");
});
