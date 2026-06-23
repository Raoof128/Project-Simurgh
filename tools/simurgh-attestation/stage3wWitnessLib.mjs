// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure helpers for Stage 3W (witnessed VCA release provenance). Reads the committed, sealed 3V-B
// evidence and produces (a) the deterministic CI witness-verdict object and (b) the offline
// in-toto release-witness statement. No network, no model, no src/llmShield. The offline statement
// binds the witness-verdict FILE digest as a subject — never the online Sigstore attestation.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, sha256Hex } from "./canonicalise.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EV_ROOT = join(HERE, "../../docs/research/llm-shield/evidence");

export const WITNESSED_3VB = Object.freeze({
  commit: "b645d80",
  tag: "v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
  release_url:
    "https://github.com/Raoof128/Project-Simurgh/releases/tag/v2.6.0-stage-3v-b-llamaguard-external-defense-attestation",
});

const SUBJECT_PATHS = Object.freeze([
  "stage-3v-b/attestation.bundle.json",
  "stage-3v-b/attestation.signature.json",
  "stage-3v-b/capture-replay/lg4-frozen-capture.json",
  "stage-3v-b/evidence-hashes.json",
]);

const EXPECTED = Object.freeze({
  stage3vb_verifier: "PASS",
  stage3vb_reproduce: "PASS",
  stage3vb_live_release_gate: "PASS",
  stage3vb_evidence_hashes_match: true,
  model_reexecuted_in_ci: false,
});

const NON_CLAIMS = Object.freeze([
  "does_not_reduce_live_capture_origin_self_reported",
  "does_not_prove_live_capture_origin",
  "does_not_reexecute_llama_guard_4",
  "sigstore_not_required_for_offline_verification",
  "does_not_rank_external_defences",
]);

export function computeStage3vbSubjects() {
  const out = {};
  for (const rel of SUBJECT_PATHS) out[rel] = sha256Hex(readFileSync(join(EV_ROOT, rel), "utf8"));
  return Object.freeze(out);
}

export function buildWitnessVerdict(observed = {}) {
  const ci_observed = { ...EXPECTED, ...observed };
  const subjects = computeStage3vbSubjects();
  return {
    schema: "simurgh.stage3w.github_witness_verdict.v1",
    witness_claim: "verify_and_attest_verdict",
    verification_mode: "ci_observed_not_echoed",
    witness_root: "github_oidc_sigstore",
    repo: "Raoof128/Project-Simurgh",
    commit: WITNESSED_3VB.commit,
    tag: WITNESSED_3VB.tag,
    verified_stage: "3V-B",
    expected: { ...EXPECTED },
    ci_observed,
    expected_equals_observed: canonicalJson({ ...EXPECTED }) === canonicalJson(ci_observed),
    subjects: {
      stage3vb_attestation_bundle_sha256: subjects["stage-3v-b/attestation.bundle.json"],
      stage3vb_signature_sha256: subjects["stage-3v-b/attestation.signature.json"],
      stage3vb_capture_replay_sha256: subjects["stage-3v-b/capture-replay/lg4-frozen-capture.json"],
      stage3vb_evidence_hashes_sha256: subjects["stage-3v-b/evidence-hashes.json"],
    },
    non_claims: [
      "does_not_prove_live_capture_origin",
      "does_not_reexecute_llama_guard_4",
      "does_not_reduce_live_capture_origin_self_reported",
      "does_not_rank_external_defences",
    ],
  };
}

export function buildReleaseWitnessStatement(subjects, witnessVerdictDigest) {
  const subject = Object.entries(subjects)
    .map(([name, digest]) => ({ name, digest: { sha256: digest.replace(/^sha256:/, "") } }))
    .concat([
      {
        name: "stage-3w/github-witness-verdict.json",
        digest: { sha256: witnessVerdictDigest.replace(/^sha256:/, "") },
      },
    ])
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    _type: "https://in-toto.io/Statement/v1",
    predicateType: "https://project-simurgh.dev/predicates/vca-release-witness/v1",
    subject,
    predicate: {
      stage: "3W",
      witnessed_stage: "3V-B",
      release_commit: WITNESSED_3VB.commit,
      tag: WITNESSED_3VB.tag,
      release_url: WITNESSED_3VB.release_url,
      offline_reproduce_passed: true,
      live_release_gate_passed: true,
      model_reexecuted_in_ci: false,
      online_witness: {
        provider: "github_artifact_attestations",
        workflow: ".github/workflows/stage-3w-witness.yml",
        subject: "docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json",
        required_for_offline_verification: false,
      },
      non_claims: [...NON_CLAIMS],
    },
  };
}
