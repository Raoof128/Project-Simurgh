// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q context. Derives the pure facts every check reads. NEVER throws on unresolved accuracy
// (P6): tsaUpperBound is null and 369 owns it. Grows across Task group 1; kept small here.
import { commitmentSessionId } from "./digests.mjs";
import { PROFILES } from "../constants.mjs";

// Resolve accuracy to integer seconds, rounded UP (conservative). null if unresolvable (369 owns it).
function resolveTsaUpperBound(tsaFact, cfg) {
  if (!tsaFact || typeof tsaFact.genTime_s !== "number") return null;
  let acc = tsaFact.accuracy_s;
  if (acc === null || acc === undefined) acc = cfg?.accuracy_policy_s ?? null;
  if (acc === null || acc === undefined) return null;
  return tsaFact.genTime_s + Math.ceil(acc);
}

export function makeCtx(bundle, cfg, facts) {
  const commitmentPayload = {
    ...bundle.ceremony_contract,
    schema_version: bundle.schema_version,
    campaign_id: bundle.campaign_id,
    vuc_root: bundle?.vuc?.universe_commitment_digest,
  };
  const vucRoot = bundle?.vuc?.universe_commitment_digest ?? null;

  // committed profile lives in the quorum policy; cfg carries its own. 365 owns any mismatch.
  const committedProfile =
    bundle.ceremony_contract?.profile ?? bundle?.quorum_policy?.profile ?? cfg?.profile;
  const cfgProfile = cfg?.profile;
  const profileMatch = committedProfile === cfgProfile;
  const profileSpec = PROFILES[cfgProfile] ?? null;

  const tsaAnchor = (bundle.anchors ?? []).find((a) => a.anchor_type === "rfc3161_tsa");
  const tsaFact = tsaAnchor ? facts?.tsaCrypto?.[tsaAnchor.tsa_token_digest] : null;
  const tsaUpperBound = resolveTsaUpperBound(tsaFact, cfg);

  // deduped declared trust domains across anchors
  const domains = (bundle.anchors ?? []).map((a) => a.trust_domain);
  const dedupedDomains = [...new Set(domains)];

  return {
    bundle,
    cfg,
    facts: facts ?? {},
    vucRoot,
    commitmentPayload,
    commitmentSessionIdRecomputed: commitmentSessionId(commitmentPayload),
    committedProfile,
    cfgProfile,
    profileMatch,
    profileSpec,
    tsaAnchor,
    tsaFact,
    tsaUpperBound,
    dedupedDomains,
  };
}
