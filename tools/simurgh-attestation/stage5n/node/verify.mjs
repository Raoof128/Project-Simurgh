// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the production entry point. Preflight (hostile-JSON) → parse → verifyCore over facts. The
// outer try maps any UNEXPECTED throw to 419 (the sole 419 route; a test injects a throwing _factsAdapter
// for the K7 net). Real facts come from the node adapters (chain recompute + endpoint children + TSA time);
// tests inject _factsAdapter to avoid the 14 s chain.
import { R } from "../core/result.mjs";
import { runPreflight } from "../core/preflight.mjs";
import { verifyCore } from "../core/dispatch.mjs";
import { runChain } from "../core/chain.mjs";
import { parseTsaReply } from "./tsaTime.mjs";
import { runEndpointChild } from "./endpointQuorum.mjs";
import { startAuthorisationDigest } from "../core/derive.mjs";

// Extract the artifact hash the transparency log ACTUALLY recorded, from the entry's own signed body.
// This must be read from evidence, never asserted by the producer: subjectCheck compares it against
// sha256(utf8(role_subject_hex)), which is what binds the Rekor seat to this endpoint's subject.
// Fails CLOSED (null) on absent/unparseable evidence — null can never equal a real digest.
export function rekorArtifactHash(entry) {
  try {
    const uuid = Object.keys(entry ?? {})[0];
    if (!uuid) return null;
    const body = JSON.parse(Buffer.from(entry[uuid].body, "base64").toString("utf8"));
    const v = body?.spec?.data?.hash?.value;
    return typeof v === "string" && /^[0-9a-f]{64}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

// Default adapter: builds B11 facts from the envelope + real evidence (chain recompute is the 14 s path).
export function defaultFactsAdapter(env, verifier_config, { endpointEvidence } = {}) {
  const recomputed = runChain(
    env.delay_proof.seed,
    env.delay_policy.iteration_count_T,
    env.delay_policy.checkpoint_cadence
  );
  const ee = endpointEvidence ?? {};
  const startSubject = startAuthorisationDigest(env.start_authorisation);
  const startTsa = ee.start ? parseTsaReply(ee.start.tsrPath) : { subject_extractable: false };
  const endTsa = ee.end ? parseTsaReply(ee.end.tsrPath) : { subject_extractable: false };
  const startChild = ee.start
    ? runEndpointChild("start", { ...ee.start, subjectHex: startSubject })
    : { green: false, raw: 406, reason: "endpoint_anchor_incomplete", detail: "no_evidence" };
  const endChild = ee.end
    ? runEndpointChild("end", { ...ee.end, subjectHex: env.D_out })
    : { green: false, raw: 415, reason: "endpoint_anchor_incomplete", detail: "no_evidence" };
  return {
    recomputed: {
      x0: recomputed.x0,
      checkpoints: recomputed.checkpoints,
      terminal_value: recomputed.terminal_value,
    },
    startChild,
    endChild,
    start: {
      authority_id: startTsa.authority_id ?? "digicert-tsa",
      genTime_ms: startTsa.genTime_ms,
      accuracy_ms: null,
      token_valid: startChild.green,
      subject_extractable: startTsa.subject_extractable,
      tsa_imprint: startTsa.imprintHex,
      ots_leaf: startSubject,
      rekor_artifact_hash: rekorArtifactHash(ee.start?.rekorEntry),
    },
    end: {
      authority_id: endTsa.authority_id ?? "digicert-tsa",
      genTime_ms: endTsa.genTime_ms,
      accuracy_ms: null,
      token_valid: endChild.green,
      subject_extractable: endTsa.subject_extractable,
      tsa_imprint: endTsa.imprintHex,
      ots_leaf: env.D_out,
      rekor_artifact_hash: rekorArtifactHash(ee.end?.rekorEntry),
    },
  };
}

// verifyVtcDelay(rawBytes, verifier_config, opts) -> verdict. opts: { census, expectedInputCommitment,
// endpointEvidence, _factsAdapter }.
export function verifyVtcDelay(rawBytes, verifier_config, opts = {}) {
  try {
    const pf = runPreflight(rawBytes, verifier_config);
    if (pf.raw) return pf;
    const env = pf.envelope;
    const adapter = opts._factsAdapter ?? defaultFactsAdapter;
    const facts = adapter(env, verifier_config, opts);
    return verifyCore(env, facts, {
      verifier_config,
      census: opts.census,
      expectedInputCommitment: opts.expectedInputCommitment,
    });
  } catch (e) {
    return R(419, "internal_or_env_unavailable", { error: String(e) });
  }
}
