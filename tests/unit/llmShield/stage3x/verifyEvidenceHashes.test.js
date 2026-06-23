import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyEvidenceHashes } from "../../../../tools/simurgh-attestation/verifyEvidenceHashesLib.mjs";

test("verifies a real committed stage dir (3W)", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w");
  assert.equal(r.ok, true);
  assert.ok(r.checked >= 1);
  assert.deepEqual(r.mismatches, []);
});
test("ok:false when the map is missing", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3m");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "evidence_hashes_missing");
});
test("rejects self-inclusion", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: { "docs/research/llm-shield/evidence/stage-3w/evidence-hashes.json": "sha256:x" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "self_inclusion");
});
test("rejects path traversal (raw '..')", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: { "../../../etc/passwd": "sha256:x" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsafe_path");
});
test("rejects traversal that would normalise clean (stage-3w/../stage-3v/...)", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: {
      "docs/research/llm-shield/evidence/stage-3w/../stage-3v/provenance.json": "sha256:x",
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsafe_path");
});
test("rejects absolute path", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: { "/etc/passwd": "sha256:x" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsafe_path");
});
test("rejects a key resolving outside stageDir", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: { "docs/research/llm-shield/evidence/stage-3v/provenance.json": "sha256:x" },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "outside_stage_dir");
});
test("reports mismatch on a bad digest", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: {
      "docs/research/llm-shield/evidence/stage-3w/provenance.json": "sha256:" + "0".repeat(64),
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "digest_mismatch");
  assert.ok(r.mismatches.length >= 1);
});
test("never throws on a nonexistent dir", () => {
  const r = verifyEvidenceHashes("docs/research/llm-shield/evidence/does-not-exist");
  assert.equal(r.ok, false);
});
