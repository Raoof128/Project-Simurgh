// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA declarationCore (192) + captureCore (193) — plan Task 5.
import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  declarationDigest,
  checkPrecommit,
} from "../../../../tools/simurgh-attestation/stage4z/core/declarationCore.mjs";
import {
  stalenessReceipt,
  checkCaptureBinding,
  checkCaptureReopen,
} from "../../../../tools/simurgh-attestation/stage4z/core/captureCore.mjs";
import { tensorCommitment } from "../../../../tools/simurgh-attestation/stage4z/core/tensorCore.mjs";

const declaration = {
  schema: "simurgh.vwa.declaration.v1",
  tokens: [{ token: "fake", token_id: 10 }],
  theta_nano: "500000000",
  corpus_manifest: { prompts: [{ prompt_id: "p0", n_tokens: 2, prompt_digest: "sha256:aa" }] },
  position_rule_id: "all_positions",
  layers: [5, 8],
  tokenizer: "llama-3.2",
};
const dd = declarationDigest(declaration);

const capture = {
  schema: "simurgh.vwa.capture.v1",
  model_id: "llama-3.2-1b",
  revision_digest: "sha256:rev",
  lens_digest: "sha256:lens",
  declaration_digest: dd,
  prompt_token_counts: { p0: 2 },
  commitments: { "p0:0:5": "sha256:c1" },
  ceremony: { outcome: "captured", timestamp: "2026-07-08T00:00:00Z" },
};
const map = {
  declaration_digest: dd,
  theta_nano: "500000000",
  position_rule_id: "all_positions",
  layers: [5, 8],
  commitments: { "p0:0:5": "sha256:c1" },
};

test("declarationDigest is stable and content-sensitive", () => {
  assert.match(dd, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(dd, declarationDigest({ ...declaration, theta_nano: "1" }));
});

test("checkPrecommit passes a consistent declaration/capture/map", () => {
  assert.equal(checkPrecommit(declaration, capture, map), null);
});

test("192 when the map echoes a different theta_nano", () => {
  assert.equal(checkPrecommit(declaration, capture, { ...map, theta_nano: "1" }).raw, 192);
});

test("192 when declaration_digest disagrees across artifacts", () => {
  assert.equal(
    checkPrecommit(declaration, { ...capture, declaration_digest: "sha256:x" }, map).raw,
    192
  );
});

test("192 on the shrunk-declaration attack (decl claims fewer tokens than capture)", () => {
  // capture actually saw 2 tokens for p0; a shrunk declaration claims only 1.
  const shrunk = {
    ...declaration,
    corpus_manifest: { prompts: [{ prompt_id: "p0", n_tokens: 1, prompt_digest: "sha256:aa" }] },
  };
  const shrunkDd = declarationDigest(shrunk);
  const cap = { ...capture, declaration_digest: shrunkDd };
  const m = { ...map, declaration_digest: shrunkDd };
  assert.equal(checkPrecommit(shrunk, cap, m).raw, 192);
});

test("stalenessReceipt pairs model revision with lens digest", () => {
  assert.deepEqual(stalenessReceipt(capture), {
    model_revision_digest: "sha256:rev",
    lens_digest: "sha256:lens",
  });
});

test("checkCaptureBinding (public) 193 when commitment sets disagree", () => {
  assert.equal(checkCaptureBinding(map, capture), null);
  assert.equal(
    checkCaptureBinding({ ...map, commitments: { "p0:0:5": "sha256:zz" } }, capture).raw,
    193
  );
});

test("checkCaptureReopen (audit) 193 when a salted commitment does not reopen", () => {
  const bytes = Buffer.from([1, 2, 3, 4]);
  const good = tensorCommitment("saltX", bytes);
  const cap = { commitments: { k: good } };
  const audit = { salts: { k: "saltX" }, tensors: { k: [1, 2, 3, 4] } };
  assert.equal(checkCaptureReopen(cap, audit), null);
  const badAudit = { salts: { k: "WRONG" }, tensors: { k: [1, 2, 3, 4] } };
  assert.equal(checkCaptureReopen(cap, badAudit).raw, 193);
});
