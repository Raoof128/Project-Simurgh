// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 11: Lane B blindness, and the child-emitted verdict receipt.
//
// These tests spawn the real child. A blindness property asserted only against a mock is a property
// of the mock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  buildChildPayload,
  assertBlind,
  scrubEnv,
  assertNoKeyMaterial,
  verdictReceiptDigest,
  verifyVerdictReceipt,
  permute,
  LABEL_BEARING_KEYS,
  ALLOWED_ENV_KEYS,
} from "../../../../tools/simurgh-attestation/stage5r/core/laneB.mjs";
import {
  decide,
  buildReceipt,
} from "../../../../tools/simurgh-attestation/stage5r/node/detectorChild.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const CHILD = join(ROOT, "tools/simurgh-attestation/stage5r/node/detectorChild.mjs");
const SIGNAL = "emitted-field-set differs from the declared schema";

/** Run the real child, exactly as Lane B would: scrubbed env, absolute exe, stdin payload. */
function runChild(payload) {
  const out = execFileSync(process.execPath, [CHILD], {
    input: JSON.stringify(payload),
    env: scrubEnv(process.env),
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(out);
}

// ---- blindness, asserted structurally --------------------------------------------------------------

test("the payload carries only the bytes, the class and the declared signal", () => {
  const p = buildChildPayload({
    control_id: "c-01",
    attack_class: "R2",
    source: "x",
    declared_signal: SIGNAL,
  });
  assert.deepEqual(Object.keys(p).sort(), [
    "attack_class",
    "control_id",
    "declared_signal",
    "source",
  ]);
  assert.equal(assertBlind(p).ok, true);
});

test("a payload key naming the control's kind is REFUSED", () => {
  for (const key of LABEL_BEARING_KEYS) {
    const p = {
      ...buildChildPayload({
        control_id: "c-01",
        attack_class: "R2",
        source: "x",
        declared_signal: SIGNAL,
      }),
      [key]: true,
    };
    const r = assertBlind(p);
    assert.equal(r.ok, false, key);
    assert.match(r.reason, new RegExp(key));
  }
});

test("a label leaking through an innocent-looking VALUE is refused too", () => {
  const p = buildChildPayload({
    control_id: "vulnerable-01",
    attack_class: "R2",
    source: "x",
    declared_signal: SIGNAL,
  });
  const r = assertBlind(p);
  assert.equal(r.ok, false);
  assert.match(r.reason, /leaks the label/);
});

test("the control's own SOURCE may say anything — it is the thing under test", () => {
  const p = buildChildPayload({
    control_id: "c-01",
    attack_class: "R2",
    source: "// this vulnerable-looking word is inside the control itself",
    declared_signal: SIGNAL,
  });
  assert.equal(assertBlind(p).ok, true);
});

test("a non-object payload fails closed", () => {
  assert.equal(assertBlind(null).ok, false);
  assert.equal(assertBlind("payload").ok, false);
});

// ---- the real child --------------------------------------------------------------------------------

test("the real child detects the declared signal and not-detects its absence", () => {
  const withSignal = runChild(
    buildChildPayload({
      control_id: "c-01",
      attack_class: "R2",
      source: `function v() { /* SIGNAL:${SIGNAL} */ }`,
      declared_signal: SIGNAL,
    })
  );
  const without = runChild(
    buildChildPayload({
      control_id: "c-02",
      attack_class: "R2",
      source: "function s() {}",
      declared_signal: SIGNAL,
    })
  );
  assert.equal(withSignal.verdict, "detected");
  assert.equal(without.verdict, "not_detected");
});

test("the child's EXIT CODE is 0 for both verdicts — exit code alone is a forbidden surrogate", () => {
  // If the child encoded its verdict in the exit status, the parent would be reading §3.4's first
  // forbidden surrogate without anyone deciding to.
  for (const source of [`/* SIGNAL:${SIGNAL} */`, "nothing here"]) {
    const r = execFileSync(process.execPath, [CHILD], {
      input: JSON.stringify(
        buildChildPayload({ control_id: "c", attack_class: "R2", source, declared_signal: SIGNAL })
      ),
      env: scrubEnv(process.env),
      encoding: "utf8",
    });
    assert.ok(JSON.parse(r).verdict);
  }
});

test("an orthogonal failure — source that does not parse — is NOT detected", () => {
  // The whole point of the third control. A detector that called this "detected" would be measuring
  // sadness rather than the class it names.
  const r = runChild(
    buildChildPayload({
      control_id: "c-03",
      attack_class: "R2",
      source: "function ( { this is not javascript",
      declared_signal: SIGNAL,
    })
  );
  assert.equal(r.verdict, "not_detected");
});

// ---- the verdict receipt ----------------------------------------------------------------------------

test("the child's receipt verifies, and its digest is domain-separated", () => {
  const r = runChild(
    buildChildPayload({
      control_id: "c-01",
      attack_class: "R2",
      source: `/* SIGNAL:${SIGNAL} */`,
      declared_signal: SIGNAL,
    })
  );
  assert.equal(verifyVerdictReceipt(r).ok, true);
  assert.equal(r.receipt_digest, verdictReceiptDigest(r));
  assert.match(r.receipt_digest, /^[0-9a-f]{64}$/);
});

test("a PARENT-SIDE edit of the child's verdict is detected by the digest", () => {
  const r = runChild(
    buildChildPayload({
      control_id: "c-01",
      attack_class: "R2",
      source: "nothing here",
      declared_signal: SIGNAL,
    })
  );
  assert.equal(r.verdict, "not_detected");
  const rewritten = { ...r, verdict: "detected" };
  const check = verifyVerdictReceipt(rewritten);
  assert.equal(check.ok, false);
  assert.match(check.reason, /the parent rewrote the child's verdict/);
});

test("a verdict outside the two allowed values is refused", () => {
  const receipt = {
    control_digest: "a",
    detector_digest: "b",
    declared_signal: SIGNAL,
    verdict: "probably_fine",
    signal_evidence_digest: "c",
  };
  receipt.receipt_digest = verdictReceiptDigest(receipt);
  const r = verifyVerdictReceipt(receipt);
  assert.equal(r.ok, false);
  assert.match(r.reason, /neither detected nor not_detected/);
});

test("swapping the DETECTOR changes the receipt digest", () => {
  const payload = buildChildPayload({
    control_id: "c",
    attack_class: "R2",
    source: "x",
    declared_signal: SIGNAL,
  });
  const honest = buildReceipt(payload);
  const swapped = { ...honest, detector_digest: "0".repeat(64) };
  assert.notEqual(verdictReceiptDigest(swapped), honest.receipt_digest);
});

// ---- environment and argv hygiene ---------------------------------------------------------------------

test("the environment is scrubbed to PATH — OPERATOR* and everything else is dropped", () => {
  const scrubbed = scrubEnv({
    PATH: "/usr/bin",
    OPERATOR_NAME: "someone",
    HOME: "/root",
    AWS_SECRET: "x",
  });
  assert.deepEqual(Object.keys(scrubbed), ["PATH"]);
  assert.deepEqual([...ALLOWED_ENV_KEYS], ["PATH"]);
});

test("argv carrying key material is refused", () => {
  assert.equal(assertNoKeyMaterial(["--in", "control.mjs"]).ok, true);
  assert.equal(assertNoKeyMaterial(["--key", "/home/x/.simurgh/5r-ed25519.pem"]).ok, false);
  assert.match(assertNoKeyMaterial(["a.key"]).reason, /key material/);
});

// ---- ordering ------------------------------------------------------------------------------------------

test("control order comes from a committed seed, so sequence cannot leak the label", () => {
  const items = ["c-01", "c-02", "c-03"];
  const a = permute(items, "seed-alpha");
  assert.deepEqual(permute(items, "seed-alpha"), a, "the same seed must give the same order");
  assert.notDeepEqual(permute(items, "seed-beta"), a);
  assert.deepEqual([...a].sort(), [...items].sort(), "a permutation loses nothing");
});

test("decide() reads the declared signal and nothing else", () => {
  assert.equal(
    decide({ source: `/* SIGNAL:${SIGNAL} */`, declared_signal: SIGNAL }).verdict,
    "detected"
  );
  // A different declared signal over the same bytes must not fire: the signal is pre-registered, and
  // reading a different one after the fact is exactly T3.
  assert.equal(
    decide({ source: `/* SIGNAL:${SIGNAL} */`, declared_signal: "some other signal" }).verdict,
    "not_detected"
  );
});
