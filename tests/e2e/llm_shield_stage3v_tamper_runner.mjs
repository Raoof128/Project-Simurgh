// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-A negative self-proof. Each case mutates committed evidence and asserts the verifier
// rejects it (ok:false). Counters for must-not-happen classes stay 0. Deterministic, offline.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyExternalDefense } from "../../tools/simurgh-attestation/verify-stage3v-external-defense.mjs";
import { validateObservation } from "../../tools/external-defense-adapters/externalDefenseAdapterContract.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3v";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3v-public-key.json`, "utf8")).public_key_pem;
const clone = (x) => JSON.parse(JSON.stringify(x));

export function runStage3vSelfProof() {
  const cases = [];
  const reject = (name, b, s = sidecar, p = pub) =>
    cases.push({
      name,
      rejected: verifyExternalDefense({ bundle: b, sidecar: s, publicKeyPem: p }).ok === false,
    });

  // external verdict flip (mutate metrics that the signed bundle binds)
  const flip = clone(bundle);
  flip.metrics.external.external_block_rate = "999/180";
  reject("external_verdict_flipped", flip);

  const gh = clone(bundle);
  gh.gateway_computed_hashes.external_raw_output_hash = "sha256:" + "0".repeat(64);
  reject("gateway_hash_edited", gh);

  const mf = clone(bundle);
  mf.run_set.stage3l_corpus_manifest_hash = "sha256:" + "1".repeat(64);
  reject("manifest_edited", mf);

  const me = clone(bundle);
  me.containment_summary.unsafe_tool_execution = 5;
  reject("metrics_edited", me);

  const wrong = crypto
    .generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" });
  reject("wrong_public_key", bundle, sidecar, wrong);

  // raw-output injection: a forbidden raw field placed into the bundle must break the signature
  const raw = clone(bundle);
  raw.injected_raw_output = "[REDACTED-SYNTHETIC] raw external model output";
  reject("raw_output_injected", raw);

  // file removal: missing sidecar -> fails closed
  cases.push({
    name: "file_removed",
    rejected: verifyExternalDefense({ bundle, sidecar: null, publicKeyPem: pub }).ok === false,
  });

  // adapter-supplied hash must be rejected at the contract boundary
  let adapterHashRejected = false;
  try {
    validateObservation({
      adapter_schema: "simurgh.external_defense_adapter.v1",
      target: "x",
      case_id: "c",
      raw_output_ref: "local-only",
      normalised_verdict: "allow",
      confidence_bucket: "low",
      latency_bucket_ms: "0-100",
      error_code: "none",
      digest: "x",
    });
  } catch (e) {
    adapterHashRejected = /adapter_supplied_hash_forbidden/.test(e.message);
  }
  cases.push({ name: "adapter_supplied_hash", rejected: adapterHashRejected });

  const counters = {
    accepted_tampered_bundles: cases.filter((c) => !c.rejected).length,
    raw_output_in_bundle: Object.keys(bundle).some((k) => /raw_output|raw_prompt/i.test(k)) ? 1 : 0,
  };
  return {
    all_passed: cases.every((c) => c.rejected) && Object.values(counters).every((v) => v === 0),
    cases,
    counters,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runStage3vSelfProof();
  console.log(JSON.stringify(r, null, 2));
  if (!r.all_passed) process.exit(1);
}
