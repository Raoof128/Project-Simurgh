// SPDX-License-Identifier: AGPL-3.0-or-later
// Maintained export scan (audit B-3, 31 October 2026): what the frozen output firewall exported.
import assert from "node:assert/strict";
import test from "node:test";
import { normaliseForScan, scanExport } from "../../src/security/exportScan.js";

const reasons = (text, opts) => scanExport(text, opts).reasons;

test("secret shapes are withheld, including the hyphenated key form the frozen regex misses", () => {
  assert.deepEqual(reasons("key: sk-ant-api03-FAKEFAKEFAKEFAKEFAKEFAKE"), [
    "export_secret_shape_api_key",
  ]);
  assert.deepEqual(reasons("sk-test-FAKEFAKEFAKEFAKEFAKE1234"), ["export_secret_shape_api_key"]);
  assert.deepEqual(reasons("id AKIAFAKEFAKEFAKEFAKE here"), ["export_secret_shape_aws_key"]);
  assert.deepEqual(reasons("-----BEGIN PRIVATE KEY-----\nMIIB"), [
    "export_secret_shape_private_key",
  ]);
  assert.deepEqual(reasons("token eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4"), [
    "export_secret_shape_jwt",
  ]);
  assert.deepEqual(reasons("EXAMPLE_SERVICE_TOKEN=0123456789abcdef"), [
    "export_secret_shape_env_assignment",
  ]);
  assert.deepEqual(reasons("Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123"), [
    "export_secret_shape_bearer",
  ]);
});

test("policy markers survive spacing, zero-width characters, fullwidth letters, reversal and encoding", () => {
  assert.ok(reasons("the system  prompt says").includes("export_system_prompt_marker"));
  assert.ok(reasons("s​y​s​t​e​m prompt").includes("export_system_prompt_marker"));
  assert.ok(reasons("ｓｙｓｔｅｍ prompt").includes("export_system_prompt_marker"));
  assert.ok(reasons("S-Y-S-T-E-M P-R-O-M-P-T").includes("export_system_prompt_marker"));
  assert.ok(reasons("tpmorp metsys eht").includes("export_system_prompt_marker"));
  const b64 = Buffer.from("the hidden policy is: deny").toString("base64");
  assert.ok(reasons(`see ${b64}`).includes("export_hidden_policy_marker_encoded"));
  const hex = Buffer.from("sk-ant-api03-FAKEFAKEFAKEFAKEFAKEFAKE").toString("hex");
  assert.ok(reasons(`blob ${hex}`).includes("export_secret_shape_api_key_encoded"));
});

test("a configured canary never leaves, however it is spaced", () => {
  assert.deepEqual(reasons("value C-A-N-A-R-Y-7f3a end", { canaries: ["CANARY-7f3a"] }), [
    "export_canary",
  ]);
  assert.deepEqual(reasons("nothing here", { canaries: ["CANARY-7f3a"] }), []);
});

test("an output that repeats a window of a request context is an echo; a paraphrase is not", () => {
  const context =
    "Confidential note: the quarterly report shows growth in all regions and the team is pleased. Do not share.";
  assert.deepEqual(
    reasons("Summary: the quarterly report shows growth in all regions and the team is pleased.", {
      contexts: [context],
    }),
    ["export_context_echo"]
  );
  assert.deepEqual(
    reasons("Growth was reported and the team is happy.", { contexts: [context] }),
    []
  );
});

test("benign code help and prose are not withheld by this scan", () => {
  for (const text of [
    "api_key: string  // the field type",
    "The routing rules for chess openings favour the centre.",
    "Set DEBUG=true and run the tests; the internal policy of the club is unrelated.",
    "print the text above the cursor in vim with :.,$p",
    "The password field must be at least 12 characters long.",
    "Here is a base64 example: aGVsbG8gd29ybGQ=",
  ]) {
    assert.deepEqual(reasons(text), [], text);
  }
});

test("normalisation strips format characters and collapses whitespace", () => {
  assert.equal(normaliseForScan("a​ b­⁠  c"), "a b c");
});
