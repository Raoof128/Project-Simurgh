// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q context. Derives the pure facts every check reads. NEVER throws on unresolved accuracy
// (P6): tsaUpperBound is null and 369 owns it. Committed profile is read from the committed quorum_policy
// (365 owns a cfg-vs-committed mismatch).
import { commitmentSessionId, commitmentDigestBytes } from "./digests.mjs";
import { verifiedAnchorSetDigest } from "./derive.mjs";
import { PROFILES } from "../constants.mjs";

function resolveTsaUpperBound(tsaFact, cfg) {
  if (!tsaFact || typeof tsaFact.genTime_s !== "number") return null;
  let acc = tsaFact.accuracy_s;
  if (acc === null || acc === undefined) acc = cfg?.accuracy_policy_s ?? null;
  if (acc === null || acc === undefined) return null;
  return tsaFact.genTime_s + Math.ceil(acc); // integer epoch seconds, rounded UP (S1)
}

export function makeCtx(bundle, cfg, facts) {
  const cc = bundle.ceremony_contract;
  const vucRoot = bundle?.vuc?.universe_commitment_digest ?? null;
  const commitmentPayload = {
    ...cc,
    schema_version: bundle.schema_version,
    campaign_id: bundle.campaign_id,
    vuc_root: vucRoot,
  };
  const commitmentDigestBytesVal = commitmentDigestBytes(commitmentPayload);

  const committedProfile = bundle.quorum_policy?.profile;
  const cfgProfile = cfg?.profile;
  const profileMatch = committedProfile === cfgProfile;
  const profileSpec = PROFILES[cfgProfile] ?? null;

  const anchors = bundle.anchors ?? [];
  const tsaAnchor = anchors.find((a) => a.anchor_type === "rfc3161_tsa");
  const otsAnchor = anchors.find((a) => a.anchor_type === "bitcoin_ots");
  const tsaFact = tsaAnchor ? facts?.tsaCrypto?.[tsaAnchor.tsa_token_digest] : null;
  const tsaUpperBound = resolveTsaUpperBound(tsaFact, cfg);
  const otsState = otsAnchor ? facts?.otsState?.[otsAnchor.ots_proof_digest] : undefined;
  const declaredFinality = otsAnchor ? otsAnchor.declared_finality : undefined;

  // computedFinality is derived offline from the signed checkpoint_evidence (P0-2/3): the OTS Merkle path
  // resolves (otsState), the witness key is in the committed accepted set, the witness signature verifies,
  // and observed_tip_height - block_height + 1 >= min_confirmations. Never a live Bitcoin node.
  let otsWitnessAccepted = true;
  let computedFinality;
  if (!otsAnchor) {
    computedFinality = undefined;
  } else if (otsState === "invalid") {
    computedFinality = "invalid";
  } else {
    const ce = otsAnchor.checkpoint_evidence;
    const acceptedKeys = bundle.anchor_policy?.accepted_checkpoint_witness_keys ?? [];
    otsWitnessAccepted = !!ce && acceptedKeys.includes(ce.witness_key_fingerprint);
    const sigValid = !!facts?.checkpointWitnessSigValid?.[otsAnchor.ots_proof_digest];
    const confs = ce ? ce.observed_tip_height - ce.block_height + 1 : -1;
    const minConf = bundle.anchor_policy?.min_confirmations ?? Infinity;
    computedFinality =
      ce && otsWitnessAccepted && sigValid && otsState === "verified_immediate" && confs >= minConf
        ? "confirmed"
        : "pending";
  }

  const dedupedDomains = [...new Set(anchors.map((a) => a.trust_domain))];
  const verifiedAnchorSetDigestVal = verifiedAnchorSetDigest(anchors);

  return {
    bundle,
    cfg,
    facts: facts ?? {},
    vucRoot,
    commitmentPayload,
    commitmentDigestBytes: commitmentDigestBytesVal,
    commitmentDigestHex: commitmentDigestBytesVal.toString("hex"),
    commitmentSessionIdRecomputed: commitmentSessionId(commitmentPayload),
    committedProfile,
    cfgProfile,
    profileMatch,
    profileSpec,
    anchors,
    tsaAnchor,
    otsAnchor,
    tsaFact,
    tsaUpperBound,
    otsState,
    declaredFinality,
    computedFinality,
    otsWitnessAccepted,
    dedupedDomains,
    verifiedAnchorSetDigest: verifiedAnchorSetDigestVal,
  };
}
