// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC subject-separation check (raw 292). Rung-2 only. The anchored producer subject (from the
// kernel-verified anchor) must differ from the EXTERNALLY-configured verifier subject, not the in-bundle
// string.
import { CODES } from "../constants.mjs";

export function checkSubjectSeparation(bundle, ctx) {
  if (!bundle.anchor_evidence) return null; // presence-driven; not a rung-2 bundle
  const producerSubject = ctx.kernelResult?.subject;
  return producerSubject === ctx.verifierPin.verifier_identity_subject
    ? CODES.VFC_SUBJECT_NOT_DISTINCT
    : null;
}
