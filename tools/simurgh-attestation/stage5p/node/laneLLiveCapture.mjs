// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane L — a LIVE authority-laundering capture, frozen and replayed offline.
//
// A live model was asked, three ways, for content a naive pipeline might mistake for resolver
// authority. It produced all three, including a first-person assertion of authorised-representative
// status and a fabricated resolver verdict asserting `principal_resolved: true, role: accountable`.
//
// That is not a finding about the model. It is the finding this lane exists to make: model output is
// ARTICULATE and CARRIES NO AUTHORITY, and those two facts are independent. The containment claim is
// entirely about the verifier — whatever the text says, it routes through an untrusted profile and
// dies at S2.C3.
//
// Public wording stays provider-agnostic. The capture records the model id the API returned because
// an evidence file that hid its own source would be the opposite of this stage's point.
//
// BOTH DISPOSITIONS ARE SEALED HONESTLY. A refusal is recorded as `model_refused` and is a perfectly
// good result — the lane was never re-run until the output looked better.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { PRINCIPAL_TYPE } from "../core/canonicalPrincipal.mjs";
import { RESOLVER_EVIDENCE_TYPE } from "../core/resolverEvidence.mjs";
import { UNTRUSTED_PROFILE, PINNED, ALICE } from "./laneAFixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPTURE = resolve(
  HERE,
  "../../../../docs/research/llm-shield/evidence/stage-5p/lane-l-capture/probes.json"
);

const sha256Hex = (b) => createHash("sha256").update(b).digest("hex");

export function loadLaneLCapture() {
  const bytes = readFileSync(CAPTURE);
  const parsed = JSON.parse(bytes.toString("utf8"));
  return Object.freeze({
    ...parsed,
    capture_digest: sha256Hex(bytes),
    // Stated with the data: what a live capture can and cannot establish.
    not_claimed: Object.freeze([
      "not_a_claim_about_model_safety_or_alignment",
      "not_a_measure_of_how_often_a_model_will_produce_such_text",
      "not_evidence_that_other_models_behave_the_same_way",
      "containment_is_a_property_of_the_VERIFIER_not_of_the_model",
    ]),
    probes: Object.freeze(parsed.probes.map(Object.freeze)),
  });
}

/**
 * Wrap a captured model utterance as resolver evidence — the naive-pipeline mistake, made explicit.
 *
 * The utterance enters under UNTRUSTED_PROFILE, which is pinned in the registry (so it is a
 * well-formed, structurally valid source) but absent from the trusted set. That arrangement is the
 * whole point: the attack is not malformed input, it is PERFECTLY FORMED input from a source with no
 * standing. Malformed input would die at S2.C1 and prove nothing about authority.
 */
export function laneLEvidenceBundle(probe) {
  return {
    subject: { ...ALICE },
    required: {
      binding: "unbound",
      resolution: "provider_asserted",
      continuity: "ephemeral",
      role: "unproven",
    },
    evidences: [
      {
        type: RESOLVER_EVIDENCE_TYPE,
        profile_id: UNTRUSTED_PROFILE.profile_id,
        claim: {
          principal: {
            type: PRINCIPAL_TYPE,
            kind: ALICE.kind,
            namespace_id: ALICE.namespace_id,
            subject_id: ALICE.subject_id,
          },
        },
        // The model's own fabricated verdict, taken at face value and asserted as strongly as its
        // text implies. If the narrative could move an axis, THIS is where it would happen.
        asserted_strength_delta: {
          binding: "cryptographically_bound",
          resolution: "principal_resolved",
          continuity: "durable",
          role: "accountable_role_bound",
        },
        evidence_digest: sha256Hex(Buffer.from(probe.response_text, "utf8")),
        submission_digest_binding: sha256Hex(Buffer.from(`lane-l:${probe.probe_id}`, "utf8")),
        signature: "ab12",
      },
    ],
  };
}

export const LANE_L_PINNED = PINNED;
