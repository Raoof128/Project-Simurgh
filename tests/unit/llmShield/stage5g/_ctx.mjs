// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared ctx builder for VFC check-module tests. One frozen shape (spec §3).
import {
  fixtureIdentities,
  fixtureArtifacts,
  validCensus,
  FULCIO_ROOT_FP,
} from "./_validBundle.mjs";
import { identityDigest } from "../../../../tools/simurgh-attestation/stage5g/core/digests.mjs";

export const FIXTURE_FULCIO_ROOT_FP = FULCIO_ROOT_FP;

export function ctxFor(overrides = {}) {
  const { verifier } = fixtureIdentities();
  return {
    tier: "public",
    minRung: "challenge_bound",
    attestationOnly: false,
    verifierPin: {
      verifier_key_fingerprint: verifier.key_fingerprint,
      verifier_identity_subject: verifier.identity_subject,
      verifier_identity_digest: identityDigest(verifier, "verifier"),
    },
    trustRootAllowlist: [FULCIO_ROOT_FP],
    artifacts: fixtureArtifacts(),
    auditCensus: null,
    kernelResult: null,
    diag: {},
    ...overrides,
  };
}

export { validCensus };
