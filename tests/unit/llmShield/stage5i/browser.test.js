import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyPortable } from "../../../../tools/simurgh-attestation/stage5i/browser/vpc-portable.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5i/node/build-vpc-evidence.mjs";

test("browser portable verifier ↔ committed pack: raw 0 + byte-identical digests (WebCrypto)", async () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));
  const r = await verifyPortable(bundle, cfg);
  assert.equal(r.raw, 0);
  const att = bundle.attestation.content;
  assert.equal(r.partition_digest, att.partition_digest);
  assert.equal(r.panel_subject_root, att.panel_subject_root);
  assert.equal(r.panel_evidence_root, att.panel_evidence_root);
});

test("browser portable: adequacy annotation → 328; coverage gap → 327", async () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));
  const withAdequacy = structuredClone(bundle);
  withAdequacy.attestation.content.annotations = { certified_safe: true };
  assert.equal((await verifyPortable(withAdequacy, cfg)).raw, 328);
  const withGap = structuredClone(bundle);
  withGap.coverage_receipts[1].content.evaluated_sections = ["4", "5"]; // drops 6,7,8
  assert.equal((await verifyPortable(withGap, cfg)).raw, 327);
});
