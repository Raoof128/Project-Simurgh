// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3X negative self-proof. Mutates committed evidence; asserts the offline verifier rejects
// each (ok:false). Also self-proofs the generic EH verifier's hardening. Counters stay 0.
import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { verifyTimeline } from "../../tools/simurgh-attestation/verify-stage3x-timeline.mjs";
import { verifyEvidenceHashes } from "../../tools/simurgh-attestation/verifyEvidenceHashesLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const index = JSON.parse(readFileSync(`${EV}/timeline.index.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/timeline.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3x-public-key.json`, "utf8")).public_key_pem;
const clone = (x) => JSON.parse(JSON.stringify(x));

export function runStage3xSelfProof() {
  const cases = [];
  const reject = (name, idx, s = sidecar, p = pub) =>
    cases.push({
      name,
      rejected: verifyTimeline({ index: idx, sidecar: s, publicKeyPem: p }).ok === false,
    });

  const ehStage = index.rungs.find((r) => r.evidence_root_digest);
  const d = clone(index);
  d.rungs.find((r) => r.stage === ehStage.stage).evidence_root_digest = "sha256:" + "0".repeat(64);
  reject("evidence_root_digest_edited", d);

  const tg = clone(index);
  tg.rungs[0].tag = "v9.9.9-fake";
  reject("tag_edited", tg);

  const mc = clone(index);
  mc.rungs[0].merge_commit = "0".repeat(40);
  reject("merge_commit_edited", mc);

  const fp = clone(index);
  fp.rungs.find((r) => r.public_key_fingerprint).public_key_fingerprint = "sha256:" + "1".repeat(64);
  reject("public_key_fingerprint_edited", fp);

  const rt = clone(index);
  rt.rungs.find((r) => r.stage === "3M").replay_tier = "reproduce";
  reject("replay_tier_flipped", rt);

  const st = clone(sidecar);
  st.signature = "base64:" + Buffer.from("nope").toString("base64");
  reject("signature_tampered", index, st);

  const wrong = crypto
    .generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" });
  reject("wrong_public_key", index, sidecar, wrong);

  cases.push({
    name: "signature_sidecar_missing",
    rejected: verifyTimeline({ index, sidecar: null, publicKeyPem: pub }).ok === false,
  });

  // generic EH hardening self-proofs
  const ehSelf = verifyEvidenceHashes("x", { _injectMap: { "x/evidence-hashes.json": "sha256:y" } });
  cases.push({
    name: "eh_self_inclusion",
    rejected: ehSelf.ok === false && ehSelf.reason === "self_inclusion",
  });
  const ehTrav = verifyEvidenceHashes("x", { _injectMap: { "../../etc/passwd": "sha256:y" } });
  cases.push({
    name: "eh_path_traversal",
    rejected: ehTrav.ok === false && ehTrav.reason === "unsafe_path",
  });
  const ehMissing = verifyEvidenceHashes("docs/research/llm-shield/evidence/stage-3w", {
    _injectMap: {
      "docs/research/llm-shield/evidence/stage-3w/does-not-exist.json": "sha256:" + "0".repeat(64),
    },
  });
  cases.push({
    name: "eh_bound_file_missing",
    rejected: ehMissing.ok === false && ehMissing.reason === "digest_mismatch",
  });

  const counters = {
    accepted_tampered_bundles: cases.filter((c) => !c.rejected).length,
    eh_unsafe_accepted: [ehSelf, ehTrav, ehMissing].filter((r) => r.ok).length,
  };
  return {
    all_passed: cases.every((c) => c.rejected) && Object.values(counters).every((v) => v === 0),
    cases,
    counters,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runStage3xSelfProof();
  writeFileSync(`${EV}/self-proof-results.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify({ all_passed: r.all_passed, counters: r.counters }, null, 2));
  if (!r.all_passed) process.exit(1);
}
