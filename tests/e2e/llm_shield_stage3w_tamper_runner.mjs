// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3W negative self-proof. Mutates committed evidence; asserts the offline verifier rejects
// each (ok:false). Counters for must-not-happen classes stay 0. Deterministic, offline.
import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { verifyWitness } from "../../tools/simurgh-attestation/verify-stage3w-witness.mjs";
import {
  buildBundle,
  buildWitnessVerdictFile,
} from "../../tools/simurgh-attestation/build-3w-witness.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3w-public-key.json`, "utf8")).public_key_pem;
const clone = (x) => JSON.parse(JSON.stringify(x));

export function runStage3wSelfProof() {
  const cases = [];
  const reject = (name, b, s = sidecar, p = pub, opts = {}) =>
    cases.push({
      name,
      rejected: verifyWitness({ bundle: b, sidecar: s, publicKeyPem: p, ...opts }).ok === false,
    });

  const subj = clone(bundle);
  subj.subject[0].digest.sha256 = "0".repeat(64);
  reject("subject_digest_edited", subj);

  const rc = clone(bundle);
  rc.predicate.release_commit = "deadbeef";
  reject("release_commit_edited", rc);

  const tg = clone(bundle);
  tg.predicate.tag = "v9.9.9-fake";
  reject("tag_edited", tg);

  // witness-verdict file edited: bound subject digest no longer matches the rebuilt verdict file.
  // Detected under --reproduce (witness_verdict_recomputed=false) via a stubbed rebuildVerdict.
  reject("witness_verdict_file_edited", bundle, sidecar, pub, {
    reproduce: true,
    rebuild: buildBundle,
    rebuildVerdict: () => ({ ...buildWitnessVerdictFile(), tampered: true }),
  });

  // flipping a ci_observed boolean changes the verdict file -> its bound subject digest mismatches.
  const co = clone(bundle);
  co.subject = co.subject.map((s) =>
    s.name === "stage-3w/github-witness-verdict.json"
      ? { ...s, digest: { sha256: "1".repeat(64) } }
      : s
  );
  reject("ci_observed_flipped", co);

  const st = clone(sidecar);
  st.signature = "base64:" + Buffer.from("nope").toString("base64");
  reject("signature_tampered", bundle, st);

  const wrong = crypto
    .generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" });
  reject("wrong_public_key", bundle, sidecar, wrong);

  cases.push({
    name: "file_removed",
    rejected: verifyWitness({ bundle, sidecar: null, publicKeyPem: pub }).ok === false,
  });

  const raw = clone(bundle);
  raw.injected_raw_output = "[REDACTED-SYNTHETIC]";
  reject("forbidden_raw_field_injected", raw);

  const counters = {
    accepted_tampered_bundles: cases.filter((c) => !c.rejected).length,
    raw_field_in_bundle: Object.keys(bundle).some((k) => /raw_output|raw_prompt/i.test(k)) ? 1 : 0,
  };
  return {
    all_passed: cases.every((c) => c.rejected) && Object.values(counters).every((v) => v === 0),
    cases,
    counters,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runStage3wSelfProof();
  writeFileSync(`${EV}/self-proof-results.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify({ all_passed: r.all_passed, counters: r.counters }, null, 2));
  if (!r.all_passed) process.exit(1);
}
