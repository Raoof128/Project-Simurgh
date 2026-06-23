// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3V-B negative self-proof. Each case mutates committed evidence and asserts the verifier
// rejects it (ok:false). Counters for must-not-happen classes stay 0. Deterministic, offline.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyExternalDefense } from "../../tools/simurgh-attestation/verify-stage3vb-external-defense.mjs";
import { validateObservation } from "../../tools/external-defense-adapters/externalDefenseAdapterContract.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3v-b";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3vb-public-key.json`, "utf8")).public_key_pem;
const clone = (x) => JSON.parse(JSON.stringify(x));

export function runStage3vbSelfProof() {
  const cases = [];
  const reject = (name, b, s = sidecar, p = pub) =>
    cases.push({
      name,
      rejected: verifyExternalDefense({ bundle: b, sidecar: s, publicKeyPem: p }).ok === false,
    });

  const flip = clone(bundle);
  flip.metrics.external.external_block_rate = "999/180";
  reject("external_verdict_flipped", flip);

  const prov = clone(bundle);
  prov.capture_provenance.hf_model_commit = "tampered-revision";
  reject("provenance_edited", prov);

  const wd = clone(bundle);
  wd.capture_provenance.hf_model_snapshot_digest = "sha256:" + "9".repeat(64);
  reject("weights_digest_edited", wd);

  const im = clone(bundle);
  im.run_set.input_manifest_hash = "sha256:" + "1".repeat(64);
  reject("input_manifest_edited", im);

  const cf = clone(bundle);
  cf.gateway_computed_hashes.capture_file_hash = "sha256:" + "2".repeat(64);
  reject("capture_file_hash_edited", cf);

  const wrong = crypto
    .generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" });
  reject("wrong_public_key", bundle, sidecar, wrong);

  const raw = clone(bundle);
  raw.injected_raw_output = "[REDACTED-SYNTHETIC] raw external model output";
  reject("raw_output_injected", raw);

  cases.push({
    name: "file_removed",
    rejected: verifyExternalDefense({ bundle, sidecar: null, publicKeyPem: pub }).ok === false,
  });

  let adapterHashRejected = false;
  try {
    validateObservation({
      adapter_schema: "simurgh.external_defense_adapter.v1",
      target: "x",
      case_id: "c",
      raw_output_ref: "local-only",
      normalised_verdict: "allow",
      confidence_bucket: "not_reported",
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
  const r = runStage3vbSelfProof();
  console.log(JSON.stringify(r, null, 2));
  if (!r.all_passed) process.exit(1);
}
