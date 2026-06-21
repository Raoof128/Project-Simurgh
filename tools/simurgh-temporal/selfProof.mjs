// SPDX-License-Identifier: AGPL-3.0-or-later
// Dispatches a crafted Stage 3Q self-proof fixture to the gate it must trip and
// reports the observed detector/result. clean-baseline must trip nothing.
import { buildRegressionDiff, validateTimelineManifest } from "./temporalLib.mjs";
import { verifyRegistryHashChain, verifyAppendContinuity } from "./registryChain.mjs";

function evaluateDiffFixture(p) {
  // optional forced lineage mismatch (cross-lineage fixture)
  const after = p.force_after_lineage
    ? { ...p.after, target: { target_id: p.force_after_lineage } }
    : p.after;
  const res = buildRegressionDiff({
    diffRow: p.row,
    beforeAttestation: p.before,
    afterAttestation: after,
    diffManifestDigest: "sha256:SELFPROOF",
  });
  if (!res.ok) {
    // corpus_mismatch is a non_comparable result; lineage violations are rejected
    if (res.violation === "corpus_mismatch")
      return { result: "non_comparable", detector: "corpus_mismatch" };
    return { result: "rejected", detector: res.violation };
  }
  // accepted: report the dominant transition (integrity_failure > regressed > improved)
  const transitions = Object.values(res.diff.cell_transitions).map((c) => c.transition);
  let detector = null;
  for (const want of ["integrity_failure", "regressed", "improved"]) {
    if (transitions.includes(want)) {
      detector = want;
      break;
    }
  }
  return { result: "accepted", detector };
}

export function evaluateTemporalSelfProofFixture(fixture) {
  let observed = { result: null, detector: null };
  if (fixture.kind === "diff") {
    observed = evaluateDiffFixture(fixture.payload);
  } else if (fixture.kind === "manifest") {
    const v = validateTimelineManifest(fixture.payload.manifest);
    observed = v.ok
      ? { result: "accepted", detector: null }
      : { result: "rejected", detector: "manifest_timestamp_violation" };
  } else if (fixture.kind === "registry_chain") {
    const v = verifyRegistryHashChain(fixture.payload.registry);
    observed = v.ok
      ? { result: "accepted", detector: null }
      : { result: "rejected", detector: "registry_chain_violation" };
  } else if (fixture.kind === "append_continuity") {
    const v = verifyAppendContinuity(fixture.payload.previousHead, fixture.payload.registry);
    observed = v.ok
      ? { result: "accepted", detector: null }
      : { result: "rejected", detector: "append_continuity_violation" };
  }
  return {
    fixture_id: fixture.fixture_id,
    expected_result: fixture.expected_result,
    observed_result: observed.result,
    expected_detector: fixture.expected_detector,
    observed_detector: observed.detector,
    passed:
      observed.result === fixture.expected_result &&
      observed.detector === fixture.expected_detector,
  };
}
